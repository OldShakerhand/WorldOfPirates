Add-Type -AssemblyName System.Drawing

$ships = @(
    @{name = 'sloop'; rendered = '37.5x52.5' },
    @{name = 'pinnace'; rendered = '45x60' },
    @{name = 'barque'; rendered = '52.5x67.5' },
    @{name = 'fluyt'; rendered = '52x72' },
    @{name = 'merchant'; rendered = '60x78' },
    @{name = 'frigate'; rendered = '67.5x90' },
    @{name = 'fast_galleon'; rendered = '75x97.5' },
    @{name = 'spanish_galleon'; rendered = '82.5x105' },
    @{name = 'war_galleon'; rendered = '90x120' }
)

Write-Host "Ship Asset Analysis (PNG vs Rendered Size):"
Write-Host "============================================"
Write-Host ""

foreach ($ship in $ships) {
    # Try _0.png first, then .png
    $path = "src\public\assets\ships\$($ship.name)_0.png"
    if (-not (Test-Path $path)) {
        $path = "src\public\assets\ships\$($ship.name).png"
    }
    
    if (Test-Path $path) {
        $img = [System.Drawing.Image]::FromFile((Resolve-Path $path))
        $actualW = $img.Width
        $actualH = $img.Height
        $img.Dispose()
        
        $rendered = $ship.rendered -split 'x'
        $renderedW = [double]$rendered[0]
        $renderedH = [double]$rendered[1]
        
        $scaleW = [math]::Round($actualW / $renderedW, 2)
        $scaleH = [math]::Round($actualH / $renderedH, 2)
        
        $filename = Split-Path $path -Leaf
        
        Write-Host "$($ship.name):"
        Write-Host "  File: $filename"
        Write-Host "  PNG: ${actualW}x${actualH} px"
        Write-Host "  Rendered: $($ship.rendered) px"
        Write-Host "  Downscale: ${scaleW}x (width), ${scaleH}x (height)"
        Write-Host ""
    }
}
