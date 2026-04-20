const GLOBAL_ASSIGNED_NAMES = new Set();

const REGION_PROFILES = {
    ENGLISH_WATERS: {
        id: 'ENGLISH_WATERS',
        harborNations: ['england', 'britain', 'english'],
        shipTypes: {
            TRADER: ['SLOOP', 'BARQUE', 'FLUYT'],
            PIRATE: ['SLOOP', 'BARQUE'],
            PATROL: ['SLOOP', 'FRIGATE']
        },
        traderRatio: 0.85,
        pirateRatio: 0.15,
        namePool: {
            prefixes: ['King', 'Royal', 'North', 'Crown', 'Oak', 'Stalwart'],
            nouns: ['Fortune', 'Meridian', 'Harbor', 'Voyager', 'Mariner', 'Endeavour']
        }
    },
    SPANISH_MAIN: {
        id: 'SPANISH_MAIN',
        harborNations: ['spain', 'spanish'],
        shipTypes: {
            TRADER: ['BARQUE', 'FLUYT', 'MERCHANT'],
            PIRATE: ['SLOOP', 'BARQUE', 'FLUYT'],
            PATROL: ['FRIGATE', 'SPANISH_GALLEON']
        },
        traderRatio: 0.8,
        pirateRatio: 0.2,
        namePool: {
            prefixes: ['Santa', 'Golden', 'Nueva', 'Mar', 'Sol', 'San'],
            nouns: ['Esperanza', 'Corona', 'Viento', 'Sirena', 'Tesoro', 'Gloria']
        }
    },
    FRENCH_ANTILLES: {
        id: 'FRENCH_ANTILLES',
        harborNations: ['france', 'french'],
        shipTypes: {
            TRADER: ['SLOOP', 'BARQUE', 'FLUYT'],
            PIRATE: ['SLOOP', 'BARQUE'],
            PATROL: ['BARQUE', 'FRIGATE']
        },
        traderRatio: 0.82,
        pirateRatio: 0.18,
        namePool: {
            prefixes: ['Belle', 'La', 'Azure', 'Coeur', 'Grand', 'Vive'],
            nouns: ['Brise', 'Aurore', 'Fortune', 'Lanterne', 'Victoire', 'Marche']
        }
    },
    DUTCH_CHANNELS: {
        id: 'DUTCH_CHANNELS',
        harborNations: ['netherlands', 'dutch', 'holland'],
        shipTypes: {
            TRADER: ['SLOOP', 'FLUYT', 'MERCHANT'],
            PIRATE: ['SLOOP', 'BARQUE'],
            PATROL: ['BARQUE', 'FRIGATE']
        },
        traderRatio: 0.88,
        pirateRatio: 0.12,
        namePool: {
            prefixes: ['De', 'Nieuw', 'Staten', 'Vrije', 'Wind', 'Zee'],
            nouns: ['Handel', 'Compagnie', 'Meeuw', 'Ster', 'Haven', 'Fortuin']
        }
    },
    PIRATE_REACH: {
        id: 'PIRATE_REACH',
        harborNations: ['pirates', 'pirate'],
        shipTypes: {
            TRADER: ['SLOOP', 'BARQUE'],
            PIRATE: ['SLOOP', 'BARQUE', 'FLUYT'],
            PATROL: ['SLOOP', 'BARQUE']
        },
        traderRatio: 0.6,
        pirateRatio: 0.4,
        namePool: {
            prefixes: ['Black', 'Rogue', 'Skull', 'Salt', 'Dead', 'Crimson'],
            nouns: ['Fortune', 'Revenge', 'Marauder', 'Current', 'Cutlass', 'Wake']
        }
    },
    OPEN_SEA: {
        id: 'OPEN_SEA',
        harborNations: [],
        shipTypes: {
            TRADER: ['SLOOP', 'BARQUE', 'FLUYT'],
            PIRATE: ['SLOOP', 'BARQUE'],
            PATROL: ['SLOOP', 'BARQUE', 'FRIGATE']
        },
        traderRatio: 0.84,
        pirateRatio: 0.16,
        namePool: {
            prefixes: ['Sea', 'Far', 'Blue', 'Swift', 'Deep', 'West'],
            nouns: ['Runner', 'Voyage', 'Lark', 'Horizon', 'Current', 'Trader']
        }
    }
};

function getRegionProfileForHarbor(harbor) {
    if (!harbor) {
        return REGION_PROFILES.OPEN_SEA;
    }

    const nation = String(harbor.nation || '').toLowerCase();
    for (const profile of Object.values(REGION_PROFILES)) {
        if (profile.harborNations.includes(nation)) {
            return profile;
        }
    }

    return REGION_PROFILES.OPEN_SEA;
}

function getRegionProfileForPosition(x, y, harbors) {
    if (!Array.isArray(harbors) || harbors.length === 0) {
        return REGION_PROFILES.OPEN_SEA;
    }

    let nearestHarbor = null;
    let nearestDistance = Infinity;

    for (const harbor of harbors) {
        const distance = Math.hypot(harbor.x - x, harbor.y - y);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestHarbor = harbor;
        }
    }

    return getRegionProfileForHarbor(nearestHarbor);
}

function chooseShipTypeForRegion(regionProfile, role, rng = Math.random) {
    const shipTypes = regionProfile?.shipTypes?.[role] || REGION_PROFILES.OPEN_SEA.shipTypes[role] || ['SLOOP'];
    const index = Math.floor(rng() * shipTypes.length);
    return shipTypes[Math.max(0, Math.min(shipTypes.length - 1, index))];
}

function chooseTrafficRoleForRegion(regionProfile, rng = Math.random) {
    if (rng() < (regionProfile?.pirateRatio ?? REGION_PROFILES.OPEN_SEA.pirateRatio)) {
        return 'PIRATE';
    }

    return 'TRADER';
}

function generateUniqueShipName(regionProfile, usedNames = GLOBAL_ASSIGNED_NAMES, rng = Math.random) {
    const profile = regionProfile || REGION_PROFILES.OPEN_SEA;
    const prefixes = profile.namePool?.prefixes || REGION_PROFILES.OPEN_SEA.namePool.prefixes;
    const nouns = profile.namePool?.nouns || REGION_PROFILES.OPEN_SEA.namePool.nouns;

    for (let attempt = 0; attempt < 20; attempt++) {
        const prefix = prefixes[Math.floor(rng() * prefixes.length)];
        const noun = nouns[Math.floor(rng() * nouns.length)];
        const candidate = `${prefix} ${noun}`;

        if (!usedNames.has(candidate)) {
            usedNames.add(candidate);
            return candidate;
        }
    }

    let suffix = 2;
    const baseName = `${prefixes[0]} ${nouns[0]}`;
    let candidate = `${baseName} ${suffix}`;
    while (usedNames.has(candidate)) {
        suffix++;
        candidate = `${baseName} ${suffix}`;
    }

    usedNames.add(candidate);
    return candidate;
}

function releaseShipName(name, usedNames = GLOBAL_ASSIGNED_NAMES) {
    if (name) {
        usedNames.delete(name);
    }
}

module.exports = {
    REGION_PROFILES,
    getRegionProfileForHarbor,
    getRegionProfileForPosition,
    chooseShipTypeForRegion,
    chooseTrafficRoleForRegion,
    generateUniqueShipName,
    releaseShipName
};
