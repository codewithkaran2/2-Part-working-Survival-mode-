// duoMode.js

/*************************************
 * Prevent Default Behavior for Arrow Keys
 *************************************/
document.addEventListener('keydown', function (e) {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
    e.preventDefault();
  }
});

/*************************************
 * MODE SELECTION & INITIAL SETTINGS
 *************************************/
const duoBtn = document.getElementById("duoButton");
duoBtn.addEventListener("click", () => {
  duoBtn.style.border = "3px solid white";
  const p2NameInput = document.getElementById("p2Name");
  p2NameInput.disabled = false;
  p2NameInput.placeholder = "Enter 🟥 Player 2 Name";
  p2NameInput.value = "";
});

/*************************************
 * HELPER FUNCTIONS
 *************************************/
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

/*************************************
 * CANVAS, CONTEXT, & GLOBAL GAME STATE
 *************************************/
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const defaultP1Name = "Player 1";
const defaultP2Name = "Player 2";
let p1Name = defaultP1Name;
let p2Name = defaultP2Name;
let p1Score = 0, p2Score = 0;
const baseSpeed = 7;
let gameRunning = false;
let gamePaused = false;

// Arrays for game objects
let bullets = [];
let powerUps = [];
let traps = [];
let explosions = [];
let powerUpInterval, trapInterval;

/*************************************
 * AUDIO SETUP & VOLUME CONTROL
 *************************************/
const bgMusic = document.getElementById("bgMusic");
const shootSound = document.getElementById("shootSound");
const hitSound = document.getElementById("hitSound");
const shieldBreakSound = document.getElementById("shieldBreakSound");
const volumeSlider = document.getElementById("volumeSlider");
volumeSlider.addEventListener("input", function () {
  const vol = parseFloat(this.value);
  bgMusic.volume = vol;
  shootSound.volume = vol;
  hitSound.volume = vol;
  shieldBreakSound.volume = vol;
});

function startBackgroundMusic() {
  bgMusic.play();
}

/*************************************
 * PLAYER DEFINITIONS (DUO MODE)
 *************************************/
const player1 = {
  x: 100,
  y: 0,
  width: 60,
  height: 60,
  color: "blue",
  health: 100,
  shield: 100,
  isShieldActive: false,
  canShoot: true,
  lastDir: "right",
  canDash: true,
  explosiveActive: false,
  speedBoostActive: false,
  isDashing: false
};

const player2 = {
  x: 600,
  y: 0,
  width: 60,
  height: 60,
  color: "red",
  health: 100,
  shield: 100,
  isShieldActive: false,
  canShoot: true,
  lastDir: "left",
  canDash: true,
  explosiveActive: false,
  speedBoostActive: false,
  isDashing: false
};

/*************************************
 * CONTROLS & KEY EVENTS
 *************************************/
const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false,
  p: false
};

function updateDirection() {
  if (keys.w) player1.lastDir = "up";
  else if (keys.s) player1.lastDir = "down";
  else if (keys.a) player1.lastDir = "left";
  else if (keys.d) player1.lastDir = "right";
  
  if (keys.ArrowUp) player2.lastDir = "up";
  else if (keys.ArrowDown) player2.lastDir = "down";
  else if (keys.ArrowLeft) player2.lastDir = "left";
  else if (keys.ArrowRight) player2.lastDir = "right";
}

// Dash settings
const dashDistance = 100;
const dashCooldown = 2000; // ms
const dashDuration = 200;  // ms

function dash(player) {
  let dx = 0, dy = 0;
  switch (player.lastDir) {
    case "up":    dy = -dashDistance; break;
    case "down":  dy = dashDistance; break;
    case "left":  dx = -dashDistance; break;
    case "right": dx = dashDistance; break;
    default: break;
  }
  // Clamp to canvas bounds and avoid UI area (y must be ≥ 140)
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x + dx));
  player.y = Math.max(140, Math.min(canvas.height - player.height, player.y + dy));
  player.canDash = false;
  player.isDashing = true;
  
  setTimeout(() => { 
    player.isDashing = false;
  }, dashDuration);
  
  setTimeout(() => { 
    player.canDash = true;
  }, dashCooldown);
}

