function createVoiceControlledGame(containerId) {
  // Create main container if it doesn't exist
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }

  // Add required styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    body {
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #0a0a0a;
      font-family: Arial, sans-serif;
      color: #fff;
      overflow: hidden;
    }

    #${containerId} {
      position: relative;
      width: 100vw;
      height: 100vh;
    }

    .game-controls {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .direction-hint {
      position: absolute;
      padding: 15px 30px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 25px;
      transition: all 0.3s ease;
      font-size: 1.2em;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
    }

    .direction-hint.up { top: 40px; left: 50%; transform: translateX(-50%); }
    .direction-hint.down { bottom: 40px; left: 50%; transform: translateX(-50%); }
    .direction-hint.left { left: 40px; top: 50%; transform: translateY(-50%); }
    .direction-hint.right { right: 40px; top: 50%; transform: translateY(-50%); }

    .game-status {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      padding: 15px 30px;
      border-radius: 15px;
      z-index: 100;
      font-size: 1.2em;
    }

    .speed-control {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      padding: 15px;
      border-radius: 15px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    input[type="range"] {
      width: 200px;
    }
  `;
  document.head.appendChild(styleSheet);

  // Create game elements
  const status = document.createElement('div');
  status.className = 'game-status';
  status.textContent = 'Click to Start';
  container.appendChild(status);

  const controls = document.createElement('div');
  controls.className = 'game-controls';
  container.appendChild(controls);

  // Create direction hints
  const directions = ['up', 'down', 'left', 'right'];
  directions.forEach(dir => {
    const hint = document.createElement('div');
    hint.className = `direction-hint ${dir}`;
    hint.textContent = `Say "${dir.toUpperCase()}"`;
    controls.appendChild(hint);
  });

  // Create speed controls
  const speedControl = document.createElement('div');
  speedControl.className = 'speed-control';
  
  const enemySpeedLabel = document.createElement('label');
  enemySpeedLabel.textContent = 'Enemy Speed';
  enemySpeedLabel.htmlFor = 'enemySpeedControl';
  
  const enemySpeedInput = document.createElement('input');
  enemySpeedInput.type = 'range';
  enemySpeedInput.id = 'enemySpeedControl';
  enemySpeedInput.min = '0.5';
  enemySpeedInput.max = '3';
  enemySpeedInput.step = '0.1';
  enemySpeedInput.value = '1';

  const spawnRateLabel = document.createElement('label');
  spawnRateLabel.textContent = 'Spawn Rate';
  spawnRateLabel.htmlFor = 'spawnRateControl';
  
  const spawnRateInput = document.createElement('input');
  spawnRateInput.type = 'range';
  spawnRateInput.id = 'spawnRateControl';
  spawnRateInput.min = '500';
  spawnRateInput.max = '3000';
  spawnRateInput.step = '100';
  spawnRateInput.value = '2000';

  speedControl.appendChild(enemySpeedLabel);
  speedControl.appendChild(enemySpeedInput);
  speedControl.appendChild(spawnRateLabel);
  speedControl.appendChild(spawnRateInput);
  container.appendChild(speedControl);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'gameCanvas';
  container.appendChild(canvas);

  // Load p5.js
  const p5Script = document.createElement('script');
  p5Script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.4.1/p5.js';
  p5Script.onload = initializeGame;
  document.head.appendChild(p5Script);

  function initializeGame() {
    // Game variables and classes (same as original)
    let playerSize = 60;
    let score = 0;
    let gameOver = false;
    let enemySpeed = 1;
    let spawnRate = 2000;
    let recognition;
    let lastCommand = "";
    let bullets = [];
    let enemies = [];
    let gameStarted = false;
    let spawnInterval;

    // Game classes
    class Enemy {
      constructor(direction, distance) {
        this.direction = direction;
        this.size = playerSize * 0.5;
        this.x = direction === "LEFT" ? -distance : direction === "RIGHT" ? distance : 0;
        this.y = direction === "UP" ? -distance : direction === "DOWN" ? distance : 0;
      }

      update() {
        switch(this.direction) {
          case "UP": this.y += enemySpeed; break;
          case "DOWN": this.y -= enemySpeed; break;
          case "LEFT": this.x += enemySpeed; break;
          case "RIGHT": this.x -= enemySpeed; break;
        }
        
        if (dist(this.x, this.y, 0, 0) < playerSize/2) {
          gameOver = true;
          if (recognition) recognition.stop();
          updateStatus('Game Over! Click to restart');
        }
      }

      display() {
        fill(255, 0, 0);
        circle(this.x, this.y, this.size);
      }
    }

    class Bullet {
      constructor(direction) {
        this.direction = direction;
        this.x = 0;
        this.y = 0;
        this.size = playerSize * 0.2;
        this.speed = 10;
        this.spent = false;
      }

      update() {
        if (this.spent) return;
        
        switch(this.direction) {
          case "UP": this.y -= this.speed; break;
          case "DOWN": this.y += this.speed; break;
          case "LEFT": this.x -= this.speed; break;
          case "RIGHT": this.x += this.speed; break;
        }
        
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (dist(this.x, this.y, enemies[i].x, enemies[i].y) < enemies[i].size) {
            enemies.splice(i, 1);
            this.spent = true;
            score++;
            break;
          }
        }
      }

      display() {
        if (!this.spent) {
          fill(255, 255, 0);
          circle(this.x, this.y, this.size);
        }
      }
    }

    // Game functions
    function updateStatus(message) {
      status.textContent = message;
    }

    function highlightDirection(direction) {
      const element = document.querySelector(`.direction-hint.${direction}`);
      if (element) {
        element.style.background = 'rgba(255, 255, 255, 0.3)';
        setTimeout(() => {
          element.style.background = 'rgba(255, 255, 255, 0.1)';
        }, 200);
      }
    }

    function setupVoiceRecognition() {
      try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
          updateStatus('Voice Recognition Active - Speak a direction!');
        };

        recognition.onresult = (event) => {
          const results = event.results[event.results.length - 1];
          for (let i = 0; i < results.length; i++) {
            const command = results[i].transcript.toLowerCase().trim();
            if (directions.includes(command)) {
              lastCommand = `Last heard: ${command}`;
              fireBullet(command.toUpperCase());
              highlightDirection(command);
              break;
            }
          }
        };

        recognition.onerror = (event) => {
          updateStatus('Error: ' + event.error);
          setTimeout(() => {
            if (!gameOver && gameStarted) recognition.start();
          }, 1000);
        };

        recognition.onend = () => {
          if (!gameOver && gameStarted) recognition.start();
        };

        recognition.start();
      } catch (e) {
        updateStatus('Error: Speech recognition not supported in this browser');
      }
    }

    function startGame() {
      gameStarted = true;
      setupVoiceRecognition();
      startSpawning();
      updateStatus('Game Started - Voice Recognition Active!');
    }

    function spawnEnemy() {
      if (!gameOver && gameStarted) {
        let direction = directions[floor(random(directions.length))].toUpperCase();
        let distance = min(width, height) / 2;
        enemies.push(new Enemy(direction, distance));
      }
    }

    function startSpawning() {
      if (spawnInterval) clearInterval(spawnInterval);
      spawnInterval = setInterval(spawnEnemy, spawnRate);
    }

    function fireBullet(direction) {
      bullets.push(new Bullet(direction));
    }

    function resetGame() {
      score = 0;
      gameOver = false;
      enemies = [];
      bullets = [];
      enemySpeed = parseFloat(enemySpeedInput.value);
      startSpawning();
      if (recognition) recognition.start();
      updateStatus('Game Reset - Voice Recognition Active!');
    }

    // p5.js setup and draw functions
    window.setup = () => {
      const canvas = createCanvas(windowWidth, windowHeight);
      canvas.parent(containerId);
      frameRate(60);
      playerSize = min(width, height) / 10;

      canvas.mousePressed(() => {
        if (!gameStarted) {
          startGame();
        } else if (gameOver) {
          resetGame();
        }
      });

      // Setup controls
      enemySpeedInput.addEventListener('input', function(e) {
        enemySpeed = parseFloat(e.target.value);
      });

      spawnRateInput.addEventListener('input', function(e) {
        spawnRate = parseInt(e.target.value);
        startSpawning();
      });
    };

    window.draw = () => {
      background(10, 10, 15);
      
      if (!gameStarted) {
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(32);
        text('Click to Start', width/2, height/2);
        return;
      }

      push();
      translate(width/2, height/2);
      
      fill(255);
      circle(0, 0, playerSize);
      
      if (!gameOver) {
        for (let bullet of bullets) {
          bullet.update();
          bullet.display();
        }
        
        for (let enemy of enemies) {
          enemy.update();
          enemy.display();
        }
        
        fill(255);
        textAlign(LEFT);
        textSize(24);
        text(`Score: ${score}`, -width/2 + 20, -height/2 + 40);
      } else {
        fill(255);
        textAlign(CENTER);
        textSize(48);
        text('Game Over!', 0, 0);
        textSize(24);
        text(`Final Score: ${score}`, 0, 50);
        text('Click to Restart', 0, 100);
      }
      
      pop();
    };

    window.windowResized = () => {
      resizeCanvas(windowWidth, windowHeight);
      playerSize = min(width, height) / 10;
    };
  }
}
