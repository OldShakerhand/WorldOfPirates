Add-Type -AssemblyName System.Drawing

$files = @("fluyt_0.png", "fluyt_2.png")

foreach ($file in $files) {
    $path = "src\public\assets\ships\$file"
    if (Test-Path $path) {
        $img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $path))
        
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
        
        $w = $maxX - $minX
        $h = $maxY - $minY
        $r = $w / $h
        
        Write-Host "$file Dimensions: ${w}x${h}"
        Write-Host "$file Ratio: $($r.ToString('F3'))"
        $img.Dispose()
    }
}
