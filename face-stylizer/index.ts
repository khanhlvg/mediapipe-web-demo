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

import { FaceStylizer, FilesetResolver, MPImage } from '@mediapipe/tasks-vision';

const demosSection = document.getElementById("demos");

let faceStylizer: FaceStylizer;
let runningMode: "IMAGE" | "VIDEO" = "IMAGE";
let enableWebcamButton: HTMLButtonElement;
let webcamRunning: Boolean = false;
const videoWidth = 480;

// Before we can use FaceStylizer class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
async function runDemo() {
  // Read more `CopyWebpackPlugin`, copy wasm set from "https://cdn.skypack.dev/node_modules" to `/wasm`
  const vision = await FilesetResolver.forVisionTasks("/wasm");
  faceStylizer = await FaceStylizer.createFromOptions(vision, {
    baseOptions: {
      // modelAssetPath: `https://storage.googleapis.com/mediapipe-assets/face_stylizer_cartoon.task`
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_stylizer/blaze_face_stylizer/float32/1/blaze_face_stylizer.task`
    }
  });
  demosSection.classList.remove("invisible");
}
runDemo();

/********************************************************************
// Demo 1: Grab a bunch of images from the page and stylize them
// upon click.
********************************************************************/

// In this demo, we have put all our clickable images in divs with the
// CSS class 'stylizeOnClick'. Lets get all the elements that have
// this class.
const imageContainers = document.getElementsByClassName("stylizeOnClick") as HTMLCollectionOf<HTMLDivElement>;

// Now let's go through all of these and add a click event listener.
for (let i = 0; i < imageContainers.length; i++) {
  // Add event listener to the child element whichis the img element.
  imageContainers[i].children[0].addEventListener("click", handleClick);
}

// When an image is clicked, let's stylize it and display results!
async function handleClick(event) {
  if (!faceStylizer) {
    console.log("Wait for faceStylizer to load before clicking!");
    return;
  }

  if (runningMode === "VIDEO") {
    runningMode = "IMAGE";
    await faceStylizer.setOptions({ runningMode });
  }
  // Remove all face styles drawed before
  const allCanvas = event.target.parentNode.getElementsByClassName("canvas");
  for (var i = allCanvas.length - 1; i >= 0; i--) {
    const n = allCanvas[i];
    n.parentNode.removeChild(n);
  }

  // We can call faceStylizer.stylize as many times as we like with
  // different image data each time. This returns a promise
  // which we wait to complete and then call a function to
  // print out the results of the prediction.
  const faceStylizerResult = faceStylizer.stylize(event.target);
  const canvas = document.createElement("canvas") as HTMLCanvasElement;
  canvas.setAttribute("class", "canvas");
  canvas.setAttribute("width", event.target.naturalWidth + "px");
  canvas.setAttribute("height", event.target.naturalHeight + "px");
  canvas.style.left = "calc(100% + 16px)";
  canvas.style.top = "0px";
  canvas.style.width = `${event.target.width}px`;
  canvas.style.height = `${event.target.height}px`;

  event.target.parentNode.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  ctx.putImageData(faceStylizerResult.getAsImageData(), 0, 0);
}

/********************************************************************
// Demo 2: Continuously grab image from webcam stream and stylize it.
********************************************************************/

const video = document.getElementById("webcam") as HTMLVideoElement;
const canvasElement = document.getElementById(
  "output_canvas"
) as HTMLCanvasElement;

const canvasCtx = canvasElement.getContext("2d");

// Check if webcam access is supported.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton") as HTMLButtonElement;
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start stylization.
function enableCam(event) {
  if (!faceStylizer) {
    console.log("Wait! faceStylizer not loaded yet.");
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "RUN WEBCAM";
    video.pause();
    predictWebcam()
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "PAUSE AND STYLIZE";
    
    if (video.paused && video.played.length > 0) {
      video.play();
    } else {
      // Activate the webcam stream.
      navigator.mediaDevices.getUserMedia({video: true}).then(function (stream) {
        video.srcObject = stream;
      });
    }
  }
}

let lastVideoTime = -1;

async function predictWebcam() {
  // Now let's start stylizing the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await faceStylizer.setOptions({ runningMode });
  }
  const startTimeMs = performance.now();
  const callback = (image: MPImage) => {
    if (image) {
      canvasElement.width = image.width;
      canvasElement.height = image.height;
      canvasCtx.putImageData(image.getAsImageData(), 0, 0);
    }
  }

  // Stylize when Pause video
  if (!webcamRunning && lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    faceStylizer.stylizeForVideo(video, startTimeMs, callback);
  }
}
