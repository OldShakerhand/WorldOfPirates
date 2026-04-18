const GameConfig = require('../config/GameConfig');
const { TRAFFIC } = GameConfig;

class NPCMaterializer {
    constructor(world, strategicTrafficManager, npcManager, routePlanner, options = {}) {
        this.world = world;
        this.strategicTrafficManager = strategicTrafficManager;
        this.npcManager = npcManager;
        this.routePlanner = routePlanner;
        this.intervalSeconds = options.intervalSeconds ?? TRAFFIC.MATERIALIZATION_INTERVAL;
        this.aoiRadius = options.aoiRadius ?? TRAFFIC.MATERIALIZATION_AOI_RADIUS;
        this.arrivalThreshold = options.arrivalThreshold ?? TRAFFIC.PROGRESS_SYNC_ARRIVAL_THRESHOLD;
        this.localTargetShipsPerPlayer = options.localTargetShipsPerPlayer ?? TRAFFIC.LOCAL_TARGET_SHIPS_PER_PLAYER;
        this.localSpawnDistanceMin = options.localSpawnDistanceMin ?? TRAFFIC.LOCAL_SPAWN_DISTANCE_MIN;
        this.localSpawnDistanceMax = options.localSpawnDistanceMax ?? TRAFFIC.LOCAL_SPAWN_DISTANCE_MAX;
        this.localForwardArcRadians = (options.localForwardArcDegrees ?? TRAFFIC.LOCAL_FORWARD_ARC_DEGREES) * (Math.PI / 180);
        this.localLifetimeMin = options.localLifetimeMin ?? TRAFFIC.LOCAL_LIFETIME_MIN;
        this.localLifetimeMax = options.localLifetimeMax ?? TRAFFIC.LOCAL_LIFETIME_MAX;
        this.localDespawnBuffer = options.localDespawnBuffer ?? TRAFFIC.LOCAL_DESPAWN_BUFFER;
        this.localRouteLength = options.localRouteLength ?? TRAFFIC.LOCAL_ROUTE_LENGTH;
        this.localMaxShips = options.localMaxShips ?? TRAFFIC.LOCAL_MAX_SHIPS;
        this.localCombatRetentionSeconds = options.localCombatRetentionSeconds ?? TRAFFIC.LOCAL_COMBAT_RETENTION_SECONDS;
        this.localDebugDespawns = options.localDebugDespawns ?? TRAFFIC.LOCAL_DEBUG_DESPAWNS;

        this.accumulator = 0;
        this.materializedByStrategicId = new Map();
        this.localTrafficIds = new Set();
    }

    update(deltaTime, nowSeconds = Date.now() / 1000) {
        this.accumulator += deltaTime;
        if (this.accumulator < this.intervalSeconds) {
            return;
        }

        this.accumulator = 0;

        const players = this._getRelevantPlayers();

        this._despawnExpiredLocalTraffic(players, nowSeconds);

        for (const ship of this.strategicTrafficManager.getAllShips()) {
            let npc = this._getMaterializedNPC(ship.id);

            if (npc) {
                const syncedProgress = this.strategicTrafficManager.syncMaterializedShipProgress(ship.id, npc.x, npc.y, nowSeconds);
                if (syncedProgress >= this.arrivalThreshold || npc.intent === 'ARRIVED' || npc.state === 'DESPAWNING') {
                    this._despawnShip(ship.id, nowSeconds);
                    this.strategicTrafficManager.handleArrival(ship.id, nowSeconds);
                    npc = null;
                    ship.progress = 0;
                }
            }

            const position = npc
                ? { x: npc.x, y: npc.y }
                : this.strategicTrafficManager.getShipWorldPosition(ship.id);
            const shouldMaterialize = position && players.length > 0 && this._isInsideAnyAOI(position, players);

            if (shouldMaterialize && !npc) {
                this._spawnShip(ship, position, nowSeconds);
            } else if (!shouldMaterialize && npc) {
                this._despawnShip(ship.id, nowSeconds);
            }
        }

        this._maintainLocalTraffic(players, nowSeconds);
    }

    _spawnShip(ship, position, nowSeconds) {
        const remainingRoutePoints = this.routePlanner.getRemainingRoutePoints(
            ship.originHarborId,
            ship.destinationHarborId,
            ship.routeNodes,
            ship.progress
        );

        const npc = this.npcManager.spawnStrategicShip({
            strategicShip: ship,
            x: position.x,
            y: position.y,
            routePoints: remainingRoutePoints
        });

        if (!npc) {
            return;
        }

        this.materializedByStrategicId.set(ship.id, npc.id);
        this.strategicTrafficManager.setMaterialized(ship.id, true, nowSeconds);
    }

    _despawnShip(shipId, nowSeconds) {
        const npc = this._getMaterializedNPC(shipId);
        if (npc) {
            this.strategicTrafficManager.syncMaterializedShipProgress(shipId, npc.x, npc.y, nowSeconds);
            this.npcManager.despawnNPC(npc.id);
        }

        this.materializedByStrategicId.delete(shipId);
        this.strategicTrafficManager.setMaterialized(shipId, false, nowSeconds);
    }

