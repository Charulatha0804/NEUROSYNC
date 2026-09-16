/* =========================================================
   LEVEL 6 - HOME ORGANIZATION
   MediaPipe Hands + Canvas + Voice Guidance
========================================================= */


/* =========================
   ELEMENTS
========================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");

const startButton = document.getElementById("startButton");

const inputVideo = document.getElementById("inputVideo");

const leftHandBtn = document.getElementById("leftHandBtn");
const rightHandBtn = document.getElementById("rightHandBtn");

const handStatus = document.getElementById("handStatus");
const cameraError = document.getElementById("cameraError");

const scoreDisplay = document.getElementById("score");
const taskText = document.getElementById("taskText");

const completeOverlay = document.getElementById("completeOverlay");
const nextLevelButton = document.getElementById("nextLevelButton");


/* =========================================================
   VOICE SYSTEM
========================================================= */

let voiceRate = 0.95;

let voices = [];
let selectedVoice = null;

let countdownRunning = false;

let countdownTimer1 = null;
let countdownTimer2 = null;

let pickupVoiceStarted = false;
let placementVoiceStarted = false;


/* =========================
   LOAD VOICES
========================= */

function loadVoices() {

    if (!("speechSynthesis" in window)) {
        return;
    }

    voices = window.speechSynthesis.getVoices();

    if (!voices.length) {
        return;
    }

    /*
       Prefer Indian English voice.
       Otherwise use English.
    */

    selectedVoice =
        voices.find(v => v.lang === "en-IN") ||

        voices.find(v => v.lang === "en-US") ||

        voices.find(v => v.lang === "en-GB") ||

        voices.find(v => v.lang.startsWith("en")) ||

        voices[0];

    console.log(
        "Selected voice:",
        selectedVoice.name,
        selectedVoice.lang
    );
}


if ("speechSynthesis" in window) {

    loadVoices();

    speechSynthesis.onvoiceschanged = loadVoices;
}


/* =========================
   SPEAK
========================= */

function speak(text) {

    if (!("speechSynthesis" in window)) {
        return;
    }

    /*
       Stop previous speech first.
    */

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    if (selectedVoice) {

        utterance.voice =
            selectedVoice;
    }

    utterance.rate = voiceRate;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    speechSynthesis.speak(utterance);
}


/* =========================
   STOP VOICE
========================= */

function stopVoice() {

    if ("speechSynthesis" in window) {

        speechSynthesis.cancel();
    }

    countdownRunning = false;

    clearTimeout(countdownTimer1);
    clearTimeout(countdownTimer2);

    countdownTimer1 = null;
    countdownTimer2 = null;
}


/* =========================
   VOICE COUNTDOWN
========================= */

function startVoiceCountdown() {

    if (countdownRunning) {
        return;
    }

    countdownRunning = true;

    clearTimeout(countdownTimer1);
    clearTimeout(countdownTimer2);

    speak("Three");


    countdownTimer1 = setTimeout(() => {

        if (!countdownRunning) {
            return;
        }

        speak("Two");

    }, 1000);


    countdownTimer2 = setTimeout(() => {

        if (!countdownRunning) {
            return;
        }

        speak("One");

    }, 2000);
}


/* =========================
   STOP COUNTDOWN
========================= */

function stopVoiceCountdown() {

    countdownRunning = false;

    clearTimeout(countdownTimer1);
    clearTimeout(countdownTimer2);

    countdownTimer1 = null;
    countdownTimer2 = null;
}


/* =========================================================
   GAME SETTINGS
========================================================= */

const HOLD_TIME = 3000;


/* =========================
   INPUT RANGE
========================= */

const INPUT_MIN_X = 0.03;
const INPUT_MAX_X = 0.97;

const INPUT_MIN_Y = 0.05;
const INPUT_MAX_Y = 0.95;


/* =========================
   SMOOTHING
========================= */

const SMOOTHING = 0.25;


/* =========================
   DEFAULT HAND
========================= */

let selectedHand = "Left";


/* =========================================================
   GAME STATE
========================================================= */

let gameRunning = false;
let levelComplete = false;

