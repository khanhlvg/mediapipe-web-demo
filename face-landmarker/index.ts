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
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils'

const videoElement = document.getElementById('input-video') as HTMLVideoElement;
const canvasElement = document.getElementById('output-canvas') as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext('2d');
const resultEl = document.getElementById('result');

const detectMidPoint2D = (top, left, right, bottom) => {
  const topX = top.x;
  const topY = top.y;
  const leftX = left.x;
  const leftY = left.y;
  const rightX = right.x;
  const rightY = right.y;
  const bottomX = bottom.x;
  const bottomY = bottom.y;

  const m1 = (topY - bottomY)/(topX - bottomX);
  const n1 = topY - topX * m1;

  const m2 = (leftY - rightY)/(leftX - rightX);
  const n2 = leftY - leftX * m2;

  const midX = (n2 - n1)/(m1 - m2);
  const midY = midX * m1 + n1;
  return {
    x: midX,
    y: midY
  };
}

const detectDirection = (top, left, right, bottom) => {
  return [
    top.z - bottom.z > 0.1 ? 'top' : '',
    top.z - bottom.z < -0.08 ? 'bottom' : '',
    left.z - right.z > 0.1 ? 'left' : '',
    left.z - right.z < -0.1 ? 'right' : ''
  ].filter(v => v).join('-');
}

const onResults = (results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  if (results.multiFaceLandmarks && results.multiFaceLandmarks.length) {

    resultEl.innerHTML = detectDirection(
      results.multiFaceLandmarks[0][10],
      results.multiFaceLandmarks[0][323],
      results.multiFaceLandmarks[0][93],
      results.multiFaceLandmarks[0][152]
    ) || 'center';
    
    for (const landmarks of results.multiFaceLandmarks) {
      // drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {color: '#C0C0C070', lineWidth: 1});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYE, {color: '#FF3030', lineWidth: 2});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_EYEBROW, {color: '#FF3030', lineWidth: 2});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_RIGHT_IRIS, {color: '#FF3030', lineWidth: 2});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYE, {color: '#30FF30', lineWidth: 2});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_EYEBROW, {color: '#30FF30', lineWidth: 2});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_LEFT_IRIS, {color: '#30FF30', lineWidth: 2});
      // drawConnectors(canvasCtx, landmarks, FACEMESH_LIPS, {color: '#E0E0E0', lineWidth: 2});
      drawConnectors(canvasCtx, landmarks, [[10, 152]], {color: '#E0E0E0', lineWidth: 2});
      drawConnectors(canvasCtx, landmarks, [[323, 93]], {color: '#E0E0E0', lineWidth: 2});
    }
  }
  canvasCtx.restore();
}

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
  width: 480,
  height: 360
});
camera.start();
