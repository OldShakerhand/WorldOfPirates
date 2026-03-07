const WorldMap = require('../src/server/game/world/WorldMap');
const worldMap = new WorldMap('./src/server/assets/world_map.json');

let nodes = {
    // 13 final nodes requested
    florida_strait: { x: 34500, y: 12500 },
    bahamas_bank: { x: 45500, y: 14500 }, 
    windward_passage: { x: 45500, y: 22500 }, 
    jamaica_channel: { x: 43500, y: 23500 }, 
    yucatan_channel: { x: 26500, y: 19500 }, 
    western_caribbean: { x: 33500, y: 27500 }, 
    panama_approach: { x: 31500, y: 31000 }, 
    mona_passage: { x: 54500, y: 20500 }, 
    puerto_rico_basin: { x: 57500, y: 20500 }, 
    anegada_passage: { x: 63500, y: 21500 }, 
    lesser_antilles_north: { x: 65500, y: 21500 }, 
    lesser_antilles_south: { x: 66500, y: 31500 }, 
    venezuela_basin: { x: 51500, y: 26500 } 
};

const edges = [
    { from: "florida_strait", to: "bahamas_bank" },
    { from: "bahamas_bank", to: "windward_passage" },
    { from: "windward_passage", to: "jamaica_channel" },
    { from: "jamaica_channel", to: "yucatan_channel" },
    { from: "yucatan_channel", to: "western_caribbean" },
    { from: "western_caribbean", to: "panama_approach" },
    { from: "windward_passage", to: "mona_passage" },
    { from: "mona_passage", to: "puerto_rico_basin" },
    { from: "puerto_rico_basin", to: "anegada_passage" },
    { from: "anegada_passage", to: "lesser_antilles_north" },
    { from: "lesser_antilles_north", to: "lesser_antilles_south" },
    { from: "western_caribbean", to: "venezuela_basin" }
];

function testEdges() {
    let validCount = 0;
    for (const edge of edges) {
        const startNode = nodes[edge.from];
        const endNode = nodes[edge.to];
        const dx = endNode.x - startNode.x;
        const dy = endNode.y - startNode.y;
        const length = Math.hypot(dx, dy);
        const steps = Math.ceil(length / 50);
        let valid = true;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            if (!worldMap.isPassable(startNode.x + t * dx, startNode.y + t * dy)) {
                valid = false;
                break;
            }
        }
        if (valid) validCount++;
    }
    return validCount;
}

let attempts = 0;
let bestCount = testEdges();
if (bestCount === edges.length) {
    console.log("ALL EDGES VALID INITIAL!");
} else {
    while (attempts < 50000 && bestCount < edges.length) {
        let nodeKey = Object.keys(nodes)[Math.floor(Math.random() * Object.keys(nodes).length)];
        let origX = nodes[nodeKey].x;
        let origY = nodes[nodeKey].y;

        nodes[nodeKey].x += (Math.random() - 0.5) * 2000;
        nodes[nodeKey].y += (Math.random() - 0.5) * 2000;

        let newCount = testEdges();
        if (newCount > bestCount) {
            bestCount = newCount;
            console.log(`Improved to ${bestCount}/${edges.length}`);
        } else {
            // Revert
            nodes[nodeKey].x = origX;
            nodes[nodeKey].y = origY;
        }
        attempts++;
    }
    if (bestCount === edges.length) {
        console.log("FOUND PERFECT CONFIGURATION:");
        console.log(JSON.stringify(nodes, null, 2));
    } else {
        console.log("Failed to find perfect config. Best: " + bestCount);
        console.log(JSON.stringify(nodes, null, 2));
    }
}
