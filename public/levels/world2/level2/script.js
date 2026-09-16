// ============================================================
// REHABPLAY AI - LEVEL 2
// GOLDEN COIN ROAD
// FULL SCREEN HAND-CONTROLLED MOVEMENT + VOICE
// ============================================================


// =========================
// ELEMENTS
// =========================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const inputVideo = document.getElementById("inputVideo");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraCtx = cameraCanvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const startButton = document.getElementById("startButton");

const leftHandBtn = document.getElementById("leftHandBtn");
const rightHandBtn = document.getElementById("rightHandBtn");

const scoreDisplay = document.getElementById("score");
const feedback = document.getElementById("feedback");
const instruction = document.getElementById("instruction");


// =========================
// VOICE
// =========================

let voices = [];
let selectedVoice = null;

let voiceRate = 0.95;

let lastVoiceTime = 0;

const VOICE_COOLDOWN = 900;

let lastDirectionVoice = "";

let handMissingVoiceGiven = false;


function loadVoices() {

    if (!("speechSynthesis" in window)) {
        return;
    }

    voices = speechSynthesis.getVoices();

    if (!voices.length) {
        return;
    }

    selectedVoice =
        voices.find(v => v.lang === "en-IN") ||
        voices.find(v => v.lang === "en-US") ||
        voices.find(v => v.lang === "en-GB") ||
        voices.find(v => v.lang.startsWith("en")) ||
        voices[0];
}


if ("speechSynthesis" in window) {

    loadVoices();

    speechSynthesis.onvoiceschanged = loadVoices;

}


function speak(text, force = false) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    const now = performance.now();

    if (
        !force &&
        now - lastVoiceTime < VOICE_COOLDOWN
    ) {
        return;
    }

    lastVoiceTime = now;

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    utterance.rate = voiceRate;
    utterance.pitch = 1;
    utterance.volume = 1;

    speechSynthesis.speak(utterance);

}


function stopVoice() {

    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }

}


function resetVoiceState() {

    lastDirectionVoice = "";

    handMissingVoiceGiven = false;

}


// =========================
// CANVAS
// =========================

const W = canvas.width;
const H = canvas.height;


// =========================
// FULL WIDTH ROAD
// =========================

const ROAD_LEFT = 0;
const ROAD_RIGHT = W;


// =========================
// CAR
// =========================

const CAR_WIDTH = 82;
const CAR_HEIGHT = 48;

const CAR_Y = H - 105;

let carX = W / 2;


// =========================
// HAND
// =========================

let selectedHand = "right";

let selectedHandIndex = null;

let handPoint = null;

let previousHandX = null;

let smoothedHandX = 0.5;

let lastHandSeen = 0;

const HAND_TIMEOUT = 300;


// =========================
// HAND MOVEMENT
// =========================

// These define how much of the camera
// movement maps to the screen.

const INPUT_MIN_X = 0.02;
const INPUT_MAX_X = 0.98;


// Smoothness
const HAND_SMOOTHING = 0.18;


// =========================
// GAME
// =========================

let gameRunning = false;

let score = 0;

let roadOffset = 0;

let coins = [];

let coinTimer = 0;

const COIN_INTERVAL = 950;

const COIN_SPEED = 190;

const COIN_RADIUS = 17;


// =========================
// FEEDBACK
// =========================

let feedbackTimer = 0;


// =========================
// CLAMP
// =========================

function clamp(value, min, max) {

    return Math.max(
        min,
        Math.min(max, value)
    );

}


// =========================
// HAND SELECTION
// =========================

leftHandBtn.addEventListener(
    "click",
    () => {

        selectedHand = "left";

        leftHandBtn.classList.add(
            "selected"
        );

        rightHandBtn.classList.remove(
            "selected"
        );

        resetHandTracking();

        resetVoiceState();

        showFeedback(
            "LEFT HAND SELECTED"
        );

        speak(
            "Left hand selected.",
            true
        );

    }
);


