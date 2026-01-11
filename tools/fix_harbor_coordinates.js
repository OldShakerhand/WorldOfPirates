const fs = require('fs');

/**
 * Apply coordinate transformation to fix harbor positions
 * 
 * The CSV harbor coordinates were based on a different map projection.
 * This tool applies a scaling + offset transformation to correct them.
 * 
 * Transformation formula (calculated from Nassau + Eleuthera):
 *   actualX = currentX * scaleX + offsetX
 *   actualY = currentY * scaleY + offsetY
 */

// Transformation parameters (calculated from Nassau, Eleuthera, Andros, Abaco using least-squares)
const TRANSFORM = {
    scaleX: 0.905646,
    scaleY: 1.008774,
    offsetX: 1734.97,
    offsetY: -848.84
};

function transformCoordinates(inputPath, outputPath) {
    console.log('Loading harbors from:', inputPath);
    const harbors = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    console.log(`Transforming ${harbors.length} harbors...`);
    console.log(`Scale: (${TRANSFORM.scaleX.toFixed(6)}, ${TRANSFORM.scaleY.toFixed(6)})`);
    console.log(`Offset: (${TRANSFORM.offsetX.toFixed(2)}, ${TRANSFORM.offsetY.toFixed(2)})\n`);

    let transformed = 0;

    for (const harbor of harbors) {
        const oldX = harbor.tileX;
        const oldY = harbor.tileY;

        // Apply transformation: actual = current * scale + offset
        const worldX = oldX * 25;  // Convert to world coordinates
        const worldY = oldY * 25;

        const newWorldX = worldX * TRANSFORM.scaleX + TRANSFORM.offsetX;
        const newWorldY = worldY * TRANSFORM.scaleY + TRANSFORM.offsetY;

        // Convert back to tiles
        harbor.tileX = Math.round(newWorldX / 25);
        harbor.tileY = Math.round(newWorldY / 25);

        transformed++;

        // Log first few for verification
        if (transformed <= 3) {
            console.log(`${harbor.name}:`);
            console.log(`  Old: tile (${oldX}, ${oldY}) = world (${worldX}, ${worldY})`);
            console.log(`  New: tile (${harbor.tileX}, ${harbor.tileY}) = world (${harbor.tileX * 25}, ${harbor.tileY * 25})`);
        }
    }

    console.log(`\n✓ Transformed ${transformed} harbors`);

    // Save
    fs.writeFileSync(outputPath, JSON.stringify(harbors, null, 2));
    console.log(`✓ Saved to ${outputPath}`);
}

// Run
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node fix_harbor_coordinates.js <input.json> <output.json>');
    console.error('Example: node fix_harbor_coordinates.js assets/harbors.json assets/harbors_fixed.json');
    process.exit(1);
}

transformCoordinates(args[0], args[1]);
