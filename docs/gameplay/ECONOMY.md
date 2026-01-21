# Economy System

## Overview

The economy system enables players to buy and sell goods at harbors. All transactions are **server-authoritative** with full validation to ensure fair gameplay.

## Trading Basics

### How to Trade

1. **Dock at a harbor** that supports trading (press `H` when near a harbor)
2. **Open the Trade Goods section** in the harbor UI
3. **Select a quantity** (1-100) for the good you want to trade
4. **Click Buy or Sell** to execute the transaction

### Transaction Validation

All trades are validated server-side:
- ✅ Player must be docked at the harbor
- ✅ Player must have sufficient gold (for buying)
- ✅ Player must have sufficient cargo space (for buying)
- ✅ Player must own the goods (for selling)
- ✅ Harbor must sell/buy the specific good

## Goods

### Available Goods

| Good | Category | Space | Legality | Uses |
|------|----------|-------|----------|------|
| **Wood** | Material | 1 | Legal | Trade, Crafting |
| **Iron** | Material | 2 | Legal | Trade, Crafting |
| **Rum** | Luxury | 1 | Legal | Trade |
| **Sugar** | Luxury | 1 | Legal | Trade |
| **Tobacco** | Luxury | 1 | Legal | Trade |
| **Food** | Food | 1 | Legal | Trade, Consumption |
| **Contraband** | Luxury | 1 | Illegal | Trade |

### Good Properties

- **Space**: Cargo space required per unit
- **Legality**: LEGAL or ILLEGAL (enforcement not yet implemented)
- **Intents**: What can be done with the good (TRADE, USE)

## Trade Profiles

Harbors are grouped into **trade profiles** that define regional pricing:

### COLONIAL_LUXURY
**Harbors**: Havana, Cartagena, Curacao

Major colonial ports trading in luxury goods:
- **Rum**: Buy 12g, Sell 8g
- **Sugar**: Buy 10g, Sell 6g
- **Tobacco**: Buy 15g, Sell 10g
- **Wood**: Buy 5g, Sell 3g

### FRONTIER_MATERIALS
**Harbors**: Belize City, Chetumal

Frontier settlements trading in basic materials:
- **Wood**: Buy 4g, Sell 2g
- **Iron**: Buy 8g, Sell 5g
- **Food**: Buy 6g, Sell 4g

### PIRATE_HAVEN
**Harbors**: Cozumel

Pirate ports trading in contraband and luxury goods:
- **Rum**: Buy 10g, Sell 7g
- **Contraband**: Buy 25g, Sell 20g
- **Tobacco**: Buy 14g, Sell 9g

## Pricing

Prices are **static** in Phase 0:
- **Buy Price**: What you pay to buy from the harbor
- **Sell Price**: What you receive when selling to the harbor
- Buy prices are always higher than sell prices (harbor profit margin)

## Transaction Limits

- **Max quantity per transaction**: 100 units
- **Min quantity**: 1 unit
- Transactions are **atomic** (all-or-nothing)

## Cargo Management

See [INVENTORY.md](INVENTORY.md) for detailed information about the cargo system.

**Quick Summary**:
- Cargo is stored at the **fleet level**
- Total capacity = sum of all ships' cargo holds
- Flagship switching does NOT affect cargo

## Future Features

The following features are planned but not yet implemented:

### Phase 1+
- **Persistence**: Save cargo and gold to database
- **Dynamic Pricing**: Supply and demand mechanics
- **Harbor Inventory**: Limited stock at harbors
- **Delivery Missions**: Transport goods between harbors
- **Smuggling**: Contraband detection and penalties
- **Faction Reputation**: Prices affected by standing
- **Cargo Transfer**: Move goods between ships
- **Weight/Volume**: More complex cargo system
- **Perishable Goods**: Time-sensitive cargo

## Technical Details

### Server Architecture

The economy uses a **"Harbor Master"** pattern:
- `EconomySystem.js`: Validates and executes all transactions
- `HarborRegistry.js`: Resolves harbor trade profiles
- `Player.js`: Owns gold and fleet cargo
- `FleetCargo.js`: Manages cargo capacity and inventory

### Socket Protocol

**Client → Server**:
```javascript
socket.emit('buyGood', { harborId, goodId, quantity });
socket.emit('sellGood', { harborId, goodId, quantity });
```

**Server → Client**:
```javascript
socket.emit('transactionResult', { success, message, ... });
socket.emit('playerStateUpdate', { gold, cargo });
```

## Tips

- **Buy low, sell high**: Different harbors have different prices
- **Watch your cargo space**: Each good takes up space
- **Plan your route**: Trade between harbors with different profiles for profit
- **Upgrade your fleet**: Larger ships = more cargo capacity
