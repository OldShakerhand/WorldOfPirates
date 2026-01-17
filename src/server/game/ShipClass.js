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
        maxSpeed: 130,
        turnSpeed: 1.5,
        health: 500,
        cannonsPerSide: 0,
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
        // Hitbox
        hitboxWidthFactor: 0.5,
        hitboxHeightFactor: 0.8
    },
    SLOOP: {
        id: 2,
        name: 'Sloop',
        maxSpeed: 131,
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

    BARQUE: {
        id: 3,
        name: 'Barque',
        maxSpeed: 120,
        turnSpeed: 1.2,
        health: 200,
        cannonsPerSide: 3,
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
        // Hitbox (narrower ship)
        hitboxWidthFactor: 0.35,
        hitboxHeightFactor: 0.85
    },
    FLUYT: {
        id: 4,
        name: 'Fluyt',
        maxSpeed: 115,
        turnSpeed: 1.1,
        health: 250,
        cannonsPerSide: 4,
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
        // Hitbox (wider ship)
        hitboxWidthFactor: 0.55,
        hitboxHeightFactor: 0.85
    },
    MERCHANT: {
        id: 5,
        name: 'Merchant',
        maxSpeed: 104,
        turnSpeed: 1.0,
        health: 300,
        cannonsPerSide: 5,
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
        hitboxWidthFactor: 0.8,
        hitboxHeightFactor: 0.8
    },
    FRIGATE: {
        id: 6,
        name: 'Frigate',
        maxSpeed: 112,
        turnSpeed: 1.1,
        health: 350,
        cannonsPerSide: 6,
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
        hitboxWidthFactor: 0.8,
        hitboxHeightFactor: 0.8
    },

    SPANISH_GALLEON: {
        id: 7,
        name: 'Spanish Galleon',
        maxSpeed: 100,
        turnSpeed: 0.8,
        health: 450,
        cannonsPerSide: 8,
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
        hitboxWidthFactor: 0.8,
        hitboxHeightFactor: 0.8
    },
    WAR_GALLEON: {
        id: 8,
        name: 'War Galleon',
        maxSpeed: 91,
        turnSpeed: 0.7,
        health: 600,
        cannonsPerSide: 12,
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
