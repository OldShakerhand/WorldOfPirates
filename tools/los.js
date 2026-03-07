const WorldMap = require('../src/server/game/world/WorldMap');
const worldMap = new WorldMap('./src/server/assets/world_map.json');

function isLOS(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    if (length === 0) return true;
    const steps = Math.ceil(length / 50);
    for(let i=0; i<=steps; i++){
        if(!worldMap.isPassable(x1 + (i/steps)*dx, y1 + (i/steps)*dy)) return false;
    }
    return true;
}

// 1. Find Bahamas Bank (visible from FL and WW_P)
const fl = {x: 34500, y: 12500};
const wp = {x: 45500, y: 20500};

console.log("Searching for Bahamas Bank...");
for(let x=38000; x<48000; x+=500) {
    for(let y=12000; y<20000; y+=500) {
        if(worldMap.isPassable(x, y)) {
            if(isLOS(fl.x, fl.y, x, y) && isLOS(wp.x, wp.y, x, y)) {
                console.log(`Bahamas Bank Candidate: ${x}, ${y}`);
            }
        }
    }
}

// 2. Find Panama Approach (visible from Western Caribbean)
const wc = {x: 33500, y: 27500};
console.log("Searching for Panama Approach...");
for(let x=29000; x<35000; x+=500) {
    for(let y=29000; y<34000; y+=500) {
        if(worldMap.isPassable(x, y)) {
            if(isLOS(wc.x, wc.y, x, y)) {
                console.log(`Panama Approach Candidate: ${x}, ${y}`);
            }
        }
    }
}