rightHandBtn.addEventListener(
    "click",
    () => {

        selectedHand = "right";

        rightHandBtn.classList.add(
            "selected"
        );

        leftHandBtn.classList.remove(
            "selected"
        );

        resetHandTracking();

        resetVoiceState();

        showFeedback(
            "RIGHT HAND SELECTED"
        );

        speak(
            "Right hand selected.",
            true
        );

    }
);


// =========================
// RESET HAND
// =========================

function resetHandTracking() {

    selectedHandIndex = null;

    previousHandX = null;

    smoothedHandX = 0.5;

    handPoint = null;

    lastHandSeen = 0;

}


// =========================
// FEEDBACK
// =========================

function showFeedback(text) {

    feedback.textContent = text;

    feedback.style.opacity = "1";

    feedbackTimer = 900;

}


// =========================
// MEDIAPIPE
// =========================

const hands = new Hands({

    locateFile: (file) =>
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" + file

});


hands.setOptions({

    maxNumHands: 2,

    modelComplexity: 0,

    minDetectionConfidence: 0.35,

    minTrackingConfidence: 0.35

});


hands.onResults(handleHands);


// =========================
// FIND SELECTED HAND
// =========================

function findSelectedHand(results) {

    if (
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
    ) {

        return null;

    }


    const candidates = [];


    for (
        let i = 0;
        i < results.multiHandLandmarks.length;
        i++
    ) {

        const landmarks =
            results.multiHandLandmarks[i];


        const palmIndices = [
            0,
            5,
            9,
            13,
            17
        ];


        let palmX = 0;
        let palmY = 0;


        for (const index of palmIndices) {

            palmX += landmarks[index].x;

            palmY += landmarks[index].y;

        }


        palmX /=
            palmIndices.length;

        palmY /=
            palmIndices.length;


        const fingertip =
            landmarks[8];


        candidates.push({

            index: i,

            palmX: palmX,

            palmY: palmY,

            fingertipX: fingertip.x,

            fingertipY: fingertip.y

        });

    }


    // Continue following selected hand
    if (
        selectedHandIndex !== null &&
        candidates[selectedHandIndex]
    ) {

        return candidates[
            selectedHandIndex
        ];

    }


    // Initial selection
    const expectedX =
        selectedHand === "right"
            ? 0.25
            : 0.75;


    let bestCandidate = null;

    let bestDistance = Infinity;


    for (const candidate of candidates) {

        const distance =
            Math.abs(
                candidate.palmX -
                expectedX
            );


        if (
            distance <
            bestDistance
        ) {

            bestDistance =
                distance;

            bestCandidate =
                candidate;

        }

    }


    if (bestCandidate) {

        selectedHandIndex =
            bestCandidate.index;

    }


    return bestCandidate;

}


// =========================
// HANDLE HAND
// =========================

function handleHands(results) {

    const hand =
        findSelectedHand(results);


    // =========================
    // NO HAND
    // =========================

    if (!hand) {

        handPoint = null;


        if (
            lastHandSeen > 0 &&
            performance.now() -
            lastHandSeen >
            HAND_TIMEOUT
        ) {

            if (
                !handMissingVoiceGiven
            ) {

                speak(
                    "Please show your hand."
                );

                handMissingVoiceGiven =
                    true;

            }

        }


        return;

    }


    // Hand visible again
    handMissingVoiceGiven = false;

    lastHandSeen =
        performance.now();


    handPoint = {

        x: hand.fingertipX,

        y: hand.fingertipY

    };


    // =========================
    // DIRECT SCREEN CONTROL
    // =========================

    let targetX =
        hand.fingertipX;


    // Mirror the camera
    targetX =
        1 - targetX;


    // Limit input
    targetX =
        clamp(
            targetX,
            INPUT_MIN_X,
            INPUT_MAX_X
        );


    // Normalize 0-1
    const normalizedX =
        (
            targetX -
            INPUT_MIN_X
        ) /
        (
            INPUT_MAX_X -
            INPUT_MIN_X
        );


    // Smooth hand position
    smoothedHandX +=
        (
            normalizedX -
            smoothedHandX
        ) *
        HAND_SMOOTHING;


    // =========================
    // FULL CANVAS POSITION
    // =========================

    const leftLimit =
        CAR_WIDTH / 2 + 5;


    const rightLimit =
        W -
        CAR_WIDTH / 2 -
        5;


    carX =
        leftLimit +
        smoothedHandX *
        (
            rightLimit -
            leftLimit
        );


    // =========================
    // VOICE DIRECTION
    // =========================

    if (
        normalizedX < 0.30
    ) {

        instruction.textContent =
            "← MOVE LEFT";


        if (
            lastDirectionVoice !==
            "left"
        ) {

            lastDirectionVoice =
                "left";

            speak(
                "Move left."
            );

        }

    }
    else if (
        normalizedX > 0.70
    ) {

        instruction.textContent =
            "MOVE RIGHT →";


        if (
            lastDirectionVoice !==
            "right"
        ) {

            lastDirectionVoice =
                "right";

            speak(
                "Move right."
            );

        }

    }
    else {

        instruction.textContent =
            "KEEP MOVING";

        lastDirectionVoice = "";

    }

}


