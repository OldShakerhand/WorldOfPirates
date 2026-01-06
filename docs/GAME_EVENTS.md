# Game Events

## Overview

**Game events** are semantic gameplay facts that describe what happened in the game world.

**UI messages** (ChatMessages, city hall logs, etc.) are presentations of those events.

**CRITICAL:** This is NOT an event system architecture. Events are simple JavaScript objects that clarify semantics. Do not introduce event buses, observers, or architectural layers.

---

## Ship Destruction Events

### ship_sunk (Tactical Event)

**Semantic Meaning:** A vessel was destroyed in combat

**When Emitted:** Any time a ship is destroyed (including flagships)

**Event Structure:**
```javascript
{
  type: 'ship_sunk',
  timestamp: number,
  victimId: string,
  victimName: string,
  shipClass: string,      // e.g., "Frigate", "Sloop"
  killerId: string | null,
  killerName: string | null
}
```

**UI Presentation (ChatMessage):**
- With killer: `☠️ {killerName} sank {victimName}'s {shipClass}`
- Without killer: (no message, or environmental cause)

**Player State After:**
- If player has other ships: switches to next available ship
- If last ship: triggers `player_rafted` event

**Key Point:** Ship switching is a state transition, NOT a ship_sunk event

---

### player_rafted (Strategic Event)

**Semantic Meaning:** Player lost their last active ship and is now adrift

**When Emitted:** Player's last ship is destroyed

**Event Structure:**
```javascript
{
  type: 'player_rafted',
  timestamp: number,
  playerId: string,
  playerName: string,
  isRecoverable: true  // Always true - emphasizes NOT elimination
}
```

**UI Presentation (ChatMessage):**
- `🌊 {playerName} is adrift on a raft (reach harbor to recover)`

**Player State After:**
- `isRaft = true`
- `fleet = []`
- `speed = 0`
- Player remains in `world.entities` (NOT removed)

**Recovery Path:** Sail to any harbor to receive a new Sloop

---

## Design Contracts

### RAFTED_STATE_NOT_DEATH

**CRITICAL:** `player_rafted` is NOT equivalent to death or elimination.

**Gameplay Intent:**
- Players are never permanently removed from the game
- Rafted state is a recoverable setback
- Encourages strategic retreat and harbor recovery
- Maintains player agency and engagement

**Implementation Rules:**
- Rafted players remain in world
- Rafted players can move and interact
- Rafted players cannot fire cannons
- Reaching harbor while rafted grants a new Sloop

**Why This Matters:**
- Prevents player frustration from permanent elimination
- Maintains server population
- Encourages risk/reward decision-making
- Aligns with Sid Meier's Pirates! design philosophy

---

### EVENTS_NOT_ARCHITECTURE

**CRITICAL:** Game events are data objects, NOT an event system.

**What This Means:**
- Events are plain JavaScript objects `{ type, timestamp, ...data }`
- No event buses, no observers, no pub/sub
- No architectural layers or frameworks
- Events exist to clarify semantics, not to enable decoupling

**Why:**
- Server-authoritative architecture already handles state
- Adding event systems would over-engineer a simple game
- Events are just "what happened" before "how to display it"

**DO NOT:**
- ❌ Create EventEmitter classes
- ❌ Add event queues or buses
- ❌ Introduce observer patterns
- ❌ Add event persistence or replay (at this stage)

**DO:**
- ✅ Create simple event objects
- ✅ Derive UI messages from events
- ✅ Keep events local to the method that creates them
- ✅ Log events for debugging if needed

---

## Event Lifecycle

**Events are ephemeral by design.**

They exist momentarily to express what happened in gameplay terms before being interpreted by UI systems (chat, logs, news).

**Current Implementation:**
- Events are created as plain JavaScript objects
- UI messages (ChatMessages) are immediately derived from them
- Events are not stored, queued, or persisted at this stage

**Future Flexibility:**
- Events CAN be stored or logged if needed later
- Events CAN be called upon for analytics, replay, or persistence
- The event structure is designed to support this without architectural changes

**Key Point:** Events are not *required* to be persistent, but they *can* be if gameplay or features demand it. The design doesn't preclude future use.

---

## Event vs Message Flow

```
Gameplay Action (ship destroyed)
    ↓
Create Event Object (ship_sunk)
    ↓
Derive ChatMessage from Event
    ↓
Emit ChatMessage to clients
    ↓
Client renders in UI

(Optional future: Store event to DB/log)
```

**Key Insight:** Events clarify "what happened" in gameplay terms. UI systems interpret and present them. Storage is optional and can be added later without changing this flow.

---

## Future Considerations

**City Hall / Event Log:**
- When implemented, will subscribe to ChatMessages (not events directly)
- May filter by distance or relevance
- Still server-authoritative, no client-side filtering

**Persistence:**
- If added later, would log events to database
- Still no event bus or architectural changes
- Just "save event object to DB" at point of creation

**DO NOT over-engineer in anticipation of these features.**
