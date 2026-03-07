const fs = require('fs');
const PNG = require('pngjs').PNG;
const GameConfig = require('../src/server/game/config/GameConfig');
const WaypointGraph = require('../src/server/game/navigation/WaypointGraph');

const graph = new WaypointGraph();

const inputPath = 'c:/Development/WorldOfPirates/assets/map_processed.png';
const outputPath = 'C:/Users/Tobia/.gemini/antigravity/brain/4dede423-28d7-4c83-b7ea-85adb4afc960/waypoint_map_visualized.png';

const TILE_SIZE = GameConfig.GAME.TILE_SIZE || 25;

fs.createReadStream(inputPath)
    .pipe(new PNG({}))
    .on('parsed', function() {
        // Draw Edges First
        for (const [nodeId, edges] of graph.edges) {
            const startNode = graph.nodes.get(nodeId);
            for (const edge of edges) {
                if (nodeId > edge.to) continue; // draw once
                const endNode = graph.nodes.get(edge.to);
                if (startNode && endNode) {
                    const x0 = Math.floor(startNode.x / TILE_SIZE);
                    const y0 = Math.floor(startNode.y / TILE_SIZE);
                    const x1 = Math.floor(endNode.x / TILE_SIZE);
                    const y1 = Math.floor(endNode.y / TILE_SIZE);
                    drawLine(this, x0, y0, x1, y1, [0, 255, 0, 255]); // Green lines
                }
            }
        }

        // Draw Nodes
        for (const [nodeId, node] of graph.nodes) {
            const tx = Math.floor(node.x / TILE_SIZE);
            const ty = Math.floor(node.y / TILE_SIZE);

            // Draw a 5x5 red square
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const px = tx + dx;
                    const py = ty + dy;

                    if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
                        const idx = (this.width * py + px) << 2;
                        this.data[idx] = 255;     // Red
                        this.data[idx + 1] = 0;   // Green
                        this.data[idx + 2] = 0;   // Blue
                        this.data[idx + 3] = 255; // Alpha
                    }
                }
            }
        }

        this.pack().pipe(fs.createWriteStream(outputPath));
        console.log("Waypoint map visualized successfully.");
    });

function drawLine(png, x0, y0, x1, y1, color) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while(true) {
        if (x0 >= 0 && x0 < png.width && y0 >= 0 && y0 < png.height) {
            const idx = (png.width * y0 + x0) << 2;
            png.data[idx] = color[0];
            png.data[idx+1] = color[1];
            png.data[idx+2] = color[2];
            png.data[idx+3] = color[3];
        }

        if ((x0 === x1) && (y0 === y1)) break;
        let e2 = 2*err;
        if (e2 > -dy) { err -= dy; x0  += sx; }
        if (e2 < dx) { err += dx; y0  += sy; }
    }
}
