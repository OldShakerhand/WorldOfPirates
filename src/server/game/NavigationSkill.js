/**
 * Navigation Skill Requirements for Ship Classes
 */

const SHIP_NAV_REQUIREMENTS = {
    'SLOOP': { navRequired: 1, cost: 3 },
    'PINNACE': { navRequired: 8, cost: 8 },
    'BARQUE': { navRequired: 16, cost: 11 },
    'FLUYT': { navRequired: 24, cost: 16 },
    'MERCHANT': { navRequired: 35, cost: 19 },
    'FRIGATE': { navRequired: 55, cost: 22 },
    'FAST_GALLEON': { navRequired: 65, cost: 24 },
    'SPANISH_GALLEON': { navRequired: 80, cost: 27 },
    'WAR_GALLEON': { navRequired: 100, cost: 30 }
};

/**
 * Get max fleet size based on navigation skill
 */
function getMaxFleetSize(navigationSkill) {
    // Simple formula: 1 ship per 10 nav skill, minimum 1
    return Math.max(1, Math.floor(navigationSkill / 10));
}

/**
 * Check if player can sail a ship class
 */
function canSailShipClass(shipClassName, navigationSkill) {
    const req = SHIP_NAV_REQUIREMENTS[shipClassName];
    return navigationSkill >= req.navRequired;
}

module.exports = {
    SHIP_NAV_REQUIREMENTS,
    getMaxFleetSize,
    canSailShipClass
};
