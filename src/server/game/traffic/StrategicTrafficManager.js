const GameConfig = require('../config/GameConfig');
const { TRAFFIC } = GameConfig;
const {
    getRegionProfileForHarbor,
    chooseShipTypeForRegion,
    chooseTrafficRoleForRegion,
    generateUniqueShipName
} = require('../npc/RegionProfiles');

class StrategicTrafficManager {
    constructor(routePlanner, harborRegistry, options = {}) {
        this.routePlanner = routePlanner;
        this.harborRegistry = harborRegistry;
        this.maxStrategicShips = options.maxStrategicShips || TRAFFIC.STRATEGIC_MAX_SHIPS;
        this.minActiveRoutes = options.minActiveRoutes || TRAFFIC.STRATEGIC_MIN_ACTIVE_ROUTES;
        this.maxActiveRoutes = options.maxActiveRoutes || TRAFFIC.STRATEGIC_MAX_ACTIVE_ROUTES;
        this.minStrategicShips = options.minStrategicShips || TRAFFIC.STRATEGIC_MIN_SHIPS;
        this.maxStrategicShipsAbsolute = options.maxStrategicShipsAbsolute || TRAFFIC.STRATEGIC_MAX_SHIPS_ABSOLUTE;
        this.minRouteDistance = options.minRouteDistance || TRAFFIC.MIN_ROUTE_DISTANCE;

        this.strategicShips = new Map();
        this.materializedShips = new Set();
        this.shipIdCounter = 0;
        this.initialized = false;
        this.harborMap = new Map();

        for (const harbor of this.harborRegistry.getAllHarbors()) {
            this.harborMap.set(harbor.id, harbor);
        }
    }

    initializeTraffic(nowSeconds = Date.now() / 1000) {
        if (this.initialized) {
            return;
        }

        const candidates = this._selectActiveRoutes();
        if (candidates.length === 0) {
            console.warn('[StrategicTrafficManager] No viable harbor routes found for startup traffic');
            this.initialized = true;
            return;
        }

        const targetShipCount = Math.min(
            this.maxStrategicShipsAbsolute,
            Math.max(this.minStrategicShips, Math.min(this.maxStrategicShips, candidates.length * 3))
        );

        const baseShipsPerRoute = Math.max(1, Math.floor(targetShipCount / candidates.length));
        let remainder = targetShipCount - (baseShipsPerRoute * candidates.length);

        for (const candidate of candidates) {
            let shipsForRoute = baseShipsPerRoute;
            if (remainder > 0) {
                shipsForRoute++;
                remainder--;
            }

            for (let i = 0; i < shipsForRoute; i++) {
                const seed = `${candidate.originHarborId}:${candidate.destinationHarborId}:${i}`;
                const reverseDirection = i % 2 === 1;
                const progress = 0.1 + this._hashToUnit(seed) * 0.8;
                const speed = 92 + Math.round(this._hashToUnit(`${seed}:speed`) * 18);
                const referenceHarborId = reverseDirection
                    ? candidate.destinationHarborId
                    : candidate.originHarborId;
                const regionProfile = getRegionProfileForHarbor(this.harborMap.get(referenceHarborId));
                const trafficType = chooseTrafficRoleForRegion(regionProfile, () => this._hashToUnit(`${seed}:role`));

                const originHarborId = reverseDirection
                    ? candidate.destinationHarborId
                    : candidate.originHarborId;
                const destinationHarborId = reverseDirection
                    ? candidate.originHarborId
                    : candidate.destinationHarborId;
                const routeNodes = reverseDirection
                    ? [...candidate.route.nodeRoute].reverse()
                    : [...candidate.route.nodeRoute];

                const ship = {
                    id: `strategic_ship_${this.shipIdCounter++}`,
                    type: trafficType,
                    originHarborId,
                    destinationHarborId,
                    routeNodes,
                    progress,
                    speed,
                    lastUpdateTime: nowSeconds,
                    routeDistance: candidate.route.totalDistance,
                    regionId: regionProfile.id,
                    shipClassName: chooseShipTypeForRegion(regionProfile, trafficType, () => this._hashToUnit(`${seed}:ship`)),
                    shipName: generateUniqueShipName(regionProfile)
                };

                this.strategicShips.set(ship.id, ship);
            }
        }

        console.log(
            `[StrategicTrafficManager] Initialized ${this.strategicShips.size} strategic ships across ${candidates.length} routes`
        );

        this.initialized = true;
    }

    update(nowSeconds = Date.now() / 1000) {
        for (const ship of this.strategicShips.values()) {
            if (this.materializedShips.has(ship.id)) {
                ship.lastUpdateTime = nowSeconds;
                continue;
            }

            const deltaTime = Math.max(0, nowSeconds - ship.lastUpdateTime);
            ship.lastUpdateTime = nowSeconds;

            if (deltaTime <= 0 || ship.routeDistance <= 0) {
                continue;
            }

            this._advanceShipByDistance(ship, ship.speed * deltaTime, nowSeconds);
        }
    }

