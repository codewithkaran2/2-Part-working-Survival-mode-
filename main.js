// main.js

// Utility function to load a script dynamically with error handling.
function loadScript(url, callback) {
  const script = document.createElement("script");
  script.src = url;
  script.defer = true;
  script.onload = () => callback();
  script.onerror = () => {
    console.error(`Failed to load script: ${url}`);
  };
  document.body.appendChild(script);
}

// Global variable to store the selected game mode. Default is "duo".
let gameMode = "duo";

// Cache DOM elements for reuse.
const nameContainer = document.getElementById("nameContainer");
const playerControls = document.getElementById("playerControls");
const startButton = document.getElementById("startButton");

// Function to add the pulsing animation to the start button.
function animateStartButton() {
  if (startButton) {
    startButton.classList.add("animate-button");
  }
}

// Functions to select game mode:
function selectDuoMode() {
  gameMode = "duo";
  // Show name entry and Player 2 controls.
  if (nameContainer) {
    nameContainer.style.display = "block";
  }
  if (playerControls && playerControls.children.length > 1) {
    playerControls.children[1].style.display = "block"; // Show Player 2 controls.
  }
  animateStartButton();
}

function selectSurvivalMode() {
  gameMode = "survival";
  // Show name entry and hide Player 2 controls (solo mode).
  if (nameContainer) {
    nameContainer.style.display = "block";
  }
  if (playerControls && playerControls.children.length > 1) {
    playerControls.children[1].style.display = "none";
  }
  animateStartButton();
}

// Start game function that loads the appropriate script based on the selected game mode.
function startGame() {
  animateStartButton();

  if (gameMode === "duo") {
    loadScript("duoMode.js", () => {
      if (typeof duoStartGame === "function") {
        duoStartGame();
      } else {
        console.error("Function duoStartGame not found.");
      }
    });
  } else if (gameMode === "survival") {
    loadScript("survivalMode.js", () => {
      if (typeof survivalStartGame === "function") {
        survivalStartGame();
      } else {
        console.error("Function survivalStartGame not found.");
      }
    });
  } else {
    console.error("Unknown game mode: " + gameMode);
  }
}

// Expose functions globally for HTML to access.
window.startGame = startGame;
window.selectDuoMode = selectDuoMode;
window.selectSurvivalMode = selectSurvivalMode;
