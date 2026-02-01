const HarborRegistry = require('../src/server/game/world/HarborRegistry');
const GameConfig = require('../src/server/game/config/GameConfig');
const path = require('path');

const registry = new HarborRegistry(
    path.join(__dirname, '../assets/harbors.json'),
    path.join(__dirname, '../assets/harbor_trade_profiles.json')
);

const HARBORS_TO_CHECK = ['nassau', 'cartagena', 'belize_city'];

console.log('--- ECONOMY VERIFICATION ---');

HARBORS_TO_CHECK.forEach(id => {
    const eco = registry.getHarborEconomy(id);
    if (!eco) {
        console.log(`${id}: No economy data`);
        return;
    }
    console.log(`\n=== ${id} (${eco.profileName}) ===`);
    eco.goods.forEach(g => {
        if (['sugar', 'cloth', 'rum', 'contraband'].includes(g.id)) {
            console.log(`${g.name.padEnd(10)} | Tier: ${g.tier.padEnd(10)} | Buy: ${g.buyPrice} | Sell: ${g.sellPrice}`);
        }
    });
    // Check if contraband exists
    const hasContraband = eco.goods.some(g => g.id === 'contraband');
    console.log(`Has Contraband? ${hasContraband ? 'YES' : 'NO'}`);
});
