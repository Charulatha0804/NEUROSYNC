// =====================================================
// REHABPLAY AI
// LEVEL 4 - FRUIT BASKET COLLECTOR
// =====================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const video = document.getElementById("cameraVideo");

const scoreElement = document.getElementById("score");
const finalScoreElement = document.getElementById("finalScore");

const startScreen = document.getElementById("startScreen");
const completeScreen = document.getElementById("completeScreen");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");

const leftHandBtn = document.getElementById("leftHandBtn");
const rightHandBtn = document.getElementById("rightHandBtn");

const cameraStatus = document.getElementById("cameraStatus");

// =====================================================
// GAME SETTINGS
// =====================================================

const TARGET_SCORE = 100;

let score = 0;
let gameRunning = false;
let gameCompleted = false;

let selectedHand = "Left";

let lastTime = 0;
let spawnTimer = 0;

let objects = [];
let particles = [];


// =====================================================
// BASKET
// =====================================================

const basket = {

  x: canvas.width / 2,

  targetX: canvas.width / 2,

  y: canvas.height - 105,

  width: 150,

  height: 65,

  smooth: 0.28

};


// =====================================================
// HAND TRACKING
// =====================================================

let currentHandX = canvas.width / 2;

let smoothedHandX = canvas.width / 2;

let handDetected = false;


// =====================================================
// FRUITS
// =====================================================

const freshFruits = [
  "🍎",
  "🍊",
  "🍌",
  "🍐",
  "🍓",
  "🥭"
];

const rottenObjects = [
  "🥀",
  "🍂",
  "🤢"
];

const junkObjects = [
  "🗑️",
  "🥫",
  "🧴",
  "🪨"
];


// =====================================================
// START BUTTON
// =====================================================

startBtn.addEventListener("click", function () {

  startScreen.classList.add("hidden");

  resetGame();

  gameRunning = true;

  lastTime = performance.now();

  requestAnimationFrame(gameLoop);

});


// =====================================================
// NEXT LEVEL
// =====================================================

nextBtn.addEventListener("click", function () {

  // Change this to your Level 5 page if needed.
  window.parent.postMessage({ type: "NEUROSYNC_BACK_TO_LEVELS" }, "*");

});


// =====================================================
// HAND BUTTONS
// =====================================================

leftHandBtn.addEventListener("click", function () {

  selectedHand = "Left";

  leftHandBtn.classList.add("active");
  rightHandBtn.classList.remove("active");

});


rightHandBtn.addEventListener("click", function () {

  selectedHand = "Right";

  rightHandBtn.classList.add("active");
  leftHandBtn.classList.remove("active");

});


// =====================================================
// RESET GAME
// =====================================================

function resetGame() {

  score = 0;

  scoreElement.textContent = score;

  finalScoreElement.textContent = score;

  objects = [];

  particles = [];

  spawnTimer = 0;

  gameCompleted = false;

  basket.x = canvas.width / 2;

  basket.targetX = canvas.width / 2;

  smoothedHandX = canvas.width / 2;

  currentHandX = canvas.width / 2;

}


// =====================================================
// ADD SCORE
// =====================================================

function addScore(amount) {

  score += amount;

  if (score > TARGET_SCORE) {
    score = TARGET_SCORE;
  }

  scoreElement.textContent = score;

  if (score >= TARGET_SCORE) {

    completeGame();

  }

}


// =====================================================
// COMPLETE GAME
// =====================================================

function completeGame() {

  if (gameCompleted) return;

  gameCompleted = true;

  gameRunning = false;

  score = TARGET_SCORE;

  scoreElement.textContent = TARGET_SCORE;

  finalScoreElement.textContent = TARGET_SCORE;

  completeScreen.classList.remove("hidden");

}


// =====================================================
// RANDOM OBJECT TYPE
// =====================================================

function createObject() {

  const random = Math.random();

  let type;

  let emoji;

  if (random < 0.65) {

    type = "fresh";

    emoji =
      freshFruits[
        Math.floor(Math.random() * freshFruits.length)
      ];

  } else if (random < 0.83) {

    type = "rotten";

    emoji =
      rottenObjects[
        Math.floor(Math.random() * rottenObjects.length)
      ];

  } else {

    type = "junk";

    emoji =
      junkObjects[
        Math.floor(Math.random() * junkObjects.length)
      ];

  }

  return {

    x: 60 + Math.random() * (canvas.width - 120),

    y: -60,

    size: 48,

    speed: 130 + Math.random() * 50,

    type: type,

    emoji: emoji,

    rotation: Math.random() * Math.PI * 2,

    rotationSpeed:
      (Math.random() - 0.5) * 1.5

  };

}


