/**
 * DefeatNPCsMission.js - Defeat X NPC ships
 * Phase 1 (DEPARTURE): Reach the pirate hunting ground
 * Phase 2 (COMBAT): Defeat the spawned pirates
 */

const Mission = require('./Mission');
const { NPCCombatOverlay } = require('../npc/NPCBehavior');

class DefeatNPCsMission extends Mission {
    constructor(id, playerId, targetCount, targetX = null, targetY = null) {
        super(id, 'DEFEAT_NPCS', playerId);
        this.targetCount = targetCount;
        this.defeatedCount = 0;

        // Target Location (optional override)
        this.targetX = targetX;
        this.targetY = targetY;

        // Phase management
        this.phase = 'DEPARTURE'; // 'DEPARTURE' or 'COMBAT'

        // Spawn point (calculated on first update)
        this.spawnPoint = null;
        this.spawnRadius = 150; // Player must be within 150px of spawn point

        // Target tracking
        this.targetNpcIds = new Set();

        // Reward key (centralized)
        this.rewardKey = 'MISSION.DEFEAT_NPCS';
    }

    onUpdate(world, deltaTime) {
        if (this.phase === 'DEPARTURE') {
            this.updateDeparturePhase(world);
        } else {
            this.updateCombatPhase(world);
        }
    }

    /**
     * Phase 1: Reach the pirate hunting ground
     */
    updateDeparturePhase(world) {
        const player = world.entities[this.playerId];
        if (!player) {
            this.fail();
            return;
        }

        // Fail if player becomes a raft
        if (player.isRaft) {
            this.fail();
            return;
        }

        // Calculate spawn point on first update
        if (!this.spawnPoint) {
            // Determine origin (harbor or player position)
            let startX, startY;

            if (player.dockedHarborId) {
                const harbor = world.harbors.find(h => h.id === player.dockedHarborId);
                if (harbor) {
                    startX = harbor.x;
                    startY = harbor.y;
                }
            }

            if (startX === undefined) {
                startX = player.x;
                startY = player.y;
            }

            let targetX, targetY;

            // Use pre-set target if available (from Harbor mission)
            if (this.targetX !== null && this.targetY !== null) {
                targetX = this.targetX;
                targetY = this.targetY;
            } else {
                // Pick a random direction and distance (600px if docked, 300px if at sea)
                const angle = Math.random() * Math.PI * 2;
                const distance = player.dockedHarborId ? 600 : 300;

                targetX = startX + Math.cos(angle) * distance;
                targetY = startY + Math.sin(angle) * distance;
            }

            // Validate spawn point is in deep water (away from land)
            const safePosition = world.npcManager.findDeepWaterSpawn(targetX, targetY, 300);

            if (safePosition) {
                this.spawnPoint = safePosition;
                console.log(`[DefeatNPCsMission] Spawn point set at (${Math.round(this.spawnPoint.x)}, ${Math.round(this.spawnPoint.y)})`);
            } else {
                console.warn('[DefeatNPCsMission] Could not find valid water spawn point!');
                this.fail();
            }

        }

        // Check if player reached spawn point
        const distToSpawn = Math.hypot(player.x - this.spawnPoint.x, player.y - this.spawnPoint.y);

        if (distToSpawn <= this.spawnRadius) {
            console.log(`[DefeatNPCsMission] Player reached hunting ground, transitioning to combat phase`);
            this.transitionToCombatPhase(world, player);
        }
    }

    /**
     * Transition from DEPARTURE to COMBAT phase
     */
    transitionToCombatPhase(world, player) {
        // Spawn target pirates
        let spawnedCount = 0;

        for (let i = 0; i < this.targetCount; i++) {
            // Find safe spawn for pirate near the center
            const angle = (i / this.targetCount) * Math.PI * 2;
            const dist = 300 + Math.random() * 200;

            const targetX = this.spawnPoint.x + Math.cos(angle) * dist;
            const targetY = this.spawnPoint.y + Math.sin(angle) * dist;

            const safePos = world.npcManager.findSafeSpawnPosition(targetX, targetY, 200);

            if (safePos) {
                const npc = world.npcManager.spawnPirate(safePos.x, safePos.y, this.playerId, 500);
                if (npc) {
                    this.targetNpcIds.add(npc.id);
                    spawnedCount++;
                    // Make sure they have a combat target set to player
                    npc.combatTarget = this.playerId;

                    // Disable fleeing - fight to the death!
                    npc.role = { ...npc.role, fleeThreshold: 0 };

                    console.log(`[DefeatNPCsMission] Spawned target pirate ${npc.id} at (${Math.round(safePos.x)}, ${Math.round(safePos.y)})`);
                }
            }
        }

        if (spawnedCount === 0) {
            console.error(`[DefeatNPCsMission] Failed to spawn any pirates - mission failed`);
            this.fail();
            return;
        }

        this.phase = 'COMBAT';
        console.log(`[DefeatNPCsMission] Combat phase active - ${spawnedCount} targets`);
    }

    /**
     * Phase 2: Defeat the spawned pirates
     */
    updateCombatPhase(world) {
        const player = world.entities[this.playerId];
        if (!player) {
            this.fail();
            return;
        }

        // Fail if player becomes a raft
        if (player.isRaft) {
            this.fail();
            return;
        }

        // Check status of target NPCs
        // (Note: onNPCDefeated handles the actual progress update)

        // Optional: Fail if player runs too far away? 
        // For now, let's keep it simple and just let them run if they want, 
        // but the mission won't progress.
    }

    // Called by MissionManager when NPC is destroyed
    onNPCDefeated(npcId, killerId) {
        // Only count if it's one of our targets
        if (this.targetNpcIds.has(npcId)) {
            console.log(`[DefeatNPCsMission] Target ${npcId} defeated by ${killerId}`);

            this.defeatedCount++;
            this.targetNpcIds.delete(npcId);

            console.log(`[DefeatNPCsMission] Progress: ${this.defeatedCount}/${this.targetCount}`);

            if (this.defeatedCount >= this.targetCount) {
                this.succeed();
            }
        }
    }

    getTargetPosition(world) {
        if (this.phase === 'DEPARTURE') {
            return this.spawnPoint;
        } else {
            // Point to nearest living target
            let nearest = null;
            let minDist = Infinity;

            const player = world.entities[this.playerId];
            if (!player) return this.spawnPoint;

            for (const npcId of this.targetNpcIds) {
                const npc = world.entities[npcId];
                if (npc && !npc.isRaft) {
                    const dist = Math.hypot(npc.x - player.x, npc.y - player.y);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = npc;
                    }
                }
            }

            return nearest ? { x: nearest.x, y: nearest.y } : this.spawnPoint;
        }
    }

    getDescription() {
        if (this.phase === 'DEPARTURE') {
            return `Travel to the pirate hunting ground`;
        } else {
            return `Defeat pirates (${this.defeatedCount}/${this.targetCount})`;
        }
    }

    serialize(world) {
        return {
            ...super.serialize(world),
            phase: this.phase,
            progress: `${this.defeatedCount}/${this.targetCount}`,
            spawnPoint: this.spawnPoint
        };
    }
}

module.exports = DefeatNPCsMission;
