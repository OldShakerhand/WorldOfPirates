# World of Pirates 🏴‍☠️

A multiplayer naval combat game built with Node.js and Socket.IO. Command your fleet, engage in tactical broadside battles, and navigate treacherous waters in this real-time pirate adventure.

## 🎮 Features

- **Real-time Multiplayer** - Up to 20 simultaneous players
- **Dynamic Wind System** - Tactical sailing with realistic wind mechanics
- **Fleet Management** - Command multiple ships with different classes and capabilities
- **Naval Combat** - Broadside cannon battles with physics-based projectiles
- **10 Ship Classes** - From humble rafts to mighty War Galleons
- **Harbor System** - Repair ships and manage your fleet
- **Invulnerability Shields** - Strategic protection when switching ships or leaving harbor
- **Island Navigation** - Procedurally generated islands with shallow water zones

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd WorldOfPirates

# Install dependencies
npm install

# Start the development server
npm run dev
```

The game will be available at `http://localhost:3000`

## 🎯 Controls

| Key | Action |
|-----|--------|
| **W** | Increase sails (Stop → Half → Full) |
| **S** | Decrease sails (Full → Half → Stop) |
| **A** | Turn left |
| **D** | Turn right |
| **Q** | Fire left broadside |
| **E** | Fire right broadside |
| **F** | Enter harbor (when near) |

## 🏗️ Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Real-time Communication**: Socket.IO (WebSocket)
- **Game Loop**: 60 tick/second server-authoritative architecture

## 📊 Server Capacity

- **Max Players**: 20 concurrent players
- **Tick Rate**: 60 updates per second
- **Performance Monitoring**: Real-time tick time tracking
- **World Size**: 2000×2000 units with 7 procedurally generated islands

## 🛠️ Project Structure

```
WorldOfPirates/
├── src/
│   ├── server/
│   │   ├── server.js              # Main server & Socket.IO setup
│   │   └── game/
│   │       ├── GameLoop.js        # Core game loop (60 tick/s)
│   │       ├── World.js           # World state & entity management
│   │       ├── Player.js          # Player entity & fleet management
│   │       ├── Ship.js            # Ship instances
│   │       ├── ShipClass.js       # Ship class definitions
│   │       ├── Projectile.js      # Cannonball physics
│   │       ├── Wind.js            # Dynamic wind system
│   │       ├── Island.js          # Island generation & collision
│   │       ├── Harbor.js          # Harbor system
│   │       ├── GameConfig.js      # World & game constants
│   │       ├── CombatConfig.js    # Combat balancing
│   │       └── PhysicsConfig.js   # Movement & physics
│   └── public/
│       ├── index.html             # Game UI
│       ├── style.css              # Styling
│       └── js/
│           ├── client.js          # Client-side networking
│           └── game.js            # Client-side rendering
├── docs/                          # Documentation
└── package.json
```

## 📖 Documentation

- [Game Design](docs/GAME_DESIGN.md) - Vision, gameplay concepts, and design pillars
- [Features](docs/FEATURES.md) - Current vs planned features
- [Technical Documentation](docs/TECHNICAL.md) - Architecture and technical decisions

## 🎨 Ship Classes

| Class | Speed | Health | Cannons | Description |
|-------|-------|--------|---------|-------------|
| Raft | 75 | ∞ | 0 | Invulnerable fallback when all ships are lost |
| Sloop | 120 | 100 | 2 | Fast, maneuverable starter ship |
| Pinnace | 110 | 150 | 3 | Balanced combat vessel |
| Barque | 100 | 200 | 4 | Sturdy merchant-warrior |
| Fluyt | 90 | 220 | 3 | Cargo-focused design |
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

### Performance Monitoring

The server logs performance metrics every 10 seconds:
```
[Performance] Avg tick: 0.11ms | Max: 1.00ms | Players: 5 | Projectiles: 12
```

Warnings appear when average tick time exceeds the 60 FPS target (16.67ms).

## 🌊 Gameplay Mechanics

### Wind System
- Wind direction and strength change every 30-60 seconds
- Sailing with the wind provides speed bonuses
- Sailing against the wind reduces speed
- Tactical positioning is key to combat advantage

### Combat
- **Broadside Cannons**: Fire 2 projectiles per side with slight spread
- **Fire Rate**: 3 seconds between volleys
- **Damage**: 10 HP per cannonball hit
- **Collision Damage**: Ramming islands at high speed damages your ship

### Fleet Management
- Start with a Sloop (or receive one at first harbor if on a raft)
- Manage multiple ships in your fleet
- When your flagship sinks, switch to another ship with a 3-second shield
- Lose all ships? You respawn on an invulnerable raft

### Harbors
- Repair your flagship to full health
- Receive a free Sloop if you arrive on a raft
- Gain a 10-second invulnerability shield when leaving harbor

## 📝 License

ISC

## 🤝 Contributing

This is currently a personal project. Documentation and contribution guidelines coming soon!

## 🎯 Current Status

**Alpha Development** - Core mechanics implemented, actively adding features and balancing gameplay.

---

*Set sail, raise the black flag, and dominate the seven seas! ⚓*
