const WorldMap = require('../src/server/game/world/WorldMap');
const WaypointGraph = require('../src/server/game/navigation/WaypointGraph');
const GameConfig = require('../src/server/game/config/GameConfig');

const worldMap = new WorldMap('./src/server/assets/world_map.json');
const graph = new WaypointGraph();

// We need to sample every edge at 25px intervals (1 tile)
const SAMPLE_RATE = GameConfig.GAME.TILE_SIZE;

let failedEdges = 0;

console.log("Verifying Waypoint Graph Edges...");

// We'll iterate over all defined edges
for (const [nodeId, edges] of graph.edges) {
    const startNode = graph.nodes.get(nodeId);
    
    // Check all outgoing edges (graph is bidirectional, so we check each half)
    for (const edge of edges) {
        // Only verify going Forward (lexicographical) to avoid duplicate prints
        if (nodeId > edge.to) continue;

        const endNode = graph.nodes.get(edge.to);
        const distance = Math.hypot(endNode.x - startNode.x, endNode.y - startNode.y);
        
        let pathClear = true;
        let conflictPoint = null;
        let conflictType = null;

        // Sample along the edge
        const steps = Math.ceil(distance / SAMPLE_RATE);
        
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const px = startNode.x + t * (endNode.x - startNode.x);
            const py = startNode.y + t * (endNode.y - startNode.y);

            if (worldMap.isLand(px, py)) {
                pathClear = false;
                conflictPoint = { x: px, y: py };
                conflictType = "LAND";
                break; // Stop checking this edge
            } else if (!worldMap.isWater(px, py)) { // shallow
                pathClear = false;
                conflictPoint = { x: px, y: py };
                conflictType = "SHALLOW";
                break;
            }
        }

        if (!pathClear) {
            console.error(`[Edge Conflict] ${nodeId} -> ${edge.to} hits ${conflictType} at (${Math.round(conflictPoint.x)}, ${Math.round(conflictPoint.y)})`);
            failedEdges++;
        } else {
            // console.log(`[Edge Clear] ${nodeId} -> ${edge.to}`);
        }
    }
}

if (failedEdges > 0) {
    console.error(`Verification Failed. ${failedEdges} edges are obstructed.`);
} else {
    console.log("Verification Passed! All edges are clear over deep water.");
}