let score = 0;
let currentObjectIndex = 0;

let carriedObject = null;

let pickupStartTime = null;
let placementStartTime = null;

let lastFrameTime = performance.now();


/* =========================
   FINGER POSITION
========================= */

let fingerX = canvas.width / 2;
let fingerY = canvas.height / 2;

let targetFingerX = fingerX;
let targetFingerY = fingerY;

let handDetected = false;


/* =========================================================
   OBJECTS
========================================================= */

const objects = [

    {
        id: "book",
        name: "Book",

        startX: 160,
        startY: 530,

        destinationX: 890,
        destinationY: 160,

        type: "book",

        placed: false
    },


    {
        id: "cup",
        name: "Cup",

        startX: 920,
        startY: 500,

        destinationX: 690,
        destinationY: 470,

        type: "cup",

        placed: false
    },


    {
        id: "cushion",
        name: "Cushion",

        startX: 420,
        startY: 165,

        destinationX: 500,
        destinationY: 440,

        type: "cushion",

        placed: false
    },


    {
        id: "plant",
        name: "Plant",

        startX: 740,
        startY: 250,

        destinationX: 180,
        destinationY: 260,

        type: "plant",

        placed: false
    },


    {
        id: "remote",
        name: "Remote",

        startX: 300,
        startY: 570,

        destinationX: 780,
        destinationY: 390,

        type: "remote",

        placed: false
    }

];


/* =========================================================
   HAND BUTTONS
========================================================= */

leftHandBtn.addEventListener("click", () => {

    selectedHand = "Left";

    leftHandBtn.classList.add("selected");
    rightHandBtn.classList.remove("selected");

    resetHold();

    handStatus.textContent =
        "Looking for LEFT hand";

    speak("Left hand selected.");
});


rightHandBtn.addEventListener("click", () => {

    selectedHand = "Right";

    rightHandBtn.classList.add("selected");
    leftHandBtn.classList.remove("selected");

    resetHold();

    handStatus.textContent =
        "Looking for RIGHT hand";

    speak("Right hand selected.");
});


/* =========================================================
   START GAME
========================================================= */

startButton.addEventListener(
    "click",
    startGame
);


function startGame() {

    startScreen.classList.add("hidden");

    gameScreen.classList.remove("hidden");

    gameRunning = true;

    score = 0;

    currentObjectIndex = 0;

    levelComplete = false;

    carriedObject = null;

    resetHold();

    updateScore();

    updateInstruction();

    startCamera();

    lastFrameTime =
        performance.now();

    requestAnimationFrame(gameLoop);


    /*
       Voice starts after user presses Start.
       This helps Chrome allow speech.
    */

    setTimeout(() => {

        speak(
            "Welcome. Let's organize the house."
        );

    }, 400);
}


/* =========================================================
   CAMERA + MEDIAPIPE
========================================================= */

const hands = new Hands({

    locateFile: (file) => {

        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;

    }

});


hands.setOptions({

    maxNumHands: 2,

    modelComplexity: 1,

    minDetectionConfidence: 0.55,

    minTrackingConfidence: 0.55

});


hands.onResults(onResults);


/* =========================================================
   CAMERA START
========================================================= */

function startCamera() {

    cameraError.classList.add("hidden");


    const camera = new Camera(
        inputVideo,
        {

            onFrame: async () => {

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

            },

            width: 640,
            height: 480

        }
    );


    /*
       IMPORTANT:
       Do NOT use camera.start().catch()
    */

    try {

        camera.start();

    }

    catch (error) {

        console.error(
            "Camera error:",
            error
        );

        cameraError.classList.remove(
            "hidden"
        );

        handStatus.textContent =
            "Camera unavailable";

    }

}


/* =========================================================
   MEDIAPIPE RESULTS
========================================================= */

