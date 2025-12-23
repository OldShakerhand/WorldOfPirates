/**
 * Ship Class Definitions
 * Based on World of Pirates ship hierarchy
 */

const SHIP_CLASSES = {
    RAFT: {
        id: 1,
        name: 'Raft',
        maxSpeed: 30,
        turnSpeed: 1.5,
        health: 50,
        cannonsPerSide: 0
    },
    SLOOP: {
        id: 2,
        name: 'Sloop',
        maxSpeed: 120,
        turnSpeed: 1.8,
        health: 100,
        cannonsPerSide: 2
    },
    PINNACE: {
        id: 3,
        name: 'Pinnace',
        maxSpeed: 110,
        turnSpeed: 1.5,
        health: 150,
        cannonsPerSide: 3
    },
    BARQUE: {
        id: 4,
        name: 'Barque',
        maxSpeed: 100,
        turnSpeed: 1.2,
        health: 200,
        cannonsPerSide: 4
    },
    FLUYT: {
        id: 5,
        name: 'Fluyt',
        maxSpeed: 90,
        turnSpeed: 1.0,
        health: 220,
        cannonsPerSide: 3
    },
    MERCHANT: {
        id: 6,
        name: 'Merchant',
        maxSpeed: 95,
        turnSpeed: 1.0,
        health: 250,
        cannonsPerSide: 4
    },
    FRIGATE: {
        id: 7,
        name: 'Frigate',
        maxSpeed: 105,
        turnSpeed: 1.1,
        health: 300,
        cannonsPerSide: 6
    },
    FAST_GALLEON: {
        id: 8,
        name: 'Fast Galleon',
        maxSpeed: 100,
        turnSpeed: 0.9,
        health: 350,
        cannonsPerSide: 7
    },
    SPANISH_GALLEON: {
        id: 9,
        name: 'Spanish Galleon',
        maxSpeed: 85,
        turnSpeed: 0.8,
        health: 400,
        cannonsPerSide: 8
    },
    WAR_GALLEON: {
        id: 10,
        name: 'War Galleon',
        maxSpeed: 80,
        turnSpeed: 0.7,
        health: 500,
        cannonsPerSide: 10
    }
};

function getShipClass(name) {
    return SHIP_CLASSES[name] || SHIP_CLASSES.SLOOP;
}

module.exports = {
    SHIP_CLASSES,
    getShipClass
};
