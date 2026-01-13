# Visual Adapter Walkthrough

This document outlines the implementation of the **Visual Adapter Layer** for "World of Pirates". This layer provides client-side visual enhancements—specifically organic coastlines and water transitions—without altering the underlying tile-based gameplay logic.

## 1. Base Terrain Rendering
**Goal:** Replace the debug grid with a clean, tile-based render.
- **Implementation:** Created `VisualAdapter.renderBaseTerrain`.
- **Optimization:** Added viewport culling to only render visible tiles.
- **Result:** A clean base layer of Water, Shallow Water, and Land.

## 2. Shallow Water Gradients
**Goal:** Soften the transition between deep water and land.
- **Implementation:** `VisualAdapter.renderShallowWaterGradients`.
- **Logic:** Adds a semi-transparent light blue overlay (`rgba(147, 197, 253, 0.15)`) to shallow water tiles that are adjacent to land.
- **Result:** A subtle "glowing" effect near shores that adds depth.

## 3. Curved Coastlines (The "Corner Scraps" Illusion)
**Goal:** Make the blocky grid-based world look organic and rounded.
- **Challenge:** We cannot use true vector paths or splines because the game logic (movement, collision) is strictly tile-based. The visual representation must "match" the logical grid closely enough to not confuse the player.
- **Solution:** **Convex Rounded Corners via Inverse Geometry**.

### The Technique
Instead of drawing *new* rounded land pixels, we **cut away** the sharp corners of the square land tiles.

1. **Detection:** We identify "Outer Corners" — land tiles that have Water on two adjacent sides (e.g., North and West) AND the diagonal (North-West) is also Water.
2. **Inverse Painting:** We paint **Water Color** on top of the sharp land corner.
3. **Shape:** We use an "Inverse Rounded Corner" shape. Imagine a square of water placed at the corner, with a circle of "land" cut out of it. We draw that "corner scrap" in water color.
   - This "shaves off" the sharp tip of the land tile.
   - It creates a visible **convex curve** (bulging outward, like a real island).
   - Because we paint with the exact water color, it looks like transparency.

**Code Snippet:**
```javascript
// Example: Rounding a Top-Left (NW) Corner
ctx.fillStyle = this.colors.SHALLOW; // Water color
ctx.beginPath();
ctx.moveTo(worldX, worldY + radius);      // Start at left edge
ctx.lineTo(worldX, worldY);               // Go to sharp corner tip
ctx.lineTo(worldX + radius, worldY);      // Go to top edge
// Draw arc that "cuts back" inward
ctx.arc(worldX + radius, worldY + radius, radius, -Math.PI/2, -Math.PI, true);
ctx.fill(); // Cover the sharp tip with water
```

## 4. Why "Inverse Geometry" Works
- **Silhouette:** It modifies the silhouette of the land, which is what the eye tracks.
- **Safety:** It uses standard drawing (source-over), avoiding complex transparency blending issues that can hide other game objects (like ships).
- **Scale:** A radius of 50% tile size connects the midpoints of the edges, creating the mathematically smoothest possible rounded corner for a square grid.
