# Features Overview

This document tracks the current implementation status and planned features for World of Pirates.

---

## ✅ Implemented Features

### Core Gameplay
- [x] **Real-time Multiplayer** - Socket.IO-based networking with 60 tick/s server
- [x] **Ship Movement** - WASD controls with 3 sail states (Stop, Half, Full)
- [x] **Broadside Combat** - Left (Q) and Right (E) independent cannon firing
- [x] **Fleet System** - Players command multiple ships
- [x] **Flagship Switching** - Automatic switch when flagship sinks
- [x] **Raft Fallback** - Invulnerable raft when all ships are lost

### Ship Classes
- [x] **10 Ship Classes** - Raft, Sloop, Pinnace, Barque, Fluyt, Merchant, Frigate, Fast Galleon, Spanish Galleon, War Galleon
- [x] **Unique Stats** - Each class has distinct speed, health, turn rate, and cannons
- [x] **Fleet Speed Penalty** - Additional ships reduce overall speed (5% per ship)

### World & Environment
- [x] **Procedural Islands** - 7 randomly generated islands per world
- [x] **Dynamic Wind System** - Wind changes direction/strength every 30-60 seconds
- [x] **Wind Effects** - Tailwind bonus, headwind penalty, crosswind neutral
- [x] **Water Depth** - Shallow water around islands reduces speed by 25%
- [x] **Island Collision** - Collision damage based on impact speed

### Harbor System
- [x] **Harbor Docking** - Enter harbors with F key when in range
- [x] **Ship Repair** - Repair flagship to full health while docked
- [x] **Raft Upgrade** - Receive free Sloop when entering harbor on a raft
- [x] **Harbor Exit Shield** - 10-second invulnerability when leaving harbor

### Combat Mechanics
- [x] **Projectile Physics** - Realistic arc with gravity and lifetime (2 seconds)
- [x] **Dual Cannons** - Each broadside fires 2 cannonballs with spread
- [x] **Fire Rate** - 3-second cooldown per broadside
- [x] **Damage System** - 10 damage per cannonball hit
- [x] **Flagship Switch Shield** - 3-second invulnerability when switching ships
- [x] **Shield Visual Indicator** - Shield icon and distinct color for invulnerable ships

### UI/UX
- [x] **HUD Display** - Shows health, speed, sail state, ship class
- [x] **Fleet Info** - Display fleet size and navigation skill
- [x] **Harbor UI** - Overlay showing fleet and repair options
- [x] **Reload Indicators** - Visual feedback for cannon reload times
- [x] **Water Depth Indicator** - Shows when in shallow water

### Server & Performance
- [x] **Player Cap** - 20 concurrent players maximum
- [x] **Performance Monitoring** - Real-time tick time tracking
- [x] **Server Full Handling** - Graceful rejection when at capacity
- [x] **60 Tick Rate** - Smooth server-authoritative gameplay

### Code Quality
- [x] **Centralized Config** - GameConfig, CombatConfig, PhysicsConfig modules
- [x] **No Magic Numbers** - All constants defined in config files
- [x] **Modular Architecture** - Separated concerns (World, Player, Ship, etc.)

---

## 🚧 In Progress

Currently no features in active development.

---

## 📋 Planned Features

### High Priority

