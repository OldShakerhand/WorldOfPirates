/**
 * EscortMission.js - Two-phase escort mission
 * Phase 1 (DEPARTURE): Leave harbor and reach rendezvous point
 * Phase 2 (ESCORT): Protect trader traveling to destination harbor
 */

const Mission = require('./Mission');

class EscortMission extends Mission {
    constructor(id, playerId, targetHarborId, targetHarborName, maxDistance = 800) {
        super(id, 'ESCORT', playerId);

        // Phase management
        this.phase = 'DEPARTURE'; // 'DEPARTURE' or 'ESCORT'

        // Destination
        this.targetHarborId = targetHarborId;
        this.targetHarborName = targetHarborName;
        this.maxDistance = maxDistance;

        // Spawn point (calculated on first update)
        this.spawnPoint = null;
        this.spawnRadius = 150; // Player must be within 150px of spawn point

        // Escort NPC (only in ESCORT phase)
        this.escortNpcId = null;

        // Speed matching (ESCORT phase)
        this.playerMaxSpeed = null;

        // Pirate attacks (ESCORT phase)
        this.attacksSpawned = 0;
        this.maxAttacks = 2;
        this.nextAttackProgress = 0.33;
        this.lastAttackTime = 0;
        this.MIN_ATTACK_INTERVAL = 60;

        this.rewardKey = 'MISSION.ESCORT';
    }

    onUpdate(world, deltaTime) {
        if (this.phase === 'DEPARTURE') {
            this.updateDeparturePhase(world);
        } else {
            this.updateEscortPhase(world, deltaTime);
        }
    }

    /**
     * Phase 1: Leave harbor and reach rendezvous point
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

        // Calculate spawn point on first update (600px from harbor toward destination)
        if (!this.spawnPoint) {
            // Find origin harbor (docked harbor or nearest)
            let harbor;
            if (player.dockedHarborId) {
                harbor = world.harbors.find(h => h.id === player.dockedHarborId);
            } else {
                // Player not docked (debug mission), find nearest harbor
                let minDist = Infinity;
                for (const h of world.harbors) {
                    const dist = Math.hypot(h.x - player.x, h.y - player.y);
                    if (dist < minDist) {
                        minDist = dist;
                        harbor = h;
                    }
                }
            }

            const target = world.harbors.find(h => h.id === this.targetHarborId);

            if (!harbor || !target) {
                console.error(`[EscortMission] Cannot find harbors - origin: ${harbor?.id || 'none'}, target: ${this.targetHarborId}`);
                this.fail();
                return;
            }

            const dx = target.x - harbor.x;
            const dy = target.y - harbor.y;
            const dist = Math.hypot(dx, dy);

            // Fail if target is same as origin (distance is zero)
            if (dist < 100) {
                console.error(`[EscortMission] Target harbor too close to origin (${Math.round(dist)}px)`);
                this.fail();
                return;
            }

            // Spawn distance: close to harbor if docked, close to player if debug
            const wasDocked = player.dockedHarborId !== null;
            const spawnDist = wasDocked ? 600 : 300;
            const baseX = wasDocked ? harbor.x : player.x;
            const baseY = wasDocked ? harbor.y : player.y;

            const targetX = baseX + (dx / dist) * spawnDist;
            const targetY = baseY + (dy / dist) * spawnDist;

            // Validate spawn point is in water
            const safePosition = world.npcManager.findSafeSpawnPosition(targetX, targetY, 300);

            if (!safePosition) {
                console.error(`[EscortMission] No safe spawn position found near (${Math.round(targetX)}, ${Math.round(targetY)})`);
                this.fail();
                return;
            }

            this.spawnPoint = safePosition;

            console.log(`[EscortMission] Spawn point set at (${Math.round(this.spawnPoint.x)}, ${Math.round(this.spawnPoint.y)})`);
        }

        // Check if player reached spawn point
        const distToSpawn = Math.hypot(player.x - this.spawnPoint.x, player.y - this.spawnPoint.y);

        if (distToSpawn <= this.spawnRadius) {
            console.log(`[EscortMission] Player reached spawn point, transitioning to escort phase`);
            this.transitionToEscortPhase(world, player);
        }
    }

    /**
     * Transition from DEPARTURE to ESCORT phase
     */
    transitionToEscortPhase(world, player) {
        // Validate and find safe spawn position
        const safePosition = world.npcManager.findSafeSpawnPosition(
            this.spawnPoint.x,
            this.spawnPoint.y,
            200 // Search within 200px if spawn point is on land
        );

        if (!safePosition) {
            console.error(`[EscortMission] No safe spawn position found - mission failed`);
            this.fail();
            return;
        }

        // Spawn trader at safe position
        const npc = world.npcManager.spawnTrader(
            safePosition.x,
            safePosition.y,
            this.targetHarborId,
            100 // Small radius since position is already validated
        );

        if (!npc) {
            console.error(`[EscortMission] Failed to spawn trader - mission failed`);
            this.fail();
            return;
        }

        this.escortNpcId = npc.id;
        this.phase = 'ESCORT';

        console.log(`[EscortMission] Spawned trader ${npc.id}, escort phase active`);
    }

