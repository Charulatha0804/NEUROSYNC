// ============================================================
// REHABPLAY AI - LEVEL 1
// GARDEN PATH
// Simple hand movement + voice guidance
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
const gameScreen = document.getElementById("gameScreen");

const startButton = document.getElementById("startButton");

const leftHandButton =
    document.getElementById("leftHandButton");

const rightHandButton =
    document.getElementById("rightHandButton");

const scoreDisplay =
    document.getElementById("score");

const finalScore =
    document.getElementById("finalScore");

const instruction =
    document.getElementById("instruction");

const handStatus =
    document.getElementById("handStatus");

const cameraError =
    document.getElementById("cameraError");

const completeOverlay =
    document.getElementById("completeOverlay");

const nextButton =
    document.getElementById("nextButton");

const homeButton =
    document.getElementById("homeButton");


// =========================
// VOICE
// =========================

let voices = [];
let selectedVoice = null;

let lastVoiceTime = 0;

const VOICE_COOLDOWN = 1000;

let lastVoiceCommand = "";


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

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    speechSynthesis.speak(utterance);

}


function stopVoice() {

    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }

}


// =========================
// CANVAS
// =========================

const W = canvas.width;
const H = canvas.height;


// =========================
// GAME STATE
// =========================

let gameRunning = false;

let selectedHand = "left";

let selectedHandIndex = null;

let handPoint = null;

let score = 0;

let currentTarget = 0;

let lastHandSeen = 0;

const HAND_TIMEOUT = 700;


// =========================
// TARGETS
// =========================

const targets = [

    {
        x: 180,
        y: 170,
        radius: 42
    },

    {
        x: 430,
        y: 300,
        radius: 42
    },

    {
        x: 720,
        y: 180,
        radius: 42
    },

    {
        x: 900,
        y: 400,
        radius: 42
    },

    {
        x: 570,
        y: 520,
        radius: 42
    }

];


// =========================
// TARGET COLORS
// =========================

const TARGET_COLOR = "#f4c95d";

const TARGET_ACTIVE =
    "#7ee787";

const TARGET_OUTLINE =
    "#ffffff";


// =========================
// HAND BUTTONS
// =========================

leftHandButton.addEventListener(
    "click",
    () => {

        selectedHand = "left";

        leftHandButton.classList.add(
            "selected"
        );

        rightHandButton.classList.remove(
            "selected"
        );

        resetHand();

        speak(
            "Left hand selected.",
            true
        );

    }
);


rightHandButton.addEventListener(
    "click",
    () => {

        selectedHand = "right";

        rightHandButton.classList.add(
            "selected"
        );

        leftHandButton.classList.remove(
            "selected"
        );

        resetHand();

        speak(
            "Right hand selected.",
            true
        );

    }
);


// =========================
// RESET HAND
// =========================

function resetHand() {

    selectedHandIndex = null;

    handPoint = null;

    lastHandSeen = 0;

}


// =========================
// MEDIAPIPE
// =========================

let hands = null;
let mediaPipeReady = false;

