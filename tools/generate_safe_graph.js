const fs = require('fs');
const WorldMap = require('../src/server/game/world/WorldMap');
const GameConfig = require('../src/server/game/config/GameConfig');

const worldMap = new WorldMap('./src/server/assets/world_map.json');

const WAYPOINT_NODES = [
    { id: "gulf_of_mexico", x: 20000, y: 15000 },
    { id: "yucatan_channel", x: 26000, y: 19000 },
    { id: "florida_straits", x: 34000, y: 12000 },
    { id: "old_bahama_channel", x: 42000, y: 14000 },
    { id: "windward_passage", x: 45000, y: 21000 },
    { id: "jamaica_channel", x: 42000, y: 22000 },
    { id: "mona_passage", x: 55000, y: 24000 },
    { id: "caribbean_sea_west", x: 35000, y: 28000 },
    { id: "caribbean_sea_central", x: 48000, y: 28000 },
    { id: "caribbean_sea_east", x: 60000, y: 26000 },
    { id: "leeward_islands_north", x: 65000, y: 21000 },
    { id: "windward_islands_south", x: 67000, y: 32000 },
    { id: "gulf_of_honduras", x: 25000, y: 24000 },
    { id: "panama_basin", x: 30000, y: 28000 }
];

const WAYPOINT_EDGES_RAW = [
    { from: "gulf_of_mexico", to: "yucatan_channel" },
    { from: "gulf_of_mexico", to: "florida_straits" },
    { from: "florida_straits", to: "old_bahama_channel" },
    { from: "florida_straits", to: "yucatan_channel" },
    { from: "yucatan_channel", to: "caribbean_sea_west" },
    { from: "yucatan_channel", to: "gulf_of_honduras" },
    { from: "gulf_of_honduras", to: "caribbean_sea_west" },
    { from: "caribbean_sea_west", to: "panama_basin" },
    { from: "caribbean_sea_west", to: "caribbean_sea_central" },
    { from: "caribbean_sea_west", to: "jamaica_channel" },
    { from: "windward_passage", to: "old_bahama_channel" },
    { from: "windward_passage", to: "jamaica_channel" },
    { from: "windward_passage", to: "caribbean_sea_central" },
    { from: "jamaica_channel", to: "caribbean_sea_central" },
    { from: "caribbean_sea_central", to: "panama_basin" },
    { from: "caribbean_sea_central", to: "caribbean_sea_east" },
    { from: "caribbean_sea_east", to: "mona_passage" },
    { from: "mona_passage", to: "windward_passage" },
    { from: "mona_passage", to: "caribbean_sea_east" },
    { from: "caribbean_sea_east", to: "windward_islands_south" },
    { from: "leeward_islands_north", to: "caribbean_sea_east" },
    { from: "leeward_islands_north", to: "mona_passage" }
];

const COARSE_SIZE = 1000;
const w = Math.ceil(80750 / COARSE_SIZE);
const h = Math.ceil(42550 / COARSE_SIZE);

function isSafe(cx, cy) {
    if (cx < 0 || cx >= w || cy < 0 || cy >= h) return false;
    // Fast check: we just sample the 1000x1000 bounding box
    const startX = cx * COARSE_SIZE;
    const startY = cy * COARSE_SIZE;
    
    // sample 5x5 grid in the block
    for(let dx=1; dx<=4; dx++) {
        for(let dy=1; dy<=4; dy++) {
            if (!worldMap.isWater(startX + dx*200, startY + dy*200)) {
                return false;
            }
        }
    }
    return true;
}

// Ensure original nodes are "safe" or map them to nearest safe coarse node
const finalNodes = new Map();
let nextId = 0;
const finalEdges = [];

const gridNodesMap = new Map(); // key -> id

WAYPOINT_NODES.forEach(n => {
    let cx = Math.floor(n.x / COARSE_SIZE);
    let cy = Math.floor(n.y / COARSE_SIZE);
    
    // Find nearest safe if not safe
    if (!isSafe(cx, cy)) {
        let found = false;
        for(let r=1; r<5 && !found; r++) {
            for(let dx=-r; dx<=r; dx++) {
                for(let dy=-r; dy<=r; dy++) {
                    if (isSafe(cx+dx, cy+dy)) {
                        cx+=dx; cy+=dy; found = true; break;
                    }
                }
                if(found) break;
            }
        }
    }

    const key = `${cx},${cy}`;
    gridNodesMap.set(n.id, key); // map named node to this grid cell
    finalNodes.set(key, { id: n.id, cx, cy });
});

