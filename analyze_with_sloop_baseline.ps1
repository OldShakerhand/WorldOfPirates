Add-Type -AssemblyName System.Drawing

# Analysis with Sloop as baseline
$ships = @(
    @{name = 'raft'; visualH = 60 },
    @{name = 'sloop'; visualH = 174 },
    @{name = 'barque'; visualH = 216 },
    @{name = 'fluyt'; visualH = 216; visualW = 144 }
)

Write-Host "Ship Size Recommendations (Sloop as Baseline)"
Write-Host "=============================================="
Write-Host ""

# Sloop baseline: currently 92x92, visual height 174px
# This means visual height is 174/256 = 68% of frame
# Rendered at 92px, so visual height in game = 92 * 0.68 = 62.5px

$sloopRenderSize = 92
$sloopVisualHeight = 174
$sloopFrameSize = 256

# Calculate how much of the frame is visual content
$sloopVisualRatio = $sloopVisualHeight / $sloopFrameSize
$sloopGameHeight = $sloopRenderSize * $sloopVisualRatio

Write-Host "BASELINE: Sloop"
Write-Host "  Current render: ${sloopRenderSize}x${sloopRenderSize}"
Write-Host "  Visual height in frame: $sloopVisualHeight / $sloopFrameSize = $([math]::Round($sloopVisualRatio, 2))"
Write-Host "  Actual game height: ~$([math]::Round($sloopGameHeight, 1))px"
Write-Host ""
Write-Host "Scaling other ships proportionally:"
Write-Host ""

foreach ($ship in $ships) {
    # Calculate scale relative to Sloop's visual height
    $scale = $ship.visualH / $sloopVisualHeight
    
    # Calculate render size to maintain same visual height ratio
    $renderSize = [math]::Round($sloopRenderSize * $scale / 4) * 4  # Round to nearest 4
    
    # Calculate actual game height
    $visualRatio = $ship.visualH / $sloopFrameSize
    $gameHeight = $renderSize * $visualRatio
    
    Write-Host "$($ship.name.ToUpper()):"
    Write-Host "  Visual height: $($ship.visualH)px (scale: $([math]::Round($scale, 2))x vs Sloop)"
    Write-Host "  Recommended render: ${renderSize}x${renderSize}"
    Write-Host "  Game height: ~$([math]::Round($gameHeight, 1))px"
    Write-Host ""
}

Write-Host ""
Write-Host "SUMMARY TABLE:"
Write-Host "=============="
Write-Host ""
Write-Host "Ship    | Render Size | Game Height | Relative Size"
Write-Host "--------|-------------|-------------|---------------"

foreach ($ship in $ships) {
    $scale = $ship.visualH / $sloopVisualHeight
    $renderSize = [math]::Round($sloopRenderSize * $scale / 4) * 4
    $visualRatio = $ship.visualH / $sloopFrameSize
    $gameHeight = $renderSize * $visualRatio
    $relSize = [math]::Round($scale * 100, 0)
    
    $name = $ship.name.PadRight(7)
    $render = "${renderSize}x${renderSize}".PadRight(11)
    $height = "~$([math]::Round($gameHeight, 1))px".PadRight(11)
    
    Write-Host "$name | $render | $height | ${relSize}%"
}