// =========================
// CREATE COIN
// =========================

function createCoin() {

    const margin = 35;


    const x =
        margin +
        Math.random() *
        (
            W -
            margin * 2
        );


    coins.push({

        x: x,

        y: -30,

        radius: COIN_RADIUS,

        rotation:
            Math.random() *
            Math.PI *
            2,

        collected: false

    });

}


// =========================
// UPDATE COINS
// =========================

function updateCoins(delta) {

    coinTimer +=
        delta * 1000;


    if (
        coinTimer >=
        COIN_INTERVAL
    ) {

        coinTimer = 0;

        createCoin();

    }


    for (
        let i = coins.length - 1;
        i >= 0;
        i--
    ) {

        const coin =
            coins[i];


        coin.y +=
            COIN_SPEED *
            delta;


        coin.rotation +=
            delta * 5;


        if (
            !coin.collected &&
            checkCoinCollision(coin)
        ) {

            collectCoin(coin);

            coins.splice(
                i,
                1
            );

            continue;

        }


        if (
            coin.y >
            H + 40
        ) {

            coins.splice(
                i,
                1
            );

        }

    }

}


// =========================
// COLLISION
// =========================

function checkCoinCollision(coin) {

    const carLeft =
        carX -
        CAR_WIDTH / 2;


    const carRight =
        carX +
        CAR_WIDTH / 2;


    const carTop =
        CAR_Y -
        CAR_HEIGHT / 2;


    const carBottom =
        CAR_Y +
        CAR_HEIGHT / 2;


    const closestX =
        clamp(
            coin.x,
            carLeft,
            carRight
        );


    const closestY =
        clamp(
            coin.y,
            carTop,
            carBottom
        );


    const dx =
        coin.x -
        closestX;


    const dy =
        coin.y -
        closestY;


    return (
        dx * dx +
        dy * dy
    ) <=
    coin.radius *
    coin.radius;

}


// =========================
// COLLECT
// =========================

function collectCoin(coin) {

    coin.collected = true;

    score++;

    scoreDisplay.textContent =
        score;


    showFeedback(
        "🪙 +1 GOLD COIN!"
    );


    speak(
        "Great! One coin collected."
    );

}


// =========================
// DRAW ROAD
// =========================

function drawRoad(delta) {

    // FULL SCREEN ROAD

    ctx.fillStyle =
        "#30343b";


    ctx.fillRect(
        0,
        0,
        W,
        H
    );


    // Slight side areas
    ctx.fillStyle =
        "#1c512e";


    ctx.fillRect(
        0,
        0,
        18,
        H
    );


    ctx.fillRect(
        W - 18,
        0,
        18,
        H
    );


    // Edge lines
    ctx.fillStyle =
        "#f4d35e";


    ctx.fillRect(
        18,
        0,
        5,
        H
    );


    ctx.fillRect(
        W - 23,
        0,
        5,
        H
    );


    // Center dashed line
    roadOffset +=
        delta * 300;


    if (
        roadOffset > 80
    ) {

        roadOffset -= 80;

    }


    ctx.fillStyle =
        "#eeeeee";


    for (
        let y = -80 + roadOffset;
        y < H;
        y += 80
    ) {

        ctx.fillRect(
            W / 2 - 4,
            y,
            8,
            42
        );

    }

}