    _getMaterializedNPC(shipId) {
        const npcId = this.materializedByStrategicId.get(shipId);
        if (!npcId) {
            return null;
        }

        const npc = this.world.getEntity(npcId);
        if (!npc) {
            this.materializedByStrategicId.delete(shipId);
            this.strategicTrafficManager.setMaterialized(shipId, false);
            return null;
        }

        return npc;
    }

    _maintainLocalTraffic(players, nowSeconds) {
        if (players.length === 0) {
            return;
        }

        for (const player of players) {
            const visibleShips = this._countVisibleShipsForPlayer(player);
            let missingShips = Math.max(0, this.localTargetShipsPerPlayer - visibleShips);

            while (missingShips > 0 && this.localTrafficIds.size < this.localMaxShips) {
                const spawnedNpc = this._spawnLocalTraffic(player, nowSeconds);
                if (!spawnedNpc) {
                    break;
                }

                missingShips--;
            }
        }
    }

    _spawnLocalTraffic(player, nowSeconds) {
        const spawnPlan = this._buildLocalSpawnPlan(player);
        if (!spawnPlan) {
            return null;
        }

        const lifetimeSeconds = this._randomBetween(this.localLifetimeMin, this.localLifetimeMax);
        const npc = this.npcManager.spawnLocalTraffic({
            x: spawnPlan.spawnX,
            y: spawnPlan.spawnY,
            routePoints: spawnPlan.routePoints,
            lifetimeSeconds
        });

        if (npc) {
            npc.localTrafficOwnerId = player.id;
            npc.localTrafficExpiresAt = nowSeconds + lifetimeSeconds;
            this.localTrafficIds.add(npc.id);
        }

        return npc;
    }

    _buildLocalSpawnPlan(player) {
        const playerHeading = Number.isFinite(player.rotation)
            ? player.rotation - (Math.PI / 2)
            : 0;
        const spawnBearing = playerHeading + this._randomBetween(-this.localForwardArcRadians, this.localForwardArcRadians);
        const travelHeading = this._chooseLocalTravelHeading(player, playerHeading);
        const spawnDistance = this._randomBetween(this.localSpawnDistanceMin, this.localSpawnDistanceMax);
        const spawnX = player.x + Math.cos(spawnBearing) * spawnDistance;
        const spawnY = player.y + Math.sin(spawnBearing) * spawnDistance;

        if (this.world.worldMap.isLand(spawnX, spawnY)) {
            return null;
        }

        const routeLength = this._randomBetween(this.localRouteLength * 0.75, this.localRouteLength);
        const midX = spawnX + Math.cos(travelHeading) * (routeLength * 0.5);
        const midY = spawnY + Math.sin(travelHeading) * (routeLength * 0.5);
        const endX = spawnX + Math.cos(travelHeading) * routeLength;
        const endY = spawnY + Math.sin(travelHeading) * routeLength;

        if (this.world.worldMap.isLand(endX, endY) || this.world.worldMap.isLand(midX, midY)) {
            return null;
        }

        return {
            spawnX,
            spawnY,
            routePoints: [
                { x: midX, y: midY },
                { x: endX, y: endY }
            ]
        };
    }

    _chooseLocalTravelHeading(player, playerHeading) {
        const laneHeadings = this._getLaneHeadingCandidates(player);
        if (laneHeadings.length === 0) {
            return playerHeading + this._randomBetween(-Math.PI / 2, Math.PI / 2);
        }

        const buckets = {
            crossing: [],
            oncoming: [],
            sameLane: []
        };

        for (const laneHeading of laneHeadings) {
            const relativeAngle = this._normalizeAngle(laneHeading - playerHeading);
            const absRelativeAngle = Math.abs(relativeAngle);

            if (absRelativeAngle >= Math.PI * 0.65) {
                buckets.oncoming.push(laneHeading);
            } else if (absRelativeAngle >= Math.PI / 4) {
                buckets.crossing.push(laneHeading);
            } else {
                buckets.sameLane.push(laneHeading);
            }
        }

        const roll = Math.random();
        let pool;
        if (buckets.crossing.length > 0 && roll < 0.5) {
            pool = buckets.crossing;
        } else if (buckets.oncoming.length > 0 && roll < 0.85) {
            pool = buckets.oncoming;
        } else if (buckets.sameLane.length > 0) {
            pool = buckets.sameLane;
        } else if (buckets.crossing.length > 0) {
            pool = buckets.crossing;
        } else {
            pool = buckets.oncoming;
        }

        const laneHeading = pool[Math.floor(Math.random() * pool.length)];
        const localVariance = this._randomBetween(-Math.PI / 12, Math.PI / 12);
        return laneHeading + localVariance;
    }

