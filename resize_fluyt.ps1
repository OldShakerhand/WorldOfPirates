Add-Type -AssemblyName System.Drawing

# Target dimensions for Fluyt (2x rendered size for quality)
$targetWidth = 104
$targetHeight = 144

# Files to resize
$files = @('fluyt_0.png', 'fluyt_1.png', 'fluyt_2.png')

Write-Host "Resizing Fluyt sprites to ${targetWidth}x${targetHeight}..."
Write-Host ""

foreach ($file in $files) {
    $sourcePath = "src\public\assets\ships\$file"
    $backupPath = "src\public\assets\ships\backup\${file}.original"
    
    if (Test-Path $sourcePath) {
        # Create backup directory if it doesn't exist
        $backupDir = "src\public\assets\ships\backup"
        if (-not (Test-Path $backupDir)) {
            New-Item -ItemType Directory -Path $backupDir | Out-Null
        }
        
        # Backup original if not already backed up
        if (-not (Test-Path $backupPath)) {
            Copy-Item $sourcePath $backupPath
            Write-Host "Backed up: $file -> backup\${file}.original"
        }
        
        # Load original image
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
Write-Host "Done! Originals backed up to backup\ folder"