function initializeHands() {
    if (typeof Hands === "undefined") {
        console.error("MediaPipe Hands did not load.");
        handStatus.textContent = "HAND TRACKING UNAVAILABLE";
        cameraError.textContent = "Hand tracking library could not be loaded. Check your internet connection and refresh.";
        cameraError.classList.remove("hidden");
        return false;
    }

    hands = new Hands({
        locateFile: (file) =>
            "https://cdn.jsdelivr.net/npm/@mediapipe/hands/" + file
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(handleHands);
    mediaPipeReady = true;
    return true;
}

initializeHands();


// =========================
// FIND SELECTED HAND
// =========================

function findSelectedHand(results) {

    if (
        !results ||
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
    ) {
        selectedHandIndex = null;
        return null;
    }

    const candidates = [];

    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const fingertip = landmarks[8];

        if (!fingertip) continue;

        let palmX = 0;
        let palmY = 0;
        const palmIndices = [0, 5, 9, 13, 17];

        for (const index of palmIndices) {
            palmX += landmarks[index].x;
            palmY += landmarks[index].y;
        }

        palmX /= palmIndices.length;
        palmY /= palmIndices.length;

        // MediaPipe's handedness label is from the person's viewpoint
        // when the input is mirrored. We use it as the primary choice,
        // then fall back to the hand's position if the label is unavailable.
        const label =
            results.multiHandedness &&
            results.multiHandedness[i] &&
            results.multiHandedness[i].label
                ? results.multiHandedness[i].label.toLowerCase()
                : null;

        candidates.push({
            index: i,
            palmX,
            palmY,
            fingertipX: fingertip.x,
            fingertipY: fingertip.y,
            label
        });
    }

    if (!candidates.length) {
        selectedHandIndex = null;
        return null;
    }

    // First use MediaPipe's handedness label when possible.
    const wantedLabel =
        selectedHand === "left" ? "left" : "right";

    const labelled = candidates.find(
        candidate => candidate.label === wantedLabel
    );

    if (labelled) {
        selectedHandIndex = labelled.index;
        return labelled;
    }

    // Fallback: choose according to screen position.
    // The camera is mirrored, so the user's left side appears on the
    // right side of the normalized camera image.
    const expectedX =
        selectedHand === "left" ? 0.75 : 0.25;

    let bestCandidate = candidates[0];
    let bestDistance = Infinity;

    for (const candidate of candidates) {
        const distance = Math.abs(candidate.palmX - expectedX);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestCandidate = candidate;
        }
    }

    selectedHandIndex = bestCandidate.index;
    return bestCandidate;
}


// =========================
// HAND RESULTS
// =========================

function handleHands(results) {

    const hand =
        findSelectedHand(results);


    // No hand
    if (!hand) {

        handPoint = null;

        handStatus.textContent =
            "SHOW YOUR HAND";


        if (
            lastHandSeen > 0 &&
            performance.now() -
            lastHandSeen >
            HAND_TIMEOUT
        ) {

            if (
                lastVoiceCommand !==
                "missing"
            ) {

                lastVoiceCommand =
                    "missing";

                speak(
                    "Please show your hand."
                );

            }

        }

        return;

    }


    // Hand found
    lastHandSeen =
        performance.now();


    lastVoiceCommand = "";


    handStatus.textContent =
        "HAND DETECTED";


    handPoint = {

        x: hand.fingertipX,

        y: hand.fingertipY

    };


    checkTarget();

}


// =========================
// CHECK TARGET
// =========================

function checkTarget() {

    if (!gameRunning) {
        return;
    }


    const target =
        targets[currentTarget];


    if (!target || !handPoint) {
        return;
    }


    // Mirror X
    const handX =
        (1 - handPoint.x) * W;


    const handY =
        handPoint.y * H;


    const dx =
        handX - target.x;


    const dy =
        handY - target.y;


    const distance =
        Math.sqrt(
            dx * dx +
            dy * dy
        );


    if (
        distance <
        target.radius
    ) {

        hitTarget();

    }

}


// =========================
// TARGET HIT
// =========================

function hitTarget() {

    score++;

    currentTarget++;


    scoreDisplay.textContent =
        score;


    // Small voice
    speak(
        "Good. Target reached."
    );


    // More targets
    if (
        currentTarget <
        targets.length
    ) {

        instruction.textContent =
            "Move to the next target";


        setTimeout(() => {

            speak(
                "Move to the next target."
            );

        }, 500);


    }
    else {

        completeLevel();

    }

}


// =========================
// COMPLETE LEVEL
// =========================

function completeLevel() {

    gameRunning = false;

    stopVoice();


    instruction.textContent =
        "GARDEN PATH COMPLETE";


    finalScore.textContent =
        score;


    completeOverlay.classList.remove(
        "hidden"
    );


    speak(
        "Excellent work. You completed the garden path.",
        true
    );

}


// =========================
// DRAW BACKGROUND
// =========================

