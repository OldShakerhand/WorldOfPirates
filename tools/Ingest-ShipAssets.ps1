<#
.SYNOPSIS
    Ingests high-resolution ship sprites, resizing them to optimized square textures for the game.
    
.DESCRIPTION
    This script automates the "Square Canvas, Square Render" workflow.
    It takes source PNGs (ideally 1024x1024), resizes them to 256x256 (High Quality),
    and saves them to the game's asset directory.
    
.PARAMETER ShipName
    The name of the ship class (e.g., "sloop", "fluyt").
    Script looks for {ShipName}_0.png, {ShipName}_1.png, {ShipName}_2.png.

.PARAMETER InputDir
    Directory containing the source high-res images. Defaults to current directory.

.PARAMETER OutputDir
    Directory to save processed assets. Defaults to 'src\public\assets\ships'.
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$ShipName,
    
    [string]$InputDir = ".",
    
    [string]$OutputDir = "src\public\assets\ships"
)

Add-Type -AssemblyName System.Drawing

$TARGET_SIZE = 256
$suffixes = @("_0", "_1", "_2")

Write-Host "=========================================="
Write-Host "   SHIP ASSET INGESTION: $ShipName"
Write-Host "=========================================="
Write-Host "Target Size: ${TARGET_SIZE}x${TARGET_SIZE} (Square)"
Write-Host "Input Dir:   $InputDir"
Write-Host "Output Dir:  $OutputDir"
Write-Host ""

# Ensure output directory exists
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Create backup directory
$backupDir = Join-Path $OutputDir "backup"
if (-not (Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

foreach ($suffix in $suffixes) {
    $filename = "${ShipName}${suffix}.png"
    $sourcePath = Join-Path $InputDir $filename
    $destPath = Join-Path $OutputDir $filename
    
    if (Test-Path $sourcePath) {
        Write-Host "Processing $filename..."
        
        # 1. Backup existing destination file if it exists (and is different from source)
        if ((Test-Path $destPath) -and ((Resolve-Path $sourcePath).Path -ne (Resolve-Path $destPath).Path)) {
            $backupPath = Join-Path $backupDir "$filename.bak"
            Copy-Item $destPath $backupPath -Force
            Write-Host "  -> Backed up existing to $backupPath"
        }
        
        # 2. Load Source
        $img = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))
        $originalSize = "${($img.Width)}x${($img.Height)}"
        
        # 3. Create Target Bitmap (Square)
        $newImg = New-Object System.Drawing.Bitmap($TARGET_SIZE, $TARGET_SIZE)
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        
        # 4. High Quality Settings
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # 5. Draw Resized
        # We draw the full source image into the full target square to strict preserve aspect ratio 1:1
        $graphics.DrawImage($img, 0, 0, $TARGET_SIZE, $TARGET_SIZE)
        
        $graphics.Dispose()
        $img.Dispose()
        
        # 6. Save
        $newImg.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $newImg.Dispose()
        
        Write-Host "  -> Resized ($originalSize -> ${TARGET_SIZE}x${TARGET_SIZE})"
        Write-Host "  -> Saved to $destPath"
    }
    else {
        Write-Warning "Source file not found: $sourcePath"
    }
}

Write-Host ""
Write-Host "Done! Don't forget to update ShipClass.js with square dimensions!"
