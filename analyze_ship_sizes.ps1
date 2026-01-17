Add-Type -AssemblyName System.Drawing

$ships = @('raft', 'sloop', 'barque', 'fluyt')

Write-Host "Ship Visual Content Analysis"
Write-Host "============================="
Write-Host ""

$results = @()

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
    $ratio = $visualW / $visualH
    
    $results += [PSCustomObject]@{
        Ship         = $ship
        FrameSize    = "$($img.Width)x$($img.Height)"
        VisualSize   = "${visualW}x${visualH}"
        VisualWidth  = $visualW
        VisualHeight = $visualH
        Ratio        = [math]::Round($ratio, 3)
    }
    
    $img.Dispose()
}

# Display results
$results | Format-Table -AutoSize

# Recommend render sizes
Write-Host ""
Write-Host "Recommended Render Sizes (based on visual content):"
Write-Host "===================================================="
Write-Host ""

# Find the ship with median height as baseline
$sortedByHeight = $results | Sort-Object VisualHeight
$baseline = $sortedByHeight[1]  # Use second ship as baseline

Write-Host "Using visual height as primary scaling factor..."
Write-Host ""

foreach ($result in $results) {
    # Calculate scale factor relative to baseline
    $scale = $result.VisualHeight / $baseline.VisualHeight
    
    # Suggest square render size (round to nearest 4 for clean scaling)
    $suggestedSize = [math]::Round(($result.VisualHeight / 256) * 100, 0)
    $suggestedSize = [math]::Round($suggestedSize / 4) * 4
    
    Write-Host "$($result.Ship):"
    Write-Host "  Visual: $($result.VisualSize) (Ratio: $($result.Ratio))"
    Write-Host "  Suggested Render: ${suggestedSize}x${suggestedSize} (square)"
    Write-Host "  Scale vs baseline: $([math]::Round($scale, 2))x"
    Write-Host ""
}
