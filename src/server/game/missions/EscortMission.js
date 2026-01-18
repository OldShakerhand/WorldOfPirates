/**
 * EscortMission.js - Protect an NPC trader while it travels to a harbor
 */

const Mission = require('../Mission');

class EscortMission extends Mission {
    constructor(id, playerId, escortNpcId, targetHarborId, targetHarborName, maxDistance) {
        super(id, 'ESCORT', playerId);
        this.escortNpcId = escortNpcId;      // NPC to protect
        this.targetHarborId = targetHarborId; // Destination
        this.targetHarborName = targetHarborName || targetHarborId;
        this.maxDistance = maxDistance || 800; // Max distance before fail

        // Rewards: Complex mission (highest rewards) (Phase 1)
        this.goldReward = 300;
        this.xpReward = 150;
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

        // Get escort NPC
        const npc = world.entities[this.escortNpcId];

        // SUCCESS CHECK FIRST: If NPC has ARRIVED intent, mission succeeds
        // NPCs set intent to 'ARRIVED' when they reach their destination harbor
        // This is explicit and unambiguous - no distance checks needed
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

        // Fail if player too far from NPC
        const distance = Math.hypot(player.x - npc.x, player.y - npc.y);
        if (distance > this.maxDistance) {
            console.log(`[EscortMission] Player too far from escort (${distance.toFixed(0)}px > ${this.maxDistance}px)`);
            this.fail();
            return;
        }
    }

    getDescription() {
        return `Escort trader to ${this.targetHarborName}`;
    }

    serialize() {
        return {
            ...super.serialize(),
            escortNpcId: this.escortNpcId,
            targetHarborId: this.targetHarborId,
            maxDistance: this.maxDistance
        };
    }
}

module.exports = EscortMission;