    _getLaneHeadingCandidates(player) {
        if (!this.world.waypointGraph || typeof this.world.waypointGraph.getNearestWaypointId !== 'function') {
            return [];
        }

        const nearestWaypointId = this.world.waypointGraph.getNearestWaypointId(player.x, player.y);
        if (!nearestWaypointId) {
            return [];
        }

        const nearestNode = this.world.waypointGraph.nodes.get(nearestWaypointId);
        if (!nearestNode) {
            return [];
        }

        const headings = [];
        const neighbors = this.world.waypointGraph.getConnectedNodes(nearestWaypointId);

        for (const neighbor of neighbors) {
            const dx = neighbor.x - nearestNode.x;
            const dy = neighbor.y - nearestNode.y;
            const length = Math.hypot(dx, dy);
            if (length <= 0) {
                continue;
            }

            const heading = Math.atan2(dy, dx);
            headings.push(heading);
            headings.push(this._normalizeAngle(heading + Math.PI));
        }

        return headings;
    }

    _countVisibleShipsForPlayer(player) {
        let count = 0;

        for (const entity of Object.values(this.world.entities)) {
            if (entity.type !== 'NPC') {
                continue;
            }

            const distance = Math.hypot(entity.x - player.x, entity.y - player.y);
            if (distance <= this.aoiRadius) {
                count++;
            }
        }

        return count;
    }

    _despawnExpiredLocalTraffic(players, nowSeconds) {
        for (const npcId of Array.from(this.localTrafficIds)) {
            const npc = this.world.getEntity(npcId);
            if (!npc) {
                this.localTrafficIds.delete(npcId);
                continue;
            }

            const expired = npc.localTrafficExpiresAt > 0 && nowSeconds >= npc.localTrafficExpiresAt;
            const insideAOI = this._isInsideAnyAOI(npc, players);
            const outsidePlayerRange = !this._isInsideAnyBufferedAOI(npc, players);
            const shouldRetainForCombat = this._shouldRetainLocalTrafficForCombat(npc, nowSeconds);
            const nearestPlayerDistance = this._getNearestPlayerDistance(npc, players);

            // Local traffic should never disappear while it's still clearly present
            // around players, and combat should keep it alive a bit longer.
            if ((expired && !insideAOI && !shouldRetainForCombat) || outsidePlayerRange) {
                if (this.localDebugDespawns) {
                    const reasons = [];
                    if (expired && !insideAOI && !shouldRetainForCombat) {
                        reasons.push('expired_outside_aoi');
                    }
                    if (outsidePlayerRange) {
                        reasons.push('outside_buffer');
                    }

                    console.log(
                        `[LocalTraffic] Despawning ${npc.id} | reason=${reasons.join('+')} | dist=${nearestPlayerDistance.toFixed(0)} | insideAOI=${insideAOI} | outsideBuffer=${outsidePlayerRange} | retainCombat=${shouldRetainForCombat} | expiresIn=${npc.localTrafficExpiresAt > 0 ? (npc.localTrafficExpiresAt - nowSeconds).toFixed(1) : 'n/a'}`
                    );
                }
                this.npcManager.despawnNPC(npcId);
                this.localTrafficIds.delete(npcId);
            }
        }
    }

    _getRelevantPlayers() {
        return Object.values(this.world.entities).filter(entity => entity.type === 'PLAYER');
    }

    _isInsideAnyAOI(position, players) {
        for (const player of players) {
            const distance = Math.hypot(player.x - position.x, player.y - position.y);
            if (distance <= this.aoiRadius) {
                return true;
            }
        }

        return false;
    }

    _isInsideAnyBufferedAOI(position, players) {
        const bufferedRadius = this.aoiRadius + this.localDespawnBuffer;

        for (const player of players) {
            const distance = Math.hypot(player.x - position.x, player.y - position.y);
            if (distance <= bufferedRadius) {
                return true;
            }
        }

        return false;
    }

    _randomBetween(min, max) {
        return min + (Math.random() * (max - min));
    }

    _normalizeAngle(angle) {
        while (angle > Math.PI) {
            angle -= Math.PI * 2;
        }
        while (angle < -Math.PI) {
            angle += Math.PI * 2;
        }

        return angle;
    }

    _shouldRetainLocalTrafficForCombat(npc, nowSeconds) {
        const lastCombatTime = Math.max(
            npc.lastDamageTime || 0,
            npc.lastAttackTime || 0
        );

        if (lastCombatTime > 0 && (nowSeconds - lastCombatTime) <= this.localCombatRetentionSeconds) {
            return true;
        }

        if (npc.combat && npc.combat.active) {
            return true;
        }

        if (npc.combatTarget) {
            return true;
        }

        return false;
    }

    _getNearestPlayerDistance(position, players) {
        let nearestDistance = Infinity;

        for (const player of players) {
            const distance = Math.hypot(player.x - position.x, player.y - position.y);
            if (distance < nearestDistance) {
                nearestDistance = distance;
            }
        }

        return Number.isFinite(nearestDistance) ? nearestDistance : -1;
    }
}

module.exports = NPCMaterializer;
