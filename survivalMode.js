// survivalMode.js
// ============================
// CHAOS KEYBOARD BATTLE - SURVIVAL MODE
// ============================

// Canvas setup (ensure the canvas exists in the DOM)
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Global game state variables
let paused = false;
let gameOverState = false;
let startTime = 0;
const enemyBullets = [];

// Player setup
const player = {
  x: canvas.width / 2 - 25,
  y: canvas.height - 100,
  width: 50,
  height: 50,
  speed: 5,
  baseSpeed: 5,
  health: 100,
  score: 0,
  bullets: [],
  shieldActive: false,
  dashCooldown: 0,
  lastShot: 0,
};

// Arrays for enemies and power-ups
const enemies = [];
const enemySpawnRate = 2000; // ms

const powerUps = [];
const powerUpLifetime = 10000; // ms

// Controls using lower-case keys
const keys = {};
document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Spawn an enemy with increasing difficulty
function spawnEnemy() {
  const enemy = {
    x: Math.random() * (canvas.width - 50),
    y: -50,
    width: 50,
    height: 50,
    speed: Math.random() * 2 + 1 + getWave() * 0.2,
    health: 30 + getWave() * 5,
    lastShot: Date.now()
  };
  enemies.push(enemy);
}

// Spawn a power-up with a lifetime counter
function spawnPowerUp() {
  const types = ["health", "shield", "speed", "bullet"];
  const type = types[Math.floor(Math.random() * types.length)];
  const powerUp = {
    x: Math.random() * (canvas.width - 30),
    y: Math.random() * (canvas.height - 30),
    width: 30,
    height: 30,
    type: type,
    lifetime: powerUpLifetime,
    spawnTime: Date.now()
  };
  powerUps.push(powerUp);
}

// Shoot a bullet from the player's position
function shootBullet() {
  player.bullets.push({
    x: player.x + player.width / 2 - 5,
    y: player.y,
    width: 10,
    height: 10,
    speed: 6
  });
}

// Dash functionality (increases speed temporarily)
function dash() {
  if (player.dashCooldown <= 0) {
    player.speed = player.baseSpeed * 3;
    player.dashCooldown = 2000; // cooldown in ms
    setTimeout(() => {
      player.speed = player.baseSpeed;
    }, 300); // dash lasts 300ms
  }
}

// Collision detection
function isColliding(obj1, obj2) {
  return obj1.x < obj2.x + obj2.width &&
         obj1.x + obj1.width > obj2.x &&
         obj1.y < obj2.y + obj2.height &&
         obj1.y + obj1.height > obj2.y;
}

// Get current wave based on elapsed time (increases every 30 seconds)
function getWave() {
  const elapsed = Date.now() - startTime;
  return Math.floor(elapsed / 30000) + 1;
}

