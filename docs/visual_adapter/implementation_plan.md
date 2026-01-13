# Implementation Plan - Shallow Water Rounding

## Goal
Apply the same "rounded corner" visual illusion to **Shallow Water tiles** where they border **Deep Water**.

## Current State
- Land tiles adjacent to Water/Shallow are rounded by painting Shallow Water over the corners.
- Technique: Inverse Geometry (Corner Scraps).

## Proposed Changes
Update `visual_adapter.js`:
1. Modify `renderCornerOverlays`:
   - Iterate visible tiles.
   - **Case A (Land):** Existing logic. If Land, check for any Water neighbors. Paint Shallow Water.
   - **Case B (Shallow):** New logic. If Shallow, check for **Deep Water** neighbors. Paint Deep Water.

## Logic Details
For a **Shallow** tile:
- Check neighbors: North, South, East, West, Diagonals.
- Condition: If (North is Deep) AND (West is Deep) AND (NW is Deep) -> Round the NW corner.
- Paint Color: `this.colors.WATER` (Deep Blue).

## Verification
- Observe Shallow Water islands/areas.
- Corners touching Deep Water should be convexly rounded.
- Deep Water color should "cut into" the Shallow Water.
