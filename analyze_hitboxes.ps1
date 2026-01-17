Add-Type -AssemblyName System.Drawing

$ships = @('raft', 'sloop', 'barque', 'fluyt', 'merchant', 'frigate', 'spanish_galleon', 'war_galleon')

Write-Host "Ship Hitbox Analysis"
Write-Host "===================="
Write-Host ""

foreach ($ship in $ships) {
    $path = "src\public\assets\ships\${ship}_2.png"
    
    if (-not (Test-Path $path)) {
        Write-Warning "File not found: $path"
        continue
    }
    
    $img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path))
    
    # Find bounding box of non-transparent pixels
    $minX = $img.Width
    $maxX = 0
    $minY = $img.Height
    $maxY = 0
    
    for ($y = 0; $y -lt $img.Height; $y += 2) {
        for ($x = 0; $x -lt $img.Width; $x += 2) {
            if ($img.GetPixel($x, $y).A -gt 0) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    
    $visualW = $maxX - $minX
    $visualH = $maxY - $minY
    $frameSize = $img.Width
    
    # Calculate hitbox factors (what percentage of frame is actual ship)
    $widthFactor = [math]::Round($visualW / $frameSize, 2)
    $heightFactor = [math]::Round($visualH / $frameSize, 2)
    
    Write-Host "$($ship.ToUpper()):"
    Write-Host "  Frame: ${frameSize}x${frameSize}"
    Write-Host "  Visual: ${visualW}x${visualH}"
    Write-Host "  Width Factor: $widthFactor"
    Write-Host "  Height Factor: $heightFactor"
    Write-Host ""
    
    $img.Dispose()
}
