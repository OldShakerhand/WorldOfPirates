const test = require('node:test');
const assert = require('node:assert/strict');

function loadGameLoopWithMocks() {
    const gameLoopPath = require.resolve('../src/server/game/GameLoop');
    const dependencyPaths = {
        world: require.resolve('../src/server/game/world/World'),
        player: require.resolve('../src/server/game/entities/Player'),
        config: require.resolve('../src/server/game/config/GameConfig'),
        npcBehavior: require.resolve('../src/server/game/npc/NPCBehavior'),
        economySystem: require.resolve('../src/server/game/economy/EconomySystem'),
        shipClass: require.resolve('../src/server/game/entities/ShipClass')
    };

    const originalCacheEntries = new Map();
    const trackedPaths = [gameLoopPath, ...Object.values(dependencyPaths)];

    for (const modulePath of trackedPaths) {
        originalCacheEntries.set(modulePath, require.cache[modulePath]);
        delete require.cache[modulePath];
    }

    class MockWorld {
        constructor() {
            this.entities = {};
            this.projectiles = [];
            this.harborRegistry = {};
            this.harbors = [];
            this.worldMap = {
                isWater() {
                    return true;
                },
                isLand() {
                    return false;
                }
            };
        }

        update() {}

        getState() {
            return { entities: this.entities };
        }

        addEntity(entity) {
            this.entities[entity.id] = entity;
        }

        getMapData() {
            return { width: 10, height: 10 };
        }

        removeEntity(id) {
            delete this.entities[id];
        }

        getEntity(id) {
            return this.entities[id];
        }
    }

    class MockPlayer {
        constructor(id, name, shipClassName) {
            this.id = id;
            this.name = name;
            this.type = 'PLAYER';
            this.flagship = {
                shipClass: {
                    name: shipClassName,
                    spriteWidth: 80,
                    spriteHeight: 160
                }
            };
            this.fleet = [this.flagship];
            this.flagshipIndex = 0;
            this.fleetCargo = { serialize: () => ({}) };
            this.inputs = {};
            this.lastShotTimeLeft = 0;
            this.lastShotTimeRight = 0;
            this.fireRate = 1;
            this.isRaft = false;
            this.shieldEndTime = 0;
        }

        hasActiveShield() {
            return false;
        }
    }

    class MockEconomySystem {
        constructor() {}
    }

    require.cache[dependencyPaths.world] = {
        id: dependencyPaths.world,
        filename: dependencyPaths.world,
        loaded: true,
        exports: MockWorld
    };
    require.cache[dependencyPaths.player] = {
        id: dependencyPaths.player,
        filename: dependencyPaths.player,
        loaded: true,
        exports: MockPlayer
    };
    require.cache[dependencyPaths.config] = {
        id: dependencyPaths.config,
        filename: dependencyPaths.config,
        loaded: true,
        exports: {
            GAME: {
                TICK_RATE: 20,
                HARBOR_SPAWN_DISTANCE: 300,
                PERFORMANCE_LOG_INTERVAL_MS: 10000,
                MAX_TICK_TIME_MS: 16.67
            },
            COMBAT: {
                DEBUG_INITIALIZATION: false,
                PROJECTILE_BALL_RADIUS: 6,
                PROJECTILE_SHADOW_RADIUS: 9,
                HARBOR_EXIT_SHIELD_DURATION: 10
            }
        }
    };
    require.cache[dependencyPaths.npcBehavior] = {
        id: dependencyPaths.npcBehavior,
        filename: dependencyPaths.npcBehavior,
        loaded: true,
        exports: {
            NPCCombatOverlay: {
                Config: {
                    DEBUG_COMBAT: false
                }
            }
        }
    };
    require.cache[dependencyPaths.economySystem] = {
        id: dependencyPaths.economySystem,
        filename: dependencyPaths.economySystem,
        loaded: true,
        exports: MockEconomySystem
    };
    require.cache[dependencyPaths.shipClass] = {
        id: dependencyPaths.shipClass,
        filename: dependencyPaths.shipClass,
        loaded: true,
        exports: {
            SHIP_CLASSES: {
                SLOOP: {
                    name: 'Sloop',
                    spriteWidth: 80,
                    spriteHeight: 160,
                    spriteRotation: 0,
                    spriteFile: 'sloop.png',
                    hitboxWidthFactor: 0.5,
                    hitboxHeightFactor: 0.8
                }
            }
        }
    };

    const GameLoop = require(gameLoopPath);

    const restore = () => {
        for (const [modulePath, cacheEntry] of originalCacheEntries.entries()) {
            if (cacheEntry) {
                require.cache[modulePath] = cacheEntry;
            } else {
                delete require.cache[modulePath];
            }
        }
    };

    return { GameLoop, restore };
}

