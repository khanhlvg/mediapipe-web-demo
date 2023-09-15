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

import { FaceLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import FaceLandmarkWorker from 'worker-loader!./Worker';

const imageBlendShapes = document.getElementById("image-blend-shapes");
const videoBlendShapes = document.getElementById("video-blend-shapes");

const worker = new FaceLandmarkWorker;
worker.onmessage = (e) => {
  if (e?.data) {
    const { results, mode } = e.data;
    if (mode === 'VIDEO') {
      drawLandmarks(results, canvasElement, video.clientWidth, video.clientHeight);
      drawBlendShapes(videoBlendShapes, results.faceBlendshapes);
    } else {
      const canvas = document.querySelector('#image-output-canvas') as HTMLCanvasElement;
      const parentEl = canvas.parentElement;

      drawLandmarks(results, canvas, parentEl.clientWidth, parentEl.clientHeight);
      drawBlendShapes(imageBlendShapes, results.faceBlendshapes);
    }
  }
};

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
  const imageEl = event.target as HTMLImageElement;

  const imageBitmap = await createImageBitmap(imageEl, 0, 0, imageEl.clientWidth, imageEl.clientHeight);
  worker.postMessage({
    mode: 'IMAGE',
    imageBitmap
  });
}

/********************************************************************
// Demo 2: Continuously grab image from webcam stream and detect it.
********************************************************************/
const video = document.getElementById('webcam') as HTMLVideoElement;
const canvasElement = document.getElementById('output-canvas') as HTMLCanvasElement;

const videoWidth = 480;
let enableWebcamButton: HTMLButtonElement;
let webcamRunning = false;

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
// If webcam supported, add event listener to button for when user wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById('webcamButton') as HTMLButtonElement;
  enableWebcamButton.addEventListener('click', enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam() {
  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE PREDICTIONS";
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE PREDICTIONS";
  }

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia({video: true}).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener("loadeddata", detectLoop);
  });
}

let lastVideoTime = -1;
const detectLoop = async () => {
  if (!webcamRunning) {
    return;
  }
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;

    const ratio = video.videoHeight / video.videoWidth;
    video.style.width = `${videoWidth}px`;
    video.style.height = `${videoWidth * ratio}px`;
    
    const imageBitmap = await createImageBitmap(video, 0, 0, videoWidth, videoWidth * ratio);
    worker.postMessage({
      mode: 'VIDEO',
      imageBitmap
    });
  }
  setTimeout(() => {
    requestAnimationFrame(() => {
      detectLoop();
    });
  }, 30);
};

function drawLandmarks(results, canvas: HTMLCanvasElement, width: number, height: number) {
  if (results.faceLandmarks) {
    // Set canvas width-height
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = width;
    canvas.height = height;

    // Draw landmarks
    const ctx = canvas.getContext('2d');
    const drawingUtils = new DrawingUtils(ctx);
    for (const landmarks of results.faceLandmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_TESSELATION,
        { color: "#C0C0C070", lineWidth: 1 }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
        { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
        { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
        { color: "#30FF30" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
        { color: "#30FF30" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
        { color: "#E0E0E0" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LIPS,
        { color: "#E0E0E0" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
        { color: "#FF3030" }
      );
      drawingUtils.drawConnectors(
        landmarks,
        FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
        { color: "#30FF30" }
      );
    }
  }
}

function drawBlendShapes(el: HTMLElement, blendShapes: any[]) {
  if (!blendShapes.length) {
    return;
  }

  let htmlMaker = "";
  blendShapes[0].categories.map((shape) => {
    htmlMaker += `
      <li class="blend-shapes-item">
        <span class="blend-shapes-label">${
          shape.displayName || shape.categoryName
        }</span>
        <span class="blend-shapes-value" style="width: calc(${
          +shape.score * 100
        }% - 120px)">${(+shape.score).toFixed(4)}</span>
      </li>
    `;
  });

  el.innerHTML = htmlMaker;
}
