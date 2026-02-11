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

        // Configuration: Max radius for harbor mission targets (in pixels)
        // ~15000px = ~600 tiles = reasonable travel distance
        // Can be adjusted for balancing
        this.MAX_HARBOR_MISSION_RADIUS = 15000;
    }

    // Helper: Select target harbor within radius
    selectTargetHarbor(originHarborId, maxRadius = this.MAX_HARBOR_MISSION_RADIUS) {
        const harbors = this.world.harborRegistry.getAllHarbors();
        const originHarbor = harbors.find(h => h.id === originHarborId);

        if (!originHarbor) return null;

        const { GAME } = require('../config/GameConfig');
        const originX = originHarbor.tileX * GAME.TILE_SIZE;
        const originY = originHarbor.tileY * GAME.TILE_SIZE;

        // Filter valid candidates (not origin, within radius)
        const candidates = harbors.filter(h => {
            if (h.id === originHarborId) return false;

            const targetX = h.tileX * GAME.TILE_SIZE;
            const targetY = h.tileY * GAME.TILE_SIZE;
            const distance = Math.hypot(targetX - originX, targetY - originY);

            return distance <= maxRadius;
        });

        // If no harbors within radius, select nearest
        if (candidates.length === 0) {
            let nearest = null;
            let minDist = Infinity;

            harbors.forEach(h => {
                if (h.id === originHarborId) return;

                const targetX = h.tileX * GAME.TILE_SIZE;
                const targetY = h.tileY * GAME.TILE_SIZE;
                const distance = Math.hypot(targetX - originX, targetY - originY);

                if (distance < minDist) {
                    minDist = distance;
                    nearest = h;
                }
            });

            return nearest;
        }

        // Randomly select from candidates
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        return selected;
    }

    // Helper: Calculate compass direction between two points
    getDirectionHint(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;

        // Calculate angle in radians (0 = East, PI/2 = South, PI = West, 3PI/2 = North)
        let angle = Math.atan2(dy, dx);

        // Convert to degrees (0-360)
        let degrees = (angle * 180 / Math.PI + 360) % 360;

        // Map to 8 compass directions
        if (degrees >= 337.5 || degrees < 22.5) return 'east';
        if (degrees >= 22.5 && degrees < 67.5) return 'southeast';
        if (degrees >= 67.5 && degrees < 112.5) return 'south';
        if (degrees >= 112.5 && degrees < 157.5) return 'southwest';
        if (degrees >= 157.5 && degrees < 202.5) return 'west';
        if (degrees >= 202.5 && degrees < 247.5) return 'northwest';
        if (degrees >= 247.5 && degrees < 292.5) return 'north';
        if (degrees >= 292.5 && degrees < 337.5) return 'northeast';

        return 'nearby';
    }

    // Helper: Generate mission description from template
    generateMissionDescription(missionType, harborName, direction) {
        const templates = {
            SAIL_TO_HARBOR: [
                `After the recent storm, our colony urgently needs supplies. Sail ${direction} to ${harborName}.`,
                `A courier ship must reach ${harborName}. Set sail ${direction} and deliver them safely.`,
                `Merchants await escort and goods at ${harborName}. Travel ${direction} and report in person.`
            ],
            ESCORT: [
                `A merchant vessel requires protection to ${harborName}. Escort them ${direction}.`,
                `Pirates threaten trade routes ${direction}. Guard a trader to ${harborName}.`,
                `Valuable cargo must reach ${harborName}. Provide safe passage ${direction}.`
            ],
            DEFEAT_NPCS: [
                `Pirates have been spotted ${direction} of here. Hunt them down!`,
                `A pirate fleet is gathering ${direction}. Destroy them before they attack!`,
                `We need a brave captain to clear the waters ${direction} of here.`
            ]
        };

        const templateList = templates[missionType];
        if (!templateList) return `Travel to ${harborName}`;

        const template = templateList[Math.floor(Math.random() * templateList.length)];
        return template;
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

    // Cancel active mission for player
    cancelMission(playerId) {
        const missionId = this.playerMissions.get(playerId);
        if (!missionId) return false;

        const mission = this.missions.get(missionId);
        if (!mission || mission.state !== 'ACTIVE') return false;

        console.log(`[MissionManager] Cancelling mission ${mission.id} for player ${playerId}`);

        // 1. Call mission.cancel() -> triggers onCancel() logic (cleanup listeners/NPCs)
        mission.cancel();

        // 2. Remove from tracking maps IMMEDIATELY so player can take new mission
        this.playerMissions.delete(playerId);
        this.missions.delete(missionId);

        return true;
    }

    // Update all active missions
    update(deltaTime) {
        for (const mission of this.missions.values()) {
            const previousState = mission.state;
            mission.update(this.world, deltaTime);

            // Apply rewards on success (Phase 2: Centralized)
            if (mission.state === 'SUCCESS' && !mission.rewardsGiven) {
                mission.rewardsGiven = true;

                if (mission.rewardKey) {
                    const reward = this.world.rewardSystem.grant(
                        mission.playerId,
                        mission.rewardKey,
                        { source: `Mission: ${mission.type}` }
                    );

                    // Emit mission complete event to client
                    const player = this.world.getEntity(mission.playerId);
                    if (player && player.io) {
                        console.log(`[MissionManager] Emitting missionComplete to ${player.name} (Gold: ${reward.gold}, XP: ${reward.xp})`);
                        player.io.to(player.id).emit('missionComplete', {
                            gold: reward.gold || 0,
                            xp: reward.xp || 0
                        });
                    }
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

    // Generate available missions for a harbor (Phase 1: Improved targeting and descriptions)
    generateAvailableMissions(playerId, harborId) {
        const { getReward } = require('../progression/RewardConfig');
        const { GAME } = require('../config/GameConfig');

        const missions = [];

        // Get origin harbor
        const originHarbor = this.world.harborRegistry.getAllHarbors().find(h => h.id === harborId);
        if (!originHarbor) return missions;

        const originX = originHarbor.tileX * GAME.TILE_SIZE;
        const originY = originHarbor.tileY * GAME.TILE_SIZE;

        // Mission 1: Sail to Harbor
        const targetHarbor = this.selectTargetHarbor(harborId);
        if (targetHarbor) {
            const targetX = targetHarbor.tileX * GAME.TILE_SIZE;
            const targetY = targetHarbor.tileY * GAME.TILE_SIZE;
            const direction = this.getDirectionHint(originX, originY, targetX, targetY);
            const description = this.generateMissionDescription('SAIL_TO_HARBOR', targetHarbor.name, direction);

            const reward = getReward('MISSION.SAIL_TO_HARBOR');
            missions.push({
                type: 'SAIL_TO_HARBOR',
                name: 'Sail to Harbor',
                description: description,
                reward: reward ? `${reward.gold} gold, ${reward.xp} XP` : 'Gold + XP',
                targetHarborId: targetHarbor.id,
                targetHarborName: targetHarbor.name
            });
        }

        // Mission 2: Escort Trader
        const escortTargetHarbor = this.selectTargetHarbor(harborId);
        if (escortTargetHarbor) {
            const targetX = escortTargetHarbor.tileX * GAME.TILE_SIZE;
            const targetY = escortTargetHarbor.tileY * GAME.TILE_SIZE;
            const direction = this.getDirectionHint(originX, originY, targetX, targetY);
            const description = this.generateMissionDescription('ESCORT', escortTargetHarbor.name, direction);

            const reward = getReward('MISSION.ESCORT');
            missions.push({
                type: 'ESCORT',
                name: 'Escort Trader',
                description: description,
                reward: reward ? `${reward.gold} gold, ${reward.xp} XP` : 'Gold + XP',
                targetHarborId: escortTargetHarbor.id,
                targetHarborName: escortTargetHarbor.name
            });
        }

        // Mission 3: Defeat NPCs (Pirate Hunt)
        const huntAngle = Math.random() * Math.PI * 2;
        const huntDist = 1000 + Math.random() * 1000; // 1000-2000px (adjusted per user request)
        const huntX = originX + Math.cos(huntAngle) * huntDist;
        const huntY = originY + Math.sin(huntAngle) * huntDist;

        // Find direction string from angle
        const huntDegrees = (huntAngle * 180 / Math.PI + 360) % 360;
        let huntDirection = 'nearby';
        if (huntDegrees >= 337.5 || huntDegrees < 22.5) huntDirection = 'east';
        else if (huntDegrees >= 22.5 && huntDegrees < 67.5) huntDirection = 'southeast';
        else if (huntDegrees >= 67.5 && huntDegrees < 112.5) huntDirection = 'south';
        else if (huntDegrees >= 112.5 && huntDegrees < 157.5) huntDirection = 'southwest';
        else if (huntDegrees >= 157.5 && huntDegrees < 202.5) huntDirection = 'west';
        else if (huntDegrees >= 202.5 && huntDegrees < 247.5) huntDirection = 'northwest';
        else if (huntDegrees >= 247.5 && huntDegrees < 292.5) huntDirection = 'north';
        else if (huntDegrees >= 292.5 && huntDegrees < 337.5) huntDirection = 'northeast';

        const huntDescription = this.generateMissionDescription('DEFEAT_NPCS', null, huntDirection);
        const huntReward = getReward('MISSION.DEFEAT_NPCS');

        missions.push({
            type: 'DEFEAT_NPCS',
            name: 'Pirate Hunt',
            description: huntDescription,
            reward: huntReward ? `${huntReward.gold} gold, ${huntReward.xp} XP` : 'Gold + XP',
            targetCount: 3,
            targetX: huntX,
            targetY: huntY
        });

        return missions;
    }

    // Serialize missions for client
    serializeForPlayer(playerId) {
        const mission = this.getPlayerMission(playerId);
        return mission ? mission.serialize(this.world) : null;
    }
}

module.exports = MissionManager;
