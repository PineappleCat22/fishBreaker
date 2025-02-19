//code author: EmoteFroggy
//check him out he's cool as fuck

const API_URL = 'https://leaderboard-backend-9a9q.onrender.com';

let playerData = null;

function getInitialStats() {
  return {
    name: null,
    catch: {
      luckyStreak: 0,
      dryStreak: 0,
      fish: 0,
      junk: 0,
      types: {},
    },
    trap: {
      active: false,
      start: 0,
      end: 0,
      duration: 0,
    },
    readyTimestamp: 0,
    coins: 10,
    lifetime: {
      fish: 0,
      coins: 0,
      sold: 0,
      baitUsed: 0,
      attempts: 0,
      dryStreak: 0,
      luckyStreak: 0,
      maxFishSize: 0,
      maxFishType: '',
      trap: { times: 0, timeSpent: 0, bestFishCatch: 0, cancelled: 0 },
    },
  };
}

function loadState() {
  const stored = localStorage.getItem('fishData');
  if (stored) {
    try {
      playerData = JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing saved state. Initializing new state.');
      playerData = getInitialStats();
      saveState();
    }
  } else {
    playerData = getInitialStats();
    saveState();
  }
}

function saveState() {
  localStorage.setItem('fishData', JSON.stringify(playerData));
}

