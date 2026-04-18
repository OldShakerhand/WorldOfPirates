# Game Design Document

## Purpose

This document defines the core vision, design pillars, and gameplay mechanics for World of Pirates. It serves as the authoritative source for design decisions and helps maintain consistency across features. Use this document to understand the "why" behind gameplay choices and to evaluate new feature proposals against established design goals.

## Key Concepts

- **Tactical Depth Over Twitch Skills**: Combat rewards positioning, timing, and prediction rather than reflexes
- **Wind-Based Tactics**: Dynamic wind system creates strategic decision points every 30-60 seconds
- **Fleet Management**: Players command multiple ships with risk/reward trade-offs
- **Forgiving Failure**: Raft fallback system prevents total elimination from matches
- **Accessible Yet Deep**: Simple WASD+QE controls with emergent complexity

## Canonical Assumptions

### Core Design Pillars (Immutable)
1. **Tactical Depth Over Twitch Skills** - Never add mechanics that reward pure reflexes over strategy
2. **Meaningful Progression** - Ship upgrades must provide tangible gameplay differences
3. **Accessible Yet Deep** - Controls must remain simple (WASD+QE) while allowing mastery
4. **Dynamic Environment** - Wind and terrain must create tactical opportunities

### Gameplay Invariants
- **Raft Invulnerability**: Players on rafts are always invulnerable (prevents griefing)
- **Harbor Safety**: Harbors are always safe zones (prevents spawn camping)
- **Fleet Speed Penalty**: Additional ships always reduce speed (5% per ship)
- **Broadside Combat**: Cannons always fire perpendicular to ship (Q=port, E=starboard)

---

## 🎯 Vision Statement

**World of Pirates** is a tactical multiplayer naval combat game that emphasizes strategic positioning, fleet management, and skillful maneuvering over twitch reflexes. Players command fleets of historically-inspired sailing vessels, engaging in broadside battles while navigating dynamic wind conditions and treacherous waters.

### Core Experience
*"The thrill of outsmarting opponents through superior positioning and timing, where every broadside fired and every tack into the wind matters."*

---

## 🎮 Design Pillars

### 1. **Tactical Depth Over Twitch Skills**
- Combat rewards positioning, timing, and prediction
- Wind mechanics create strategic decision points
- Fleet composition matters more than raw reflexes

### 2. **Meaningful Progression**
- Ship upgrades provide tangible gameplay differences
- Fleet management creates risk/reward decisions
- Losing ships has consequences, but never ends the game

### 3. **Accessible Yet Deep**
- Simple controls (WASD + QE)
- Easy to learn, difficult to master
- Immediate fun, long-term depth

### 4. **Dynamic Environment**
- Changing wind conditions force adaptation
- Island terrain creates tactical opportunities
- No two battles play out the same way

---

## 🌊 Core Gameplay Loop

### Moment-to-Moment (30 seconds)
1. **Navigate** - Adjust sails and heading based on wind
2. **Position** - Maneuver to get broadside shots while avoiding enemy fire
3. **Engage** - Time cannon volleys for maximum impact
4. **React** - Dodge incoming fire, manage damage

### Short-Term (5-10 minutes)
1. **Hunt** - Find and engage enemy players
2. **Combat** - Tactical ship-to-ship battles
3. **Survive** - Manage health, retreat when necessary
4. **Harbor** - Repair and regroup at safe zones

### Long-Term (Session Goals)
> [!NOTE]
> **User Input Needed**: Define long-term progression goals
> - Economy system? (Gold, resources, upgrades)
> - Persistent progression? (Unlock ships, skills)
> - Territory control? (Capture islands/harbors)
> - Leaderboards? (Kill/death ratio, fleet value)

---

## 🎨 Core Mechanics

### Ship Physics & Movement

