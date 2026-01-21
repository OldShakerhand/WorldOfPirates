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
     * Phase 0: Economy system
     * @param {string} harborId - Harbor ID
     * @returns {Object|null} Resolved economy data or null if not available
     */
    getHarborEconomy(harborId) {
        const harbor = this.getHarborById(harborId);
        if (!harbor || !harbor.harborTradeId) return null;

        // Resolve trade profile
        const tradeProfile = this.tradeProfiles[harbor.harborTradeId];
        if (!tradeProfile) {
            console.warn(`[HarborRegistry] Trade profile not found: ${harbor.harborTradeId} for harbor ${harborId}`);
            return null;
        }


        // Filter out MISSION_ONLY goods and merge with full good definitions
        const { getGood } = require('../entities/Goods');
        const tradeableGoods = tradeProfile.goods
            .map(hg => {
                const good = getGood(hg.goodId);
                if (!good || (good.tags && good.tags.includes('MISSION_ONLY'))) {
                    return null;
                }

                // Merge good definition with pricing
                return {
                    id: good.id,
                    name: good.name,
                    category: good.category,
                    space: good.space,
                    buyPrice: hg.buyPrice,
                    sellPrice: hg.sellPrice
                };
            })
            .filter(g => g !== null); // Remove nulls

        return {
            goods: tradeableGoods,
            profileId: tradeProfile.id,
            profileName: tradeProfile.name
        };
    }
}

module.exports = HarborRegistry;