    /**
     * Phase 2: Protect trader traveling to destination harbor
     */
    updateEscortPhase(world, deltaTime) {
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

        // Get escort NPC
        const npc = world.entities[this.escortNpcId];

        // SUCCESS CHECK: If NPC has ARRIVED intent, mission succeeds
        if (npc && npc.intent === 'ARRIVED') {
            console.log(`[EscortMission] NPC reached ${this.targetHarborName} safely`);
            this.succeed();
            return;
        }

        // Fail if NPC is destroyed or despawning
        if (!npc || npc.isRaft || npc.state === 'DESPAWNING') {
            console.log(`[EscortMission] NPC destroyed - mission failed`);
            this.fail();
            return;
        }

        // Speed matching - initialize player speed and update NPC
        if (this.playerMaxSpeed === null && player.flagship) {
            this.playerMaxSpeed = player.flagship.shipClass.maxSpeed;
            console.log(`[EscortMission] Player speed: ${this.playerMaxSpeed}, setting NPC target speed`);
        }

        if (npc && this.playerMaxSpeed && npc.flagship) {
            // Calculate speed multiplier to match 90% of player speed
            const npcBaseSpeed = npc.flagship.shipClass.maxSpeed;
            const targetSpeed = this.playerMaxSpeed * 0.9;
            npc.speedMultiplier = targetSpeed / npcBaseSpeed;

            // Clamp to reasonable range (0.5x to 1.2x)
            npc.speedMultiplier = Math.max(0.5, Math.min(1.2, npc.speedMultiplier));
        }

        // Planned pirate attacks
        if (this.attacksSpawned < this.maxAttacks) {
            const progress = this.getMissionProgress(world, npc);
            const now = Date.now() / 1000;
            const timeSinceLastAttack = now - this.lastAttackTime;

            // Safety zones: don't spawn near start (< 15%) or end (> 85%)
            if (progress >= this.nextAttackProgress &&
                progress >= 0.15 &&
                progress <= 0.85 &&
                timeSinceLastAttack >= this.MIN_ATTACK_INTERVAL) {

                this.spawnPirateAttack(world, npc, player);
                this.attacksSpawned++;
                this.lastAttackTime = now;
                this.nextAttackProgress = 0.33 + (this.attacksSpawned * 0.33); // 33%, 66%
            }
        }

        // Fail if player too far from NPC
        const distance = Math.hypot(player.x - npc.x, player.y - npc.y);
        if (distance > this.maxDistance) {
            console.log(`[EscortMission] Player too far from escort (${distance.toFixed(0)}px > ${this.maxDistance}px)`);
            this.fail();
            return;
        }
    }

    getMissionProgress(world, npc) {
        if (!npc) return 0;

        const harbor = world.harbors.find(h => h.id === this.targetHarborId);
        if (!harbor) return 0;

        const startDist = Math.hypot(npc.spawnX - harbor.x, npc.spawnY - harbor.y);
        const currentDist = Math.hypot(npc.x - harbor.x, npc.y - harbor.y);

        if (startDist === 0) return 1.0;

        return Math.max(0, Math.min(1, 1 - (currentDist / startDist)));
    }

    spawnPirateAttack(world, npc, player) {
        const harbor = world.harbors.find(h => h.id === this.targetHarborId);
        if (!harbor) return;

        const dx = harbor.x - npc.x;
        const dy = harbor.y - npc.y;
        const dist = Math.hypot(dx, dy);

        if (dist === 0) return;

        // Spawn 2 pirates per attack
        const piratesPerAttack = 2;
        let spawnedCount = 0;

        for (let i = 0; i < piratesPerAttack; i++) {
            const spawnDist = 800 + Math.random() * 400;
            const lateralOffset = (Math.random() - 0.5) * 300;

            const perpX = -dy / dist;
            const perpY = dx / dist;

            const targetX = npc.x + (dx / dist) * spawnDist + perpX * lateralOffset;
            const targetY = npc.y + (dy / dist) * spawnDist + perpY * lateralOffset;

            // Find safe spawn position
            const safePos = world.npcManager.findSafeSpawnPosition(targetX, targetY, 200);
            if (!safePos) {
                continue;
            }

            world.npcManager.spawnPirate(safePos.x, safePos.y, this.escortNpcId, 300);
            spawnedCount++;
        }

        console.log(`[EscortMission] Spawned ${spawnedCount} pirates (attack ${this.attacksSpawned + 1}/${this.maxAttacks}) at ${(this.getMissionProgress(world, npc) * 100).toFixed(0)}%`);
    }

    getTargetPosition(world) {
        if (this.phase === 'DEPARTURE') {
            return this.spawnPoint;
        } else {
            const harbor = world.harbors.find(h => h.id === this.targetHarborId);
            return harbor ? { x: harbor.x, y: harbor.y } : null;
        }
    }

    getDescription() {
        if (this.phase === 'DEPARTURE') {
            return `Leave harbor and reach the rendezvous point`;
        } else {
            return `Escort trader to ${this.targetHarborName}`;
        }
    }

    serialize(world) {
        return {
            ...super.serialize(world),
            phase: this.phase,
            escortNpcId: this.escortNpcId,
            targetHarborId: this.targetHarborId,
            maxDistance: this.maxDistance
        };
    }
}

module.exports = EscortMission;
