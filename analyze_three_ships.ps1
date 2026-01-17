Add-Type -AssemblyName System.Drawing

Write-Host "Ship Size Analysis (Sloop, Barque, Fluyt only)"
Write-Host "================================================"
Write-Host ""

$ships = @(
    @{name = 'sloop'; file = 'sloop_2.png' },
    @{name = 'barque'; file = 'barque_2.png' },
    @{name = 'fluyt'; file = 'fluyt_2.png' }
)

$results = @()

foreach ($ship in $ships) {
    $path = "src\public\assets\ships\$($ship.file)"
    
    if (-not (Test-Path $path)) {
        Write-Warning "File not found: $path"
        continue
    }
    
    $img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path))
    
    # Find visual content bounds
    $minX = $img.Width; $maxX = 0; $minY = $img.Height; $maxY = 0
    
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
    
    $results += [PSCustomObject]@{
        Ship         = $ship.name
        VisualWidth  = $visualW
        VisualHeight = $visualH
        VisualRatio  = [math]::Round($visualW / $visualH, 3)
    }
    
    $img.Dispose()
}

Write-Host "Visual Content Analysis:"
Write-Host ""
$results | Format-Table -AutoSize

Write-Host ""
Write-Host "RECOMMENDED SIZING (Using Sloop as baseline at 92x92):"
Write-Host "======================================================"
Write-Host ""

$sloop = $results | Where-Object { $_.Ship -eq 'sloop' }
$sloopRender = 92

foreach ($result in $results) {
    # Scale based on visual height relative to Sloop
    $heightScale = $result.VisualHeight / $sloop.VisualHeight
    $suggestedSize = [math]::Round($sloopRender * $heightScale / 4) * 4  # Round to nearest 4
    
    # Calculate actual game height
    $frameSize = 256
    $visualRatio = $result.VisualHeight / $frameSize
    $gameHeight = $suggestedSize * $visualRatio
    
    Write-Host "$($result.Ship.ToUpper()):"
    Write-Host "  Visual: $($result.VisualWidth)x$($result.VisualHeight) (Ratio: $($result.VisualRatio))"
    Write-Host "  Height scale vs Sloop: $([math]::Round($heightScale, 2))x"
    Write-Host "  Recommended render: ${suggestedSize}x${suggestedSize}"
    Write-Host "  Actual game height: ~$([math]::Round($gameHeight, 1))px"
    Write-Host ""
}

Write-Host ""
Write-Host "SUMMARY:"
Write-Host "--------"
Write-Host "Sloop:  92x92  (baseline, ~62px game height)"
Write-Host "Barque: 116x116 (1.24x Sloop, ~98px game height)"
Write-Host "Fluyt:  116x116 (1.24x Sloop, ~98px game height, wider hull)"
