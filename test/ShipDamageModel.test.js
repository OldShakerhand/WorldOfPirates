const test = require('node:test');
const assert = require('node:assert/strict');

const GameConfig = require('../src/server/game/config/GameConfig');
const Ship = require('../src/server/game/entities/Ship');
const Player = require('../src/server/game/entities/Player');

const { COMBAT } = GameConfig;

function createWind(strength = 1, angleModifier = 1) {
    return {
        getStrengthModifier() {
            return strength;
        },
        getAngleModifier() {
            return angleModifier;
        }
    };
}

function createWaterMap() {
    return {
        isWater() {
            return true;
        },
        isLand() {
            return false;
        }
    };
}

function createWorld() {
    return {
        harbors: [],
        wrecks: [],
        createWreck(x, y, ownerId, cargo) {
            this.wrecks.push({ x, y, ownerId, cargo });
        },
        getEntity() {
            return null;
        }
    };
}

test('Ship applies default cannon shot damage split and clamps sail and crew', () => {
    const ship = new Ship('SLOOP');

    ship.takeSplitDamage(10, COMBAT.DAMAGE_PROFILES[COMBAT.AMMO_TYPES.CANNON_SHOT]);

    assert.equal(ship.hullHP, 93);
    assert.equal(ship.sailIntegrity, 98);
    assert.equal(ship.crewCount, 19);

    ship.takeSplitDamage(500, COMBAT.DAMAGE_PROFILES[COMBAT.AMMO_TYPES.CANNON_SHOT]);

    assert.equal(ship.hullHP, 0);
    assert.equal(ship.sailIntegrity, 0);
    assert.equal(ship.crewCount, 0);
});

test('Ship applies chain shot profile with heavier sail damage', () => {
    const ship = new Ship('SLOOP');

    ship.takeSplitDamage(10, COMBAT.DAMAGE_PROFILES[COMBAT.AMMO_TYPES.CHAIN_SHOT]);

    assert.equal(ship.hullHP, 98);
    assert.equal(ship.sailIntegrity, 94.75);
    assert.equal(ship.crewCount, 19);
});

test('Player crew capacity is aggregated across the fleet and crew is clamped to max', () => {
    const player = new Player('p1', 'Tester', 'SLOOP', null, createWorld());

    player.fleet.push(new Ship('BARQUE'));
    player._crewCount = 999;
    player.clampCrewCount();

    assert.equal(player.maxCrew, 55);
    assert.equal(player.crewCount, 55);
});

test('Sail damage reduces player acceleration via the mobility multiplier', () => {
    const player = new Player('p1', 'Tester', 'SLOOP', null, createWorld());
    const deltaTime = 1;
    const wind = createWind();
    const worldMap = createWaterMap();

    player.sailState = 2;

    player.update(deltaTime, wind, worldMap);
    assert.equal(player.speed, 20);

    player.speed = 0;
    player.flagship.sailIntegrity = 50;

    player.update(deltaTime, wind, worldMap);
    assert.equal(player.speed, 15);

    player.speed = 0;
    player.flagship.sailIntegrity = 0;

    player.update(deltaTime, wind, worldMap);
    assert.equal(player.speed, 10);
});

test('Player handleInput toggles ammo type between standard and chain', () => {
    const player = new Player('p1', 'Tester', 'SLOOP', null, createWorld());

    assert.equal(player.ammoType, COMBAT.AMMO_TYPES.CANNON_SHOT);

    player.handleInput({ toggleAmmo: true });
    assert.equal(player.ammoType, COMBAT.AMMO_TYPES.CHAIN_SHOT);

    player.handleInput({ toggleAmmo: true });
    assert.equal(player.ammoType, COMBAT.AMMO_TYPES.CANNON_SHOT);
});

test('Crew loss slows reload speed based on fleet crew ratio', () => {
    const player = new Player('p1', 'Tester', 'SLOOP', null, createWorld());

    assert.equal(player.fireRate, COMBAT.CANNON_FIRE_RATE);

    player._crewCount = 10;
    assert.equal(player.fireRate, COMBAT.CANNON_FIRE_RATE / 0.75);
});

test('Player ammo toggle forces a reload on both broadsides', () => {
    const player = new Player('p1', 'Tester', 'SLOOP', null, createWorld());

    player.lastShotTimeLeft = 0;
    player.lastShotTimeRight = 0;

    const beforeToggle = Date.now() / 1000;
    player.handleInput({ toggleAmmo: true });
    const afterToggle = Date.now() / 1000;

    assert.ok(player.lastShotTimeLeft >= beforeToggle);
    assert.ok(player.lastShotTimeLeft <= afterToggle);
    assert.ok(player.lastShotTimeRight >= beforeToggle);
    assert.ok(player.lastShotTimeRight <= afterToggle);
});

test('Player creates a wreck when a flagship sinks even if another ship remains', () => {
    const world = createWorld();
    const player = new Player('p1', 'Tester', 'SLOOP', null, world);

    player.fleet.push(new Ship('BARQUE'));

    player.takeDamage(200, 'attacker_1', COMBAT.DAMAGE_PROFILES[COMBAT.AMMO_TYPES.CANNON_SHOT]);

    assert.equal(world.wrecks.length, 1);
    assert.equal(world.wrecks[0].ownerId, 'attacker_1');
    assert.equal(player.fleet.length, 1);
    assert.equal(player.isRaft, false);
});

test('Player damage reduces fleet-level crew instead of ship-local crew only', () => {
    const player = new Player('p1', 'Tester', 'SLOOP', null, createWorld());

    player.takeDamage(10, 'attacker_1', COMBAT.DAMAGE_PROFILES[COMBAT.AMMO_TYPES.CANNON_SHOT]);

    assert.equal(player.crewCount, 19);
    assert.equal(player.flagship.crewCount, 20);
});
