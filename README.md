# World of Pirates 🏴‍☠️

A multiplayer naval combat game built with Node.js and Socket.IO. Command your fleet, engage in tactical broadside battles, trade goods in a dynamic economy, and navigate treacherous waters in this real-time pirate adventure.

## 🎮 Features

- **Real-time Multiplayer** - Highly optimized networking scaling up to 100 simultaneous players
- **Dynamic Wind System** - Tactical sailing with realistic wind mechanics
- **Fleet Management** - Command multiple ships, from nimble Sloops to massive War Galleons
- **Naval Combat** - Broadside cannon battles with physics-based projectiles
- **Trading Economy** - Buy low and sell high across 141 harbors with distinct trade profiles
- **Missions & Looting** - Undertake contracts and scavenge wrecks for profit
- **Progression** - Gain XP, level up skills, and unlock powerful vessels
- **NPC Ships** - AI-controlled traders and pirates with intelligent navigation and combat
- **Authentic Caribbean Map** - 141 historic harbors on a 80,000x42,000 world map
- **Visual Adapter Layer** - Organic rounded coastlines and shallow water transitions

## 🚀 Quick Start

### Play via Browser
**[Play Now](https://worldofpirates.onrender.com)** - No installation required!

### Local Development

#### Prerequisites
- Node.js (v14 or higher)
- npm
- **Git LFS** (Required for map assets)

#### Installation

```bash
# Clone the repository
git clone <repository-url>
cd WorldOfPirates

# Install dependencies
npm install

# Initialize LFS (Important!)
git lfs install
git lfs pull

# Start the development server
npm run dev
```

The game will be available at `http://localhost:3000`

### Test Commands

`npm test` runs the automated unit tests in `test/*.test.js`. These tests do not run automatically when you start the server with `npm start` or `npm run dev`.

## 💰 Economy System

The economy is driven by a server-authoritative **Harbor Master** model. Harbors have unique trade profiles that dictate the prices of goods based on supply and demand.

- **Dynamic Pricing**: Prices vary per harbor. Traders can exploit arbitrage opportunities.
- **Goods**: Tradeable commodities include **Rum**, **Sugar**, **Tobacco**, **Wood**, **Cloth**, and **Food**.
- **Atomic Transactions**: Buying and selling are validated server-side to ensure gold limitations and cargo capacity are respected.
- **Harbor Profiles**: Some harbors are rich in luxury goods like Sugar, while others are industrial hubs for Wood and Cloth.

## 🎯 Controls

### Gameplay
| Key | Action |
|-----|--------|
| **W** | Increase sails (Stop → Half → Full) |
| **S** | Decrease sails (Full → Half → Stop) |
| **A** | Turn left |
| **D** | Turn right |
| **Q** | Fire left broadside |
| **E** | Fire right broadside |
| **H** | Enter harbor (when near) |

### Debug Controls
| Key | Action |
|-----|--------|
| **N** | Spawn NPC Trader nearby |
| **P** | Spawn NPC Pirate nearby |
| **T** | Harbor teleportation menu |

## 🎨 Ship Classes

| Class | Speed | Health | Cannons | Cargo | Description |
|-------|-------|--------|---------|-------|-------------|
| Raft | 140 | 500 | 0 | 0 | Invulnerable fallback when all ships are lost |
| Sloop | 131 | 100 | 2 | 20 | Fast, maneuverable starter ship |
| Barque | 120 | 200 | 3 | 40 | Balanced combat vessel |
| Fluyt | 115 | 250 | 4 | 80 | Cargo-focused design |
| Merchant | 104 | 300 | 5 | 120 | Heavy trading vessel with decent defense |
| Frigate | 112 | 350 | 6 | 60 | Powerful warship |
| Spanish Galleon | 100 | 450 | 8 | 100 | Heavy combat vessel |
| War Galleon | 91 | 600 | 12 | 80 | Ultimate warship |

## 🏗️ Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Real-time Communication**: Socket.IO (WebSocket)
- **Game Architecture**: Server-authoritative, 60 tick/s game loop
- **Visuals**: Custom "Visual Adapter" for organic terrain rendering

## 🛠️ Project Structure

```
WorldOfPirates/
├── src/
│   ├── server/
│   │   ├── server.js              # Main server & Socket.IO setup
│   │   ├── game/                  # Core game logic
│   │   │   ├── economy/           # EconomySystem, TradeRoutes
│   │   │   ├── entities/          # Ship, Player, NpcShip
│   │   │   ├── config/            # Game constants
│   │   │   └── ...
│   ├── public/
│   │   ├── assets/                # Game images and data
│   │   ├── js/
│   │   │   ├── game.js            # Main client loop
│   │   │   ├── visual_adapter.js  # Client visuals
│   │   │   └── ...
├── docs/                          # Documentation
└── tools/                         # Map processing tools
```

## 📖 Documentation

- [Documentation Index](docs/index.md) - **Start Here**
- [Game Design](docs/gameplay/DESIGN.md) - Vision, gameplay concepts, and design pillars
- [Features](docs/gameplay/FEATURES.md) - Current vs planned features
- [Technical Overview](docs/architecture/OVERVIEW.md) - Architecture and technical decisions
- [Coordinate System](docs/architecture/COORDINATE_SYSTEM.md) - Spatial mechanics and physics reference
- [Ship Assets](docs/assets/SHIPS.md) - Asset creation and sprite guidelines
- [Changelog](docs/meta/CHANGELOG.md) - Version history and updates

## 🤝 Contributing

This is currently a personal project. Documentation and contribution guidelines coming soon!

## 🎯 Current Status

**Active Development**
- ✅ Core Gameplay Loop (Sailing, Combat, Harbors)
- ✅ Massive Caribbean Map (3230×1702 tiles, fully navigable)
- ✅ Economy System (Trading, supply/demand, harbor markets)
- ✅ NPC System (AI traders and pirates)
- ✅ Player Identity (Names, stats, persistence)
- ✅ Network & Physics Scaling (Delta Compression, Spatial Hash Grid)
- 🚧 Next Steps:
    - Advanced Skill Leveling
    - Extended Crew & Fleet Management
    - UI Overhaul
    - Deep Persistence (Database integration)

---

*Set sail, raise the black flag, and dominate the seven seas! ⚓*
