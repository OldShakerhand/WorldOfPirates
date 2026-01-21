/**
 * Ship Class Definitions
 * Based on World of Pirates ship hierarchy
 * Now includes sprite properties for visual rendering
 * 
 * IMPORTANT: When changing ship stats (cannonsPerSide, maxSpeed, health, etc.),
 * you MUST also update the harbor UI in src/public/index.html
 * Look for the <select id="shipSelector"> element and update the option text
 * to match the new stats (e.g., "Fluyt (4 cannons, 95 speed)")
 */

const SHIP_CLASSES = {
    RAFT: {
        id: 1,
        name: 'Raft',
        maxSpeed: 140,
        turnSpeed: 1.5,
        health: 500,
        cannonsPerSide: 0,
        // Progression (Phase 1)
        goldCost: 0,
        levelRequirement: 1,
        // Visual properties (Square rendering, 3x scale)
        spriteFile: 'raft.png',
        spriteWidth: 180,
        spriteHeight: 180,
        spriteRotation: 0,
        // Cannon positioning
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        // Hitbox (small raft, body only)
        hitboxWidthFactor: 0.13,
        hitboxHeightFactor: 0.24,
        // Cargo (Phase 0: Economy)
        cargoHold: 0  // Rafts cannot carry cargo
    },
    SLOOP: {
        id: 2,
        name: 'Sloop',
        maxSpeed: 131,
        turnSpeed: 1.8,
        health: 100,
        cannonsPerSide: 2,
        // Progression (Phase 1)
        goldCost: 500,
        levelRequirement: 1,
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
        // Hitbox (narrow hull, excluding sails)
        hitboxWidthFactor: 0.24,
        hitboxHeightFactor: 0.68,
        // Cargo (Phase 0: Economy)
        cargoHold: 20
    },

    BARQUE: {
        id: 3,
        name: 'Barque',
        maxSpeed: 120,
        turnSpeed: 1.2,
        health: 200,
        cannonsPerSide: 3,
        // Progression (Phase 1)
        goldCost: 1000,
        levelRequirement: 2,
        // Visual properties (Square rendering)
        spriteFile: 'barque.png',
        spriteWidth: 116,
        spriteHeight: 116,
        spriteRotation: 0,
        // Cannon positioning
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        // Hitbox (narrow hull, excluding sails)
        hitboxWidthFactor: 0.25,
        hitboxHeightFactor: 0.84,
        // Cargo (Phase 0: Economy)
        cargoHold: 40
    },
    FLUYT: {
        id: 4,
        name: 'Fluyt',
        maxSpeed: 115,
        turnSpeed: 1.1,
        health: 250,
        cannonsPerSide: 4,
        // Progression (Phase 1)
        goldCost: 1500,
        levelRequirement: 3,
        // Visual properties (Square rendering)
        spriteFile: 'fluyt.png',
        spriteWidth: 116,
        spriteHeight: 116,
        spriteRotation: 0,
        // Cannon positioning (scaled from 128 to 116: 0.9x)
        cannonLateralOffsetPort: 14,
        cannonLateralOffsetStarboard: 14,
        cannonLongitudinalOffsetPort: -14,
        cannonLongitudinalOffsetStarboard: -14,
        // Hitbox (wider hull, excluding sails)
        hitboxWidthFactor: 0.38,
        hitboxHeightFactor: 0.85,
        // Cargo (Phase 0: Economy)
        cargoHold: 80  // Merchant vessel, high capacity
    },
    MERCHANT: {
        id: 5,
        name: 'Merchant',
        maxSpeed: 104,
        turnSpeed: 1.0,
        health: 300,
        cannonsPerSide: 5,
        // Progression (Phase 1)
        goldCost: 2000,
        levelRequirement: 4,
        // Visual properties (Square rendering)
        spriteFile: 'merchant.png',
        spriteWidth: 120,
        spriteHeight: 120,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        // Hitbox (medium hull, excluding sails)
        hitboxWidthFactor: 0.33,
        hitboxHeightFactor: 0.74,
        // Cargo (Phase 0: Economy)
        cargoHold: 120  // Dedicated cargo ship
    },
    FRIGATE: {
        id: 6,
        name: 'Frigate',
        maxSpeed: 112,
        turnSpeed: 1.1,
        health: 350,
        cannonsPerSide: 6,
        // Progression (Phase 1)
        goldCost: 3000,
        levelRequirement: 5,
        // Visual properties (Square rendering)
        spriteFile: 'frigate.png',
        spriteWidth: 140,
        spriteHeight: 140,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        // Hitbox (wide hull, excluding sails)
        hitboxWidthFactor: 0.41,
        hitboxHeightFactor: 0.89,
        // Cargo (Phase 0: Economy)
        cargoHold: 60  // Combat-focused, less cargo
    },

    SPANISH_GALLEON: {
        id: 7,
        name: 'Spanish Galleon',
        maxSpeed: 100,
        turnSpeed: 0.8,
        health: 450,
        cannonsPerSide: 8,
        // Progression (Phase 1)
        goldCost: 5000,
        levelRequirement: 7,
        // Visual properties (Square rendering)
        spriteFile: 'spanish_galleon.png',
        spriteWidth: 160,
        spriteHeight: 160,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        // Hitbox (narrow hull, excluding sails)
        hitboxWidthFactor: 0.32,
        hitboxHeightFactor: 0.98,
        // Cargo (Phase 0: Economy)
        cargoHold: 100
    },
    WAR_GALLEON: {
        id: 8,
        name: 'War Galleon',
        maxSpeed: 91,
        turnSpeed: 0.7,
        health: 600,
        cannonsPerSide: 12,
        // Progression (Phase 1)
        goldCost: 8000,
        levelRequirement: 10,
        // Visual properties (Square rendering)
        spriteFile: 'war_galleon.png',
        spriteWidth: 180,
        spriteHeight: 180,
        spriteRotation: 0, // No correction needed
        // Cannon positioning - full control per side
        cannonLateralOffsetPort: 0,
        cannonLateralOffsetStarboard: 0,
        cannonLongitudinalOffsetPort: 0,
        cannonLongitudinalOffsetStarboard: 0,
        // Hitbox (wide ship, excluding outlier pixels)
        hitboxWidthFactor: 0.45,
        hitboxHeightFactor: 0.96,
        // Cargo (Phase 0: Economy)
        cargoHold: 80  // War vessel, moderate cargo
    }
};

function getShipClass(name) {
    return SHIP_CLASSES[name] || SHIP_CLASSES.SLOOP;
}

module.exports = {
    SHIP_CLASSES,
    getShipClass
};