// Update function: main game loop
function update() {
  // Update volume from slider (if available)
  const volumeSlider = document.getElementById("volumeSlider");
  const bgMusic = document.getElementById("bgMusic");
  if (volumeSlider && bgMusic) {
    bgMusic.volume = volumeSlider.value;
  }

  // Check for pause state
  if (paused) {
    requestAnimationFrame(update);
    return;
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update wave based on time
  const wave = getWave();

  // Player movement (W, A, S, D)
  if (keys["a"] && player.x > 0) player.x -= player.speed;
  if (keys["d"] && player.x + player.width < canvas.width) player.x += player.speed;
  if (keys["w"] && player.y > 0) player.y -= player.speed;
  if (keys["s"] && player.y + player.height < canvas.height) player.y += player.speed;

  // Shooting with SPACE (limit shooting rate)
  if (keys[" "] && Date.now() - player.lastShot > 300) {
    shootBullet();
    player.lastShot = Date.now();
  }

  // Shield activation with Q
  player.shieldActive = !!keys["q"];

  // Dash activation with E
  if (keys["e"]) dash();

  // Decrement dash cooldown
  if (player.dashCooldown > 0) {
    player.dashCooldown -= 16;
  }

  // Update player bullets
  player.bullets.forEach((bullet, index) => {
    bullet.y -= bullet.speed;
    if (bullet.y < 0) player.bullets.splice(index, 1);
  });

  // Update enemies and allow them to shoot
  enemies.forEach((enemy, eIndex) => {
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) {
      enemies.splice(eIndex, 1);
      return;
    }

    // Enemy shooting: shoot every 2000ms
    if (Date.now() - enemy.lastShot > 2000) {
      enemy.lastShot = Date.now();
      enemyBullets.push({
        x: enemy.x + enemy.width / 2 - 5,
        y: enemy.y + enemy.height,
        width: 10,
        height: 10,
        speed: 4
      });
    }

    // Check collision with player (if shield is not active)
    if (isColliding(player, enemy)) {
      if (!player.shieldActive) player.health -= 10;
      enemies.splice(eIndex, 1);
      return;
    }

    // Check collision with player's bullets
    player.bullets.forEach((bullet, bIndex) => {
      if (isColliding(bullet, enemy)) {
        enemy.health -= 20;
        player.bullets.splice(bIndex, 1);
        if (enemy.health <= 0) {
          player.score += 10;
          enemies.splice(eIndex, 1);
        }
      }
    });
  });

  // Update enemy bullets
  enemyBullets.forEach((bullet, index) => {
    bullet.y += bullet.speed;
    // Remove bullet if it goes off-screen
    if (bullet.y > canvas.height) {
      enemyBullets.splice(index, 1);
      return;
    }
    // Collision with player
    if (isColliding(bullet, player)) {
      if (!player.shieldActive) player.health -= 10;
      enemyBullets.splice(index, 1);
    }
  });

  // Update power-ups (reduce lifetime, remove if expired, and check collection)
  const currentTime = Date.now();
  powerUps.forEach((powerUp, index) => {
    const elapsed = currentTime - powerUp.spawnTime;
    powerUp.lifetime = Math.max(0, powerUpLifetime - elapsed);
    if (powerUp.lifetime <= 0) {
      powerUps.splice(index, 1);
      return;
    }
    if (isColliding(player, powerUp)) {
      if (powerUp.type === "health") player.health = Math.min(100, player.health + 20);
      if (powerUp.type === "shield") player.shieldActive = true;
      if (powerUp.type === "speed") player.speed += 2;
      if (powerUp.type === "bullet") {
        player.bullets.forEach(b => b.speed += 2);
      }
      powerUps.splice(index, 1);
    }
  });

  // Draw player
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, player.width, player.height);
  if (player.shieldActive) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw player bullets
  ctx.fillStyle = "red";
  player.bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  // Draw enemies
  ctx.fillStyle = "green";
  enemies.forEach(enemy => {
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });

  // Draw enemy bullets
  ctx.fillStyle = "orange";
  enemyBullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  // Draw power-ups with countdown timer (in seconds)
  powerUps.forEach(powerUp => {
    ctx.fillStyle = "yellow";
    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    const seconds = (powerUp.lifetime / 1000).toFixed(1);
    ctx.fillText(seconds + "s", powerUp.x + 2, powerUp.y + powerUp.height / 2);
  });

  // UI elements: Health, Score, Wave, and Timer
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Health: ${player.health}`, 10, 30);
  ctx.fillText(`Score: ${player.score}`, 10, 60);
  ctx.fillText(`Wave: ${wave}`, 10, 90);
  const timerSeconds = Math.floor((Date.now() - startTime) / 1000);
  ctx.fillText(`Time: ${timerSeconds}s`, 10, 120);

  // Game Over condition
  if (player.health <= 0) {
    gameOver();
    return;
  }

  requestAnimationFrame(update);
}

// Game Over: show overlay and stop game loop
function gameOver() {
  ctx.fillStyle = "red";
  ctx.font = "40px Arial";
  ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
  // Show Game Over overlay if available
  const gameOverScreen = document.getElementById("gameOverScreen");
  if (gameOverScreen) {
    gameOverScreen.classList.remove("hidden");
  }
  gameOverState = true;
}

// Initialize game: start timers and the game loop.
function initGame() {
  // Start enemy and power-up timers
  setInterval(spawnEnemy, enemySpawnRate);
  setInterval(spawnPowerUp, 10000);
  // Start the game loop
  update();
}

// Called when Survival Mode starts
function survivalStartGame() {
  console.log("Survival mode starting...");
  // Reset player values
  player.x = canvas.width / 2 - 25;
  player.y = canvas.height - 100;
  player.health = 100;
  player.score = 0;
  player.bullets = [];
  player.shieldActive = false;
  player.speed = player.baseSpeed;
  player.lastShot = 0;
  player.dashCooldown = 0;
  // Clear enemies, enemy bullets, power-ups and reset timer
  enemies.length = 0;
  enemyBullets.length = 0;
  powerUps.length = 0;
  gameOverState = false;
  startTime = Date.now();
  // Hide Player 2 controls (solo mode)
  const controls = document.getElementById("playerControls");
  if (controls && controls.children.length > 1) {
    controls.children[1].style.display = "none";
    controls.style.justifyContent = "center";
  }
  
  // Start the game loop and timers
  initGame();
}

// Pause functionality (can be triggered externally via a pause button)
function togglePause() {
  paused = !paused;
  // Optionally, display or hide a pause overlay here
}
