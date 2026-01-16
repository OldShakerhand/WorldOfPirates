Add-Type -AssemblyName System.Drawing

$TARGET_SIZE = 256

# Map source files to destination
$updates = @(
    @{src = 'sloop_with_no_sail.png'; dest = 'sloop_0.png' },
    @{src = 'sloop_with_half_sail.png'; dest = 'sloop_1.png' },
    @{src = 'sloop_with_full_sail.png'; dest = 'sloop_2.png' }
)

Write-Host "Importing all 3 Sloop variants (centered versions)..."
Write-Host ""

foreach ($update in $updates) {
    $srcPath = "src\public\assets\ships\template\$($update.src)"
    $destPath = "src\public\assets\ships\$($update.dest)"
    
    if (-not (Test-Path $srcPath)) {
        Write-Error "Source not found: $srcPath"
        continue
    }
    
    # Backup existing
    if (Test-Path $destPath) {
        $backupPath = "src\public\assets\ships\backup\$($update.dest).bak"
        Copy-Item $destPath $backupPath -Force
        Write-Host "Backed up: $($update.dest)"
    }
    
    # Load source
    $img = [System.Drawing.Image]::FromFile((Resolve-Path $srcPath))
    $originalSize = "$($img.Width)x$($img.Height)"
    
    # Create 256x256 bitmap
    $newImg = New-Object System.Drawing.Bitmap($TARGET_SIZE, $TARGET_SIZE)
    $graphics = [System.Drawing.Graphics]::FromImage($newImg)
    
    # High quality settings
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Resize
    $graphics.DrawImage($img, 0, 0, $TARGET_SIZE, $TARGET_SIZE)
    
    $graphics.Dispose()
    $img.Dispose()
    
    # Save
    $newImg.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $newImg.Dispose()
    
    Write-Host "Updated: $($update.dest) from $($update.src) ($originalSize -> 256x256)"
}

Write-Host ""
Write-Host "Done! All 3 Sloop sprites updated with centered versions."
