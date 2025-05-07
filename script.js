const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

let statusMap = new Map(); // Track "real"/"not real" status per face

async function setup() {
  // Load models
  await faceapi.nets.tinyFaceDetector.loadFromUri('models/');
  await faceapi.nets.faceLandmark68Net.loadFromUri('models/');

  // Start video
  navigator.mediaDevices.getUserMedia({ video: {} }).then(stream => {
    video.srcObject = stream;
  });
}

video.addEventListener('play', () => {
  canvas.width = video.width;
  canvas.height = video.height;

  setInterval(async () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    detections.forEach((detection, i) => {
      const { landmarks } = detection;
      const points = landmarks.positions;

      // Draw points
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 0.5;
      points.forEach(pt => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, 2 * Math.PI);
        ctx.stroke();
      });

      // Facial metrics
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const mouth = landmarks.getMouth();

      const eyeDist = dist(leftEye[0], rightEye[3]);
      const mouthWidth = dist(mouth[0], mouth[6]);
      const mouthOpen = dist(mouth[14], mouth[18]);

      // Detect expression (simple smile logic)
      let expression = ':|';
      if (mouthWidth > 60 && mouthOpen > 20) expression = ':)';
      else if (mouthWidth < 50 && mouthOpen < 10) expression = ':(';

      // Update "real" / "not real" status
      const key = i;
      if (!statusMap.has(key) || Math.random() < 0.02) {
        // 80% chance to stay "real", 20% to flip
        const newStatus = Math.random() < 0.8 ? "real" : "not real";
        statusMap.set(key, newStatus);
      }

      // Draw "real"/"not real" above face
      const forehead = landmarks.positions[20]; // Rough top center
      const statusText = statusMap.get(key);
      ctx.fillStyle = 'white';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(statusText, forehead.x, forehead.y - 30);

      // Line connecting text to face
      ctx.beginPath();
      ctx.moveTo(forehead.x, forehead.y - 25);
      ctx.lineTo(forehead.x, forehead.y);
      ctx.stroke();

      // Debug info
      ctx.font = '12px sans-serif';
      ctx.fillText(`EyeDist: ${eyeDist.toFixed(1)}`, forehead.x - 60, forehead.y + 30);
      ctx.fillText(`MouthWidth: ${mouthWidth.toFixed(1)}`, forehead.x - 60, forehead.y + 45);
      ctx.fillText(`Expr: ${expression}`, forehead.x - 60, forehead.y + 60);
    });
  }, 100); // every 100ms
});

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

setup();
