# Mission System

**Status**: Phase 0 Complete (Scaffolding)  
**Version**: 0.1.0

## Overview

The Mission System provides structured objectives for players to pursue. Missions are server-authoritative, session-based (Phase 0), and designed to be extensible for future features like rewards, persistence, and dynamic generation.

---

## Current Implementation (Phase 0)

### Design Philosophy
Phase 0 focuses on **structural scaffolding** rather than content. The goal is to establish a clean, extensible architecture that can support future mission features without requiring major refactoring.

### Constraints
- ❌ No rewards (gold, XP, items)
- ❌ No persistence (missions reset on disconnect)
- ❌ No mission discovery UI (debug keybinds only)
- ❌ No mission chains or dependencies
- ❌ One mission per player at a time

### Mission Types

#### 1. Sail to Harbor
**Objective**: Navigate to a specific harbor  
**Success**: Player enters target harbor  
**Failure**: Player becomes raft  
**Reward**: Granted immediately upon docking at target harbor  
**Keybind**: `1`

#### 2. Stay in Area
**Objective**: Remain in designated area for duration  
**Success**: Stay inside area for 10 seconds  
**Failure**: Player becomes raft  
**Visual**: Golden dashed circle  
**Keybind**: `2`

#### 3. Defeat NPCs
**Objective**: Sink a number of NPC ships  
**Success**: Defeat 3 NPCs (pirates or traders)  
**Failure**: Player becomes raft  
**Tracking**: Event-based (NPC defeat hooks)  
**Keybind**: `3`

#### 4. Escort Trader
**Objective**: Protect NPC trader to destination  
**Success**: NPC reaches harbor safely  
**Failure**: NPC destroyed, player too far (800px), or player becomes raft  
**Visual**: Green circle (max distance) + line to NPC + distance  
**Keybind**: `4`

---

## Architecture

### Core Classes

**Mission** (Base Class)
- State machine: `INACTIVE` → `ACTIVE` → `SUCCESS`/`FAILED`
- Lifecycle hooks: `onStart()`, `onUpdate()`, `onSuccess()`, `onFail()`
- Serialization for client display

**MissionManager**
- Manages mission lifecycle and assignment
- One mission per player (Phase 0 limitation)
- Event routing (e.g., `onNPCDefeated()`)
- Auto-cleanup after 3 seconds

### Integration Points
- **World.js**: MissionManager initialization and update loop
- **NPCShip.js**: NPC defeat event hooks, ARRIVED intent
- **server.js**: Debug mission handlers with smart target selection
- **client.js**: Keybinds (1-4) for mission testing
- **game.js**: Mission UI display and visual indicators

### NPC State Machine Enhancement
Added `ARRIVED` intent to NPC state machine:
- NPCs set `intent = 'ARRIVED'` when reaching destination
- 0.5 second delay before despawn (mission detection window)
- Cleaner than checking `WAIT` or `STOPPED` states
- Future-proof for other waiting behaviors

---

## Planned Phases

### Phase 1: Rewards & Basic UI
**Goal**: Make missions rewarding and discoverable

**Features**:
- Mission rewards (gold, XP)
- Mission acceptance UI (harbor-based)
- Mission log/tracker UI
- Mission completion notifications
- Basic mission variety (different harbors, NPC counts, etc.)

**Constraints**:
- Still session-based (no persistence)
- Still one mission at a time
- No mission chains

### Phase 2: Persistence & Progression
**Goal**: Missions persist across sessions

**Features**:
- Database integration (mission state, progress, history)
- Mission history/journal
- Reputation/faction system foundation
- Daily/weekly mission rotation
- Mission cooldowns

**Constraints**:
- Still one mission at a time
- No dynamic generation

### Phase 3: Advanced Features
**Goal**: Rich, dynamic mission ecosystem

**Features**:
- Mission chains (multi-step missions)
- Dynamic mission generation
- Faction-specific missions
- Co-op missions (shared objectives)
- Mission difficulty scaling
- Multiple simultaneous missions
- Time-limited missions
- Rare/legendary missions

---

## Mission Design Guidelines

### Success Criteria
- **Clear**: Player knows exactly what to do
- **Achievable**: Reasonable difficulty for target audience
- **Testable**: Can be verified programmatically
- **Unambiguous**: No edge cases or unclear states

### Failure Conditions
- **Fair**: Player understands why they failed
- **Recoverable**: Failure doesn't permanently block progress
- **Consistent**: Same conditions always produce same result

### Visual Feedback
- **Immediate**: Player sees mission state changes instantly
- **Persistent**: Mission UI always visible when active
- **Contextual**: Visual indicators show relevant information (distance, progress, etc.)

---

## Technical Debt & Future Improvements

### Phase 0 Limitations
1. **No land avoidance**: Stay in Area missions may spawn on land
2. **No mission variety**: Fixed parameters (10s duration, 3 NPCs, etc.)
3. **No difficulty scaling**: All missions same difficulty
4. **No contextual missions**: Missions don't adapt to player state/location

### Planned Refactoring
1. **Mission Templates**: Separate mission logic from parameters
2. **Mission Generator**: Procedural mission creation
3. **Mission Validator**: Check mission feasibility before assignment
4. **Mission Events**: Pub/sub system for mission triggers

---

## Testing

### Debug Keybinds (Phase 0)
- **1**: Sail to Harbor (next closest)
- **2**: Stay in Area (random nearby, 10s)
- **3**: Defeat 3 NPCs
- **4**: Escort Trader (spawns NPC)

### Testing Checklist
- [ ] Mission assignment (one at a time)
- [ ] Mission success conditions
- [ ] Mission failure conditions
- [ ] Mission cleanup (auto-clear after 3s)
- [ ] Visual indicators (circles, lines, progress)
- [ ] NPC defeat tracking
- [ ] Escort mission timing (ARRIVED intent)

---

## See Also
- [NPC Ships](NPCs.md) - NPC behavior and combat
- [Harbors](HARBORS.md) - Harbor system
- [Design Document](DESIGN.md) - Overall game design
