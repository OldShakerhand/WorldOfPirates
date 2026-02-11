const NPCShip = require('./NPCShip');
const GameConfig = require('../config/GameConfig');
const { GAME, COMBAT } = GameConfig;

/**
 * NPCManager - Handles NPC lifecycle and spawning
 * 
 * Responsibilities:
 * - Spawn NPCs near players
 * - Update NPC AI state machines
 * - Despawn NPCs when needed
 * - Manage NPC registry
 * 
 * NOT responsible for:
 * - NPC movement/physics (handled by NPCShip.update)
 * - Collision detection (handled by World/WorldMap)
 */
class NPCManager {
    constructor(world) {
        this.world = world;
        this.npcs = new Map(); // id -> NPCShip
        this.npcIdCounter = 0;
    }

    /**
     * Spawn a trader NPC near a given position
     * @param {number} nearX - X coordinate to spawn near
     * @param {number} nearY - Y coordinate to spawn near
     * @param {string} targetHarborId - Optional target harbor ID (if not provided, finds nearest)
     * @param {number} spawnRadius - How far from position to spawn (default 500)
     * @returns {NPCShip} The spawned NPC
     */
    spawnTrader(nearX, nearY, targetHarborId = null, spawnRadius = 500) {
        // Generate spawn position (offset from player)
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * (spawnRadius - 200); // Min 200px away
        const spawnX = nearX + Math.cos(angle) * distance;
        const spawnY = nearY + Math.sin(angle) * distance;

        // Use provided target harbor or find nearest
        let targetHarbor;
        if (targetHarborId) {
            targetHarbor = this.world.harbors.find(h => h.id === targetHarborId);
            if (!targetHarbor) {
                console.warn(`[NPCManager] Target harbor ${targetHarborId} not found, finding nearest`);
                targetHarbor = this.findNearestHarbor(spawnX, spawnY);
            }
        } else {
            targetHarbor = this.findNearestHarbor(spawnX, spawnY);
        }

        if (!targetHarbor) {
            console.warn('[NPCManager] No harbors available, cannot spawn NPC');
            return null;
        }

        // Create NPC
        const npcId = `npc_trader_${this.npcIdCounter++}`;
        const npc = new NPCShip(npcId, spawnX, spawnY, targetHarbor.id, 'TRADER');
        npc.world = this.world; // Give NPC access to world for mission hooks

        // Register NPC
        this.npcs.set(npcId, npc);
        this.world.addEntity(npc);

        console.log(`[NPCManager] Spawned ${npcId} at (${Math.round(spawnX)}, ${Math.round(spawnY)}) targeting ${targetHarbor.name}`);

        return npc;
    }

    /**
     * Find a safe spawn position in navigable water
     * @param {number} targetX - Desired X coordinate
     * @param {number} targetY - Desired Y coordinate
     * @param {number} searchRadius - Search radius if target is on land (default 200px)
     * @returns {{ x: number, y: number } | null} Safe position or null if none found
     */
    findSafeSpawnPosition(targetX, targetY, searchRadius = 200) {
        // Check if target position is already valid
        if (!this.world.worldMap.isLand(targetX, targetY)) {
            return { x: targetX, y: targetY };
        }

        // Target is on land, search nearby for valid water
        const searchSteps = 8; // Check 8 directions
        const stepSize = searchRadius / 4; // Check at 25%, 50%, 75%, 100% of radius

        for (let radiusStep = 1; radiusStep <= 4; radiusStep++) {
            const currentRadius = stepSize * radiusStep;

            for (let i = 0; i < searchSteps; i++) {
                const angle = (i / searchSteps) * Math.PI * 2;
                const testX = targetX + Math.cos(angle) * currentRadius;
                const testY = targetY + Math.sin(angle) * currentRadius;

                if (!this.world.worldMap.isLand(testX, testY)) {
                    console.log(`[NPCManager] Found safe spawn at (${Math.round(testX)}, ${Math.round(testY)}) - ${Math.round(currentRadius)}px from target`);
                    return { x: testX, y: testY };
                }
            }
        }

        console.warn(`[NPCManager] No safe spawn position found near (${Math.round(targetX)}, ${Math.round(targetY)})`);
        return null;
    }

    /**
     * Find a safe, open-water spawn position (away from land)
     * Not just "not land", but "Deep Water" and with a buffer from land.
     * @param {number} targetX - Desired X coordinate
     * @param {number} targetY - Desired Y coordinate
     * @param {number} bufferRadius - Buffer distance from land (default 300)
     * @returns {{ x: number, y: number } | null} Safe position or null if none found
     */
    findDeepWaterSpawn(targetX, targetY, bufferRadius = 300) {
        // Helper to check if a point is "good" (Deep water)
        const isGoodWater = (x, y) => {
            return this.world.worldMap.isWater(x, y); // Strictly DEEP water
        };

        // Helper to check if area around point is clear of land
        const isAreaClear = (cx, cy, radius) => {
            const steps = 8;
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const tx = cx + Math.cos(angle) * radius;
                const ty = cy + Math.sin(angle) * radius;
                // Ensure no land nearby (shallow is okay for buffer, but not land)
                if (this.world.worldMap.isLand(tx, ty)) return false;
            }
            return true;
        };

