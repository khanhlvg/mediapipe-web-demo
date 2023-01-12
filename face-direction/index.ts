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

import { drawConnectors } from '@mediapipe/drawing_utils';
import { FaceMesh, FACEMESH_RIGHT_EYE, FACEMESH_LEFT_EYE, FACEMESH_TESSELATION, FACEMESH_RIGHT_IRIS, FACEMESH_LEFT_IRIS, FACEMESH_FACE_OVAL } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils'
import { MDCSlider } from '@material/slider';

const videoElement = document.getElementById('input-video') as HTMLVideoElement;
const canvasElement = document.getElementById('output-canvas') as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext('2d') as CanvasRenderingContext2D;
const resultEl = document.getElementById('result');
const outputWrapper = document.getElementsByClassName('output-wrapper')[0] as HTMLElement;
const outputScreen = document.getElementsByClassName('output-screen')[0] as HTMLElement;
const outputPoint = document.getElementsByClassName('output-point')[0] as HTMLElement;
const mouseLeftEl = document.getElementsByClassName('mouse-simulation-left')[0] as HTMLElement;
const mouseRightEl = document.getElementsByClassName('mouse-simulation-right')[0] as HTMLElement;

let SCREEN_WIDTH = 720;
const SCREEN_HEIGHT = 480;
const BLINK_THRESHOLD = 5;
const DIRECTION_THRESHOLD = 0.08;
const BLINK_TIME = 500; // Unit: ms
const FRAME_TIME = 33.333333; // ms, FPS = 30

// Controller
const sliderDirectionThreshold = new MDCSlider(document.querySelector('.slider-head-direction'));
const sliderEyeClosedThreshold = new MDCSlider(document.querySelector('.slider-eye-close'));
const sliderEyeClosedTimer = new MDCSlider(document.querySelector('.slider-eye-close-timer'));
const txtDirectionThreshold = document.getElementsByClassName('slider-head-direction-value')[0] as HTMLElement;
const txtEyeClosedThreshold = document.getElementsByClassName('slider-eye-close-value')[0] as HTMLElement;
const txtEyeClosedTimer = document.getElementsByClassName('slider-eye-close-timer-value')[0] as HTMLElement;

// Controller events
sliderDirectionThreshold.listen('MDCSlider:change', () => {
  txtDirectionThreshold.innerHTML = `${sliderDirectionThreshold.getValue()}`;
});
sliderEyeClosedThreshold.listen('MDCSlider:change', () => {
  txtEyeClosedThreshold.innerHTML = `${sliderEyeClosedThreshold.getValue()}`;
});
sliderEyeClosedTimer.listen('MDCSlider:change', () => {
  txtEyeClosedTimer.innerHTML = `${sliderEyeClosedTimer.getValue()}`;
});

// Close eyes controller variables
let frameRightClose = 0;
let frameLeftClose = 0;

// Detect width of simulation screen depend on the device
const detectSimulationScreen = () => {
  if (outputScreen) {
    SCREEN_WIDTH = outputScreen.offsetWidth - 2; // 2px of borders
  }
};
detectSimulationScreen();

// Set default thresholds
sliderDirectionThreshold.setValue(DIRECTION_THRESHOLD);
sliderEyeClosedThreshold.setValue(BLINK_THRESHOLD);
sliderEyeClosedTimer.setValue(BLINK_TIME);

const distance2Points = (point1, point2) => {
  return Math.sqrt((point2.x - point1.x)**2 + (point2.y - point1.y)**2 + (point2.z - point1.z)**2);
};

const detectDirection = (top, left, right, bottom) => {
  const threshold = sliderDirectionThreshold.getValue();
  return [
    top.z - bottom.z > threshold ? 'top' : '',
    top.z - bottom.z < -threshold ? 'bottom' : '',
    left.z - right.z > threshold ? 'left' : '',
    left.z - right.z < -threshold ? 'right' : ''
  ].filter(v => v).join('-');
};

const drawPoint = (direction: string) => {
  if (direction.includes('top')) {
    outputPoint.style.top = `${Math.max(outputPoint.offsetTop - 4, 0)}px`;
  }
  if (direction.includes('left')) {
    outputPoint.style.left = `${Math.max(outputPoint.offsetLeft - 4, 0)}px`;
  }
  if (direction.includes('bottom')) {
    outputPoint.style.top = `${Math.min(outputPoint.offsetTop + 4, SCREEN_HEIGHT - outputPoint.offsetHeight)}px`;
  }
  if (direction.includes('right')) {
    outputPoint.style.left = `${Math.min(outputPoint.offsetLeft + 4, SCREEN_WIDTH - outputPoint.offsetWidth)}px`;
  }
};

