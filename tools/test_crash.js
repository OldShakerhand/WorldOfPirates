const WaypointGraph = require('./src/server/game/navigation/WaypointGraph');
const NavigationUtils = require('./src/server/game/navigation/NavigationUtils');
const WorldMap = require('./src/server/game/world/WorldMap');
const HarborRegistry = require('./src/server/game/world/HarborRegistry');

// 1. Load world map
const worldMap = new WorldMap('./src/server/assets/world_map.json');
const harbors = new HarborRegistry('./src/server/assets/harbors.json', './src/server/assets/harbor_trade_profiles.json').getAllHarbors();

const graph = new WaypointGraph();

// Target Harbor: Andros
const andros = harbors.find(h => h.id === 'andros');
const harborWorldX = (andros.tileX + 0.5) * 25;
const harborWorldY = (andros.tileY + 0.5) * 25;

console.log('Andros world:', harborWorldX, harborWorldY);

// Spawn: (41118, 10266)
const spawnX = 41118;
const spawnY = 10266;

console.log('Start finding route...');
const route = graph.findRoute(spawnX, spawnY, harborWorldX, harborWorldY);
console.log('Route initially len:', route.length);
if (route.length >= 2) {
    const approachP = NavigationUtils.getClosestPointOnSegment(spawnX, spawnY, route[0], route[1]);
    console.log('approachP:', approachP);
    
    if (isNaN(approachP.x) || isNaN(approachP.y)) {
        console.error('approachP is NaN!');
    }
    
    const isLos = NavigationUtils.isLineOfSightClear(worldMap, spawnX, spawnY, approachP.x, approachP.y);
    console.log('isLos:', isLos);
}
