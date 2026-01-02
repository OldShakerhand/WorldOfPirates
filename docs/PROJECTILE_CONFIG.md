# Projectile Visual Configuration

## Overview

Cannonball rendering is now fully configurable through `CombatConfig.js`. You can adjust the visual size of cannonballs and their shadows by changing config values.

## Configuration

Edit [`CombatConfig.js`](file:///c:/Development/WorldOfPirates/src/server/game/CombatConfig.js):

```javascript
// Visual
PROJECTILE_BALL_RADIUS: 3, // Visual size of the cannonball
PROJECTILE_SHADOW_RADIUS: 2 // Visual size of the shadow
```

### Current Values
- **Cannonball**: 3 pixels radius
- **Shadow**: 2 pixels radius

### To Make Cannonballs Smaller
Simply decrease these values. For example:
```javascript
PROJECTILE_BALL_RADIUS: 2,    // Smaller cannonball
PROJECTILE_SHADOW_RADIUS: 1.5 // Smaller shadow
```

### To Make Cannonballs Larger
Increase these values:
```javascript
PROJECTILE_BALL_RADIUS: 4,   // Larger cannonball
PROJECTILE_SHADOW_RADIUS: 3  // Larger shadow
```

## How It Works

1. **Server-Side**: Config values are defined in `CombatConfig.js`
2. **Transmission**: Server sends these values to each client on connection via `combatConfig` event
3. **Client-Side**: Client receives and stores config in `window.COMBAT_CONFIG`
4. **Rendering**: Client uses these values when drawing cannonballs with fallback to defaults

## Changes Made

### Server-Side
- [`CombatConfig.js`](file:///c:/Development/WorldOfPirates/src/server/game/CombatConfig.js): Added `PROJECTILE_BALL_RADIUS` and `PROJECTILE_SHADOW_RADIUS`
- [`GameLoop.js`](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js): Added `sendCombatConfig()` method to transmit visual settings to clients
- [`Projectile.js`](file:///c:/Development/WorldOfPirates/src/server/game/Projectile.js): Updated collision radius (separate from visual radius)

### Client-Side
- [`client.js`](file:///c:/Development/WorldOfPirates/src/public/js/client.js): Added listener for `combatConfig` event
- [`game.js`](file:///c:/Development/WorldOfPirates/src/public/js/game.js): Updated projectile rendering to use config values

## Note on Collision Detection

The visual size of cannonballs is now **separate** from collision detection:
- **Visual size**: Controlled by `PROJECTILE_BALL_RADIUS` (what you see)
- **Collision radius**: Hardcoded to 3 pixels in `Projectile.js` (hit detection)

This allows you to make cannonballs look smaller/larger without affecting gameplay balance.
