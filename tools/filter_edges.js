const fs = require('fs');
const { WAYPOINT_NODES, WAYPOINT_EDGES_RAW } = require('./clean_waypoints');

function getDistance(n1, n2) {
    return Math.hypot(n2.x - n1.x, n2.y - n1.y);
}

// Build adjacency matrix for A*
const adj = new Map();
for (const node of WAYPOINT_NODES) {
    adj.set(node.id, []);
}

for (const edge of WAYPOINT_EDGES_RAW) {
    const d = getDistance(
        WAYPOINT_NODES.find(n => n.id === edge.from),
        WAYPOINT_NODES.find(n => n.id === edge.to)
    );
    adj.get(edge.from).push({ to: edge.to, dist: d });
    adj.get(edge.to).push({ to: edge.from, dist: d });
}

// Simple Dijkstra to find shortest path without a specific edge
function shortestPathWithoutEdge(startId, endId, skipFrom, skipTo) {
    const dists = new Map();
    const pq = [{ id: startId, d: 0 }];
    
    for (const node of WAYPOINT_NODES) dists.set(node.id, Infinity);
    dists.set(startId, 0);
    
    while (pq.length > 0) {
        pq.sort((a,b) => a.d - b.d);
        const curr = pq.shift();
        
        if (curr.id === endId) return curr.d;
        if (curr.d > dists.get(curr.id)) continue;
        
        for (const neighbor of adj.get(curr.id)) {
            // Skip the edge we are testing
            if ((curr.id === skipFrom && neighbor.to === skipTo) || 
                (curr.id === skipTo && neighbor.to === skipFrom)) {
                continue;
            }
            
            const alt = curr.d + neighbor.dist;
            if (alt < dists.get(neighbor.to)) {
                dists.set(neighbor.to, alt);
                pq.push({ id: neighbor.to, d: alt });
            }
        }
    }
    return Infinity;
}

const finalEdges = [];
let removedCount = 0;

for (const edge of WAYPOINT_EDGES_RAW) {
    const directDist = getDistance(
        WAYPOINT_NODES.find(n => n.id === edge.from),
        WAYPOINT_NODES.find(n => n.id === edge.to)
    );
    
    const altDist = shortestPathWithoutEdge(edge.from, edge.to, edge.from, edge.to);
    
    // If the direct distance isn't significantly better than the alternative...
    if (directDist >= 0.85 * altDist) {
        // Redundant! Remove it from the live adjacency map so future edge tests 
        // don't use it as an alternative path.
        const fromArr = adj.get(edge.from);
        adj.set(edge.from, fromArr.filter(n => n.to !== edge.to));
        
        const toArr = adj.get(edge.to);
        adj.set(edge.to, toArr.filter(n => n.to !== edge.from));
        
        removedCount++;
    } else {
        finalEdges.push(edge);
    }
}

console.log(`Original edges: ${WAYPOINT_EDGES_RAW.length}`);
console.log(`Removed redundant shortcut edges: ${removedCount}`);
console.log(`Final essential edges remaining: ${finalEdges.length}`);

let out = "const WAYPOINT_NODES = [\n";
WAYPOINT_NODES.forEach(n => out += `    { id: "${n.id}", x: ${n.x}, y: ${n.y} },\n`);
out += "];\n\nconst WAYPOINT_EDGES_RAW = [\n";
finalEdges.forEach(e => out += `    { from: "${e.from}", to: "${e.to}" },\n`);
out += "];\n\nmodule.exports = { WAYPOINT_NODES, WAYPOINT_EDGES_RAW };\n";

fs.writeFileSync('./tools/final_waypoints.js', out);
console.log("Saved filtered graph to tools/final_waypoints.js");
