/**
 * StayInAreaMission.js - Stay in a specific area for X seconds
 */

const Mission = require('../Mission');

class StayInAreaMission extends Mission {
    constructor(id, playerId, targetX, targetY, radius, duration) {
        super(id, 'STAY_IN_AREA', playerId);
        this.targetX = targetX;
        this.targetY = targetY;
        this.radius = radius;
        this.duration = duration; // seconds
        this.timeInArea = 0;
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

        const dx = player.x - this.targetX;
        const dy = player.y - this.targetY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= this.radius) {
            this.timeInArea += deltaTime;
            if (this.timeInArea >= this.duration) {
                this.succeed();
            }
        } else {
            this.timeInArea = 0; // Reset if player leaves
        }
    }

    getDescription() {
        const remaining = Math.max(0, this.duration - this.timeInArea);
        return `Stay in area (${remaining.toFixed(1)}s remaining)`;
    }

    serialize() {
        return {
            ...super.serialize(),
            progress: `${this.timeInArea.toFixed(1)}/${this.duration}s`,
            targetX: this.targetX,
            targetY: this.targetY,
            radius: this.radius
        };
    }
}

module.exports = StayInAreaMission;