// =========================
// DRAW COINS
// =========================

function drawCoins() {

    for (const coin of coins) {

        ctx.save();


        ctx.translate(
            coin.x,
            coin.y
        );


        const scale =
            Math.abs(
                Math.cos(
                    coin.rotation
                )
            );


        ctx.scale(
            Math.max(
                scale,
                0.18
            ),
            1
        );


        ctx.beginPath();

        ctx.arc(
            0,
            0,
            coin.radius,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            "#ffd700";

        ctx.fill();


        ctx.beginPath();

        ctx.arc(
            0,
            0,
            coin.radius - 5,
            0,
            Math.PI * 2
        );


        ctx.fillStyle =
            "#ffb700";

        ctx.fill();


        ctx.fillStyle =
            "#fff3a3";


        ctx.font =
            "bold 18px Arial";


        ctx.textAlign =
            "center";


        ctx.textBaseline =
            "middle";


        ctx.fillText(
            "$",
            0,
            1
        );


        ctx.restore();

    }

}


// =========================
// DRAW CAR
// =========================

function drawCar() {

    ctx.save();


    ctx.translate(
        carX,
        CAR_Y
    );


    // Shadow
    ctx.fillStyle =
        "rgba(0,0,0,0.35)";


    ctx.beginPath();

    ctx.ellipse(
        0,
        28,
        48,
        10,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Body
    ctx.fillStyle =
        "#e63946";


    roundRect(
        ctx,
        -CAR_WIDTH / 2,
        -CAR_HEIGHT / 2,
        CAR_WIDTH,
        CAR_HEIGHT,
        12
    );


    ctx.fill();


    // Roof
    ctx.fillStyle =
        "#c1121f";


    roundRect(
        ctx,
        -27,
        -30,
        54,
        25,
        9
    );


    ctx.fill();


    // Windows
    ctx.fillStyle =
        "#8ecae6";


    roundRect(
        ctx,
        -23,
        -26,
        20,
        16,
        5
    );


    ctx.fill();


    roundRect(
        ctx,
        3,
        -26,
        20,
        16,
        5
    );


    ctx.fill();


    // Wheels
    ctx.fillStyle =
        "#151515";


    ctx.beginPath();

    ctx.arc(
        -28,
        22,
        10,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.beginPath();

    ctx.arc(
        28,
        22,
        10,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Headlights
    ctx.fillStyle =
        "#fff3b0";


    ctx.fillRect(
        -35,
        -5,
        8,
        7
    );


    ctx.fillRect(
        27,
        -5,
        8,
        7
    );


    ctx.restore();

}


// =========================
// ROUNDED RECTANGLE
// =========================

function roundRect(
    context,
    x,
    y,
    width,
    height,
    radius
) {

    context.beginPath();


    context.moveTo(
        x + radius,
        y
    );


    context.lineTo(
        x + width - radius,
        y
    );


    context.quadraticCurveTo(
        x + width,
        y,
        x + width,
        y + radius
    );


    context.lineTo(
        x + width,
        y + height - radius
    );


    context.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height
    );


    context.lineTo(
        x + radius,
        y + height
    );


    context.quadraticCurveTo(
        x,
        y + height,
        x,
        y + height - radius
    );


    context.lineTo(
        x,
        y + radius
    );


    context.quadraticCurveTo(
        x,
        y,
        x + radius,
        y
    );


    context.closePath();

}


// =========================
// CAMERA PREVIEW
// =========================

function drawCameraOverlay() {

    if (!inputVideo.videoWidth) {
        return;
    }


    cameraCanvas.width =
        cameraCanvas.clientWidth;


    cameraCanvas.height =
        cameraCanvas.clientHeight;


    const cw =
        cameraCanvas.width;


    const ch =
        cameraCanvas.height;


    cameraCtx.save();


    // Mirror preview
    cameraCtx.translate(
        cw,
        0
    );


    cameraCtx.scale(
        -1,
        1
    );


    cameraCtx.drawImage(
        inputVideo,
        0,
        0,
        cw,
        ch
    );


    cameraCtx.restore();


    // Finger marker
    if (handPoint) {

        const px =
            (1 - handPoint.x) *
            cw;


        const py =
            handPoint.y *
            ch;


        cameraCtx.beginPath();


        cameraCtx.arc(
            px,
            py,
            9,
            0,
            Math.PI * 2
        );


        cameraCtx.fillStyle =
            "#00ff88";


        cameraCtx.fill();


        cameraCtx.beginPath();


        cameraCtx.arc(
            px,
            py,
            15,
            0,
            Math.PI * 2
        );


        cameraCtx.strokeStyle =
            "#ffffff";


        cameraCtx.lineWidth = 2;


        cameraCtx.stroke();

    }

}


// =========================
// START
// =========================

startButton.addEventListener(
    "click",
    async () => {

        startButton.disabled =
            true;


        startButton.textContent =
            "STARTING...";


        try {

            loadVoices();

            resetVoiceState();

            await startCamera();


            gameRunning = true;


            startScreen.style.display =
                "none";


            showFeedback(
                "MOVE YOUR HAND!"
            );


            instruction.textContent =
                "MOVE YOUR HAND LEFT AND RIGHT";


            speak(
                "Move your hand left and right to steer.",
                true
            );

        }
        catch (error) {

            console.error(
                "Camera error:",
                error
            );


            startButton.disabled =
                false;


            startButton.textContent =
                "START GAME";


            alert(
                "Unable to access the camera. Please allow camera permission and try again."
            );

        }

    }
);


// =========================
// CAMERA
// =========================

async function startCamera() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        throw new Error(
            "Camera API is not supported."
        );

    }


    const stream =
        await navigator.mediaDevices.getUserMedia({

            video: {

                width: {
                    ideal: 640
                },

                height: {
                    ideal: 480
                },

                facingMode: "user"

            },

            audio: false

        });


    inputVideo.srcObject =
        stream;


    await inputVideo.play();


    cameraLoop();

}


// =========================
// CAMERA LOOP
// =========================

let cameraBusy = false;

let lastCameraSend = 0;

const CAMERA_INTERVAL = 25;


async function cameraLoop() {

    if (
        !cameraBusy &&
        inputVideo.readyState >= 2
    ) {

        const now =
            performance.now();


        if (
            now -
            lastCameraSend >=
            CAMERA_INTERVAL
        ) {

            cameraBusy = true;

            lastCameraSend = now;


            try {

                await hands.send({
                    image: inputVideo
                });

            }
            catch (error) {

                console.error(
                    "MediaPipe error:",
                    error
                );

            }


            cameraBusy = false;

        }

    }


    requestAnimationFrame(
        cameraLoop
    );

}


// =========================
// GAME LOOP
// =========================

let lastTime =
    performance.now();


function gameLoop(currentTime) {

    let delta =
        (
            currentTime -
            lastTime
        ) / 1000;


    lastTime =
        currentTime;


    delta =
        Math.min(
            delta,
            0.04
        );


    // Draw
    drawRoad(delta);

    drawCoins();

    drawCar();

    drawCameraOverlay();


    // Game updates
    if (gameRunning) {

        updateCoins(delta);

    }


    // Feedback
    if (feedbackTimer > 0) {

        feedbackTimer -=
            delta * 1000;


        if (
            feedbackTimer <= 0
        ) {

            feedback.style.opacity =
                "0";

        }

    }


    requestAnimationFrame(
        gameLoop
    );

}


// =========================
// INITIALIZE
// =========================

drawRoad(0);

drawCoins();

drawCar();

requestAnimationFrame(
    gameLoop
);