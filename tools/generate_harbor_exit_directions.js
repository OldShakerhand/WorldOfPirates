/**
 * Generate Harbor Exit Directions Tool
 * 
 * Generates exitDirection values for all harbors based on coastline detection.
 * This migrates from runtime detection to stored data.
 * 
 * Usage:
 *   node tools/generate_harbor_exit_directions.js [--dry-run]
 * 
 * Options:
 *   --dry-run    Preview changes without modifying files
 * 
 * Output:
 *   Updates src/server/assets/harbors.json with exitDirection field
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    TILE_SIZE: 25,
    MAX_SEARCH_DISTANCE: 25,  // Increased to handle small islands
    TERRAIN: {
        WATER: 0,
        SHALLOW: 1,
        LAND: 2
    }
};

// 8 Direction definitions for better diagonal coastline detection
const DIRECTIONS = [
    // Cardinal directions
    { dx: 0, dy: -1, name: 'north' },      // N: exit toward -Y
    { dx: 1, dy: 0, name: 'east' },        // E: exit toward +X
    { dx: 0, dy: 1, name: 'south' },       // S: exit toward +Y
    { dx: -1, dy: 0, name: 'west' },       // W: exit toward -X
    // Diagonal directions
    { dx: 1, dy: -1, name: 'northeast' },  // NE: exit toward +X, -Y
    { dx: 1, dy: 1, name: 'southeast' },   // SE: exit toward +X, +Y
    { dx: -1, dy: 1, name: 'southwest' },  // SW: exit toward -X, +Y
    { dx: -1, dy: -1, name: 'northwest' }  // NW: exit toward -X, -Y
];

// Load JSON file
function loadJSON(filepath) {
    const content = fs.readFileSync(filepath, 'utf8');
    return JSON.parse(content);
}

// Save JSON file with pretty formatting
function saveJSON(filepath, data) {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, content, 'utf8');
}

// Get terrain at tile coordinates
function getTerrain(tilemap, tileX, tileY) {
    if (!tilemap.tiles) return CONFIG.TERRAIN.WATER;
    const row = tilemap.tiles[tileY];
    if (!row) return CONFIG.TERRAIN.WATER;
    return row[tileX] ?? CONFIG.TERRAIN.WATER;
}

/**
 * Compute exit direction for a harbor based on coastline detection
 * 
 * Logic matches Harbor.js _computeCoastlineOrientation():
 * - If on land: search for water, exit direction is TOWARD water
 * - If in water: search for land, exit direction is AWAY from land
 * 
 * @returns {Object} { x: -1|0|1, y: -1|0|1 } or null if no coastline found
 */
function computeExitDirection(tilemap, tileX, tileY) {
    const currentTerrain = getTerrain(tilemap, tileX, tileY);
    const onLand = (currentTerrain === CONFIG.TERRAIN.LAND);

    let best = null;

    // Scan all 4 directions
    for (const dir of DIRECTIONS) {
        for (let d = 1; d <= CONFIG.MAX_SEARCH_DISTANCE; d++) {
            const checkX = tileX + dir.dx * d;
            const checkY = tileY + dir.dy * d;
            const terrain = getTerrain(tilemap, checkX, checkY);

            if (onLand) {
                // Starting on land: look for water/shallow
                if (terrain === CONFIG.TERRAIN.WATER || terrain === CONFIG.TERRAIN.SHALLOW) {
                    // Found water - exit direction is THIS direction (toward water)
                    if (!best || d < best.distance) {
                        best = {
                            dir,
                            distance: d,
                            exitX: dir.dx,
                            exitY: dir.dy
                        };
                    }
                    break;
                }
            } else {
                // Starting in water: look for land
                if (terrain === CONFIG.TERRAIN.LAND) {
                    // Found land - exit direction is OPPOSITE (away from land)
                    if (!best || d < best.distance) {
                        best = {
                            dir,
                            distance: d,
                            exitX: -dir.dx,
                            exitY: -dir.dy
                        };
                    }
                    break;
                }
            }
        }
    }

    if (!best) {
        return null;
    }

    return { x: best.exitX, y: best.exitY };
}

