# Sound System

**Status:** ✅ Implemented  
**Location:** `src/public/js/SoundManager.js`  
**Type:** Client-side procedural audio

## Overview

The sound system provides immersive audio feedback for the game using procedural sound generation via the Web Audio API. All sounds are synthesized in real-time without requiring external audio files.

## Architecture

### SoundManager Class

The `SoundManager` is a self-contained audio management system that:
- Generates all sounds procedurally using Web Audio API
- Manages concurrent sound limits and throttling
- Handles proper resource cleanup to prevent memory leaks
- Provides volume control and mute functionality

**Key Principles:**
- **Client-side only** - No server modifications required
- **Pure playback consumer** - No gameplay logic, only responds to game state
- **Procedural generation** - No external assets needed
- **Resource efficient** - Proper cleanup and sound limiting

## Sound Categories

### 1. Ambient Sounds (30% volume)

**Wave Sounds:**
- Deep ocean rumble (brown noise, lowpass filtered at 120Hz)
- Wave wash (pink noise with LFO modulation at 400Hz)
- Continuous looping with natural ebb and flow

**Wind Sounds:**
- Base wind layer (filtered white noise)
- Gust layer with slow LFO modulation
- Three intensity levels based on game wind strength:
  - `LOW`: 3% volume, 200Hz
  - `NORMAL`: 6% volume, 300Hz
  - `FULL`: 10% volume, 400Hz

**Seagull Sounds:**
- Occasional calls (15-35 second intervals)
- Frequency sweep with vibrato (2000Hz → 1400Hz → 1800Hz)
- Multiple calls in sequence (1-3)
- Random stereo panning for spatial effect
- Harmonics for realistic character

### 2. Ship Sounds (50% volume)

**Sail Deployment:**
- Rope creaking (modulated sawtooth, 80-120Hz)
- Canvas flapping (filtered pink noise with pitch sweep)
- Air whoosh (high-pass filtered white noise)
- Duration: 0.8 seconds

**Sail Removal:**
- Rope sliding sound (filtered pink noise)
- Soft thud at end (100Hz → 40Hz)
- Duration: 0.5 seconds

**Throttling:** 0.3 second minimum interval between sail changes

### 3. Combat Sounds (70% volume)

**Cannon Fire (6 layers):**
1. **Sub bass punch** - Deep 50Hz sine wave for gut impact
2. **Crack** - Sharp square wave (200Hz → 40Hz) for gunpowder explosion
3. **Boom** - Sawtooth with lowpass filter (80Hz → 30Hz) for main body
4. **Blast** - Explosive noise burst (5kHz → 100Hz sweep)
5. **Echo/Smoke** - Brown noise tail for rolling thunder
6. **Sizzle** - High frequency sparkle (4kHz highpass)
- Uses dynamics compressor for punch
- Stereo panning based on screen position
- Duration: 1.5 seconds
- Throttling: 0.15 seconds per cannon side

**Water Splash (3 layers):**
1. **Impact** - Short burst (2kHz → 500Hz bandpass)
2. **Bubbles** - Low filtered noise (400Hz lowpass)
3. **Spray** - High frequency (3kHz highpass)
- Duration: 0.6 seconds
- Throttling: 0.1 seconds

**Wood Impact (7 layers):**
1. **Impact thud** - Heavy cannonball hit (250Hz → 50Hz)
2. **Crack** - Sharp wood breaking (square wave 400Hz → 100Hz)
3. **Snap** - High frequency crack (4kHz → 1.5kHz bandpass)
4. **Splinters** - 8-14 rapid crack impulses (procedurally generated)
5. **Debris** - Wood fragments falling (crackling noise)
6. **Hull groan** - Low ship resonance (100Hz → 40Hz)
7. **Rattle** - Wood pieces rattling (600Hz bandpass)
- Uses dynamics compressor for impact
- Duration: 0.8 seconds
- Throttling: 0.1 seconds

## Technical Implementation

### Noise Buffers

Pre-generated noise buffers for efficiency:
- **White noise** - Full spectrum random noise
- **Pink noise** - Natural-sounding filtered noise (1/f spectrum)
- **Brown noise** - Low-frequency rumble for ocean sounds

### Audio Processing

**Filters:**
- Lowpass, highpass, and bandpass filters for frequency shaping
- Q values control filter resonance and character

**Envelopes:**
- Attack/Decay/Release shaping for realistic sound evolution
- Linear and exponential ramps for different characteristics

**Effects:**
- Stereo panning for spatial positioning
- LFO modulation for natural variation
- Dynamics compression for punch and cohesion

### Sound Detection

**Client-side event detection:**

1. **Sail Changes:**
   - Compare previous vs current sail state
   - Trigger appropriate sound on state change

2. **Cannon Fires:**
   - Monitor reload timer changes
   - When timer jumps from 0 to max, cannon fired
   - Separate tracking for left (Q) and right (E) cannons

3. **Projectile Impacts:**
   - Track all projectiles frame-by-frame
   - When projectile disappears, check proximity to ships
   - Play wood impact if near ship, water splash otherwise
   - Calculate screen position for stereo panning

### Resource Management

**Sound Limiting:**
- Maximum 15 concurrent sounds
- Prevents performance issues and audio spam

**Throttling:**
- Minimum intervals between repeated sounds
- Prevents rapid-fire spam from key presses

