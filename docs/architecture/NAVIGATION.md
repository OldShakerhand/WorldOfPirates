# Navigation System

## Purpose

The Navigation system provides the foundational logic for long-distance AI travel across the Caribbean. Rather than relying on a heavy tile-based grid search (which is computationally expensive for open-world oceans), the game utilizes a static, human-readable graph of major sea corridors combined with a local reactive avoidance system.

---

## 1. Waypoint Graph (`WaypointGraph.js`)

The core of the server's long-distance routing is an explicit network of nodes and edges representing the primary trade lanes and natural maritime passages of the Caribbean.

### 1.1 The Network Design
- **Sparse Connectivity:** The graph intentionally uses a small number of nodes (~28) and sparse connections (~48 edges). It is *not* a dense mesh.
- **World Coordinates:** Nodes are strictly defined in `[x, y]` world-space, entirely independent of the tile-grid scale.
- **Passage-Based:** Edges act as broad highways (e.g., "Florida Strait", "Windward Passage"). 

### 1.2 Startup Verification Array
Because manual edits to static nodes can accidentally cause ships to clip islands, `WaypointGraph` employs a rigorous startup check:
*   On boot, `verifyEdges(worldMap)` automatically executes.
*   It iterates over every predefined edge, breaking it down into 50-unit sub-steps.
*   It queries `worldMap.isPassable(x, y)` for every step. 
*   **Safety Contract:** If *any* step hits `LAND`, the server **throws a fatal error** and refuses to start, guaranteeing integrity.

### 1.3 Routing Algorithm
`WaypointGraph.findRoute(startX, startY, targetX, targetY)` applies standard **A* (A-Star)** pathfinding strictly across this sparse array, yielding highly performant long-distance routing in < 1ms.

---

## 2. Navigation Utilities (`NavigationUtils.js`)

Long distance graphs are strictly angular, meaning ships not directly on a node need intelligent bridging logic to enter the network.

### 2.1 Spawn-to-Route Connection
When an NPC spawns dynamically in the ocean and requests a route, it doesn't blindly backtrack to the first node.
1.  **Segment Projection:** `getClosestPointOnSegment()` calculates the exact orthogonal intersection between the ship's arbitrary spawn and the first line segment of its A* planned route.
2.  **Line of Sight (LOS):** `isLineOfSightClear()` casts a ray from the ship to this new interception coordinate checking `isPassable()`.
3.  **Merge:** If the path is perfectly clear water, the ship abandons the first node and seamlessly merges diagonally into the open sea corridor. If land blocks the intercept, it safely defaults back to the explicit `startNode`.

### 2.2 Harbor Approach Nodes
Harbors are inherently placed against land. `getHarborApproach()` calculates a 300px offset vector extending straight out from a harbor's physical "docking bay". NPCs append this node to the very end of their route array to guarantee they approach the harbor perpendicularly from open water, preventing coastal scraping.

---

## 3. Local Avoidance

While the Waypoint Graph handles the macro-scale routing (city to city), micro-scale steering and dynamic obstacle avoidance are handled per-tick by the individual `NPCShip` entity:

1.  **Vision Cone:** The ship casts forward rays testing for both `isLand()` and nearby entity radial collisions.
2.  **Hysteresis Recovery:** If an obstacle is detected, `findClearHeading` scans in ascending angles (±15°, ±30°...) to find a viable deflection vector that still loosely points toward the current waypoint.

*Combined, these systems allow 50+ NPCs to intelligently sail globally around islands and each other with zero intensive pathfinding overhead.*