// A* on coarse grid
function findCoarseRoute(sx, sy, tx, ty) {
    const startKey = `${sx},${sy}`;
    const targetKey = `${tx},${ty}`;
    
    const openSet = new Set([startKey]);
    const cameFrom = new Map();
    const gScore = new Map();
    gScore.set(startKey, 0);
    
    const fScore = new Map();
    fScore.set(startKey, Math.hypot(sx-tx, sy-ty));

    while(openSet.size > 0) {
        let current = null;
        let lowestF = Infinity;
        for (const id of openSet) {
            if (fScore.get(id) < lowestF) {
                lowestF = fScore.get(id);
                current = id;
            }
        }

        if (current === targetKey) {
            const path = [current];
            let curr = current;
            while (cameFrom.has(curr)) {
                curr = cameFrom.get(curr);
                path.unshift(curr);
            }
            return path;
        }

        openSet.delete(current);
        const [cx, cy] = current.split(',').map(Number);

        // 8 directions
        const dirs = [
            [0, -1], [1, -1], [1, 0], [1, 1],
            [0, 1], [-1, 1], [-1, 0], [-1, -1]
        ];

        for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;
            const nKey = `${nx},${ny}`;
            
            if (!isSafe(nx, ny)) continue;

            const dist = Math.sqrt(dx*dx + dy*dy);
            const tgScore = gScore.get(current) + dist;
            
            if (!gScore.has(nKey) || tgScore < gScore.get(nKey)) {
                cameFrom.set(nKey, current);
                gScore.set(nKey, tgScore);
                fScore.set(nKey, tgScore + Math.hypot(nx-tx, ny-ty));
                openSet.add(nKey);
            }
        }
    }
    return null; // No path
}

console.log("Generating safe edges...");

WAYPOINT_EDGES_RAW.forEach(edge => {
    const sKey = gridNodesMap.get(edge.from);
    const tKey = gridNodesMap.get(edge.to);
    
    if (sKey && tKey) {
        const [sx, sy] = sKey.split(',').map(Number);
        const [tx, ty] = tKey.split(',').map(Number);
        
        const path = findCoarseRoute(sx, sy, tx, ty);
        if (path) {
            // Simplify path (remove redundant colinear points)
            const simplified = [path[0]];
            for (let i = 1; i < path.length - 1; i++) {
                const prev = simplified[simplified.length - 1].split(',').map(Number);
                const curr = path[i].split(',').map(Number);
                const next = path[i+1].split(',').map(Number);
                
                const dx1 = curr[0] - prev[0];
                const dy1 = curr[1] - prev[1];
                const dx2 = next[0] - curr[0];
                const dy2 = next[1] - curr[1];
                
                // If slopes are different, keep the point
                if (dx1 * dy2 !== dx2 * dy1) {
                    simplified.push(path[i]);
                }
            }
            simplified.push(path[path.length - 1]);
            
            // Add nodes first
            for (let i = 0; i < simplified.length; i++) {
                const key = simplified[i];
                if (!finalNodes.has(key)) {
                    const [nx, ny] = key.split(',').map(Number);
                    finalNodes.set(key, { id: `wp_${nextId++}`, cx: nx, cy: ny });
                }
            }
            
            // Then add edges
            for (let i = 0; i < simplified.length - 1; i++) {
                const n1 = finalNodes.get(simplified[i]).id;
                const n2 = finalNodes.get(simplified[i+1]).id;
                // Add edge if not exists
                if (!finalEdges.find(e => (e.from===n1 && e.to===n2) || (e.from===n2 && e.to===n1))) {
                    finalEdges.push({ from: n1, to: n2 });
                }
            }
        } else {
            console.error(`Failed to find path for ${edge.from} -> ${edge.to}`);
        }
    }
});

let outNodes = "const WAYPOINT_NODES = [\n";
finalNodes.forEach(v => {
    // Convert back to center pixel
    outNodes += `    { id: "${v.id}", x: ${v.cx * COARSE_SIZE + COARSE_SIZE/2}, y: ${v.cy * COARSE_SIZE + COARSE_SIZE/2} },\n`;
});
outNodes += "];\n\nconst WAYPOINT_EDGES_RAW = [\n";
finalEdges.forEach(e => {
    outNodes += `    { from: "${e.from}", to: "${e.to}" },\n`;
});
outNodes += "];\n";

fs.writeFileSync('./tools/generated_graph.js', outNodes);
console.log("Graph generated to tools/generated_graph.js with " + finalNodes.size + " nodes and " + finalEdges.length + " edges.");
