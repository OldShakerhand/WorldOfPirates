Add-Type -AssemblyName System.Drawing

$path = "src\public\assets\ships\war_galleon_2.png"
$img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path))

Write-Host "War Galleon Detailed Analysis"
Write-Host "=============================="
Write-Host ""

# Find exact bounds
$minX = $img.Width
$maxX = 0
$minY = $img.Height
$maxY = 0

# Also track pixels by row to find outliers
$pixelsByRow = @{}

for ($y = 0; $y -lt $img.Height; $y++) {
    $rowPixels = @()
    for ($x = 0; $x -lt $img.Width; $x++) {
        $pixel = $img.GetPixel($x, $y)
        if ($pixel.A -gt 0) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
            $rowPixels += $x
        }
    }
    if ($rowPixels.Count -gt 0) {
        $pixelsByRow[$y] = $rowPixels
    }
}

$visualW = $maxX - $minX
$visualH = $maxY - $minY

Write-Host "Full bounds: ${minX}-${maxX} (width: ${visualW}), ${minY}-${maxY} (height: ${visualH})"
Write-Host ""

# Find the main body (exclude outliers)
$xValues = @()
foreach ($row in $pixelsByRow.Values) {
    $xValues += $row
}
$xValues = $xValues | Sort-Object

# Calculate percentiles to find outliers
$p10 = $xValues[[math]::Floor($xValues.Count * 0.10)]
$p90 = $xValues[[math]::Floor($xValues.Count * 0.90)]

Write-Host "X-coordinate distribution:"
Write-Host "  10th percentile: $p10"
Write-Host "  90th percentile: $p90"
Write-Host "  Min: $minX"
Write-Host "  Max: $maxX"
Write-Host ""

# Suggest tighter bounds (exclude extreme 5% on each side)
$p05 = $xValues[[math]::Floor($xValues.Count * 0.05)]
$p95 = $xValues[[math]::Floor($xValues.Count * 0.95)]

$tightW = $p95 - $p05
$tightWidthFactor = [math]::Round($tightW / 256, 2)

Write-Host "Suggested bounds (excluding 5% outliers on each side):"
Write-Host "  X: ${p05}-${p95} (width: ${tightW})"
Write-Host "  Width factor: $tightWidthFactor"
Write-Host ""

# Current vs suggested
Write-Host "Current: 0.72 width factor (184px)"
Write-Host "Suggested: $tightWidthFactor width factor (${tightW}px)"

$img.Dispose()