#### Player Identity & Social
- [ ] **Player Names** - Display names above ships
- [ ] **Kill Feed** - Show combat events (X sank Y's ship)
- [ ] **Player List** - See all connected players
- [ ] **Score/Stats** - Track kills, deaths, ships sunk

#### Core Gameplay Improvements
- [ ] **Minimap** - Small map showing islands, harbors, and nearby players
- [ ] **Spawn System** - Better spawn locations (away from combat)
- [ ] **Ship Acquisition** - Define how players get new ships
- [ ] **Progression System** - Economy, unlocks, or session-based progression

#### UI/UX Enhancements
- [ ] **Main Menu** - Start screen with game info
- [ ] **Death Screen** - Show what happened when ship sinks
- [ ] **Settings Menu** - Control sensitivity, graphics options
- [ ] **Tutorial** - First-time player guidance

### Medium Priority

#### Multiplayer Features
- [ ] **Teams/Clans** - Cooperative gameplay
- [ ] **Chat System** - Text communication between players
- [ ] **Friend System** - Play with specific people
- [ ] **Spectator Mode** - Watch ongoing battles

#### Gameplay Expansion
- [ ] **Multiple Game Modes** - Team deathmatch, capture the flag, etc.
- [ ] **AI Ships** - NPC merchants or enemies
- [ ] **Treasure System** - Collectibles or objectives
- [ ] **Boarding Mechanics** - Close-quarters ship capture

#### World Features
- [ ] **Larger World** - More islands, bigger play area
- [ ] **Multiple Maps** - Different island configurations
- [ ] **Weather Effects** - Storms, fog affecting visibility/gameplay
- [ ] **Day/Night Cycle** - Visual variety and tactical opportunities

#### Polish
- [ ] **Sound Effects** - Cannon fire, wind, waves, impacts
- [ ] **Music** - Background music and combat themes
- [ ] **Visual Effects** - Explosions, splashes, smoke
- [ ] **Ship Customization** - Flags, colors, cosmetics

### Low Priority / Future Ideas

#### Advanced Features
- [ ] **Replay System** - Record and watch battles
- [ ] **Leaderboards** - Global rankings
- [ ] **Achievements** - Unlock challenges
- [ ] **Port Economy** - Trading system between harbors
- [ ] **Crew Management** - Hire crew for bonuses
- [ ] **Ship Upgrades** - Customize cannons, sails, hull

#### Technical Improvements
- [ ] **Spatial Partitioning** - Optimize collision detection
- [ ] **Delta Updates** - Send only changed data to clients
- [ ] **Area of Interest** - Only send nearby player data
- [ ] **Database Integration** - Persistent player data
- [ ] **Authentication** - User accounts and login
- [ ] **Anti-cheat** - Prevent exploits and hacks

#### Platform Expansion
- [ ] **Mobile Support** - Touch controls for phones/tablets
- [ ] **Dedicated Servers** - Host multiple game instances
- [ ] **Server Browser** - Choose which server to join
- [ ] **Private Servers** - Host your own games

---

## 💡 Ideas (Unconfirmed)

These are brainstormed ideas that need design validation:

- **Resource Management** - Ammunition, food, crew morale
- **Port Ownership** - Capture and control harbors
- **Faction System** - Join pirate factions with unique bonuses
- **Quest System** - PvE objectives and missions
- **Ship Building** - Craft ships from resources
- **Permadeath Mode** - Hardcore mode with permanent ship loss
- **Battle Royale** - Shrinking play area, last fleet standing
- **Seasonal Events** - Limited-time game modes or rewards

---

## ❌ Rejected Features

Features we've decided NOT to implement (and why):

> [!NOTE]
> **User Input Needed**: Are there any features you've explicitly decided against?
> 
> Examples:
> - First-person view (doesn't fit top-down design)
> - Pay-to-win mechanics (against design philosophy)
> - Complex crafting (too much scope)

---

## 📊 Feature Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Player Names | High | Low | **Do First** |
| Minimap | High | Medium | **Do First** |
| Ship Acquisition System | High | High | **Plan Carefully** |
| Kill Feed | Medium | Low | **Quick Win** |
| Sound Effects | Medium | Medium | **Schedule** |
| Weather Effects | Low | High | **Later** |

---

## 🎯 Roadmap (Tentative)

### Version 0.2 (Next Release)
- Player names and identification
- Kill feed / combat log
- Improved spawn system
- Main menu

### Version 0.3
- Minimap
- Ship acquisition system
- Basic progression/economy
- Teams/clans

### Version 0.4
- Multiple game modes
- Sound effects and music
- Visual effects polish
- Chat system

### Version 1.0 (Full Release)
- All core features complete
- Balanced gameplay
- Polished UI/UX
- Stable multiplayer

---

*This document should be updated regularly as features are implemented, planned, or rejected.*
