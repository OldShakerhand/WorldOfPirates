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
- [x] **Ship Repair** - Repair flagship to full health while docked
- [x] **Raft Upgrade** - Receive free Sloop when entering harbor on a raft
- [x] **Flagship Switching in Harbor** - Change flagship while docked
- [x] **Harbor Exit Shield** - 10-second invulnerability when leaving harbor

### Combat Mechanics
- [x] **Arcade Cannon Firing** - Projectiles fire exactly perpendicular to ship heading (no velocity compensation)
- [x] **Dynamic Gravity** - Gravity auto-calculated to ensure projectiles reach water at max distance
- [x] **Distance-Based Projectiles** - 250px range with parabolic arc physics
- [x] **Variable Cannons** - 2-10 cannons per side based on ship class
- [x] **Cannon Clustering** - Cannons concentrated at midship (40% spread factor)
- [x] **Per-Side Positioning** - Independent port/starboard cannon placement
- [x] **Sector-Based Detection** - Precise ±45° broadside sectors
- [x] **Fire Rate** - 4-second cooldown per broadside
- [x] **Damage System** - 10 HP per cannonball hit
- [x] **Rotated Rectangular Hitboxes** - Accurate collision detection matching ship sprite dimensions
- [x] **Flagship Switch Shield** - 10-second invulnerability when switching ships
- [x] **Harbor Exit Shield** - 10-second invulnerability when leaving harbor
- [x] **Shield Visual Indicator** - Shield icon and distinct color for invulnerable ships
- [x] **Ship Wrecks** - Wrecks spawn when ships sink, containing lootable gold and cargo
- [x] **Wreck Looting** - Press F to loot nearby wrecks (150px range)
- [x] **Owner Loot Lock** - 30-second exclusive loot period for the killer
- [x] **Combat Rewards** - XP rewards for sinking enemy ships (gold from wreck loot)

### UI/UX
- [x] **HUD Display** - Shows health, speed, sail state, ship class
- [x] **Fleet Info** - Display fleet size and navigation skill
- [x] **Harbor UI** - Overlay showing fleet, repair, and flagship switching options
- [x] **Reload Indicators** - Visual feedback for cannon reload times
- [x] **Water Depth Indicator** - Shows when in shallow water
- [x] **Kill Feed** - System chat displaying ship destruction events with ship class
- [x] **Player Rafted Messages** - Emphasizes recoverability (not death/elimination)
- [x] **Ship Switching Messages** - Informational messages when switching flagships
- [x] **Debug Minimap** - 304×160px terrain visualization with player/harbor markers
- [x] **Zoomable Minimap** - Three zoom levels (0x, 5x, 10x) toggled with M key
- [x] **Loot Notifications** - On-screen notifications showing collected loot with fade-out effect
- [x] **Progression Display** - Shows gold, level, and XP in HUD
- [x] **Player Names** - Display names above ships (entered on game start)
- [x] **Controls Legend** - On-screen guide showing all keybinds

### Progression System
- [x] **Player Levels** - Level up by gaining XP from combat and missions
- [x] **Experience Points** - Earned from sinking ships and completing missions
- [x] **Gold Currency** - Earned from wreck loot and mission rewards
- [x] **Ship Upgrades** - Purchase better ships with gold (level-gated)
- [x] **Level Requirements** - Ships require minimum level to purchase
- [x] **Combat Rewards** - XP and gold rewards for sinking enemy ships

### Economy & Trading
- [x] **Harbor Trading** - Buy and sell goods at harbors
- [x] **Trade Goods** - Multiple goods with varying prices per harbor
- [x] **Cargo System** - Ship-based cargo holds with capacity limits
- [x] **Dynamic Pricing** - Goods have different buy/sell prices
- [x] **Trade Tiers** - Export (cheap) and Import (expensive) goods per harbor
- [x] **Fleet Cargo** - Cargo distributed across entire fleet

### Mission System
- [x] **Mission Framework** - Accept, track, and complete missions
- [x] **Mission Types** - Sail to harbor, stay in area, defeat NPCs, escort missions
- [x] **Mission UI** - On-screen mission tracker with objectives and status
- [x] **Mission Rewards** - Gold and XP rewards on completion
- [x] **Debug Mission Spawning** - Keyboard shortcuts (1-4) to test missions