function onResults(results) {

    handDetected = false;


    if (
        !results.multiHandLandmarks ||
        results.multiHandLandmarks.length === 0
    ) {

        handStatus.textContent =
            `Show your ${selectedHand.toUpperCase()} hand`;

        return;
    }


    for (
        let i = 0;
        i < results.multiHandLandmarks.length;
        i++
    ) {

        const landmarks =
            results.multiHandLandmarks[i];

        const handedness =
            results.multiHandedness[i]?.label;


        if (handedness !== selectedHand) {

            continue;

        }


        handDetected = true;


        /*
           INDEX FINGERTIP

           Landmark 8 =
           index finger tip
        */

        const fingertip =
            landmarks[8];


        /*
           Mirror X
        */

        let mirroredX =
            1 - fingertip.x;


        let normalizedX =
            (mirroredX - INPUT_MIN_X) /
            (INPUT_MAX_X - INPUT_MIN_X);


        normalizedX =
            Math.max(
                0,
                Math.min(
                    1,
                    normalizedX
                )
            );


        let normalizedY =
            (fingertip.y - INPUT_MIN_Y) /
            (INPUT_MAX_Y - INPUT_MIN_Y);


        normalizedY =
            Math.max(
                0,
                Math.min(
                    1,
                    normalizedY
                )
            );


        targetFingerX =
            normalizedX *
            canvas.width;


        targetFingerY =
            normalizedY *
            canvas.height;


        /*
           Smooth movement
        */

        fingerX +=
            (
                targetFingerX -
                fingerX
            ) *
            SMOOTHING;


        fingerY +=
            (
                targetFingerY -
                fingerY
            ) *
            SMOOTHING;


        handStatus.textContent =
            `${selectedHand.toUpperCase()} HAND DETECTED`;


        break;

    }

}


/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop(currentTime) {

    if (!gameRunning) {

        return;

    }


    const deltaTime =
        currentTime -
        lastFrameTime;


    lastFrameTime =
        currentTime;


    update(deltaTime);

    draw();


    requestAnimationFrame(
        gameLoop
    );

}


/* =========================================================
   UPDATE
========================================================= */

function update(deltaTime) {

    if (levelComplete) {

        return;

    }


    const currentObject =
        objects[currentObjectIndex];


    if (!currentObject) {

        finishLevel();

        return;

    }


    /* =====================================================
       OBJECT NOT YET PICKED
    ===================================================== */

    if (!carriedObject) {

        const distance =
            distanceBetween(

                fingerX,
                fingerY,

                currentObject.startX,
                currentObject.startY

            );


        const pickupRadius = 65;


        if (distance <= pickupRadius) {

            if (pickupStartTime === null) {

                pickupStartTime =
                    performance.now();


                /*
                   Voice instruction only once
                */

                if (!pickupVoiceStarted) {

                    pickupVoiceStarted = true;

                    speak(
                        `Good. Hold still for three seconds to select the ${currentObject.name}.`
                    );


                    /*
                       Start countdown shortly
                       after instruction.
                    */

                    setTimeout(() => {

                        if (
                            pickupStartTime !== null &&
                            !carriedObject &&
                            gameRunning
                        ) {

                            startVoiceCountdown();

                        }

                    }, 900);

                }

            }


            const elapsed =
                performance.now() -
                pickupStartTime;


            if (elapsed >= HOLD_TIME) {

                carriedObject =
                    currentObject;


                pickupStartTime =
                    null;


                pickupVoiceStarted =
                    false;


                stopVoiceCountdown();


                taskText.textContent =
                    `Move the ${currentObject.name} to the dotted location`;


                speak(
                    `Good. The ${currentObject.name} is selected.`
                );


                /*
                   Destination instruction
                */

                setTimeout(() => {

                    if (
                        carriedObject &&
                        gameRunning
                    ) {

                        speak(
                            `Move the ${currentObject.name} to the dotted location.`
                        );

                    }

                }, 1000);

            }

        }


        else {

            /*
               Moving away resets pickup.
            */

            pickupStartTime =
                null;

            pickupVoiceStarted =
                false;

            stopVoiceCountdown();

        }

    }


    /* =====================================================
       OBJECT IS BEING CARRIED
    ===================================================== */

    else {

        const distance =
            distanceBetween(

                fingerX,
                fingerY,

                carriedObject.destinationX,
                carriedObject.destinationY

            );


        const destinationRadius = 75;


        if (
            distance <= destinationRadius
        ) {

            if (
                placementStartTime === null
            ) {

                placementStartTime =
                    performance.now();


                /*
                   Voice instruction
                */

                if (!placementVoiceStarted) {

                    placementVoiceStarted =
                        true;


                    speak(
                        "Good. Hold still for three seconds."
                    );


                    /*
                       Countdown starts
                       after instruction.
                    */

                    setTimeout(() => {

                        if (
                            placementStartTime !== null &&
                            carriedObject &&
                            gameRunning
                        ) {

                            startVoiceCountdown();

                        }

                    }, 800);

                }

            }


            const elapsed =
                performance.now() -
                placementStartTime;


            if (
                elapsed >= HOLD_TIME
            ) {

                placeObject();

            }

        }


        else {

            /*
               Moving away resets placement.
            */

            placementStartTime =
                null;

            placementVoiceStarted =
                false;

            stopVoiceCountdown();

        }

    }

}