function drawBackground() {

    // Sky
    ctx.fillStyle =
        "#bde7ff";


    ctx.fillRect(
        0,
        0,
        W,
        H
    );


    // Grass
    ctx.fillStyle =
        "#72b84a";


    ctx.fillRect(
        0,
        H * 0.42,
        W,
        H * 0.58
    );


    // Garden path
    ctx.fillStyle =
        "#d8bd8a";


    ctx.beginPath();


    ctx.moveTo(
        W * 0.38,
        H
    );


    ctx.quadraticCurveTo(
        W * 0.50,
        H * 0.72,
        W * 0.44,
        H * 0.48
    );


    ctx.quadraticCurveTo(
        W * 0.39,
        H * 0.28,
        W * 0.52,
        0
    );


    ctx.lineTo(
        W * 0.68,
        0
    );


    ctx.quadraticCurveTo(
        W * 0.55,
        H * 0.30,
        W * 0.59,
        H * 0.50
    );


    ctx.quadraticCurveTo(
        W * 0.64,
        H * 0.72,
        W * 0.55,
        H
    );


    ctx.closePath();

    ctx.fill();


    // Trees
    drawTree(80, 190);
    drawTree(1000, 170);
    drawTree(120, 520);
    drawTree(970, 540);


    // Flowers
    drawFlower(280, 500);
    drawFlower(820, 280);
    drawFlower(250, 350);
    drawFlower(800, 520);

}


// =========================
// TREE
// =========================

