# Ship Sail State Assets Reference

## Overview

All ships now support 3 sail state variants:
- **State 0**: No sails (stopped)
- **State 1**: Half sails (half speed)
- **State 2**: Full sails (full speed)

The game will automatically use sail state variants when available, and fall back to the base sprite if variants don't exist yet.

## Required Asset Files

Place all sail state variant files in: `c:\Development\WorldOfPirates\src\public\assets\ships\`

### Sloop ✅ (Already Complete)
- [x] `sloop_0.png` - No sails
- [x] `sloop_1.png` - Half sails
- [x] `sloop_2.png` - Full sails
- [x] `sloop.png` - Base sprite (fallback)

### Fluyt ✅ (Already Complete)
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

## Implementation Details

### How It Works

1. **Preloading**: The game attempts to load all 3 sail state variants for every ship at startup
2. **Rendering**: When drawing a ship, the game checks if a sail state variant exists and is loaded
3. **Fallback**: If the variant doesn't exist or failed to load, it uses the base sprite (e.g., `pinnace.png`)
4. **No Errors**: Missing variant files won't cause errors or break the game

### Adding New Assets

To add sail state variants for any ship:

1. Create the 3 PNG files with the naming convention: `{ship_name}_{state}.png`
2. Place them in `c:\Development\WorldOfPirates\src\public\assets\ships\`
3. Reload the game - the variants will be used automatically!

### Current Ship Dimensions

All ships are rendered at 150% of their original size (except Raft and Fluyt):

- **Sloop**: 37.5 × 52.5 pixels
- **Pinnace**: 45 × 60 pixels
- **Barque**: 52.5 × 67.5 pixels
- **Fluyt**: 52 × 72 pixels (already scaled)
- **Merchant**: 60 × 78 pixels
- **Frigate**: 67.5 × 90 pixels
- **Fast Galleon**: 75 × 97.5 pixels
- **Spanish Galleon**: 82.5 × 105 pixels
- **War Galleon**: 90 × 120 pixels

## Testing

To verify sail state variants are working:

1. Switch to the ship in a harbor
2. Leave harbor and press W/S to change sail states
3. Observe the ship sprite changing between the 3 variants
4. If variants aren't available, the base sprite will be shown (no visual change)
