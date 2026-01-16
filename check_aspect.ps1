Add-Type -AssemblyName System.Drawing

$path = "src\public\assets\ships\fluyt_with full sail with cannons.png"
if (Test-Path $path) {
    $img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path))
    
    # Simple bounding box finder
    $minX = $img.Width
    $maxX = 0
    $minY = $img.Height
    $maxY = 0
    
    # We'll scan a grid to be faster than checking every pixel
    for ($y = 0; $y -lt $img.Height; $y += 2) {
        for ($x = 0; $x -lt $img.Width; $x += 2) {
            $pixel = $img.GetPixel($x, $y)
            if ($pixel.A -gt 0) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    
    $visualWidth = $maxX - $minX
    $visualHeight = $maxY - $minY
    $ratio = $visualWidth / $visualHeight
    $gameRatio = 78 / 108
    
    Write-Host "Visual Dimensions: ${visualWidth}x${visualHeight}"
    Write-Host "Natural Ratio: $($ratio.ToString('F3'))"
    Write-Host "Current Game Ratio: $($gameRatio.ToString('F3'))"
    
    if ($ratio -gt $gameRatio) {
        Write-Host "CONCLUSION: The game is SQUISHING the ship horizontally. It needs to be wider."
    }
    else {
        Write-Host "CONCLUSION: The game is STRETCHING the ship vertically."
    }
    
    $img.Dispose()
}
