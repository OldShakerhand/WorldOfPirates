/**
 * MissionManager.js - Manages mission lifecycle and assignment
 * Phase 0: One mission per player, manual assignment only
 */

class MissionManager {
    constructor(world) {
        this.world = world;
        this.missions = new Map(); // missionId -> Mission
        this.playerMissions = new Map(); // playerId -> missionId
        this.nextMissionId = 1;
    }

    // Create and assign mission to player
    assignMission(playerId, mission) {
        // Only one active mission per player in Phase 0
        const existingMissionId = this.playerMissions.get(playerId);
        if (existingMissionId) {
            const existing = this.missions.get(existingMissionId);
            if (existing && existing.state === 'ACTIVE') {
                console.log(`[MissionManager] Player ${playerId} already has active mission`);
                return null; // Player already has active mission
            }
        }

        mission.id = `mission_${this.nextMissionId++}`;
        this.missions.set(mission.id, mission);
        this.playerMissions.set(playerId, mission.id);
        mission.start();

        console.log(`[MissionManager] Assigned ${mission.type} to player ${playerId}`);
        return mission;
    }

    // Update all active missions
    update(deltaTime) {
        for (const mission of this.missions.values()) {
            const previousState = mission.state;
            mission.update(this.world, deltaTime);

            // Apply rewards on success (Phase 2: Centralized)
            if (previousState === 'ACTIVE' && mission.state === 'SUCCESS') {
                if (mission.rewardKey) {
                    this.world.rewardSystem.grant(
                        mission.playerId,
                        mission.rewardKey,
                        { source: `Mission: ${mission.type}` }
                    );
                }
            }

            // Clean up completed missions (Phase 0: Auto-clear after 3 seconds)
            if (mission.state === 'SUCCESS' || mission.state === 'FAILED') {
                const timeSinceEnd = Date.now() - mission.endTime;
                if (timeSinceEnd > 3000) { // 3 seconds after completion
                    console.log(`[MissionManager] Clearing completed mission ${mission.id} (${mission.state})`);
                    this.playerMissions.delete(mission.playerId);
                    this.missions.delete(mission.id);
                }
            }
        }
    }

    // Get player's current mission
    getPlayerMission(playerId) {
        const missionId = this.playerMissions.get(playerId);
        return missionId ? this.missions.get(missionId) : null;
    }

    // Event handlers for mission triggers
    onNPCDefeated(npcId, killerId) {
        console.log(`[MissionManager] onNPCDefeated called - NPC: ${npcId}, Killer: ${killerId}`);

        for (const mission of this.missions.values()) {
            if (mission.type === 'DEFEAT_NPCS' && typeof mission.onNPCDefeated === 'function') {
                mission.onNPCDefeated(npcId, killerId);
            }
        }
    }

    // Serialize missions for client
    serializeForPlayer(playerId) {
        const mission = this.getPlayerMission(playerId);
        return mission ? mission.serialize() : null;
    }
}

module.exports = MissionManager;
