const WorldMap = require('../src/server/game/world/WorldMap');
const worldMap = new WorldMap('./src/server/assets/world_map.json');

let nodes = {
    florida_strait: { x: 33500, y: 11000 },
    bahamas_bank: { x: 42500, y: 15500 },
    windward_passage: { x: 45500, y: 20500 },
    jamaica_channel: { x: 44000, y: 24000 },
    yucatan_channel: { x: 25000, y: 19500 },
    western_caribbean: { x: 34500, y: 28500 },
    panama_approach: { x: 29500, y: 31000 },
    mona_passage: { x: 53000, y: 24000 },
    puerto_rico_basin: { x: 58000, y: 21500 },
    anegada_passage: { x: 62000, y: 21500 },
    lesser_antilles_north: { x: 65500, y: 21500 },
    lesser_antilles_south: { x: 67500, y: 32500 },
    venezuela_basin: { x: 55000, y: 35000 }
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

function checkEdge(startNode, endNode) {
    const dx = endNode.x - startNode.x;
    const dy = endNode.y - startNode.y;
    const length = Math.hypot(dx, dy);
    const steps = Math.ceil(length / 50);
    
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = startNode.x + t * dx;
        const y = startNode.y + t * dy;
        if (!worldMap.isPassable(x, y)) return false;
    }
    return true;
}

function checkAllEdges(testNodes) {
    for (const edge of edges) {
        if (!checkEdge(testNodes[edge.from], testNodes[edge.to])) {
            return false;
        }
    }
    return true;
}

// Keep tweaking nodes randomly within a radius until all edges are valid
let attempts = 0;
const maxAttempts = 100000;
let bestNodes = null;
let bestValidCount = 0;

while (attempts < maxAttempts) {
    const testNodes = JSON.parse(JSON.stringify(nodes));
    // Perturb
    for (const key in testNodes) {
        testNodes[key].x += (Math.random() - 0.5) * 5000;
        testNodes[key].y += (Math.random() - 0.5) * 5000;
    }
    
    // Evaluate how many edges are valid
    let validCount = 0;
    for (const edge of edges) {
        if (checkEdge(testNodes[edge.from], testNodes[edge.to])) {
            validCount++;
        }
    }
    
    if (validCount > bestValidCount) {
        bestValidCount = validCount;
        bestNodes = testNodes;
        console.log(`New best: ${validCount}/${edges.length} edges valid`);
    }

    if (validCount === edges.length) {
        console.log("Found complete solution!");
        console.log(JSON.stringify(testNodes, null, 2));
        process.exit(0);
    }
    
    attempts++;
}

console.log(`Failed. Best was ${bestValidCount}/${edges.length}.`);
console.log(JSON.stringify(bestNodes, null, 2));
