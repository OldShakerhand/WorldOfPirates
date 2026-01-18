/**
 * DefeatNPCsMission.js - Defeat X NPC ships
 */

const Mission = require('../Mission');

class DefeatNPCsMission extends Mission {
    constructor(id, playerId, targetCount) {
        super(id, 'DEFEAT_NPCS', playerId);
        this.targetCount = targetCount;
        this.defeatedCount = 0;

        // Rewards: Combat mission (higher rewards) (Phase 1)
        this.goldReward = 200;
        this.xpReward = 100;
    }

    // Called by MissionManager when NPC is destroyed
    onNPCDefeated(npcId, killerId) {
        console.log(`[DefeatNPCsMission] onNPCDefeated called - NPC: ${npcId}, Killer: ${killerId}, Mission Player: ${this.playerId}, State: ${this.state}`);

        if (killerId === this.playerId && this.state === 'ACTIVE') {
            this.defeatedCount++;
            console.log(`[Mission] Player ${this.playerId} defeated NPC (${this.defeatedCount}/${this.targetCount})`);
            if (this.defeatedCount >= this.targetCount) {
                this.succeed();
            }
        }
    }

    onUpdate(world, deltaTime) {
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
    }

    getDescription() {
        return `Defeat NPCs (${this.defeatedCount}/${this.targetCount})`;
    }

    serialize() {
        return {
            ...super.serialize(),
            progress: `${this.defeatedCount}/${this.targetCount}`
        };
    }
}

module.exports = DefeatNPCsMission;
