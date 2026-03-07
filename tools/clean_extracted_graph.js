const fs = require('fs');
const { WAYPOINT_NODES, WAYPOINT_EDGES_RAW } = require('./extracted_waypoints');
const WorldMap = require('../src/server/game/world/WorldMap');
const worldMap = new WorldMap('./src/server/assets/world_map.json');

// 1. Merge close nodes (users often draw nodes with multiple strokes creating fragments)
const MERGE_DIST = 500; // 500 world units ~ 20 tiles (captures wide hand-drawn clusters)
let mergedNodes = [];
let nodeRemap = {};

for (const node of WAYPOINT_NODES) {
    let merged = false;
    for (const mn of mergedNodes) {
        if (Math.hypot(mn.x - node.x, mn.y - node.y) < MERGE_DIST) {
            // merge
            mn.x = Math.round((mn.x + node.x) / 2);
            mn.y = Math.round((mn.y + node.y) / 2);
            nodeRemap[node.id] = mn.id;
            merged = true;
            break;
        }
    }
    if (!merged) {
        mergedNodes.push({ id: `custom_wp_${mergedNodes.length}`, x: node.x, y: node.y });
        nodeRemap[node.id] = `custom_wp_${mergedNodes.length - 1}`;
    }
}

console.log(`Merged ${WAYPOINT_NODES.length} raw nodes down to ${mergedNodes.length} true nodes.`);

// 2. Map edges to new merged node IDs and remove duplicates/self-loops
const uniqueEdges = new Set();
const finalEdges = [];

for (const edge of WAYPOINT_EDGES_RAW) {
    const fromId = nodeRemap[edge.from];
    const toId = nodeRemap[edge.to];
    
    if (fromId === toId) continue;
    
    // Sort to avoid bidirectional duplicates
    const key = [fromId, toId].sort().join('-');
    if (!uniqueEdges.has(key)) {
        uniqueEdges.add(key);
        finalEdges.push({ from: fromId, to: toId });
    }
}

console.log(`Reduced 295 raw edges to ${finalEdges.length} unique connections.`);

// 3. Optional: Verify line of sight. If an edge hits land, discard it.
const validEdges = [];
let invalidCount = 0;

for (const edge of finalEdges) {
    const n1 = mergedNodes.find(n => n.id === edge.from);
    const n2 = mergedNodes.find(n => n.id === edge.to);
    
    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 50);
    
    let ok = true;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        if (!worldMap.isPassable(n1.x + t * dx, n1.y + t * dy)) {
            ok = false;
            break;
        }
    }
    if (ok) {
        validEdges.push(edge);
    } else {
        invalidCount++;
    }
}

console.log(`Discarded ${invalidCount} edges that clipped land. ${validEdges.length} edges remain active.`);

let out = "const WAYPOINT_NODES = [\n";
mergedNodes.forEach(n => out += `    { id: "${n.id}", x: ${n.x}, y: ${n.y} },\n`);
out += "];\n\nconst WAYPOINT_EDGES_RAW = [\n";
validEdges.forEach(e => out += `    { from: "${e.from}", to: "${e.to}" },\n`);
out += "];\n\nmodule.exports = { WAYPOINT_NODES, WAYPOINT_EDGES_RAW };\n";

fs.writeFileSync('./tools/clean_waypoints.js', out);
console.log("Saved cleaned graph to tools/clean_waypoints.js");
