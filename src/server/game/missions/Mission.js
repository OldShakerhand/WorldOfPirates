/**
 * Mission.js - Base class for all mission types
 * Phase 0: Minimal scaffolding for temporary session-based missions
 */

class Mission {
    constructor(id, type, playerId) {
        this.id = id;                    // Unique mission ID
        this.type = type;                // Mission type (e.g., 'SAIL_TO_HARBOR')
        this.playerId = playerId;        // Assigned player
        this.state = 'INACTIVE';         // INACTIVE, ACTIVE, SUCCESS, FAILED
        this.startTime = null;
        this.endTime = null;

        // Reward key (Phase 2: Centralized rewards)
        // Subclasses MUST set this to a valid RewardConfig key
        // e.g., "MISSION.ESCORT", "MISSION.SAIL_TO_HARBOR"
        this.rewardKey = null;

        // FUTURE: Item rewards
        // this.itemRewards = [];  // e.g., ['map_fragment', 'rare_cargo']

        // FUTURE: Reputation
        // this.reputationReward = { faction: 'PIRATES', amount: 10 };
    }

    // Lifecycle
    start() {
        this.state = 'ACTIVE';
        this.startTime = Date.now();
        this.onStart();
    }

    // Called every game tick (60Hz)
    update(world, deltaTime) {
        if (this.state !== 'ACTIVE') return;
        this.onUpdate(world, deltaTime);
    }

    succeed() {
        if (this.state !== 'ACTIVE') return;
        this.state = 'SUCCESS';
        this.endTime = Date.now();
        console.log(`[Mission] ${this.type} SUCCESS for player ${this.playerId}`);
        this.onSuccess();
    }

    fail() {
        if (this.state !== 'ACTIVE') return;
        this.state = 'FAILED';
        this.endTime = Date.now();
        console.log(`[Mission] ${this.type} FAILED for player ${this.playerId}`);
        this.onFail();
    }

    // Subclass hooks
    onStart() { }
    onUpdate(world, deltaTime) { }
    onSuccess() { }
    onFail() { }

    // Serialization for client
    serialize() {
        return {
            id: this.id,
            type: this.type,
            state: this.state,
            description: this.getDescription(),
            rewardKey: this.rewardKey  // Client can look up preview if needed
        };
    }

    getDescription() {
        return 'Mission description';
    }
}

module.exports = Mission;
