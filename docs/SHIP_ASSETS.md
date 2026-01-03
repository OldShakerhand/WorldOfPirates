# Ship Sail State Assets Reference

## Purpose

This document defines the asset requirements and implementation details for ship sail state sprites. It serves as a checklist for asset creation and explains how the dynamic sail system works. Use this when creating new ship sprites or debugging sprite loading issues.

## Key Concepts

- **3 Sail States**: Each ship has no sails (0), half sails (1), and full sails (2) variants
- **Automatic Fallback**: Missing variants gracefully fall back to base sprite
- **Naming Convention**: `{ship_name}_{state}.png` (e.g., `sloop_0.png`)
- **Asset Location**: All sprites in `src/public/assets/ships/`
- **Preloading**: All variants loaded at game startup for smooth transitions

## Canonical Assumptions

### Sprite Requirements
- **File Format**: PNG with transparency
- **Naming Pattern**: `{ship_name}_{state}.png` where state is 0, 1, or 2
- **Fallback Sprite**: `{ship_name}.png` must always exist as base sprite
- **Orientation**: All sprites point UP (north) at 0 rotation

### Implementation Invariants
- Missing sail state variants NEVER cause errors or crashes
- Game always falls back to base sprite if variant unavailable
- Sail state changes are immediate (no animation transitions)
- All ships use same 3-state system (0=stop, 1=half, 2=full)

### Code References
- **Sprite Loading**: [`game.js:preloadShipSprites()`](file:///c:/Development/WorldOfPirates/src/public/js/game.js)
- **Sprite Selection**: [`game.js:renderGame()`](file:///c:/Development/WorldOfPirates/src/public/js/game.js)
- **Ship Properties**: [`ShipClass.js`](file:///c:/Development/WorldOfPirates/src/server/game/ShipClass.js)

---

## Required Asset Files

Place all sail state variant files in: `src/public/assets/ships/`

### Sloop ✅ (Complete)
- [x] `sloop_0.png` - No sails
- [x] `sloop_1.png` - Half sails
- [x] `sloop_2.png` - Full sails
- [x] `sloop.png` - Base sprite (fallback)

### Fluyt ✅ (Complete)
- [x] `fluyt_0.png` - No sails
- [x] `fluyt_1.png` - Half sails
- [x] `fluyt_2.png` - Full sails
- [x] `fluyt.png` - Base sprite (fallback)

### Pinnace (Pending)
- [ ] `pinnace_0.png` - No sails
- [ ] `pinnace_1.png` - Half sails
- [ ] `pinnace_2.png` - Full sails
- [x] `pinnace.png` - Base sprite (currently used as fallback)

### Barque (Pending)
- [ ] `barque_0.png` - No sails
- [ ] `barque_1.png` - Half sails
- [ ] `barque_2.png` - Full sails
- [x] `barque.png` - Base sprite (currently used as fallback)

### Merchant (Pending)
- [ ] `merchant_0.png` - No sails
- [ ] `merchant_1.png` - Half sails
- [ ] `merchant_2.png` - Full sails
- [x] `merchant.png` - Base sprite (currently used as fallback)

### Frigate (Pending)
- [ ] `frigate_0.png` - No sails
- [ ] `frigate_1.png` - Half sails
- [ ] `frigate_2.png` - Full sails
- [x] `frigate.png` - Base sprite (currently used as fallback)

### Fast Galleon (Pending)
- [ ] `fast_galleon_0.png` - No sails
- [ ] `fast_galleon_1.png` - Half sails
- [ ] `fast_galleon_2.png` - Full sails
- [x] `fast_galleon.png` - Base sprite (currently used as fallback)

### Spanish Galleon (Pending)
- [ ] `spanish_galleon_0.png` - No sails
- [ ] `spanish_galleon_1.png` - Half sails
- [ ] `spanish_galleon_2.png` - Full sails
- [x] `spanish_galleon.png` - Base sprite (currently used as fallback)

### War Galleon (Pending)
- [ ] `war_galleon_0.png` - No sails
- [ ] `war_galleon_1.png` - Half sails
- [ ] `war_galleon_2.png` - Full sails
- [x] `war_galleon.png` - Base sprite (currently used as fallback)

---

## Implementation Details

### How It Works

1. **Preloading**: Game attempts to load all 3 sail state variants for every ship at startup
2. **Rendering**: When drawing a ship, game checks if sail state variant exists and is loaded
3. **Fallback**: If variant doesn't exist or failed to load, uses base sprite (e.g., `pinnace.png`)
4. **No Errors**: Missing variant files won't cause errors or break the game

### Adding New Assets

To add sail state variants for any ship:

1. Create 3 PNG files with naming convention: `{ship_name}_{state}.png`
2. Place them in `src/public/assets/ships/`
3. Reload the game - variants will be used automatically!

### Current Ship Dimensions

All ships are rendered at 150% of their original size (except Raft and Fluyt):

| Ship | Rendered Size (pixels) | Notes |
|------|------------------------|-------|
| **Sloop** | 37.5 × 52.5 | 150% scaled |
| **Pinnace** | 45 × 60 | 150% scaled |
| **Barque** | 52.5 × 67.5 | 150% scaled |
| **Fluyt** | 52 × 72 | Already scaled |
| **Merchant** | 60 × 78 | 150% scaled |
| **Frigate** | 67.5 × 90 | 150% scaled |
| **Fast Galleon** | 75 × 97.5 | 150% scaled |
| **Spanish Galleon** | 82.5 × 105 | 150% scaled |
| **War Galleon** | 90 × 120 | 150% scaled |

See: [`ShipClass.js`](file:///c:/Development/WorldOfPirates/src/server/game/ShipClass.js) for sprite dimensions.

---

## Testing

To verify sail state variants are working:

1. Switch to the ship in a harbor
2. Leave harbor and press W/S to change sail states
3. Observe the ship sprite changing between the 3 variants
4. If variants aren't available, the base sprite will be shown (no visual change)

---

*Update this checklist as new ship sprites are created.*