        // 1. Check target point first
        if (isGoodWater(targetX, targetY) && isAreaClear(targetX, targetY, bufferRadius)) {
            return { x: targetX, y: targetY };
        }

        // 2. Search nearby (expanding rings) - Larger search due to increased mission distance
        const searchRadius = 1000;
        const rings = 5;

        for (let ring = 1; ring <= rings; ring++) {
            const currentRadius = (searchRadius / rings) * ring;
            const steps = Math.max(8, ring * 4); // Increase steps for outer rings

            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const testX = targetX + Math.cos(angle) * currentRadius;
                const testY = targetY + Math.sin(angle) * currentRadius;

                if (isGoodWater(testX, testY) && isAreaClear(testX, testY, bufferRadius)) {
                    // Start search from random angle to avoid directional bias? No, deterministic is fine for now.
                    // Actually, let's randomize start index? No need.

                    console.log(`[NPCManager] Found deep water spawn at (${Math.round(testX)}, ${Math.round(testY)})`);
                    return { x: testX, y: testY };
                }
            }
        }

        console.warn(`[NPCManager] No deep water spawn found near (${Math.round(targetX)}, ${Math.round(targetY)})`);
        // Fallback to "safe spawn" (just !land) if rigorous check fails
        return this.findSafeSpawnPosition(targetX, targetY, searchRadius);
    }

    /**
     * Spawn a hostile pirate NPC
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} targetId - Entity ID to attack
     * @param {number} aggroRange - Combat engagement range
     * @returns {NPCShip} The spawned pirate
     */
    spawnPirate(x, y, targetId, aggroRange = 300) {
        // Use provided coordinates directly (caller handles positioning and validation)
        const spawnX = x;
        const spawnY = y;

        // Create pirate NPC
        const npcId = `npc_pirate_${this.npcIdCounter++}`;
        const npc = new NPCShip(npcId, spawnX, spawnY, null, 'PIRATE');
        npc.world = this.world; // Give NPC access to world for mission hooks

        // Set combat target
        npc.combatTarget = targetId;

        console.log(`[NPCManager] Spawned pirate ${npcId} at (${Math.round(spawnX)}, ${Math.round(spawnY)})`);
        console.log(`[NPCManager]   → Target assigned: ${targetId} (type: ${this.world.entities[targetId]?.type}, role: ${this.world.entities[targetId]?.roleName})`);

        // Register NPC
        this.npcs.set(npcId, npc);
        this.world.addEntity(npc);

        return npc;
    }

    /**
     * Find nearest harbor to a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Harbor|null} Nearest harbor or null
     */
    findNearestHarbor(x, y) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const harbor of this.world.harbors) {
            const dist = Math.hypot(harbor.x - x, harbor.y - y);
            if (dist < nearestDist) {
                nearest = harbor;
                nearestDist = dist;
            }
        }

        return nearest;
    }

    /**
     * Update all NPCs
     * Called from World.update() BEFORE entity movement
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update AI for all NPCs
        for (const [npcId, npc] of this.npcs) {
            // Update AI state machine (computes inputs)
            npc.updateAI(deltaTime, this.world);

            // Check if NPC should be despawned
            if (npc.state === 'DESPAWNING') {
                this.despawnNPC(npcId);
            }
        }
    }

    /**
     * Despawn an NPC
     * @param {string} npcId - ID of NPC to despawn
     */
    despawnNPC(npcId) {
        const npc = this.npcs.get(npcId);
        if (!npc) {
            console.warn(`[NPCManager] Tried to despawn non-existent NPC: ${npcId}`);
            return;
        }

        // Remove from world entities
        this.world.removeEntity(npcId);

        // Remove from NPC registry
        this.npcs.delete(npcId);

        console.log(`[NPCManager] Despawned ${npcId}`);
    }

    /**
     * Despawn all NPCs (for cleanup/testing)
     */
    despawnAll() {
        const npcIds = Array.from(this.npcs.keys());
        for (const npcId of npcIds) {
            this.despawnNPC(npcId);
        }
        console.log(`[NPCManager] Despawned all NPCs (${npcIds.length} total)`);
    }

    /**
     * Get NPC count
     * @returns {number} Number of active NPCs
     */
    getNPCCount() {
        return this.npcs.size;
    }

    /**
     * Get all NPC IDs
     * @returns {string[]} Array of NPC IDs
     */
    getNPCIds() {
        return Array.from(this.npcs.keys());
    }
}

module.exports = NPCManager;
