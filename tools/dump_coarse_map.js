const WorldMap = require('../src/server/game/world/WorldMap');
const GameConfig = require('../src/server/game/config/GameConfig');

const worldMap = new WorldMap('./src/server/assets/world_map.json');

console.log("Coarse Caribbean Map (1 char = 1000px):");

let header = "    ";
for (let x = 0; x < 80; x+=5) header += x.toString().padEnd(5, ' ');
console.log(header);

for (let y = 0; y < 42; y++) {
    let row = y.toString().padStart(2, ' ') + "  ";
    for (let x = 0; x < 80; x++) {
        // Sample the coordinate
        const wX = x * 1000 + 500;
        const wY = y * 1000 + 500;
        
        let t = 0;
        if (worldMap.isLand(wX, wY)) t = 2;
        else if (!worldMap.isWater(wX, wY)) t = 1;

        if (t === 0) row += "."; // Water
        else if (t === 1) row += "~"; // Shallow
        else if (t === 2) row += "#"; // Land
    }
    console.log(row);
}
