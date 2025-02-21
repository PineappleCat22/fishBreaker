const SUPABASE_URL = "https://yzhspdhbbanfluzvwjac.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6aHNwZGhiYmFuZmx1enZ3amFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTM0ODIsImV4cCI6MjA1NTU2OTQ4Mn0.-Pfg4CMHeW7T3mN_aXjviA1tPXebcrY7g-oJhD2se6E";               // Your Supabase anon key
const { createClient } = supabase; 
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== GLOBAL VARIABLES & STATE MANAGEMENT ==================
let playerData = null;

function getInitialStats() {
  return {
    name: null,
    catch: {
      luckyStreak: 0,
      dryStreak: 0,
      fish: 0,
      junk: 0,
      types: {}
    },
    trap: {
      active: false,
      start: 0,
      end: 0,
      duration: 3600000  // 1 hour duration
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
      maxFishType: "",
      // Add default trap stats inside lifetime:
      trap: {
         times: 0,
         cancelled: 0
      }
    }
  };
}


function loadState() {
  const stored = localStorage.getItem("fishData");
  if (stored) {
    try {
      playerData = JSON.parse(stored);
      // Ensure that lifetime.trap exists:
      if (!playerData.lifetime.trap) {
        playerData.lifetime.trap = { times: 0, cancelled: 0 };
      }
    } catch (e) {
      console.error("Error parsing saved state. Initializing new state.");
      playerData = getInitialStats();
      saveState();
    }
  } else {
    playerData = getInitialStats();
    saveState();
  }
}


function saveState() {
  localStorage.setItem("fishData", JSON.stringify(playerData));
}

