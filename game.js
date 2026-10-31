/**
 * Flappy Bird - Retro Arcade Game Engine
 */

(function () {
  'use strict';

  // Game States
  const STATES = {
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
  };

  // Virtual Canvas Dimensions
  const V_WIDTH = 400;
  const V_HEIGHT = 640;
  const GROUND_HEIGHT = 90;

  // Configuration Profiles
  const DIFFICULTY = {
    chill: { gap: 150, speed: 2.1, spawnInterval: 140 },
    classic: { gap: 125, speed: 2.5, spawnInterval: 120 },
    hardcore: { gap: 105, speed: 3.1, spawnInterval: 100 }
  };

  const SKINS = {
    custom: {
      body: '#ffffff',
      belly: '#fcd02c',
      outline: '#222222',
      feather: '#fde047'
    },
    classic: {
      body: '#fcd02c',
      belly: '#fef59e',
      outline: '#222222',
      eye: '#ffffff',
      pupil: '#111111',
      beak: '#f85324',
      crest: '#e63946',
      feather: '#fde047'
    },
    cyber: {
      body: '#00e5ff',
      belly: '#80f7ff',
      outline: '#003b46',
      eye: '#ff007f',
      pupil: '#ffffff',
      beak: '#ffe600',
      crest: '#ff007f',
      feather: '#80f7ff'
    },
    phoenix: {
      body: '#ef4444',
      belly: '#fca5a5',
      outline: '#450a0a',
      eye: '#fbbf24',
      pupil: '#7f1d1d',
      beak: '#f59e0b',
      crest: '#f59e0b',
      feather: '#f87171'
    }
  };

  // DOM Elements
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const liveScoreEl = document.getElementById('live-score');
  const startScreen = document.getElementById('start-screen');
  const pauseScreen = document.getElementById('pause-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const finalScoreEl = document.getElementById('final-score');
  const bestScoreEl = document.getElementById('best-score');
  const medalIconEl = document.getElementById('medal-icon');
  const medalTextEl = document.getElementById('medal-text');
  const toastEl = document.getElementById('toast');
  const scanlinesEl = document.getElementById('scanlines');

  const btnSound = document.getElementById('btn-sound');
  const soundIcon = document.getElementById('sound-icon');
  const btnScanlines = document.getElementById('btn-scanlines');
  const btnPause = document.getElementById('btn-pause');
  const btnStart = document.getElementById('btn-start');
  const btnResume = document.getElementById('btn-resume');
  const btnRestartFromPause = document.getElementById('btn-restart-from-pause');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnShare = document.getElementById('btn-share');
  const btnMenu = document.getElementById('btn-menu');

  // Game Engine Variables
  let currentState = STATES.START;
  let currentDifficulty = 'classic';
  let currentSkin = 'custom';
  let score = 0;
  let highScore = parseInt(localStorage.getItem('flappy_best_score') || '0', 10);
  let scanlinesActive = localStorage.getItem('flappy_scanlines') === 'true';

  // Custom Player Sprites
  const imgJump = new Image();
  imgJump.src = 'player_jump.png'; // White T-shirt (jumping)

  const imgGlide = new Image();
  imgGlide.src = 'player_glide.png'; // Black T-shirt (moving forward / falling)

  let lastTime = 0;
  let frameCount = 0;
  let groundOffset = 0;
  let cloudOffset = 0;
  let cityOffset = 0;

  // Screen Shake & Flash FX
  let shakeIntensity = 0;
  let flashAlpha = 0;

  // Collections
  let pipes = [];
  let particles = [];
  let scorePopups = [];

  // Setup HiDPI Canvas
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = V_WIDTH * dpr;
    canvas.height = V_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Bird Object
  const bird = {
    x: 90,
    y: 280,
    radius: 15,
    hitRadius: 13,
    velocity: 0,
    gravity: 0.38,
    jumpForce: -7.6,
    maxVelocity: 11,
    rotation: 0,
    wingAngle: 0,
    wingSpeed: 0.2,
    hoverOffset: 0,

    reset() {
      this.x = 90;
      this.y = 280;
      this.velocity = 0;
      this.rotation = 0;
      this.wingAngle = 0;
      this.hoverOffset = 0;
    },

    flap() {
      this.velocity = this.jumpForce;
      window.soundManager.playFlap();

      // Spawn puff particles
      for (let i = 0; i < 4; i++) {
        particles.push(new Particle(
          this.x - 12 + (Math.random() * 6 - 3),
          this.y + 4 + (Math.random() * 6 - 3),
          -1.5 - Math.random() * 1.5,
          Math.random() * 2 - 1,
          SKINS[currentSkin].feather,
          12 + Math.random() * 8
        ));
      }
    },

    update(dt) {
      if (currentState === STATES.START) {
        // Idle bobbing animation
        this.hoverOffset += 0.05 * dt;
        this.y = 280 + Math.sin(this.hoverOffset) * 9;
        this.wingAngle += this.wingSpeed * dt;
        this.rotation = 0;
        return;
      }

      if (currentState === STATES.PLAYING || currentState === STATES.GAMEOVER) {
        this.velocity += this.gravity * dt;
        if (this.velocity > this.maxVelocity) this.velocity = this.maxVelocity;
        this.y += this.velocity * dt;

        // Rotation physics: quick tilt up, slow dive down
        if (this.velocity < 0) {
          this.rotation = Math.max(-0.45, this.velocity * 0.06);
          this.wingAngle += 0.35 * dt;
        } else {
          this.rotation = Math.min(Math.PI / 2, this.rotation + 0.045 * dt);
          if (this.rotation > 0.4) {
            this.wingAngle = 0; // stop flapping when diving
          } else {
            this.wingAngle += 0.15 * dt;
          }
        }

        // Clamp to top ceiling
        if (this.y - this.hitRadius < 0) {
          this.y = this.hitRadius;
          this.velocity = 0;
        }

        // Floor collision
        const floorY = V_HEIGHT - GROUND_HEIGHT;
        if (this.y + this.hitRadius >= floorY) {
          this.y = floorY - this.hitRadius;
          if (currentState === STATES.PLAYING) {
            triggerGameOver();
          }
        }
      }
    },

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      if (currentSkin === 'custom') {
        // When moving forward / falling (velocity >= 0): Black T-Shirt
        // When jumping (velocity < 0): White T-Shirt
        const activeImg = (this.velocity < 0) ? imgJump : imgGlide;
        const renderR = 23; // Render size 46x46px

        // Drop shadow for depth
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 4;

        if (activeImg.complete && activeImg.naturalWidth > 0) {
          ctx.drawImage(activeImg, -renderR, -renderR, renderR * 2, renderR * 2);
        } else {
          ctx.fillStyle = '#fcd02c';
          ctx.beginPath();
          ctx.arc(0, 0, renderR, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Animated retro wing flap on avatar side
        const wingYOffset = Math.sin(this.wingAngle) * 3.5;
        ctx.save();
        ctx.translate(-renderR + 4, wingYOffset);
        ctx.fillStyle = (this.velocity < 0) ? '#ffffff' : '#111111';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

      } else {
        const skin = SKINS[currentSkin];
        ctx.fillStyle = skin.body;
        ctx.strokeStyle = skin.outline;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Belly
        ctx.fillStyle = skin.belly;
        ctx.beginPath();
        ctx.ellipse(-2, 3, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing animation
        const wingYOffset = Math.sin(this.wingAngle) * 4;
        ctx.save();
        ctx.translate(-5, 0 + wingYOffset);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = skin.outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Eye
        ctx.fillStyle = skin.eye;
        ctx.strokeStyle = skin.outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(7, -4, 5, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupil with gleam
        ctx.fillStyle = skin.pupil;
        ctx.beginPath();
        ctx.arc(8.5, -4, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(9.2, -5.2, 0.9, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = skin.beak;
        ctx.strokeStyle = skin.outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(11, -1);
        ctx.lineTo(21, 2);
        ctx.lineTo(10, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Crest feather
        ctx.fillStyle = skin.crest;
        ctx.beginPath();
        ctx.moveTo(-6, -11);
        ctx.quadraticCurveTo(-10, -17, -3, -15);
        ctx.quadraticCurveTo(0, -13, -2, -10);
        ctx.fill();
      }

      ctx.restore();
    }
  };

  // Particle Class
  class Particle {
    constructor(x, y, vx, vy, color, maxLife) {
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.color = color;
      this.life = 0;
      this.maxLife = maxLife;
      this.size = 3.5 + Math.random() * 2.5;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.life += dt;
      this.size = Math.max(0, this.size - 0.05 * dt);
    }

    draw() {
      const alpha = Math.max(0, 1 - (this.life / this.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Floating Score Popup (+1)
  class ScorePopup {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.life = 0;
      this.maxLife = 30;
    }

    update(dt) {
      this.y -= 1.2 * dt;
      this.life += dt;
    }

    draw() {
      const alpha = Math.max(0, 1 - (this.life / this.maxLife));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 16px "Press Start 2P", monospace';
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText('+1', this.x, this.y);
      ctx.fillText('+1', this.x, this.y);
      ctx.restore();
    }
  }

  // Pipe Pair Class
  class Pipe {
    constructor(x, gap, speed) {
      this.x = x;
      this.gap = gap;
      this.speed = speed;
      this.width = 62;
      this.passed = false;

      // Safe bounds for gap
      const minTop = 80;
      const maxTop = V_HEIGHT - GROUND_HEIGHT - gap - 80;
      this.topHeight = Math.floor(minTop + Math.random() * (maxTop - minTop));
      this.bottomY = this.topHeight + this.gap;
      this.bottomHeight = V_HEIGHT - GROUND_HEIGHT - this.bottomY;
    }

    update(dt) {
      this.x -= this.speed * dt;
    }

    draw() {
      const capH = 26;
      const capW = this.width + 6;
      const capOffset = -3;

      // Color scheme
      const pipeGreenLight = '#86efac';
      const pipeGreenMid = '#22c55e';
      const pipeGreenDark = '#15803d';
      const pipeOutline = '#14532d';

      // Function to draw single pipe segment
      const drawSegment = (px, py, pw, ph, isTop) => {
        if (ph <= 0) return;

        // Body gradient
        const grad = ctx.createLinearGradient(px, 0, px + pw, 0);
        grad.addColorStop(0, pipeGreenMid);
        grad.addColorStop(0.2, pipeGreenLight);
        grad.addColorStop(0.65, pipeGreenMid);
        grad.addColorStop(1, pipeGreenDark);

        ctx.fillStyle = grad;
        ctx.strokeStyle = pipeOutline;
        ctx.lineWidth = 2.5;

        // Pipe stem
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeRect(px, py, pw, ph);

        // Pipe Lip / Cap
        const capY = isTop ? py + ph - capH : py;
        const capGrad = ctx.createLinearGradient(px + capOffset, 0, px + capOffset + capW, 0);
        capGrad.addColorStop(0, pipeGreenMid);
        capGrad.addColorStop(0.2, pipeGreenLight);
        capGrad.addColorStop(0.7, pipeGreenMid);
        capGrad.addColorStop(1, pipeGreenDark);

        ctx.fillStyle = capGrad;
        ctx.fillRect(px + capOffset, capY, capW, capH);
        ctx.strokeRect(px + capOffset, capY, capW, capH);

        // Highlight stripe
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(px + 6, py, 4, ph);
      };

      // Top pipe
      drawSegment(this.x, 0, this.width, this.topHeight, true);
      // Bottom pipe
      drawSegment(this.x, this.bottomY, this.width, this.bottomHeight, false);
    }

    collidesWith(b) {
      // Check circle vs rectangle collision with inset hitboxes
      const r = b.hitRadius;
      const bx = b.x;
      const by = b.y;

      // Top pipe box
      if (bx + r > this.x && bx - r < this.x + this.width) {
        if (by - r < this.topHeight) {
          return true;
        }
      }

      // Bottom pipe box
      if (bx + r > this.x && bx - r < this.x + this.width) {
        if (by + r > this.bottomY) {
          return true;
        }
      }

      return false;
    }
  }

  // Spawning Pipes
  let pipeTimer = 0;
  function handlePipes(dt) {
    const config = DIFFICULTY[currentDifficulty];
    pipeTimer += dt;

    if (pipeTimer >= config.spawnInterval) {
      pipeTimer = 0;
      // Slight speed scaling for classic and hardcore
      const bonusSpeed = currentDifficulty === 'chill' ? 0 : Math.min(0.6, score * 0.025);
      pipes.push(new Pipe(V_WIDTH + 20, config.gap, config.speed + bonusSpeed));
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
      const p = pipes[i];
      p.update(dt);

      // Collision Check
      if (currentState === STATES.PLAYING && p.collidesWith(bird)) {
        triggerGameOver();
        return;
      }

      // Score counting
      if (!p.passed && p.x + p.width < bird.x) {
        p.passed = true;
        score++;
        updateLiveScore();
        window.soundManager.playPoint();

        // Spawn +1 popup
        scorePopups.push(new ScorePopup(bird.x + 10, bird.y - 20));

        // Golden spark particles
        for (let k = 0; k < 6; k++) {
          particles.push(new Particle(
            bird.x,
            bird.y,
            Math.cos(k * 1.05) * 3,
            Math.sin(k * 1.05) * 3,
            '#fcd34d',
            18
          ));
        }
      }

      // Cleanup off-screen pipes
      if (p.x + p.width < -30) {
        pipes.splice(i, 1);
      }
    }
  }

  // Draw Background Elements (Day / Sunset / Night Theme)
  function drawBackground(dt) {
    // Determine dynamic theme: Day (0-9), Sunset (10-19), Night (20+)
    const themeCycle = Math.floor(score / 10) % 3;

    let skyTop = '#38bdf8';
    let skyBottom = '#bae6fd';
    let cloudColor = 'rgba(255, 255, 255, 0.85)';
    let cityColor = '#94a3b8';
    let sunColor = '#fde047';

    if (themeCycle === 1) {
      // Sunset
      skyTop = '#f97316';
      skyBottom = '#fed7aa';
      cloudColor = 'rgba(254, 215, 170, 0.7)';
      cityColor = '#64748b';
      sunColor = '#fb923c';
    } else if (themeCycle === 2) {
      // Night
      skyTop = '#0f172a';
      skyBottom = '#1e293b';
      cloudColor = 'rgba(148, 163, 184, 0.25)';
      cityColor = '#334155';
      sunColor = '#f1f5f9'; // Moon
    }

    // Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT - GROUND_HEIGHT);
    skyGrad.addColorStop(0, skyTop);
    skyGrad.addColorStop(1, skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

    // Stars in night mode
    if (themeCycle === 2) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      const starSeeds = [
        [40, 50], [90, 80], [150, 40], [220, 90], [280, 45],
        [340, 70], [60, 130], [180, 140], [310, 120]
      ];
      starSeeds.forEach(([sx, sy]) => {
        ctx.fillRect(sx, sy, 2, 2);
      });
    }

    // Sun / Moon
    ctx.save();
    ctx.fillStyle = sunColor;
    ctx.beginPath();
    ctx.arc(themeCycle === 2 ? 310 : 320, 90, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // City Skyline Silhouette (Parallax Layer 1)
    if (currentState === STATES.PLAYING) {
      cityOffset = (cityOffset + 0.35 * dt) % 180;
    }
    ctx.fillStyle = cityColor;
    for (let x = -cityOffset; x < V_WIDTH + 80; x += 36) {
      const h = 40 + ((Math.abs(Math.sin(x * 12.3)) * 40));
      ctx.fillRect(x, V_HEIGHT - GROUND_HEIGHT - h, 32, h);
    }

    // Clouds (Parallax Layer 2)
    if (currentState === STATES.PLAYING || currentState === STATES.START) {
      cloudOffset = (cloudOffset + 0.7 * dt) % 400;
    }
    ctx.fillStyle = cloudColor;
    const cloudPositions = [
      { x: 50, y: 140, r: 24 },
      { x: 190, y: 190, r: 32 },
      { x: 330, y: 120, r: 20 }
    ];

    cloudPositions.forEach(c => {
      let cx = (c.x - cloudOffset);
      if (cx < -60) cx += V_WIDTH + 100;
      ctx.beginPath();
      ctx.arc(cx, c.y, c.r, 0, Math.PI * 2);
      ctx.arc(cx + c.r * 0.7, c.y - 6, c.r * 0.75, 0, Math.PI * 2);
      ctx.arc(cx - c.r * 0.7, c.y + 2, c.r * 0.65, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Draw Ground Layer
  function drawGround(dt) {
    const floorY = V_HEIGHT - GROUND_HEIGHT;

    if (currentState === STATES.PLAYING) {
      const config = DIFFICULTY[currentDifficulty];
      groundOffset = (groundOffset + config.speed * dt) % 24;
    }

    // Ground Base (Dirt)
    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, floorY, V_WIDTH, GROUND_HEIGHT);

    // Darker Dirt Bottom
    ctx.fillStyle = '#d0c878';
    ctx.fillRect(0, floorY + 16, V_WIDTH, GROUND_HEIGHT - 16);

    // Top Grass Rim
    ctx.fillStyle = '#73bf2e';
    ctx.fillRect(0, floorY, V_WIDTH, 14);

    // Grass Accent line
    ctx.fillStyle = '#9ce659';
    ctx.fillRect(0, floorY, V_WIDTH, 4);

    // Repeating Retro Grass Stripe Pattern
    ctx.fillStyle = '#5ba023';
    ctx.beginPath();
    for (let x = -groundOffset; x < V_WIDTH + 24; x += 18) {
      ctx.moveTo(x, floorY + 14);
      ctx.lineTo(x + 8, floorY + 14);
      ctx.lineTo(x + 4, floorY + 22);
      ctx.closePath();
    }
    ctx.fill();

    // Top border outline
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(V_WIDTH, floorY);
    ctx.stroke();
  }

  // Screen Flash and Shake FX
  function applyFX() {
    if (shakeIntensity > 0) {
      const sx = (Math.random() * 2 - 1) * shakeIntensity;
      const sy = (Math.random() * 2 - 1) * shakeIntensity;
      ctx.translate(sx, sy);
      shakeIntensity = Math.max(0, shakeIntensity - 0.75);
    }
  }

  function drawFlash() {
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
      flashAlpha = Math.max(0, flashAlpha - 0.08);
    }
  }

  // Game Over Logic
  function triggerGameOver() {
    currentState = STATES.GAMEOVER;
    window.soundManager.playHit();
    setTimeout(() => window.soundManager.playDie(), 120);

    // FX
    shakeIntensity = 10;
    flashAlpha = 0.85;

    // Death explosion particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.push(new Particle(
        bird.x,
        bird.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        SKINS[currentSkin].body,
        25 + Math.random() * 15
      ));
    }

    // Check High Score
    let isNewBest = false;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('flappy_best_score', highScore.toString());
      isNewBest = true;
    }

    // Determine Medal
    let medal = '🏅';
    let medalDesc = 'Keep Practicing!';
    if (score >= 60) {
      medal = '💎';
      medalDesc = 'Platinum Master!';
    } else if (score >= 40) {
      medal = '🥇';
      medalDesc = 'Gold Legend!';
    } else if (score >= 25) {
      medal = '🥈';
      medalDesc = 'Silver Ace!';
    } else if (score >= 10) {
      medal = '🥉';
      medalDesc = 'Bronze Champ!';
    }

    if (isNewBest && score >= 10) {
      setTimeout(() => window.soundManager.playFanfare(), 400);
      medalDesc = `New Record! 🎉`;
    }

    // Populate Modal
    finalScoreEl.textContent = score;
    bestScoreEl.textContent = highScore;
    medalIconEl.textContent = medal;
    medalTextEl.textContent = medalDesc;

    // Show Game Over overlay after short delay
    setTimeout(() => {
      btnPause.classList.add('hidden');
      gameoverScreen.classList.remove('hidden');
    }, 500);
  }

  // UI Score Update
  function updateLiveScore() {
    liveScoreEl.textContent = score;
    liveScoreEl.classList.remove('bump');
    void liveScoreEl.offsetWidth; // trigger reflow
    liveScoreEl.classList.add('bump');
  }

  // Actions
  function startGame() {
    window.soundManager.init();
    currentState = STATES.PLAYING;
    score = 0;
    pipes = [];
    particles = [];
    scorePopups = [];
    bird.reset();
    bird.flap();
    pipeTimer = DIFFICULTY[currentDifficulty].spawnInterval - 10; // spawn first pipe soon

    updateLiveScore();
    liveScoreEl.style.display = 'block';
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    btnPause.classList.remove('hidden');
  }

  function pauseGame() {
    if (currentState === STATES.PLAYING) {
      currentState = STATES.PAUSED;
      pauseScreen.classList.remove('hidden');
    }
  }

  function resumeGame() {
    if (currentState === STATES.PAUSED) {
      currentState = STATES.PLAYING;
      pauseScreen.classList.add('hidden');
    }
  }

  function returnToMenu() {
    currentState = STATES.START;
    bird.reset();
    pipes = [];
    particles = [];
    scorePopups = [];
    liveScoreEl.style.display = 'none';
    gameoverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    btnPause.classList.add('hidden');
  }

  function handleFlapAction() {
    if (currentState === STATES.START) {
      startGame();
    } else if (currentState === STATES.PLAYING) {
      bird.flap();
    } else if (currentState === STATES.GAMEOVER && !gameoverScreen.classList.contains('hidden')) {
      // Ignore click inside canvas if modal is active
    }
  }

  // Main Game Loop (Delta-time based)
  function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const rawDelta = timestamp - lastTime;
    lastTime = timestamp;

    // Normalize dt to 60 FPS (1.0 = exactly 16.67ms)
    const dt = Math.min(rawDelta / (1000 / 60), 2.5);

    ctx.save();
    applyFX();

    // 1. Draw Background
    drawBackground(dt);

    // 2. Pipes
    if (currentState === STATES.PLAYING) {
      handlePipes(dt);
    }
    pipes.forEach(p => p.draw());

    // 3. Ground
    drawGround(dt);

    // 4. Bird
    bird.update(dt);
    bird.draw();

    // 5. Particles & Popups
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update(dt);
      particles[i].draw();
      if (particles[i].life >= particles[i].maxLife) {
        particles.splice(i, 1);
      }
    }

    for (let i = scorePopups.length - 1; i >= 0; i--) {
      scorePopups[i].update(dt);
      scorePopups[i].draw();
      if (scorePopups[i].life >= scorePopups[i].maxLife) {
        scorePopups.splice(i, 1);
      }
    }

    // 6. Flash Effect
    drawFlash();

    ctx.restore();

    requestAnimationFrame(gameLoop);
  }

  // Event Listeners
  // Controls: Keyboard
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      handleFlapAction();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      e.preventDefault();
      if (currentState === STATES.PLAYING) {
        pauseGame();
      } else if (currentState === STATES.PAUSED) {
        resumeGame();
      }
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      toggleMute();
    }
  });

  // Controls: Pointer / Touch
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleFlapAction();
  });

  // Buttons
  btnStart.addEventListener('click', () => {
    window.soundManager.playClick();
    startGame();
  });

  btnPlayAgain.addEventListener('click', () => {
    window.soundManager.playClick();
    startGame();
  });

  btnPause.addEventListener('click', (e) => {
    e.stopPropagation();
    window.soundManager.playClick();
    pauseGame();
  });

  btnResume.addEventListener('click', () => {
    window.soundManager.playClick();
    resumeGame();
  });

  btnRestartFromPause.addEventListener('click', () => {
    window.soundManager.playClick();
    startGame();
  });

  btnMenu.addEventListener('click', () => {
    window.soundManager.playClick();
    returnToMenu();
  });

  // Sound Toggle
  function toggleMute() {
    const isMuted = window.soundManager.toggleMute();
    soundIcon.textContent = isMuted ? '🔇' : '🔊';
  }
  btnSound.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMute();
  });
  if (window.soundManager.isMuted()) {
    soundIcon.textContent = '🔇';
  }

  // CRT Scanlines Toggle
  function updateScanlines() {
    if (scanlinesActive) {
      scanlinesEl.classList.add('active');
    } else {
      scanlinesEl.classList.remove('active');
    }
    localStorage.setItem('flappy_scanlines', scanlinesActive.toString());
  }
  btnScanlines.addEventListener('click', (e) => {
    e.stopPropagation();
    scanlinesActive = !scanlinesActive;
    updateScanlines();
  });
  updateScanlines();

  // Character Skin Selector
  document.querySelectorAll('.skin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.soundManager.playClick();
      document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSkin = btn.getAttribute('data-skin');
    });
  });

  // Difficulty Selector
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.soundManager.playClick();
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDifficulty = btn.getAttribute('data-diff');
    });
  });

  // Share Score Handler
  btnShare.addEventListener('click', async () => {
    window.soundManager.playClick();
    const shareText = `🐤 I just scored ${score} in Flappy Bird Arcade! Can you beat my high score? Play now: ${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Flappy Bird Retro Arcade',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        // user cancelled or failed, fallback to copy
        copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  });

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Score copied to clipboard!');
      }).catch(() => {
        showToast(`Score: ${score} points!`);
      });
    } else {
      showToast(`Score: ${score} points!`);
    }
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2400);
  }

  // Initial State
  liveScoreEl.style.display = 'none';
  requestAnimationFrame(gameLoop);

})();
