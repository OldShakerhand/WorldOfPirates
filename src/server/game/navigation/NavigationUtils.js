/**
 * NavigationUtils.js
 * 
 * Provides utility methods for complex navigation operations, such as harbor approaches.
 */

const APPROACH_DISTANCE = 300;

class NavigationUtils {
    /**
     * Gets the safe approach point for a harbor based on its exit direction.
     * NPC ships should sail here first before docking directly at the harbor center
     * to prevent approaching from land.
     * 
     * @param {Object} harbor The harbor object
     * @param {number} tileSize Size of a tile in pixels to calculate world coords
     * @returns {Object} {x, y} coordinates of approach point
     */
    static getHarborApproach(harbor, tileSize) {
        // Harbor coordinates are in tile space. 
        // We convert them to world space centered in the tile logic:
        const harborWorldX = (harbor.tileX + 0.5) * tileSize;
        const harborWorldY = (harbor.tileY + 0.5) * tileSize;

        // Apply approach distance based on harbor's exit direction
        const approachX = harborWorldX + harbor.exitDirection.x * APPROACH_DISTANCE;
        const approachY = harborWorldY + harbor.exitDirection.y * APPROACH_DISTANCE;

        return { x: approachX, y: approachY };
    }

    /**
     * Compute the closest point P on line segment A -> B from point C
     * @param {number} px Point X (spawn)
     * @param {number} py Point Y (spawn)
     * @param {Object} startNode Segment start {x,y}
     * @param {Object} endNode Segment end {x,y}
     */
    static getClosestPointOnSegment(px, py, startNode, endNode) {
        const ax = startNode.x;
        const ay = startNode.y;
        const bx = endNode.x;
        const by = endNode.y;
        
        const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
        if (l2 === 0) return { x: ax, y: ay }; // A == B
        
        let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
        t = Math.max(0, Math.min(1, t)); // constrain t to [0, 1] segment
        
        return {
            x: ax + t * (bx - ax),
            y: ay + t * (by - ay)
        };
    }

    /**
     * Check if the line between two points is strictly passable
     * @param {WorldMap} worldMap 
     * @param {number} startX 
     * @param {number} startY 
     * @param {number} endX 
     * @param {number} endY 
     */
    static isLineOfSightClear(worldMap, startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return true;
        
        const steps = Math.ceil(dist / 50); // Sample every 50 units
        
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = startX + t * dx;
            const py = startY + t * dy;
            
            if (!worldMap.isPassable(px, py)) return false;
        }
        
        return true;
    }
}

module.exports = NavigationUtils;