/**
 * Get direction name from exit direction
 */
function getDirectionName(exitDir) {
    if (!exitDir) return 'unknown';

    const { x, y } = exitDir;
    if (x === 0 && y === -1) return 'north';
    if (x === 1 && y === 0) return 'east';
    if (x === 0 && y === 1) return 'south';
    if (x === -1 && y === 0) return 'west';
    if (x === 1 && y === -1) return 'northeast';
    if (x === 1 && y === 1) return 'southeast';
    if (x === -1 && y === 1) return 'southwest';
    if (x === -1 && y === -1) return 'northwest';
    return 'unknown';
}

/**
 * Find CENTER of CONTIGUOUS shallow water band near the coastline
 * Scans from land toward water, finds only the connected shallow tiles
 * 
 * @param {Object} tilemap - World map data
 * @param {number} tileX - Current tile X
 * @param {number} tileY - Current tile Y  
 * @param {Object} exitDirection - Direction toward water {x, y}
 * @param {number} maxDistance - Maximum search distance in tiles (default: 15)
 * @returns {Object|null} {newTileX, newTileY, distance} or null if not found
 */
function findShallowWaterPosition(tilemap, tileX, tileY, exitDirection, maxDistance = 15) {
    if (!exitDirection) return null;

    // Normalize direction for stepping
    const magnitude = Math.hypot(exitDirection.x, exitDirection.y);
    const stepX = exitDirection.x / magnitude;
    const stepY = exitDirection.y / magnitude;

    // Strategy: Scan from LAND toward WATER (opposite of exit direction)
    // Find where the contiguous shallow band is, then take the center

    let shallowTiles = [];
    let foundLand = false;
    let inShallowBand = false;

    // Scan from far toward land to far toward water
    for (let d = -maxDistance; d <= maxDistance; d++) {
        const checkX = tileX + Math.round(stepX * d);
        const checkY = tileY + Math.round(stepY * d);
        const terrain = getTerrain(tilemap, checkX, checkY);

        if (terrain === CONFIG.TERRAIN.LAND) {
            foundLand = true;
            // If we were in shallow band, we've now hit land on the other side - stop
            if (inShallowBand) break;
        } else if (terrain === CONFIG.TERRAIN.SHALLOW) {
            // Only record shallow tiles AFTER we've found land (so it's coastal shallow)
            if (foundLand) {
                inShallowBand = true;
                shallowTiles.push({ x: checkX, y: checkY, d: d });
            }
        } else if (terrain === CONFIG.TERRAIN.WATER) {
            // If we were in shallow band and hit deep water, stop - we found the band
            if (inShallowBand) break;
        }
    }

    if (shallowTiles.length === 0) {
        return null; // No contiguous shallow water found
    }

    // Find the center tile of the shallow band (middle index)
    const centerIndex = Math.floor(shallowTiles.length / 2);
    const centerTile = shallowTiles[centerIndex];

    // Calculate distance moved
    const distance = Math.round(Math.hypot(centerTile.x - tileX, centerTile.y - tileY));

    return { newTileX: centerTile.x, newTileY: centerTile.y, distance };
}

/**
 * Process all harbors: compute exitDirection and adjust tile coordinates to shallow water
 */
