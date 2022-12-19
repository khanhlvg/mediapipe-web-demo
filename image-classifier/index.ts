// Copyright 2022 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//      http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ImageClassifier, FilesetResolver } from '@mediapipe/tasks-vision';

// Get DOM elements
const video = document.getElementById('webcam') as HTMLVideoElement;
const webcamPredictions = document.getElementById('webcamPredictions');
const demosSection = document.getElementById('demos');
let enableWebcamButton: HTMLButtonElement;
let webcamRunning: Boolean = false;
const videoHeight = '360px';
const videoWidth = '480px';

const imageContainers = document.getElementsByClassName('classifyOnClick');
let runningMode: 'image' | 'video' = 'image';

// Add click event listeners for the img elements.
for (let i = 0; i < imageContainers.length; i++) {
  imageContainers[i].children[0].addEventListener('click', handleClick);
}

// Track imageClassifier object and load status.
let imageClassifier: ImageClassifier;

/**
 * Demo 1: Classify images on click and display results.
 */
async function handleClick(event) {
  // Do not classify if imageClassifier hasn't loaded
  if (imageClassifier === undefined) {
    return;
  }
  // if video mode is initialized, set runningMode to image
  if (runningMode === 'video') {
    runningMode = 'image';
    await imageClassifier.setOptions({ runningMode });
  }

  // imageClassifier.classify() returns a promise which, when resolved, is a ClassificationResult object.
  // Use the ClassificationResult to print out the results of the prediction.
  const classificationResult = await imageClassifier.classify(event.target);
  // Write the predictions to a new paragraph element and add it to the DOM.
  const classifications = classificationResult.classifications;

  const p = event.target.parentNode.childNodes[3];
  p.className = 'classification';
  p.innerText = `Classification: ${classifications[0].categories[0].categoryName}
                 Confidence: ${Math.round(parseFloat(`${classifications[0].categories[0].score}`) * 100)}%`;
    // 'Classificaton: ' +
    // classifications[0].categories[0].categoryName +
    // '\n Confidence: ' +
    // Math.round(parseFloat(`${classifications[0].categories[0].score}`) * 100) +
    // '%';
}

/********************************************************************
// Demo 2: Continuously grab image from webcam stream and classify it.
********************************************************************/

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Get classification from the webcam
async function predictWebcam() {
  // Do not classify if imageClassifier hasn't loaded
  if (imageClassifier === undefined) {
    return;
  }
  // if image mode is initialized, create a new classifier with video runningMode
  if (runningMode === 'image') {
    runningMode = 'video';
    // await runDemo();
    await imageClassifier.setOptions({ runningMode: runningMode });
  }
  let nowInMs = Date.now();
  // Start classifying the stream.
  const classificationResult = await imageClassifier.classifyForVideo(
    video,
    nowInMs
  );
  video.style.height = videoHeight;
  video.style.width = videoWidth;
  webcamPredictions.style.width = videoWidth;

  const classifications = classificationResult.classifications;
  webcamPredictions.className = 'webcamPredictions';
  webcamPredictions.innerText = `Classification: ${classifications[0].categories[0].categoryName}
                                 Confidence: ${Math.round(parseFloat(`${classifications[0].categories[0].score}`) * 100)}%`;
    // 'Classification: ' +
    // classifications[0].categories[0].categoryName +
    // '\n Confidence: ' +
    // Math.round(parseFloat(classifications[0].categories[0].score) * 100) +
    // '%';

  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

// Enable the live webcam view and start classification.
async function enableCam(event) {
  if (imageClassifier === undefined) {
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = 'ENABLE PREDICTIONS';
  } else {
    console.log('webcam was off');
    webcamRunning = true;
    enableWebcamButton.innerText = 'DISABLE PREDICITONS';
  }

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  video.srcObject = await navigator.mediaDevices.getUserMedia(constraints);
  video.addEventListener('loadeddata', predictWebcam);
}

// If webcam supported, add event listener to button.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById('webcamButton') as HTMLButtonElement;
  enableWebcamButton.addEventListener('click', enableCam);
} else {
  console.warn('getUserMedia() is not supported by your browser');
}

/**
 * Create an ImageClassifier from the given options.
 * You can replace the model with a custom one.
 * Customize your model at [url of MPStudio]
 */
async function runDemo() {
  const vision = await FilesetResolver.forVisionTasks('/wasm');
  imageClassifier = await ImageClassifier.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/image_classifier/efficientnet_lite0_uint8.tflite`
    },
    maxResults: 1,
    runningMode: runningMode
  });
  // Show demo section now model is ready to use.
  demosSection.classList.remove('invisible');
}
runDemo();