/* =========================================================
   PLACE OBJECT
========================================================= */

function placeObject() {

    const object =
        carriedObject;


    if (!object) {

        return;

    }


    object.placed = true;

    score++;

    carriedObject = null;

    placementStartTime = null;

    pickupStartTime = null;

    pickupVoiceStarted = false;

    placementVoiceStarted = false;

    currentObjectIndex++;


    updateScore();


    stopVoiceCountdown();


    /*
       Correct placement voice
    */

    speak(
        `Excellent. The ${object.name} is placed correctly.`
    );


    /* =====================================================
       LEVEL COMPLETE
    ===================================================== */

    if (
        currentObjectIndex >=
        objects.length
    ) {

        setTimeout(() => {

            speak(
                "Excellent work. You have organized the entire house."
            );

        }, 1000);


        setTimeout(() => {

            finishLevel();

        }, 1200);


        return;

    }


    /*
       Next object
    */

    setTimeout(() => {

        updateInstruction();

    }, 1000);

}


/* =========================================================
   INSTRUCTIONS
========================================================= */

function updateInstruction() {

    const object =
        objects[currentObjectIndex];


    if (!object) {

        return;

    }


    if (!carriedObject) {

        taskText.textContent =
            `Point at the ${object.name} and hold for 3 seconds`;


        /*
           Voice for next object
        */

        setTimeout(() => {

            if (
                !carriedObject &&
                !levelComplete &&
                gameRunning
            ) {

                speak(
                    `Next, find the ${object.name}.`
                );

            }

        }, 500);

    }

}


/* =========================================================
   RESET HOLD
========================================================= */

function resetHold() {

    pickupStartTime = null;

    placementStartTime = null;

    pickupVoiceStarted = false;

    placementVoiceStarted = false;

    stopVoiceCountdown();

}


/* =========================================================
   FINISH LEVEL
========================================================= */

function finishLevel() {

    levelComplete = true;

    gameRunning = false;

    stopVoiceCountdown();

    completeOverlay.classList.remove(
        "hidden"
    );

    taskText.textContent =
        "House completely organized!";

}


/* =========================================================
   SCORE
========================================================= */

function updateScore() {

    scoreDisplay.textContent =
        `${score} / ${objects.length}`;

}


/* =========================================================
   DISTANCE
========================================================= */

function distanceBetween(
    x1,
    y1,
    x2,
    y2
) {

    const dx =
        x1 - x2;

    const dy =
        y1 - y2;


    return Math.sqrt(
        dx * dx +
        dy * dy
    );

}


/* =========================================================
   DRAWING
========================================================= */

function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    drawHouseBackground();

    drawDestinations();

    drawObjects();

    drawFingerCursor();

    drawHoldProgress();

}


/* =========================================================
   HOUSE BACKGROUND
========================================================= */

