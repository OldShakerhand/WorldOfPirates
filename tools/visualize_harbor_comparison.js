/**
 * Harbor Comparison Visualization Tool
 * 
 * Generates PNG showing which harbors would be affected by different search radius limits.
 * Color-codes harbors based on their distance from shallow water.
 * 
 * Usage:
 *   node tools/visualize_harbor_comparison.js
 * 
 * Output:
 *   tools/output/harbor_comparison.png
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Configuration
const CONFIG = {
    SCALE: 2,
    COLORS: {
        WATER: '#1a4d7a',
        SHALLOW: '#5dade2',
        LAND: '#654321',
        HARBOR_OK: '#00FF00',           // Green - already on shallow water
        HARBOR_CLOSE: '#FFD700',        // Yellow - within 15 tiles
        HARBOR_FAR: '#FF6600',          // Orange - 16-50 tiles
        HARBOR_TOO_FAR: '#FF0000'       // Red - beyond 50 tiles
    },
    HARBOR_RADIUS: 8,
    TILE_SIZE: 25,
    MAX_SEARCH_RADIUS: 50,
    TERRAIN: {
        WATER: 0,
        SHALLOW: 1,
        LAND: 2
    }
};

function loadJSON(filepath) {
    const fullPath = path.join(__dirname, '..', filepath);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return data;
}

function getTerrain(tilemap, tileX, tileY) {
    if (tileX < 0 || tileX >= tilemap.width || tileY < 0 || tileY >= tilemap.height) {
        return null;
    }
    return tilemap.tiles[tileY][tileX];
}

function getPointsAtRadius(centerX, centerY, radius) {
    const points = [];
    for (let x = centerX - radius; x <= centerX + radius; x++) {
        points.push({ x, y: centerY - radius });
        points.push({ x, y: centerY + radius });
    }
    for (let y = centerY - radius + 1; y < centerY + radius; y++) {
        points.push({ x: centerX - radius, y });
        points.push({ x: centerX + radius, y });
    }
    return points;
}

function findNearestShallowWater(tilemap, startX, startY, maxRadius = CONFIG.MAX_SEARCH_RADIUS) {
    const currentTerrain = getTerrain(tilemap, startX, startY);
    if (currentTerrain === CONFIG.TERRAIN.SHALLOW) {
        return { distance: 0 };
    }

    for (let radius = 1; radius <= maxRadius; radius++) {
        const candidates = getPointsAtRadius(startX, startY, radius);
        for (const point of candidates) {
            const terrain = getTerrain(tilemap, point.x, point.y);
            if (terrain === CONFIG.TERRAIN.SHALLOW) {
                return { distance: radius };
            }
        }
    }

    return null;
}

function categorizeHarbors(tilemap, harbors) {
    const categories = {
        ok: [],           // Already on shallow water
        close: [],        // 1-15 tiles
        far: [],          // 16-50 tiles
        tooFar: []        // Beyond 50 tiles
    };

    console.log('Analyzing harbor distances...');

    harbors.forEach((harbor, index) => {
        const result = findNearestShallowWater(tilemap, harbor.tileX, harbor.tileY);

        if (!result) {
            categories.tooFar.push(harbor);
        } else if (result.distance === 0) {
            categories.ok.push(harbor);
        } else if (result.distance <= 25) {
            categories.close.push(harbor);
        } else {
            categories.far.push(harbor);
        }

        if ((index + 1) % 20 === 0) {
            console.log(`  Progress: ${index + 1}/${harbors.length}`);
        }
    });

    return categories;
}

function renderMap(tilemap, categories) {
    const width = tilemap.width * CONFIG.SCALE;
    const height = tilemap.height * CONFIG.SCALE;

    console.log(`\nCreating canvas: ${width}×${height} pixels`);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw terrain
    console.log('Rendering terrain...');
    for (let tileY = 0; tileY < tilemap.height; tileY++) {
        if (tileY % 200 === 0) {
            console.log(`  Progress: ${Math.round(tileY / tilemap.height * 100)}%`);
        }

        for (let tileX = 0; tileX < tilemap.width; tileX++) {
            const terrainType = tilemap.tiles[tileY][tileX];
            let color;
            switch (terrainType) {
                case 0: color = CONFIG.COLORS.WATER; break;
                case 1: color = CONFIG.COLORS.SHALLOW; break;
                case 2: color = CONFIG.COLORS.LAND; break;
                default: color = '#000000';
            }

            ctx.fillStyle = color;
            ctx.fillRect(
                tileX * CONFIG.SCALE,
                tileY * CONFIG.SCALE,
                CONFIG.SCALE,
                CONFIG.SCALE
            );
        }
    }
    console.log('✓ Terrain rendered');

    // Draw harbors by category
    console.log('\nDrawing harbor markers...');

    const drawHarbors = (harbors, color, label) => {
        if (harbors.length === 0) return;

        ctx.fillStyle = color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        harbors.forEach(harbor => {
            const pixelX = harbor.tileX * CONFIG.SCALE;
            const pixelY = harbor.tileY * CONFIG.SCALE;

            ctx.beginPath();
            ctx.arc(pixelX, pixelY, CONFIG.HARBOR_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        console.log(`  ${label}: ${harbors.length} harbors`);
    };

    drawHarbors(categories.ok, CONFIG.COLORS.HARBOR_OK, 'Green (already correct)');
    drawHarbors(categories.close, CONFIG.COLORS.HARBOR_CLOSE, 'Yellow (1-15 tiles)');
    drawHarbors(categories.far, CONFIG.COLORS.HARBOR_FAR, 'Orange (16-50 tiles)');
    drawHarbors(categories.tooFar, CONFIG.COLORS.HARBOR_TOO_FAR, 'Red (>50 tiles)');

    // Draw legend
    const legendX = 20;
    const legendY = 20;
    const legendWidth = 280;
    const legendHeight = 140;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#000000';
    ctx.fillText('Harbor Distance Legend', legendX + 10, legendY + 25);

    const legendItems = [
        { color: CONFIG.COLORS.HARBOR_OK, text: `Green: Already correct (${categories.ok.length})` },
        { color: CONFIG.COLORS.HARBOR_CLOSE, text: `Yellow: 1-25 tiles (${categories.close.length})` },
        { color: CONFIG.COLORS.HARBOR_FAR, text: `Orange: 26-50 tiles (${categories.far.length})` },
        { color: CONFIG.COLORS.HARBOR_TOO_FAR, text: `Red: >50 tiles (${categories.tooFar.length})` }
    ];

    ctx.font = '14px Arial';
    legendItems.forEach((item, index) => {
        const y = legendY + 50 + (index * 22);

        // Draw circle
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(legendX + 20, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#000000';
        ctx.fillText(item.text, legendX + 35, y + 5);
    });

    return canvas;
}

function savePNG(canvas, outputPath) {
    const fullPath = path.join(__dirname, outputPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`\nSaving to ${outputPath}...`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(fullPath, buffer);
    console.log(`✓ Saved: ${fullPath}`);
    console.log(`  File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}

function main() {
    console.log('=== Harbor Comparison Visualization ===\n');

    try {
        const tilemap = loadJSON('src/public/assets/world_map.json');
        const harbors = loadJSON('assets/harbors.json');

        console.log(`Map dimensions: ${tilemap.width}×${tilemap.height} tiles`);
        console.log(`Harbor count: ${harbors.length}\n`);

        const categories = categorizeHarbors(tilemap, harbors);

        console.log('\n=== Summary ===');
        console.log(`Green (already correct):  ${categories.ok.length}`);
        console.log(`Yellow (1-25 tiles):      ${categories.close.length}`);
        console.log(`Orange (26-50 tiles):     ${categories.far.length}`);
        console.log(`Red (>50 tiles):          ${categories.tooFar.length}`);
        console.log(`\nWith 25-tile limit: ${categories.ok.length + categories.close.length} harbors fixed`);
        console.log(`With 50-tile limit: ${categories.ok.length + categories.close.length + categories.far.length} harbors fixed`);

        const canvas = renderMap(tilemap, categories);
        savePNG(canvas, 'output/harbor_comparison.png');

        console.log('\n✅ Comparison visualization complete!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
