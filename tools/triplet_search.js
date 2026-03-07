const WorldMap = require('../src/server/game/world/WorldMap');
const worldMap = new WorldMap('./src/server/assets/world_map.json');

function isLOS(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return true;
    const steps = Math.ceil(length / 50);
    for(let i=0; i<=steps; i++){
        if(!worldMap.isPassable(p1.x + (i/steps)*dx, p1.y + (i/steps)*dy)) return false;
    }
    return true;
}

const fs_candidates = [];
const bb_candidates = [];
const wp_candidates = [];

// Florida Strait (x: 33000-36000, y: 10000-13000)
for(let x=33000; x<=36000; x+=500) {
    for(let y=10000; y<=13000; y+=500) {
        if(worldMap.isPassable(x, y)) fs_candidates.push({x, y});
    }
}

// Bahamas Bank (x: 39000-45000, y: 13000-17000)
for(let x=39000; x<=45000; x+=500) {
    for(let y=13000; y<=17000; y+=500) {
        if(worldMap.isPassable(x, y)) bb_candidates.push({x, y});
    }
}

// Windward Passage (x: 44000-47000, y: 19000-22000)
for(let x=44000; x<=47000; x+=500) {
    for(let y=19000; y<=22000; y+=500) {
        if(worldMap.isPassable(x, y)) wp_candidates.push({x, y});
    }
}

console.log(`Checking ${fs_candidates.length} x ${bb_candidates.length} x ${wp_candidates.length} combinations...`);

let found = false;
for(const bb of bb_candidates) {
    // Check if bb connects to any fs
    const valid_fs = fs_candidates.filter(fs => isLOS(fs, bb));
    if(valid_fs.length === 0) continue;
    
    // Check if bb connects to any wp
    const valid_wp = wp_candidates.filter(wp => isLOS(bb, wp));
    if(valid_wp.length === 0) continue;
    
    // We found a connecting bb!
    found = true;
    console.log("FOUND TRIPLET!");
    console.log("Florida Strait: ", valid_fs[0]);
    console.log("Bahamas Bank: ", bb);
    console.log("Windward Passage: ", valid_wp[0]);
    break; // Just need one good one
}

if(!found) console.log("NO TRIPLET FOUND FOR FS -> BB -> WP");
