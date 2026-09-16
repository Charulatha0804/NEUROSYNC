const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const statusText = document.getElementById("status");
const instruction = document.getElementById("instruction");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const exitBtn = document.getElementById("exitBtn");
const movementBar = document.getElementById("movementBar");

let score = 0;
let gameStarted = false;
let paused = false;

let handX = 0;
let handY = 0;
let handDetected = false;

let appleX = 0;
let appleY = 0;
let appleSize = 55;

let lastX = 0;
let lastY = 0;
let movement = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function createApple() {
    appleX = Math.random() * (canvas.width - 150) + 75;
    appleY = Math.random() * (canvas.height - 300) + 180;
}

createApple();

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);

    sky.addColorStop(0, "#78c7e8");
    sky.addColorStop(0.55, "#b9e6c1");
    sky.addColorStop(1, "#5c9b54");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#4f8c48";
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);

    drawTree(120, 400);
    drawTree(canvas.width - 150, 350);
    drawTree(canvas.width - 400, 450);
}

function drawTree(x, y) {
    ctx.fillStyle = "#70452b";
    ctx.fillRect(x - 20, y, 40, 220);

    ctx.beginPath();
    ctx.arc(x, y, 100, 0, Math.PI * 2);
    ctx.fillStyle = "#3d783c";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x - 60, y + 30, 70, 0, Math.PI * 2);
    ctx.fillStyle = "#4d9148";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + 60, y + 30, 70, 0, Math.PI * 2);
    ctx.fillStyle = "#478641";
    ctx.fill();
}

function drawApple() {
    ctx.beginPath();
    ctx.arc(appleX, appleY, appleSize, 0, Math.PI * 2);
    ctx.fillStyle = "#e53935";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(appleX - 18, appleY - 10, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ff8a80";
    ctx.fill();

    ctx.strokeStyle = "#542d18";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(appleX, appleY - 45);
    ctx.lineTo(appleX + 5, appleY - 70);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
        appleX + 20,
        appleY - 60,
        18,
        8,
        -0.4,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#388e3c";
    ctx.fill();
}

function drawHand() {
    if (!handDetected || !gameStarted || paused) {
        return;
    }

    ctx.beginPath();
    ctx.arc(handX, handY, 30, 0, Math.PI * 2);

    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.font = "30px Arial";
    ctx.fillText("✋", handX - 20, handY + 10);
}

function checkAppleCollision() {
    if (!handDetected) {
        return;
    }

    const dx = handX - appleX;
    const dy = handY - appleY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < appleSize + 30) {
        score++;
        scoreText.textContent = score;

        instruction.textContent = "🍎 GREAT! APPLE CAUGHT!";

        createApple();

        setTimeout(() => {
            if (gameStarted && !paused) {
                instruction.textContent = "MOVE YOUR HAND TO THE APPLE";
            }
        }, 1000);
    }
}

function updateMovement() {
    if (!handDetected) {
        return;
    }

    const dx = Math.abs(handX - lastX);
    const dy = Math.abs(handY - lastY);

    movement += dx + dy;

    lastX = handX;
    lastY = handY;

    let percentage = Math.min(movement / 10, 100);

    movementBar.style.width = percentage + "%";
}

function drawGame() {
    drawBackground();

    if (gameStarted && !paused) {
        drawApple();
        drawHand();
        checkAppleCollision();
        updateMovement();
    }

    requestAnimationFrame(drawGame);
}

drawGame();

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
});

hands.onResults(onResults);

function onResults(results) {

    if (!gameStarted || paused) {
        return;
    }

    if (
        results.multiHandLandmarks &&
        results.multiHandLandmarks.length > 0
    ) {

        handDetected = true;

        const landmark = results.multiHandLandmarks[0][8];

        handX = (1 - landmark.x) * canvas.width;
        handY = landmark.y * canvas.height;

        statusText.textContent = "● HAND TRACKING ACTIVE";

    } else {

        handDetected = false;

        statusText.textContent = "SHOW YOUR HAND TO THE CAMERA";
    }
}

const camera = new Camera(video, {
    onFrame: async () => {
        await hands.send({ image: video });
    },
    width: 640,
    height: 480
});

startBtn.addEventListener("click", async () => {

    gameStarted = true;
    paused = false;

    startBtn.style.display = "none";

    statusText.textContent = "STARTING CAMERA...";

    try {
        await camera.start();

        instruction.textContent = "MOVE YOUR HAND TO THE APPLE";

    } catch (error) {

        console.error(error);

        statusText.textContent =
            "CAMERA ACCESS FAILED. PLEASE ALLOW CAMERA.";
    }
});

pauseBtn.addEventListener("click", () => {

    if (!gameStarted) {
        return;
    }

    paused = !paused;

    if (paused) {

        pauseBtn.textContent = "▶ RESUME";
        instruction.textContent = "GAME PAUSED";

    } else {

        pauseBtn.textContent = "⏸ PAUSE";
        instruction.textContent = "MOVE YOUR HAND TO THE APPLE";
    }
});

exitBtn.addEventListener("click", () => {

    gameStarted = false;
    paused = false;

    startBtn.style.display = "block";

    instruction.textContent = "READY TO PLAY";

    statusText.textContent = "GAME STOPPED";

    window.parent.postMessage({ type: "NEUROSYNC_BACK_TO_LEVELS" }, "*");

});