function drawHouseBackground() {

    /*
       Wall
    */

    ctx.fillStyle =
        "#ddd5c4";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    /*
       Floor
    */

    ctx.fillStyle =
        "#a88969";

    ctx.fillRect(
        0,
        430,
        canvas.width,
        220
    );


    /*
       Floor lines
    */

    ctx.strokeStyle =
        "rgba(80,55,35,0.22)";

    ctx.lineWidth = 2;


    for (
        let y = 460;
        y < 650;
        y += 38
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(
            canvas.width,
            y
        );

        ctx.stroke();

    }


    /*
       Window
    */

    ctx.fillStyle =
        "#a9c8d5";

    ctx.fillRect(
        55,
        70,
        190,
        145
    );


    ctx.strokeStyle =
        "#6e7e7d";

    ctx.lineWidth = 8;

    ctx.strokeRect(
        55,
        70,
        190,
        145
    );


    ctx.beginPath();

    ctx.moveTo(150, 70);
    ctx.lineTo(150, 215);

    ctx.moveTo(55, 142);
    ctx.lineTo(245, 142);

    ctx.stroke();


    /*
       Sofa
    */

    ctx.fillStyle =
        "#6e7772";

    ctx.fillRect(
        390,
        350,
        300,
        105
    );

    ctx.fillRect(
        370,
        300,
        340,
        100
    );


    ctx.fillStyle =
        "#59625d";

    ctx.fillRect(
        370,
        390,
        25,
        80
    );

    ctx.fillRect(
        685,
        390,
        25,
        80
    );


    /*
       TV unit
    */

    ctx.fillStyle =
        "#594b40";

    ctx.fillRect(
        820,
        285,
        220,
        110
    );


    ctx.fillStyle =
        "#1e2421";

    ctx.fillRect(
        850,
        215,
        160,
        100
    );


    /*
       Dining table
    */

    ctx.fillStyle =
        "#795c42";

    ctx.fillRect(
        620,
        480,
        190,
        25
    );

    ctx.fillRect(
        640,
        500,
        18,
        100
    );

    ctx.fillRect(
        775,
        500,
        18,
        100
    );


    /*
       Bookshelf
    */

    ctx.fillStyle =
        "#705641";

    ctx.fillRect(
        820,
        70,
        180,
        150
    );


    ctx.strokeStyle =
        "#4e392b";

    ctx.lineWidth = 5;

    ctx.strokeRect(
        820,
        70,
        180,
        150
    );


    for (
        let y = 120;
        y <= 190;
        y += 35
    ) {

        ctx.beginPath();

        ctx.moveTo(820, y);

        ctx.lineTo(1000, y);

        ctx.stroke();

    }


    /*
       Side table
    */

    ctx.fillStyle =
        "#775c43";

    ctx.fillRect(
        120,
        270,
        150,
        20
    );

    ctx.fillRect(
        140,
        290,
        15,
        100
    );

    ctx.fillRect(
        235,
        290,
        15,
        100
    );


    /*
       Laundry basket
    */

    ctx.fillStyle =
        "#8c987d";

    ctx.beginPath();

    ctx.roundRect(
        70,
        490,
        150,
        110,
        15
    );

    ctx.fill();


    ctx.fillStyle =
        "#d6d2bd";

    ctx.font =
        "15px Arial";

    ctx.textAlign =
        "center";

    ctx.fillText(
        "LAUNDRY",
        145,
        555
    );


    /*
       Labels
    */

    ctx.fillStyle =
        "rgba(35,35,30,0.55)";

    ctx.font =
        "13px Arial";

    ctx.textAlign =
        "left";

    ctx.fillText(
        "LIVING ROOM",
        25,
        35
    );

}


/* =========================================================
   DESTINATIONS
========================================================= */

function drawDestinations() {

    objects.forEach(
        (object, index) => {

            if (object.placed) {

                return;

            }


            if (
                index !== currentObjectIndex &&
                !carriedObject
            ) {

                return;

            }


            const x =
                carriedObject
                    ? carriedObject.destinationX
                    : object.destinationX;


            const y =
                carriedObject
                    ? carriedObject.destinationY
                    : object.destinationY;


            drawDottedDestination(
                x,
                y,
                object.type
            );

        }
    );

}


/* =========================================================
   DOTTED DESTINATION
========================================================= */

