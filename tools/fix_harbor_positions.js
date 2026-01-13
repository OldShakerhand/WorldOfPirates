/**
 * Harbor Position Auto-Correction Tool
 * 
 * Automatically adjusts harbor positions to the nearest shallow water tile.
 * Prevents harbors from being on land or in deep water.
 * 
 * Usage:
 *   node tools/fix_harbor_positions.js [--dry-run]
 * 
 * Output:
 *   assets/harbors.json (updated)
 *   assets/harbors_backup.json (original backup)
 *   Console report with statistics
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    TILE_SIZE: 25,           // World tile size
    MAX_SEARCH_RADIUS: 25,   // Max tiles to search (625px)
    TERRAIN: {
        WATER: 0,      // Deep water - avoid
        SHALLOW: 1,    // Shallow water - TARGET
        LAND: 2        // Land - avoid
    }
};

/**
 * Load JSON file
 */
function loadJSON(filepath) {
    const fullPath = path.join(__dirname, '..', filepath);
    console.log(`Loading ${filepath}...`);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`✓ Loaded ${filepath}`);
    return data;
}

/**
 * Save JSON file
 */
function saveJSON(filepath, data) {
    const fullPath = path.join(__dirname, '..', filepath);
    console.log(`\nSaving ${filepath}...`);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ Saved ${filepath}`);
}

/**
 * Get terrain type at tile coordinates
 */
function getTerrain(tilemap, tileX, tileY) {
    if (tileX < 0 || tileX >= tilemap.width || tileY < 0 || tileY >= tilemap.height) {
        return null; // Out of bounds
    }
    return tilemap.tiles[tileY][tileX];
}

/**
 * Get all points at a given radius (spiral search)
 */
function getPointsAtRadius(centerX, centerY, radius) {
    const points = [];

    // Top and bottom edges
    for (let x = centerX - radius; x <= centerX + radius; x++) {
        points.push({ x, y: centerY - radius });
        points.push({ x, y: centerY + radius });
    }

    // Left and right edges (excluding corners already added)
    for (let y = centerY - radius + 1; y < centerY + radius; y++) {
        points.push({ x: centerX - radius, y });
        points.push({ x: centerX + radius, y });
    }

    return points;
}

/**
 * Find nearest shallow water tile
 */
function findNearestShallowWater(tilemap, startX, startY, maxRadius = CONFIG.MAX_SEARCH_RADIUS) {
    // Check if already on shallow water
    const currentTerrain = getTerrain(tilemap, startX, startY);
    if (currentTerrain === CONFIG.TERRAIN.SHALLOW) {
        return { tileX: startX, tileY: startY, distance: 0, terrain: 'shallow' };
    }

    // Spiral outward from starting position
    for (let radius = 1; radius <= maxRadius; radius++) {
        const candidates = getPointsAtRadius(startX, startY, radius);

        for (const point of candidates) {
            const terrain = getTerrain(tilemap, point.x, point.y);
            if (terrain === CONFIG.TERRAIN.SHALLOW) {
                return {
                    tileX: point.x,
                    tileY: point.y,
                    distance: radius,
                    terrain: 'shallow'
                };
            }
        }
    }

    // No shallow water found within radius
    return null;
}

/**
 * Get terrain type name
 */
function getTerrainName(terrainType) {
    switch (terrainType) {
        case CONFIG.TERRAIN.WATER: return 'deep_water';
        case CONFIG.TERRAIN.SHALLOW: return 'shallow_water';
        case CONFIG.TERRAIN.LAND: return 'land';
        default: return 'unknown';
    }
}

/**
 * Process all harbors
 */
function processHarbors(tilemap, harbors) {
    const stats = {
        total: harbors.length,
        alreadyCorrect: 0,
        movedFromLand: 0,
        movedFromDeepWater: 0,
        tooFarFromLand: 0,
        totalDistanceMoved: 0,
        maxDistance: 0,
        changes: []
    };

    console.log(`\n=== Processing ${harbors.length} Harbors ===\n`);

    harbors.forEach((harbor, index) => {
        const originalTerrain = getTerrain(tilemap, harbor.tileX, harbor.tileY);
        const originalTerrainName = getTerrainName(originalTerrain);

        // Find nearest shallow water
        const result = findNearestShallowWater(tilemap, harbor.tileX, harbor.tileY);

        if (!result) {
            // No shallow water found within search radius
            stats.tooFarFromLand++;
            console.log(`⚠️  ${harbor.name}: Too far from land (${originalTerrainName}) - SKIPPED`);
            stats.changes.push({
                name: harbor.name,
                status: 'skipped',
                reason: 'too_far_from_land',
                originalTerrain: originalTerrainName,
                originalTileX: harbor.tileX,
                originalTileY: harbor.tileY
            });
            return;
        }

        if (result.distance === 0) {
            // Already on shallow water
            stats.alreadyCorrect++;
            if ((index + 1) % 20 === 0) {
                console.log(`✓ ${harbor.name}: Already on shallow water`);
            }
            return;
        }

        // Harbor needs to be moved
        const change = {
            name: harbor.name,
            status: 'moved',
            originalTerrain: originalTerrainName,
            originalTileX: harbor.tileX,
            originalTileY: harbor.tileY,
            newTileX: result.tileX,
            newTileY: result.tileY,
            distance: result.distance
        };

        // Update harbor position
        harbor.tileX = result.tileX;
        harbor.tileY = result.tileY;

        // Update statistics
        if (originalTerrain === CONFIG.TERRAIN.LAND) {
            stats.movedFromLand++;
        } else if (originalTerrain === CONFIG.TERRAIN.WATER) {
            stats.movedFromDeepWater++;
        }

        stats.totalDistanceMoved += result.distance;
        stats.maxDistance = Math.max(stats.maxDistance, result.distance);
        stats.changes.push(change);

        console.log(`→ ${harbor.name}: Moved ${result.distance} tiles (${originalTerrainName} → shallow)`);
    });

    return stats;
}

/**
 * Print statistics report
 */
function printReport(stats) {
    console.log('\n' + '='.repeat(60));
    console.log('CORRECTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total harbors:              ${stats.total}`);
    console.log(`Already on shallow water:   ${stats.alreadyCorrect}`);
    console.log(`Moved from land:            ${stats.movedFromLand}`);
    console.log(`Moved from deep water:      ${stats.movedFromDeepWater}`);
    console.log(`Too far from land (skipped): ${stats.tooFarFromLand}`);
    console.log(`\nTotal moved:                ${stats.changes.filter(c => c.status === 'moved').length}`);
    console.log(`Average distance moved:     ${stats.changes.filter(c => c.status === 'moved').length > 0
        ? (stats.totalDistanceMoved / stats.changes.filter(c => c.status === 'moved').length).toFixed(1)
        : 0} tiles`);
    console.log(`Max distance moved:         ${stats.maxDistance} tiles`);
    console.log('='.repeat(60));

    // List harbors moved >20 tiles (for manual review)
    const largeMovements = stats.changes.filter(c => c.status === 'moved' && c.distance > 20);
    if (largeMovements.length > 0) {
        console.log('\n⚠️  LARGE MOVEMENTS (>20 tiles) - Manual Review Recommended:');
        largeMovements.forEach(change => {
            console.log(`   ${change.name}: ${change.distance} tiles`);
        });
    }

    // List skipped harbors
    if (stats.tooFarFromLand > 0) {
        console.log('\n⚠️  SKIPPED HARBORS (too far from land - missing islands?):');
        stats.changes.filter(c => c.status === 'skipped').forEach(change => {
            console.log(`   ${change.name} (${change.originalTerrain})`);
        });
    }
}