**Cleanup:**
- All audio nodes properly disconnected after playback
- Automatic cleanup after sound duration + 100ms buffer
- Prevents memory leaks

## User Controls

**Mute Toggle:**
- Press **U** key to toggle mute on/off
- Stops all ambient sounds when muted
- Prevents new sounds from playing
- Console logs mute state

**Volume Control:**
- Master volume: 70%
- Category volumes configurable in code
- Can be adjusted via `soundManager.setMasterVolume(volume)`

## Configuration

Located in `SoundManager` constructor:

```javascript
this.config = {
    masterVolume: 0.7,
    categories: {
        ambient: 0.25,  // Background sounds
        ship: 0.5,      // Ship actions
        combat: 0.7     // Combat sounds
    },
    muted: false,
    maxConcurrentSounds: 15
};
```

## Integration

### Files Modified

**New:**
- `src/public/js/SoundManager.js` - Sound management system

**Modified:**
- `src/public/index.html` - Added script tag and mute control to legend
- `src/public/js/client.js` - Integrated sound system with game state

### Initialization

```javascript
// Sound manager initialized on page load
const soundManager = new SoundManager();

// Initialized after user interaction (clicking "Set Sail")
socket.on('map_data', (data) => {
    soundManager.init();
    console.log('[Sound] Sound system initialized');
});
```

### Update Loop

```javascript
// Called every frame in gamestate_update
function updateSoundSystem(state) {
    // Update ambient sounds based on wind
    soundManager.updateAmbient(state.wind, 1/60);
    
    // Detect sail changes, cannon fires, projectile impacts
    // ...
}
```

## Browser Compatibility

**Tested:**
- ✅ Chrome/Edge (Chromium) - Full support
- ✅ Firefox - Full support
- ⚠️ Safari - Requires user interaction to start

**Requirements:**
- Web Audio API support
- User interaction required for audio context initialization

## Future Enhancements

**Potential Improvements:**

1. **Real Audio Files:**
   - Replace procedural sounds with recorded audio
   - Maintain same API for easy swap
   - Add loading system for audio assets

2. **Music System:**
   - Background music (sea shanties, orchestral)
   - Dynamic music based on combat state
   - Fade in/out transitions

3. **Additional Sounds:**
   - Harbor ambient sounds (dock creaking)
   - Ship sinking sounds
   - UI feedback sounds (button clicks)
   - Victory/defeat sounds

4. **Advanced Features:**
   - Distance-based volume attenuation
   - Underwater effects
   - Reverb for harbor areas
   - Doppler effect for moving ships

5. **User Preferences:**
   - Volume sliders in UI
   - Individual category mute toggles
   - Save preferences to localStorage

## Performance Considerations

**Optimization:**
- Pre-created noise buffers (reused across sounds)
- Sound limiting prevents excessive concurrent playback
- Throttling prevents rapid repeated sounds
- Proper cleanup prevents memory leaks

**CPU Usage:**
- Procedural generation requires more CPU than playing files
- Acceptable for current implementation
- Can be replaced with audio files if needed

## Design Decisions

### Why Procedural Audio?

**Pros:**
- ✅ No external files to download
- ✅ Immediate implementation
- ✅ Small file size
- ✅ Easy to tweak parameters
- ✅ No licensing concerns

**Cons:**
- ❌ Less realistic than recorded audio
- ❌ Limited complexity
- ❌ Requires more CPU than playing files

### Why Client-Side Only?

**Pros:**
- ✅ No server modifications required
- ✅ Reduces server load
- ✅ Easier to implement
- ✅ No network latency for sound triggers

**Cons:**
- ❌ Slightly less accurate timing (relies on client-side detection)

## Troubleshooting

**No sound playing:**
- Check if muted (press U to toggle)
- Ensure user has interacted with page (clicked "Set Sail")
- Check browser console for errors
- Verify browser supports Web Audio API

**Sounds cutting out:**
- May be hitting concurrent sound limit (15)
- Check for excessive sound spam
- Verify proper cleanup is occurring

**Performance issues:**
- Reduce master volume or category volumes
- Increase throttle intervals
- Reduce maxConcurrentSounds limit

## API Reference

### Methods

**`init()`**
- Initializes audio context
- Must be called after user interaction

**`updateAmbient(wind, deltaTime)`**
- Updates ambient sounds based on wind state
- Called every frame

**`playSailDeploy()`**
- Plays sail deployment sound
- Throttled to 0.3 seconds

**`playSailRemove()`**
- Plays sail removal sound
- Throttled to 0.3 seconds

**`playCannonFire(side, screenX)`**
- Plays cannon fire sound
- `side`: 'left' or 'right'
- `screenX`: 0-1 for stereo panning
- Throttled to 0.15 seconds per side

**`playWaterSplash(screenX)`**
- Plays water splash sound
- `screenX`: 0-1 for stereo panning
- Throttled to 0.1 seconds

**`playWoodImpact(screenX)`**
- Plays wood impact/splintering sound
- `screenX`: 0-1 for stereo panning
- Throttled to 0.1 seconds

**`toggleMute()`**
- Toggles mute on/off
- Returns current mute state

**`setMasterVolume(volume)`**
- Sets master volume (0-1)

**`isMuted()`**
- Returns current mute state

## Credits

**Implementation:** Procedural audio synthesis using Web Audio API  
**Design:** Multi-layered sound approach for depth and realism  
**Integration:** Client-side event detection and state tracking
