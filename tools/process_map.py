"""
Automatic World Map Processor

Processes a Caribbean map image to generate a clean tilemap with automatic shallow water.

Requirements:
- pip install pillow numpy

Usage:
    python tools/process_map.py <input_image> <output_png> [--tile-size 25]

Example:
    python tools/process_map.py images/Wop_mapcitynames.jpg assets/map_processed.png --tile-size 25

Output:
- Clean PNG with 3 colors:
  - Black (0, 0, 0) = WATER
  - Cyan (0, 255, 255) = SHALLOW (2-tile buffer around land)
  - White (255, 255, 255) = LAND
"""

import sys
import argparse
from PIL import Image
import numpy as np

def clean_map(image_array, land_threshold=128):
    """
    Convert image to binary land/water
    
    Args:
        image_array: numpy array of image
        land_threshold: brightness threshold for land detection (0-255)
    
    Returns:
        Binary array: True = land, False = water
    """
    # Convert to grayscale if needed
    if len(image_array.shape) == 3:
        grayscale = np.mean(image_array, axis=2)
    else:
        grayscale = image_array
    
    # Threshold: bright = land, dark = water
    is_land = grayscale > land_threshold
    
    return is_land

def generate_shallow_water(land_mask, buffer_tiles=2):
    """
    Generate shallow water as a buffer around land
    
    Args:
        land_mask: Boolean array where True = land
        buffer_tiles: Number of tiles for shallow water buffer
    
    Returns:
        Terrain array: 0=WATER, 1=SHALLOW, 2=LAND
    """
    height, width = land_mask.shape
    terrain = np.zeros((height, width), dtype=np.uint8)
    
    # Set land
    terrain[land_mask] = 2
    
    # Generate shallow water by checking distance to land
    for y in range(height):
        for x in range(width):
            if terrain[y, x] == 0:  # If water
                # Check if within buffer_tiles of land
                min_dist = float('inf')
                
                for dy in range(-buffer_tiles, buffer_tiles + 1):
                    for dx in range(-buffer_tiles, buffer_tiles + 1):
                        ny, nx = y + dy, x + dx
                        
                        if 0 <= ny < height and 0 <= nx < width:
                            if land_mask[ny, nx]:
                                dist = np.sqrt(dx*dx + dy*dy)
                                min_dist = min(min_dist, dist)
                
                if min_dist <= buffer_tiles:
                    terrain[y, x] = 1  # SHALLOW
    
    return terrain

def terrain_to_image(terrain):
    """
    Convert terrain array to RGB image
    
    Args:
        terrain: Array with values 0=WATER, 1=SHALLOW, 2=LAND
    
    Returns:
        PIL Image with colors: black, cyan, white
    """
    height, width = terrain.shape
    rgb = np.zeros((height, width, 3), dtype=np.uint8)
    
    # WATER = black (0, 0, 0)
    rgb[terrain == 0] = [0, 0, 0]
    
    # SHALLOW = cyan (0, 255, 255)
    rgb[terrain == 1] = [0, 255, 255]
    
    # LAND = white (255, 255, 255)
    rgb[terrain == 2] = [255, 255, 255]
    
    return Image.fromarray(rgb)

def process_map(input_path, output_path, tile_size=25, land_threshold=128, shallow_buffer=2):
    """
    Process map image: clean and generate shallow water
    
    Args:
        input_path: Path to input image
        output_path: Path to output PNG
        tile_size: Target tile size (for info only, doesn't resize)
        land_threshold: Brightness threshold for land detection
        shallow_buffer: Tiles of shallow water around land
    """
    print(f"Reading image: {input_path}")
    img = Image.open(input_path)
    
    # Convert to numpy array
    img_array = np.array(img)
    print(f"Image size: {img.width}x{img.height}")
    
    # Clean map (binary land/water)
    print(f"Cleaning map (land threshold: {land_threshold})...")
    land_mask = clean_map(img_array, land_threshold)
    
    land_pixels = np.sum(land_mask)
    total_pixels = land_mask.size
    print(f"Land: {land_pixels} pixels ({land_pixels/total_pixels*100:.1f}%)")
    
    # Generate shallow water
    print(f"Generating shallow water ({shallow_buffer} tile buffer)...")
    terrain = generate_shallow_water(land_mask, shallow_buffer)
    
    # Count terrain types
    water_count = np.sum(terrain == 0)
    shallow_count = np.sum(terrain == 1)
    land_count = np.sum(terrain == 2)
    
    print(f"\nTerrain distribution:")
    print(f"  WATER:   {water_count} pixels ({water_count/total_pixels*100:.1f}%)")
    print(f"  SHALLOW: {shallow_count} pixels ({shallow_count/total_pixels*100:.1f}%)")
    print(f"  LAND:    {land_count} pixels ({land_count/total_pixels*100:.1f}%)")
    
    # Convert to image
    print(f"\nSaving to: {output_path}")
    output_img = terrain_to_image(terrain)
    output_img.save(output_path)
    
    print(f"✓ Saved {output_path}")
    print(f"\nNext step:")
    print(f"  node tools/convert_map.js {output_path} assets/world_map.json {tile_size}")

def main():
    parser = argparse.ArgumentParser(description='Process Caribbean map for World of Pirates')
    parser.add_argument('input', help='Input image path (JPG, PNG)')
    parser.add_argument('output', help='Output PNG path')
    parser.add_argument('--tile-size', type=int, default=25, help='Tile size in pixels (default: 25)')
    parser.add_argument('--land-threshold', type=int, default=128, help='Brightness threshold for land (0-255, default: 128)')
    parser.add_argument('--shallow-buffer', type=int, default=2, help='Shallow water buffer in tiles (default: 2)')
    
    args = parser.parse_args()
    
    try:
        process_map(
            args.input,
            args.output,
            args.tile_size,
            args.land_threshold,
            args.shallow_buffer
        )
    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
