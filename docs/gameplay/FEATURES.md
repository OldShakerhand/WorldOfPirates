# Features Overview

## Purpose

This document tracks the implementation status of all features in World of Pirates. It serves as a roadmap for development, showing what's complete, in progress, and planned. Use this to understand the current state of the game and prioritize future work.

## Key Concepts

- **Implemented Features**: Fully functional and tested features currently in the game
- **In Progress**: Features actively being developed
- **Planned Features**: Approved features not yet started, organized by priority
- **Feature Priority Matrix**: Impact vs Effort analysis for prioritization
- **Roadmap**: Tentative version-based feature grouping

## Canonical Assumptions

### Feature Status Rules
- **Implemented** (✅): Feature is complete, tested, and in production
- **In Progress** (🚧): Feature is actively being developed
- **Planned** (📋): Feature is approved but not started
- **Rejected** (❌): Feature explicitly decided against

### Code Reference Standards
- All implemented features should reference their primary implementation file
- Breaking changes must be documented in [CHANGELOG](../meta/CHANGELOG.md)
- New features require updates to [DESIGN](DESIGN.md) if they affect core mechanics

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
- [x] **8 Ship Classes** - Raft, Sloop, Barque, Fluyt, Merchant, Frigate, Spanish Galleon, War Galleon
- [x] **Unique Stats** - Each class has distinct speed, health, turn rate, and cannons
- [x] **Sail State Sprites** - Dynamic sprites for no sails, half sails, and full sails
- [x] **Fleet Speed Penalty** - Additional ships reduce overall speed (5% per ship)

### World & Environment
- [x] **Production World Map** - Hand-crafted Gulf of Mexico + Caribbean (3230×1702 tiles)
- [x] **Tilemap System** - Three terrain types (deep water, shallow water, land)
- [x] **Water Depth** - Shallow water around coastlines reduces speed by 25%
- [x] **Island Collision** - Collision damage based on impact speed
- [x] **Dynamic Wind System** - Wind changes direction/strength every 30-60 seconds
- [x] **Wind Effects** - Tailwind bonus, headwind penalty, crosswind neutral

### Harbor System
- [x] **141 Historical Harbors** - Accurate Caribbean/Gulf of Mexico harbor locations
- [x] **Harbor Docking** - Enter harbors with F key when in range (200px)
- [x] **Harbor UI Restructuring** - Modular views for Governor, Shipyard, and Merchant
- [x] **Ship Repair** - Repair flagship to full health while docked
- [x] **Raft Upgrade** - Receive free Sloop when entering harbor on a raft
- [x] **Flagship Switching in Harbor** - Change flagship while docked
- [x] **Harbor Exit Shield** - 10-second invulnerability when leaving harbor

### Combat Mechanics
- [x] **Arcade Cannon Firing** - Projectiles fire exactly perpendicular to ship heading
- [x] **Dynamic Gravity** - Gravity auto-calculated to ensure projectiles reach water at max distance
- [x] **Distance-Based Projectiles** - 250px range with parabolic arc physics
- [x] **Variable Cannons** - 2-10 cannons per side based on ship class
- [x] **Cannon Clustering** - Cannons concentrated at midship
- [x] **Per-Side Positioning** - Independent port/starboard cannon placement
- [x] **Sector-Based Detection** - Precise ±45° broadside sectors
- [x] **Fire Rate** - 4-second cooldown per broadside
- [x] **Damage System** - 10 HP per cannonball hit
- [x] **Rotated Rectangular Hitboxes** - Accurate collision detection
- [x] **Flagship Switch Shield** - 10-second invulnerability when switching ships
- [x] **Shield Visual Indicator** - Shield icon and distinct color for invulnerable ships
- [x] **Ship Wrecks** - Wrecks spawn when ships sink, containing lootable gold and cargo
- [x] **Wreck Looting** - Press F (or Hand button) to loot nearby wrecks
- [x] **Owner Loot Lock** - 30-second exclusive loot period for the killer
- [x] **Combat Rewards** - XP and gold from wrecks

