/**
 * Harbor Registry
 * 
 * Loads and provides queries for harbor metadata.
 * 
 * DESIGN CONTRACT:
 * - Immutable after load (no runtime mutation)
 * - Pure data storage and queries
 * - NO terrain logic (use WorldMap separately)
 * - NO gameplay mechanics
 * - Server-authoritative only
 * 
 * Responsibilities:
 * - Load harbors.json
 * - Provide harbor queries (by ID, by nation, nearest harbor)
 * - Store ALL harbor metadata (even if unused)
 * 
 * NOT responsible for:
 * - Terrain checks (water/shallow/land)
 * - Rendering or UI
 * - Gameplay systems (bank, shipyard, jobs)
 */

const fs = require('fs');
const path = require('path');
const GameConfig = require('../config/GameConfig');

class HarborRegistry {
    /**
     * Load harbors and trade profiles from JSON files
     * @param {string} jsonPath - Path to harbors.json
     * @param {string} tradeProfilesPath - Path to harbor_trade_profiles.json
     */
    constructor(jsonPath, tradeProfilesPath) {
        console.log(`[HarborRegistry] Loading harbors from: ${jsonPath}`);

        if (!fs.existsSync(jsonPath)) {
            throw new Error(`Harbor data not found: ${jsonPath}`);
        }

        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

        if (!Array.isArray(data)) {
            throw new Error(`Invalid harbor data: expected array, got ${typeof data}`);
        }

        // Store harbors (immutable)
        this.harbors = Object.freeze(data);

        // Create ID → harbor map for O(1) lookups
        this.harborMap = new Map();
        for (const harbor of this.harbors) {
            if (!harbor.id) {
                console.warn(`[HarborRegistry] Harbor missing ID:`, harbor);
                continue;
            }
            this.harborMap.set(harbor.id, harbor);
        }

        console.log(`[HarborRegistry] Loaded ${this.harbors.length} harbors`);

        // Load trade profiles (Phase 0: Economy)
        console.log(`[HarborRegistry] Loading trade profiles from: ${tradeProfilesPath}`);
        if (fs.existsSync(tradeProfilesPath)) {
            this.tradeProfiles = JSON.parse(fs.readFileSync(tradeProfilesPath, 'utf-8'));
            console.log(`[HarborRegistry] Loaded ${Object.keys(this.tradeProfiles).length} trade profiles`);
        } else {
            console.warn(`[HarborRegistry] Trade profiles not found: ${tradeProfilesPath}`);
            this.tradeProfiles = {};
        }
    }

    /**
     * Get all harbors
     * @returns {Array} Array of all harbor objects
     */
    getAllHarbors() {
        return this.harbors;
    }

    /**
     * Get harbor by ID
     * @param {string} id - Harbor ID
     * @returns {Object|null} Harbor object or null if not found
     */
    getHarborById(id) {
        return this.harborMap.get(id) || null;
    }

    /**
     * Get nearest harbor within distance
     * @param {number} tileX - Tile X coordinate
     * @param {number} tileY - Tile Y coordinate
     * @param {number} maxDistanceTiles - Maximum distance in tiles (default: 3)
     * @returns {Object|null} Nearest harbor or null if none within distance
     */
    getNearestHarbor(tileX, tileY, maxDistanceTiles = 3) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const harbor of this.harbors) {
            const dist = Math.hypot(harbor.tileX - tileX, harbor.tileY - tileY);

            if (dist < nearestDist && dist <= maxDistanceTiles) {
                nearest = harbor;
                nearestDist = dist;
            }
        }

        return nearest;
    }

    /**
     * Get all harbors for a given nation
     * @param {string} nation - Nation ID (e.g., 'england', 'spain')
     * @returns {Array} Array of harbors belonging to the nation
     */
    getHarborsByNation(nation) {
        return this.harbors.filter(h => h.nation === nation);
    }

    /**
     * Get harbor count
     * @returns {number} Total number of harbors
     */
    getHarborCount() {
        return this.harbors.length;
    }

    /**
     * Get harbor economy data (resolved from trade profile)
     * Phase 0: Economy system - Dynamic Price Calculation
     * @param {string} harborId - Harbor ID
     * @returns {Object|null} Resolved economy data or null if not available
     */
    getHarborEconomy(harborId) {
        const harbor = this.getHarborById(harborId);
        if (!harbor || !harbor.harborTradeId) return null;

        // Resolve trade profile
        const tradeProfile = this.tradeProfiles[harbor.harborTradeId];
        if (!tradeProfile) {
            // Graceful fallback during migration if profile missing
            console.warn(`[HarborRegistry] Trade profile not found: ${harbor.harborTradeId} for harbor ${harborId}`);
            return null;
        }

        const { getGood } = require('../entities/Goods');
        const { BASE_PRICES, TRADE_TIERS, HARBOR_SELL_MARGIN, PRICE_VARIATION } = GameConfig.ECONOMY;

        // Calculate variation factor (-5% to +5%)
        const variation = this._getPriceVariation(harborId);
        const variationFactor = 1.0 + (variation * PRICE_VARIATION);

        const tradeableGoods = tradeProfile.goods
            .map(hg => {
                const good = getGood(hg.goodId);
                // Skip invalid goods or mission-only items
                if (!good || (good.tags && good.tags.includes('MISSION_ONLY'))) {
                    return null;
                }

                // Calculate Prices
                const basePrice = BASE_PRICES[hg.goodId.toUpperCase()] || 10;
                const tierMultiplier = TRADE_TIERS[hg.tier] || TRADE_TIERS.STANDARD;

                // Buy Price: What player pays to buy from harbor
                let buyPrice = basePrice * tierMultiplier;
                // Apply local variation
                buyPrice = buyPrice * variationFactor;

                // Sell Price: What player gets when selling to harbor (margin applied)
                let sellPrice = buyPrice * HARBOR_SELL_MARGIN;

                // Rounding
                buyPrice = Math.max(1, Math.round(buyPrice));
                sellPrice = Math.max(1, Math.round(sellPrice));

                return {
                    id: good.id,
                    name: good.name,
                    category: good.category,
                    space: good.space,
                    buyPrice: buyPrice,
                    sellPrice: sellPrice,
                    tier: hg.tier // Exposed for UI to show "High Demand" etc.
                };
            })
            .filter(g => g !== null);

        return {
            goods: tradeableGoods,
            profileId: tradeProfile.id,
            profileName: tradeProfile.name
        };
    }

    /**
     * Generate deterministic price variation for a harbor
     * @param {string} harborId 
     * @returns {number} Value between -1.0 and 1.0
     */
    _getPriceVariation(harborId) {
        let hash = 0;
        for (let i = 0; i < harborId.length; i++) {
            const char = harborId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // Normalize to -1.0 to 1.0
        const normalized = (hash % 1000) / 1000;
        return normalized;
    }
}

module.exports = HarborRegistry;