// =====================================================
// SPAWN OBJECTS
// =====================================================

function spawnObject() {

  objects.push(createObject());

}


// =====================================================
// COLLISION
// =====================================================

function checkCollision(object) {

  const basketLeft =
    basket.x - basket.width / 2;

  const basketRight =
    basket.x + basket.width / 2;

  const basketTop =
    basket.y;

  const basketBottom =
    basket.y + basket.height;

  const objectLeft =
    object.x - object.size / 2;

  const objectRight =
    object.x + object.size / 2;

  const objectTop =
    object.y - object.size / 2;

  const objectBottom =
    object.y + object.size / 2;

  return (
    objectRight > basketLeft &&
    objectLeft < basketRight &&
    objectBottom > basketTop &&
    objectTop < basketBottom
  );

}


// =====================================================
// PARTICLES
// =====================================================

function createParticles(x, y, emoji) {

  for (let i = 0; i < 10; i++) {

    particles.push({

      x: x,

      y: y,

      vx: (Math.random() - 0.5) * 100,

      vy: -50 - Math.random() * 80,

      life: 1,

      emoji: emoji

    });

  }

}


// =====================================================
// UPDATE PARTICLES
// =====================================================

function updateParticles(delta) {

  for (let i = particles.length - 1; i >= 0; i--) {

    const p = particles[i];

    p.x += p.vx * delta;

    p.y += p.vy * delta;

    p.vy += 120 * delta;

    p.life -= delta * 1.5;

    if (p.life <= 0) {

      particles.splice(i, 1);

    }

  }

}


// =====================================================
// UPDATE OBJECTS
// =====================================================

function updateObjects(delta) {

  for (let i = objects.length - 1; i >= 0; i--) {

    const object = objects[i];

    object.y += object.speed * delta;

    object.rotation +=
      object.rotationSpeed * delta;


    // Collision
    if (checkCollision(object)) {

      if (object.type === "fresh") {

        addScore(10);

        createParticles(
          object.x,
          object.y,
          "✨"
        );

      } else {

        // NO PENALTY
        // Important for rehabilitation.
        createParticles(
          object.x,
          object.y,
          "💨"
        );

      }

      objects.splice(i, 1);

      continue;

    }


    // Remove object after it leaves screen

    if (
      object.y >
      canvas.height + 80
    ) {

      objects.splice(i, 1);

    }

  }

}


// =====================================================
// UPDATE BASKET
// =====================================================

function updateBasket() {

  // Smooth basket movement.
  // Small hand movements still move the basket.

  basket.x +=
    (basket.targetX - basket.x) *
    basket.smooth;

}


// =====================================================
// DRAW SKY
// =====================================================

function drawBackground() {

  // Sky

  const sky =
    ctx.createLinearGradient(
      0,
      0,
      0,
      canvas.height
    );

  sky.addColorStop(0, "#76c9f5");
  sky.addColorStop(0.65, "#bde9ff");
  sky.addColorStop(1, "#e7f8ff");

  ctx.fillStyle = sky;

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  // Clouds

  drawCloud(140, 90, 1);

  drawCloud(500, 70, 0.8);

  drawCloud(850, 125, 1.1);


  // Trees

  drawTree(70, 330, 1.1);

  drawTree(960, 330, 1.2);


  // Ground

  ctx.fillStyle = "#6dbb55";

  ctx.fillRect(
    0,
    canvas.height - 150,
    canvas.width,
    150
  );


  // Ground line

  ctx.fillStyle = "#4d9b43";

  ctx.fillRect(
    0,
    canvas.height - 150,
    canvas.width,
    12
  );

}


// =====================================================
// CLOUD
// =====================================================

function drawCloud(x, y, scale) {

  ctx.save();

  ctx.translate(x, y);

  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(255,255,255,0.9)";

  ctx.beginPath();

  ctx.arc(0, 10, 25, 0, Math.PI * 2);

  ctx.arc(30, 0, 35, 0, Math.PI * 2);

  ctx.arc(65, 12, 25, 0, Math.PI * 2);

  ctx.fill();

  ctx.restore();

}


