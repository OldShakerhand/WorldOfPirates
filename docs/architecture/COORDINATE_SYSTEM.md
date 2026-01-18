# Coordinate System & Game Mechanics Reference

## Purpose

This document defines the coordinate systems, rotation conventions, and spatial mechanics used throughout World of Pirates. It serves as the authoritative reference for all mathematical transformations and is essential for understanding how ship movement, cannon positioning, and wind mechanics work. Use this when implementing features involving rotation, positioning, or coordinate transformations.

## Key Concepts

- **North-Up Coordinate System**: 0 radians points UP (north), rotation increases clockwise
- **Rotation - PI/2 Transform**: Converts north-up rotation to canvas forward direction
- **Ship-Relative vs World Coordinates**: Cannons positioned in ship space, transformed to world space
- **Sector-Based Broadside Detection**: ±60° tolerance zones for port/starboard firing
- **Velocity Compensation**: Configurable arcade-style firing (0.0-1.0 factor)

## Canonical Assumptions

### Coordinate System Invariants
- **0 Radians = North/Up**: Ship rotation of 0 always points up (negative Y direction)
- **Clockwise Rotation**: Increasing rotation angle rotates ship clockwise
- **Angle Range**: All angles normalized to [-PI, +PI] radians
- **Canvas Coordinates**: X increases right, Y increases down (standard HTML5 canvas)

### Rotation Transform Rules
- **Forward Movement**: Always use `rotation - PI/2` for ship's forward direction
- **Lateral Movement**: Always use `rotation` for perpendicular (port/starboard) direction
- **Sprite Alignment**: All ship sprites point UP at 0 rotation (north-facing)

### Gameplay Mechanics
- **Broadside Firing**: Q key = port (left), E key = starboard (right)
- **Wind Direction**: 0 radians = wind from north, same coordinate system as ships
- **Cannon Clustering**: 40% spread factor concentrates cannons at midship
- **Velocity Compensation**: Default 70% (0.7) balances arcade vs realistic physics

