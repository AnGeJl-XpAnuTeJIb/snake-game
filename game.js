const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const restartBtn = document.getElementById('restartBtn');

const hintUp = document.getElementById('hintUp');
const hintDown = document.getElementById('hintDown');
const hintLeft = document.getElementById('hintLeft');
const hintRight = document.getElementById('hintRight');

const GRID_COUNT = 20;
let cellSize;
const GAME_SPEED = 100;

let snake = [];
let food = { x: 0, y: 0 };
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let score = 0;
let bestScore = 0;
let gameRunning = false;
let gameOverFlag = false;
let gameLoopId = null;

let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playBeep(freq, duration, type = 'square', vol = 0.05) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
}

function sfxEat() {
    playBeep(800, 0.08, 'square', 0.04);
}

function sfxDeath() {
    playBeep(200, 0.15, 'sawtooth', 0.05);
    setTimeout(() => playBeep(100, 0.2, 'sawtooth', 0.04), 100);
}

function calculateCellSize() {
    const maxWidth = Math.min(window.innerWidth - 32, 500);
    const maxHeight = Math.min(window.innerHeight - 280, 500);
    const size = Math.floor(Math.min(maxWidth, maxHeight) / GRID_COUNT);
    cellSize = size;
    canvas.width = cellSize * GRID_COUNT;
    canvas.height = cellSize * GRID_COUNT;
}

function loadBestScore() {
    const saved = localStorage.getItem('neonSnakeBestScore');
    bestScore = saved ? parseInt(saved, 10) : 0;
    bestScoreEl.textContent = bestScore;
}

function saveBestScore() {
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('neonSnakeBestScore', bestScore);
        bestScoreEl.textContent = bestScore;
    }
}

function spawnFood() {
    let newFood;
    let onSnake;
    do {
        onSnake = false;
        newFood = {
            x: Math.floor(Math.random() * GRID_COUNT),
            y: Math.floor(Math.random() * GRID_COUNT),
        };
        for (const segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                onSnake = true;
                break;
            }
        }
    } while (onSnake);
    food = newFood;
}

function resetGame() {
    const center = Math.floor(GRID_COUNT / 2);
    snake = [
        { x: center, y: center },
        { x: center - 1, y: center },
        { x: center - 2, y: center },
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    gameOverFlag = false;
    scoreEl.textContent = '0';
    gameOverOverlay.classList.remove('visible');
    canvas.classList.remove('game-over-shake');
    spawnFood();
    updateScoreDisplay();
}

function updateScoreDisplay() {
    scoreEl.textContent = score;
    scoreEl.classList.add('score-pop');
    setTimeout(() => scoreEl.classList.remove('score-pop'), 300);
}

function step() {
    if (!gameRunning || gameOverFlag) return;

    direction = { ...nextDirection };

    const head = snake[0];
    const newHead = {
        x: head.x + direction.x,
        y: head.y + direction.y,
    };

    if (newHead.x < 0 || newHead.x >= GRID_COUNT || newHead.y < 0 || newHead.y >= GRID_COUNT) {
        endGame();
        return;
    }

    for (const segment of snake) {
        if (segment.x === newHead.x && segment.y === newHead.y) {
            endGame();
            return;
        }
    }

    snake.unshift(newHead);

    if (newHead.x === food.x && newHead.y === food.y) {
        score++;
        updateScoreDisplay();
        sfxEat();
        spawnFood();
    } else {
        snake.pop();
    }

    updateActiveHint();
}

function endGame() {
    gameOverFlag = true;
    gameRunning = false;
    clearInterval(gameLoopId);
    gameLoopId = null;
    saveBestScore();
    sfxDeath();
    canvas.classList.add('game-over-shake');
    gameOverOverlay.classList.add('visible');
    setTimeout(() => {
        canvas.classList.remove('game-over-shake');
    }, 500);
}

function drawGrid() {
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_COUNT; i++) {
        const pos = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(canvas.width, pos);
        ctx.stroke();
    }
}

