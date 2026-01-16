# World of Pirates 🏴‍☠️

A multiplayer naval combat game built with Node.js and Socket.IO. Command your fleet, engage in tactical broadside battles, and navigate treacherous waters in this real-time pirate adventure.

## 🎮 Features

- **Real-time Multiplayer** - Up to 20 simultaneous players with player names
- **Dynamic Wind System** - Tactical sailing with realistic wind mechanics
- **Fleet Management** - Command multiple ships with different classes and capabilities
- **Naval Combat** - Broadside cannon battles with physics-based projectiles
- **10 Ship Classes** - From humble rafts to mighty War Galleons
- **NPC Ships** - AI-controlled traders and pirates with intelligent navigation and combat
- **Authentic Caribbean Map** - 141 historic harbors on a 80,000x42,000 world map
- **Visual Adapter Layer** - Organic rounded coastlines and shallow water transitions
- **Harbor System** - Repair ships, switch flagships, and manage your fleet
- **Invulnerability Shields** - Strategic protection when switching ships or leaving harbor

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm
- **Git LFS** (Required for map assets)

### Installation

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

## 🏗️ Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Real-time Communication**: Socket.IO (WebSocket)
- **Game Architecture**: Server-authoritative, 60 tick/s game loop
- **Visuals**: Custom "Visual Adapter" for organic terrain rendering

## 📊 Server Capacity

- **Max Players**: 20 concurrent players
- **Tick Rate**: 60 updates per second
- **World Size**: 3230x1702 tiles (80,750x42,525 px) based on real Caribbean geography
- **Harbors**: 141 named locations with historical accuracy

## 🛠️ Project Structure

```
WorldOfPirates/
├── src/
│   ├── server/
│   │   ├── server.js              # Main server & Socket.IO setup
│   │   └── game/
│   │       ├── GameLoop.js        # Core game loop (60 tick/s)
│   │       ├── World.js           # World state & entity management
│   │       ├── WorldMap.js        # Tile-based map logic
│   │       ├── HarborRegistry.js  # Harbor data management
│   │       └── ...
│   └── public/
│       ├── assets/                # Game assets (map, images)
│       └── js/
│           ├── visual_adapter.js  # Client-side visual enhancement layer
│           └── game.js            # Main client render loop
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

## 🎨 Ship Classes

| Class | Speed | Health | Cannons | Description |
|-------|-------|--------|---------|-------------|
| Raft | 75 | ∞ | 0 | Invulnerable fallback when all ships are lost |
| Sloop | 120 | 100 | 2 | Fast, maneuverable starter ship |
| Pinnace | 110 | 150 | 3 | Balanced combat vessel |
| Barque | 100 | 200 | 4 | Sturdy merchant-warrior |
| Fluyt | 90 | 220 | 4 | Cargo-focused design |
| Merchant | 95 | 250 | 4 | Trading vessel with decent firepower |
| Frigate | 105 | 300 | 6 | Powerful warship |
| Fast Galleon | 100 | 350 | 7 | Speed and firepower combined |
| Spanish Galleon | 85 | 400 | 8 | Heavy combat vessel |
| War Galleon | 80 | 500 | 10 | Ultimate warship |

## 🔧 Development

### Running in Development Mode

```bash
npm run dev
```

Uses `nodemon` for automatic server restarts on file changes.

### Debug Features

- **NPC Spawning**: Press `N` for traders, `P` for pirates
- **Harbor Teleportation**: Press `T` to teleport to any harbor
- **Debug Minimap**: Real-time terrain visualization
- **Performance Monitoring**: Server tick time tracking in console

### Map Processing

The world map is generated from high-resolution satellite data. Tools in `tools/` handle:
- Resizing (Lanczos3 high-quality downscaling)
- Coordinate transformation (teleporting 141 harbors to new positions)
- Mask generation (Water/Land/Shallow classification)

## 🤝 Contributing

This is currently a personal project. Documentation and contribution guidelines coming soon!

## 🎯 Current Status

**Active Development**
- ✅ Core Gameplay Loop (Sailing, Combat, Harbors)
- ✅ Massive Caribbean Map (3230×1702 tiles, fully navigable)
- ✅ Visual Layer (Rounded coastlines, shallow gradients)
- ✅ NPC System (AI traders and pirates with combat/navigation)
- ✅ Player Identity (Names, kill attribution, game events)
- 🚧 Next: Economy System & Persistent Player Data

---

*Set sail, raise the black flag, and dominate the seven seas! ⚓*