test('GameLoop.stop clears both timers and is idempotent', () => {
    const { GameLoop, restore } = loadGameLoopWithMocks();
    const io = { emit() {} };
    const loop = new GameLoop(io);

    const originalSetInterval = global.setInterval;
    const originalClearInterval = global.clearInterval;
    const scheduled = [];
    const cleared = [];

    global.setInterval = (fn, delay) => {
        const handle = { delay, index: scheduled.length };
        scheduled.push({ fn, delay, handle });
        return handle;
    };

    global.clearInterval = (handle) => {
        cleared.push(handle);
    };

    try {
        loop.start();

        assert.equal(scheduled.length, 2);
        assert.equal(scheduled[0].delay, 50);
        assert.equal(scheduled[1].delay, 10000);
        assert.equal(loop.interval, scheduled[0].handle);
        assert.equal(loop.monitoringInterval, scheduled[1].handle);

        loop.start();
        assert.equal(scheduled.length, 2);

        loop.stop();

        assert.deepEqual(cleared, [scheduled[0].handle, scheduled[1].handle]);
        assert.equal(loop.interval, null);
        assert.equal(loop.monitoringInterval, null);

        loop.stop();
        assert.deepEqual(cleared, [scheduled[0].handle, scheduled[1].handle]);
    } finally {
        global.setInterval = originalSetInterval;
        global.clearInterval = originalClearInterval;
        restore();
    }
});

test('GameLoop.addPlayer rejects invalid and duplicate names', () => {
    const { GameLoop, restore } = loadGameLoopWithMocks();
    const io = { emit() {} };
    const loop = new GameLoop(io);

    const invalidSocket = {
        id: 'socket-invalid',
        emitted: [],
        disconnected: false,
        emit(event, payload) {
            this.emitted.push({ event, payload });
        },
        disconnect() {
            this.disconnected = true;
        }
    };

    try {
        const invalidResult = loop.addPlayer(invalidSocket, 'x');

        assert.equal(invalidResult, false);
        assert.equal(invalidSocket.disconnected, true);
        assert.equal(invalidSocket.emitted[0].event, 'nameRejected');

        loop.world.entities.existing = { id: 'existing', type: 'PLAYER', name: 'Blackbeard' };

        const duplicateSocket = {
            id: 'socket-duplicate',
            emitted: [],
            disconnected: false,
            emit(event, payload) {
                this.emitted.push({ event, payload });
            },
            disconnect() {
                this.disconnected = true;
            }
        };

        const duplicateResult = loop.addPlayer(duplicateSocket, '  blackbeard  ');

        assert.equal(duplicateResult, false);
        assert.equal(duplicateSocket.disconnected, true);
        assert.equal(duplicateSocket.emitted[0].event, 'nameRejected');
    } finally {
        restore();
    }
});

test('GameLoop.addPlayer adds a valid player and emits bootstrap data', () => {
    const { GameLoop, restore } = loadGameLoopWithMocks();
    const ioEvents = [];
    const io = {
        emit(event, payload) {
            ioEvents.push({ event, payload });
        }
    };
    const loop = new GameLoop(io);
    loop.findSafeSpawnPosition = () => ({ x: 123, y: 456 });

    const socket = {
        id: 'socket-valid',
        emitted: [],
        disconnectCalled: false,
        emit(event, payload) {
            this.emitted.push({ event, payload });
        },
        disconnect() {
            this.disconnectCalled = true;
        }
    };

    try {
        const result = loop.addPlayer(socket, 'Anne Bonny');
        const player = loop.world.entities[socket.id];

        assert.equal(result, true);
        assert.equal(socket.disconnectCalled, false);
        assert.ok(player);
        assert.equal(player.x, 123);
        assert.equal(player.y, 456);

        assert.deepEqual(
            socket.emitted.map(({ event }) => event),
            ['map_data', 'shipMetadata', 'combatConfig']
        );

        assert.equal(ioEvents.length, 1);
        assert.equal(ioEvents[0].event, 'chatMessage');
        assert.match(ioEvents[0].payload.text, /Anne Bonny joined the game/);
    } finally {
        restore();
    }
});


