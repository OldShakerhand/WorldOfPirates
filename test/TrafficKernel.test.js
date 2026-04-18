const test = require('node:test');
const assert = require('node:assert/strict');

const RoutePlanner = require('../src/server/game/traffic/RoutePlanner');
const StrategicTrafficManager = require('../src/server/game/traffic/StrategicTrafficManager');
const NPCMaterializer = require('../src/server/game/traffic/NPCMaterializer');

function createTestRoutePlanner() {
    const waypointGraph = {
        nodes: new Map([
            ['A', { id: 'A', x: 0, y: 0 }],
            ['B', { id: 'B', x: 100, y: 0 }],
            ['C', { id: 'C', x: 100, y: 100 }]
        ]),
        findRoute() {
            return [
                { id: 'A', x: 0, y: 0 },
                { id: 'B', x: 100, y: 0 },
                { id: 'C', x: 100, y: 100 }
            ];
        }
    };

    const harbors = [
        { id: 'origin', x: -100, y: 0 },
        { id: 'destination', x: 100, y: 200 }
    ];

    return new RoutePlanner(waypointGraph, harbors);
}

test('RoutePlanner samples progress along route segments instead of direct endpoint interpolation', () => {
    const routePlanner = createTestRoutePlanner();
    const sample = routePlanner.samplePositionOnRoute(
        'origin',
        'destination',
        ['A', 'B', 'C'],
        0.625
    );

    assert.deepEqual(sample, {
        x: 100,
        y: 50,
        segmentIndex: 2,
        progress: 0.625
    });

    const projectedProgress = routePlanner.projectPositionToRouteProgress(
        'origin',
        'destination',
        ['A', 'B', 'C'],
        100,
        50
    );

    assert.equal(projectedProgress, 0.625);
});

test('StrategicTrafficManager advances ships and reverses route direction on arrival', () => {
    const routePlanner = createTestRoutePlanner();
    const harborRegistry = {
        getAllHarbors() {
            return [
                { id: 'origin', x: -100, y: 0 },
                { id: 'destination', x: 100, y: 200 }
            ];
        }
    };
    const manager = new StrategicTrafficManager(routePlanner, harborRegistry, {
        minActiveRoutes: 1,
        maxActiveRoutes: 1,
        minStrategicShips: 1,
        maxStrategicShips: 1,
        maxStrategicShipsAbsolute: 1,
        minRouteDistance: 1
    });

    manager.initializeTraffic(10);
    const ship = manager.getAllShips()[0];

    ship.originHarborId = 'origin';
    ship.destinationHarborId = 'destination';
    ship.routeNodes = ['A', 'B', 'C'];
    ship.routeDistance = 400;
    ship.progress = 0.95;
    ship.speed = 40;
    ship.lastUpdateTime = 10;

    manager.update(11);

    assert.equal(ship.originHarborId, 'destination');
    assert.equal(ship.destinationHarborId, 'origin');
    assert.deepEqual(ship.routeNodes, ['C', 'B', 'A']);
    assert.ok(Math.abs(ship.progress - 0.05) < 1e-9);
});

test('NPCMaterializer spawns ships at interpolated edge positions near players', () => {
    const strategicShip = {
        id: 'strategic_1',
        originHarborId: 'origin',
        destinationHarborId: 'destination',
        routeNodes: ['A', 'B', 'C'],
        progress: 0.625,
        type: 'TRADER'
    };

    const spawnCalls = [];
    const world = {
        entities: {
            player_1: { id: 'player_1', type: 'PLAYER', x: 120, y: 80 }
        },
        worldMap: {
            isLand() {
                return false;
            }
        },
        getEntity(id) {
            return this.entities[id];
        }
    };
    const strategicTrafficManager = {
        getAllShips() {
            return [strategicShip];
        },
        getShipWorldPosition() {
            return { x: 100, y: 50 };
        },
        syncMaterializedShipProgress() {
            return strategicShip.progress;
        },
        setMaterialized() {},
        handleArrival() {}
    };
    const routePlanner = {
        getRemainingRoutePoints() {
            return [
                { x: 100, y: 100 },
                { x: 100, y: 200 }
            ];
        }
    };
    const npcManager = {
        spawnStrategicShip({ x, y }) {
            spawnCalls.push({ x, y });
            world.entities.npc_1 = { id: 'npc_1', type: 'NPC', x, y };
            return world.entities.npc_1;
        },
        despawnNPC() {}
    };

    const materializer = new NPCMaterializer(
        world,
        strategicTrafficManager,
        npcManager,
        routePlanner,
        {
            intervalSeconds: 1,
            aoiRadius: 100,
            localTargetShipsPerPlayer: 0
        }
    );

    materializer.update(1.1, 20);

    assert.deepEqual(spawnCalls, [{ x: 100, y: 50 }]);
});