### NPC Ships
- [x] **NPC Spawning** - Spawn merchant and pirate NPCs for testing
- [x] **NPC Navigation** - Basic AI movement and pathfinding
- [x] **NPC Combat** - Pirates attack players, merchants flee
- [x] **NPC Behaviors** - Wander, patrol, evade, and attack intents
- [x] **NPC Health** - NPCs can be damaged and sunk
- [x] **NPC Rewards** - Sinking NPCs grants XP and loot

### Audio System
- [x] **Sound Manager** - Client-side audio system with spatial audio
- [x] **Cannon Fire Sounds** - Positional audio for port/starboard cannons
- [x] **Sail Sounds** - Deploy and remove sail audio feedback
- [x] **Impact Sounds** - Wood impact and water splash sounds
- [x] **Ambient Sounds** - Wind and wave ambient audio
- [x] **Mute Toggle** - U key to toggle all sounds on/off

### Visual Effects
- [x] **Wake Effects** - Ship wakes based on speed and movement
- [x] **Splash Effects** - Water splashes for missed cannon shots
- [x] **Projectile Shadows** - 3D effect for cannonballs in flight

### Chat & Social
- [x] **Global Chat** - Player-to-player text messaging
- [x] **Chat Input** - Enter to open, type message, Enter to send, Escape to cancel
- [x] **System Messages** - Join, leave, rafted, and ship sunk notifications
- [x] **Chat Logging** - Console logging for all chat messages (Render.com compatible)
- [x] **Spam Protection** - 1 message per second rate limit per player
- [x] **Message Validation** - Max 200 characters, trimmed, non-empty
- [x] **Visual Distinction** - Different styling for player vs system messages

### Moderation
- [x] **IP Tracking** - Log player IP addresses on connection and join
- [x] **IP-Based Banning** - Ban players by IP address
- [x] **Ban Detection** - Automatic rejection of banned IPs on connection
- [x] **Proxy Support** - Correct IP detection behind Render.com reverse proxy

### Server & Performance
- [x] **Player Cap** - 20 concurrent players maximum
- [x] **Performance Monitoring** - Real-time tick time tracking
- [x] **Server Full Handling** - Graceful rejection when at capacity
- [x] **60 Tick Rate** - Smooth server-authoritative gameplay

### Code Quality
- [x] **Centralized Config** - GameConfig, CombatConfig, PhysicsConfig modules
- [x] **No Magic Numbers** - All constants defined in config files
- [x] **Modular Architecture** - Separated concerns (World, Player, Ship, etc.)
- [x] **Design Contracts** - Documented gameplay semantics and physics models
- [x] **Technical Debt Documentation** - TODO/FIXME comments for future refactoring

### Debug Tools
- [x] **Debug Minimap** - Real-time terrain visualization with aspect ratio correction
- [x] **Harbor Teleportation** - Instant travel to any harbor for testing (Shift+H)
- [x] **Tilemap Visualization** - Render terrain types on main canvas
- [x] **Coordinate Display** - Show player X/Y position
- [x] **Collision Debug Logging** - Detailed collision event tracking (disabled by default)
- [x] **Performance Monitoring** - Server tick time tracking and reporting

---

## 🚧 In Progress

Currently no features in active development.

---

## 📋 Planned Features

### High Priority

#### Player Identity & Social
- [x] **Player Names** - Display names above ships (entered on game start)
- [x] **Kill Attribution** - Server tracks damage sources for accurate kill credit
- [x] **Game Events System** - Semantic events (ship_sunk, player_rafted) separate from UI messages
- [x] **Global Chat** - Text communication between all players
- [ ] **Player List** - See all connected players
- [ ] **Score/Stats Dashboard** - Persistent leaderboard and player statistics

#### Core Gameplay Improvements
- [ ] **Better Spawn System** - Spawn away from combat, near safe harbors
- [ ] **Persistent Player Data** - Database integration for saving progress
- [ ] **Authentication System** - User accounts and login

### Medium Priority

#### Multiplayer Features
- [ ] **Team Chat** - Private chat channels for teams
- [ ] **Local Chat** - Proximity-based chat for nearby players
- [ ] **Teams/Clans** - Cooperative gameplay with in-game recognition
- [ ] **Friend System** - Mark specific players as friends for easier coordination

