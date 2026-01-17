const NPCShip = require('./NPCShip');
const GameConfig = require('./GameConfig');
const CombatConfig = require('./CombatConfig');

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
     * @param {number} spawnRadius - How far from position to spawn (default 500)
     * @returns {NPCShip} The spawned NPC
     */
    spawnTrader(nearX, nearY, spawnRadius = 500) {
        // Generate spawn position (offset from player)
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * (spawnRadius - 200); // Min 200px away
        const spawnX = nearX + Math.cos(angle) * distance;
        const spawnY = nearY + Math.sin(angle) * distance;

        // Find nearest harbor as target
        const targetHarbor = this.findNearestHarbor(spawnX, spawnY);
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
     * Spawn a pirate NPC near a given position
     * @param {number} nearX - X coordinate to spawn near
     * @param {number} nearY - Y coordinate to spawn near
     * @param {string} targetPlayerId - Player ID to attack
     * @param {number} spawnRadius - How far from position to spawn (default 500)
     * @returns {NPCShip} The spawned pirate NPC
     */
    spawnPirate(nearX, nearY, targetPlayerId, spawnRadius = 500) {
        // Generate spawn position (offset from player)
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * (spawnRadius - 200); // Min 200px away
        const spawnX = nearX + Math.cos(angle) * distance;
        const spawnY = nearY + Math.sin(angle) * distance;

        // Create pirate NPC
        const npcId = `npc_pirate_${this.npcIdCounter++}`;
        const npc = new NPCShip(npcId, spawnX, spawnY, null, 'PIRATE');
        npc.world = this.world; // Give NPC access to world for mission hooks

        // Set combat target
        npc.combatTarget = targetPlayerId;

        // Register NPC
        this.npcs.set(npcId, npc);
        this.world.addEntity(npc);

        console.log(`[NPCManager] Spawned pirate ${npcId} at (${Math.round(spawnX)}, ${Math.round(spawnY)}) targeting ${targetPlayerId}`);

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
