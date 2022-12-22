/* Copyright 2019 The MediaPipe Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

import { TextClassifier, TextClassifierResult, FilesetResolver } from '@mediapipe/tasks-text';

let textClassifier: TextClassifier;
const defaultText: string = `But soft, what light through yonder window breaks?
It is the East, and Juliet is the sun.
Arise, fair sun, and kill the envious moon,
Who is already sick and pale with grief
That thou, her maid, art far more fair than she.
Be not her maid since she is envious.
Her vestal livery is but sick and green,
And none but fools do wear it. Cast it off.
It is my lady. O, it is my love!
O, that she knew she were!\n othing. What of that?
Her eye discourses; I will answer it.`;

// Get the required elements
const input = document.getElementById('input') as HTMLInputElement;
const output = document.getElementById('output');
const submit = document.getElementById('submit') as HTMLButtonElement;
const defaultTextButton = document.getElementById('populate-text');

// Add a button click listener to add the default text
defaultTextButton.addEventListener('click', function () {
  input.value = defaultText;
});

// Add a button click listener that classifies text on click
submit.addEventListener('click', async function () {
  // Do not run inference if the input is an empty string
  // An empty string might provide useful results for some models, but isn't relevant to this sentiment analysis demo
  if (!input.value) {
    alert('Please write some text, or click "Populate text" to add text');
    return;
  }

  output.innerText = 'Classifying...';
  // Wait to run the function until inner text is set
  await sleep(5);
  const result: TextClassifierResult = await textClassifier?.classify(
    input.value
  );
  displayClassificationResult(result);
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Iterate through the sentiment categories in the TextClassifierResult object, then display them in #output
function displayClassificationResult(result: TextClassifierResult) {
  if (!result) { return; };
  if (result.classifications[0].categories.length > 0) {
    output.innerText = '';
  } else {
    output.innerText = 'Result is empty';
  }
  const categories: string[] = [];
  // Single-head model.
  for (const category of result.classifications[0].categories) {
    const categoryDiv = document.createElement('div');
    categoryDiv.innerText = `${category.categoryName}: ${category.score.toFixed(2)}`;
    // highlight the likely category
    // if (category.score.toFixed(2) > 0.5) {
    if (category.score > 0.5) {
      categoryDiv.style.color = '#12b5cb';
    }
    output.appendChild(categoryDiv);
  }
}

input.disabled = true;
submit.disabled = true;

// Create the TextClassifier object upon page load
async function runDemo() {
  const text = await FilesetResolver.forTextTasks('/wasm');
  textClassifier = await TextClassifier.createFromOptions(text, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/text_classifier/bert_text_classifier.tflite`
    },
    maxResults: 5
  });

  // Waiting load data model
  input.disabled = false;
  submit.disabled = false;
}
runDemo();
