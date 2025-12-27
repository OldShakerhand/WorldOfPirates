# Technical Documentation

This document covers the technical architecture, design decisions, and implementation details of World of Pirates.

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
// Simplified flow
requestAnimationFrame(() => {
    1. Receive game state from server
    2. Clear canvas
    3. Render water, islands, harbors
    4. Render all ships and projectiles
    5. Render UI elements
    6. Repeat
});
```

**Frame Rate: Variable (typically 60 FPS)**
- Client renders as fast as possible
- Interpolation between server updates (future optimization)

---

## 🌐 Network Architecture

### Two-Tier State System

**Optimization**: Static map data is separated from dynamic game state to reduce bandwidth.

**Static Map Data** (sent once on connection):
```javascript
socket.emit('map_data', {
    width: 2000,
    height: 2000,
    islands: [...],  // All island data
    harbors: [...]   // All harbor data
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
- **[World.js](file:///c:/Development/WorldOfPirates/src/server/game/World.js)** - World state, entity management, island generation

#### Entities
- **[Player.js](file:///c:/Development/WorldOfPirates/src/server/game/Player.js)** - Player entity, movement, fleet management, combat
- **[Ship.js](file:///c:/Development/WorldOfPirates/src/server/game/Ship.js)** - Ship instances with health and damage
- **[Projectile.js](file:///c:/Development/WorldOfPirates/src/server/game/Projectile.js)** - Cannonball physics and collision

#### World Elements
- **[Island.js](file:///c:/Development/WorldOfPirates/src/server/game/Island.js)** - Island generation, collision detection
- **[Harbor.js](file:///c:/Development/WorldOfPirates/src/server/game/Harbor.js)** - Harbor placement and interaction
- **[Wind.js](file:///c:/Development/WorldOfPirates/src/server/game/Wind.js)** - Dynamic wind system

#### Configuration
- **[GameConfig.js](file:///c:/Development/WorldOfPirates/src/server/game/GameConfig.js)** - World size, tick rate, island generation
- **[CombatConfig.js](file:///c:/Development/WorldOfPirates/src/server/game/CombatConfig.js)** - Damage, fire rates, shields, projectiles
- **[PhysicsConfig.js](file:///c:/Development/WorldOfPirates/src/server/game/PhysicsConfig.js)** - Movement, acceleration, wind effects
- **[ShipClass.js](file:///c:/Development/WorldOfPirates/src/server/game/ShipClass.js)** - Ship class definitions and stats

#### Utilities
- **[NavigationSkill.js](file:///c:/Development/WorldOfPirates/src/server/game/NavigationSkill.js)** - Navigation skill system (future feature)

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
    width: 2000,             // World width
    height: 2000,            // World height
    entities: {},            // All players (keyed by ID)
    projectiles: [],         // Active cannonballs
    islands: [],             // Generated islands
    harbors: [],             // Harbor locations
    wind: Wind               // Wind system
}
```

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
| `WORLD_WIDTH` | 2000 | World width in units |
| `WORLD_HEIGHT` | 2000 | World height in units |
| `CANVAS_WIDTH` | 1024 | Client canvas width |
| `CANVAS_HEIGHT` | 768 | Client canvas height |
| `TICK_RATE` | 60 | Server updates per second |
| `ISLAND_COUNT` | 7 | Number of islands |
| `ISLAND_MIN_RADIUS` | 60 | Minimum island size |
| `ISLAND_MAX_RADIUS` | 150 | Maximum island size |
| `HARBOR_INTERACTION_RADIUS` | 30 | Distance to enter harbor |

### CombatConfig.js

| Constant | Value | Purpose |
|----------|-------|---------|
| `CANNON_FIRE_RATE` | 3.0 | Seconds between shots |
| `CANNON_SPREAD` | 0.1 | Radians between dual cannons |
| `PROJECTILE_DAMAGE` | 10 | Damage per cannonball |
| `PROJECTILE_SPEED` | 200 | Cannonball velocity |
| `PROJECTILE_LIFETIME` | 2 | Seconds before despawn |
| `FLAGSHIP_SWITCH_SHIELD_DURATION` | 10 | Shield when switching ships |
| `HARBOR_EXIT_SHIELD_DURATION` | 10 | Shield when leaving harbor |

### PhysicsConfig.js

| Constant | Value | Purpose |
|----------|-------|---------|
| `RAFT_SPEED` | 75 | Raft max speed (1.5× Sloop base) |
| `SHALLOW_WATER_SPEED_MULTIPLIER` | 0.75 | 25% speed reduction |
| `FLEET_SPEED_PENALTY_PER_SHIP` | 0.05 | 5% penalty per ship |
| `WIND_CHANGE_INTERVAL_MIN` | 30 | Min seconds between wind changes |
| `WIND_CHANGE_INTERVAL_MAX` | 60 | Max seconds between wind changes |

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
