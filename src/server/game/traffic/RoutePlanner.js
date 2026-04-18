const NavigationUtils = require('../navigation/NavigationUtils');

class RoutePlanner {
    constructor(waypointGraph, harbors) {
        this.waypointGraph = waypointGraph;
        this.harborMap = new Map();
        this.routeCache = new Map();

        for (const harbor of harbors) {
            this.harborMap.set(harbor.id, harbor);
        }
    }

    getRoute(originHarborId, destinationHarborId) {
        const record = this._getRouteRecord(originHarborId, destinationHarborId);
        if (!record) {
            return null;
        }

        return {
            nodeRoute: [...record.nodeRoute],
            totalDistance: record.totalDistance,
            approximateTotalDistance: record.totalDistance
        };
    }

    getRouteGeometry(originHarborId, destinationHarborId, routeNodes = null) {
        if (routeNodes) {
            return this._buildRouteGeometry(originHarborId, destinationHarborId, routeNodes);
        }

        const record = this._getRouteRecord(originHarborId, destinationHarborId);
        if (!record) {
            return null;
        }

        return this._cloneGeometry(record);
    }

    samplePositionOnRoute(originHarborId, destinationHarborId, routeNodes, progress) {
        const geometry = this.getRouteGeometry(originHarborId, destinationHarborId, routeNodes);
        if (!geometry || geometry.points.length === 0) {
            return null;
        }

        return this._sampleGeometry(geometry, progress);
    }

    getRemainingRoutePoints(originHarborId, destinationHarborId, routeNodes, progress) {
        const geometry = this.getRouteGeometry(originHarborId, destinationHarborId, routeNodes);
        if (!geometry || geometry.points.length === 0) {
            return [];
        }

        const sample = this._sampleGeometry(geometry, progress);
        const remaining = [];

        if (sample.segmentIndex >= 0 && sample.segmentIndex < geometry.points.length - 1) {
            remaining.push({
                x: geometry.points[sample.segmentIndex + 1].x,
                y: geometry.points[sample.segmentIndex + 1].y
            });
        }

        for (let i = sample.segmentIndex + 2; i < geometry.points.length; i++) {
            remaining.push({
                x: geometry.points[i].x,
                y: geometry.points[i].y
            });
        }

        return remaining;
    }

    projectPositionToRouteProgress(originHarborId, destinationHarborId, routeNodes, x, y) {
        const geometry = this.getRouteGeometry(originHarborId, destinationHarborId, routeNodes);
        if (!geometry || geometry.segments.length === 0 || geometry.totalDistance <= 0) {
            return 0;
        }

        let bestProjection = {
            distanceToPoint: Infinity,
            routeDistance: 0
        };

        for (let i = 0; i < geometry.segments.length; i++) {
            const segment = geometry.segments[i];
            const projection = NavigationUtils.getClosestPointOnSegment(x, y, segment.start, segment.end);
            const distanceToPoint = Math.hypot(projection.x - x, projection.y - y);
            const distanceOnSegment = Math.hypot(projection.x - segment.start.x, projection.y - segment.start.y);
            const routeDistance = geometry.cumulativeDistances[i] + distanceOnSegment;

            if (distanceToPoint < bestProjection.distanceToPoint) {
                bestProjection = { distanceToPoint, routeDistance };
            }
        }

        return Math.max(0, Math.min(1, bestProjection.routeDistance / geometry.totalDistance));
    }

    _getRouteRecord(originHarborId, destinationHarborId) {
        const cacheKey = `${originHarborId}->${destinationHarborId}`;
        if (this.routeCache.has(cacheKey)) {
            return this.routeCache.get(cacheKey);
        }

        const originHarbor = this.harborMap.get(originHarborId);
        const destinationHarbor = this.harborMap.get(destinationHarborId);

        if (!originHarbor || !destinationHarbor || originHarborId === destinationHarborId) {
            return null;
        }

        const waypointRoute = this.waypointGraph.findRoute(
            originHarbor.x,
            originHarbor.y,
            destinationHarbor.x,
            destinationHarbor.y
        );

        const nodeRoute = waypointRoute.map(node => node.id);
        const geometry = this._buildRouteGeometry(originHarborId, destinationHarborId, nodeRoute);
        if (!geometry) {
            return null;
        }

        const record = {
            originHarborId,
            destinationHarborId,
            nodeRoute,
            totalDistance: geometry.totalDistance,
            points: geometry.points,
            segments: geometry.segments,
            cumulativeDistances: geometry.cumulativeDistances
        };

        this.routeCache.set(cacheKey, record);
        return record;
    }

    _buildRouteGeometry(originHarborId, destinationHarborId, routeNodes) {
        const originHarbor = this.harborMap.get(originHarborId);
        const destinationHarbor = this.harborMap.get(destinationHarborId);
        if (!originHarbor || !destinationHarbor) {
            return null;
        }

        const points = [
            { x: originHarbor.x, y: originHarbor.y },
            ...routeNodes
                .map(nodeId => this.waypointGraph.nodes.get(nodeId))
                .filter(Boolean)
                .map(node => ({ x: node.x, y: node.y, id: node.id })),
            { x: destinationHarbor.x, y: destinationHarbor.y }
        ];

        const segments = [];
        const cumulativeDistances = [];
        let totalDistance = 0;

        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            const distance = Math.hypot(end.x - start.x, end.y - start.y);

            cumulativeDistances.push(totalDistance);
            segments.push({ start, end, distance });
            totalDistance += distance;
        }

        return { points, segments, cumulativeDistances, totalDistance };
    }

    _cloneGeometry(record) {
        return {
            points: record.points.map(point => ({ ...point })),
            segments: record.segments.map(segment => ({
                start: { ...segment.start },
                end: { ...segment.end },
                distance: segment.distance
            })),
            cumulativeDistances: [...record.cumulativeDistances],
            totalDistance: record.totalDistance
        };
    }

    _sampleGeometry(geometry, progress) {
        if (geometry.totalDistance <= 0) {
            const point = geometry.points[geometry.points.length - 1];
            return {
                x: point.x,
                y: point.y,
                segmentIndex: geometry.points.length - 2,
                progress: 1
            };
        }

        const clampedProgress = Math.max(0, Math.min(1, progress));
        const distanceAlongRoute = geometry.totalDistance * clampedProgress;

        for (let i = 0; i < geometry.segments.length; i++) {
            const segment = geometry.segments[i];
            const segmentStartDistance = geometry.cumulativeDistances[i];
            const segmentEndDistance = segmentStartDistance + segment.distance;

            if (distanceAlongRoute <= segmentEndDistance || i === geometry.segments.length - 1) {
                const segmentT = segment.distance > 0
                    ? (distanceAlongRoute - segmentStartDistance) / segment.distance
                    : 1;
                const clampedT = Math.max(0, Math.min(1, segmentT));

                return {
                    x: segment.start.x + (segment.end.x - segment.start.x) * clampedT,
                    y: segment.start.y + (segment.end.y - segment.start.y) * clampedT,
                    segmentIndex: i,
                    progress: clampedProgress
                };
            }
        }

        const point = geometry.points[geometry.points.length - 1];
        return {
            x: point.x,
            y: point.y,
            segmentIndex: geometry.points.length - 2,
            progress: 1
        };
    }
}

module.exports = RoutePlanner;
