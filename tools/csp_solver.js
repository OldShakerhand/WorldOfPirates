const WorldMap = require('../src/server/game/world/WorldMap');
const worldMap = new WorldMap('./src/server/assets/world_map.json');

function isLOS(p1, p2) {
    if (!p1 || !p2) return true; // not assigned yet
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

const domains = {
    florida_strait: { minX: 33000, maxX: 36000, minY: 10000, maxY: 13000 },
    bahamas_bank: { minX: 39000, maxX: 46000, minY: 13000, maxY: 17000 },
    windward_passage: { minX: 44000, maxX: 48000, minY: 19000, maxY: 23000 },
    jamaica_channel: { minX: 42000, maxX: 45000, minY: 22000, maxY: 25000 },
    yucatan_channel: { minX: 25000, maxX: 28000, minY: 18000, maxY: 21000 },
    western_caribbean: { minX: 31000, maxX: 36000, minY: 26000, maxY: 29000 },
    panama_approach: { minX: 29000, maxX: 34000, minY: 30000, maxY: 35000 },
    mona_passage: { minX: 53000, maxX: 56000, minY: 20000, maxY: 26000 },
    puerto_rico_basin: { minX: 56000, maxX: 59000, minY: 19000, maxY: 22000 },
    anegada_passage: { minX: 61000, maxX: 64000, minY: 20000, maxY: 23000 },
    lesser_antilles_north: { minX: 64000, maxX: 68000, minY: 20000, maxY: 23000 },
    lesser_antilles_south: { minX: 65000, maxX: 69000, minY: 29000, maxY: 33000 },
    venezuela_basin: { minX: 50000, maxX: 56000, minY: 25000, maxY: 28000 }
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

const variablesList = Object.keys(domains);
const candidates = {};

// Prepare candidates
console.log("Generating candidates...");
for (const key of variablesList) {
    candidates[key] = [];
    const dom = domains[key];
    for (let x = dom.minX; x <= dom.maxX; x += 500) {
        for (let y = dom.minY; y <= dom.maxY; y += 500) {
            if (worldMap.isPassable(x, y)) {
                candidates[key].push({ x, y });
            }
        }
    }
    console.log(`${key}: ${candidates[key].length} candidates`);
}

function isValidAssignment(assignment) {
    for (const edge of edges) {
        const p1 = assignment[edge.from];
        const p2 = assignment[edge.to];
        if (p1 && p2) {
            if (!isLOS(p1, p2)) return false;
        }
    }
    return true;
}

// Backtracking
function solve(assignment, varIndex) {
    if (varIndex === variablesList.length) {
        return assignment;
    }
    
    const key = variablesList[varIndex];
    for (const point of candidates[key]) {
        assignment[key] = point;
        if (isValidAssignment(assignment)) {
            const result = solve(assignment, varIndex + 1);
            if (result) return result;
        }
    }
    assignment[key] = null;
    return null;
}

console.log("\nSolving CSP...");
const assignment = {};
const result = solve(assignment, 0);

if (result) {
    console.log("FOUND EXACT NETWORK!");
    console.log(JSON.stringify(result, null, 2));
} else {
    console.log("NO SOLUTION FOUND.");
}
