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

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { FACEMESH_FACE_OVAL, FACEMESH_LEFT_EYE, FACEMESH_LEFT_EYEBROW, FACEMESH_LEFT_IRIS, FACEMESH_LIPS, FACEMESH_RIGHT_EYE, FACEMESH_RIGHT_EYEBROW, FACEMESH_RIGHT_IRIS, FACEMESH_TESSELATION } from '@mediapipe/face_mesh';

const demosSection = document.getElementById('demos');

let faceLandmarker;
let runningMode: 'IMAGE' | 'VIDEO' = 'IMAGE';
let enableWebcamButton: HTMLButtonElement;
let webcamRunning: Boolean = false;
const videoHeight = '360px';
const videoWidth = '480px';

// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
async function runDemo() {
  // Read more `CopyWebpackPlugin`, copy wasm set from `node_modules` to `/wasm`
  const vision = await FilesetResolver.forVisionTasks('/wasm');
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-assets/face_landmarker_with_blendshapes.task?generation=1678504998301299`,
    },
    runningMode,
    numFaces: 1
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

// When an image is clicked, let's detect it and display results!
async function handleClick(event) {
  if (!faceLandmarker) {
    console.log('Wait for faceLandmarker to load before clicking!');
    return;
  }

  if (runningMode === 'VIDEO') {
    runningMode = 'IMAGE';
    await faceLandmarker.setOptions({ runningMode });
  }
  // Remove all landmarks drawed before
  const allCanvas = event.target.parentNode.getElementsByClassName('canvas');
  for (var i = allCanvas.length - 1; i >= 0; i--) {
    const n = allCanvas[i];
    n.parentNode.removeChild(n);
  }

  // We can call faceLandmarker.detect as many times as we like with
  // different image data each time. This returns a promise
  // which we wait to complete and then call a function to
  // print out the results of the prediction.
  const faceLandmarkerResult = faceLandmarker.detect(event.target);
  const canvas = document.createElement('canvas') as HTMLCanvasElement;
  canvas.setAttribute('class', 'canvas');
  canvas.setAttribute('width', event.target.naturalWidth + 'px');
  canvas.setAttribute('height', event.target.naturalHeight + 'px');
  canvas.style.left = '0px';
  canvas.style.top = '0px';
  canvas.style.width = `${event.target.width}px`;
  canvas.style.height = `${event.target.height}px`;

  event.target.parentNode.appendChild(canvas);
  const cxt = canvas.getContext('2d');
  for (const landmarks of faceLandmarkerResult.faceLandmarks) {
    drawConnectors(cxt, landmarks, FACEMESH_TESSELATION,{color: '#C0C0C070', lineWidth: 1});
    drawConnectors(cxt, landmarks, FACEMESH_RIGHT_EYE, {color: '#FF3030'});
    drawConnectors(cxt, landmarks, FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
    drawConnectors(cxt, landmarks, FACEMESH_RIGHT_IRIS, {color: '#FF3030'});
    drawConnectors(cxt, landmarks, FACEMESH_LEFT_EYE, {color: '#30FF30'});
    drawConnectors(cxt, landmarks, FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
    drawConnectors(cxt, landmarks, FACEMESH_LEFT_IRIS, {color: '#30FF30'});
    drawConnectors(cxt, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
    drawConnectors(cxt, landmarks, FACEMESH_LIPS, {color: '#E0E0E0'});
  }
}

/********************************************************************
// Demo 2: Continuously grab image from webcam stream and detect it.
********************************************************************/

const video = document.getElementById('webcam') as HTMLVideoElement;
const canvasElement = document.getElementById('output_canvas') as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext('2d');

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById('webcamButton') as HTMLButtonElement;
  enableWebcamButton.addEventListener('click', enableCam);
} else {
  console.warn('getUserMedia() is not supported by your browser');
}

// Enable the live webcam view and start detection.
function enableCam(event) {
  if (!faceLandmarker) {
    console.log('Wait! objectDetector not loaded yet.');
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
  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener('loadeddata', predictWebcam);
  });
}

async function predictWebcam() {
  canvasElement.style.height = videoHeight;
  video.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  video.style.width = videoWidth;
  // Now let's start detecting the stream.
  if (runningMode === 'IMAGE') {
    runningMode = 'VIDEO';
    await faceLandmarker.setOptions({ runningMode: runningMode });
  }
  let nowInMs = Date.now();
  const results = faceLandmarker.detectForVideo(video, nowInMs);

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  if (results.faceLandmarks) {
    for (const landmarks of results.faceLandmarks) {
      drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION,{color: '#C0C0C070', lineWidth: 1});
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {color: '#FF3030'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {color: '#FF3030'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, {color: '#FF3030'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {color: '#30FF30'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, {color: '#30FF30'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, {color: '#30FF30'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0'});
      drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {color: '#E0E0E0'});
    }
  }
  canvasCtx.restore();

  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}
