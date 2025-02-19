// ================== Supabase Client Initialization ==================
// Make sure the Supabase script is included before this file.
const SUPABASE_URL = "https://yzhspdhbbanfluzvwjac.supabase.co"; // Replace with your project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6aHNwZGhiYmFuZmx1enZ3amFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTM0ODIsImV4cCI6MjA1NTU2OTQ4Mn0.-Pfg4CMHeW7T3mN_aXjviA1tPXebcrY7g-oJhD2se6E"; // Replace with your anon key
// Destructure createClient from the global supabase object and create our client.
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================== GLOBAL VARIABLES & STATE MANAGEMENT ==================

// CODE SOURCE: https://github.com/EmoteFroggy/Fishing/blob/main/main.js

let playerData = null;

function getInitialStats() {
  return {
    name: null,
    catch: {
      luckyStreak: 0,
      dryStreak: 0,
      fish: 0,
      junk: 0,
      types: {} // e.g., { "🐟": 5, "🥫": 3 }
    },
    trap: {
      active: false,
      start: 0,
      end: 0,
      duration: 3600000 // 1 hour by default
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
      maxFishType: ""
    }
  };
}

function loadState() {
  const stored = localStorage.getItem("fishData");
  if (stored) {
    try {
      playerData = JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing saved state. Using initial values.");
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
  const statsPanel = document.getElementById("stats-panel");
  if (statsPanel) {
    statsPanel.innerHTML = `
      <p>Coins: ${playerData.coins}</p>
      <p>Fish: ${playerData.catch.fish || 0}</p>
      <p>Junk: ${playerData.catch.junk || 0}</p>`;
  }
}

function formatTimeDelta(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min} min ${sec} sec` : `${sec} sec`;
}

// ================== GAME LOG FUNCTIONS (with Caching) ==================
function logMessage(message) {
  const logDiv = document.getElementById("log");
  const time = new Date().toLocaleTimeString();
  const msgEl = document.createElement("div");
  msgEl.className = "message";
  msgEl.innerHTML = `<div class="timestamp">[${time}]</div><div class="text">${message}</div>`;
  logDiv.appendChild(msgEl);
  while (logDiv.getElementsByClassName("message").length > 3) {
    logDiv.removeChild(logDiv.firstChild);
  }
  logDiv.scrollTop = logDiv.scrollHeight;
  cacheLog();
}

function cacheLog() {
  const logDiv = document.getElementById("log");
  const messages = Array.from(logDiv.getElementsByClassName("message")).map(el => el.outerHTML);
  localStorage.setItem("gameLog", JSON.stringify(messages));
}

function loadLog() {
  const logDiv = document.getElementById("log");
  const cached = localStorage.getItem("gameLog");
  if (cached) {
    try {
      const messages = JSON.parse(cached);
      logDiv.innerHTML = "";
      messages.forEach(msgHTML => {
        const temp = document.createElement("div");
        temp.innerHTML = msgHTML;
        if (temp.firstElementChild) logDiv.appendChild(temp.firstElementChild);
      });
    } catch (e) {
      console.error("Error loading cached log:", e);
    }
  }
}

// ================== TRAP FUNCTIONS ==================
function checkTrapExpiration() {
  if (playerData.trap.active) {
    if (Date.now() >= playerData.trap.end) {
      playerData.trap.active = false;
      playerData.trap.start = 0;
      playerData.trap.end = 0;
      saveState();
    }
  }
}

function updateTrapUI() {
  const trapBtn = document.getElementById("trap-btn");
  const pullBtn = document.getElementById("pull-traps-btn");
  if (playerData.trap.active) {
    trapBtn.textContent = "Harvest Trap";
    if (pullBtn) pullBtn.style.display = "inline-block";
  } else {
    trapBtn.textContent = "Set Trap";
    if (pullBtn) pullBtn.style.display = "none";
  }
}

function trapCommand() {
  const now = Date.now();
  if (!playerData.trap.active) {
    playerData.trap.active = true;
    playerData.trap.start = now;
    playerData.trap.end = now + playerData.trap.duration;
    saveState();
    updateUI();
    logMessage(`You set a trap. It will be ready in ${formatTimeDelta(playerData.trap.duration)}.`);
  } else {
    logMessage("Trap already set. Use Harvest Trap or Pull in Traps.");
  }
  updateTrapUI();
}

function harvestTrap() {
  const now = Date.now();
  if (playerData.trap.active) {
    if (now >= playerData.trap.end) {
      playerData.trap.active = false;
      playerData.trap.start = 0;
      playerData.trap.end = 0;
      playerData.lifetime.trap.times = (playerData.lifetime.trap.times || 0) + 1;
      saveState();
      updateUI();
      logMessage("You harvested your trap and collected your catch!");
    } else {
      const remain = playerData.trap.end - now;
      logMessage(`Your trap is not yet ready. Time remaining: ${formatTimeDelta(remain)}.`);
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
    playerData.lifetime.trap.cancelled = (playerData.lifetime.trap.cancelled || 0) + 1;
    saveState();
    updateUI();
    logMessage("You pulled in your traps early and got no catch.");
  } else {
    logMessage("No trap is set.");
  }
  updateTrapUI();
}

// ================== STATS & LEADERBOARD FUNCTIONS ==================
function statsCommand() {
  const attempts = playerData.lifetime.attempts || 0;
  const fishCaught = playerData.lifetime.fish || 0;
  const junkCaught = playerData.lifetime.junk || 0;
  const baitUsed = playerData.lifetime.baitUsed || 0;
  const maxFishSize = playerData.lifetime.maxFishSize || 0;
  const maxFishType = playerData.lifetime.maxFishType || "";
  const coins = playerData.coins || 0;
  const msg = `
    Your Stats:<br>
    Attempts: ${attempts}<br>
    Fish caught: ${fishCaught}<br>
    Junk caught: ${junkCaught}<br>
    Bait Used: ${baitUsed}<br>
    Max Fish: ${maxFishSize} cm ${maxFishType ? "(" + maxFishType + ")" : ""}<br>
    Coins: ${coins}
  `;
  logMessage(msg);
}

function calculateScore() {
  const fishCount = playerData.lifetime.fish || 0;
  const maxSize = playerData.lifetime.maxFishSize || 0;
  return (fishCount * 10) + (maxSize * 2);
}

async function submitAutoScore() {
  let name = playerData.name;
  if (!name) {
    name = prompt("Enter your name for leaderboard:");
    if (name) {
      playerData.name = name.trim();
      saveState();
    } else {
      logMessage("Name is required.");
      return;
    }
  }
  const score = calculateScore();
  logMessage(`Submitting score for ${name}: ${score}`);
  const { data, error } = await supabaseClient
    .from("leaderboard")
    .select("score")
    .eq("name", name)
    .single();
  if (data) {
    if (score > data.score) {
      const { error: updateError } = await supabaseClient
        .from("leaderboard")
        .update({ score })
        .eq("name", name);
      if (updateError) {
        logMessage("Error updating score: " + updateError.message);
      } else {
        logMessage("Score updated successfully!");
      }
    } else {
      logMessage("Submitted score is lower than or equal to current score.");
    }
  } else {
    const { error: insertError } = await supabaseClient
      .from("leaderboard")
      .insert([{ name, score }]);
    if (insertError) {
      logMessage("Error submitting score: " + insertError.message);
    } else {
      logMessage("Score submitted successfully!");
    }
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
function showCollectionPopup() {
  const popup = document.getElementById("collection-popup");
  const grid = document.getElementById("collection-grid");
  grid.innerHTML = "";
  for (const [emoji, count] of Object.entries(playerData.catch.types)) {
    if (count > 0) {
      const itemDiv = document.createElement("div");
      itemDiv.className = "collection-item";
      itemDiv.setAttribute("data-emoji", emoji);
      itemDiv.innerHTML = `
        <span class="emoji">${emoji}</span>
        <span class="count">(${count})</span>
        <div class="sell-input-container hidden">
          <input type="number" min="1" value="1" class="sell-amount-input" />
        </div>
      `;
      itemDiv.addEventListener("click", function(e) {
        if (e.target.tagName.toLowerCase() === "input") return;
        this.classList.toggle("selected");
        if (count > 1) {
          const inputContainer = this.querySelector(".sell-input-container");
          inputContainer.classList.toggle("hidden");
        }
      });
      const inputField = itemDiv.querySelector(".sell-amount-input");
      if (inputField) {
        inputField.addEventListener("click", (e) => e.stopPropagation());
      }
      grid.appendChild(itemDiv);
    }
  }
  let sellButton = document.getElementById("sell-selected-btn");
  if (!sellButton) {
    sellButton = document.createElement("button");
    sellButton.id = "sell-selected-btn";
    sellButton.textContent = "Sell Selected";
    sellButton.addEventListener("click", sellSelectedItems);
    document.querySelector("#collection-popup .popup-content").appendChild(sellButton);
  }
  popup.classList.remove("hidden");
}

function sellSelectedItems() {
  const grid = document.getElementById("collection-grid");
  const selectedItems = grid.querySelectorAll(".collection-item.selected");
  if (selectedItems.length === 0) {
    logMessage("No items selected to sell.");
    return;
  }
  let summaryItems = [];
  let totalGained = 0;
  selectedItems.forEach((itemDiv) => {
    const emoji = itemDiv.getAttribute("data-emoji");
    let currentCount = playerData.catch.types[emoji];
    if (!currentCount) return;
    const itemData = itemTypes.find((it) => it.name === emoji);
    if (!itemData || !itemData.sellable) return;
    let sellAmount = 1;
    if (currentCount > 1) {
      const inputField = itemDiv.querySelector(".sell-amount-input");
      if (inputField) {
        sellAmount = parseInt(inputField.value, 10) || 1;
      }
    }
    sellAmount = Math.min(currentCount, sellAmount);
    const coinsGained = sellAmount * itemData.price;
    totalGained += coinsGained;
    playerData.catch.types[emoji] -= sellAmount;
    if (itemData.type === "fish") {
      playerData.catch.fish = (playerData.catch.fish || 0) - sellAmount;
    } else if (itemData.type === "junk") {
      playerData.catch.junk = (playerData.catch.junk || 0) - sellAmount;
    }
    playerData.coins += coinsGained;
    playerData.lifetime.coins += coinsGained;
    summaryItems.push(`${sellAmount} ${emoji}`);
  });
  saveState();
  updateUI();
  const summaryText = "Sold: " + summaryItems.join(", ") + " | Total Gained: " + totalGained + " coins";
  logMessage(summaryText);
  showCollectionPopup();
}

// ================== EVENT LISTENERS & INITIALIZATION ==================
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded.");
  loadState();
  loadLog();
  checkTrapExpiration();
  updateUI();
  updateTrapUI();

  // Trap Button
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

  // Pull in Traps Button
  const pullBtn = document.getElementById("pull-traps-btn");
  if (pullBtn) {
    pullBtn.addEventListener("click", pullInTraps);
  }

  // Stats Button
  const statsBtn = document.getElementById("stats-btn");
  if (statsBtn) {
    statsBtn.addEventListener("click", statsCommand);
  }

  // Submit Score Button
  const submitScoreBtn = document.getElementById("submit-score-btn");
  if (submitScoreBtn) {
    submitScoreBtn.addEventListener("click", submitAutoScore);
  }

  // Load Leaderboard Button
  const loadLbBtn = document.getElementById("load-leaderboard-btn");
  if (loadLbBtn) {
    loadLbBtn.addEventListener("click", loadLeaderboard);
  }

  // Show Collection Button
  const showCollectionBtn = document.getElementById("show-btn");
  if (showCollectionBtn) {
    showCollectionBtn.addEventListener("click", showCollectionPopup);
  }

  // Close Collection Popup
  const closePopupBtn = document.getElementById("close-popup");
  if (closePopupBtn) {
    closePopupBtn.addEventListener("click", () => {
      document.getElementById("collection-popup").classList.add("hidden");
    });
  }
});

// ================== ITEM TYPES DEFINITION ==================
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