/**
 * Main execution
 */
function main() {
    console.log('=== Harbor Position Auto-Correction Tool ===\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    if (dryRun) {
        console.log('🔍 DRY RUN MODE - No files will be modified\n');
    }

    try {
        // Load data
        const tilemap = loadJSON('src/public/assets/world_map.json');
        const harbors = loadJSON('assets/harbors.json');

        console.log(`\nMap dimensions: ${tilemap.width}×${tilemap.height} tiles`);
        console.log(`Harbor count: ${harbors.length}`);
        console.log(`Max search radius: ${CONFIG.MAX_SEARCH_RADIUS} tiles (~${CONFIG.MAX_SEARCH_RADIUS * CONFIG.TILE_SIZE}px)`);

        // Create backup before processing (unless dry run)
        if (!dryRun) {
            const backupPath = 'assets/harbors_backup.json';
            saveJSON(backupPath, harbors);
            console.log(`✓ Backup created: ${backupPath}`);
        }

        // Process harbors
        const stats = processHarbors(tilemap, harbors);

        // Print report
        printReport(stats);

        // Save corrected harbors (unless dry run)
        if (!dryRun) {
            saveJSON('assets/harbors.json', harbors);
            console.log('\n✅ Harbor positions corrected!');
            console.log('\nNext steps:');
            console.log('1. Run: node tools/visualize_harbors.js --output output/harbors_after.png');
            console.log('2. Compare before/after images');
            console.log('3. Test harbor teleportation in-game');
            console.log('\nTo rollback: git checkout assets/harbors.json');
        } else {
            console.log('\n✅ Dry run complete - no files modified');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { findNearestShallowWater, processHarbors };
