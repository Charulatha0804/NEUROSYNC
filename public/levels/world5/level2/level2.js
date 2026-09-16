const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const cursor = document.getElementById("cursor");
const status = document.getElementById("status");

const clearBtn = document.getElementById("clearBtn");
const undoBtn = document.getElementById("undoBtn");
const startBtn = document.getElementById("startBtn");
const finishBtn = document.getElementById("finishBtn");

const finishScreen = document.getElementById("finishScreen");
const againBtn = document.getElementById("againBtn");
const nextBtn = document.getElementById("nextBtn");

let painting = false;
let started = false;

let lastX = null;
let lastY = null;

let cursorX = null;
let cursorY = null;

let points = [];
let strokes = [];

let canvasWidth;
let canvasHeight;

function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;

    canvas.style.width = canvasWidth + "px";
    canvas.style.height = canvasHeight + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

function clearCanvas() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    strokes = [];
    points = [];

    lastX = null;
    lastY = null;
}

clearBtn.addEventListener("click", clearCanvas);

undoBtn.addEventListener("click", () => {

    if (strokes.length === 0) return;

    strokes.pop();

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    for (const stroke of strokes) {
        drawStroke(stroke);
    }
});

function drawStroke(stroke) {

    if (stroke.length < 2) return;

    ctx.beginPath();

    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.moveTo(stroke[0].x, stroke[0].y);

    for (let i = 1; i < stroke.length - 1; i++) {

        const p1 = stroke[i];
        const p2 = stroke[i + 1];

        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;

        ctx.quadraticCurveTo(
            p1.x,
            p1.y,
            mx,
            my
        );
    }

    const last = stroke[stroke.length - 1];

    ctx.lineTo(last.x, last.y);

    ctx.stroke();
}

function getDistance(x1, y1, x2, y2) {

    return Math.sqrt(
        Math.pow(x2 - x1, 2) +
        Math.pow(y2 - y1, 2)
    );
}

function addPoint(x, y) {

    if (lastX === null) {

        lastX = x;
        lastY = y;

        points.push({
            x: x,
            y: y
        });

        return;
    }

    const d = getDistance(
        lastX,
        lastY,
        x,
        y
    );

    if (d < 1) return;

    const steps = Math.max(
        1,
        Math.ceil(d / 2)
    );

    for (let i = 1; i <= steps; i++) {

        const t = i / steps;

        const px =
            lastX +
            (x - lastX) * t;

        const py =
            lastY +
            (y - lastY) * t;

        points.push({
            x: px,
            y: py
        });
    }

    lastX = x;
    lastY = y;

    drawCurrentStroke();
}

function drawCurrentStroke() {

    if (points.length < 2) return;

    ctx.beginPath();

    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const start =
        Math.max(0, points.length - 30);

    ctx.moveTo(
        points[start].x,
        points[start].y
    );

    for (
        let i = start + 1;
        i < points.length - 1;
        i++
    ) {

        const p1 = points[i];
        const p2 = points[i + 1];

        const mx =
            (p1.x + p2.x) / 2;

        const my =
            (p1.y + p2.y) / 2;

        ctx.quadraticCurveTo(
            p1.x,
            p1.y,
            mx,
            my
        );
    }

    const last =
        points[points.length - 1];

    ctx.lineTo(
        last.x,
        last.y
    );

    ctx.stroke();
}

function finishStroke() {

    if (points.length > 1) {
        strokes.push([...points]);
    }

    points = [];

    lastX = null;
    lastY = null;

    painting = false;
    cursor.classList.remove("painting");
}

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});

hands.setOptions({

    maxNumHands: 1,

    modelComplexity: 1,

    minDetectionConfidence: 0.8,

    minTrackingConfidence: 0.8
});

hands.onResults(results => {

    if (
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
    ) {

        // Keep the brush cursor visible at its last known position.
        // The original game hid it whenever a frame had no detected hand,
        // which made the cursor appear to disappear completely.
        cursor.style.display = started ? "block" : "none";

        status.textContent =
            started
                ? "Show your hand"
                : "Press START";

        return;
    }

    const hand =
        results.multiHandLandmarks[0];

    const index =
        hand[8];

    let targetX =
        (1 - index.x) *
        canvasWidth;

    let targetY =
        index.y *
        canvasHeight;

    targetX =
        Math.max(
            0,
            Math.min(
                canvasWidth,
                targetX
            )
        );

    targetY =
        Math.max(
            0,
            Math.min(
                canvasHeight,
                targetY
            )
        );

    cursor.style.display = "block";

    /*
       VERY SMOOTH CURSOR
    */

    if (cursorX === null) {

        cursorX = targetX;
        cursorY = targetY;

    } else {

        cursorX +=
            (targetX - cursorX) *
            0.55;

        cursorY +=
            (targetY - cursorY) *
            0.55;
    }

    cursor.style.left =
        cursorX + "px";

    cursor.style.top =
        cursorY + "px";

    /*
       INDEX FINGER = BRUSH

       No pinch required.
    */

    if (!started) {
        status.textContent =
            "Press START";
        return;
    }

    if (!painting) {

        painting = true;
        cursor.classList.add("painting");

        points = [];

        lastX = targetX;
        lastY = targetY;

        points.push({
            x: targetX,
            y: targetY
        });

        status.textContent =
            "Move your index finger to paint";

    } else {

        const jump =
            getDistance(
                lastX,
                lastY,
                targetX,
                targetY
            );

        /*
           Ignore only impossible tracking jumps.
        */

        if (jump < 180) {

            addPoint(
                targetX,
                targetY
            );
        }
    }
});

const camera = new Camera(video, {

    onFrame: async () => {

        await hands.send({
            image: video
        });
    },

    width: 1280,
    height: 720
});

startBtn.addEventListener("click", async () => {

    started = true;

    // Make the brush cursor visible immediately after START, then let
    // MediaPipe hand tracking move it to the index-finger position.
    if (cursorX === null) {
        cursorX = canvasWidth / 2;
        cursorY = canvasHeight / 2;
    }
    cursor.style.left = cursorX + "px";
    cursor.style.top = cursorY + "px";
    cursor.style.display = "block";

    status.textContent =
        "Move your index finger to paint";

    startBtn.style.display =
        "none";

    try {

        await camera.start();

    } catch (error) {

        console.error(error);

        status.textContent =
            "Camera permission required";
    }
});

finishBtn.addEventListener("click", () => {

    finishStroke();

    finishScreen.style.display =
        "flex";
});

againBtn.addEventListener("click", () => {

    finishScreen.style.display =
        "none";

    clearCanvas();

    started = true;

    status.textContent =
        "Move your index finger to paint";
});

nextBtn.addEventListener("click", () => {
    window.parent.postMessage({ type: "NEUROSYNC_BACK_TO_LEVELS" }, "*");
});