function drawSnake() {
    for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const x = seg.x * cellSize;
        const y = seg.y * cellSize;

        if (i === 0) {
            ctx.fillStyle = '#2ea043';
        } else {
            ctx.fillStyle = '#238636';
        }

        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    }

    const head = snake[0];
    const hx = head.x * cellSize;
    const hy = head.y * cellSize;
    const eyeSize = cellSize * 0.15;

    let eye1X, eye1Y, eye2X, eye2Y;

    if (direction.x === 1) {
        eye1X = hx + cellSize * 0.65;
        eye1Y = hy + cellSize * 0.3;
        eye2X = hx + cellSize * 0.65;
        eye2Y = hy + cellSize * 0.7;
    } else if (direction.x === -1) {
        eye1X = hx + cellSize * 0.35;
        eye1Y = hy + cellSize * 0.3;
        eye2X = hx + cellSize * 0.35;
        eye2Y = hy + cellSize * 0.7;
    } else if (direction.y === -1) {
        eye1X = hx + cellSize * 0.3;
        eye1Y = hy + cellSize * 0.35;
        eye2X = hx + cellSize * 0.7;
        eye2Y = hy + cellSize * 0.35;
    } else {
        eye1X = hx + cellSize * 0.3;
        eye1Y = hy + cellSize * 0.65;
        eye2X = hx + cellSize * 0.7;
        eye2Y = hy + cellSize * 0.65;
    }

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(eye1X - eyeSize/2, eye1Y - eyeSize/2, eyeSize, eyeSize);
    ctx.fillRect(eye2X - eyeSize/2, eye2Y - eyeSize/2, eyeSize, eyeSize);
}

function drawFood() {
    const fx = food.x * cellSize;
    const fy = food.y * cellSize;

    ctx.fillStyle = '#da3633';
    ctx.fillRect(fx + 1, fy + 1, cellSize - 2, cellSize - 2);

    const dotSize = cellSize * 0.2;
    ctx.fillStyle = '#f85149';
    ctx.fillRect(fx + cellSize * 0.3, fy + cellSize * 0.3, dotSize, dotSize);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();
    drawFood();
    drawSnake();
}

function gameTick() {
    step();
    draw();
}

function startGameLoop() {
    if (gameLoopId) clearInterval(gameLoopId);
    gameRunning = true;
    gameLoopId = setInterval(gameTick, GAME_SPEED);
}

function startGame() {
    resetGame();
    startGameLoop();
}

function restartGame() {
    initAudio();
    saveBestScore();
    clearInterval(gameLoopId);
    gameLoopId = null;
    gameRunning = false;
    resetGame();
    startGameLoop();
}

function updateActiveHint() {
    hintUp.classList.remove('active');
    hintDown.classList.remove('active');
    hintLeft.classList.remove('active');
    hintRight.classList.remove('active');

    if (direction.x === 0 && direction.y === -1) hintUp.classList.add('active');
    if (direction.x === 0 && direction.y === 1) hintDown.classList.add('active');
    if (direction.x === -1 && direction.y === 0) hintLeft.classList.add('active');
    if (direction.x === 1 && direction.y === 0) hintRight.classList.add('active');
}

function changeDirection(dx, dy) {
    if (direction.x === -dx && direction.y === -dy && snake.length > 1) return;
    if (direction.x === dx && direction.y === dy) return;
    nextDirection = { x: dx, y: dy };
}

document.addEventListener('keydown', (e) => {
    initAudio();

    if (gameOverFlag) {
        if (e.code === 'Space' || e.code === 'KeyR') {
            restartGame();
        }
        return;
    }

    switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
            e.preventDefault();
            changeDirection(0, -1);
            break;
        case 'KeyS':
        case 'ArrowDown':
            e.preventDefault();
            changeDirection(0, 1);
            break;
        case 'KeyA':
        case 'ArrowLeft':
            e.preventDefault();
            changeDirection(-1, 0);
            break;
        case 'KeyD':
        case 'ArrowRight':
            e.preventDefault();
            changeDirection(1, 0);
            break;
        case 'Space':
            e.preventDefault();
            if (gameOverFlag) restartGame();
            break;
    }
});

let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    initAudio();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchend', (e) => {
    if (gameOverFlag) {
        restartGame();
        return;
    }
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 20) return;

    if (absDx > absDy) {
        changeDirection(dx > 0 ? 1 : -1, 0);
    } else {
        changeDirection(0, dy > 0 ? 1 : -1);
    }
});

restartBtn.addEventListener('click', () => {
    initAudio();
    restartGame();
});

window.addEventListener('resize', () => {
    calculateCellSize();
    draw();
});

calculateCellSize();
loadBestScore();
resetGame();
startGameLoop();
draw();