test('GameLoop.isValidPlayerName enforces trim, length, and character rules', () => {
    const { GameLoop, restore } = loadGameLoopWithMocks();
    const loop = new GameLoop({ emit() {} });

    try {
        assert.equal(loop.isValidPlayerName('Anne Bonny'), true);
        assert.equal(loop.isValidPlayerName('  Calico Jack  '), true);
        assert.equal(loop.isValidPlayerName('ab'), false);
        assert.equal(loop.isValidPlayerName('a'.repeat(21)), false);
        assert.equal(loop.isValidPlayerName('Blackbeard!'), false);
        assert.equal(loop.isValidPlayerName('   '), false);
    } finally {
        restore();
    }
});

test('GameLoop.getHarborOccupantsList returns only connected players with ship names', () => {
    const { GameLoop, restore } = loadGameLoopWithMocks();
    const loop = new GameLoop({ emit() {} });

    loop.harborOccupants.set('nassau', new Set(['p1', 'missing']));
    loop.world.entities.p1 = {
        id: 'p1',
        name: 'Mary Read',
        flagship: {
            shipClass: {
                name: 'Brigantine'
            }
        }
    };

    try {
        assert.deepEqual(loop.getHarborOccupantsList('nassau'), [
            { id: 'p1', name: 'Mary Read', shipName: 'Brigantine' }
        ]);
        assert.deepEqual(loop.getHarborOccupantsList('tortuga'), []);
    } finally {
        restore();
    }
});

test('GameLoop.removePlayerFromHarbor broadcasts removals and deletes empty harbor sets', () => {
    const { GameLoop, restore } = loadGameLoopWithMocks();
    const loop = new GameLoop({ emit() {} });
    const broadcasts = [];

    loop.broadcastHarborOccupants = (harborId) => {
        broadcasts.push(harborId);
    };

    try {
        loop.harborOccupants.set('nassau', new Set(['p1', 'p2']));
        loop.removePlayerFromHarbor('p1', 'nassau');
        assert.deepEqual(broadcasts, ['nassau']);
        assert.deepEqual([...loop.harborOccupants.get('nassau')], ['p2']);

        loop.removePlayerFromHarbor('p2', 'nassau');
        assert.deepEqual(broadcasts, ['nassau', 'nassau']);
        assert.equal(loop.harborOccupants.has('nassau'), false);
    } finally {
        restore();
    }
});

test('GameLoop.handleCloseHarbor undocks player, leaves room, and grants exit shield', () => {
    const { GameLoop, restore } = loadGameLoopWithMocks();
    const leaveCalls = [];
    const removed = [];
    const socket = {
        leave(room) {
            leaveCalls.push(room);
        }
    };
    const io = {
        emit() {},
        sockets: {
            sockets: new Map([['p1', socket]])
        }
    };
    const loop = new GameLoop(io);
    const player = {
        id: 'p1',
        name: 'Charles Vane',
        inHarbor: true,
        dockedHarborId: 'nassau',
        nearHarbor: 'nassau',
        x: 0,
        y: 0,
        shieldEndTime: 0
    };

    loop.world.entities.p1 = player;
    loop.world.harbors = [{
        id: 'nassau',
        name: 'Nassau',
        x: 1000,
        y: 2000,
        island: true,
        exitDirection: { x: 1, y: 0 }
    }];
    loop.removePlayerFromHarbor = (playerId, harborId) => {
        removed.push({ playerId, harborId });
    };

    const originalNow = Date.now;
    Date.now = () => 5000;

    try {
        loop.handleCloseHarbor('p1');

        assert.deepEqual(removed, [{ playerId: 'p1', harborId: 'nassau' }]);
        assert.deepEqual(leaveCalls, ['harbor_nassau']);
        assert.equal(player.inHarbor, false);
        assert.equal(player.dockedHarborId, null);
        assert.equal(player.x, 1300);
        assert.equal(player.y, 2000);
        assert.equal(player.shieldEndTime, 15);
    } finally {
        Date.now = originalNow;
        restore();
    }
});