#### Gameplay Expansion
- [ ] **Faction System** - 4 nations (like original Pirates!), harbors/ships belong to factions
- [ ] **Boarding Mechanics** - Capture enemy ships without sinking them
- [ ] **Fencing Mini-Game** - Optional enhancement for boarding (low priority)
- [ ] **Advanced AI** - More sophisticated NPC behaviors and strategies
- [ ] **Treasure System** - Collectibles or objectives
- [ ] **Quest Chains** - Multi-step missions with story progression

#### World Features
- [ ] **Weather Effects** - Storms, fog affecting visibility/gameplay
- [ ] **Map Expansion** - Extend to full Atlantic/Pacific if needed

#### Polish
- [x] **Sound Effects** - Cannon fire, wind, waves, impacts
- [x] **Visual Effects** - Wake trails, water splashes, projectile shadows
- [ ] **Music** - Background music and combat themes
- [ ] **Explosion Effects** - Dramatic ship destruction visuals
- [ ] **Ship Customization** - Flags, colors, cosmetics

### Low Priority / Future Ideas

#### UI/UX Enhancements
- [ ] **Main Menu** - Start screen with game info
- [ ] **Death Screen** - Show what happened when ship sinks
- [ ] **Settings Menu** - Control sensitivity, graphics options
- [ ] **Tutorial** - First-time player guidance

#### Advanced Features
- [ ] **Leaderboards** - Global rankings
- [ ] **Achievements** - Unlock challenges
- [ ] **Port Economy** - Trading system between harbors
- [ ] **Crew Management** - Hire crew for bonuses
- [ ] **Ship Upgrades** - Upgrade cannons, sails, hull for money

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

## 🎮 Extended Game-Loop Vision

This section outlines the planned extended gameplay loop beyond core combat mechanics. These features will transform the game from a combat sandbox into a full pirate adventure experience.

### 1. Player Persistence & Authentication

**Goal:** Ensure player progress is saved and restored across sessions.

**Required Systems:**
- [ ] **Database Integration** - PostgreSQL or MongoDB for player data storage
- [ ] **Authentication System** - User accounts with login/registration
- [ ] **Session Management** - JWT tokens or similar for secure sessions

**Persistent Data:**
- Player account (username, password hash, email)
- Owned ships (fleet composition, ship classes)
- Fleet size and capacity
- Ship upgrades (cannons, sails, hull, etc.)
- Inventory (cargo, resources, quest items)
- Skill points and player level
- Last known position (spawn location on login) - **Benefits from non-procedural map first**
- Last known status (at sea, in harbor) - **Benefits from non-procedural map first**
- Discovered harbors and map areas

### 2. Spawn System & Tutorial

**Goal:** Provide a smooth onboarding experience for new players and consistent spawn locations for returning players.

**Features:**
- [ ] **Persistent Spawn Location** - Players spawn where they logged out
- [ ] **New Player Harbor** - Dedicated starting harbor for first-time players
- [ ] **Tutorial System** - Skippable tutorial covering:
  - Basic movement and sailing
  - Combat mechanics (broadside firing)
  - Harbor docking and repair
  - Mission system introduction
- [ ] **Safe Zone** - New player harbor has no PvP combat allowed

### 3. Mission System

Missions provide structured PvE content and progression. Players select missions from harbors.

#### Mission Types:

**a) Pirate Hunting Missions**
- [ ] **Objective:** Sink specific pirate ships or a certain number of pirates
- [ ] **Spawning:** AI pirate ships spawn in designated area near harbor
- [ ] **AI Behavior Required:**
  - Basic ship movement and navigation
  - Aggressive combat behavior (attack player on sight)
  - Flee behavior when heavily damaged
- [ ] **Rewards:** Gold, experience, reputation

**b) Cargo Transport Missions**
- [ ] **Objective:** Transport cargo from one harbor to another
- [ ] **Requirements:**
  - Ship inventory system (cargo hold capacity)
  - Harbor inventory/trading interface
- [ ] **Challenges:**
  - AI ambush ships spawn en route (proximity-based)
  - Player must defend cargo or flee