// =====================================================
// TREE
// =====================================================

function drawTree(x, y, scale) {

  ctx.save();

  ctx.translate(x, y);

  ctx.scale(scale, scale);


  // Trunk

  ctx.fillStyle = "#7b4a2f";

  ctx.fillRect(
    -15,
    40,
    30,
    100
  );


  // Leaves

  ctx.fillStyle = "#3d9144";

  ctx.beginPath();

  ctx.arc(
    -30,
    35,
    45,
    0,
    Math.PI * 2
  );

  ctx.arc(
    25,
    30,
    55,
    0,
    Math.PI * 2
  );

  ctx.arc(
    0,
    -15,
    55,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();

}


// =====================================================
// DRAW OBJECT
// =====================================================

function drawObject(object) {

  ctx.save();

  ctx.translate(
    object.x,
    object.y
  );

  ctx.rotate(object.rotation);

  ctx.font =
    `${object.size}px Arial`;

  ctx.textAlign = "center";

  ctx.textBaseline = "middle";

  ctx.fillText(
    object.emoji,
    0,
    0
  );

  ctx.restore();

}


// =====================================================
// DRAW BASKET
// =====================================================

function drawBasket() {

  const x =
    basket.x -
    basket.width / 2;

  const y =
    basket.y;


  ctx.save();


  // Basket shadow

  ctx.fillStyle =
    "rgba(0,0,0,0.18)";

  ctx.beginPath();

  ctx.ellipse(
    basket.x,
    y + basket.height + 8,
    basket.width / 2,
    10,
    0,
    0,
    Math.PI * 2
  );

  ctx.fill();


  // Basket body

  ctx.fillStyle = "#b86b32";

  ctx.beginPath();

  ctx.moveTo(
    x + 8,
    y + 8
  );

  ctx.lineTo(
    x + basket.width - 8,
    y + 8
  );

  ctx.lineTo(
    x + basket.width - 25,
    y + basket.height
  );

  ctx.lineTo(
    x + 25,
    y + basket.height
  );

  ctx.closePath();

  ctx.fill();


  // Basket stripes

  ctx.strokeStyle = "#7b421f";

  ctx.lineWidth = 5;

  for (
    let i = 20;
    i < basket.width - 10;
    i += 25
  ) {

    ctx.beginPath();

    ctx.moveTo(
      x + i,
      y + 12
    );

    ctx.lineTo(
      x + i - 5,
      y + basket.height - 5
    );

    ctx.stroke();

  }


  // Basket handle

  ctx.strokeStyle = "#7b421f";

  ctx.lineWidth = 8;

  ctx.beginPath();

  ctx.arc(
    basket.x,
    y + 15,
    55,
    Math.PI,
    0
  );

  ctx.stroke();


  ctx.restore();

}


// =====================================================
// DRAW PARTICLES
// =====================================================

function drawParticles() {

  for (const p of particles) {

    ctx.globalAlpha =
      Math.max(0, p.life);

    ctx.font = "25px Arial";

    ctx.textAlign = "center";

    ctx.fillText(
      p.emoji,
      p.x,
      p.y
    );

  }

  ctx.globalAlpha = 1;

}


// =====================================================
// DRAW GAME
// =====================================================

function drawGame() {

  drawBackground();


  // Objects

  for (const object of objects) {

    drawObject(object);

  }


  // Basket

  drawBasket();


  // Particles

  drawParticles();


  // Hand indicator

  if (handDetected) {

    ctx.beginPath();

    ctx.arc(
      currentHandX,
      canvas.height - 35,
      8,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "rgba(255,255,255,0.8)";

    ctx.fill();

  }

}


// =====================================================
// GAME LOOP
// =====================================================

function gameLoop(timestamp) {

  if (!gameRunning) {

    drawGame();

    return;

  }


  const delta =
    Math.min(
      (timestamp - lastTime) / 1000,
      0.04
    );

  lastTime = timestamp;


  // Spawn

  spawnTimer += delta;

  if (spawnTimer >= 0.8) {

    spawnTimer = 0;

    spawnObject();

  }


  updateBasket();

  updateObjects(delta);

  updateParticles(delta);

  drawGame();


  requestAnimationFrame(gameLoop);

}


// =====================================================
// MEDIAPIPE HANDS
// =====================================================

const hands = new Hands({

  locateFile: function (file) {

    return (
      "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" +
      file
    );

  }

});


hands.setOptions({

  maxNumHands: 2,

  modelComplexity: 1,

  minDetectionConfidence: 0.45,

  minTrackingConfidence: 0.45

});


// =====================================================
// HAND RESULTS
// =====================================================

hands.onResults(function (results) {

  handDetected = false;


  if (
    !results.multiHandLandmarks ||
    !results.multiHandedness
  ) {

    cameraStatus.textContent =
      "SHOW YOUR HAND";

    return;

  }


  let selectedIndex = -1;


  for (
    let i = 0;
    i < results.multiHandedness.length;
    i++
  ) {

    const detectedLabel =
      results.multiHandedness[i].label;


    /*
      MediaPipe's label can be reversed
      because the webcam is mirrored.
    */

    let actualHand = detectedLabel;


    if (detectedLabel === "Left") {

      actualHand = "Right";

    } else {

      actualHand = "Left";

    }


    if (
      actualHand === selectedHand
    ) {

      selectedIndex = i;

      break;

    }

  }


  if (selectedIndex === -1) {

    cameraStatus.textContent =
      `${selectedHand.toUpperCase()} HAND`;

    return;

  }


  const landmarks =
    results.multiHandLandmarks[
      selectedIndex
    ];


  // Use several palm points instead of only wrist.
  // This makes small movements more stable.

  const palmPoints = [
    landmarks[0],
    landmarks[5],
    landmarks[9],
    landmarks[13],
    landmarks[17]
  ];


  let rawX = 0;


  for (const point of palmPoints) {

    rawX += point.x;

  }


  rawX /=
    palmPoints.length;


  // ===================================================
  // FULL HORIZONTAL CAMERA RANGE
  // ===================================================

  // Webcam is mirrored.
  // Reverse X so movement matches what patient sees.

  let mirroredX =
    1 - rawX;


  /*
    Expand the usable camera range.

    If hand is around the left edge of the camera,
    basket reaches left side.

    If hand is around the right edge,
    basket reaches right side.
  */

  const INPUT_MIN = 0.03;

  const INPUT_MAX = 0.97;


  let normalizedX =
    (mirroredX - INPUT_MIN) /
    (INPUT_MAX - INPUT_MIN);


  // Keep between 0 and 1

  normalizedX =
    Math.max(
      0,
      Math.min(
        1,
        normalizedX
      )
    );


  // Convert to game screen

  const gameX =
    normalizedX *
    canvas.width;


  /*
    Smooth movement.

    0.35 means the basket responds quickly
    while still reducing shaking/tremor.
  */

  smoothedHandX +=
    (gameX - smoothedHandX) *
    0.35;


  currentHandX =
    smoothedHandX;


  /*
    IMPORTANT:
    Basket center can travel from 0
    all the way to canvas.width.

    We do NOT use the old half-width restriction.
  */

  basket.targetX =
    currentHandX;


  basket.targetX =
    Math.max(
      0,
      Math.min(
        canvas.width,
        basket.targetX
      )
    );


  handDetected = true;

  cameraStatus.textContent =
    `${selectedHand.toUpperCase()} HAND READY`;

});


// =====================================================
// CAMERA
// =====================================================

let camera = null;


async function startCamera() {

  try {

    cameraStatus.textContent =
      "STARTING CAMERA...";


    camera =
      new Camera(
        video,
        {

          onFrame: async function () {

            await hands.send({
              image: video
            });

          },

          width: 640,

          height: 480

        }
      );


    /*
      IMPORTANT:
      camera.start() does NOT need .catch().
      This avoids the error that can stop the
      whole game from opening.
    */

    camera.start();


    cameraStatus.textContent =
      "SHOW YOUR HAND";


  } catch (error) {

    console.error(
      "Camera error:",
      error
    );


    cameraStatus.textContent =
      "CAMERA ERROR";

  }

}


// =====================================================
// INITIAL DRAW
// =====================================================

drawGame();


// =====================================================
// START CAMERA
// =====================================================

startCamera();