function processHarbors(tilemap, harbors) {
    const stats = {
        total: harbors.length,
        updated: 0,
        skipped: 0,
        noCoastline: 0,
        movedToShallow: 0,
        alreadyInShallow: 0,
        couldNotMove: 0,
        directions: { north: 0, east: 0, south: 0, west: 0, northeast: 0, northwest: 0, southeast: 0, southwest: 0, unknown: 0 }
    };

    const results = [];

    for (const harbor of harbors) {
        const { id, name, tileX, tileY } = harbor;

        if (tileX === undefined || tileY === undefined) {
            console.warn(`  [SKIP] ${name || id}: No tile coordinates`);
            stats.skipped++;
            results.push({ ...harbor });
            continue;
        }

        const exitDirection = computeExitDirection(tilemap, tileX, tileY);

        if (!exitDirection) {
            console.warn(`  [WARN] ${name || id}: No coastline found within ${CONFIG.MAX_SEARCH_DISTANCE} tiles`);
            stats.noCoastline++;
            // Default to north if no coastline found
            results.push({ ...harbor, exitDirection: { x: 0, y: -1 } });
            continue;
        }

        const dirName = getDirectionName(exitDirection);
        stats.directions[dirName] = (stats.directions[dirName] || 0) + 1;
        stats.updated++;

        // Find shallow water position in exit direction
        const shallowPos = findShallowWaterPosition(tilemap, tileX, tileY, exitDirection);

        let newTileX = tileX;
        let newTileY = tileY;
        let moveMsg = '';

        if (shallowPos) {
            if (shallowPos.distance === 0) {
                stats.alreadyInShallow++;
                moveMsg = '(already in shallow)';
            } else {
                newTileX = shallowPos.newTileX;
                newTileY = shallowPos.newTileY;
                stats.movedToShallow++;
                moveMsg = `(moved ${shallowPos.distance} tiles to shallow)`;
            }
        } else {
            stats.couldNotMove++;
            moveMsg = '(no shallow found, keeping position)';
        }

        console.log(`  [OK] ${name || id}: exits ${dirName} ${moveMsg}`);

        // Update harbor data with exitDirection and potentially new tile coordinates
        results.push({
            ...harbor,
            tileX: newTileX,
            tileY: newTileY,
            exitDirection
        });
    }

    return { harbors: results, stats };
}

/**
 * Print statistics report
 */
function printReport(stats) {
    console.log('\n========================================');
    console.log('  Harbor Exit Direction Migration Report');
    console.log('========================================\n');
    console.log(`Total harbors:     ${stats.total}`);
    console.log(`Updated:           ${stats.updated}`);
    console.log(`Skipped:           ${stats.skipped}`);
    console.log(`No coastline:      ${stats.noCoastline}`);
    console.log('\nPosition Adjustments:');
    console.log(`  Already in shallow: ${stats.alreadyInShallow}`);
    console.log(`  Moved to shallow:   ${stats.movedToShallow}`);
    console.log(`  Could not move:     ${stats.couldNotMove}`);
    console.log('\nDirection Distribution:');
    for (const [dir, count] of Object.entries(stats.directions)) {
        if (count > 0) {
            console.log(`  ${dir.padEnd(10)}: ${count}`);
        }
    }
    console.log('');
}

/**
 * Main execution
 */
function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    console.log('===========================================');
    console.log('  Generate Harbor Exit Directions');
    console.log('===========================================');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no files modified)' : 'LIVE'}\n`);

    // Paths
    const harborsPath = path.join(__dirname, '../src/server/assets/harbors.json');
    const worldMapPath = path.join(__dirname, '../src/server/assets/world_map.json');

    // Load data
    console.log('Loading data...');

    if (!fs.existsSync(harborsPath)) {
        console.error(`ERROR: harbors.json not found at ${harborsPath}`);
        process.exit(1);
    }

    if (!fs.existsSync(worldMapPath)) {
        console.error(`ERROR: world_map.json not found at ${worldMapPath}`);
        process.exit(1);
    }

    const harbors = loadJSON(harborsPath);
    const worldMap = loadJSON(worldMapPath);

    console.log(`  Loaded ${harbors.length} harbors`);
    console.log(`  Loaded world map (${worldMap.width}x${worldMap.height} tiles)\n`);

    // Process harbors
    console.log('Computing exit directions...\n');
    const { harbors: updatedHarbors, stats } = processHarbors(worldMap, harbors);

    // Print report
    printReport(stats);

    // Save results
    if (!dryRun) {
        console.log('Saving updated harbors.json...');
        saveJSON(harborsPath, updatedHarbors);
        console.log('  Done!\n');
    } else {
        console.log('[DRY RUN] No files modified.\n');
    }

    console.log('Migration complete!');
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { computeExitDirection, processHarbors };