    getAllShips() {
        return Array.from(this.strategicShips.values());
    }

    getShip(shipId) {
        return this.strategicShips.get(shipId) || null;
    }

    setMaterialized(shipId, isMaterialized, nowSeconds = Date.now() / 1000) {
        if (isMaterialized) {
            this.materializedShips.add(shipId);
        } else {
            this.materializedShips.delete(shipId);
        }

        const ship = this.strategicShips.get(shipId);
        if (ship) {
            ship.lastUpdateTime = nowSeconds;
        }
    }

    getShipWorldPosition(shipId) {
        const ship = this.getShip(shipId);
        if (!ship) {
            return null;
        }

        return this.routePlanner.samplePositionOnRoute(
            ship.originHarborId,
            ship.destinationHarborId,
            ship.routeNodes,
            ship.progress
        );
    }

    syncMaterializedShipProgress(shipId, x, y, nowSeconds = Date.now() / 1000) {
        const ship = this.getShip(shipId);
        if (!ship) {
            return null;
        }

        ship.progress = this.routePlanner.projectPositionToRouteProgress(
            ship.originHarborId,
            ship.destinationHarborId,
            ship.routeNodes,
            x,
            y
        );
        ship.lastUpdateTime = nowSeconds;
        return ship.progress;
    }

    handleArrival(shipId, nowSeconds = Date.now() / 1000, overflowDistance = 0) {
        const ship = this.getShip(shipId);
        if (!ship) {
            return;
        }

        const previousOrigin = ship.originHarborId;
        ship.originHarborId = ship.destinationHarborId;
        ship.destinationHarborId = previousOrigin;
        ship.routeNodes = [...ship.routeNodes].reverse();
        ship.progress = 0;
        ship.lastUpdateTime = nowSeconds;

        if (overflowDistance > 0 && ship.routeDistance > 0) {
            this._advanceShipByDistance(ship, overflowDistance, nowSeconds);
        }
    }

    _advanceShipByDistance(ship, distance, nowSeconds) {
        let remainingDistance = distance;

        while (remainingDistance > 0 && ship.routeDistance > 0) {
            const distanceToDestination = (1 - ship.progress) * ship.routeDistance;

            if (remainingDistance < distanceToDestination) {
                ship.progress += remainingDistance / ship.routeDistance;
                remainingDistance = 0;
            } else {
                remainingDistance -= distanceToDestination;
                this.handleArrival(ship.id, nowSeconds, 0);
            }
        }
    }

    _selectActiveRoutes() {
        const harbors = this.harborRegistry.getAllHarbors();
        const candidates = [];

        for (let i = 0; i < harbors.length; i++) {
            for (let j = i + 1; j < harbors.length; j++) {
                const origin = harbors[i];
                const destination = harbors[j];
                const route = this.routePlanner.getRoute(origin.id, destination.id);

                if (!route || route.totalDistance < this.minRouteDistance) {
                    continue;
                }

                candidates.push({
                    originHarborId: origin.id,
                    destinationHarborId: destination.id,
                    route
                });
            }
        }

        if (candidates.length === 0) {
            return [];
        }

        const sortedDistances = candidates
            .map(candidate => candidate.route.totalDistance)
            .sort((a, b) => a - b);
        const median = sortedDistances[Math.floor(sortedDistances.length / 2)];
        const upperCutoff = sortedDistances[Math.floor(sortedDistances.length * 0.85)] || sortedDistances[sortedDistances.length - 1];

        const mediumRoutes = candidates.filter(candidate =>
            candidate.route.totalDistance <= upperCutoff &&
            candidate.route.totalDistance >= this.minRouteDistance
        );

        const preferred = (mediumRoutes.length > 0 ? mediumRoutes : candidates)
            .sort((a, b) => {
                const distanceDelta = Math.abs(a.route.totalDistance - median) - Math.abs(b.route.totalDistance - median);
                if (distanceDelta !== 0) {
                    return distanceDelta;
                }
                return `${a.originHarborId}:${a.destinationHarborId}`.localeCompare(`${b.originHarborId}:${b.destinationHarborId}`);
            });

        const routeCount = Math.max(
            this.minActiveRoutes,
            Math.min(this.maxActiveRoutes, preferred.length)
        );

        return preferred.slice(0, routeCount);
    }

    _hashToUnit(input) {
        let hash = 2166136261;
        for (let i = 0; i < input.length; i++) {
            hash ^= input.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return (hash >>> 0) / 0xffffffff;
    }
}

module.exports = StrategicTrafficManager;
