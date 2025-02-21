function load() {
    logMessage('💻 im in')
}

function evilFish() {
    addFish(playerData, '🐟')

    const caughtFishData = getWeightedCatch('fish')
    //set the values lol!
    caughtFishData.name = '🍍'
    caughtFishData.sellable = true
    caughtFishData.size = true
    caughtFishData.price = 0


    let sizeString = '';
    if (caughtFishData.size) {
      const size = 999;
      sizeString = `It is ${size} cm long.`;
      if (size > playerData.lifetime.maxFishSize) {
        sizeString += ' New record!';
        playerData.lifetime.maxFishSize = size;
        playerData.lifetime.maxFishType = caughtFishData.name; //identical to what frog does
      }
    }
    saveState();
    updateUI();
    logMessage(
      `ooooo im evil as fuck im making evil fish ${fishType}. ${sizeString}`
    );
}