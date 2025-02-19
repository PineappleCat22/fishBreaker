function load() {
    logMessage('💻 im in')
}

function evilFish() {
    addFish(playerData, '🐟')

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