const calculateBlinkRatio = (landmarks, rightEyePoints = FACEMESH_RIGHT_EYE, leftEyePoints = FACEMESH_LEFT_EYE) => {
  // t = top
  // l = left
  // r = right
  // b = bottom
  // h = horizontal
  // v = vertical
  // Example: rl = Right eye with Left point of right eye
  // Facemesh eye have 16 key points
  const rl = landmarks[rightEyePoints[0][0]]
  const rr = landmarks[rightEyePoints[7][1]]
  const rt = landmarks[rightEyePoints[4][0]]
  const rb = landmarks[rightEyePoints[12][0]]

  const ll = landmarks[leftEyePoints[0][0]]
  const lr = landmarks[leftEyePoints[7][1]]
  const lt = landmarks[leftEyePoints[4][0]]
  const lb = landmarks[leftEyePoints[12][0]]

  const rh = distance2Points(rl, rr);
  const rv = distance2Points(rt, rb);

  const lh = distance2Points(ll, lr);
  const lv = distance2Points(lt, lb);

  const blinkRatio = ((rh / rv) + (lh / lv)) / 2;
  return {
    rightBlink: rh / rv,
    leftBlink: lh / lv,
    eyesBlink: blinkRatio
  };
};

const detectCloseEyes = (blinkRatio) => {
  if (!blinkRatio) {
    frameLeftClose = 0;
    frameRightClose = 0;
    return;
  }

  const eyeCloseThreshold = sliderEyeClosedThreshold.getValue();
  const isLeftBlink = blinkRatio.leftBlink > eyeCloseThreshold;
  const isRightBlink = blinkRatio.rightBlink > eyeCloseThreshold;
  if (!blinkRatio.leftBlink || !isLeftBlink) {
    frameLeftClose = 0;
  }
  if (!blinkRatio.rightBlink || !isRightBlink) {
    frameRightClose = 0;
  } 
  frameLeftClose += +isLeftBlink;
  frameRightClose += +isRightBlink;
};

const onResults = (results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length) {

    // Face direction detector
    const direction = detectDirection(
      results.multiFaceLandmarks[0][10],
      results.multiFaceLandmarks[0][323],
      results.multiFaceLandmarks[0][93],
      results.multiFaceLandmarks[0][152]
    ) || 'center';
    drawPoint(direction);
    outputWrapper.className = 'output-wrapper';
    direction.split('-').filter(i => i !== 'center').map((item) => {
      outputWrapper.classList.add(item);
    });

    // Eyes blink detector
    const blinkTime = sliderEyeClosedTimer.getValue();
    const blinkRatio = calculateBlinkRatio(results.multiFaceLandmarks[0]);

    // Detect close eyes for clicking computer mouse
    detectCloseEyes(blinkRatio);
    mouseLeftEl.style.backgroundColor = frameLeftClose * FRAME_TIME > blinkTime ? '#30FF30' : 'transparent';
    mouseRightEl.style.backgroundColor = frameRightClose * FRAME_TIME > blinkTime ? '#FF3030' : 'transparent';
    // outputScreen.style.backgroundColor =
    // frameRightClose * FRAME_TIME > blinkTime
    //   ? '#FF3030'
    //   : (frameLeftClose * FRAME_TIME > blinkTime ? '#30FF30' : 'transparent');
    // resultEl.innerHTML = 'Blink ratio: ' + calculateBlinkRatio(results.multiFaceLandmarks[0]).toFixed(3);
    
    // Draw face landmark
    for (const landmarks of results.multiFaceLandmarks) {
      // drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {color: '#C0C0C070', lineWidth: 1});
      drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {color: '#FF3030', lineWidth: 1});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {color: '#FF3030', lineWidth: 2});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, {color: '#FF3030', lineWidth: 2});
      drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {color: '#30FF30', lineWidth: 1});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, {color: '#30FF30', lineWidth: 2});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, {color: '#30FF30', lineWidth: 2});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {color: '#E0E0E0', lineWidth: 2});
      drawConnectors(canvasCtx, landmarks, FACEMESH_FACE_OVAL, {color: '#E0E0E0', lineWidth: 1});

      // drawConnectors(canvasCtx, landmarks, [[FACEMESH_RIGHT_EYE[0][0], FACEMESH_RIGHT_EYE[7][1]]], {color: '#E0E0E0', lineWidth: 2});
      // drawConnectors(canvasCtx, landmarks, [[FACEMESH_RIGHT_EYE[4][0], FACEMESH_RIGHT_EYE[12][0]]], {color: '#E0E0E0', lineWidth: 2});
    }

    const facePoints = [
      results.multiFaceLandmarks[0][10],
      results.multiFaceLandmarks[0][323],
      results.multiFaceLandmarks[0][93],
      results.multiFaceLandmarks[0][152]
    ]
    // Example draw key points
    for (const key of facePoints) {
      canvasCtx.beginPath();
      canvasCtx.arc(key.x * SCREEN_WIDTH, key.y * SCREEN_HEIGHT, 3, 0, 2 * Math.PI);
      canvasCtx.fillStyle = '#30FF30';
      canvasCtx.fill();
    }
  }
  canvasCtx.restore();
};

const faceMesh = new FaceMesh({locateFile: (file) => {
  return `/face_mesh/${file}`;
}});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({image: videoElement});
  },
  width: 720,
  height: SCREEN_HEIGHT
});
camera.start();
