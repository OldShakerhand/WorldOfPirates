# Technical Documentation

## Purpose

This document provides comprehensive technical architecture, design decisions, and implementation details for World of Pirates. It serves as the authoritative reference for system architecture, performance targets, and technical trade-offs. Use this when understanding how the game works internally or when making architectural decisions.

## Key Concepts

- **Server-Authoritative Architecture**: All game logic runs on server, clients only render
- **60 Hz Tick Rate**: Server updates game state 60 times per second
- **Two-Tier State System**: Static map data sent once, dynamic state sent every frame
- **Socket.IO Communication**: WebSocket-based real-time networking
- **Modular Design**: Separated concerns (World, Player, Ship, Projectile, etc.)

## Canonical Assumptions

### Architectural Invariants
- **Server Authority**: Clients NEVER make gameplay decisions, only send inputs
- **Tick Rate**: Server MUST maintain 60 Hz (16.67ms per tick) for smooth gameplay
- **Player Cap**: Maximum 20 concurrent players (hard limit for performance)
- **State Broadcast**: Full game state sent to all clients every tick (no delta updates yet)

### Performance Targets
- **Average Tick Time**: < 10ms (excellent headroom)
- **Maximum Tick Time**: < 16.67ms (60 FPS requirement)
- **Network Latency**: Designed for < 100ms connections
- **Client Frame Rate**: 60 FPS (tied to server tick rate)

### Code Organization Rules
- All constants in config files (GameConfig, CombatConfig, PhysicsConfig)
- No magic numbers in game logic
- Server code in `src/server/`, client code in `src/public/`
- Entity classes (Player, Ship, Projectile) are server-side only

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (Browser)                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ index.html │  │  game.js   │  │ client.js  │            │
│  │  (UI/DOM)  │  │ (Rendering)│  │(Networking)│            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────┬───────────────────────────────────┘
                          │ Socket.IO (WebSocket)
                          │ Map data: once on connect
                          │ Game state: 60 updates/second
┌─────────────────────────▼───────────────────────────────────┐
│                      Server (Node.js)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ server.js  │  │ GameLoop.js│  │  World.js  │            │
│  │(Socket.IO) │  │(60 tick/s) │  │  (State)   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Player.js  │  │  Ship.js   │  │Projectile  │            │
│  │  (Entity)  │  │  (Fleet)   │  │   (Combat) │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

### Server-Authoritative Model

**All game logic runs on the server.** Clients send inputs and receive state updates.

