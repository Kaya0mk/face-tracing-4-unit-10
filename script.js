const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const context = canvas.getContext('2d');

// Set up the initial status and timer for changing the status
let status = "real";
let statusChangeTimer = 0;

// Function to start the video stream from the webcam
async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
  } catch (err) {
    console.error("Error accessing webcam:", err);
  }
}

// Function to load all necessary face-api.js models from the 'models' folder
async function loadModels() {
  const MODEL_URL = './models'; // Make sure this is the correct path to your models folder
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
  ]);
}

// Function to randomly change the status ("real" or "not real")
function getStatus() {
  if (statusChangeTimer <= 0) {
    status = Math.random() < 0.8 ? "real" : "not real"; // 80% chance to be "real"
    statusChangeTimer = Math.floor(Math.random() * 100) + 200; // 200-300 frames
  } else {
    statusChangeTimer--;
  }
  return status;
}

// Event listener for when the video starts playing
video.addEventListener('play', () => {
  // Adjust the canvas size to match the video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  // Set up a loop that runs every 100ms to detect faces and show information
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(
      video,
      new faceapi.TinyFaceDetectorOptions()
    )
    .withFaceLandmarks()
    .withFaceExpressions()
    .withAgeAndGender();

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    context.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas for next detection frame

    resizedDetections.forEach(detection => {
      const { age, gender, genderProbability, expressions, detection: box } = detection;
      const { x, y, width, height } = box.box;

      // Draw bounding box around the detected face
      context.strokeStyle = 'white';
      context.lineWidth = 2;
      context.strokeRect(x, y, width, height);

      // Display the "real"/"not real" status above the face
      const currentStatus = getStatus();
      context.fillStyle = 'white';
      context.font = '20px Arial';
      context.fillText(currentStatus, x + width / 2 - 20, y - 10);

      // Display age and gender below the face
      const genderText = `${gender} (${(genderProbability * 100).toFixed(1)}%)`;
      const ageText = `Age: ${Math.round(age)}`;
      context.fillText(genderText, x, y + height + 20);
      context.fillText(ageText, x, y + height + 40);

      // Display the dominant facial expression
      const sortedExpressions = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
      const [dominantExpression, confidence] = sortedExpressions[0];
      const expressionText = `Expression: ${dominantExpression} (${(confidence * 100).toFixed(1)}%)`;
      context.fillText(expressionText, x, y + height + 60);
    });
  }, 100);
});

// Initialize the models and start the video stream
loadModels().then(startVideo);
