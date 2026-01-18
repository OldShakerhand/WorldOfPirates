# Config consolidation update script
# This script updates all config references to use the new namespaced structure

$files = @(
    "Player.js",
    "NPCShip.js",
    "GameLoop.js",
    "World.js",
    "Wind.js",
    "Projectile.js",
    "NPCManager.js",
    "Harbor.js",
    "Island.js"
)

foreach ($file in $files) {
    $path = "c:\Development\WorldOfPirates\src\server\game\$file"
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        
        # Update config references
        $content = $content -replace 'GameConfig\.TERRAIN', 'GAME.TERRAIN'
        $content = $content -replace 'GameConfig\.TILE_SIZE', 'GAME.TILE_SIZE'
        $content = $content -replace 'GameConfig\.WORLD_', 'GAME.WORLD_'
        $content = $content -replace 'GameConfig\.HARBOR_', 'GAME.HARBOR_'
        $content = $content -replace 'GameConfig\.PLAYER_SPAWN', 'GAME.PLAYER_SPAWN'
        $content = $content -replace 'GameConfig\.TICK_RATE', 'GAME.TICK_RATE'
        
        $content = $content -replace 'PhysicsConfig\.', 'PHYSICS.'
        $content = $content -replace 'CombatConfig\.', 'COMBAT.'
        $content = $content -replace 'NavigationConfig\.', 'NAVIGATION.'
        
        Set-Content $path $content -NoNewline
        Write-Host "Updated $file"
    }
}