### Code References
- **Movement**: [`Player.js:update()`](file:///c:/Development/WorldOfPirates/src/server/game/entities/Player.js)
- **Cannon Positioning**: [`GameLoop.js:fireCannons()`](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js)
- **Wind Mechanics**: [`Wind.js:getAngleModifier()`](file:///c:/Development/WorldOfPirates/src/server/game/entities/Wind.js)
- **Velocity Compensation**: [`GameLoop.js:compensateForShipVelocity()`](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js)

---

## Table of Contents

1. [World Coordinate System](#world-coordinate-system)
2. [Rotation & Angles](#rotation--angles)
3. [Ship Orientation & Movement](#ship-orientation--movement)
4. [Cannon Positioning System](#cannon-positioning-system)
5. [Naval Directions](#naval-directions)
6. [Wind Mechanics](#wind-mechanics)
7. [Camera & Rendering](#camera--rendering)

---

## World Coordinate System

### Axes
- **X-axis**: Horizontal, increases to the **right**
- **Y-axis**: Vertical, increases **downward** (standard canvas coordinates)
- **Origin**: Top-left corner at `(0, 0)`
- **World Size**: 2000 × 2000 pixels

### Coordinate Space
```
(0,0) ────────────────────► X
  │
  │     World Space
  │     2000 × 2000
  │
  ▼
  Y
```

---

## Rotation & Angles

### Angle Convention
- **0 radians**: Points **UP** (negative Y direction)
- **Rotation Direction**: **Clockwise** (increasing angle)
- **Range**: `-π` to `+π` radians (normalized)

### Angle Mapping
```
        0 (UP)
         │
         │
-π/2 ────┼──── π/2
  (LEFT) │  (RIGHT)
         │
        ±π (DOWN)
```

### Key Angles
| Direction | Radians | Degrees |
|-----------|---------|---------|
| North (Up) | 0 | 0° |
| East (Right) | π/2 | 90° |
| South (Down) | ±π | ±180° |
| West (Left) | -π/2 | -90° |

### Angle Normalization
Angles are normalized to the range `[-π, +π]`:
```javascript
const normalizeAngle = (angle) => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
};
```

---

## Ship Orientation & Movement

### Ship Rotation
- **`player.rotation`**: Current facing direction in radians
- **0 rotation**: Ship sprite points **UP** (north)
- **Sprite Alignment**: Ship bow (front) points in the direction of `rotation`

### Velocity Compensation (Arcade Firing)

Ships can compensate for their own velocity when firing, making projectiles fire perpendicular to the ship regardless of movement.

**Compensation Factor** (configurable in `CombatConfig.js`):
```javascript
VELOCITY_COMPENSATION_FACTOR: 0.7  // 0.0 to 1.0
```

**How It Works**:
```javascript
// Calculate ship velocity
const shipVx = Math.cos(player.rotation - Math.PI / 2) * player.speed;
const shipVy = Math.sin(player.rotation - Math.PI / 2) * player.speed;

// Apply compensation factor
const compensatedVx = desiredVx + (shipVx * compensationFactor);
const compensatedVy = desiredVy + (shipVy * compensationFactor);
```

**Factor Values**:
- **`1.0`**: Full arcade compensation (projectiles always perpendicular)
- **`0.7`**: Default - balanced arcade/realistic (22° max deviation)
- **`0.5`**: Half compensation (16° max deviation)
- **`0.0`**: No compensation - fully realistic physics

**Maximum Angle Deviation**:
```
deviation = atan(shipSpeed * factor / projectileSpeed)
         = atan(95 * 0.7 / 150)
         ≈ 22° (with default 0.7 factor)
```

### Movement Vectors

#### Forward Direction
The ship's forward vector (bow direction):
```javascript
const forwardX = Math.cos(player.rotation - Math.PI / 2);
const forwardY = Math.sin(player.rotation - Math.PI / 2);
```

**Why `rotation - π/2`?**
- Ship sprite is drawn pointing up (0 radians)
- Canvas rotation is clockwise from the right (π/2 offset)
- Subtracting π/2 aligns the sprite's visual forward with the rotation value

#### Perpendicular Direction (Lateral)
The ship's lateral vector (port/starboard):
```javascript
const lateralX = Math.cos(player.rotation);
const lateralY = Math.sin(player.rotation);
```

This is perpendicular to the forward direction (90° rotated).

### Ship Axes
```
        Bow (Forward)
             ▲
             │ rotation - π/2
             │
Port ◄───────┼───────► Starboard
  (rotation) │  (rotation)
             │
             ▼
          Stern
```

---

## Cannon Positioning System

### Coordinate Spaces

#### Ship-Relative Coordinates
- **Longitudinal**: Along ship's length (bow to stern)
  - Positive = toward bow
  - Negative = toward stern
- **Lateral**: Across ship's width (port to starboard)
  - Positive = outward from centerline
  - Negative = inward (not typically used)

#### World Coordinates
Cannons are positioned in world space using rotation transforms:

```javascript
const cannonX = player.x +
    Math.cos(player.rotation - Math.PI / 2) * longitudinalOffset +
    Math.cos(player.rotation) * lateralOffset;

const cannonY = player.y +
    Math.sin(player.rotation - Math.PI / 2) * longitudinalOffset +
    Math.sin(player.rotation) * lateralOffset;
```

### Cannon Offset Properties

Each ship class defines per-side offsets in `ShipClass.js`:

```javascript
cannonLateralOffsetPort: 10,        // Port side lateral offset
cannonLateralOffsetStarboard: 10,   // Starboard side lateral offset
cannonLongitudinalOffsetPort: -10,  // Port bow/stern position
cannonLongitudinalOffsetStarboard: -10, // Starboard bow/stern position
```

### Cannon Distribution

Cannons are distributed along the ship's length with clustering:

```javascript
const cannonSpreadFactor = 0.4; // Clustering toward midship
const spacing = shipLength / cannonCount;
const cannonIndex = i - (cannonCount - 1) / 2; // Center around 0
const baseLongitudinalOffset = cannonIndex * spacing * cannonSpreadFactor;
```

**Example** (4 cannons on 72px ship):
- Spacing: 72 / 4 = 18px
- Indices: -1.5, -0.5, +0.5, +1.5
- Offsets: -10.8, -3.6, +3.6, +10.8 (with factor 0.4)

### Broadside Detection

Determines which side is firing based on firing angle using explicit sectors:

```javascript
const BROADSIDE_SECTOR = Math.PI / 3; // 60° tolerance
const angleDiff = normalizeAngle(baseAngle - player.rotation);

if (Math.abs(angleDiff) < BROADSIDE_SECTOR) {
    // Right broadside (E key) - firing to starboard
} else if (Math.abs(Math.abs(angleDiff) - Math.PI) < BROADSIDE_SECTOR) {
    // Left broadside (Q key) - firing to port
} else {
    // Invalid firing angle
}
```

**Sector Design**:
- **Right Broadside (E key)**: `angleDiff` within ±60° of 0
- **Left Broadside (Q key)**: `angleDiff` within ±60° of ±π
- **Invalid Zone**: Forward/backward firing (60° to 120° from perpendicular)

**Why ±60°?**
- Maximum velocity compensation deviation: ~32° (at 70% factor)
- Sector tolerance: ±60°
- Safety margin: 28° ✅

---

## Naval Directions

### Port & Starboard
- **Port**: Left side of ship (when facing forward)
- **Starboard**: Right side of ship (when facing forward)

### Bow & Stern
- **Bow**: Front of ship (forward direction)
- **Stern**: Rear of ship (aft)

### Broadside
- **Broadside**: Firing perpendicular to ship's length
- **Left Broadside**: Firing to port (Q key)
- **Right Broadside**: Firing to starboard (E key)

### Compass Rose Mapping
```
        N (0°)
         │
    NW   │   NE
      \  │  /
       \ │ /
W ───────┼─────── E
       / │ \
      /  │  \
    SW   │   SE
         │
        S (180°)
```

---

## Wind Mechanics

### Wind Direction
- **Wind Direction**: Angle in radians (0 = north)
- **Wind Strength**: `LOW`, `NORMAL`, `FULL`

### Wind Effect on Ship Speed

Ships move faster when sailing with the wind:

```javascript
// Calculate angle between ship heading and wind
const windAngle = Math.abs(normalizeAngle(player.rotation - windDirection));

// Wind effectiveness (0 = against wind, 1 = with wind)
const windEffect = (Math.cos(windAngle) + 1) / 2;

// Apply to ship speed
const effectiveSpeed = baseSpeed * (0.5 + 0.5 * windEffect);
```

**Wind Effect Curve**:
- **With wind** (0°): 100% speed
- **Perpendicular** (90°): 75% speed
- **Against wind** (180°): 50% speed

### Wind Visualization
Wind direction is shown in the UI with a compass rose indicator.

---

## Camera & Rendering

### Camera Transform
The camera follows the player with smooth interpolation:

```javascript
// Camera position (centered on player)
const cameraX = player.x - canvas.width / 2;
const cameraY = player.y - canvas.height / 2;

// Apply transform
ctx.translate(-cameraX, -cameraY);
```

### Rendering Order
1. **Background** (ocean)
2. **Islands** (world objects)
3. **Ships** (with rotation)
4. **Projectiles** (BEFORE `ctx.restore()` for camera transform)
5. **UI Elements** (AFTER `ctx.restore()` for fixed positioning)

### Critical: Projectile Rendering
Projectiles MUST be rendered before `ctx.restore()` to apply camera transform:

```javascript
// Draw projectiles (BEFORE restore so camera transform is applied!)
if (state.projectiles) {
    state.projectiles.forEach(proj => {
        // ... draw projectile
    });
}

// Restore context to draw UI elements at fixed positions
ctx.restore();
```

---

## Key Formulas Reference

### Position from Rotation
```javascript
// Forward direction (bow)
x = Math.cos(rotation - Math.PI / 2)
y = Math.sin(rotation - Math.PI / 2)

// Lateral direction (port/starboard)
x = Math.cos(rotation)
y = Math.sin(rotation)
```

### Angle Between Two Points
```javascript
const angle = Math.atan2(targetY - sourceY, targetX - sourceX) + Math.PI / 2;
```

### Distance Between Points
```javascript
const distance = Math.hypot(x2 - x1, y2 - y1);
```

### Velocity Compensation (Arcade Firing)
```javascript
const compensatedAngle = baseAngle + 
    Math.atan2(player.vy, player.vx) * compensationFactor;
```

---

## Common Pitfalls

### ❌ Wrong: Using `rotation` for forward direction
```javascript
// This points to the side, not forward!
const forwardX = Math.cos(player.rotation);
```

### ✅ Correct: Subtract π/2 for forward direction
```javascript
const forwardX = Math.cos(player.rotation - Math.PI / 2);
```

### ❌ Wrong: Drawing projectiles after ctx.restore()
```javascript
ctx.restore(); // Camera transform removed!
// Projectiles drawn here won't be visible to other players
```

### ✅ Correct: Draw projectiles before ctx.restore()
```javascript
// Draw projectiles with camera transform
ctx.restore(); // Now remove transform for UI
```

### ❌ Wrong: Comparing angles without normalization
```javascript
if (angle1 - angle2 < 0.1) // Fails when angles wrap around ±π
```

### ✅ Correct: Normalize angle difference
```javascript
const diff = normalizeAngle(angle1 - angle2);
if (Math.abs(diff) < 0.1)
```

---

## Debugging Tips

### Visualizing Rotation
Add debug rendering to see ship orientation:
```javascript
// Draw forward direction line
ctx.strokeStyle = 'red';
ctx.beginPath();
ctx.moveTo(ship.x, ship.y);
ctx.lineTo(
    ship.x + Math.cos(ship.rotation - Math.PI / 2) * 50,
    ship.y + Math.sin(ship.rotation - Math.PI / 2) * 50
);
ctx.stroke();
```

### Logging Angles
Always log angles in degrees for readability:
```javascript
console.log(`Rotation: ${(rotation * 180 / Math.PI).toFixed(1)}°`);
```

### Checking Cannon Positions
Log world coordinates to verify positioning:
```javascript
console.log(`Cannon at (${cannonX.toFixed(1)}, ${cannonY.toFixed(1)})`);
```

---

## Version History

- **v1.1** (2026-01-03): Improved broadside detection and velocity compensation
  - Replaced 1.5 radian threshold with explicit ±60° sectors
  - Added configurable velocity compensation factor (0.0 to 1.0)
  - Improved accuracy while maintaining velocity compensation support
  
- **v1.0** (2026-01-02): Initial documentation
  - Documented coordinate system and rotation conventions
  - Explained cannon positioning mechanics
  - Added wind mechanics and camera transform details
