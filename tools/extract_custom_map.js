const fs = require('fs');
const PNG = require('pngjs').PNG;
const GameConfig = require('../src/server/game/config/GameConfig');

const inputPath = 'c:/Development/WorldOfPirates/assets/map_custom_waypoints.png';
const TILE_SIZE = GameConfig.GAME.TILE_SIZE || 25;

fs.createReadStream(inputPath)
    .pipe(new PNG({}))
    .on('parsed', function() {
        console.log(`Parsing PNG: ${this.width}x${this.height}`);
        
        const width = this.width;
        const height = this.height;
        const data = this.data;
        
        const RED_MIN = 120; // Accept lighter reds
        const GREEN_MIN = 120; // Accept lighter greens
        
        function isRed(x, y) {
            const idx = (width * y + x) << 2;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            return r > RED_MIN && g < 100 && b < 100;
        }
        
        function isGreen(x, y) {
            const idx = (width * y + x) << 2;
            const r = data[idx], g = data[idx+1], b = data[idx+2];
            return r < 120 && g > GREEN_MIN && b < 120 && g > r * 1.5 && g > b * 1.5;
        }
        
        // 1. Find Nodes (Red clusters)
        const visitedRed = new Set();
        const nodes = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (isRed(x, y) && !visitedRed.has(`${x},${y}`)) {
                    // BFS to find all pixels in this node
                    const queue = [{x, y}];
                    const cluster = [];
                    visitedRed.add(`${x},${y}`);
                    
                    while (queue.length > 0) {
                        const p = queue.shift();
                        cluster.push(p);
                        
                        // Check 8 neighbors
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = p.x + dx;
                                const ny = p.y + dy;
                                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                    if (isRed(nx, ny) && !visitedRed.has(`${nx},${ny}`)) {
                                        visitedRed.add(`${nx},${ny}`);
                                        queue.push({x: nx, y: ny});
                                    }
                                }
                            }
                        }
                    }
                    
                    // Calc centroid
                    let sumX = 0, sumY = 0;
                    for (const p of cluster) { sumX += p.x; sumY += p.y; }
                    const cx = sumX / cluster.length;
                    const cy = sumY / cluster.length;
                    
                    nodes.push({
                        id: `node_${nodes.length}`,
                        // World coordinates! Center of tile: tile_x * 25 + 12.5
                        x: Math.round(cx * TILE_SIZE + TILE_SIZE / 2),
                        y: Math.round(cy * TILE_SIZE + TILE_SIZE / 2),
                        clusterPixels: cluster
                    });
                }
            }
        }
        
        console.log(`Identified ${nodes.length} nodes.`);
        
        // 2. Find Edges (Green clusters)
        const visitedGreen = new Set();
        const edges = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (isGreen(x, y) && !visitedGreen.has(`${x},${y}`)) {
                    const queue = [{x, y}];
                    const cluster = [];
                    visitedGreen.add(`${x},${y}`);
                    
                    while (queue.length > 0) {
                        const p = queue.shift();
                        cluster.push(p);
                        
                        // Check 8 neighbors
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = p.x + dx;
                                const ny = p.y + dy;
                                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                    if (isGreen(nx, ny) && !visitedGreen.has(`${nx},${ny}`)) {
                                        visitedGreen.add(`${nx},${ny}`);
                                        queue.push({x: nx, y: ny});
                                    }
                                }
                            }
                        }
                    }
                    
                    // Now see which nodes this green cluster touches
                    // We check each green pixel's neighbors for red pixels
                    const touchedNodeIndices = new Set();
                    
                    for (const p of cluster) {
                        for (let dy = -15; dy <= 15; dy++) {
                            for (let dx = -15; dx <= 15; dx++) {
                                const nx = p.x + dx;
                                const ny = p.y + dy;
                                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                    if (isRed(nx, ny)) {
                                        // Which node possesses this pixel?
                                        for (let i = 0; i < nodes.length; i++) {
                                            if (nodes[i].clusterPixels.find(rp => rp.x === nx && rp.y === ny)) {
                                                touchedNodeIndices.add(i);
                                                break;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    
                    const touchedArr = Array.from(touchedNodeIndices);
                    if (touchedArr.length === 2) {
                        edges.push({
                            from: nodes[touchedArr[0]].id,
                            to: nodes[touchedArr[1]].id
                        });
                    } else if (touchedArr.length > 2) {
                        // Multi-way intersection... we can pairwise connect them?
                        // Or maybe just warn.
                        console.warn(`Warning: Green cluster touches ${touchedArr.length} nodes! Connecting all pairwise.`);
                        for (let i = 0; i < touchedArr.length; i++) {
                            for (let j = i + 1; j < touchedArr.length; j++) {
                                edges.push({
                                    from: nodes[touchedArr[i]].id,
                                    to: nodes[touchedArr[j]].id
                                });
                            }
                        }
                    } else {
                        console.log(`Warning: Green cluster found touching ${touchedArr.length} nodes. Ignored.`);
                    }
                }
            }
        }
        
        console.log(`Identified ${edges.length} edges.`);
        
        let outNodes = "const WAYPOINT_NODES = [\n";
        nodes.forEach(n => outNodes += `    { id: "${n.id}", x: ${n.x}, y: ${n.y} },\n`);
        outNodes += "];\n\nconst WAYPOINT_EDGES_RAW = [\n";
        edges.forEach(e => outNodes += `    { from: "${e.from}", to: "${e.to}" },\n`);
        outNodes += "];\n\nmodule.exports = { WAYPOINT_NODES, WAYPOINT_EDGES_RAW };\n";
        
        fs.writeFileSync('./tools/extracted_waypoints.js', outNodes);
        console.log("Successfully extracted to /tools/extracted_waypoints.js");
    });
