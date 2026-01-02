/**
 * Ship Class Definitions
 * Based on World of Pirates ship hierarchy
 * Now includes sprite properties for visual rendering
 */

const SHIP_CLASSES = {
    RAFT: {
        id: 1,
        name: 'Raft',
        maxSpeed: 130,
        turnSpeed: 1.5,
        health: 500,
        cannonsPerSide: 0,
        // Visual properties (no sprite for raft, uses triangle for now)
        spriteFile: null,
        spriteWidth: 20,
        spriteHeight: 30,
        spriteRotation: 0,
        collisionRadius: 12
    },
    SLOOP: {
        id: 2,
        name: 'Sloop',
        maxSpeed: 120,
        turnSpeed: 1.8,
        health: 100,
        cannonsPerSide: 2,
        // Visual properties
        spriteFile: 'sloop.png',
        spriteWidth: 25,
        spriteHeight: 35,
        spriteRotation: 0, // No correction needed
        collisionRadius: 15
    },
    PINNACE: {
        id: 3,
        name: 'Pinnace',
        maxSpeed: 110,
        turnSpeed: 1.5,
        health: 150,
        cannonsPerSide: 3,
        // Visual properties
        spriteFile: 'pinnace.png',
        spriteWidth: 30,
        spriteHeight: 40,
        spriteRotation: 0, // No correction needed
        collisionRadius: 17
    },
    BARQUE: {
        id: 4,
        name: 'Barque',
        maxSpeed: 100,
        turnSpeed: 1.2,
        health: 200,
        cannonsPerSide: 3,
        // Visual properties
        spriteFile: 'barque.png',
        spriteWidth: 35,
        spriteHeight: 45,
        spriteRotation: 0, // No correction needed
        collisionRadius: 19
    },
    FLUYT: {
        id: 5,
        name: 'Fluyt',
        maxSpeed: 95,
        turnSpeed: 1.1,
        health: 230,
        cannonsPerSide: 4,
        // Visual properties
        spriteFile: 'fluyt.png',
        spriteWidth: 52,
        spriteHeight: 72,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 10, // Port lateral offset (positive = further from centerline)
        cannonLateralOffsetStarboard: 10, // Starboard lateral offset (positive = further from centerline)
        cannonLongitudinalOffsetPort: -10, // Port longitudinal offset (negative = toward stern)
        cannonLongitudinalOffsetStarboard: -10, // Starboard longitudinal offset (negative = toward stern)
        collisionRadius: 20
    },
    MERCHANT: {
        id: 6,
        name: 'Merchant',
        maxSpeed: 95,
        turnSpeed: 1.0,
        health: 250,
        cannonsPerSide: 3,
        // Visual properties
        spriteFile: 'merchant.png',
        spriteWidth: 40,
        spriteHeight: 52,
        spriteRotation: 0, // No correction needed
        collisionRadius: 22
    },
    FRIGATE: {
        id: 7,
        name: 'Frigate',
        maxSpeed: 105,
        turnSpeed: 1.1,
        health: 300,
        cannonsPerSide: 5,
        // Visual properties
        spriteFile: 'frigate.png',
        spriteWidth: 45,
        spriteHeight: 60,
        spriteRotation: 0, // No correction needed
        collisionRadius: 25
    },
    FAST_GALLEON: {
        id: 8,
        name: 'Fast Galleon',
        maxSpeed: 100,
        turnSpeed: 0.9,
        health: 350,
        cannonsPerSide: 6,
        // Visual properties
        spriteFile: 'fast_galleon.png',
        spriteWidth: 50,
        spriteHeight: 65,
        spriteRotation: 0, // No correction needed
        collisionRadius: 27
    },
    SPANISH_GALLEON: {
        id: 9,
        name: 'Spanish Galleon',
        maxSpeed: 85,
        turnSpeed: 0.8,
        health: 400,
        cannonsPerSide: 8,
        // Visual properties
        spriteFile: 'spanish_galleon.png',
        spriteWidth: 55,
        spriteHeight: 70,
        spriteRotation: 0, // No correction needed
        collisionRadius: 30
    },
    WAR_GALLEON: {
        id: 10,
        name: 'War Galleon',
        maxSpeed: 80,
        turnSpeed: 0.7,
        health: 500,
        cannonsPerSide: 10,
        // Visual properties
        spriteFile: 'war_galleon.png',
        spriteWidth: 60,
        spriteHeight: 80,
        spriteRotation: 0, // No correction needed
        collisionRadius: 35
    }
};

function getShipClass(name) {
    return SHIP_CLASSES[name] || SHIP_CLASSES.SLOOP;
}

module.exports = {
    SHIP_CLASSES,
    getShipClass
};