- [ ] **Rewards:** Gold based on cargo value and distance

**c) Escort Missions**
- [ ] **Objective:** Protect friendly AI vessel traveling to another harbor
- [ ] **AI Behavior Required:**
  - Friendly AI ship navigation (follows route)
  - Distress signals when under attack
  - Enemy AI spawns when player is near friendly vessel
- [ ] **Fail-Safe Mechanics:**
  - Mission timer (must stay near friendly vessel)
  - Friendly vessel takes damage if player too far away
  - Mission fails if friendly vessel sinks OR player abandons (too far for too long)
- [ ] **Rewards:** High gold reward, reputation bonus

**d) Additional Mission Ideas**
- [ ] **Treasure Hunting** - Find and retrieve treasure from specific coordinates
- [ ] **Reconnaissance** - Scout enemy territory and return with intel
- [ ] **Blockade Running** - Deliver supplies through hostile waters
- [ ] **Bounty Hunting** - Hunt specific named pirate captains

### 4. Free Roam & Exploration

**Goal:** Allow players to explore the world freely, discover new locations, and engage in emergent gameplay.

#### World Features:

- [ ] **Larger Non-Procedural Map** - Hand-crafted world with strategic harbor placement
- [ ] **Fog of War System** (Two Levels):
  - **Level 1 (Black):** Completely unexplored areas (never visited)
  - **Level 2 (Grey):** Explored areas showing terrain/harbors but hiding ship traffic
- [ ] **Map Discovery** - Reveal fog of war by sailing through areas
- [ ] **Harbor Discovery** - Find new harbors to unlock fast travel/mission access
- [ ] **Max View Distance** - Ships only visible within certain range (even in explored areas)

#### Emergent Gameplay:

- [ ] **Neutral Merchant AI Ships**
  - Spawn in vicinity of players (performance optimization)
  - Travel between harbors with valuable cargo
  - Non-aggressive behavior (flee when attacked)
  - Attacking merchants affects reputation (pirate vs. privateer)
- [ ] **Dynamic Encounters** - Random events while exploring:
  - Shipwrecks with loot
  - Distress signals from friendly ships
  - Hostile patrol encounters

### 5. Supporting Systems

**Required for Extended Game-Loop:**

#### Chat & Social
- [x] **Global Chat** - All players can see and send messages
- [x] **System Messages** - Join/leave/combat events broadcast to all
- [x] **Chat Logging** - Console logging for moderation
- [x] **Spam Protection** - Rate limiting to prevent abuse
- [ ] **Team/Clan Channel** - Only team members
- [ ] **Local Channel** - Players within certain range
- [ ] **Whisper/Direct Message** - Private 1-on-1 communication
- [ ] **Friend System** - Mark players as friends, see online status
- [ ] **Teams/Clans** - Create/join groups, shared chat, in-game recognition (colors/tags)

#### Faction System
- [ ] **4 Nations** - Inspired by original Pirates! (e.g., England, Spain, France, Netherlands)
- [ ] **Harbor Ownership** - Each harbor belongs to a nation
- [ ] **Ship Nationality** - AI ships belong to nations
- [ ] **Reputation per Nation** - Actions affect standing with each faction
- [ ] **Faction Conflicts** - Nations at war affect mission availability and AI behavior
- [ ] **Letters of Marque** - Official privateer status with a nation

#### Boarding Mechanics
- [ ] **Boarding Initiation** - Close-range interaction to board enemy ship
- [ ] **Crew Strength** - Determines boarding success chance
- [ ] **Ship Capture** - Take control of enemy vessel without sinking
- [ ] **Cargo Plunder** - Steal cargo from boarded ships
- [ ] **Fencing Mini-Game** - Optional enhancement (low priority):
  - Simple timing-based combat
  - Increases boarding success chance
  - Adds skill element to boarding

#### Inventory & Economy
- [ ] **Ship Cargo Hold** - Limited capacity based on ship class
- [ ] **Item Types** - Trade goods, quest items, resources
- [ ] **Harbor Trading** - Buy/sell goods at different prices per harbor
- [ ] **Currency System** - Gold earned from missions and trading

