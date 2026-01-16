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
        // DESIGN CONTRACT: Hitbox dimensions derived from sprites
        // - hitboxWidth = spriteWidth * hitboxWidthFactor
        // - hitboxHeight = spriteHeight * hitboxHeightFactor
        // DO NOT store absolute dimensions - always use factors
        hitboxWidthFactor: 0.8,  // 80% of sprite width
        hitboxHeightFactor: 0.8  // 80% of sprite height
    },
    SLOOP: {
        id: 2,
        name: 'Sloop',
        maxSpeed: 120,
        turnSpeed: 1.8,
        health: 100,
        cannonsPerSide: 2,
        // Visual properties (Square rendering to preserve aspect ratio)
        spriteFile: 'sloop.png',
        spriteWidth: 92,  // Square rendering
        spriteHeight: 92, // Square rendering (Visual height ~78px)
        spriteRotation: 0,
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        // Hitbox tighter due to square frame
        hitboxWidthFactor: 0.6,
        hitboxHeightFactor: 0.8
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
        spriteWidth: 45,
        spriteHeight: 60,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        hitboxWidthFactor: 0.8,
        hitboxHeightFactor: 0.8
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
        spriteWidth: 52.5,
        spriteHeight: 67.5,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        hitboxWidthFactor: 0.8,
        hitboxHeightFactor: 0.8
    },
    FLUYT: {
        id: 5,
        name: 'Fluyt',
        maxSpeed: 95,
        turnSpeed: 1.1,
        health: 230,
        cannonsPerSide: 4,
        // Visual properties (Square rendering to preserve aspect ratio)
        spriteFile: 'fluyt.png',
        spriteWidth: 128,  // Square rendering
        spriteHeight: 128, // Square rendering (Ship visual height ~108px)
        spriteRotation: 0,
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 15,
        cannonLateralOffsetStarboard: 15,
        cannonLongitudinalOffsetPort: -15,
        cannonLongitudinalOffsetStarboard: -15,
        // Hitbox must be tighter since sprite contains empty space
        hitboxWidthFactor: 0.5,  // Ship width is ~50% of frame width
        hitboxHeightFactor: 0.8  // Ship height is ~80% of frame height
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
        spriteWidth: 60,
        spriteHeight: 78,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        hitboxWidthFactor: 0.8,
        hitboxHeightFactor: 0.8
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
        spriteWidth: 67.5,
        spriteHeight: 90,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        hitboxWidthFactor: 0.8,
        hitboxHeightFactor: 0.8
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
        spriteWidth: 75,
        spriteHeight: 97.5,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        hitboxWidthFactor: 0.8,
        hitboxHeightFactor: 0.8
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
        spriteWidth: 82.5,
        spriteHeight: 105,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        hitboxWidthFactor: 0.8,
        hitboxHeightFactor: 0.8
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
        spriteWidth: 90,
        spriteHeight: 120,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        hitboxWidthFactor: 0.8,
        hitboxHeightFactor: 0.8
    }
};

function getShipClass(name) {
    return SHIP_CLASSES[name] || SHIP_CLASSES.SLOOP;
}

module.exports = {
    SHIP_CLASSES,
    getShipClass
};