function activateShield(player) {
  player.isShieldActive = true;
  setTimeout(() => {
    player.isShieldActive = false;
  }, 3000);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "CapsLock") { e.preventDefault(); return; }
  
  // DASH CONTROLS
  if (e.key.toLowerCase() === "e") {
    if (gameRunning && !gamePaused && player1.canDash) {
      dash(player1);
    }
    return;
  }
  if (e.key.toLowerCase() === "o") {
    if (gameRunning && !gamePaused && player2.canDash) {
      dash(player2);
    }
    return;
  }
  
  // SHOOTING CONTROLS
  if (e.code === "Space") {
    if (player1.canShoot && gameRunning && !gamePaused) {
      shootBullet(player1, 1);
      player1.canShoot = false;
    }
    return;
  }
  if (e.code === "Enter") {
    if (player2.canShoot && gameRunning && !gamePaused) {
      shootBullet(player2, 2);
      player2.canShoot = false;
    }
    return;
  }
  
  // SHIELD CONTROLS
  if (e.key.toLowerCase() === "q") {
    if (!player1.isShieldActive && player1.shield > 0 && gameRunning && !gamePaused) {
      activateShield(player1);
    }
    return;
  }
  if (e.key.toLowerCase() === "m") {
    if (!player2.isShieldActive && player2.shield > 0 && gameRunning && !gamePaused) {
      activateShield(player2);
    }
    return;
  }
  
  // Update movement keys
  if (keys.hasOwnProperty(e.key)) {
    if (e.key === "p") { togglePause(); return; }
    keys[e.key] = true;
    updateDirection();
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === "CapsLock") { e.preventDefault(); return; }
  
  if (e.code === "Space") {
    player1.canShoot = true;
    return;
  }
  if (e.code === "Enter") {
    player2.canShoot = true;
    return;
  }
  
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;
    updateDirection();
  }
});

/*************************************
 * COLLISION FUNCTIONS
 *************************************/
function rectCollision(rect1, rect2) {
  const margin = 5;
  return rect1.x < rect2.x + rect2.width + margin &&
         rect1.x + rect1.width > rect2.x - margin &&
         rect1.y < rect2.y + rect2.height + margin &&
         rect1.y + rect1.height > rect2.y - margin;
}

function rectCollisionGeneric(a, b) {
  const r1 = {
    x: a.x,
    y: a.y,
    width: a.width || a.size,
    height: a.height || a.size
  };
  const r2 = {
    x: b.x,
    y: b.y,
    width: b.width || b.size,
    height: b.height || b.size
  };
  return r1.x < r2.x + r2.width &&
         r1.x + r1.width > r2.x &&
         r1.y < r2.y + r2.height &&
         r1.y + r1.height > r2.y;
}

/*************************************
 * BULLET HANDLING
 *************************************/
function shootBullet(player, playerNum) {
  const bullet = {
    x: player.x + player.width / 2,
    y: player.y + player.height / 2,
    speed: 10,
    direction: player.lastDir,
    player: playerNum,
    type: player.explosiveActive ? "explosive" : "normal"
  };
  bullets.push(bullet);
  shootSound.currentTime = 0;
  shootSound.play();
}

function bulletHitsPlayer(bullet, player) {
  return bullet.x >= player.x &&
         bullet.x <= player.x + player.width &&
         bullet.y >= player.y &&
         bullet.y <= player.y + player.height;
}

/*************************************
 * POWER-UP FUNCTIONS
 *************************************/
