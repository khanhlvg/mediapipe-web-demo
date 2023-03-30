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
import { InteractiveSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

const demosSection = document.getElementById('demos');

let interactiveSegmenter: InteractiveSegmenter;

// Before we can use InteractiveSegmenter class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
async function runDemo() {
  const vision = await FilesetResolver.forVisionTasks('/wasm');
  interactiveSegmenter = await InteractiveSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/interactive_segmenter/ptm_512_hdt_ptm_woid.tflite`
    }
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
 * Detect segmentation on click
 */
async function handleClick(event) {
  console.log(event.offsetX, event.offsetY, event.target.width, event.target.height);

  if (!interactiveSegmenter) {
    console.log('Wait for interactiveSegmenter to load before clicking');
    return;
  }

  // interactiveSegmenter.segment returns a promise which, when resolved, is an array of Detection objects
  await interactiveSegmenter.segment(
    event.target as HTMLImageElement,
    {
      keypoint: {
        x: event.offsetX / event.target.width,
        y: event.offsetY /event.target.height
      }
    },
    (masks, width, height) => {
      console.log(masks, width, height);
      drawSegmentation(masks[0], width, height, event.target.parentElement);
    }
  );
}

/**
 * Draw segmentation
 */
function drawSegmentation(masks, width: number, height: number, el: HTMLElement) {
  const canvas = document.getElementsByClassName('canvas-segmentation')[0] as HTMLCanvasElement;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#00000000';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#32a85255';

  masks.map((value, index) => {
    if (value) {
      const x = (index + 1) % width;
      const y = ((index + 1) - x) / width;
      ctx.fillRect(x, y, 1, 1);
    }
  });
  el.appendChild(canvas);
};

// ctx.fillRect(10,10,1,1); // fill in the pixel at (10,10)