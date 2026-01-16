Add-Type -AssemblyName System.Drawing

# New target dimensions for Fluyt (2× rendered size of 78×108)
$targetWidth = 156
$targetHeight = 216

# Files to resize
$files = @('fluyt_0.png', 'fluyt_1.png', 'fluyt_2.png')

Write-Host "Resizing Fluyt sprites to ${targetWidth}x${targetHeight} (1.5× scale increase)..."
Write-Host ""

foreach ($file in $files) {
    $sourcePath = "src\public\assets\ships\$file"
    $backupPath = "src\public\assets\ships\backup\${file}.1.5x"
    
    if (Test-Path $sourcePath) {
        # Backup current version
        Copy-Item $sourcePath $backupPath -Force
        Write-Host "Backed up: $file -> backup\${file}.1.5x"
        
        # Load current image
        $sourceImg = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath))
        $oldSize = "$($sourceImg.Width)x$($sourceImg.Height)"
        
        # Create new bitmap with target dimensions
        $newImg = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
        
        # Use high-quality interpolation
        $graphics = [System.Drawing.Graphics]::FromImage($newImg)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Draw resized image
        $graphics.DrawImage($sourceImg, 0, 0, $targetWidth, $targetHeight)
        
        # Cleanup
        $graphics.Dispose()
        $sourceImg.Dispose()
        
        # Save resized image
        $newImg.Save($sourcePath, [System.Drawing.Imaging.ImageFormat]::Png)
        $newImg.Dispose()
        
        Write-Host "Resized: $file ($oldSize -> ${targetWidth}x${targetHeight})"
    }
}

Write-Host ""
Write-Host "Done! Previous versions backed up to backup\ folder"
Write-Host "Rendered size: 78x108 pixels (1.5× increase)"
Write-Host "Source size: 156x216 pixels (2× rendered for quality)"
