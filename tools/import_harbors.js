/**
 * Harbor Import Tool
 * 
 * Converts CSV harbor data with lat/lon coordinates to JSON with tile coordinates.
 * 
 * Usage:
 *   node tools/import_harbors.js <input.csv> <output.json>
 * 
 * Example:
 *   node tools/import_harbors.js assets/harbors.csv assets/harbors.json
 */

const fs = require('fs');
const path = require('path');

// Geographic bounds (lat/lon) - Extended to include Gulf of Mexico + US Gulf Coast
const BOUNDS = {
    north: 35.0,   // US Gulf Coast (extended from 28.5)
    south: 5.0,    // Panama/Colombia
    west: -98.5,   // Western Gulf of Mexico (extended to include all harbors)
    east: -60.0    // Lesser Antilles
};

// World dimensions (tiles) - MUST match actual map size
const WORLD = {
    widthTiles: 6460,   // Full Gulf of Mexico + Caribbean map
    heightTiles: 3403,  // Full map height
    tileSize: 25
};

/**
 * Parse lat/lon string to decimal degrees
 * Handles formats: "28.35°N, 77.35°W" or "28.35°N 77.35°W"
 */
function parseLatLon(coordString) {
    // Remove degree symbols and split
    const cleaned = coordString.replace(/°/g, '').trim();
    const parts = cleaned.split(/[,\s]+/);

    if (parts.length < 2) {
        throw new Error(`Invalid coordinate format: ${coordString}`);
    }

    // Parse latitude (first part)
    const latMatch = parts[0].match(/^([\d.]+)([NS])$/i);
    if (!latMatch) {
        throw new Error(`Invalid latitude: ${parts[0]}`);
    }
    let lat = parseFloat(latMatch[1]);
    if (latMatch[2].toUpperCase() === 'S') lat = -lat;

    // Parse longitude (second part)
    const lonMatch = parts[1].match(/^([\d.]+)([EW])$/i);
    if (!lonMatch) {
        throw new Error(`Invalid longitude: ${parts[1]}`);
    }
    let lon = parseFloat(lonMatch[1]);
    if (lonMatch[2].toUpperCase() === 'W') lon = -lon;

    return { lat, lon };
}

/**
 * Convert lat/lon to tile coordinates
 */
function latLonToTile(lat, lon) {
    // Check bounds
    if (lat < BOUNDS.south || lat > BOUNDS.north) {
        throw new Error(`Latitude ${lat} outside bounds [${BOUNDS.south}, ${BOUNDS.north}]`);
    }
    if (lon < BOUNDS.west || lon > BOUNDS.east) {
        throw new Error(`Longitude ${lon} outside bounds [${BOUNDS.west}, ${BOUNDS.east}]`);
    }

    // Normalize to 0-1
    const normX = (lon - BOUNDS.west) / (BOUNDS.east - BOUNDS.west);
    const normY = (BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south);

    // Scale to tiles
    const tileX = Math.round(normX * WORLD.widthTiles);
    const tileY = Math.round(normY * WORLD.heightTiles);

    return { tileX, tileY };
}

/**
 * Parse CSV line (comma-separated, handles quoted fields)
 */
function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    // Push last field
    fields.push(current.trim());

    if (fields.length < 8) {
        throw new Error(`Invalid CSV line (expected 8 fields, got ${fields.length})`);
    }

    return {
        name: fields[0],
        coordinates: fields[1],
        type: fields[2],
        nation: fields[3],
        defenses: fields[4],
        bank: fields[5],
        shipyardMax: fields[6],
        jobShipType: fields[7]
    };
}

/**
 * Map nation name to ID
 */
function mapNation(nation) {
    const mapping = {
        'England': 'england',
        'Spain': 'spain',
        'Holland': 'holland',
        'France': 'france',
        'Pirates': 'pirates',
        'Pirate': 'pirates'
    };
    return mapping[nation] || nation.toLowerCase();
}

/**
 * Map defenses to ID
 */