### Mobile Support
- [x] **Touch Controls** - Virtual joystick (steering) and action pad (combat/sails)
- [x] **Mobile Viewport** - `visualViewport` API handling for stable layout on resize
- [x] **Fullscreen Mode** - Toggle button and auto-fullscreen on login
- [x] **Interaction Button** - Context-aware 'Hand' button for looting/docking
- [x] **Mobile Minimap** - Local zoom default and optimized scale (0.6x)
- [x] **Control Icons** - Intuitive emojis for actions (⛵, ⚓, 💥⬅️, ➡️💥)

### UI/UX
- [x] **HUD Display** - Shows health, speed, sail state, ship class
- [x] **Mission UI** - Overlay showing fleet, repair, and flagship switching options
- [x] **Reload Indicators** - Visual feedback for cannon reload times
- [x] **Water Depth Indicator** - Shows when in shallow water
- [x] **Kill Feed** - System chat displaying ship destruction events
- [x] **Player Rafted Messages** - Emphasizes recoverability
- [x] **Debug Minimap** - Terrain visualization with player/harbor markers
- [x] **Zoomable Minimap** - Three zoom levels (Whole, Region, Local)
- [x] **Loot Notifications** - On-screen notifications showing collected loot
- [x] **Progression Display** - Shows gold, level, and XP in HUD
- [x] **Player Names** - Display names above ships
- [x] **Controls Legend** - On-screen guide showing all keybinds

### Progression System
- [x] **Player Levels** - Level up by gaining XP
- [x] **Experience Points** - Earned from sinking ships and completing missions
- [x] **Gold Currency** - Earned from wreck loot and missions
- [x] **Ship Upgrades** - Purchase better ships with gold (level-gated)
- [x] **Level Requirements** - Ships require minimum level to purchase

### Economy & Trading
- [x] **Harbor Trading** - Buy and sell goods at harbors
- [x] **Trade Goods** - Multiple goods with varying prices per harbor
- [x] **Cargo System** - Ship-based cargo holds with capacity limits
- [x] **Dynamic Pricing** - Goods have different buy/sell prices
- [x] **Trade Tiers** - Export (cheap) and Import (expensive) goods
- [x] **Fleet Cargo** - Cargo distributed across entire fleet

### Mission System
- [x] **Mission Framework** - Accept, track, and complete missions
- [x] **Mission Types** - Sail to harbor, stay in area, defeat NPCs, escort missions (Framework)
- [x] **Mission UI** - On-screen mission tracker with objectives
- [x] **Mission Rewards** - Gold and XP based on completion
- [x] **Debug Mission Spawning** - Keyboard shortcuts to test missions

### NPC Ships
- [x] **NPC Spawning** - Spawn merchant and pirate NPCs
- [x] **NPC Navigation** - Basic AI movement and pathfinding
- [x] **NPC Combat** - Pirates attack players, merchants flee
- [x] **NPC Behaviors** - Wander, patrol, evade, and attack intents
- [x] **NPC Health** - NPCs can be damaged and sunk
- [x] **NPC Rewards** - Sinking NPCs grants XP and loot

### Audio & Visuals
- [x] **Sound Manager** - Client-side audio system with spatial audio
- [x] **Cannon Fire Sounds** - Positional audio for port/starboard cannons
- [x] **Ambient Sounds** - Wind and wave ambient audio
- [x] **Visual Effects** - Wake trails based on speed, water splashes
- [x] **Projectile Shadows** - 3D effect for cannonballs in flight