function drawDottedDestination(
    x,
    y,
    type
) {

    ctx.save();

    ctx.strokeStyle =
        "#4e8b62";

    ctx.lineWidth = 3;

    ctx.setLineDash([
        8,
        7
    ]);


    let width = 100;

    let height = 75;


    if (type === "cushion") {

        width = 130;
        height = 70;

    }


    if (type === "plant") {

        width = 80;
        height = 90;

    }


    ctx.strokeRect(
        x - width / 2,
        y - height / 2,
        width,
        height
    );


    ctx.setLineDash([]);


    ctx.fillStyle =
        "rgba(78,139,98,0.08)";

    ctx.fillRect(
        x - width / 2,
        y - height / 2,
        width,
        height
    );


    ctx.fillStyle =
        "#4e8b62";

    ctx.font =
        "12px Arial";

    ctx.textAlign =
        "center";


    ctx.fillText(
        "PLACE HERE",
        x,
        y + height / 2 + 18
    );


    ctx.restore();

}


/* =========================================================
   OBJECTS
========================================================= */

function drawObjects() {

    objects.forEach(
        (object, index) => {

            if (object.placed) {

                return;

            }


            /*
               Carried object follows finger.
            */

            if (carriedObject === object) {

                drawObject(
                    object.type,
                    fingerX,
                    fingerY
                );

                return;

            }


            /*
               Normal misplaced object.
            */

            drawObject(
                object.type,
                object.startX,
                object.startY
            );


            /*
               Highlight current object.
            */

            if (
                index ===
                currentObjectIndex
            ) {

                ctx.beginPath();

                ctx.arc(
                    object.startX,
                    object.startY,
                    48,
                    0,
                    Math.PI * 2
                );


                ctx.strokeStyle =
                    "rgba(255,255,255,0.65)";

                ctx.lineWidth = 2;

                ctx.stroke();

            }

        }
    );

}


/* =========================================================
   DRAW INDIVIDUAL OBJECT
========================================================= */

