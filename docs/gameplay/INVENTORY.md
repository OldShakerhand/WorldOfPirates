# Inventory & Cargo System

## Overview

The cargo system manages goods storage across your fleet. Cargo is stored at the **fleet level**, not per-ship, making it simple to manage while providing strategic depth through capacity planning.

## Fleet-Based Cargo Model

### Core Principle

**Cargo belongs to the fleet, not individual ships.**

- Total capacity = sum of all ships' cargo holds
- Goods are stored in a shared fleet inventory
- Flagship switching does NOT affect cargo or capacity
- Ship losses reduce total capacity (but cargo remains)

### Why Fleet-Based?

This design choice provides several benefits:
- **Simplicity**: One inventory to manage
- **Flexibility**: Switch flagships without moving cargo
- **Strategic**: Fleet composition affects trading capacity
- **Scalable**: Easy to extend with future features

## Cargo Capacity

### Ship Cargo Holds

Each ship class has a defined cargo hold capacity:

| Ship Class | Cargo Hold | Notes |
|------------|------------|-------|
| **Raft** | 0 | No cargo capacity |
| **Sloop** | 20 | Small trader |
| **Barque** | 40 | Medium trader |
| **Fluyt** | 80 | Dedicated cargo ship |
| **Merchant** | 120 | Large trader |
| **Frigate** | 60 | Combat-focused |
| **Spanish Galleon** | 100 | Balanced |
| **War Galleon** | 80 | Combat-focused |

### Capacity Calculation

```
Total Capacity = Ship1.cargoHold + Ship2.cargoHold + ... + ShipN.cargoHold
```

**Example Fleet**:
- Fluyt (flagship): 80
- Sloop: 20
- Barque: 40
- **Total Capacity**: 140

### Space Usage

Each good has a **space cost** (see [ECONOMY.md](ECONOMY.md)):
- Most goods: 1 space per unit
- Iron: 2 spaces per unit
- Mission cargo: 5 spaces per unit

**Example**:
- 10 Wood = 10 spaces
- 5 Iron = 10 spaces
- 20 Rum = 20 spaces
- **Total Used**: 40 spaces

## Cargo Management

### Adding Goods

Goods are added when:
- Buying from harbors
- Looting from defeated NPCs (future)
- Mission rewards (future)

**Validation**:
- ✅ Must have sufficient available space
- ✅ Transaction is atomic (all-or-nothing)

### Removing Goods

Goods are removed when:
- Selling at harbors
- Using consumables (future)
- Mission deliveries (future)

**Validation**:
- ✅ Must own the goods
- ✅ Transaction is atomic

### Viewing Cargo

Your cargo is displayed:
- **In Harbor UI**: Full cargo list with quantities
- **Capacity Bar**: `Used/Total (Available)`

**Example Display**:
```
Your Cargo:
  Wood: 10
  Rum: 5
  Sugar: 3

Capacity: 18/140 (122 available)
```

## Cargo Overflow

### What Happens When Capacity Drops?

If your fleet loses ships (e.g., sinking in combat), total capacity may drop below used space.

**Phase 0 Behavior**:
- Overflow is **allowed temporarily**
- You **cannot add new cargo** until space is freed
- No speed penalties (yet)

**Example**:
1. Fleet capacity: 140, Cargo: 100
2. Ship sinks, new capacity: 100
3. Cargo still: 100 (at capacity)
4. Cannot buy more goods until you sell some

### Future Overflow Mechanics

Planned for future phases:
- Speed penalties for over-capacity
- Forced cargo drops in emergencies
- Cargo insurance systems

## Flagship Switching

### Cargo Persistence

**Switching flagships does NOT affect cargo:**
- Cargo remains in fleet inventory
- Total capacity stays the same (all ships contribute)
- No cargo transfer needed

**Example**:
1. Flagship: Fluyt (80), Fleet: Sloop (20), Barque (40)
2. Total capacity: 140
3. Switch flagship to Sloop
4. Total capacity: Still 140 (all ships still in fleet)

## Strategic Considerations

### Fleet Composition

Choose ships based on your playstyle:

**Trading Focus**:
- Fluyt + Merchant = 200 capacity
- Maximize cargo for long trade routes

**Balanced**:
- Spanish Galleon + Frigate = 160 capacity
- Good cargo with combat capability

**Combat Focus**:
- War Galleon + Frigate = 140 capacity
- Less cargo, more firepower

### Trade Route Planning

Consider capacity when planning routes:
- **Short routes**: Smaller capacity OK
- **Long routes**: Need large capacity for bulk trading
- **Rare goods**: High value, low volume (less capacity needed)

## Technical Details

### Implementation

**File**: `src/server/game/entities/FleetCargo.js`

**Key Methods**:
- `getTotalCapacity()`: Sum of all ships' cargo holds
- `getUsedSpace()`: Total space used by goods
- `getAvailableSpace()`: Capacity - Used
- `canFit(goodId, quantity)`: Check if goods fit
- `addGood(goodId, quantity)`: Add goods to cargo
- `removeGood(goodId, quantity)`: Remove goods from cargo

### Data Structure

```javascript
{
  goods: {
    'wood': 10,
    'rum': 5,
    'sugar': 3
  },
  total: 140,
  used: 18,
  available: 122
}
```

## Future Features

### Phase 1+
- **Per-Ship Distribution**: Assign goods to specific ships
- **Weight System**: Weight vs. volume mechanics
- **Cargo Transfer**: Move goods between ships
- **Perishable Goods**: Time-sensitive cargo
- **Cargo Insurance**: Protect against losses
- **Smuggling Compartments**: Hidden cargo space
- **Cargo Missions**: Delivery contracts

## Tips

- **Upgrade strategically**: Fluyt and Merchant have the best cargo capacity
- **Don't overload**: Leave some space for opportunistic trading
- **Plan for losses**: Keep capacity buffer in case ships sink
- **Specialize**: Dedicated trading fleets vs. combat fleets
