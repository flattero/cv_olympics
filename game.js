const video = document.createElement('video');
video.width = 640;
video.height = 480;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let poseModel;
let videoStream;
let pose = null;
let prevLeftKneeY = null;
let prevRightKneeY = null;
let runSpeed = 0;
const character = { x: 50, y: canvas.height - 100, width: 50, height: 100 };
const finishLine = { x: canvas.width - 100, y: 0, width: 10, height: canvas.height };

let startTime;
let elapsedTime = 0;
let gameStarted = false;
let countdownTimer;

async function setupCamera() {
  videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = videoStream;
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadPoseModel() {
  const model = poseDetection.SupportedModels.MoveNet;
  const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
  poseModel = await poseDetection.createDetector(model, detectorConfig);
  console.log('Pose model loaded');
}

async function detectPose() {
  const poses = await poseModel.estimatePoses(video);
  if (poses.length > 0) {
    pose = poses[0];
    const leftKnee = pose.keypoints.find(k => k.name === 'left_knee');
    const rightKnee = pose.keypoints.find(k => k.name === 'right_knee');
    
    // Reset runSpeed for this frame
    runSpeed = 0;

    if (leftKnee && rightKnee) {
      if (prevLeftKneeY !== null && prevRightKneeY !== null) {
        runSpeed = Math.abs(leftKnee.y - prevLeftKneeY) + Math.abs(rightKnee.y - prevRightKneeY);
      }
      prevLeftKneeY = leftKnee.y;
      prevRightKneeY = rightKnee.y;
    }

    // Detect hand gesture for starting the game
    const rightHand = pose.keypoints.find(k => k.name === 'right_wrist');
    if (rightHand && rightHand.score > 0.5 && rightHand.y < pose.keypoints[0].y && !gameStarted) {
      startCountdown();
    }
  }
  requestAnimationFrame(detectPose);
}

function drawCameraView() {
  const cameraWidth = 320; // Half the original width
  const cameraHeight = 180; // Half the original height
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -cameraWidth, 0, cameraWidth, cameraHeight);
  ctx.restore();
}

function drawCharacter() {
  ctx.fillStyle = 'red';
  ctx.fillRect(character.x, character.y, character.width, character.height);
}

function drawFinishLine() {
  ctx.fillStyle = 'white';
  ctx.fillRect(finishLine.x, finishLine.y, finishLine.width, finishLine.height);
}

function updateCharacter() {
  if (!gameStarted) return;

  // Set a base speed and add the speed from body movements
  const baseSpeed = 5;
  const speedMultiplier = 10; // Adjust this multiplier as needed
  const moveSpeed = baseSpeed + runSpeed * speedMultiplier;

  character.x += moveSpeed;

  if (character.x < 0) character.x = 0;
  if (character.x > canvas.width - character.width) character.x = canvas.width - character.width;
}

function updateTimer() {
  if (!gameStarted) return;

  const timerDiv = document.getElementById('timer');
  elapsedTime = (Date.now() - startTime) / 1000;
  timerDiv.innerText = `Time: ${elapsedTime.toFixed(2)}s`;
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCameraView();
  drawFinishLine();
  drawCharacter();
  updateCharacter();
  updateTimer();

  if (gameStarted && character.x + character.width >= finishLine.x) {
    alert(`You finished the 100m dash in ${elapsedTime.toFixed(2)} seconds!`);
    resetGame();
    return;
  }

  requestAnimationFrame(gameLoop);
}

function startCountdown() {
  if (gameStarted) return;

  const countdownDiv = document.getElementById('countdown');
  let countdown = 3;
  countdownDiv.style.display = 'block';

  countdownTimer = setInterval(() => {
    countdownDiv.innerText = countdown;
    if (countdown === 0) {
      clearInterval(countdownTimer);
      countdownDiv.style.display = 'none';
      startGame();
    }
    countdown--;
  }, 1000);
}

function startGame() {
  gameStarted = true;
  startTime = Date.now();
}

function resetGame() {
  character.x = 50;
  gameStarted = false;
  prevLeftKneeY = null;
  prevRightKneeY = null;
  elapsedTime = 0;
  document.getElementById('timer').innerText = 'Time: 0.00s';
  gameLoop();
}

async function main() {
  await setupCamera();
  await loadPoseModel();

  video.play();
  detectPose();
  gameLoop();
}

main();