function drawTree(x, y) {

    ctx.fillStyle =
        "#704214";


    ctx.fillRect(
        x - 10,
        y,
        20,
        70
    );


    ctx.fillStyle =
        "#2f7d32";


    ctx.beginPath();

    ctx.arc(
        x,
        y - 10,
        42,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.beginPath();

    ctx.arc(
        x - 28,
        y + 10,
        30,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.beginPath();

    ctx.arc(
        x + 28,
        y + 10,
        30,
        0,
        Math.PI * 2
    );

    ctx.fill();

}


// =========================
// FLOWER
// =========================

function drawFlower(x, y) {

    ctx.strokeStyle =
        "#39823b";

    ctx.lineWidth = 4;


    ctx.beginPath();

    ctx.moveTo(
        x,
        y
    );

    ctx.lineTo(
        x,
        y + 35
    );

    ctx.stroke();


    ctx.fillStyle =
        "#f45b69";


    for (
        let i = 0;
        i < 5;
        i++
    ) {

        const angle =
            i *
            Math.PI *
            2 /
            5;


        ctx.beginPath();

        ctx.arc(
            x +
            Math.cos(angle) *
            10,

            y +
            Math.sin(angle) *
            10,

            8,

            0,
            Math.PI * 2
        );

        ctx.fill();

    }


    ctx.fillStyle =
        "#ffd166";


    ctx.beginPath();

    ctx.arc(
        x,
        y,
        6,
        0,
        Math.PI * 2
    );

    ctx.fill();

}


// =========================
// DRAW TARGETS
// =========================

function drawTargets() {

    for (
        let i = 0;
        i < targets.length;
        i++
    ) {

        const target =
            targets[i];


        // Completed target
        if (
            i < currentTarget
        ) {

            ctx.fillStyle =
                "rgba(126,231,135,0.45)";

            ctx.strokeStyle =
                "#3fb950";

        }

        // Current target
        else if (
            i === currentTarget
        ) {

            ctx.fillStyle =
                "rgba(244,201,93,0.75)";

            ctx.strokeStyle =
                "#ffffff";

        }

        // Future targets
        else {

            ctx.fillStyle =
                "rgba(255,255,255,0.22)";

            ctx.strokeStyle =
                "rgba(255,255,255,0.65)";

        }


        ctx.beginPath();

        ctx.arc(
            target.x,
            target.y,
            target.radius,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.lineWidth = 4;

        ctx.stroke();


        // Target number
        ctx.fillStyle =
            "#243238";


        ctx.font =
            "bold 22px Arial";


        ctx.textAlign =
            "center";


        ctx.textBaseline =
            "middle";


        ctx.fillText(
            i + 1,
            target.x,
            target.y
        );

    }

}


// =========================
// DRAW HAND MARKER
// =========================

function drawHandMarker() {

    if (!handPoint) {
        return;
    }

    const x =
        (1 - handPoint.x) * W;

    const y =
        handPoint.y * H;

    // Large visible cursor so the hand position is easy to see.
    ctx.save();

    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#00e676";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Crosshair
    ctx.beginPath();
    ctx.moveTo(x - 38, y);
    ctx.lineTo(x - 22, y);
    ctx.moveTo(x + 22, y);
    ctx.lineTo(x + 38, y);
    ctx.moveTo(x, y - 38);
    ctx.lineTo(x, y - 22);
    ctx.moveTo(x, y + 22);
    ctx.lineTo(x, y + 38);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
}


// =========================
// CAMERA PREVIEW
// =========================

function drawCameraPreview() {

    if (!inputVideo.videoWidth) {
        return;
    }


    const cw =
        cameraCanvas.width;


    const ch =
        cameraCanvas.height;


    cameraCtx.clearRect(
        0,
        0,
        cw,
        ch
    );


    cameraCtx.save();


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


    if (handPoint) {

        const x =
            (1 - handPoint.x) *
            cw;


        const y =
            handPoint.y *
            ch;


        cameraCtx.beginPath();

        cameraCtx.arc(
            x,
            y,
            8,
            0,
            Math.PI * 2
        );


        cameraCtx.fillStyle =
            "#00e676";


        cameraCtx.fill();

    }

}


// =========================
// START CAMERA
// =========================

async function startCamera() {

    try {

        const stream =
            await navigator.mediaDevices
            .getUserMedia({

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


        return true;

    }
    catch (error) {

        console.error(
            "Camera error:",
            error
        );


        cameraError.classList.remove(
            "hidden"
        );


        return false;

    }

}


// =========================
// CAMERA LOOP
// =========================

let cameraBusy = false;

let lastCameraTime = 0;

const CAMERA_INTERVAL = 30;


async function cameraLoop() {

    if (
        mediaPipeReady &&
        hands &&
        !cameraBusy &&
        inputVideo.readyState >= 2
    ) {

        const now =
            performance.now();


        if (
            now -
            lastCameraTime >=
            CAMERA_INTERVAL
        ) {

            cameraBusy = true;

            lastCameraTime = now;


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
// START GAME
// =========================

startButton.addEventListener(
    "click",
    async () => {

        startButton.disabled =
            true;


        startButton.textContent =
            "STARTING...";


        loadVoices();


        const cameraStarted =
            await startCamera();


        if (!cameraStarted) {

            startButton.disabled =
                false;

            startButton.textContent =
                "START GAME";

            return;

        }


        startScreen.classList.add(
            "hidden"
        );


        gameScreen.classList.remove(
            "hidden"
        );


        gameRunning = true;


        speak(
            "Move your hand to the targets.",
            true
        );


        instruction.textContent =
            "Move your hand to target 1";

    }
);


// =========================
// NEXT BUTTON
// =========================

nextButton.addEventListener(
    "click",
    () => {

        stopVoice();

        window.parent.postMessage(
            {
                type: "NEUROSYNC_BACK_TO_LEVELS"
            },
            "*"
        );

    }
);


// =========================
// HOME BUTTON
// =========================

homeButton.addEventListener(
    "click",
    () => {

        stopVoice();

        window.parent.postMessage(
            {
                type: "NEUROSYNC_BACK_TO_LEVELS"
            },
            "*"
        );

    }
);


// =========================
// GAME LOOP
// =========================

function gameLoop() {

    drawBackground();

    drawTargets();

    drawHandMarker();

    drawCameraPreview();


    requestAnimationFrame(
        gameLoop
    );

}


// =========================
// INITIALIZE
// =========================

drawBackground();

drawTargets();

gameLoop();