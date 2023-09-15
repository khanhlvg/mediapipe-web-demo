import { FaceLandmarker } from '@mediapipe/tasks-vision';

let detector: FaceLandmarker;

FaceLandmarker.createFromOptions(
  {
    wasmLoaderPath: '/wasm/vision_wasm_internal.js',
    wasmBinaryPath: '/wasm/vision_wasm_internal.wasm',
  },
  {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
    },
    numFaces: 1,
    outputFaceBlendshapes: true
  }).then(d => {
    detector = d;
});

const ctx = self;
ctx.addEventListener('message', (e) => {
  if (detector && e?.data) {
    const timeMs = performance.now()
    const results = e.data.mode === 'VIDEO'
      ? detector.detectForVideo(e.data.imageData, timeMs)
      : detector.detect(e.data.imageData)

    postMessage({
      mode: e.data.mode,
      results
    });
  }
});