#### AI Ship Behavior
- [ ] **Basic Navigation** - AI ships follow waypoints/routes
- [ ] **Combat AI** - Aggressive (pirates) vs. Defensive (merchants)
- [ ] **Flee Behavior** - AI ships retreat when outmatched
- [ ] **Proximity Spawning** - AI only spawns near players (performance)
- [ ] **Despawn Logic** - AI despawns when far from all players

#### Progression System
- [ ] **Experience Points** - Earned from missions, combat, exploration
- [ ] **Player Levels** - Unlock new ships, upgrades, missions
- [ ] **Skill Points** - Allocate to navigation, combat, trading skills
- [ ] **Reputation System** - Affects mission availability and NPC behavior

#### Ship Upgrades
- [ ] **Upgrade Categories:**
  - Cannons (damage, fire rate, range)
  - Sails (speed, turn rate)
  - Hull (health, armor)
  - Cargo hold (capacity)
- [ ] **Purchase & Installation** - Buy upgrades at harbors with gold
- [ ] **Persistent Upgrades** - Saved to database per ship

### Implementation Priority

**Phase 1: Foundation (Database & Persistence)**
1. [x] **Hand-crafted non-procedural map** (Gulf of Mexico + Caribbean complete)
2. [ ] Database integration
3. [ ] Authentication system
4. [ ] Persistent spawn locations (depends on database)
5. [ ] New player harbor with tutorial

**Phase 2: Core Social & Communication**
1. Chat system (global, team, local channels)
2. Friend system
3. Teams/Clans system

**Phase 3: Basic Missions & AI**
1. Mission framework (accept, track, complete)
2. Basic AI ship behavior
3. Pirate hunting missions
4. Inventory system

**Phase 4: Economy & Trading**
1. Harbor trading
2. Currency system
3. Cargo transport missions
4. Ship upgrades

**Phase 5: Exploration & Discovery**
1. Fog of war system
2. Harbor discovery
3. Merchant AI ships
4. Dynamic encounters

**Phase 6: Advanced Gameplay**
1. Faction system (4 nations)
2. Boarding mechanics
3. Escort missions
4. Progression system (levels, skills, reputation)

**Phase 7: Polish & Expansion**
1. Sound effects and music
2. Visual effects
3. Weather effects
4. Fencing mini-game (boarding enhancement)

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



## 🎯 Roadmap (Aligned with Extended Game-Loop)

### Phase 1: Foundation (Database & Persistence)
**Goal:** Establish persistent world and player data

**Status:** World map complete ✅, persistence systems pending

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Authentication system (login/registration)
- [x] **Hand-crafted non-procedural map** (Gulf of Mexico + Caribbean complete)
- [ ] Persistent spawn locations (spawn where logged out)
- [ ] New player harbor with tutorial

**Next Priority:** Database integration to enable player persistence

### Phase 2: Core Social & Communication
**Goal:** Enable player interaction and coordination

- Chat system (global, team, local channels)
- Friend system (mark and recognize friends)
- Teams/Clans system (cooperative gameplay)

### Phase 3: Basic Missions & AI
**Goal:** Introduce PvE content and progression

- Mission framework (accept, track, complete)
- Basic AI ship behavior (navigation, combat)
- Pirate hunting missions
- Inventory system (cargo holds)

### Phase 4: Economy & Trading
**Goal:** Add economic gameplay loop

- Harbor trading system
- Currency system (gold)
- Cargo transport missions
- Ship upgrades (purchase & installation)

### Phase 5: Exploration & Discovery
**Goal:** Encourage world exploration

- Fog of war system (two levels)
- Harbor discovery
- Merchant AI ships (neutral, flee when attacked)
- Dynamic encounters (shipwrecks, distress signals)

### Phase 6: Advanced Gameplay
**Goal:** Deepen strategic options

- Faction system (4 nations, harbor/ship ownership)
- Boarding mechanics (capture ships)
- Escort missions
- Progression system (levels, skill points, reputation)

### Phase 7: Polish & Expansion
**Goal:** Enhance player experience

- Sound effects and music
- Visual effects (explosions, splashes)
- Weather effects
- Fencing mini-game (boarding enhancement)
- Additional mission types

---

*This document should be updated regularly as features are implemented, planned, or rejected.*
