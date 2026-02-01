const fs = require('fs');
const path = require('path');

const harborsPath = path.join(__dirname, '../src/server/assets/harbors.json');
const harbors = JSON.parse(fs.readFileSync(harborsPath, 'utf8'));

let counts = {};

harbors.forEach(h => {
    let profile = 'PLANTATION_AGRICULTURE'; // Default

    // Logic Priority
    if (h.nation === 'pirates') {
        profile = 'PIRATE_HAVEN';
    } else if (h.lat > 24) {
        profile = 'FRONTIER_SUPPLY';
    } else if (h.lon < -85) {
        profile = 'MAINLAND_RESOURCES';
    } else if (h.lat < 12.5) { // Slightly increased to catch all of S. Main
        profile = 'COLONIAL_CAPITAL';
    } else if (h.lon > -65) {
        profile = 'LUXURY_EXPORT';
    }

    h.harborTradeId = profile;

    counts[profile] = (counts[profile] || 0) + 1;
});

fs.writeFileSync(harborsPath, JSON.stringify(harbors, null, 2));

console.log('Assignments complete:');
console.log(counts);
