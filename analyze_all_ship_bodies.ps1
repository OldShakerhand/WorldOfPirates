Add-Type -AssemblyName System.Drawing

$ships = @('raft', 'sloop', 'barque', 'fluyt', 'merchant', 'frigate', 'spanish_galleon', 'war_galleon')

Write-Host "Ship Body Width Analysis (Excluding Sail Outliers)"
Write-Host "===================================================="
Write-Host ""

foreach ($ship in $ships) {
    $path = "src\public\assets\ships\${ship}_2.png"
    
    if (-not (Test-Path $path)) {
        Write-Warning "File not found: $path"
        continue
    }
    
    $img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path))
    
    # Collect all X coordinates of non-transparent pixels
    $xValues = @()
    $minY = $img.Height
    $maxY = 0
    
    for ($y = 0; $y -lt $img.Height; $y++) {
        for ($x = 0; $x -lt $img.Width; $x++) {
            if ($img.GetPixel($x, $y).A -gt 0) {
                $xValues += $x
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    
    if ($xValues.Count -eq 0) {
        Write-Warning "No pixels found in $ship"
        $img.Dispose()
        continue
    }
    
    $xValues = $xValues | Sort-Object
    
    # Calculate body bounds (exclude 5% outliers on each side for sails)
    $p05 = $xValues[[math]::Floor($xValues.Count * 0.05)]
    $p95 = $xValues[[math]::Floor($xValues.Count * 0.95)]
    
    # Full bounds
    $minX = $xValues[0]
    $maxX = $xValues[$xValues.Count - 1]
    
    # Calculate dimensions
    $fullWidth = $maxX - $minX
    $bodyWidth = $p95 - $p05
    $height = $maxY - $minY
    
    # Calculate factors
    $frameSize = 256
    $fullWidthFactor = [math]::Round($fullWidth / $frameSize, 2)
    $bodyWidthFactor = [math]::Round($bodyWidth / $frameSize, 2)
    $heightFactor = [math]::Round($height / $frameSize, 2)
    
    Write-Host "$($ship.ToUpper()):"
    Write-Host "  Full width: ${fullWidth}px (factor: $fullWidthFactor)"
    Write-Host "  Body width: ${bodyWidth}px (factor: $bodyWidthFactor) <- excluding sail outliers"
    Write-Host "  Height: ${height}px (factor: $heightFactor)"
    Write-Host ""
    
    $img.Dispose()
}
