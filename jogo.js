let audioCtx = null;
let soundEnabled = true;

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    if (!soundEnabled || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (type === 'jump') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(280, now);
            osc.frequency.exponentialRampToValueAtTime(650, now + 0.12);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
            osc.start(now);
            osc.stop(now + 0.12);
        } else if (type === 'score') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(783.99, now + 0.08);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
        } else if (type === 'hit') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.25);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch (e) {
        console.log("Áudio aguardando interação.");
    }
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const wrapper = document.getElementById('canvas-wrapper');

function resize() {
    canvas.width = wrapper.clientWidth || 800;
    canvas.height = wrapper.clientHeight || 420;
}
window.addEventListener('resize', resize);
resize();

let gameState = 'START';
let score = 0;
let highScore = localStorage.getItem('neko_highscore') || 0;
let gameSpeed = 5.5;
let frame = 0;

const scoreEl = document.getElementById('current-score');
const bestEl = document.getElementById('best-score');
const heroBestEl = document.getElementById('hero-high-score');
const overlay = document.getElementById('game-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const startBtn = document.getElementById('start-btn');
const soundBtn = document.getElementById('sound-btn');

bestEl.textContent = String(highScore).padStart(4, '0');
heroBestEl.textContent = highScore;

soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? 'Som: Ligado' : 'Som: Desligado';
    if (soundEnabled) initAudio();
});

const cat = {
    x: 70,
    y: 0,
    width: 44,
    height: 44,
    vy: 0,
    gravity: 0.6,
    jumpForce: -11,
    isGrounded: false,
    animTimer: 0
};

let obstacles = [];
let particles = [];
let petals = [];

for (let i = 0; i < 30; i++) {
    petals.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 4 + 2,
        speedX: -(Math.random() * 1.5 + 0.5),
        speedY: Math.random() * 1 + 0.5,
        angle: Math.random() * 3.14
    });
}

function resetGame() {
    score = 0;
    gameSpeed = 5.5;
    frame = 0;
    obstacles = [];
    particles = [];
    cat.y = canvas.height - 80 - cat.height;
    cat.vy = 0;
    cat.isGrounded = true;
    scoreEl.textContent = '0000';
}

function startGame() {
    initAudio();
    resetGame();
    gameState = 'PLAYING';
    overlay.classList.add('hidden');
}

function gameOver() {
    gameState = 'GAMEOVER';
    playSound('hit');

    if (score > highScore) {
        highScore = Math.floor(score);
        localStorage.setItem('neko_highscore', highScore);
        bestEl.textContent = String(highScore).padStart(4, '0');
        heroBestEl.textContent = highScore;
    }

    overlayTitle.textContent = 'FIM DE JOGO';
    overlaySubtitle.textContent = 'Pontuação obtida: ' + Math.floor(score) + ' pontos!';
    startBtn.textContent = 'JOGAR NOVAMENTE';
    overlay.classList.remove('hidden');
}

startBtn.addEventListener('click', startGame);

function doJump() {
    initAudio();
    if (gameState === 'START' || gameState === 'GAMEOVER') {
        startGame();
    } else if (gameState === 'PLAYING' && cat.isGrounded) {
        cat.vy = cat.jumpForce;
        cat.isGrounded = false;
        playSound('jump');

        for (let i = 0; i < 5; i++) {
            particles.push({
                x: cat.x + cat.width / 2,
                y: canvas.height - 80,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 2 - 1,
                radius: Math.random() * 3 + 1,
                alpha: 1
            });
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        doJump();
    }
});

canvas.addEventListener('mousedown', doJump);

function spawnObstacle() {
    const h = Math.random() > 0.5 ? 45 : 60;
    obstacles.push({
        x: canvas.width + 30,
        y: canvas.height - 80 - h,
        width: 32,
        height: h,
        passed: false
    });
}