function spawnPowerUp() {
  const types = ["health", "shield", "speed", "explosive"];
  const type = types[Math.floor(Math.random() * types.length)];
  const size = 30;
  const x = Math.random() * (canvas.width - size);
  const y = Math.random() * (canvas.height - size - 150) + 150; // avoid top UI area
  const duration = 5000; // 5 seconds lifetime
  const expireTime = Date.now() + duration;
  powerUps.push({ x, y, size, type, expireTime });
}

function getPowerUpText(type) {
  switch (type) {
    case "health": return "Health +20";
    case "shield": return "Shield +20";
    case "speed": return "Speed Boost";
    case "explosive": return "Double Damage";
    default: return "";
  }
}

function drawPowerUps() {
  powerUps.forEach((p) => {
    let color;
    switch (p.type) {
      case "health": color = "green"; break;
      case "shield": color = "cyan"; break;
      case "speed": color = "orange"; break;
      case "explosive": color = "purple"; break;
      default: color = "white"; break;
    }
    ctx.fillStyle = color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    
    // Draw power-up text with countdown
    const remaining = Math.ceil((p.expireTime - Date.now()) / 1000);
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`${getPowerUpText(p.type)} (${remaining}s)`, p.x + p.size / 2, p.y + p.size / 2 + 6);
  });
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    let p = powerUps[i];
    if (Date.now() > p.expireTime) {
      powerUps.splice(i, 1);
      continue;
    }
    if (rectCollisionGeneric(p, player1)) {
      applyPowerUp(player1, p.type);
      powerUps.splice(i, 1);
      continue;
    }
    if (rectCollisionGeneric(p, player2)) {
      applyPowerUp(player2, p.type);
      powerUps.splice(i, 1);
      continue;
    }
  }
}

function applyPowerUp(player, type) {
  switch (type) {
    case "health":
      player.health = Math.min(100, player.health + 20);
      break;
    case "shield":
      player.shield = Math.min(100, player.shield + 20);
      break;
    case "speed":
      player.speedBoostActive = true;
      setTimeout(() => { player.speedBoostActive = false; }, 5000);
      break;
    case "explosive":
      player.explosiveActive = true;
      setTimeout(() => { player.explosiveActive = false; }, 5000);
      break;
    default:
      break;
  }
}

/*************************************
 * TRAP/Hazard Functions
 *************************************/
function spawnTrap() {
  const trapWidth = 50;
  const trapHeight = 50;
  const x = Math.random() * (canvas.width - trapWidth);
  const y = Math.random() * (canvas.height - trapHeight - 150) + 150;
  traps.push({
    x, y, width: trapWidth, height: trapHeight,
    damage: 5, duration: 10000, spawnTime: Date.now()
  });
}

function drawTraps() {
  traps.forEach((trap) => {
    ctx.fillStyle = "darkred";
    ctx.fillRect(trap.x, trap.y, trap.width, trap.height);
  });
}

function updateTraps() {
  const now = Date.now();
  for (let i = traps.length - 1; i >= 0; i--) {
    if (now - traps[i].spawnTime > traps[i].duration) {
      traps.splice(i, 1);
      continue;
    }
    if (rectCollision(traps[i], player1)) {
      player1.health = Math.max(0, player1.health - traps[i].damage);
      triggerDamageEffect(1);
      traps.splice(i, 1);
      continue;
    }
    if (rectCollision(traps[i], player2)) {
      player2.health = Math.max(0, player2.health - traps[i].damage);
      triggerDamageEffect(2);
      traps.splice(i, 1);
      continue;
    }
  }
}

/*************************************
 * EXPLOSION ANIMATIONS
 *************************************/
function createExplosion(x, y) {
  explosions.push({
    x, y, radius: 10, maxRadius: 50,
    alpha: 1, expansionRate: 2, fadeRate: 0.05
  });
}

