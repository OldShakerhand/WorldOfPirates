# Technical Report: Visual Adapter Layer

## Objective
Implement a client-side visual layer to render organic, curved coastlines and water effects for a tile-based pirate game, without modifying server logic or gameplay physics.

## Challenges & Solutions

### 1. The "Bitten Apple" Problem (Concave vs Convex)
**Initial Attempts:**
- Drawn simple arcs or "wedges" at corners.
- **Result:** This created **concave** curves (caving inward), which looked like bites taken out of the apple. It made the islands look spiky and strange rather than rounded.

**Solution:**
- We needed **convex** curves (bulging outward).
- This requires "shaving off" the sharp corner tip rather than filling the inner corner.

### 2. The "Missing Ship" Bug (Composite Operations)
**Problem:**
- To "shave off" the land corner, we initially used `ctx.globalCompositeOperation = 'destination-out'` to erase the land pixels.
- **Fatal Flaw:** This operation applies to the *entire canvas context*. If not reset perfectly, or if the render order is tricky, it can erase other objects drawn subsequently. In our case, it caused the player's ship (drawn after the map) to disappear or fail to render because the context state was corrupted or the "erase" effect persisted.

**Solution:**
- **Inverse Geometry with Source-Over:**
- Instead of "erasing" land (making it transparent), we simply **paint over it** with the Water color (`this.colors.SHALLOW`).
- This achieves the exact same visual result (the land corner looks gone) but uses the standard, safe `source-over` drawing mode.
- We draw a specific "Corner Scrap" shape: A square at the corner minus a circular cutout.

### 3. The "ReferenceError" Crash
**Problem:**
- A variable mismatch (`cornerRadius` defined, `radius` used) caused a JavaScript runtime error in the render loop.
- **Result:** The rendering frame aborted halfway through. The map drew (partially), but the code crashed before reaching the code that draws the ship. This explained why the ship vanished.

**Fix:**
- Corrected variable naming to ensure the loop runs to completion.

## Final Architecture

### visual_adapter.js
- **Standalone Module:** Can be toggled on/off.
- **Viewport Culling:** Only loops through visible tiles for performance.
- **Stateless:** Depends only on the provided `tilemap` data.

### Rendering Pipeline
1. **Base Terrain:** Buffer full tiles (Water/Land).
2. **Shallow Gradients:** Add transparent overlays to shallow water near land.
3. **Coastlines:**
   - **Corner Overlays:** Loop through land tiles. Detect outer corners. Draw "Inverse Rounded Corner" shapes in water color to round off the silhouette.

## Future Recommendations
- **Texture Support:** If textures are added, the "paint over with solid water color" trick won't work perfectly. We would need to paint with the *water texture pattern*.
- **WebGL:** For cooler effects (waves, distortions), moving to a WebGL shader would be more performant and flexible than Canvas 2D API.
