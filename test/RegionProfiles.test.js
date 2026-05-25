const test = require('node:test');
const assert = require('node:assert/strict');

const {
    getRegionProfileForHarbor,
    chooseShipTypeForRegion,
    chooseTrafficRoleForRegion,
    generateUniqueShipName,
    releaseShipName
} = require('../src/server/game/world/RegionProfiles');

test('Region profile resolves from harbor nation', () => {
    const profile = getRegionProfileForHarbor({ id: 'nassau', nation: 'pirates' });
    assert.equal(profile.id, 'PIRATE_REACH');
});

test('Region ship type selection stays within configured ship list', () => {
    const profile = getRegionProfileForHarbor({ id: 'havana', nation: 'spain' });
    const shipType = chooseShipTypeForRegion(profile, 'TRADER', () => 0.99);
    assert.ok(profile.shipTypes.TRADER.includes(shipType));
});

test('Traffic role selection respects pirate ratio threshold', () => {
    const profile = getRegionProfileForHarbor({ id: 'tortuga', nation: 'pirates' });
    assert.equal(chooseTrafficRoleForRegion(profile, () => 0.1), 'PIRATE');
    assert.equal(chooseTrafficRoleForRegion(profile, () => 0.9), 'TRADER');
});

test('Generated ship names are unique within a region pool', () => {
    const profile = getRegionProfileForHarbor({ id: 'cartagena', nation: 'spain' });
    const nameA = generateUniqueShipName(profile);
    const nameB = generateUniqueShipName(profile);

    assert.notEqual(nameA, nameB);

    releaseShipName(nameA);
    releaseShipName(nameB);
});