### Chat & Social
- [x] **Global Chat** - Player-to-player text messaging
- [x] **Chat Input** - Enter to open, transparent overlay on mobile
- [x] **Chat Colors** - Player names in Gold (#FFD700)
- [x] **System Messages** - Distinct notifications for game events
- [x] **Chat Logging** - Console logging for moderation
- [x] **Spam Protection** - Rate limiting and message validation
- [x] **Moderation** - IP tracking and banning system

---

## 🚧 In Progress (Phase 2 Focus)

- [ ] **Mission Integration into Harbors** - Populate Governor's Mansion with actual missions
- [ ] **Escort Mission Polish** - Finalize escort mechanics and UI

---

## 🎯 Roadmap

### Phase 0 – Technical Foundation (✅ Completed)
**Goal:** Establish core engine and architecture.
- [x] Node.js/Socket.IO Server setup
- [x] Hand-crafted World Map (Caribbean)
- [x] Entity Component System (ECS) basics
- [x] Basic Physics & Collision
- [x] Deployment Pipeline (Render.com)

### Phase 1 – Playable Game Loop (✅ Completed)
**Goal:** Implement the "Sail -> Fight -> Loot -> Upgrade" loop.
- [x] Ship Combat & Damage
- [x] Harbor System & Docking
- [x] Basic Economy (Trading)
- [x] Progression (XP/Levels/Gold)
- [x] Ship Purchasing

### Phase 2 – Gameplay Polish (Current Focus)
**Goal:** Refine the experience, ensure mobile compatibility, and squash bugs.
- [x] **Mobile Support** (Touch controls, Viewport, Fullscreen)
- [x] **Harbor UI Restructuring** (Governor/Shipyard views)
- [x] **Visual/Sound Improvements** (Wakes, Splashes, Shadows)
- [ ] **Mission Integration** (Governor offering missions)
- [ ] **Escort Mission Redesign** (Better AI/UI)
- [ ] **Chat System Finalization** (already mostly done)

### Phase 3 – Interest Management & NPC Lifecycle
**Goal:** Optimize performance and create a living world illusion.
- [ ] **Spatial Partitioning** (Grid/Quadtree)
- [ ] **Area of Interest (AOI)** (Only send nearby entity updates)
- [ ] **NPC Lifecycle** (Spawn/Despawn based on player proximity)
- [ ] **Delta Compression** (Optimize network bandwidth)

### Phase 4 – Living World
**Goal:** Populate the sea with believable traffic.
- [ ] **NPC Traffic Logic** (Trade routes between harbors)
- [ ] **Faction Patrols** (Nation-specific ships)
- [ ] **Dynamic Encounters** (Shipwrecks, distress signals)
- [ ] **Weather Effects** (Storms affecting visibility/handling)

### Phase 5 – Pirate Core
**Goal:** Deepen the pirate fantasy.
- [ ] **Boarding Mechanics** (Capture ships without sinking)
- [ ] **Crew Management** (Hire crew for bonuses)
- [ ] **Fleet Depth** (More ship classes, formations)
- [ ] **Notoriety System** (Bounty hunters chase high-value pirates)

### Phase 6 – Persistence & Economy
**Goal:** Long-term player retention.
- [ ] **Database Integration** (PostgreSQL/MongoDB)
- [ ] **Authentication** (User accounts)
- [ ] **Persistent Spawn** (Save location/status)
- [ ] **Advanced Economy** (Dynamic supply/demand between harbors)

### Phase 7 – Skills & Progression
**Goal:** RPG elements for captain development.
- [ ] **Skill Trees** (Navigation, Combat, Trading)
- [ ] **Captain Avatars** (Visual customization)
- [ ] **Reputation System** (Standing with nations)
- [ ] **Quest Chains** (Multi-step narrative missions)

### Phase 8 – Multiplayer Cooperation & Social Systems
**Goal:** Community and cooperative play.
- [ ] **Friends System** (Add/Remove, Online Status)
- [ ] **Alliances / Clans** (Group identity, shared tag/colors)
- [ ] **Team Chat** (Private channels)
- [ ] **Cooperative Features** (Shared XP/Gold in close proximity)
- [ ] **Shared Objectives** (Co-op missions)
- [ ] **Group Identity** (Clan flags/hulls)

---

## ❌ Rejected Features
- **First-Person/Bridge View** (Focus is on top-down tactical sailing)
- **Pay-to-Win Microtransactions** (Cosmetic only, if any)
- **Complex manufacturing/crafting** (Focus is on adventure/combat)

---

*This document is a living roadmap. Priorities may shift based on player feedback and technical discoveries.*
