# Game Design Document

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

**Sail States**
- **Stop** (0 sails) - Gradual deceleration, maximum maneuverability
- **Half Sails** - 50% max speed, balanced speed/control
- **Full Sails** - 100% max speed, reduced turning

**Wind System**
- Wind direction changes every 30-60 seconds
- **Tailwind** (sailing with wind) - Speed bonus
- **Headwind** (sailing against wind) - Speed penalty
- **Crosswind** - Neutral speed
- Creates tactical positioning opportunities

**Water Depth**
- **Deep Water** - Full speed, normal acceleration
- **Shallow Water** - 25% speed reduction, faster deceleration
- **Islands** - Collision damage based on impact speed

### Combat System

**Broadside Cannons**
- Left (Q) and Right (E) broadsides fire independently
- Each broadside fires 2 cannonballs with slight spread
- 3-second reload time per side
- Projectiles have realistic arc physics (gravity, lifetime)

**Damage Model**
- **Cannonball Hit**: 10 damage
- **Island Collision**: Scales with impact speed (threshold: 20 speed)
- **Ship Health**: Varies by class (100-500 HP)

**Fleet Mechanics**
- Players command a fleet of ships
- Active ship is the "flagship"
- When flagship sinks:
  - Switch to next ship in fleet
  - Gain 3-second invulnerability shield
- Lose all ships → Respawn on invulnerable raft
- Fleet size affects overall speed (5% penalty per additional ship)

### Harbor System

**Safe Zones**
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

### Ship Classes (10 Total)

Ships follow a progression from fast/weak to slow/powerful:

| Tier | Ship | Role | Trade-off |
|------|------|------|-----------|
| 0 | **Raft** | Fallback | Invulnerable, no weapons, slow |
| 1 | **Sloop** | Starter | Fast, fragile, light firepower |
| 2 | **Pinnace** | Light Combat | Balanced stats |
| 3 | **Barque** | Versatile | Sturdy with decent firepower |
| 4 | **Fluyt** | Merchant* | Cargo-focused (future feature) |
| 5 | **Merchant** | Trade/Combat* | Balanced for trading |
| 6 | **Frigate** | Warship | Strong combat vessel |
| 7 | **Fast Galleon** | Heavy Combat | Speed + firepower |
| 8 | **Spanish Galleon** | Heavy Combat | Tanky with heavy guns |
| 9 | **War Galleon** | Ultimate | Maximum firepower, slow |

> [!IMPORTANT]
> **Design Question**: How do players acquire new ships?
> - Purchase with earned currency?
> - Capture from defeated enemies?
> - Unlock through progression?
> - Find at harbors?

---

## 🎯 Target Audience

### Primary Audience
- **Age**: 16-35
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
- **World Size**: 2000×2000 units
- **Islands**: 7 procedurally generated islands
- **Harbors**: 1 per island (7 total)
- **Spawn System**: Random spawn in designated area

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
- HTML5 Canvas rendering
- Top-down perspective
- Simple geometric shapes for ships
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
- [ ] Player names/identification
- [ ] Kill feed / combat log
- [ ] Minimap
- [ ] Ship acquisition system
- [ ] Progression/economy

### Medium Priority
- [ ] Team/clan system
- [ ] Chat system
- [ ] Spectator mode
- [ ] Replay system
- [ ] Customization (flags, colors)

### Low Priority / Ideas
- [ ] AI-controlled merchant ships
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

---

*This document is a living guide. Update it as the vision evolves and design decisions are made.*