function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    let exp = explosions[i];
    exp.radius += exp.expansionRate;
    exp.alpha -= exp.fadeRate;
    if (exp.alpha <= 0) {
      explosions.splice(i, 1);
      continue;
    }
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 165, 0, ${exp.alpha})`;
    ctx.fill();
  }
}

/*************************************
 * UI DRAWING FUNCTIONS
 *************************************/
function drawBar(x, y, width, height, value, gradientStops) {
  drawRoundedRect(ctx, x, y, width, height, 10);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();
  
  const grad = ctx.createLinearGradient(x, y, x + width, y);
  gradientStops.forEach(stop => {
    grad.addColorStop(stop.offset, stop.color);
  });
  
  ctx.fillStyle = grad;
  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, 10);
  ctx.clip();
  ctx.fillRect(x, y, (value / 100) * width, height);
  ctx.restore();
}

function drawTopStatus() {
  ctx.clearRect(0, 0, canvas.width, 140);
  
  const barWidth = 200, barHeight = 30, gap = 5;
  const leftX = 20, topY = 20;
  
  // Player 1 Health
  drawBar(leftX, topY, barWidth, barHeight, player1.health, [
    { offset: 0, color: "#ff4d4d" },
    { offset: 1, color: "#b30000" }
  ]);
  ctx.font = "bold 20px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "white";
  ctx.fillText("Health: " + player1.health + "%", leftX + barWidth / 2, topY + barHeight / 2);
  
  // Player 1 Shield
  const shieldBarY = topY + barHeight + gap;
  drawBar(leftX, shieldBarY, barWidth, barHeight, player1.shield, [
    { offset: 0, color: "#66ccff" },
    { offset: 1, color: "#0066cc" }
  ]);
  ctx.fillText("Shield: " + player1.shield + "%", leftX + barWidth / 2, shieldBarY + barHeight / 2);
  
  // Player 2 Health & Shield
  const rightX = canvas.width - barWidth - 20, topY2 = 20;
  drawBar(rightX, topY2, barWidth, barHeight, player2.health, [
    { offset: 0, color: "#ff4d4d" },
    { offset: 1, color: "#b30000" }
  ]);
  ctx.fillText("Health: " + player2.health + "%", rightX + barWidth / 2, topY2 + barHeight / 2);
  
  const shieldBarY2 = topY2 + barHeight + gap;
  drawBar(rightX, shieldBarY2, barWidth, barHeight, player2.shield, [
    { offset: 0, color: "#66ccff" },
    { offset: 1, color: "#0066cc" }
  ]);
  ctx.fillText("Shield: " + player2.shield + "%", rightX + barWidth / 2, shieldBarY2 + barHeight / 2);
  
  const namesY = shieldBarY2 + barHeight + 25;
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "blue";
  ctx.fillText("🟦 " + p1Name, leftX + barWidth / 2, namesY);
  ctx.fillStyle = "red";
  ctx.fillText("🟥 " + p2Name, rightX + barWidth / 2, namesY);
  ctx.textAlign = "left";
}

/*************************************
 * DRAWING PLAYERS & EFFECTS
 *************************************/
function drawPlayers() {
  // Player 1 dash glow
  if (player1.isDashing) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "cyan";
    ctx.fillRect(player1.x - 5, player1.y - 5, player1.width + 10, player1.height + 10);
    ctx.restore();
  }
  ctx.fillStyle = player1.color;
  ctx.fillRect(player1.x, player1.y, player1.width, player1.height);
  if (player1.isShieldActive) {
    ctx.beginPath();
    ctx.arc(player1.x + player1.width / 2, player1.y + player1.height / 2, player1.width, 0, Math.PI * 2);
    ctx.strokeStyle = "#66ccff";
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  
  // Player 2 dash glow
  if (player2.isDashing) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "yellow";
    ctx.fillRect(player2.x - 5, player2.y - 5, player2.width + 10, player2.height + 10);
    ctx.restore();
  }
  ctx.fillStyle = player2.color;
  ctx.fillRect(player2.x, player2.y, player2.width, player2.height);
  if (player2.isShieldActive) {
    ctx.beginPath();
    ctx.arc(player2.x + player2.width / 2, player2.y + player2.height / 2, player2.width, 0, Math.PI * 2);
    ctx.strokeStyle = "#66ccff";
    ctx.lineWidth = 5;
    ctx.stroke();
  }
}

/*************************************
 * DROP ANIMATION BEFORE GAME START
 *************************************/
function dropAnimation(callback) {
  const dropSpeed = 5; 
  const destinationY = canvas.height - player1.height - 50;
  
  function animate() {
    let done = true;
    if (player1.y < destinationY) {
      player1.y += dropSpeed;
      if (player1.y > destinationY) player1.y = destinationY;
      done = false;
    }
    if (player2.y < destinationY) {
      player2.y += dropSpeed;
      if (player2.y > destinationY) player2.y = destinationY;
      done = false;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayers();
    drawTopStatus();
    if (!done) {
      requestAnimationFrame(animate);
    } else {
      player1.x = 50;
      player2.x = canvas.width - player2.width - 50;
      document.getElementById("instructionScreen").classList.remove("hidden");
      document.getElementById("p1Instruction").innerText = p1Name;
      document.getElementById("p2Instruction").innerText = p2Name;
      setTimeout(() => {
        document.getElementById("instructionScreen").classList.add("hidden");
        callback();
      }, 2000);
    }
  }
  animate();
}

function checkWinCondition() {
  if (player1.health <= 0) return p2Name;
  if (player2.health <= 0) return p1Name;
  return null;
}

/*************************************
 * MAIN GAME LOOP
 *************************************/
function gameLoop() {
  if (!gameRunning || gamePaused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Process Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    switch (bullet.direction) {
      case "up":    bullet.y -= bullet.speed; break;
      case "down":  bullet.y += bullet.speed; break;
      case "left":  bullet.x -= bullet.speed; break;
      case "right": bullet.x += bullet.speed; break;
    }
    if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
      bullets.splice(i, 1);
      continue;
    }
    // Check collision with Player 1
    if (bullet.player !== 1 && bulletHitsPlayer(bullet, player1)) {
      if (player1.isShieldActive && player1.shield > 0) {
        player1.shield = Math.max(0, player1.shield - 10);
        if (player1.shield === 0) {
          shieldBreakSound.currentTime = 0;
          shieldBreakSound.play();
          player1.isShieldActive = false;
        }
      } else {
        const damage = bullet.type === "explosive" ? 20 : 10;
        player1.health = Math.max(0, player1.health - damage);
        hitSound.currentTime = 0;
        hitSound.play();
        triggerDamageEffect(1);
        if (bullet.type === "explosive") {
          createExplosion(bullet.x, bullet.y);
        }
      }
      bullets.splice(i, 1);
      continue;
    }
    // Check collision with Player 2
    if (bullet.player !== 2 && bulletHitsPlayer(bullet, player2)) {
      if (player2.isShieldActive && player2.shield > 0) {
        player2.shield = Math.max(0, player2.shield - 10);
        if (player2.shield === 0) {
          shieldBreakSound.currentTime = 0;
          shieldBreakSound.play();
          player2.isShieldActive = false;
        }
      } else {
        const damage = bullet.type === "explosive" ? 20 : 10;
        player2.health = Math.max(0, player2.health - damage);
        hitSound.currentTime = 0;
        hitSound.play();
        triggerDamageEffect(2);
        if (bullet.type === "explosive") {
          createExplosion(bullet.x, bullet.y);
        }
      }
      bullets.splice(i, 1);
      continue;
    }
    // Draw bullet
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Update power-ups, traps, and explosions
  updatePowerUps();
  updateTraps();
  updateExplosions();
  
  // Update player movement with speed boost if active
  function movePlayers() {
    const oldP1 = { x: player1.x, y: player1.y };
    const oldP2 = { x: player2.x, y: player2.y };
    
    const p1Speed = player1.speedBoostActive ? baseSpeed * 1.5 : baseSpeed;
    const p2Speed = player2.speedBoostActive ? baseSpeed * 1.5 : baseSpeed;
    
    let dx1 = 0, dy1 = 0;
    if (keys.a && player1.x > 0) dx1 = -p1Speed;
    if (keys.d && player1.x + player1.width < canvas.width) dx1 = p1Speed;
    if (keys.w && player1.y > 140) dy1 = -p1Speed;
    if (keys.s && player1.y + player1.height < canvas.height) dy1 = p1Speed;
    
    let dx2 = 0, dy2 = 0;
    if (keys.ArrowLeft && player2.x > 0) dx2 = -p2Speed;
    if (keys.ArrowRight && player2.x + player2.width < canvas.width) dx2 = p2Speed;
    if (keys.ArrowUp && player2.y > 140) dy2 = -p2Speed;
    if (keys.ArrowDown && player2.y + player2.height < canvas.height) dy2 = p2Speed;
    
    player1.x += dx1;
    player2.x += dx2;
    if (rectCollision(player1, player2)) {
      player1.x = oldP1.x;
      player2.x = oldP2.x;
    }
    
    player1.y += dy1;
    player2.y += dy2;
    player1.y = Math.max(player1.y, 140);
    player2.y = Math.max(player2.y, 140);
    if (rectCollision(player1, player2)) {
      player1.y = oldP1.y;
      player2.y = oldP2.y;
    }
    
    updateDirection();
  }
  movePlayers();
  
  drawTraps();
  drawPowerUps();
  drawPlayers();
  drawTopStatus();
  
  const winner = checkWinCondition();
  if (winner !== null) {
    gameRunning = false;
    clearInterval(powerUpInterval);
    clearInterval(trapInterval);
    document.getElementById("gameOverScreen").classList.remove("hidden");
    document.getElementById("winnerName").innerText = winner;
    return;
  }
  
  requestAnimationFrame(gameLoop);
}

/*************************************
 * GAME CONTROL FUNCTIONS
 *************************************/
function duoStartGame() {
  document.getElementById("startScreen").classList.add("hidden");
  const p1Input = document.getElementById("p1Name");
  if (p1Input.value.trim() !== "") p1Name = p1Input.value;
  const p2Input = document.getElementById("p2Name");
  if (p2Input.value.trim() !== "") p2Name = p2Input.value;
  
  gameRunning = true;
  startBackgroundMusic();
  
  // Reset players for drop animation
  player1.y = -player1.height;
  player2.y = -player2.height;
  
  dropAnimation(() => {
    powerUpInterval = setInterval(spawnPowerUp, 10000);
    trapInterval = setInterval(spawnTrap, 15000);
    gameLoop();
  });
}

function restartGame() {
  location.reload();
}

function playAgain() {
  document.getElementById("gameOverScreen").classList.add("hidden");
  gamePaused = false;
  gameRunning = true;
  player1.health = 100;
  player2.health = 100;
  player1.shield = 100;
  player2.shield = 100;
  bullets = [];
  powerUps = [];
  traps = [];
  explosions = [];
  player1.y = -player1.height;
  player2.y = -player2.height;
  
  dropAnimation(() => {
    powerUpInterval = setInterval(spawnPowerUp, 10000);
    trapInterval = setInterval(spawnTrap, 15000);
    gameLoop();
  });
}

function togglePause() {
  if (!gameRunning) return;
  gamePaused = !gamePaused;
  const pauseScreen = document.getElementById("pauseScreen");
  if (gamePaused) {
    pauseScreen.classList.remove("hidden");
  } else {
    pauseScreen.classList.add("hidden");
    gameLoop();
  }
}

// Expose game control functions globally.
window.duoStartGame = duoStartGame;
window.restartGame = restartGame;
window.togglePause = togglePause;
window.playAgain = playAgain;
