const WaypointGraph = require('../src/server/game/navigation/WaypointGraph');
const NavigationUtils = require('../src/server/game/navigation/NavigationUtils');
const WorldMap = require('../src/server/game/world/WorldMap');
const HarborRegistry = require('../src/server/game/world/HarborRegistry');
const GameConfig = require('../src/server/game/config/GameConfig');

const worldMap = new WorldMap('./src/server/assets/world_map.json');
const harbors = new HarborRegistry('./src/server/assets/harbors.json', './src/server/assets/harbor_trade_profiles.json').getAllHarbors();

const graph = new WaypointGraph();
const world = { waypointGraph: graph, worldMap: worldMap };

const andros = harbors.find(h => h.id === 'andros');
// Mocking the instantiated harbor properties 
andros.x = (andros.tileX + 0.5) * GameConfig.GAME.TILE_SIZE;
andros.y = (andros.tileY + 0.5) * GameConfig.GAME.TILE_SIZE;
const harborWorldX = andros.x;
const harborWorldY = andros.y;
console.log('Andros:', harborWorldX, harborWorldY);

const spawnX = 41118;
const spawnY = 10266;

console.log('Executing test...');

let route = world.waypointGraph.findRoute(spawnX, spawnY, harborWorldX, harborWorldY);
const approachP = NavigationUtils.getHarborApproach(andros, GameConfig.GAME.TILE_SIZE);

// Phase 7: Harbor Exit Sequence
if (route.length >= 1) {
    const goalNode = route[route.length - 1];
    let exitPoint = null;
    let sliceIndex = -1;

    const candidates = [];

    // Priority 1: Route edges in reverse order
    for (let i = route.length - 2; i >= 0; i--) {
        candidates.push({
            start: route[i],
            end: route[i + 1],
            sliceIdx: i + 1
        });
    }

    // Priority 2: Extension edges connected to goalNode
    if (goalNode.id) {
        const neighbors = world.waypointGraph.getConnectedNodes(goalNode.id);
        const prevId = route.length >= 2 ? route[route.length - 2].id : null;
        
        for (const neighbor of neighbors) {
            if (neighbor.id !== prevId) {
                candidates.push({
                    start: goalNode,
                    end: neighbor,
                    sliceIdx: route.length
                });
            }
        }
    }

    // Evaluate candidates sequentially
    for (const edge of candidates) {
        const p = NavigationUtils.getClosestPointOnSegment(approachP.x, approachP.y, edge.start, edge.end);
        
        if (NavigationUtils.isLineOfSightClear(world.worldMap, p.x, p.y, approachP.x, approachP.y)) {
            exitPoint = p;
            sliceIndex = edge.sliceIdx;
            console.log('Found valid exit point!', exitPoint, 'from edge', edge.start.id, '->', edge.end.id);
            break; // First valid candidate wins
        }
    }

    if (exitPoint) {
        route = route.slice(0, sliceIndex);
        route.push({ x: exitPoint.x, y: exitPoint.y });
    }
}

// Phase 6: Spawn-to-Route Connection
if (route.length >= 2) {
    const startNode = route[0];
    const nextNode = route[1];
    const spawnP = NavigationUtils.getClosestPointOnSegment(spawnX, spawnY, startNode, nextNode);
    if (NavigationUtils.isLineOfSightClear(worldMap, spawnX, spawnY, spawnP.x, spawnP.y)) {
        route[0] = { x: spawnP.x, y: spawnP.y }; 
    }
}

route.push(approachP);
route.push({ x: harborWorldX, y: harborWorldY });

console.log('Final Route Length:', route.length);
console.log('Route Array:', route);
