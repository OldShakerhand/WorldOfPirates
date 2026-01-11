const sharp = require('sharp');
const path = require('path');

/**
 * Resize map image to specified scale
 * Uses Lanczos3 resampling for high quality
 */
async function resizeMap(inputPath, outputPath, scale = 0.5) {
    console.log(`Resizing ${inputPath} to ${scale * 100}% scale...`);

    const image = sharp(inputPath);
    const metadata = await image.metadata();

    const newWidth = Math.round(metadata.width * scale);
    const newHeight = Math.round(metadata.height * scale);

    console.log(`Original: ${metadata.width}x${metadata.height}`);
    console.log(`Resized:  ${newWidth}x${newHeight}`);

    await image
        .resize(newWidth, newHeight, {
            kernel: 'lanczos3',  // High quality resampling
            fit: 'fill'
        })
        .toFile(outputPath);

    console.log(`✓ Saved to ${outputPath}`);
}

// Run
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node resize_map.js <input.png> <output.png> [scale]');
    console.error('Example: node resize_map.js images/MapChart_Map.png images/MapChart_Map_50.png 0.5');
    process.exit(1);
}

const scale = args[2] ? parseFloat(args[2]) : 0.5;
resizeMap(args[0], args[1], scale).catch(console.error);
