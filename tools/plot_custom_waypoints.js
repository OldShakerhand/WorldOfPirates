const fs = require('fs');
const { PNG } = require('pngjs');
const { WAYPOINT_NODES, WAYPOINT_EDGES_RAW } = require('./final_waypoints');
const GameConfig = require('../src/server/game/config/GameConfig');

const MAP_FILE = 'C:/Users/Tobia/.gemini/antigravity/brain/4dede423-28d7-4c83-b7ea-85adb4afc960/map_clean.png';
const OUT_FILE = 'c:/Development/WorldOfPirates/assets/custom_waypoints_visualized.png';
const TILE_SIZE = GameConfig.GAME.TILE_SIZE || 25;
const NODE_RADIUS = 3; 

// Colors
const NODE_COLOR = [255, 0, 0, 255]; 
const EDGE_COLOR = [0, 255, 0, 150]; 

function drawCircle(png, cx, cy, radius, color) {
    for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
            if (x * x + y * y <= radius * radius) {
                const px = cx + x;
                const py = cy + y;
                if (px >= 0 && px < png.width && py >= 0 && py < png.height) {
                    const idx = (png.width * py + px) << 2;
                    png.data[idx] = color[0];
                    png.data[idx + 1] = color[1];
                    png.data[idx + 2] = color[2];
                    png.data[idx + 3] = color[3];
                }
            }
        }
    }
}

function drawLine(png, x0, y0, x1, y1, color) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = (x0 < x1) ? 1 : -1;
    const sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    let safety = Math.max(png.width, png.height) * 2;
    while (safety-- > 0) {
        if (cx >= 0 && cx < png.width && cy >= 0 && cy < png.height) {
            const idx = (png.width * cy + cx) << 2;
            
            png.data[idx] = Math.round((color[0] * color[3] + png.data[idx] * (255 - color[3])) / 255);
            png.data[idx + 1] = Math.round((color[1] * color[3] + png.data[idx + 1] * (255 - color[3])) / 255);
            png.data[idx + 2] = Math.round((color[2] * color[3] + png.data[idx + 2] * (255 - color[3])) / 255);
            png.data[idx + 3] = 255;
        }

        if (cx === x1 && cy === y1) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            cx += sx;
        }
        if (e2 < dx) {
            err += dx;
            cy += sy;
        }
    }
}

fs.createReadStream(MAP_FILE)
    .pipe(new PNG())
    .on('parsed', function() {
        console.log(`Mapping ${WAYPOINT_EDGES_RAW.length} custom edges...`);
        for (const edge of WAYPOINT_EDGES_RAW) {
            const startNode = WAYPOINT_NODES.find(n => n.id === edge.from);
            const endNode = WAYPOINT_NODES.find(n => n.id === edge.to);

            if (startNode && endNode) {
                const sx = Math.floor(startNode.x / TILE_SIZE);
                const sy = Math.floor(startNode.y / TILE_SIZE);
                const ex = Math.floor(endNode.x / TILE_SIZE);
                const ey = Math.floor(endNode.y / TILE_SIZE);
                drawLine(this, sx, sy, ex, ey, EDGE_COLOR);
            }
        }

        console.log(`Mapping ${WAYPOINT_NODES.length} custom nodes...`);
        for (const node of WAYPOINT_NODES) {
            const px = Math.floor(node.x / TILE_SIZE);
            const py = Math.floor(node.y / TILE_SIZE);
            drawCircle(this, px, py, NODE_RADIUS, NODE_COLOR);
        }

        this.pack().pipe(fs.createWriteStream(OUT_FILE))
            .on('finish', () => {
                console.log('Custom map visualized successfully.');
                
                // Copy to artifacts
                const dest = 'C:/Users/Tobia/.gemini/antigravity/brain/4dede423-28d7-4c83-b7ea-85adb4afc960/custom_preview.png';
                fs.copyFileSync(OUT_FILE, dest);
            });
    });
