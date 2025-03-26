// survivalMode.js
// ============================
// CHAOS KEYBOARD BATTLE - SURVIVAL MODE
// ============================

// Get canvas and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game state variables
let paused = false;
let gameOverState = false;
let startTime = 0;
const enemyBullets = [];

// Player object for Survival Mode
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
  lastShot: 0
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
  if (Date.now() - player.lastShot > 300) {
    player.bullets.push({
      x: player.x + player.width / 2 - 5,
      y: player.y,
      width: 10,
      height: 10,
      speed: 6
    });
    player.lastShot = Date.now();
  }
}

// Dash functionality (temporary speed boost)
function dash() {
  if (player.dashCooldown <= 0) {
    player.speed = player.baseSpeed * 3;
    player.dashCooldown = 2000;
    setTimeout(() => {
      player.speed = player.baseSpeed;
    }, 300);
  }
}

// Collision detection
function isColliding(obj1, obj2) {
  return obj1.x < obj2.x + obj2.width &&
         obj1.x + obj1.width > obj2.x &&
         obj1.y < obj2.y + obj2.height &&
         obj1.y + obj1.height > obj2.y;
}

// Calculate the current wave based on elapsed time (wave increases every 30 seconds)
function getWave() {
  const elapsed = Date.now() - startTime;
  return Math.floor(elapsed / 30000) + 1;
}

// Main game loop
function update() {
  // Update background music volume if applicable
  const volumeSlider = document.getElementById("volumeSlider");
  const bgMusic = document.getElementById("bgMusic");
  if (volumeSlider && bgMusic) {
    bgMusic.volume = volumeSlider.value;
  }

  // If game is paused, continue to next frame without updating
  if (paused) {
    requestAnimationFrame(update);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Update player movement (W, A, S, D)
  if (keys["a"] && player.x > 0) player.x -= player.speed;
  if (keys["d"] && player.x + player.width < canvas.width) player.x += player.speed;
  if (keys["w"] && player.y > 0) player.y -= player.speed;
  if (keys["s"] && player.y + player.height < canvas.height) player.y += player.speed;

  // Shooting with SPACE
  if (keys[" "] ) {
    shootBullet();
  }

  // Activate shield with Q (if desired, add key handling for survival)
  player.shieldActive = !!keys["q"];
  // Dash with E
  if (keys["e"]) dash();
  if (player.dashCooldown > 0) player.dashCooldown -= 16;

  // Update bullets
  for (let i = player.bullets.length - 1; i >= 0; i--) {
    const bullet = player.bullets[i];
    bullet.y -= bullet.speed;
    if (bullet.y < 0) {
      player.bullets.splice(i, 1);
      continue;
    }
    // Check collision with enemies
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      if (isColliding(bullet, enemy)) {
        enemy.health -= 20;
        player.bullets.splice(i, 1);
        if (enemy.health <= 0) {
          player.score += 10;
          enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  // Update enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    enemy.y += enemy.speed;
    if (enemy.y > canvas.height) {
      enemies.splice(i, 1);
      continue;
    }
    // Collision with player
    if (isColliding(player, enemy)) {
      if (!player.shieldActive) {
        player.health -= 10;
      }
      enemies.splice(i, 1);
      continue;
    }
  }

  // Update power-ups
  const now = Date.now();
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];
    const elapsed = now - powerUp.spawnTime;
    powerUp.lifetime = Math.max(0, powerUpLifetime - elapsed);
    if (powerUp.lifetime <= 0) {
      powerUps.splice(i, 1);
      continue;
    }
    if (isColliding(player, powerUp)) {
      if (powerUp.type === "health") {
        player.health = Math.min(100, player.health + 20);
      }
      if (powerUp.type === "shield") {
        player.shieldActive = true;
      }
      if (powerUp.type === "speed") {
        player.speed += 2;
      }
      if (powerUp.type === "bullet") {
        player.bullets.forEach(b => b.speed += 2);
      }
      powerUps.splice(i, 1);
    }
  }

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

  // Draw bullets
  ctx.fillStyle = "red";
  player.bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });

  // Draw enemies
  ctx.fillStyle = "green";
  enemies.forEach(enemy => {
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });

  // Draw power-ups with countdown (in seconds)
  powerUps.forEach(powerUp => {
    ctx.fillStyle = "yellow";
    ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
    ctx.fillStyle = "black";
    ctx.font = "12px Arial";
    const seconds = (powerUp.lifetime / 1000).toFixed(1);
    ctx.fillText(seconds + "s", powerUp.x + 2, powerUp.y + powerUp.height / 2);
  });

  // Draw UI elements (Health, Score, Wave, Time)
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Health: ${player.health}`, 10, 30);
  ctx.fillText(`Score: ${player.score}`, 10, 60);
  ctx.fillText(`Wave: ${getWave()}`, 10, 90);
  const timerSeconds = Math.floor((Date.now() - startTime) / 1000);
  ctx.fillText(`Time: ${timerSeconds}s`, 10, 120);

  // Check for Game Over
  if (player.health <= 0) {
    gameOver();
    return;
  }

  requestAnimationFrame(update);
}

// Game Over: display overlay and stop game loop
function gameOver() {
  ctx.fillStyle = "red";
  ctx.font = "40px Arial";
  ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
  const gameOverScreen = document.getElementById("gameOverScreen");
  if (gameOverScreen) {
    gameOverScreen.classList.remove("hidden");
  }
  gameOverState = true;
}

// Initialize the game loop and spawn timers
function initGame() {
  setInterval(spawnEnemy, enemySpawnRate);
  setInterval(spawnPowerUp, 10000);
  update();
}

// Called when Survival Mode starts
function survivalStartGame() {
  console.log("Survival mode starting...");

  // Hide overlays that might block the game canvas
  const overlays = ["startScreen", "instructionScreen", "pauseScreen", "gameOverScreen"];
  overlays.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  // Ensure the canvas is visible
  canvas.style.display = "block";

  // Reset player and game variables
  player.x = canvas.width / 2 - 25;
  player.y = canvas.height - 100;
  player.health = 100;
  player.score = 0;
  player.bullets = [];
  player.shieldActive = false;
  player.speed = player.baseSpeed;
  player.lastShot = 0;
  player.dashCooldown = 0;

  enemies.length = 0;
  enemyBullets.length = 0;
  powerUps.length = 0;
  gameOverState = false;
  startTime = Date.now();

  // Start the game loop and spawn timers
  initGame();
}

// Expose survivalStartGame globally for index.html to call.
window.survivalStartGame = survivalStartGame;
