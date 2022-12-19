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
import { ObjectDetector, FilesetResolver } from '@mediapipe/tasks-vision';

const demosSection = document.getElementById('demos');

let objectDetector: ObjectDetector;
let runningMode: 'image' | 'video' = 'image';

// Before we can use ObjectDetector class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
async function runDemo() {
  const vision = await FilesetResolver.forVisionTasks('/wasm');
  objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite`
    },
    scoreThreshold: 0.5,
    runningMode: runningMode
  });
  demosSection.classList.remove('invisible');
}
runDemo();

/********************************************************************
 // Demo 1: Grab a bunch of images from the page and detection them
 // upon click.
 ********************************************************************/

// In this demo, we have put all our clickable images in divs with the
// CSS class 'detectionOnClick'. Lets get all the elements that have
// this class.
const imageContainers = document.getElementsByClassName('detectOnClick');

// Now let's go through all of these and add a click event listener.
for (let i = 0; i < imageContainers.length; i++) {
  // Add event listener to the child element whichis the img element.
  imageContainers[i].children[0].addEventListener('click', handleClick);
}

/**
 * Detect objects in still images on click
 */
async function handleClick(event) {
  const highlighters = event.target.parentNode.getElementsByClassName(
    'highlighter'
  );
  for (var i = highlighters.length - 1; i >= 0; i--) {
    const n = highlighters[i];
    n.parentNode.removeChild(n);
  }

  const infos = event.target.parentNode.getElementsByClassName('info');
  for (var i = infos.length - 1; i >= 0; i--) {
    const n = infos[i];
    n.parentNode.removeChild(n);
  }

  if (!objectDetector) {
    console.log('Wait for objectDetector to load before clicking');
    return;
  }
  // if video mode is initialized, set runningMode to image
  if (runningMode === 'video') {
    runningMode = 'image';
    await objectDetector.setOptions({ runningMode: runningMode });
  }

  const ratio = event.target.height / event.target.naturalHeight;

  // objectDetector.detect returns a promise which, when resolved, is an array of Detection objects
  const predictions = await objectDetector.detect(event.target);
  // Write predictions to a new paragraph element and add to the DOM.
  console.log(predictions);
  for (let n = 0; n < predictions.length; n++) {
    // Description text
    const p = document.createElement('p');
    p.setAttribute('class', 'info');
    p.innerText = `${predictions[n].categories[0].categoryName} - with ${Math.round(parseFloat(`${predictions[n].categories[0].score}`) * 100)}% confidence.`;
    // Positioned at the top left of the bounding box.
    // Height is whatever the text takes up.
    // Width subtracts text padding in CSS so fits perfectly.
    p.style.left = `${predictions[n].boundingBox.originX * ratio}px`;
    p.style.top = `${predictions[n].boundingBox.originY * ratio}px`;
    p.style.width = `${(predictions[n].boundingBox.width * ratio - 10)}px`;

    const highlighter = document.createElement('div');
    highlighter.setAttribute('class', 'highlighter');
    highlighter.style.left = `${predictions[n].boundingBox.originX * ratio}px`;
    highlighter.style.top = `${predictions[n].boundingBox.originY * ratio}px`;
    highlighter.style.width = `${predictions[n].boundingBox.width * ratio}px`;
    highlighter.style.height = `${predictions[n].boundingBox.height * ratio}px`;

    event.target.parentNode.appendChild(highlighter);
    event.target.parentNode.appendChild(p);
  }
}

/********************************************************************
 // Demo 2: Continuously grab image from webcam stream and detect it.
 ********************************************************************/

let video = document.getElementById('webcam') as HTMLVideoElement;
const liveView = document.getElementById('liveView');
let enableWebcamButton: HTMLButtonElement;
// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Keep a reference of all the child elements we create
// so we can remove them easilly on each render.
var children = [];

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById('webcamButton') as HTMLButtonElement;
  enableWebcamButton.addEventListener('click', enableCam);
} else {
  console.warn('getUserMedia() is not supported by your browser');
}

// Enable the live webcam view and start detection.
async function enableCam(event) {
  if (!objectDetector) {
    console.log('Wait! objectDetector not loaded yet.');
    return;
  }

  // Hide the button.
  enableWebcamButton.classList.add('removed');

  // getUsermedia parameters
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      video.srcObject = stream;
      video.addEventListener('loadeddata', predictWebcam);
    })
    .catch((err) => {
      console.error(err);
      /* handle the error */
    });
}

async function predictWebcam() {
  // if image mode is initialized, create a new classifier with video runningMode
  if (runningMode === 'image') {
    runningMode = 'video';
    // await runDemo();
    await objectDetector.setOptions({ runningMode: runningMode });
  }
  let nowInMs = Date.now();

  // Detect objects using detectForVideo
  const predictions = await objectDetector.detectForVideo(video, nowInMs);
  // Remove any highlighting from previous frame.
  for (let i = 0; i < children.length; i++) {
    liveView.removeChild(children[i]);
  }
  children.splice(0);

  // Iterate through predictions and draw them to the live view
  for (let n = 0; n < predictions.length; n++) {
    const p = document.createElement('p');
    p.innerText = `${predictions[n].categories[0].categoryName} - with ${Math.round(parseFloat(`${predictions[n].categories[0].score}`) * 100)}% confidence.`
    p.style.left = `${(video.offsetWidth -
                       predictions[n].boundingBox.width -
                       predictions[n].boundingBox.originX)}px`;
    p.style.top = `${predictions[n].boundingBox.originY}px`;
    p.style.width = `${(predictions[n].boundingBox.width - 10)}px`;

    const highlighter = document.createElement('div');
    highlighter.setAttribute('class', 'highlighter');
    highlighter.style.left = `${(video.offsetWidth -
                                 predictions[n].boundingBox.width -
                                 predictions[n].boundingBox.originX)}px`;
    highlighter.style.top = `${predictions[n].boundingBox.originY}px`;
    highlighter.style.width = `${predictions[n].boundingBox.width - 10}px`;
    highlighter.style.height = `${predictions[n].boundingBox.height}px`;

    liveView.appendChild(highlighter);
    liveView.appendChild(p);

    // Store drawn objects in memory so they are queued to delete at next call
    children.push(highlighter);
    children.push(p);
  }

  // Call this function again to keep predicting when the browser is ready
  window.requestAnimationFrame(predictWebcam);
}