function drawObject(
    type,
    x,
    y
) {

    ctx.save();

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";


    /* =========================
       BOOK
    ========================= */

    if (type === "book") {

        ctx.fillStyle =
            "#754d43";

        ctx.fillRect(
            x - 28,
            y - 38,
            56,
            76
        );


        ctx.fillStyle =
            "#e0d3bb";

        ctx.fillRect(
            x - 20,
            y - 31,
            40,
            62
        );


        ctx.strokeStyle =
            "#8a6b59";

        ctx.lineWidth = 2;


        ctx.beginPath();

        ctx.moveTo(
            x,
            y - 30
        );

        ctx.lineTo(
            x,
            y + 30
        );

        ctx.stroke();

    }


    /* =========================
       CUP
    ========================= */

    else if (type === "cup") {

        ctx.fillStyle =
            "#c8d1cc";


        ctx.beginPath();

        ctx.roundRect(
            x - 28,
            y - 28,
            56,
            55,
            8
        );

        ctx.fill();


        ctx.strokeStyle =
            "#6d7771";

        ctx.lineWidth = 5;


        ctx.beginPath();

        ctx.arc(
            x + 30,
            y,
            15,
            -Math.PI / 2,
            Math.PI / 2
        );

        ctx.stroke();


        /*
           Coffee
        */

        ctx.fillStyle =
            "#654a37";


        ctx.beginPath();

        ctx.ellipse(
            x,
            y - 22,
            22,
            7,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }


    /* =========================
       CUSHION
    ========================= */

    else if (type === "cushion") {

        ctx.fillStyle =
            "#7d9183";


        ctx.beginPath();

        ctx.roundRect(
            x - 48,
            y - 30,
            96,
            60,
            12
        );

        ctx.fill();


        ctx.strokeStyle =
            "#5c6c61";

        ctx.lineWidth = 3;

        ctx.stroke();

    }


    /* =========================
       PLANT
    ========================= */

    else if (type === "plant") {

        /*
           Pot
        */

        ctx.fillStyle =
            "#a56e4d";


        ctx.beginPath();

        ctx.moveTo(
            x - 27,
            y + 5
        );

        ctx.lineTo(
            x + 27,
            y + 5
        );

        ctx.lineTo(
            x + 20,
            y + 40
        );

        ctx.lineTo(
            x - 20,
            y + 40
        );

        ctx.closePath();

        ctx.fill();


        /*
           Stem
        */

        ctx.strokeStyle =
            "#49684f";

        ctx.lineWidth = 6;


        ctx.beginPath();

        ctx.moveTo(
            x,
            y + 8
        );

        ctx.lineTo(
            x,
            y - 30
        );

        ctx.stroke();


        /*
           Leaves
        */

        ctx.fillStyle =
            "#527d59";


        ctx.beginPath();

        ctx.ellipse(
            x - 18,
            y - 25,
            20,
            10,
            -0.5,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.beginPath();

        ctx.ellipse(
            x + 18,
            y - 15,
            20,
            10,
            0.5,
            0,
            Math.PI * 2
        );

        ctx.fill();

    }


    /* =========================
       REMOTE
    ========================= */

    else if (type === "remote") {

        ctx.fillStyle =
            "#343936";


        ctx.beginPath();

        ctx.roundRect(
            x - 17,
            y - 40,
            34,
            80,
            8
        );

        ctx.fill();


        ctx.fillStyle =
            "#b5c0b8";


        ctx.beginPath();

        ctx.arc(
            x,
            y - 23,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();


        for (
            let i = 0;
            i < 3;
            i++
        ) {

            ctx.beginPath();

            ctx.arc(
                x,
                y - 5 + i * 16,
                5,
                0,
                Math.PI * 2
            );

            ctx.fill();

        }

    }


    ctx.restore();

}


/* =========================================================
   FINGER CURSOR
========================================================= */

function drawFingerCursor() {

    if (!handDetected) {

        return;

    }


    ctx.save();


    /*
       Outer cursor
    */

    ctx.beginPath();

    ctx.arc(
        fingerX,
        fingerY,
        18,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "rgba(255,255,255,0.18)";

    ctx.fill();


    ctx.strokeStyle =
        "#ffffff";

    ctx.lineWidth = 3;

    ctx.stroke();


    /*
       Center point
    */

    ctx.beginPath();

    ctx.arc(
        fingerX,
        fingerY,
        5,
        0,
        Math.PI * 2
    );


    ctx.fillStyle =
        "#ffffff";

    ctx.fill();


    ctx.restore();

}


/* =========================================================
   HOLD PROGRESS CIRCLE
========================================================= */

function drawHoldProgress() {

    let startTime = null;


    /*
       Pickup progress
    */

    if (!carriedObject) {

        startTime =
            pickupStartTime;

    }


    /*
       Placement progress
    */

    else {

        startTime =
            placementStartTime;

    }


    if (startTime === null) {

        return;

    }


    const elapsed =
        performance.now() -
        startTime;


    let progress =
        elapsed /
        HOLD_TIME;


    progress =
        Math.max(
            0,
            Math.min(
                1,
                progress
            )
        );


    ctx.save();


    /*
       Progress ring
    */

    ctx.beginPath();

    ctx.arc(
        fingerX,
        fingerY,
        38,
        -Math.PI / 2,
        -Math.PI / 2 +
        Math.PI * 2 *
        progress
    );


    ctx.strokeStyle =
        "#79b58b";

    ctx.lineWidth = 8;

    ctx.lineCap =
        "round";

    ctx.stroke();


    /*
       Inner timer
    */

    ctx.fillStyle =
        "rgba(20,30,23,0.85)";


    ctx.beginPath();

    ctx.arc(
        fingerX,
        fingerY,
        27,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle =
        "#ffffff";

    ctx.font =
        "bold 12px Arial";

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "middle";


    const remaining =
        Math.max(
            0,
            (
                HOLD_TIME -
                elapsed
            ) / 1000
        );


    ctx.fillText(
        remaining.toFixed(1),
        fingerX,
        fingerY
    );


    ctx.restore();

}


/* =========================================================
   NEXT LEVEL
========================================================= */

nextLevelButton.addEventListener(
    "click",
    () => {

        stopVoice();

        window.parent.postMessage(
            { type: "NEUROSYNC_BACK_TO_LEVELS" },
            "*"
        );

    }
);