function update() {
    if (gameState !== 'PLAYING') return;

    frame++;
    score += 0.15;
    scoreEl.textContent = String(Math.floor(score)).padStart(4, '0');

    if (frame % 450 === 0) gameSpeed += 0.5;

    if (frame % Math.max(70, 120 - Math.floor(gameSpeed * 4)) === 0) {
        spawnObstacle();
    }

    const groundY = canvas.height - 80;

    cat.vy += cat.gravity;
    cat.y += cat.vy;

    if (cat.y >= groundY - cat.height) {
        cat.y = groundY - cat.height;
        cat.vy = 0;
        cat.isGrounded = true;
    }

    cat.animTimer += 0.15;

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        if (!obs.passed && obs.x + obs.width < cat.x) {
            obs.passed = true;
            playSound('score');
        }

        const pad = 6;
        if (
            cat.x + pad < obs.x + obs.width - pad &&
            cat.x + cat.width - pad > obs.x + pad &&
            cat.y + pad < obs.y + obs.height - pad &&
            cat.y + cat.height - pad > obs.y + pad
        ) {
            gameOver();
        }

        if (obs.x + obs.width < -40) obstacles.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.04;
        if (p.alpha <= 0) particles.splice(i, 1);
    }

    for (let p of petals) {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.y > canvas.height + 10) {
            p.y = -10;
            p.x = Math.random() * canvas.width;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const groundY = canvas.height - 80;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#1c0c1b');
    bgGrad.addColorStop(1, '#0f040e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(244, 114, 182, 0.5)';
    for (let p of petals) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    ctx.fillStyle = '#140812';
    ctx.fillRect(0, groundY + 1, canvas.width, canvas.height - groundY);

    for (let obs of obstacles) {
        ctx.fillStyle = '#be185d';
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height * 0.3);
        ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
        ctx.lineTo(obs.x, obs.y + obs.height);
        ctx.lineTo(obs.x, obs.y + obs.height * 0.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // --- Gatinho Vetorial com Orelhas Mais Arredondadas e Suaves ---
    ctx.save();
    ctx.translate(cat.x, cat.y);

    let bob = cat.isGrounded ? Math.sin(cat.animTimer * 1.5) * 2 : 0;
    ctx.translate(0, bob);

    // Rabo
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(4, 28);
    ctx.quadraticCurveTo(-10, 16, -6, 6);
    ctx.stroke();

    // Corpo
    ctx.fillStyle = '#fbcfe8';
    ctx.strokeStyle = '#db2777';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(4, 14, 34, 26, [12]);
    ctx.fill();
    ctx.stroke();

    // Cabeça
    ctx.beginPath();
    ctx.roundRect(8, 2, 30, 24, [10]);
    ctx.fill();
    ctx.stroke();

    // Orelhas (Curvadas e menos pontudas)
    // Orelha Esquerda
    ctx.beginPath();
    ctx.moveTo(10, 6);
    ctx.quadraticCurveTo(8, -3, 13, -3);
    ctx.quadraticCurveTo(18, -2, 20, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Orelha Direita
    ctx.beginPath();
    ctx.moveTo(26, 4);
    ctx.quadraticCurveTo(28, -2, 33, -3);
    ctx.quadraticCurveTo(38, -3, 36, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Olhos Grandes Anime
    ctx.fillStyle = '#500724';
    ctx.beginPath();
    ctx.arc(17, 12, 3, 0, Math.PI * 2);
    ctx.arc(29, 12, 3, 0, Math.PI * 2);
    ctx.fill();

    // Brilho dos Olhos
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 11, 1, 0, Math.PI * 2);
    ctx.arc(28, 11, 1, 0, Math.PI * 2);
    ctx.fill();

    // Bochechas Coradas
    ctx.fillStyle = 'rgba(236, 72, 153, 0.5)';
    ctx.beginPath();
    ctx.arc(14, 16, 2.5, 0, Math.PI * 2);
    ctx.arc(32, 16, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Patinhas
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(12, 38, 3.5, 0, Math.PI * 2);
    ctx.arc(28, 38, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    for (let p of particles) {
        ctx.fillStyle = `rgba(244, 114, 182, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);