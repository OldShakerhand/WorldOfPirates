const WorldMap = require('../src/server/game/world/WorldMap');
const GameConfig = require('../src/server/game/config/GameConfig');

const worldMap = new WorldMap('./src/server/assets/world_map.json');
const TILE_SIZE = GameConfig.GAME.TILE_SIZE;

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("Usage: node dump_map_area.js <x> <y> [radius]");
    process.exit(1);
}

const cx = parseInt(args[0]);
const cy = parseInt(args[1]);
const radius = args.length > 2 ? parseInt(args[2]) : 10;

const tx = Math.floor(cx / TILE_SIZE);
const ty = Math.floor(cy / TILE_SIZE);

console.log(`Map around world (${cx}, ${cy}), tile (${tx}, ${ty}), radius ${radius}:`);

let out = "";
for (let y = ty - radius; y <= ty + radius; y++) {
    for (let x = tx - radius; x <= tx + radius; x++) {
        const t = worldMap.getTileByCoords(x, y);
        if (t === 0) out += "."; // Water
        else if (t === 1) out += "~"; // Shallow
        else if (t === 2) out += "#"; // Land
        else out += "?";
    }
    out += "\n";
}
console.log(out);
