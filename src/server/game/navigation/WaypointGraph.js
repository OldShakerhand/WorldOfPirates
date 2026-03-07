/**
 * WaypointGraph.js
 * 
 * DESIGN CONTRACT:
 * - Provides a small, static waypoint graph for open-sea navigation.
 * - This is NOT tile A*. It only searches ~14 predefined nodes.
 * - Ensures NPC ships can travel between harbors without getting stuck.
 * - Nodes use world coordinates, not tile coordinates.
 */

// We will hardcode 14 waypoints mapping major passages in the Caribbean.
// These coordinates need to be approximated and strictly in WATER.
const WAYPOINT_NODES = [
    { id: "custom_wp_0", x: 37252, y: 3969 },
    { id: "custom_wp_1", x: 18986, y: 4900 },
    { id: "custom_wp_2", x: 45392, y: 8856 },
    { id: "custom_wp_3", x: 38435, y: 10461 },
    { id: "custom_wp_4", x: 34990, y: 12740 },
    { id: "custom_wp_5", x: 42360, y: 14835 },
    { id: "custom_wp_6", x: 25448, y: 15496 },
    { id: "custom_wp_7", x: 52361, y: 17206 },
    { id: "custom_wp_8", x: 13243, y: 18709 },
    { id: "custom_wp_9", x: 26993, y: 18795 },
    { id: "custom_wp_10", x: 48386, y: 19554 },
    { id: "custom_wp_11", x: 55120, y: 19822 },
    { id: "custom_wp_12", x: 37601, y: 21542 },
    { id: "custom_wp_13", x: 47081, y: 21552 },
    { id: "custom_wp_14", x: 58892, y: 22364 },
    { id: "custom_wp_15", x: 44869, y: 22511 },
    { id: "custom_wp_16", x: 66827, y: 23278 },
    { id: "custom_wp_17", x: 72340, y: 24191 },
    { id: "custom_wp_18", x: 24703, y: 25104 },
    { id: "custom_wp_19", x: 38014, y: 25790 },
    { id: "custom_wp_20", x: 56936, y: 26106 },
    { id: "custom_wp_21", x: 46538, y: 26310 },
    { id: "custom_wp_22", x: 65878, y: 26430 },
    { id: "custom_wp_23", x: 54114, y: 32684 },
    { id: "custom_wp_24", x: 67059, y: 33786 },
    { id: "custom_wp_25", x: 71900, y: 34000 },
    { id: "custom_wp_26", x: 34251, y: 35506 },
    { id: "custom_wp_27", x: 43081, y: 36224 },
];

const WAYPOINT_EDGES_RAW = [
    { from: "custom_wp_0", to: "custom_wp_2" },
    { from: "custom_wp_0", to: "custom_wp_3" },
    { from: "custom_wp_2", to: "custom_wp_3" },
    { from: "custom_wp_1", to: "custom_wp_6" },
    { from: "custom_wp_1", to: "custom_wp_4" },
    { from: "custom_wp_6", to: "custom_wp_4" },
    { from: "custom_wp_1", to: "custom_wp_8" },
    { from: "custom_wp_8", to: "custom_wp_6" },
    { from: "custom_wp_2", to: "custom_wp_7" },
    { from: "custom_wp_2", to: "custom_wp_5" },
    { from: "custom_wp_3", to: "custom_wp_4" },
    { from: "custom_wp_4", to: "custom_wp_5" },
    { from: "custom_wp_5", to: "custom_wp_10" },
    { from: "custom_wp_6", to: "custom_wp_9" },
    { from: "custom_wp_7", to: "custom_wp_10" },
    { from: "custom_wp_7", to: "custom_wp_11" },
    { from: "custom_wp_11", to: "custom_wp_14" },
    { from: "custom_wp_11", to: "custom_wp_10" },
    { from: "custom_wp_14", to: "custom_wp_20" },
    { from: "custom_wp_20", to: "custom_wp_21" },
    { from: "custom_wp_9", to: "custom_wp_12" },
    { from: "custom_wp_9", to: "custom_wp_18" },
    { from: "custom_wp_10", to: "custom_wp_13" },
    { from: "custom_wp_12", to: "custom_wp_15" },
    { from: "custom_wp_13", to: "custom_wp_15" },
    { from: "custom_wp_12", to: "custom_wp_19" },
    { from: "custom_wp_14", to: "custom_wp_16" },
    { from: "custom_wp_16", to: "custom_wp_17" },
    { from: "custom_wp_15", to: "custom_wp_21" },
    { from: "custom_wp_16", to: "custom_wp_22" },
    { from: "custom_wp_16", to: "custom_wp_20" },
    { from: "custom_wp_22", to: "custom_wp_24" },
    { from: "custom_wp_22", to: "custom_wp_20" },
    { from: "custom_wp_22", to: "custom_wp_23" },
    { from: "custom_wp_22", to: "custom_wp_17" },
    { from: "custom_wp_24", to: "custom_wp_20" },
    { from: "custom_wp_24", to: "custom_wp_23" },
    { from: "custom_wp_24", to: "custom_wp_25" },
    { from: "custom_wp_20", to: "custom_wp_23" },
    { from: "custom_wp_23", to: "custom_wp_21" },
    { from: "custom_wp_25", to: "custom_wp_17" },
    { from: "custom_wp_18", to: "custom_wp_19" },
    { from: "custom_wp_19", to: "custom_wp_21" },
    { from: "custom_wp_19", to: "custom_wp_27" },
    { from: "custom_wp_19", to: "custom_wp_26" },
    { from: "custom_wp_21", to: "custom_wp_27" },
    { from: "custom_wp_23", to: "custom_wp_27" },
    { from: "custom_wp_26", to: "custom_wp_27" },
];

class WaypointGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();

        // Initialize Nodes
        for (const node of WAYPOINT_NODES) {
            this.nodes.set(node.id, node);
            this.edges.set(node.id, []);
        }

        // Initialize Edges and calculate distances
        for (const edge of WAYPOINT_EDGES_RAW) {
            const nodeA = this.nodes.get(edge.from);
            const nodeB = this.nodes.get(edge.to);

            if (nodeA && nodeB) {
                const distance = Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y);
                
                // Add bidirectional edges
                this.edges.get(nodeA.id).push({ to: nodeB.id, distance });
                this.edges.get(nodeB.id).push({ to: nodeA.id, distance });
            }
        }
    }

    /**
     * Safety Verification: Verify that all waypoint edges are strictly placed in water
     * @param {WorldMap} worldMap The tilemap to query
     * @throws {Error} If any edge crosses LAND.
     */
    verifyEdges(worldMap) {
        let errors = [];
        
        for (const edge of WAYPOINT_EDGES_RAW) {
            const startNode = this.nodes.get(edge.from);
            const endNode = this.nodes.get(edge.to);
            
            if (!startNode || !endNode) continue;
            
            const dx = endNode.x - startNode.x;
            const dy = endNode.y - startNode.y;
            const length = Math.hypot(dx, dy);
            const steps = Math.ceil(length / 50); // Sample every 50 units
            
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const px = startNode.x + t * dx;
                const py = startNode.y + t * dy;
                
                if (!worldMap.isPassable(px, py)) {
                    errors.push(`Edge from '${edge.from}' to '${edge.to}' hits impassable terrain at (${Math.round(px)}, ${Math.round(py)})`);
                    break;
                }
            }
        }
        
        if (errors.length > 0) {
            console.error("WaypointGraph edge verification failed:");
            errors.forEach(e => console.error(e));
            throw new Error("WaypointGraph contains edges that cross land or out-of-bounds areas.");
        } else {
            console.log("[WaypointGraph] Navigation graph verified. All edges strictly traverse passable water.");
        }
    }

    /**
     * Get the nearest waypoint ID to a given coordinate
     * @param {number} x World X
     * @param {number} y World Y
     * @returns {string} ID of nearest node
     */
    getNearestWaypointId(x, y) {
        let nearestId = null;
        let minDistance = Infinity;

        for (const [id, node] of this.nodes) {
            const distance = Math.hypot(node.x - x, node.y - y);
            if (distance < minDistance) {
                minDistance = distance;
                nearestId = id;
            }
        }

        return nearestId;
    }

    /**
     * Simple A* search on the waypoint graph
     * @param {number} startX World X of start point
     * @param {number} startY World Y of start point
     * @param {number} targetX World X of target point
     * @param {number} targetY World Y of target point
     * @returns {Array} Ordered list of waypoint coordinate objects {x, y}
     */
    findRoute(startX, startY, targetX, targetY) {
        const startId = this.getNearestWaypointId(startX, startY);
        const targetId = this.getNearestWaypointId(targetX, targetY);

        if (!startId || !targetId) {
            return [];
        }

        // Standard A* implementation
        const openSet = new Set([startId]);
        const cameFrom = new Map();
        
        const gScore = new Map();
        const fScore = new Map();

        // Initialize scores
        for (const id of this.nodes.keys()) {
            gScore.set(id, Infinity);
            fScore.set(id, Infinity);
        }

        gScore.set(startId, 0);
        
        const startNode = this.nodes.get(startId);
        const targetNode = this.nodes.get(targetId);
        fScore.set(startId, Math.hypot(startNode.x - targetNode.x, startNode.y - targetNode.y));

        while (openSet.size > 0) {
            // Find node in openSet with lowest fScore
            let current = null;
            let lowestF = Infinity;
            
            for (const id of openSet) {
                const f = fScore.get(id);
                if (f < lowestF) {
                    lowestF = f;
                    current = id;
                }
            }

            if (current === targetId) {
                return this._reconstructPath(cameFrom, current);
            }

            openSet.delete(current);

            const neighbors = this.edges.get(current);
            for (const neighbor of neighbors) {
                const tentativeGScore = gScore.get(current) + neighbor.distance;

                if (tentativeGScore < gScore.get(neighbor.to)) {
                    cameFrom.set(neighbor.to, current);
                    gScore.set(neighbor.to, tentativeGScore);
                    
                    const neighborNode = this.nodes.get(neighbor.to);
                    const heuristic = Math.hypot(neighborNode.x - targetNode.x, neighborNode.y - targetNode.y);
                    fScore.set(neighbor.to, tentativeGScore + heuristic);

                    openSet.add(neighbor.to);
                }
            }
        }

        // Return empty path if no path found
        return [];
    }

    /**
     * Helper to reconstruct the path after running A*
     * @param {Map} cameFrom 
     * @param {string} currentId 
     * @returns {Array} Ordered list of {x, y} 
     */
    _reconstructPath(cameFrom, currentId) {
        const pathIds = [currentId];
        let current = currentId;

        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            pathIds.unshift(current);
        }

        return pathIds.map(id => {
            const node = this.nodes.get(id);
            return { x: node.x, y: node.y };
        });
    }
}

module.exports = WaypointGraph;
