Add-Type -AssemblyName System.Drawing

$paths = @(
    "src\public\assets\ships\backup\fluyt_2.png.1.5x",
    "src\public\assets\ships\fluyt_with full sail with cannons.png"
)

foreach ($path in $paths) {
    if (Test-Path $path) {
        $img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path))
        
        $minX = $img.Width; $maxX = 0; $minY = $img.Height; $maxY = 0
        
        for ($y = 0; $y -lt $img.Height; $y += 5) {
            for ($x = 0; $x -lt $img.Width; $x += 5) {
                if ($img.GetPixel($x, $y).A -gt 0) {
                    if ($x -lt $minX) { $minX = $x }
                    if ($x -gt $maxX) { $maxX = $x }
                    if ($y -lt $minY) { $minY = $y }
                    if ($y -gt $maxY) { $maxY = $y }
                }
            }
        }
        
        $w = $maxX - $minX
        $h = $maxY - $minY
        $r = $w / $h
        
        Write-Host "File: $(Split-Path $path -Leaf)"
        Write-Host "  Dimensions: ${w}x${h}"
        Write-Host "  Ratio: $($r.ToString('F3'))"
        $img.Dispose()
    }
}
