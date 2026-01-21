/**
 * Goods Definitions
 * 
 * Semantic types for tradeable goods in the economy system.
 * 
 * DESIGN PRINCIPLE: Goods are data, not logic.
 * - NO prices (prices live in harbor trade profiles)
 * - NO base values or weight systems
 * - NO perishability or usage mechanics
 * 
 * Properties:
 * - id: Unique identifier (lowercase, underscores)
 * - name: Display name
 * - category: Semantic category (material, luxury, food, weapon, etc.)
 * - intents: What can be done with the good (TRADE, USE)
 * - properties.legality: LEGAL or ILLEGAL (not enforced in Phase 0)
 * - tags: Optional special behaviors (e.g., MISSION_ONLY)
 * - space: Cargo space cost (integer)
 */

const GOODS = {
    // Materials
    WOOD: {
        id: 'wood',
        name: 'Wood',
        category: 'material',
        intents: ['TRADE', 'USE'],
        properties: { legality: 'LEGAL' },
        space: 1
    },
    IRON: {
        id: 'iron',
        name: 'Iron',
        category: 'material',
        intents: ['TRADE', 'USE'],
        properties: { legality: 'LEGAL' },
        space: 2
    },

    // Luxury goods
    RUM: {
        id: 'rum',
        name: 'Rum',
        category: 'luxury',
        intents: ['TRADE'],
        properties: { legality: 'LEGAL' },
        space: 1
    },
    SUGAR: {
        id: 'sugar',
        name: 'Sugar',
        category: 'luxury',
        intents: ['TRADE'],
        properties: { legality: 'LEGAL' },
        space: 1
    },
    TOBACCO: {
        id: 'tobacco',
        name: 'Tobacco',
        category: 'luxury',
        intents: ['TRADE'],
        properties: { legality: 'LEGAL' },
        space: 1
    },

    // Food
    FOOD: {
        id: 'food',
        name: 'Food',
        category: 'food',
        intents: ['TRADE', 'USE'],
        properties: { legality: 'LEGAL' },
        space: 1
    },

    // Illegal goods (semantic only, no enforcement in Phase 0)
    CONTRABAND: {
        id: 'contraband',
        name: 'Contraband',
        category: 'luxury',
        intents: ['TRADE'],
        properties: { legality: 'ILLEGAL' },
        space: 1
    },

    // Mission-only goods (not tradeable in Phase 0)
    MISSION_CARGO: {
        id: 'mission_cargo',
        name: 'Mission Cargo',
        category: 'material',
        intents: ['TRADE'],
        properties: { legality: 'LEGAL' },
        tags: ['MISSION_ONLY'],
        space: 5
    }
};

/**
 * Get good definition by ID
 * @param {string} goodId - Good ID (e.g., 'rum', 'wood')
 * @returns {Object|null} Good definition or null if not found
 */
function getGood(goodId) {
    // Convert to uppercase to match GOODS keys
    const key = goodId.toUpperCase();
    return GOODS[key] || null;
}

module.exports = {
    GOODS,
    getGood
};