function mapDefenses(defenses) {
    const mapping = {
        'None': 'none',
        '1 Fort': 'fort',
        '2 Forts': 'fort_2',
        'City Walls': 'walls'
    };
    return mapping[defenses] || 'none';
}

/**
 * Map ship class name to ID
 */
function mapShipClass(shipClass) {
    if (!shipClass || shipClass === 'None') return null;

    // Convert to lowercase with underscores
    return shipClass.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Create harbor ID from name
 */
function createHarborId(name) {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Import harbors from CSV
 */
function importHarbors(csvPath) {
    console.log(`Reading CSV from: ${csvPath}`);

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    // Skip header line
    const dataLines = lines.slice(1);

    const harbors = [];
    const warnings = [];
    let errorCount = 0;

    for (let i = 0; i < dataLines.length; i++) {
        const lineNum = i + 2; // +2 for header and 0-index

        try {
            const row = parseCSVLine(dataLines[i]);

            // Parse coordinates
            const { lat, lon } = parseLatLon(row.coordinates);

            // Convert to tile coordinates
            const { tileX, tileY } = latLonToTile(lat, lon);

            // Create harbor object
            const harbor = {
                id: createHarborId(row.name),
                name: row.name,
                tileX: tileX,
                tileY: tileY,
                lat: lat,
                lon: lon,
                nation: mapNation(row.nation),
                defenses: mapDefenses(row.defenses),
                services: {
                    bank: row.bank.toLowerCase() === 'yes',
                    shipyardMax: mapShipClass(row.shipyardMax),
                    jobShipType: mapShipClass(row.jobShipType)
                }
            };

            harbors.push(harbor);

        } catch (error) {
            errorCount++;
            console.error(`✗ Line ${lineNum}: ${error.message}`);
        }
    }

    console.log(`\n✓ Imported ${harbors.length} harbors`);
    if (errorCount > 0) {
        console.log(`✗ ${errorCount} errors encountered`);
    }

    return { harbors, warnings };
}

/**
 * Validate harbor positions
 * Note: Requires WorldMap to be loaded, so validation is optional
 */
function validateHarbors(harbors) {
    const warnings = [];

    // Check for duplicate IDs
    const ids = new Set();
    for (const harbor of harbors) {
        if (ids.has(harbor.id)) {
            warnings.push(`⚠ Duplicate ID: ${harbor.id} (${harbor.name})`);
        }
        ids.add(harbor.id);
    }

    // Check for harbors too close together
    for (let i = 0; i < harbors.length; i++) {
        for (let j = i + 1; j < harbors.length; j++) {
            const h1 = harbors[i];
            const h2 = harbors[j];

            const dist = Math.hypot(h1.tileX - h2.tileX, h1.tileY - h2.tileY);

            if (dist < 5) {
                warnings.push(
                    `⚠ ${h1.name} (${h1.tileX}, ${h1.tileY}) and ${h2.name} (${h2.tileX}, ${h2.tileY}) ` +
                    `are only ${dist.toFixed(1)} tiles apart`
                );
            }
        }
    }

    return warnings;
}

/**
 * Main
 */
function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: node import_harbors.js <input.csv> <output.json>');
        process.exit(1);
    }

    const inputPath = args[0];
    const outputPath = args[1];

    if (!fs.existsSync(inputPath)) {
        console.error(`Error: Input file not found: ${inputPath}`);
        process.exit(1);
    }

    try {
        // Import harbors
        const { harbors, warnings } = importHarbors(inputPath);

        // Validate
        const validationWarnings = validateHarbors(harbors);

        // Print warnings
        if (validationWarnings.length > 0) {
            console.log('\nValidation warnings:');
            validationWarnings.forEach(w => console.log(w));
        }

        // Save to JSON
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(outputPath, JSON.stringify(harbors, null, 2));

        console.log(`\n✓ Saved to ${outputPath}`);
        console.log(`\nSummary:`);
        console.log(`  Harbors: ${harbors.length}`);
        console.log(`  Warnings: ${validationWarnings.length}`);

    } catch (error) {
        console.error(`\nFatal error: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { parseLatLon, latLonToTile, importHarbors };