**Why?**
- Prevents cheating (clients can't manipulate game state)
- Ensures consistency (single source of truth)
- Simplifies client code (just render what server sends)

**Trade-off:**
- Requires good network performance
- Input lag on high-latency connections
- Server must handle all computation

---

## 🔧 Tech Stack

### Backend
- **Runtime**: Node.js (v14+)
- **Framework**: Express.js (v5.2.1)
- **Real-time Communication**: Socket.IO (v4.8.3)
- **Database**: SQLite3 (v5.1.7) - *Currently unused, planned for future*
- **Security**: Helmet.js (v8.1.0), bcrypt (v6.0.0)
- **Development**: Nodemon (v3.1.11)

### Frontend
- **Rendering**: HTML5 Canvas (2D context)
- **Language**: Vanilla JavaScript (ES6+)
- **Styling**: CSS3
- **Networking**: Socket.IO Client

### Why These Choices?

| Technology | Reason |
|------------|--------|
| **Node.js** | JavaScript on server/client, event-driven for real-time games |
| **Socket.IO** | Reliable WebSocket abstraction, automatic reconnection, room support |
| **HTML5 Canvas** | Fast 2D rendering, cross-platform, no dependencies |
| **Vanilla JS** | No framework overhead, full control, lightweight |
| **SQLite** | Embedded database for future persistence, zero-config |

---

## 🎮 Game Loop Architecture

### Server Game Loop (60 tick/s)

```javascript
// Simplified flow
setInterval(() => {
    1. Calculate deltaTime
    2. Update all entities (players, projectiles)
    3. Check collisions
    4. Update wind system
    5. Broadcast full game state to all clients
}, 1000 / 60); // 16.67ms per tick
```

**Tick Rate: 60 Hz**
- **Target**: 16.67ms per tick
- **Current Performance**: ~0.1ms average (excellent headroom)
- **Warning Threshold**: >16.67ms (server can't keep up)

### Client Render Loop

```javascript
// Event-driven rendering (triggered by server updates)
socket.on('gamestate_update', (state) => {
    if (mapData) {
        1. Receive dynamic game state from server (60×/second)
        2. Use cached map data (islands, harbors)
        3. Clear canvas
        4. Render islands and shallow water (with world wrapping)
        5. Render harbors (with world wrapping)
        6. Render all ships and projectiles (with world wrapping)
        7. Render UI elements (windrose, speed, fleet info)
    }
});
```

**Rendering Approach: Event-Driven (Server-Synchronized)**
- Client renders when server sends `gamestate_update` (60×/second)
- No `requestAnimationFrame` loop - rendering tied to server tick rate
- Ensures perfect synchronization with game state
- Map data cached once, dynamic state updated every frame

---

## 🌐 Network Architecture

### Two-Tier State System

**Optimization**: Static map data is separated from dynamic game state to reduce bandwidth.

**Static Map Data** (sent once on connection):
```javascript
socket.emit('map_data', {
    width: 80750,
    height: 42525,
    harbors: [...]   // All harbor data (141 harbors)
});
```

**Dynamic Game State** (sent 60 times/second):
```javascript
socket.emit('gamestate_update', {
    players: {
        [id]: { x, y, rotation, health, ... }
    },
    projectiles: [...],
    wind: { direction, strength }
});
```

### Communication Protocol

**Client → Server (Inputs)**
```javascript
socket.emit('input', {
    left: boolean,
    right: boolean,
    sailUp: boolean,
    sailDown: boolean,
    shootLeft: boolean,
    shootRight: boolean
});
```

### Bandwidth Optimization

> [!NOTE]
> **Network Efficiency Improvements**
> 
> By separating static and dynamic data:
> - **Islands/Harbors**: Sent once (not 60×/second)
> - **Bandwidth Savings**: 18-30 KB/second per client
> - **Scalability**: Better support for larger maps
> 
> **Remaining Bottleneck**: Full dynamic state broadcast
> - **Bandwidth**: O(N²) where N = player count
> - 5 players: 25 state updates/second
> - 20 players: 400 state updates/second
> 
> **Future Optimization**: Delta updates (only send changes)

### Event Types

| Event | Direction | Purpose |
|-------|-----------|---------|
| `connection` | Client → Server | New player joins |
| `disconnect` | Client → Server | Player leaves |
| `input` | Client → Server | Player controls |
| `enterHarbor` | Client → Server | Request harbor docking |
| `repairShip` | Client → Server | Request ship repair |
| `closeHarbor` | Client → Server | Leave harbor |
| `switchFlagship` | Client → Server | Change active ship |
| `map_data` | Server → Client | Static map (once on connect) |
| `gamestate_update` | Server → Client | Dynamic game state (60×/s) |
| `harborData` | Server → Client | Harbor UI data |
| `server_full` | Server → Client | Connection rejected |

---

## 📦 Module Structure

### Server Modules

#### Core Systems
- **[server.js](file:///c:/Development/WorldOfPirates/src/server/server.js)** - Express server, Socket.IO setup, player cap enforcement
- **[GameLoop.js](file:///c:/Development/WorldOfPirates/src/server/game/GameLoop.js)** - Main game loop, tick management, performance monitoring
- **[World.js](file:///c:/Development/WorldOfPirates/src/server/game/world/World.js)** - World state, entity management, tilemap integration

#### Entities
- **[Player.js](file:///c:/Development/WorldOfPirates/src/server/game/entities/Player.js)** - Player entity, movement, fleet management, combat
- **[Ship.js](file:///c:/Development/WorldOfPirates/src/server/game/entities/Ship.js)** - Ship instances with health and damage
- **[Projectile.js](file:///c:/Development/WorldOfPirates/src/server/game/entities/Projectile.js)** - Cannonball physics and collision

#### World Elements
- **[WorldMap.js](file:///c:/Development/WorldOfPirates/src/server/game/world/WorldMap.js)** - Tile-based terrain system
- **[HarborRegistry.js](file:///c:/Development/WorldOfPirates/src/server/game/world/HarborRegistry.js)** - Harbor data management
- **[Harbor.js](file:///c:/Development/WorldOfPirates/src/server/game/world/Harbor.js)** - Harbor interaction logic
- **[Wind.js](file:///c:/Development/WorldOfPirates/src/server/game/entities/Wind.js)** - Dynamic wind system

#### Configuration
- **[GameConfig.js](file:///c:/Development/WorldOfPirates/src/server/game/config/GameConfig.js)** - Centralized game configuration (includes Physics, Combat, Navigation)
- **[ShipClass.js](file:///c:/Development/WorldOfPirates/src/server/game/entities/ShipClass.js)** - Ship class definitions and stats

#### Utilities
- **[NavigationSkill.js](file:///c:/Development/WorldOfPirates/src/server/game/progression/NavigationSkill.js)** - Navigation skill system (future feature)

### Client Modules

- **[index.html](file:///c:/Development/WorldOfPirates/src/public/index.html)** - HTML structure, canvas, harbor UI
- **[style.css](file:///c:/Development/WorldOfPirates/src/public/style.css)** - Styling for UI elements
- **[client.js](file:///c:/Development/WorldOfPirates/src/public/js/client.js)** - Socket.IO client, input handling, server communication
- **[game.js](file:///c:/Development/WorldOfPirates/src/public/js/game.js)** - Canvas rendering, visual effects, UI updates

---

## 🎯 Performance Targets

### Server Performance

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Tick Time (Avg) | <10ms | ~0.1ms | ✅ Excellent |
| Tick Time (Max) | <16.67ms | ~1ms | ✅ Excellent |
| Max Players | 20 | 20 | ✅ Implemented |
| Tick Rate | 60 Hz | 60 Hz | ✅ Stable |

### Client Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Frame Rate | 60 FPS | Depends on client hardware |
| Canvas Size | 1024×768 | Configurable in GameConfig |
| Network Latency | <100ms | Depends on connection |

### Scalability Analysis

**Current Bottlenecks:**
1. **Network**: Full state broadcast (O(N²) bandwidth)
2. **Collision Detection**: Naive O(N×M) projectile checks
3. **No Spatial Partitioning**: All entities checked every tick

**Estimated Capacity:**
- **10-15 players**: Smooth performance
- **15-20 players**: Good performance, monitor tick times
- **20+ players**: Performance degradation likely

**When to Optimize:**
- Average tick time consistently >10ms
- Player complaints about lag
- 15+ concurrent players regularly

---

## 🔐 Security Considerations

### Current Implementation

- **Helmet.js**: HTTP security headers
- **bcrypt**: Password hashing (for future authentication)
- **Server-Authoritative**: Clients can't manipulate game state

### Vulnerabilities

> [!CAUTION]
> **Known Security Gaps**
> 
> - **No Authentication**: Anyone can connect
> - **No Rate Limiting**: Input spam possible
> - **No Input Validation**: Malformed data could crash server
> - **No Anti-Cheat**: Modified clients could send invalid inputs
> 
> **Priority**: Low (development phase), High (before public release)

### Future Security

- [ ] User authentication (accounts, login)
- [ ] Input validation and sanitization
- [ ] Rate limiting on socket events
- [ ] Anti-cheat detection (impossible inputs)
- [ ] DDoS protection
- [ ] Encrypted communication (HTTPS/WSS)

---

## 🗄️ Data Models

### Player State

```javascript
{
    id: string,              // Socket ID
    x: number,               // Position X
    y: number,               // Position Y
    rotation: number,        // Radians
    speed: number,           // Current speed
    sailState: 0|1|2,        // Stop, Half, Full
    fleet: Ship[],           // Array of ships
    flagshipIndex: number,   // Active ship
    isRaft: boolean,         // On fallback raft
    shieldEndTime: number,   // Timestamp when shield expires
    inHarbor: boolean,       // Docked status
    // ... more properties
}
```

### Ship Class

```javascript
{
    id: number,              // Unique class ID
    name: string,            // "Sloop", "Frigate", etc.
    maxSpeed: number,        // Maximum speed
    turnSpeed: number,       // Radians per second
    health: number,          // Max health points
    cannonsPerSide: number   // Cannons per broadside
}
```

### World State

```javascript
{
    width: 80750,            // World width (pixels)
    height: 42525,           // World height (pixels)
    entities: {},            // All players (keyed by ID)
    projectiles: [],         // Active cannonballs
    harbors: [],             // Harbor locations (141 total)
    wind: Wind,              // Wind system
    worldMap: WorldMap       // Tile-based terrain
}
```

---

## 🧭 Spatial Mechanics & Physics

For detailed information about coordinate systems, rotation, cannon positioning, and projectile physics, see **[COORDINATE_SYSTEM.md](COORDINATE_SYSTEM.md)**.

This comprehensive reference covers:
- **World coordinate system** and rotation conventions
- **Ship orientation** and movement vectors
- **Cannon positioning system** with per-side control
- **Broadside detection** using sector-based approach
- **Velocity compensation** mechanics and tuning
- **Wind effects** and camera transforms
- **Common pitfalls** and debugging tips

---

## 🧪 Testing & Debugging

### Performance Monitoring

**Server Console Output:**
```
[Performance] Avg tick: 0.11ms | Max: 1.00ms | Players: 5 | Projectiles: 12
```

**Logged Every**: 10 seconds  
**Warning Threshold**: Avg tick >16.67ms

### Debug Tools

**Server Logs:**
- Player connections/disconnections with count
- Flagship switches and raft conversions
- Island collisions with damage
- Harbor interactions

**Client Console:**
- Socket.IO connection status
- Game state updates (if debugging enabled)
- Input events

### Testing Checklist

- [ ] Single player movement and combat
- [ ] Multiplayer with 2-5 players
- [ ] Stress test with 15-20 players
- [ ] Harbor entry/exit and repair
- [ ] Ship sinking and fleet switching
- [ ] Raft fallback and Sloop acquisition
- [ ] Wind changes and effects
- [ ] Island collisions
- [ ] Server full rejection

---

## 🚀 Deployment

### Current Setup (Development)

```bash
npm run dev  # Nodemon auto-restart on file changes
```

**Port**: 3000 (configurable via `PORT` environment variable)

### Production Deployment (Future)

> [!NOTE]
> **Deployment Considerations**
> 
> When deploying to production:
> - Use process manager (PM2, systemd)
> - Set `NODE_ENV=production`
> - Enable HTTPS/WSS
> - Configure firewall (allow port 3000 or custom)
> - Set up logging (winston, pino)
> - Monitor server health
> - Database for persistent data
> - Load balancing for multiple instances

**Recommended Platforms:**
- **VPS**: DigitalOcean, Linode, AWS EC2
- **PaaS**: Heroku, Railway, Render
- **Game Hosting**: GameLift, Photon (if scaling significantly)

---

## 📊 Configuration Reference

### GameConfig.js

| Constant | Value | Purpose |
|----------|-------|---------|
| `WORLD_WIDTH` | 80750 | World width in pixels |
| `WORLD_HEIGHT` | 42525 | World height in pixels |
| `CANVAS_WIDTH` | 1024 | Client canvas width |
| `CANVAS_HEIGHT` | 768 | Client canvas height |
| `TICK_RATE` | 60 | Server updates per second |
| `TILE_SIZE` | 25 | Pixels per tile |
| `WORLD_MAP_PATH` | './src/server/assets/world_map.json' | Tilemap file |
| `HARBORS_PATH` | './assets/harbors.json' | Harbor data file |
| `HARBOR_INTERACTION_RADIUS` | 80 | Distance to enter harbor |

### CombatConfig.js

| Constant | Value | Purpose |
|----------|-------|---------|
| `CANNON_FIRE_RATE` | 4.0 | Seconds between shots |
| `CANNON_SPREAD` | 0.05 | Radians between dual cannons |
| `PROJECTILE_DAMAGE` | 10 | Damage per cannonball |
| `PROJECTILE_SPEED` | 120 | Cannonball velocity |
| `PROJECTILE_MAX_DISTANCE` | 250 | Max range in pixels |
| `PROJECTILE_BALL_RADIUS` | 2 | Visual size |
| `FLAGSHIP_SWITCH_SHIELD_DURATION` | 10 | Shield when switching ships |
| `HARBOR_EXIT_SHIELD_DURATION` | 10 | Shield when leaving harbor |

### PhysicsConfig.js

| Constant | Value | Purpose |
|----------|-------|---------|
| `ACCELERATION` | 20 | Deep water acceleration |
| `DECELERATION` | 10 | Deep water deceleration |
| `SHALLOW_WATER_SPEED_MULTIPLIER` | 0.75 | 25% speed reduction |
| `FLEET_SPEED_PENALTY_PER_SHIP` | 0.05 | 5% penalty per ship |
| `WIND_CHANGE_INTERVAL_MIN` | 30 | Min seconds between wind changes |
| `WIND_CHANGE_INTERVAL_MAX` | 60 | Max seconds between wind changes |
| `SPEED_TO_KNOTS_MULTIPLIER` | 0.1 | Convert pixels/sec to knots |

---

## 🎨 Rendering Optimizations

### World Wrapping System

The game uses a **toroidal world** (wraps horizontally and vertically) to create seamless navigation.

**Challenge**: Islands and harbors must be drawn at wrapped positions when near world edges to prevent pop-in artifacts.

**Solution**: Viewport-based wrapping thresholds
```javascript
// Calculate when to draw wrapped versions
const wrapThreshold = Math.max(canvas.width / 2, canvas.height / 2) + island.shallowWaterRadius;

// Draw wrapped version if island is within threshold of edge
if (island.x < wrapThreshold) {
    // Draw copy on opposite side
    drawIslandWithShallowWater({ ...island, x: island.x + worldWidth });
}
```

**Benefits**:
- Islands, shallow water, and harbors always render together
- No pop-in/pop-out artifacts
- Smooth visual experience when crossing world boundaries
- Threshold adapts to viewport size

### Client-Side Caching

**Static Map Data**: Islands and harbors are cached on the client after initial load
- Received once via `map_data` event
- Stored in memory for rendering
- Only re-downloaded if server changes the map

**Dynamic State**: Players, projectiles, and wind update every frame
- Received 60 times/second via `gamestate_update`
- Immediately rendered without caching

---

## 🔮 Future Technical Improvements

### High Priority
- [ ] **Delta Updates** - Only send changed data to clients
- [ ] **Spatial Partitioning** - Grid-based collision detection
- [ ] **Client Interpolation** - Smooth movement between server updates
- [ ] **Input Validation** - Sanitize and validate all client inputs

### Medium Priority
- [ ] **Area of Interest** - Only send nearby entities to clients
- [ ] **Object Pooling** - Reuse projectile objects instead of creating/destroying
- [ ] **Database Integration** - Persistent player data and stats
- [ ] **Authentication System** - User accounts and sessions

### Low Priority
- [ ] **WebRTC** - Peer-to-peer for voice chat or hybrid architecture
- [ ] **Server Clustering** - Multiple game instances with load balancing
- [ ] **Replay System** - Record and playback battles
- [ ] **Admin Tools** - Server management dashboard

---

## 📚 Resources & References

### Documentation
- [Socket.IO Docs](https://socket.io/docs/v4/)
- [Node.js Docs](https://nodejs.org/docs/)
- [HTML5 Canvas Tutorial](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial)

### Inspiration
- [Gabriel Gambetta - Fast-Paced Multiplayer](https://www.gabrielgambetta.com/client-server-game-architecture.html)
- [Valve - Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)

---

*This document should be updated as technical decisions are made and architecture evolves.*