test('NPCMaterializer backfills local traffic when player-visible density is too low', () => {
    const localSpawnCalls = [];
    const world = {
        entities: {
            player_1: { id: 'player_1', type: 'PLAYER', x: 1000, y: 1000, rotation: Math.PI / 2 },
            strategic_npc: { id: 'strategic_npc', type: 'NPC', x: 1200, y: 1000 }
        },
        waypointGraph: {
            getNearestWaypointId() {
                return 'A';
            },
            nodes: new Map([
                ['A', { id: 'A', x: 1000, y: 1000 }]
            ]),
            getConnectedNodes() {
                return [{ id: 'B', x: 2000, y: 1000 }];
            }
        },
        worldMap: {
            isLand() {
                return false;
            }
        },
        getEntity(id) {
            return this.entities[id];
        }
    };

    const materializer = new NPCMaterializer(
        world,
        { getAllShips() { return []; } },
        {
            spawnLocalTraffic({ x, y, routePoints }) {
                localSpawnCalls.push({ x, y, routePoints });
                const id = `local_${localSpawnCalls.length}`;
                world.entities[id] = { id, type: 'NPC', x, y, localTraffic: true };
                return world.entities[id];
            },
            despawnNPC() {}
        },
        { getRemainingRoutePoints() { return []; } },
        {
            intervalSeconds: 1,
            aoiRadius: 2500,
            localTargetShipsPerPlayer: 4,
            localSpawnDistanceMin: 1000,
            localSpawnDistanceMax: 1000,
            localForwardArcDegrees: 0,
            localRouteLength: 2000,
            localLifetimeMin: 30,
            localLifetimeMax: 30,
            localMaxShips: 8
        }
    );

    materializer.update(1.1, 10);

    assert.equal(localSpawnCalls.length, 3);
    assert.equal(localSpawnCalls[0].x, 2000);
    assert.equal(localSpawnCalls[0].y, 1000);
    assert.equal(localSpawnCalls[0].routePoints.length, 2);
    assert.ok(Number.isFinite(localSpawnCalls[0].routePoints[0].x));
    assert.ok(Number.isFinite(localSpawnCalls[0].routePoints[0].y));
    assert.ok(Number.isFinite(localSpawnCalls[0].routePoints[1].x));
    assert.ok(Number.isFinite(localSpawnCalls[0].routePoints[1].y));
});

test('NPCMaterializer despawns local traffic after expiry or when leaving buffered AOI', () => {
    const despawned = [];
    const world = {
        entities: {
            player_1: { id: 'player_1', type: 'PLAYER', x: 0, y: 0, rotation: 0 },
            local_1: { id: 'local_1', type: 'NPC', x: 4000, y: 0, localTraffic: true, localTrafficExpiresAt: 5 },
            local_2: { id: 'local_2', type: 'NPC', x: 100, y: 0, localTraffic: true, localTrafficExpiresAt: 50 }
        },
        waypointGraph: {
            getNearestWaypointId() {
                return null;
            }
        },
        worldMap: {
            isLand() {
                return false;
            }
        },
        getEntity(id) {
            return this.entities[id];
        }
    };

    const materializer = new NPCMaterializer(
        world,
        { getAllShips() { return []; } },
        {
            spawnLocalTraffic() {
                return null;
            },
            despawnNPC(id) {
                despawned.push(id);
                delete world.entities[id];
            }
        },
        { getRemainingRoutePoints() { return []; } },
        {
            intervalSeconds: 1,
            aoiRadius: 2500,
            localDespawnBuffer: 500,
            localTargetShipsPerPlayer: 0
        }
    );

    materializer.localTrafficIds.add('local_1');
    materializer.localTrafficIds.add('local_2');

    materializer.update(1.1, 10);

    assert.deepEqual(despawned, ['local_1']);
    assert.equal(materializer.localTrafficIds.has('local_1'), false);
    assert.equal(materializer.localTrafficIds.has('local_2'), true);
});