function updateUI() {
  const statsDiv = document.getElementById('stats');
  statsDiv.innerHTML = `
      <p>Coins: ${playerData.coins}</p>
      <p>Fish in collection: ${playerData.catch.fish || 0}</p>
      <p>Junk in collection: ${playerData.catch.junk || 0}</p>
      <p>Fishing attempts: ${playerData.lifetime.attempts}</p>
      <p>Max fish size: ${playerData.lifetime.maxFishSize} cm ${
    playerData.lifetime.maxFishType
      ? '(' + playerData.lifetime.maxFishType + ')'
      : ''
  }</p>
      <p>Trap active: ${playerData.trap.active ? 'Yes' : 'No'}</p>
    `;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

function formatTimeDelta(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes} min ${seconds} sec`;
  }
  return `${seconds} sec`;
}

function logMessage(message) {
    const logDiv = document.getElementById("log");
    const time = new Date().toLocaleTimeString();
    const msgEl = document.createElement("div");
    msgEl.className = "message";
    msgEl.innerHTML = `<div class="timestamp">[${time}]</div>
                       <div class="text">${message}</div>`;
    logDiv.appendChild(msgEl);
    while (logDiv.getElementsByClassName("message").length > 3) {
      logDiv.removeChild(logDiv.firstChild);
    }
    logDiv.scrollTop = logDiv.scrollHeight;
    
    const messages = Array.from(logDiv.getElementsByClassName("message")).map(el => el.outerHTML);
    localStorage.setItem("gameLog", JSON.stringify(messages));
  }

function loadLog() {
    const logDiv = document.getElementById("log");
    const cachedMessages = localStorage.getItem("gameLog");
    if (cachedMessages) {
      try {
        const messages = JSON.parse(cachedMessages);
        logDiv.innerHTML = "";
        messages.forEach((msgHTML) => {
          const temp = document.createElement("div");
          temp.innerHTML = msgHTML;
          if (temp.firstElementChild) {
            logDiv.appendChild(temp.firstElementChild);
          }
        });
      } catch (e) {
        console.error("Error parsing cached game log:", e);
      }
    }
  }

function fishCommand(baitInput) {
  if (playerData.trap.active) {
    logMessage(
      'You cannot fish while your trap is set. Please harvest or cancel your trap first.'
    );
    return;
  }

  const now = Date.now();
  if (playerData.readyTimestamp && now < playerData.readyTimestamp) {
    const remainingTime = playerData.readyTimestamp - now;
    logMessage(
      `Hold on! You can fish again in ${formatTimeDelta(remainingTime)}.`
    );
    return;
  }

  let rollMaximum = 20;
  let appendix = '';
  if (baitInput) {
    const baitData = baitTypes.find(
      b =>
        b.name.toLowerCase() === baitInput.toLowerCase() ||
        b.emoji === baitInput
    );
    if (playerData.coins < baitData.price) {
      logMessage(
        `You need ${baitData.price} coins for a ${baitInput} (you have ${playerData.coins}).`
      );
      return;
    }
    rollMaximum = baitData.roll;
    playerData.coins -= baitData.price;
    playerData.lifetime.baitUsed++;
    appendix = `, used ${baitInput} (coins left: ${playerData.coins})`;
  }

  playerData.lifetime.attempts++;

  const roll = randomInt(1, rollMaximum);
  if (roll !== 1) {
    playerData.catch.dryStreak++;
    playerData.catch.luckyStreak = 0;
    const fishingDelay = randomInt(60000, 180000);
    playerData.readyTimestamp = Date.now() + fishingDelay;
    const junkRoll = randomInt(1, 100);
    let message;
    if (junkRoll <= 25) {
      const item = getWeightedCatch('junk');
      addJunk(playerData, item.name);
      message = `No fish, but you got some junk: ${item.name}`;
    } else {
      const missDistance = randomInt(1, 100);
      message = `No luck... Your line landed ${missDistance} cm away.`;
    }
    saveState();
    updateUI();
    logMessage(
      `${message} (${formatTimeDelta(fishingDelay)} cooldown${appendix})`
    );
    return;
  }

  const caughtFishData = getWeightedCatch('fish');
  const fishType = caughtFishData.name;
  addFish(playerData, fishType);
  playerData.lifetime.fish++;
  playerData.catch.dryStreak = 0;
  playerData.catch.luckyStreak++;
  playerData.readyTimestamp = Date.now() + 1800000;

  let sizeString = '';
  if (caughtFishData.size) {
    const size = randomInt(10, 100);
    sizeString = `It is ${size} cm long.`;
    if (size > playerData.lifetime.maxFishSize) {
      sizeString += ' New record!';
      playerData.lifetime.maxFishSize = size;
      playerData.lifetime.maxFishType = fishType;
    }
  }
  saveState();
  updateUI();
  logMessage(
    `Success! You caught a ${fishType}. ${sizeString} (30 min cooldown${appendix})`
  );
}

function addFish(state, emoji) {
    state.catch.fish = (state.catch.fish || 0) + 1;
    state.lifetime.fish = (state.lifetime.fish || 0) + 1;
    state.catch.types[emoji] = (state.catch.types[emoji] || 0) + 1;
  }
  
  function addJunk(state, emoji) {
    state.catch.junk = (state.catch.junk || 0) + 1;
    state.lifetime.junk = (state.lifetime.junk || 0) + 1;
    state.catch.types[emoji] = (state.catch.types[emoji] || 0) + 1;
  }

function getWeightedCatch(type) {
    const applicableItems = itemTypes.filter(i => i.type === type);
    const totalWeight = applicableItems.reduce((sum, i) => sum + i.weight, 0);
    let roll = randomInt(1, totalWeight);
    for (const item of applicableItems) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }
    throw new Error('Invalid weighted roll result');
  }

  function trapCommand() {
    const now = Date.now();
    if (!playerData.trap.active) {
      playerData.trap.active = true;
      playerData.trap.start = now;
      playerData.trap.duration = 3600000; 
      playerData.trap.end = now + playerData.trap.duration;
      saveState();
      updateUI();
      logMessage(`You have set your trap. It will be ready in ${formatTimeDelta(playerData.trap.duration)}.`);
    } else {
      logMessage("Your trap is active. Use the Harvest or Pull in Traps options.");
    }
    updateTrapUI();
  }
  
  function updateTrapUI() {
    const trapBtn = document.getElementById("trap-btn");
    const pullBtn = document.getElementById("pull-traps-btn");
    console.log("Updating trap UI. Current trap state:", playerData.trap);
    if (playerData.trap.active) {
      trapBtn.textContent = "Harvest Trap";
      if (pullBtn) {
        pullBtn.style.display = "inline-block";
      }
    } else {
      trapBtn.textContent = "Set Trap";
      if (pullBtn) {
        pullBtn.style.display = "none";
      }
    }
  }
  function harvestTrap() {
    const now = Date.now();
    if (playerData.trap.active && now >= playerData.trap.end) {
      playerData.lifetime.trap.times++;
      playerData.trap.active = false;
      playerData.trap.start = 0;
      playerData.trap.end = 0;
      saveState();
      updateUI();
      logMessage("You harvested your trap and collected your catch!");
    } else if (playerData.trap.active) {
      const remaining = playerData.trap.end - now;
      logMessage(`Your trap is not yet ready to harvest. Time remaining: ${formatTimeDelta(remaining)}.`);
    } else {
      logMessage("No trap is set.");
    }
    updateTrapUI();
  }
  
  function pullInTraps() {
    if (playerData.trap.active) {
      playerData.trap.active = false;
      playerData.trap.start = 0;
      playerData.trap.end = 0;
      playerData.lifetime.trap.cancelled++;
      saveState();
      updateUI();
      logMessage("You pulled in your traps early and received no catch.");
    } else {
      logMessage("No trap is set.");
    }
    updateTrapUI();
  }

  function checkTrapExpiration() {
    if (playerData.trap.active) {
      const now = Date.now();
      console.log("Before expiration check, trap state:", playerData.trap, "Now:", now);
      if (now >= playerData.trap.end) {
        playerData.trap.active = false;
        playerData.trap.start = 0;
        playerData.trap.end = 0;
        saveState();
        console.log("Trap expired. New trap state:", playerData.trap);
      } else {
        console.log("Trap is still active. Time remaining (ms):", playerData.trap.end - now);
      }
    }
  }

function statsCommand() {
  if (!playerData || !playerData.lifetime) {
    logMessage('No stats available.');
    return;
  }
  const attempts = playerData.lifetime.attempts || 0;
  const fishCaught = playerData.lifetime.fish || 0;
  const junkCaught = playerData.lifetime.junk || 0;
  const baitUsed = playerData.lifetime.baitUsed || 0;
  const maxFishSize = playerData.lifetime.maxFishSize || 0;
  const maxFishType = playerData.lifetime.maxFishType || '';
  const coins = playerData.coins || 0;

  const statsMessage = `
    Your Stats:<br>
    Attempts: ${attempts}<br>
    Fish caught: ${fishCaught}<br>
    Junk caught: ${junkCaught}<br>
    Bait Used: ${baitUsed}<br>
    Max Fish: ${maxFishSize} cm ${
    maxFishType ? '(' + maxFishType + ')' : ''
  }<br>
    Coins: ${coins}
  `;
  logMessage(statsMessage);
}

function calculateScore() {
  const fishCount = playerData.lifetime.fish || 0;
  return fishCount;
}

function promptForName(callback) {
  if (!playerData.name) {
    const name = prompt('Please enter your name for the leaderboard:');
    if (name && name.trim().length > 0) {
      playerData.name = name.trim();
      saveState();
      callback(name.trim());
    } else {
      logMessage('Name is required to submit your score.');
    }
  } else {
    callback(playerData.name);
  }
}

function submitAutoScore() {
  promptForName(name => {
    const score = calculateScore();
    logMessage(`Submitting score for ${name}: ${score}`);
    fetch(API_URL + '/submitScore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, score }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          logMessage('Score submitted successfully!');
        } else {
          logMessage('Error submitting score.');
        }
      })
      .catch(err => {
        logMessage('Error: ' + err);
      });
  });
}

function loadLeaderboard() {
  fetch(API_URL + '/leaderboard')
    .then(res => res.json())
    .then(data => {
      let leaderboardHTML = `<h2>Global Leaderboard</h2>`;
      data.forEach((entry, index) => {
        leaderboardHTML += `<div>${index + 1}. ${entry.name} - ${
          entry.score
        }</div>`;
      });
      const leaderboardDisplay = document.getElementById('leaderboard-display');
      if (leaderboardDisplay) {
        leaderboardDisplay.innerHTML = leaderboardHTML;
      } else {
        logMessage('Leaderboard display element not found.');
      }
    })
    .catch(err => {
      logMessage('Error loading leaderboard: ' + err);
    });
}

function showCollectionPopup() {
  const popup = document.getElementById('collection-popup');
  const grid = document.getElementById('collection-grid');
  grid.innerHTML = '';

  for (const [emoji, count] of Object.entries(playerData.catch.types)) {
    if (count > 0) {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'collection-item';
      itemDiv.setAttribute('data-emoji', emoji);
      itemDiv.innerHTML = `
        <span class="emoji">${emoji}</span>
        <span class="count">(${count})</span>
        <div class="sell-input-container hidden">
          <input type="number" min="1" value="1" class="sell-amount-input" />
        </div>
      `;
      itemDiv.addEventListener('click', function (e) {
        if (e.target.tagName.toLowerCase() === 'input') return;
        this.classList.toggle('selected');
        if (count > 1) {
          const inputContainer = this.querySelector('.sell-input-container');
          inputContainer.classList.toggle('hidden');
        }
      });
      const inputField = itemDiv.querySelector('.sell-amount-input');
      if (inputField) {
        inputField.addEventListener('click', e => e.stopPropagation());
      }
      grid.appendChild(itemDiv);
    }
  }

  let sellButton = document.getElementById('sell-selected-btn');
  if (!sellButton) {
    sellButton = document.createElement('button');
    sellButton.id = 'sell-selected-btn';
    sellButton.textContent = 'Sell Selected';
    sellButton.addEventListener('click', sellSelectedItems);
    document
      .querySelector('#collection-popup .popup-content')
      .appendChild(sellButton);
  }
  popup.classList.remove('hidden');
}

function sellSelectedItems() {
  const grid = document.getElementById('collection-grid');
  const selectedItems = grid.querySelectorAll('.collection-item.selected');
  if (selectedItems.length === 0) {
    logMessage('No items selected to sell.');
    return;
  }

  let summaryItems = [];
  let totalGained = 0;

  selectedItems.forEach(itemDiv => {
    const emoji = itemDiv.getAttribute('data-emoji');
    let currentCount = playerData.catch.types[emoji];
    if (!currentCount) return;

    const itemData = itemTypes.find(it => it.name === emoji);
    if (!itemData || !itemData.sellable) return;

    let sellAmount = 1;
    if (currentCount > 1) {
      const inputField = itemDiv.querySelector('.sell-amount-input');
      if (inputField) {
        sellAmount = parseInt(inputField.value, 10) || 1;
      }
    }
    sellAmount = Math.min(currentCount, sellAmount);
    const coinsGained = sellAmount * itemData.price;
    totalGained += coinsGained;

    playerData.catch.types[emoji] -= sellAmount;
    if (itemData.type === 'fish') {
      playerData.catch.fish = (playerData.catch.fish || 0) - sellAmount;
    } else if (itemData.type === 'junk') {
      playerData.catch.junk = (playerData.catch.junk || 0) - sellAmount;
    }
    playerData.coins += coinsGained;
    playerData.lifetime.coins += coinsGained;

    summaryItems.push(`${sellAmount} ${emoji}`);
  });

  saveState();
  updateUI();
  const summaryText =
    'Sold: ' +
    summaryItems.join(', ') +
    ' | Total Gained: ' +
    totalGained +
    ' coins';
  logMessage(summaryText);
  showCollectionPopup();
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed.');
  if (!document.getElementById('stats-btn')) {
    console.error(
      "Stats button not found! Ensure your HTML includes an element with id='stats-btn'."
    );
  }
  if (!document.getElementById('log')) {
    console.error(
      "Log element (with id='log') not found! Please add one in your HTML."
    );
  }

  loadState();
  checkTrapExpiration();
  updateUI();
  updateTrapUI();
  loadLog();

  const statsBtn = document.getElementById('stats-btn');
  if (statsBtn) {
    statsBtn.addEventListener('click', statsCommand);
    console.log('Stats button listener attached.');
  }

  const fishNoBaitBtn = document.getElementById('fish-no-bait-btn');
  if (fishNoBaitBtn) {
    fishNoBaitBtn.addEventListener('click', () => {
      try {
        fishCommand('');
      } catch (e) {
        logMessage('Error: ' + e.message);
      }
    });
  }
  const fishWormBtn = document.getElementById('fish-worm-btn');
  if (fishWormBtn) {
    fishWormBtn.addEventListener('click', () => {
      try {
        fishCommand('worm');
      } catch (e) {
        logMessage('Error: ' + e.message);
      }
    });
  }
  const fishFlyBtn = document.getElementById('fish-fly-btn');
  if (fishFlyBtn) {
    fishFlyBtn.addEventListener('click', () => {
      try {
        fishCommand('fly');
      } catch (e) {
        logMessage('Error: ' + e.message);
      }
    });
  }
  const fishCricketBtn = document.getElementById('fish-cricket-btn');
  if (fishCricketBtn) {
    fishCricketBtn.addEventListener('click', () => {
      try {
        fishCommand('cricket');
      } catch (e) {
        logMessage('Error: ' + e.message);
      }
    });
  }

  const submitScoreBtn = document.getElementById('submit-score-btn');
  if (submitScoreBtn) {
    submitScoreBtn.addEventListener('click', submitAutoScore);
  }

  const loadLeaderboardBtn = document.getElementById('load-leaderboard-btn');
  if (loadLeaderboardBtn) {
    loadLeaderboardBtn.addEventListener('click', loadLeaderboard);
  }

  const showCollectionBtn = document.getElementById('show-btn');
  if (showCollectionBtn) {
    showCollectionBtn.addEventListener('click', showCollectionPopup);
  }

  const closePopupBtn = document.getElementById('close-popup');
  if (closePopupBtn) {
    closePopupBtn.addEventListener('click', () => {
      document.getElementById('collection-popup').classList.add('hidden');
    });
  }

  const trapBtn = document.getElementById("trap-btn");
  if (trapBtn) {
    trapBtn.addEventListener("click", () => {
      if (playerData.trap.active) {
        harvestTrap();
      } else {
        trapCommand();
      }
    });
  }
  
  const pullBtn = document.getElementById("pull-traps-btn");
  if (pullBtn) {
    pullBtn.addEventListener("click", pullInTraps);
  }

});

const baitTypes = [
    { emoji: "🪱", name: "worm", price: 2, roll: 16 },
    { emoji: "🪰", name: "fly", price: 5, roll: 14 },
    { emoji: "🦗", name: "cricket", price: 8, roll: 12 }
  ];

const itemTypes = [
  // Junk items
  {
    name: '🥫',
    sellable: true,
    size: false,
    type: 'junk',
    price: 8,
    weight: 25,
  },
  {
    name: '💀',
    sellable: true,
    size: false,
    type: 'junk',
    price: 5,
    weight: 10,
  },
  {
    name: '🥾',
    sellable: true,
    size: false,
    type: 'junk',
    price: 20,
    weight: 5,
  },
  {
    name: '🌿',
    sellable: true,
    size: false,
    type: 'junk',
    price: 2,
    weight: 200,
  },
  {
    name: '🍂',
    sellable: true,
    size: false,
    type: 'junk',
    price: 1,
    weight: 100,
  },
  {
    name: '🧦',
    sellable: true,
    size: false,
    type: 'junk',
    price: 5,
    weight: 50,
  },
  // Fish items
  {
    name: '🦂',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🦑',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🦐',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🦞',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🦀',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐡',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐠',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐟',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐬',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐳',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐋',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🦈',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐊',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐸',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐢',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐙',
    sellable: true,
    size: true,
    type: 'fish',
    price: 50,
    weight: 1,
  },
  {
    name: '🐚',
    sellable: true,
    size: false,
    type: 'fish',
    price: 50,
    weight: 1,
  },
];