**Sail States** (See: [`Player.js`](file:///c:/Development/WorldOfPirates/src/server/game/entities/Player.js))
- **Stop** (0 sails) - Gradual deceleration, maximum maneuverability
- **Half Sails** - 50% max speed, balanced speed/control
- **Full Sails** - 100% max speed, reduced turning

**Wind System** (See: [`Wind.js`](file:///c:/Development/WorldOfPirates/src/server/game/entities/Wind.js))
- Wind direction changes every 30-60 seconds
- **Tailwind** (sailing with wind) - Speed bonus
- **Headwind** (sailing against wind) - Speed penalty
- **Crosswind** - Neutral speed
- Creates tactical positioning opportunities

**Water Depth** (See: [`GameConfig.js`](file:///c:/Development/WorldOfPirates/src/server/game/config/GameConfig.js))
- **Deep Water** - Full speed, normal acceleration
- **Shallow Water** - 25% speed reduction, faster deceleration
- **Islands** - Collision damage based on impact speed

### Combat System

**Broadside Cannons** (See: [`GameLoop.js:fireCannons`](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js))
- Left (Q) and Right (E) broadsides fire independently
- Cannon count varies by ship class (2-10 per side)
- 4-second reload time per side
- Projectiles have physics (gravity, distance-based range)
- No velocity compensation: broadsides fire at fixed perpendicular angles for the arcade combat model

**Damage Model** (See: [`GameConfig.js`](file:///c:/Development/WorldOfPirates/src/server/game/config/GameConfig.js))
- **Cannonball Hit**: 5 damage
- **Island Collision**: Scales with impact speed (threshold: 20 speed)
- **Ship Health**: Varies by class (100-500 HP)

**Fleet Mechanics** (See: [`Player.js`](file:///c:/Development/WorldOfPirates/src/server/game/entities/Player.js))
- Players command a fleet of ships
- Active ship is the "flagship"
- When flagship sinks:
  - Switch to next ship in fleet
  - Gain 10-second invulnerability shield
- Lose all ships → Respawn on invulnerable raft
- Fleet size affects overall speed (5% penalty per additional ship)

### NPC Combat System

**NPC Ships** (See: [`NPCShip.js`](file:///c:/Development/WorldOfPirates/src/server/game/npc/NPCShip.js))
- AI-controlled ships now serve both gameplay and world-illusion purposes
- Multiple NPC roles with distinct behaviors:
  - **Trader**: Peaceful merchants (Merchant/Fluyt ships)
  - **Pirate**: Raiders and hostile traffic variants
  - **Patrol**: Defensive guards (Frigate ships)

**NPC Behavior** (See: [`NPCBehavior.js`](file:///c:/Development/WorldOfPirates/src/server/game/npc/NPCBehavior.js))
- **Intent System**: NPCs use tactical decision-making
  - TRAVEL: Follow routes between destinations
  - ENGAGE: Fight and maneuver for combat
  - EVADE: Flee when heavily damaged
  - WAIT: Pause briefly on arrival
- **Detection Range**: NPCs detect players/enemies within configurable radius
- **Combat Overlay**: Aggressive NPCs actively hunt players

**Living World Traffic** (See: [`StrategicTrafficManager.js`](file:///c:/Development/WorldOfPirates/src/server/game/traffic/StrategicTrafficManager.js), [`NPCMaterializer.js`](file:///c:/Development/WorldOfPirates/src/server/game/traffic/NPCMaterializer.js))
- **Strategic Layer**: A lightweight off-screen ship pool moves between harbors using route progress only
- **Tactical Layer**: Ships near players materialize into full `NPCShip` entities and enter the normal movement/combat simulation
- **Local Traffic Layer**: Short-lived ambient ships keep the sea feeling active even when strategic traffic is sparse
- **Region Profiles**: Nearby harbors influence ship class, pirate frequency, and name flavor
- **Debug Controls**: N (spawn Trader), P (spawn Pirate)

**Design Philosophy**:
- NPCs provide PvE content for solo/learning players
- Create dynamic world activity even with low player counts
- Offer practice targets for combat mechanics
- Add unpredictability to naval encounters
- Prioritize the illusion of a busy sea over perfect global simulation accuracy

### NPC Traffic Principles

The living-world traffic system follows these rules:

1. **Player Relevance First**
   Ships should be fully simulated only when players can meaningfully notice or interact with them.

2. **Believability Over Precision**
   Off-screen traffic can use approximation as long as near-player behavior feels natural.

3. **Density Matters**
   A player should usually have something happening nearby, even if some of that activity is a local illusion layer.

4. **No Relevance Vanish**
   Ships should not disappear while they are clearly relevant to the player, especially during combat or close observation.

5. **Regional Flavor**
   Different waters should feel different through ship classes, pirate presence, and naming style before any deep economy systems exist.

### Harbor System

**Safe Zones** (See: [`Harbor.js`](file:///c:/Development/WorldOfPirates/src/server/game/world/Harbor.js))
- Harbors located at each island
- Enter harbor (F key) when in range
- While docked:
  - Ship is stationary and safe
  - Can repair flagship to full health
  - Rafts automatically receive a free Sloop

**Harbor Exit Shield**
- 10-second invulnerability when leaving harbor
- Prevents spawn camping
- Visual indicator (shield icon + distinct color)

---

## 🚢 Ship Progression

### Ship Classes (8 Total)

Ships follow a progression from fast/weak to slow/powerful:

| Tier | Ship | Cannons/Side | Max Speed | Health | Cost | Role |
|------|------|--------------|-----------|--------|------|------|
| 0 | **Raft** | 0 | 14 kn | 50 | 0 | Fallback - Invulnerable, no weapons |
| 1 | **Sloop** | 2 | 9.2 kn | 100 | 500 | Starter - Fast, fragile, light firepower |
| 2 | **Barque** | 3 | 8.7 kn | 150 | 1,000 | Light Combat - Narrow hull, decent firepower |
| 3 | **Fluyt** | 4 | 7.7 kn | 200 | 1,500 | Merchant - Balanced for trading |
| 4 | **Merchant** | 5 | 7.2 kn | 250 | 2,000 | Trade/Combat - Versatile |
| 5 | **Frigate** | 6 | 8.4 kn | 300 | 3,000 | Warship - Strong combat vessel |
| 6 | **Spanish Galleon** | 8 | 6.4 kn | 400 | 5,000 | Heavy Combat - Tanky with heavy guns |
| 7 | **War Galleon** | 12 | 5.4 kn | 500 | 8,000 | Ultimate - Maximum firepower, slow |

**Design Notes**:
- Removed Pinnace and Fast Galleon for clearer progression
- Logical size scaling: Sloop (92px) → War Galleon (180px)
- Speed vs firepower trade-off maintained throughout progression

See: [`ShipClass.js`](file:///c:/Development/WorldOfPirates/src/server/game/entities/ShipClass.js) and [`SHIPS.md`](../assets/SHIPS.md) for detailed stats.

> [!IMPORTANT]
> **Design Question**: How do players acquire new ships?
> - Purchase with earned currency?
> - Capture from defeated enemies?
> - Unlock through progression?
> - Find at harbors?

---

## 🎯 Target Audience

### Primary Audience
- **Age**: 16-75
- **Gaming Experience**: Casual to core gamers
- **Preferences**: Strategy, tactics, PvP combat
- **Time Commitment**: 15-60 minute sessions

### Similar Games (Inspiration)
- **Sea of Thieves** - Sailing mechanics, naval combat
- **Naval Action** - Realistic sailing physics
- **Sid Meier's Pirates!** - Fleet management, progression
- **Agar.io / Diep.io** - Accessible multiplayer, simple controls

---

## 🌍 World Design

### Current Implementation
- **World Size**: 80,750×42,525 pixels (3,230×1,701 tiles @ 25px each, 50% scale)
- **World Map**: Tile-based map of Gulf of Mexico and Caribbean (replaces procedural generation)
- **Terrain**: Land, shallow water, and deep water tiles loaded from `world_map.json`
- **Harbors**: 141 historical Caribbean harbors loaded from `harbors.json`
- **Spawn System**: Random spawn near Nassau (Bahamas area)
- **Sea Activity**: Hybrid living-world traffic with strategic routes, tactical materialization, and local ambient traffic
- **Regional Waters**: Harbor regions influence ship type selection, pirate ratios, and ship names

### Future Considerations

> [!NOTE]
> **User Input Needed**: Define world expansion plans
> - Larger world with more islands?
> - Multiple regions with different themes?
> - Persistent world vs instanced matches?
> - Day/night cycle?
> - Weather effects (storms, fog)?

---

## 🎨 Visual Style

> [!NOTE]
> **User Input Needed**: Define art direction
> - Realistic vs stylized?
> - Color palette?
> - UI/UX aesthetic?
> - Ship visual designs?

### Current Implementation
- HTML5 Canvas rendering (See: [`game.js`](file:///c:/Development/WorldOfPirates/src/public/js/game.js))
- Top-down perspective
- Sprite-based ship rendering with rotation
- Color-coded elements (health, shields, water depth)

---

## 🔊 Audio Design

> [!NOTE]
> **User Input Needed**: Define audio vision
> - Cannon fire sounds?
> - Ambient ocean/wind sounds?
> - Music (orchestral, sea shanties)?
> - UI feedback sounds?

---

## 📊 Progression & Economy

> [!IMPORTANT]
> **Critical Design Decision Needed**
> 
> How should progression work?
> 
> **Option A: Session-Based (Like Agar.io)**
> - Start each session with a Sloop
> - Earn ships by defeating enemies
> - No persistent progression
> - Pure skill-based gameplay
> 
> **Option B: Persistent Progression**
> - Earn currency through gameplay
> - Purchase/unlock ships permanently
> - Persistent fleet across sessions
> - Risk/reward of losing ships
> 
> **Option C: Hybrid**
> - Persistent unlocks (ship classes available)
> - Session-based fleet building
> - Earn ships during match, keep unlocks

---

## 🎮 Game Modes

### Current: Free-for-All
- All players compete against each other
- Last ship standing wins (if implementing rounds)
- Continuous respawn on raft

### Future Possibilities

> [!NOTE]
> **User Input Needed**: What game modes fit the vision?
> - **Team Deathmatch** - Coordinated fleet battles
> - **Capture the Flag** - Naval objective gameplay
> - **King of the Hill** - Control strategic points
> - **Convoy Escort** - Protect/attack merchant convoys
> - **Battle Royale** - Shrinking play area, last fleet standing

---

## 🎯 Success Metrics

> [!NOTE]
> **User Input Needed**: What defines success for this game?
> - Player retention (daily/weekly active users)?
> - Average session length?
> - Player satisfaction (fun factor)?
> - Community growth?
> - Monetization (if applicable)?

---

## 🚀 Future Features (Brainstorm)

### High Priority
- [x] Player names/identification ✅
- [x] NPC enemy ships ✅
- [x] Living world traffic kernel ✅
- [ ] Kill feed / combat log
- [ ] Minimap
- [ ] Ship acquisition system
- [ ] Progression/economy
- [ ] Traffic-driven encounters
- [ ] Convoy gameplay

### Medium Priority
- [ ] Team/clan system
- [ ] Chat system
- [ ] Spectator mode
- [ ] Replay system
- [ ] Customization (flags, colors)
- [ ] Region-specific mission chains

### Low Priority / Ideas
- [ ] Treasure hunting
- [ ] Port trading economy
- [ ] Ship customization (cannons, sails, hull)
- [ ] Weather effects
- [ ] Multiple regions/maps
- [ ] Boarding mechanics
- [ ] Crew management

---

## 📝 Design Notes

### What Makes This Game Unique?

1. **Wind-Based Tactics** - Not just "point and shoot"
2. **Fleet Management** - Multiple ships create strategic depth
3. **Forgiving Failure** - Raft system prevents total elimination
4. **Accessible Controls** - Easy to learn, hard to master

### Design Challenges

- **Balancing** ship classes for fair but distinct gameplay
- **Preventing** spawn camping and griefing
- **Maintaining** 60 FPS server performance with 20 players
- **Creating** meaningful progression without pay-to-win
- **Turning ambient traffic into gameplay** without losing the lightweight simulation model
- **Keeping the sea populated** without obvious fake spawning or immersion-breaking despawns

## 🚧 Recommended Next Step

### Traffic-Driven Encounters

The best next feature is to turn living-world traffic into gameplay instead of stopping at ambience.

**Why this is next**
- The traffic kernel is now good enough to make the world feel active
- Players need stronger reasons to care about the ships they encounter
- This builds directly on existing systems instead of requiring a new foundation

**Goal**
Make some world traffic matter through escort, interception, and piracy-oriented encounters.

### Phase 1: Interesting Traffic
- Mark some strategic ships or local groups as notable encounters
- Give them simple tags such as `CONVOY`, `VALUABLE_TARGET`, or `UNDER_THREAT`
- Keep this server-side and lightweight

### Phase 2: Convoy Bundles
- Spawn small traffic groups rather than only single ships
- Use one lead trader with 1-2 nearby escorts
- Allow pirate traffic or mission pirates to pressure those routes

### Phase 3: Traffic-Based Missions
- Reuse live world traffic for missions instead of fully isolated scripted spawns
- Example mission types:
  - Escort a convoy through dangerous waters
  - Intercept a pirate raider before it reaches a lane
  - Hunt a high-value merchant on a known route

### Design Constraint For The Next Step
- Do not require full economy or persistence yet
- Do not require cargo UI yet
- Keep the reward loop simple: gold, XP, and mission success states
- Preserve the current lightweight illusion model

---

*This document is a living guide. Update it as the vision evolves and design decisions are made.*