// ================== UI UPDATE FUNCTIONS ==================
function updateUI() {
  const statsDiv = document.getElementById('stats');
  const fishCaught = playerData.lifetime.fish || 0;
  const junkCaught = playerData.lifetime.junk || 0;
  const baitUsed = playerData.lifetime.baitUsed || 0;
  statsDiv.innerHTML = `
      <p>Coins: ${playerData.coins}</p>
      <p>Fish in collection: ${playerData.catch.fish || 0}</p>
      <p>Junk in collection: ${playerData.catch.junk || 0}</p>
      <p>Fishing attempts: ${playerData.lifetime.attempts}</p>
      <p>Max fish size: ${playerData.lifetime.maxFishSize} cm ${playerData.lifetime.maxFishType? '(' + playerData.lifetime.maxFishType + ')': ''}</p>
      <p>Trap active: ${playerData.trap.active ? 'Yes' : 'No'}</p>
      <p>Fish caught: ${fishCaught}</p>
      <p>Junk caught: ${junkCaught}</p>
      <p>Bait Used: ${baitUsed}</p>
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

// ================== GAME LOG FUNCTIONS (with Caching) ==================
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

function cacheLog() {
  const logDiv = document.getElementById("log");
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

// ================== FISHING FUNCTIONS ==================
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

function getWeightedCatch(type) {
  const applicableItems = itemTypes.filter(item => item.type === type);
  const totalWeight = applicableItems.reduce((sum, item) => sum + item.weight, 0);
  let roll = randomInt(1, totalWeight);
  for (const item of applicableItems) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  throw new Error("Weighted catch error");
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

// ================== TRAP FUNCTIONS ==================
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

function harvestTrap() {
  const now = Date.now();
  if (playerData.trap.active) {
    if (now >= playerData.trap.end) {
      console.log("Trap expired. Harvesting now...");
      // Guarantee between 1 and 2 fish.
      const fishCount = randomInt(1, 2);
      // Guarantee between 6 and 10 junk pieces.
      const junkCount = randomInt(6, 10);
      let fishCaughtNames = [];
      let junkCaughtNames = [];

      // For each fish to be caught.
      for (let i = 0; i < fishCount; i++) {
        const fish = getWeightedCatch("fish");
        fishCaughtNames.push(fish.name);
        addFish(playerData, fish.name);
      }
      // For each junk piece to be caught.
      for (let i = 0; i < junkCount; i++) {
        const junk = getWeightedCatch("junk");
        junkCaughtNames.push(junk.name);
        addJunk(playerData, junk.name);
      }

      playerData.lifetime.trap.times = (playerData.lifetime.trap.times || 0) + 1;

      // Reset trap state.
      playerData.trap.active = false;
      playerData.trap.start = 0;
      playerData.trap.end = 0;
      
      saveState();
      updateUI();
      
      const harvestMsg = `You harvested your trap and collected ${fishCount} fish (${fishCaughtNames.join(", ")}) and ${junkCount} pieces of junk (${junkCaughtNames.join(", ")}).`;
      logMessage(harvestMsg);
      console.log(harvestMsg);
    } else {
      const remaining = playerData.trap.end - now;
      const msg = `Your trap is not yet ready to harvest. Time remaining: ${formatTimeDelta(remaining)}.`;
      logMessage(msg);
      console.log(msg);
    }
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

// ================== LEADERBOARD FUNCTIONS ==================
function calculateScore() {
  return playerData.catch.fish || 0;
}

async function submitAutoScore(silent = false) {
  if (!playerData.name) {
    if (!silent) logMessage("Username missing. Please enter a username at the prompt.");
    return;
  }
  const score = calculateScore();
  if (!silent) logMessage("Submitting score for " + playerData.name + ": " + score);

  const { data, error } = await supabaseClient
    .from("leaderboard")
    .upsert({ name: playerData.name, score, submission_origin: "submit-my-score" }, { onConflict: 'name' });
  if (error) {
    if (!silent)
      logMessage("Error updating score: " + error.message);
  } else {
    if (!silent)
      logMessage("Score updated successfully!");
  }
}

async function loadLeaderboard() {
  const { data, error } = await supabaseClient
    .from("leaderboard")
    .select("name, score")
    .order("score", { ascending: false })
    .limit(10);
  if (error) {
    logMessage("Error loading leaderboard: " + error.message);
    return;
  }
  let html = `<h2>Global Leaderboard</h2>`;
  data.forEach((entry, index) => {
    html += `<div>${index + 1}. ${entry.name} - ${entry.score}</div>`;
  });
  const lbDisplay = document.getElementById("leaderboard-display");
  if (lbDisplay) {
    lbDisplay.innerHTML = html;
  }
}

// ================== COLLECTION POPUP & SELL FUNCTIONS ==================
function showUsernamePopup() {
  const popup = document.getElementById("username-popup");
  popup.style.display = "block";
}

async function validateUsername(username) {
  // Query the leaderboard table to see if this username exists.
  const { data, error } = await supabaseClient
    .from("leaderboard")
    .select("name")
    .eq("name", username)
    .single();
  
  // If a row is found, then the username is taken.
  if (data) {
    return { valid: false, message: "Username is already taken." };
  }
  // Otherwise, assume it's OK.
  return { valid: true };
}

function setupUsernamePopup() {
  const submitBtn = document.getElementById("username-submit-btn");
  submitBtn.addEventListener("click", async () => {
    const usernameInput = document.getElementById("username-input");
    const errorEl = document.getElementById("username-error");
    const username = usernameInput.value.trim();
    if (!username) {
      errorEl.style.display = "block";
      errorEl.textContent = "Username cannot be empty.";
      return;
    }
    const result = await validateUsername(username);
    if (!result.valid) {
      errorEl.style.display = "block";
      errorEl.textContent = result.message;
      return;
    }
    errorEl.style.display = "none";
    playerData.name = username;
    saveState();
    // Force the username popup to hide using inline style with !important
    document.getElementById("username-popup").style.setProperty("display", "none", "important");
  });
}



function showCollectionPopup() {
  const popup = document.getElementById('collection-popup');
  const grid = document.getElementById('collection-grid');
  grid.innerHTML = '';

  // Create a container for both sections.
  const container = document.createElement("div");
  container.className = "collection-container";

  // Create the Fish section.
  const fishSection = document.createElement("div");
  fishSection.className = "collection-section fish-section";
  fishSection.innerHTML = '<h3>Fish Collection</h3>';

  // Create the Junk section.
  const junkSection = document.createElement("div");
  junkSection.className = "collection-section junk-section";
  junkSection.innerHTML = '<h3>Junk Collection</h3>';

  for (const [emoji, count] of Object.entries(playerData.catch.types)) {
    if (count > 0) {
      const itemData = itemTypes.find(item => item.name === emoji);
      if (!itemData) continue;

      const itemDiv = document.createElement("div");
      itemDiv.className = "collection-item";
      itemDiv.setAttribute("data-emoji", emoji);

      // Use a new markup style: an image area and a count label.
      itemDiv.innerHTML = `
        <div class="item-image">${emoji}</div>
        <div class="item-count">x${count}</div>
        <div class="sell-input-container hidden">
          <input type="number" min="1" max="${count}" value="1" class="sell-amount-input" />
        </div>
      `;

      // Toggle selection: clicking (except on the input) toggles the "selected" class.
      itemDiv.addEventListener("click", function(e) {
        if (e.target.tagName.toLowerCase() === "input") return;
        this.classList.toggle("selected");
        const inputContainer = this.querySelector(".sell-input-container");
        if (inputContainer) {
          inputContainer.classList.toggle("hidden");
        }
      });
      const inputField = itemDiv.querySelector(".sell-amount-input");
      if (inputField) {
        inputField.addEventListener("click", e => e.stopPropagation());
      }

      // Append to the correct section based on item type.
      if (itemData.type === "fish") {
        fishSection.appendChild(itemDiv);
      } else if (itemData.type === "junk") {
        junkSection.appendChild(itemDiv);
      }
    }
  }

  // Add a "Sell All" button for each category.
  const sellAllFishBtn = document.createElement("button");
  sellAllFishBtn.className = "sell-all-btn";
  sellAllFishBtn.textContent = "Sell All Fish";
  sellAllFishBtn.addEventListener("click", () => sellAllForCategory("fish"));
  fishSection.appendChild(sellAllFishBtn);

  const sellAllJunkBtn = document.createElement("button");
  sellAllJunkBtn.className = "sell-all-btn";
  sellAllJunkBtn.textContent = "Sell All Junk";
  sellAllJunkBtn.addEventListener("click", () => sellAllForCategory("junk"));
  junkSection.appendChild(sellAllJunkBtn);

  container.appendChild(fishSection);
  container.appendChild(junkSection);
  grid.appendChild(container);

  // Ensure the "Sell Selected" button is present.
  let sellButton = document.getElementById("sell-selected-btn");
  if (!sellButton) {
    sellButton = document.createElement("button");
    sellButton.id = "sell-selected-btn";
    sellButton.className = "sell-selected-btn";
    sellButton.textContent = "Sell Selected";
    sellButton.addEventListener("click", sellSelectedItems);
    document.querySelector("#collection-popup .popup-content").appendChild(sellButton);
  }
  popup.classList.remove("hidden");
}


function sellAllForCategory(category) {
  const grid = document.getElementById("collection-grid");
  const items = grid.querySelectorAll(".collection-item");
  items.forEach(itemDiv => {
    const emoji = itemDiv.getAttribute("data-emoji");
    const itemData = itemTypes.find(item => item.name === emoji);
    if (itemData && itemData.type === category) {
      const count = playerData.catch.types[emoji] || 0;
      if (count > 0) {
        const inputField = itemDiv.querySelector(".sell-amount-input");
        if (inputField) {
          inputField.value = count;
        }
        itemDiv.classList.add("selected");
      }
    }
  });
  sellSelectedItems();
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

// ================== EVENT LISTENERS & INITIALIZATION ==================

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded and parsed.');

  loadState();

  if (playerData.name && playerData.name.trim().length > 0) {
    document.getElementById("username-popup").style.setProperty("display", "none", "important");
  } else {
    showUsernamePopup();
    setupUsernamePopup();
  }

  checkTrapExpiration();
  updateUI();
  updateTrapUI();
  loadLog();
  loadLeaderboard();

  setInterval(() => {
    loadLeaderboard();
    submitAutoScore(true);
  }, 5000);

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

// ================== ITEM TYPES DEFINITION ==================
const baitTypes = [
  { emoji: "🪱", name: "worm", price: 2, roll: 16 },
  { emoji: "🪰", name: "fly", price: 5, roll: 14 },
  { emoji: "🦗", name: "cricket", price: 8, roll: 12 }
];

const itemTypes = [
  // Junk items
  { name: "🥫", sellable: true, size: false, type: "junk", price: 8, weight: 25 },
  { name: "💀", sellable: true, size: false, type: "junk", price: 5, weight: 10 },
  { name: "🥾", sellable: true, size: false, type: "junk", price: 20, weight: 5 },
  { name: "🌿", sellable: true, size: false, type: "junk", price: 2, weight: 200 },
  { name: "🍂", sellable: true, size: false, type: "junk", price: 1, weight: 100 },
  { name: "🧦", sellable: true, size: false, type: "junk", price: 5, weight: 50 },
  // Fish items
  { name: "🦂", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🦑", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🦐", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🦞", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🦀", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐡", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐠", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐟", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐬", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐳", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐋", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🦈", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐊", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐸", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐢", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐙", sellable: true, size: true, type: "fish", price: 50, weight: 1 },
  { name: "🐚", sellable: true, size: false, type: "fish", price: 50, weight: 1 }
];
