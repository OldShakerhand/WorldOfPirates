Add-Type -AssemblyName System.Drawing

# Target dimensions (Square 256x256)
$targetSize = 256

# Map output filenames to correct source files
$map = @{
    'fluyt_0.png' = 'fluyt_without sail with cannons.png';
    'fluyt_1.png' = 'fluyt_with half sail with cannons.png';
    'fluyt_2.png' = 'fluyt_with full sail with cannons.png'
}

Write-Host "Regenerating Fluyt sprites as ${targetSize}x${targetSize} squares..."
Write-Host ""

foreach ($key in $map.Keys) {
    $sourceFile = $map[$key]
    $sourcePath = "src\public\assets\ships\$sourceFile"
    $destPath = "src\public\assets\ships\$key"
    
    if (Test-Path $sourcePath) {
        # Backup existing
        if (Test-Path $destPath) {
            $backupPath = "src\public\assets\ships\backup\${key}.narrow"
            Copy-Item $destPath $backupPath -Force
        }
        
        # Load source
        $sourceImg = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))
        
        # Create new square bitmap
        $newImg = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
        
        # High quality settings
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Draw resized (scaling 1024x1024 down to 256x256)
        $graphics.DrawImage($sourceImg, 0, 0, $targetSize, $targetSize)
        
        $graphics.Dispose()
        $sourceImg.Dispose()
        
        # Save
        $newImg.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $newImg.Dispose()
        
        Write-Host "Generated: $key from $sourceFile"
    }
    else {
        Write-Error "Source file not found: $sourceFile"
    }
}
