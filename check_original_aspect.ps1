Add-Type -AssemblyName System.Drawing

$path = "src\public\assets\ships\backup\fluyt_0.png.1.5x"
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
    
    Write-Host "ORIGINAL BACKUP Dimensions: ${w}x${h}"
    Write-Host "ORIGINAL BACKUP Ratio: $($r.ToString('F3'))"
    $img.Dispose()
}
else {
    Write-Host "Backup file not found at $path"
    # Try finding any backup
    $backup = Get-ChildItem "src\public\assets\ships\backup\fluyt_0.png*" | Select-Object -First 1
    if ($backup) {
        Write-Host "Found alternative backup: $($backup.FullName)"
    }
}
