/**
 * SailToHarborMission.js - Reach a specific harbor
 */

const Mission = require('../Mission');

class SailToHarborMission extends Mission {
    constructor(id, playerId, targetHarborId, targetHarborName) {
        super(id, 'SAIL_TO_HARBOR', playerId);
        this.targetHarborId = targetHarborId;
        this.targetHarborName = targetHarborName || targetHarborId;

        // Rewards: Simple delivery mission (Phase 1)
        this.goldReward = 100;
        this.xpReward = 50;
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

        // Check if player is in target harbor
        if (player.inHarbor && player.dockedHarborId === this.targetHarborId) {
            this.succeed();
        }
    }

    getDescription() {
        return `Sail to ${this.targetHarborName}`;
    }
}

module.exports = SailToHarborMission;
