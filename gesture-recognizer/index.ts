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

import { GestureRecognizer, FilesetResolver } from '@mediapipe/tasks-vision';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { HAND_CONNECTIONS } from '@mediapipe/hands';

const demosSection = document.getElementById('demos');

let gestureRecognizer: GestureRecognizer;
let runningMode: 'image' | 'video' = 'image';
let enableWebcamButton: HTMLButtonElement;
let webcamRunning: Boolean = false;
const videoHeight = '360px';
const videoWidth = '480px';

// Before we can use GestureRecognizer class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
async function runDemo() {
  // Read more `CopyWebpackPlugin`, copy wasm set from `node_modules` to `/wasm`
  const vision = await FilesetResolver.forVisionTasks('/wasm');
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task'
    },
    runningMode: runningMode
    // numHands: 2
  });
  demosSection.classList.remove("invisible");
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
  if (!gestureRecognizer) {
    alert('Please wait for gestureRecognizer to load');
    return;
  }

  if (runningMode === 'video') {
    runningMode = 'image';
    await gestureRecognizer.setOptions({ runningMode: runningMode });
  }
  // Remove all landmarks drawed before
  const allCanvas = event.target.parentNode.getElementsByClassName('canvas');
  for (var i = allCanvas.length - 1; i >= 0; i--) {
    const n = allCanvas[i];
    n.parentNode.removeChild(n);
  }

  // We can call handLandmarker.detect as many times as we like with
  // different image data each time. This returns a promise
  // which we wait to complete and then call a function to
  // print out the results of the prediction.
  const results = gestureRecognizer.recognize(event.target);
  console.log(results);
  if (results.gestures.length > 0) {
    const p = event.target.parentNode.childNodes[3];
    p.setAttribute('class', 'info');
    p.innerText = `GestureRecognizer: ${results.gestures[0][0].categoryName}
                   Confidence: ${Math.round(parseFloat(`${results.gestures[0][0].score}`) * 100)}%`;
      // "GestureRecognizer: " +
      // results.gestures[0][0].categoryName +
      // "\n Confidence: " +
      // Math.round(parseFloat(`${results.gestures[0][0].score}`) * 100) +
      // "%";
    p.style.left = '0px';
    p.style.top = `${event.target.height}px`;
    p.style.width = `${event.target.width}px`;
      // "left: 0px;" +
      // "top: " +
      // event.target.height +
      // "px; " +
      // "width: " +
      // (event.target.width - 10) +
      // "px;";

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
    for (const landmarks of results.landmarks) {
      drawConnectors(cxt, landmarks, HAND_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 5
      });
      drawLandmarks(cxt, landmarks, { color: '#FF0000', lineWidth: 1 });
    }
  }
}

/********************************************************************
// Demo 2: Continuously grab image from webcam stream and detect it.
********************************************************************/

const video = document.getElementById('webcam') as HTMLVideoElement;
const canvasElement = document.getElementById('output_canvas') as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext('2d');
const gestureOutput = document.getElementById('gesture_output');

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
  if (!gestureRecognizer) {
    alert('Please wait for gestureRecognizer to load');
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = 'ENABLE PREDICTIONS';
  } else {
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
  const webcamElement = document.getElementById('webcam');
  // Now let's start detecting the stream.
  if (runningMode === 'image') {
    runningMode = 'video';
    await gestureRecognizer.setOptions({ runningMode: runningMode });
  }
  let nowInMs = Date.now();
  const results = await gestureRecognizer.recognizeForVideo(video, nowInMs);

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  canvasElement.style.height = videoHeight;
  webcamElement.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  webcamElement.style.width = videoWidth;
  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: '#00FF00',
        lineWidth: 5
      });
      drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });
    }
  }
  canvasCtx.restore();
  if (results.gestures.length > 0) {
    gestureOutput.style.display = 'block';
    gestureOutput.style.width = videoWidth;
    gestureOutput.innerText = `GestureRecognizer: ${results.gestures[0][0].categoryName}
                               Confidence: ${Math.round(parseFloat(`${results.gestures[0][0].score}`) * 100)}%`;
    //  =
    //   "GestureRecognizer: " +
    //   results.gestures[0][0].categoryName +
    //   "\n Confidence: " +
    //   Math.round(parseFloat(results.gestures[0][0].score) * 100) +
    //   "%";
  } else {
    gestureOutput.style.display = 'none';
  }
  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}
