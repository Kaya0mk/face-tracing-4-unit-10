// Ensure face-api.js is properly loaded
const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const context = canvas.getContext('2d');

// Placeholder status for faces
let status = "real";
let statusChangeTimer = 0;

// Function to start webcam
async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
  } catch (err) {
    console.error("Error accessing webcam:", err);
  }
}

// Function to load models from the models directory
async function loadModels() {
  const MODEL_URL = '../models'; // Ensure this path is correct
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
  ]);
}

// Randomly decide face status ("real" or "not real")
function getStatus() {
  if (statusChangeTimer <= 0) {
    status = Math.random() < 0.8 ? "real" : "not real";
    statusChangeTimer = Math.floor(Math.random() * 100) + 200; // 200-300 frames
  } else {
    statusChangeTimer--;
  }
  return status;
}

// Event listener when video starts playing
video.addEventListener('play', () => {
  // Set canvas size to match video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  // Every 100ms, process the video frame
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions()
    )
    .withFaceLandmarks()
    .withFaceExpressions()
    .withAgeAndGender();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    context.clearRect(0, 0, canvas.width, canvas.height);

    resizedDetections.forEach(detection => {
      const { age, gender, genderProbability, expressions, detection: box } = detection;
      const { x, y, width, height } = box.box;

      // Draw bounding box
      context.strokeStyle = 'white';
      context.lineWidth = 2;
      context.strokeRect(x, y, width, height);

      // Display status above the face
      const currentStatus = getStatus();
      context.fillStyle = 'white';
      context.font = '20px Arial';
      context.fillText(currentStatus, x + width / 2 - 20, y - 10);

      // Display age and gender below the face
      const genderText = `${gender} (${(genderProbability * 100).toFixed(1)}%)`;
      const ageText = `Age: ${Math.round(age)}`;
      context.fillText(genderText, x, y + height + 20);
      context.fillText(ageText, x, y + height + 40);

      // Display dominant expression
      const sortedExpressions = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
      const [dominantExpression, confidence] = sortedExpressions[0];
      const expressionText = `Expression: ${dominantExpression} (${(confidence * 100).toFixed(1)}%)`;
      context.fillText(expressionText, x, y + height + 60);
    });
  }, 100);
});

// Initialize the models and start the video
loadModels().then(startVideo);
