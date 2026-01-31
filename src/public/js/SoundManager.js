/**
 * SoundManager.js
 * Client-side sound system using Web Audio API for procedural sound generation
 * 
 * DESIGN PRINCIPLES:
 * - Client-side only (no server modifications)
 * - Procedural audio generation (no asset files)
 * - Simple playback consumer (no gameplay logic)
 * - Proper resource cleanup to prevent memory leaks
 * 
 * V2: Enhanced with more realistic sound synthesis
 */

class SoundManager {
    constructor() {
        // Initialize Web Audio API context
        this.audioContext = null;
        this.masterGain = null;

        // Configuration
        this.config = {
            masterVolume: 0.7,
            categories: {
                ambient: 0.25,  // Low volume for background
                ship: 0.5,
                combat: 0.7
            },
            muted: false,
            maxConcurrentSounds: 15  // Prevent sound spam
        };

        // Track active sounds for cleanup and limiting
        this.activeSounds = [];

        // Ambient sound state
        this.ambientSounds = {
            waves: null,
            wind: null,
            seagullTimer: 0
        };

        // Throttle state for preventing spam
        this.lastSoundTimes = {
            cannonLeft: 0,
            cannonRight: 0,
            sailChange: 0,
            splash: 0,
            impact: 0
        };

        // Initialize audio context on first user interaction
        this.initialized = false;
    }

    /**
     * Initialize audio context (must be called after user interaction)
     */
    init() {
        if (this.initialized) return;

        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.config.masterVolume;
            this.masterGain.connect(this.audioContext.destination);

            // Create reusable noise buffers
            this.createNoiseBuffers();

            this.initialized = true;
            console.log('[SoundManager] Initialized successfully');
        } catch (error) {
            console.warn('[SoundManager] Failed to initialize:', error);
        }
    }

    /**
     * Pre-create noise buffers for reuse
     */
    createNoiseBuffers() {
        const sampleRate = this.audioContext.sampleRate;

        // White noise buffer (2 seconds)
        this.whiteNoiseBuffer = this.audioContext.createBuffer(1, sampleRate * 2, sampleRate);
        const whiteData = this.whiteNoiseBuffer.getChannelData(0);
        for (let i = 0; i < whiteData.length; i++) {
            whiteData[i] = Math.random() * 2 - 1;
        }

        // Pink noise buffer (more natural sounding)
        this.pinkNoiseBuffer = this.audioContext.createBuffer(1, sampleRate * 2, sampleRate);
        const pinkData = this.pinkNoiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < pinkData.length; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }

        // Brown noise buffer (ocean-like rumble)
        this.brownNoiseBuffer = this.audioContext.createBuffer(1, sampleRate * 2, sampleRate);
        const brownData = this.brownNoiseBuffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < brownData.length; i++) {
            const white = Math.random() * 2 - 1;
            brownData[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = brownData[i];
            brownData[i] *= 3.5;
        }
    }

    /**
     * Update ambient sounds based on game state
     */
    updateAmbient(wind, deltaTime) {
        if (!this.initialized || this.config.muted) return;

        // Start/update wave sounds
        if (!this.ambientSounds.waves) {
            this.startWaveSounds();
        }

        // Start/update wind sounds based on intensity
        this.updateWindSounds(wind);

        // Randomly play seagull sounds (less frequent)
        this.ambientSounds.seagullTimer += deltaTime;
        if (this.ambientSounds.seagullTimer > 15 + Math.random() * 20) { // 15-35 second intervals
            this.playSeagull();
            this.ambientSounds.seagullTimer = 0;
        }
    }

    /**
     * Start continuous wave sounds - realistic ocean ambience
     */
    startWaveSounds() {
        if (!this.initialized) return;

        try {
            // Layer 1: Deep ocean rumble (brown noise, very low)
            const rumbleSource = this.audioContext.createBufferSource();
            rumbleSource.buffer = this.brownNoiseBuffer;
            rumbleSource.loop = true;

            const rumbleFilter = this.audioContext.createBiquadFilter();
            rumbleFilter.type = 'lowpass';
            rumbleFilter.frequency.value = 120;
            rumbleFilter.Q.value = 0.7;

            const rumbleGain = this.audioContext.createGain();
            rumbleGain.gain.value = this.config.categories.ambient * 0.3;

            // Layer 2: Wave wash (pink noise with modulation)
            const washSource = this.audioContext.createBufferSource();
            washSource.buffer = this.pinkNoiseBuffer;
            washSource.loop = true;

            const washFilter = this.audioContext.createBiquadFilter();
            washFilter.type = 'bandpass';
            washFilter.frequency.value = 400;
            washFilter.Q.value = 0.5;

            const washGain = this.audioContext.createGain();
            washGain.gain.value = this.config.categories.ambient * 0.15;

            // Create LFO for wave modulation (slow amplitude changes)
            const lfo = this.audioContext.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.value = 0.1; // Very slow modulation

            const lfoGain = this.audioContext.createGain();
            lfoGain.gain.value = this.config.categories.ambient * 0.05;

            // Connect LFO to modulate wash gain
            lfo.connect(lfoGain);
            lfoGain.connect(washGain.gain);

            // Connect chains
            rumbleSource.connect(rumbleFilter);
            rumbleFilter.connect(rumbleGain);
            rumbleGain.connect(this.masterGain);

            washSource.connect(washFilter);
            washFilter.connect(washGain);
            washGain.connect(this.masterGain);

            rumbleSource.start();
            washSource.start();
            lfo.start();

            this.ambientSounds.waves = {
                rumbleSource, rumbleGain, rumbleFilter,
                washSource, washGain, washFilter,
                lfo, lfoGain
            };
        } catch (error) {
            console.warn('[SoundManager] Failed to create wave sounds:', error);
        }
    }

    /**
     * Update wind sounds based on wind strength
     */
    updateWindSounds(wind) {
        if (!this.initialized || !wind) return;

        const windStrength = wind.strength || 'NORMAL';

        // Map wind strength to parameters - tuned down to avoid harsh white noise
        const windParams = {
            'LOW': { volume: 0.03, frequency: 200, q: 0.8 },
            'NORMAL': { volume: 0.06, frequency: 300, q: 1.0 },
            'FULL': { volume: 0.10, frequency: 400, q: 1.2 }
        };

        const params = windParams[windStrength] || windParams['NORMAL'];
        const targetVolume = params.volume * this.config.categories.ambient;

        if (!this.ambientSounds.wind) {
            this.createWindSound(params);
        } else {
            // Smoothly transition volume and frequency
            const now = this.audioContext.currentTime;
            const wind = this.ambientSounds.wind;
            wind.gain.gain.linearRampToValueAtTime(targetVolume, now + 2.0);
            wind.filter.frequency.linearRampToValueAtTime(params.frequency, now + 2.0);
        }
    }

    /**
     * Create realistic wind sound with multiple layers
     */
    createWindSound(params) {
        if (!this.initialized) return;

        try {
            // Layer 1: Base wind (filtered white noise)
            const baseSource = this.audioContext.createBufferSource();
            baseSource.buffer = this.whiteNoiseBuffer;
            baseSource.loop = true;

            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = params.frequency;
            filter.Q.value = params.q;

            // Layer 2: Wind gusts (modulated noise)
            const gustSource = this.audioContext.createBufferSource();
            gustSource.buffer = this.pinkNoiseBuffer;
            gustSource.loop = true;

            const gustFilter = this.audioContext.createBiquadFilter();
            gustFilter.type = 'lowpass';
            gustFilter.frequency.value = 600;

            const gustGain = this.audioContext.createGain();
            gustGain.gain.value = 0;

            // LFO for gusts
            const gustLfo = this.audioContext.createOscillator();
            gustLfo.type = 'sine';
            gustLfo.frequency.value = 0.2 + Math.random() * 0.1;

            const gustLfoGain = this.audioContext.createGain();
            gustLfoGain.gain.value = params.volume * this.config.categories.ambient * 0.3;

            gustLfo.connect(gustLfoGain);
            gustLfoGain.connect(gustGain.gain);

            // Main gain
            const gain = this.audioContext.createGain();
            gain.gain.value = params.volume * this.config.categories.ambient;

            // Connect
            baseSource.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            gustSource.connect(gustFilter);
            gustFilter.connect(gustGain);
            gustGain.connect(this.masterGain);

            baseSource.start();
            gustSource.start();
            gustLfo.start();

            this.ambientSounds.wind = {
                baseSource, filter, gain,
                gustSource, gustFilter, gustGain, gustLfo, gustLfoGain
            };
        } catch (error) {
            console.warn('[SoundManager] Failed to create wind sound:', error);
        }
    }

    /**
     * Play realistic seagull sound with harmonics
     */
    playSeagull() {
        if (!this.canPlaySound()) return;

        try {
            const now = this.audioContext.currentTime;

            // Seagulls make 2-3 calls in sequence
            const numCalls = 1 + Math.floor(Math.random() * 2);

            for (let c = 0; c < numCalls; c++) {
                const callStart = now + c * 0.4;
                const duration = 0.25 + Math.random() * 0.15;

                // Main tone with vibrato
                const osc1 = this.audioContext.createOscillator();
                osc1.type = 'sine';

                // Vibrato LFO
                const vibrato = this.audioContext.createOscillator();
                vibrato.type = 'sine';
                vibrato.frequency.value = 6 + Math.random() * 4; // 6-10 Hz vibrato

                const vibratoGain = this.audioContext.createGain();
                vibratoGain.gain.value = 50; // Vibrato depth in Hz

                vibrato.connect(vibratoGain);
                vibratoGain.connect(osc1.frequency);

                // Frequency envelope: high -> low -> high (crying sound)
                const baseFreq = 2000 + Math.random() * 500;
                const dipFreq = 1400 + Math.random() * 200;
                osc1.frequency.setValueAtTime(baseFreq, callStart);
                osc1.frequency.linearRampToValueAtTime(dipFreq, callStart + duration * 0.4);
                osc1.frequency.linearRampToValueAtTime(baseFreq * 0.9, callStart + duration);

                // Harmonic (adds character)
                const osc2 = this.audioContext.createOscillator();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(baseFreq * 2, callStart);
                osc2.frequency.linearRampToValueAtTime(dipFreq * 2, callStart + duration * 0.4);
                osc2.frequency.linearRampToValueAtTime(baseFreq * 1.8, callStart + duration);

                // Gain envelope
                const gain = this.audioContext.createGain();
                gain.gain.setValueAtTime(0, callStart);
                gain.gain.linearRampToValueAtTime(this.config.categories.ambient * 0.2, callStart + 0.02);
                gain.gain.setValueAtTime(this.config.categories.ambient * 0.2, callStart + duration * 0.7);
                gain.gain.exponentialRampToValueAtTime(0.001, callStart + duration);

                const harmonicGain = this.audioContext.createGain();
                harmonicGain.gain.value = 0.15; // Subtle harmonic

                // Random panning (seagulls flying around)
                const panner = this.audioContext.createStereoPanner();
                panner.pan.value = (Math.random() - 0.5) * 1.5;

                // Connect
                osc1.connect(gain);
                osc2.connect(harmonicGain);
                harmonicGain.connect(gain);
                gain.connect(panner);
                panner.connect(this.masterGain);

                osc1.start(callStart);
                osc2.start(callStart);
                vibrato.start(callStart);
                osc1.stop(callStart + duration);
                osc2.stop(callStart + duration);
                vibrato.stop(callStart + duration);

                this.trackSound({ osc1, osc2, vibrato, vibratoGain, gain, harmonicGain, panner }, duration + c * 0.4);
            }
        } catch (error) {
            console.warn('[SoundManager] Failed to play seagull:', error);
        }
    }

    /**
     * Play sail deployment sound - canvas flapping/unfurling
     */
    playSailDeploy() {
        if (!this.canPlaySound() || !this.throttleSound('sailChange', 0.3)) return;

        try {
            const now = this.audioContext.currentTime;
            const duration = 0.8;

            // Layer 1: Rope creaking (low pitched modulated tone)
            const creakOsc = this.audioContext.createOscillator();
            creakOsc.type = 'sawtooth';
            creakOsc.frequency.setValueAtTime(80, now);
            creakOsc.frequency.linearRampToValueAtTime(120, now + 0.1);
            creakOsc.frequency.linearRampToValueAtTime(60, now + duration);

            const creakFilter = this.audioContext.createBiquadFilter();
            creakFilter.type = 'bandpass';
            creakFilter.frequency.value = 200;
            creakFilter.Q.value = 2;

            const creakGain = this.audioContext.createGain();
            creakGain.gain.setValueAtTime(0, now);
            creakGain.gain.linearRampToValueAtTime(this.config.categories.ship * 0.15, now + 0.05);
            creakGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);

            // Layer 2: Canvas flap (filtered noise burst with pitch)
            const flapSource = this.audioContext.createBufferSource();
            flapSource.buffer = this.pinkNoiseBuffer;
            flapSource.playbackRate.setValueAtTime(1.5, now);
            flapSource.playbackRate.linearRampToValueAtTime(0.8, now + duration);

            const flapFilter = this.audioContext.createBiquadFilter();
            flapFilter.type = 'bandpass';
            flapFilter.frequency.setValueAtTime(800, now);
            flapFilter.frequency.linearRampToValueAtTime(400, now + duration);
            flapFilter.Q.value = 1;

            const flapGain = this.audioContext.createGain();
            flapGain.gain.setValueAtTime(0, now);
            flapGain.gain.linearRampToValueAtTime(this.config.categories.ship * 0.4, now + 0.05);
            flapGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Layer 3: Whoosh (high frequency sweep)
            const whooshSource = this.audioContext.createBufferSource();
            whooshSource.buffer = this.whiteNoiseBuffer;

            const whooshFilter = this.audioContext.createBiquadFilter();
            whooshFilter.type = 'highpass';
            whooshFilter.frequency.setValueAtTime(2000, now);
            whooshFilter.frequency.exponentialRampToValueAtTime(500, now + duration);

            const whooshGain = this.audioContext.createGain();
            whooshGain.gain.setValueAtTime(0, now);
            whooshGain.gain.linearRampToValueAtTime(this.config.categories.ship * 0.2, now + 0.02);
            whooshGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.6);

            // Connect all
            creakOsc.connect(creakFilter);
            creakFilter.connect(creakGain);
            creakGain.connect(this.masterGain);

            flapSource.connect(flapFilter);
            flapFilter.connect(flapGain);
            flapGain.connect(this.masterGain);

            whooshSource.connect(whooshFilter);
            whooshFilter.connect(whooshGain);
            whooshGain.connect(this.masterGain);

            creakOsc.start(now);
            creakOsc.stop(now + duration);
            flapSource.start(now);
            flapSource.stop(now + duration);
            whooshSource.start(now);
            whooshSource.stop(now + duration);

            this.trackSound({ creakOsc, creakFilter, creakGain, flapSource, flapFilter, flapGain, whooshSource, whooshFilter, whooshGain }, duration);
        } catch (error) {
            console.warn('[SoundManager] Failed to play sail deploy:', error);
        }
    }

    /**
     * Play sail removal sound - canvas folding/ropes
     */
    playSailRemove() {
        if (!this.canPlaySound() || !this.throttleSound('sailChange', 0.3)) return;

        try {
            const now = this.audioContext.currentTime;
            const duration = 0.5;

            // Rope sliding sound
            const ropeSource = this.audioContext.createBufferSource();
            ropeSource.buffer = this.pinkNoiseBuffer;
            ropeSource.playbackRate.setValueAtTime(0.8, now);
            ropeSource.playbackRate.linearRampToValueAtTime(0.5, now + duration);

            const ropeFilter = this.audioContext.createBiquadFilter();
            ropeFilter.type = 'bandpass';
            ropeFilter.frequency.setValueAtTime(600, now);
            ropeFilter.frequency.linearRampToValueAtTime(300, now + duration);
            ropeFilter.Q.value = 1.5;

            const ropeGain = this.audioContext.createGain();
            ropeGain.gain.setValueAtTime(0, now);
            ropeGain.gain.linearRampToValueAtTime(this.config.categories.ship * 0.3, now + 0.03);
            ropeGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Soft thud at end
            const thudOsc = this.audioContext.createOscillator();
            thudOsc.type = 'sine';
            thudOsc.frequency.setValueAtTime(100, now + duration * 0.7);
            thudOsc.frequency.exponentialRampToValueAtTime(40, now + duration);

            const thudGain = this.audioContext.createGain();
            thudGain.gain.setValueAtTime(0, now);
            thudGain.gain.setValueAtTime(0, now + duration * 0.65);
            thudGain.gain.linearRampToValueAtTime(this.config.categories.ship * 0.2, now + duration * 0.7);
            thudGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            ropeSource.connect(ropeFilter);
            ropeFilter.connect(ropeGain);
            ropeGain.connect(this.masterGain);

            thudOsc.connect(thudGain);
            thudGain.connect(this.masterGain);

            ropeSource.start(now);
            ropeSource.stop(now + duration);
            thudOsc.start(now + duration * 0.65);
            thudOsc.stop(now + duration);

            this.trackSound({ ropeSource, ropeFilter, ropeGain, thudOsc, thudGain }, duration);
        } catch (error) {
            console.warn('[SoundManager] Failed to play sail remove:', error);
        }
    }

    /**
     * Play powerful cannon fire sound
     */
    playCannonFire(side, screenX = 0.5) {
        const throttleKey = side === 'left' ? 'cannonLeft' : 'cannonRight';
        if (!this.canPlaySound() || !this.throttleSound(throttleKey, 0.15)) return;

        try {
            const now = this.audioContext.currentTime;
            const duration = 1.5;

            // Panning based on screen position
            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = (screenX - 0.5) * 1.5;

            // Create a compressor for punch
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.value = -20;
            compressor.knee.value = 10;
            compressor.ratio.value = 8;
            compressor.attack.value = 0.001;
            compressor.release.value = 0.1;

            // Layer 1: PUNCH - Sub bass hit (the gut punch)
            const subOsc = this.audioContext.createOscillator();
            subOsc.type = 'sine';
            subOsc.frequency.setValueAtTime(50, now);
            subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.3);

            const subGain = this.audioContext.createGain();
            subGain.gain.setValueAtTime(0, now);
            subGain.gain.linearRampToValueAtTime(1.0, now + 0.002); // Instant attack
            subGain.gain.setValueAtTime(1.0, now + 0.05);
            subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            // Layer 2: CRACK - Initial gunpowder explosion
            const crackOsc = this.audioContext.createOscillator();
            crackOsc.type = 'square';
            crackOsc.frequency.setValueAtTime(200, now);
            crackOsc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

            const crackGain = this.audioContext.createGain();
            crackGain.gain.setValueAtTime(0, now);
            crackGain.gain.linearRampToValueAtTime(0.8, now + 0.001);
            crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            // Layer 3: BOOM - Main body of the explosion
            const boomOsc = this.audioContext.createOscillator();
            boomOsc.type = 'sawtooth';
            boomOsc.frequency.setValueAtTime(80, now);
            boomOsc.frequency.exponentialRampToValueAtTime(30, now + 0.2);

            const boomFilter = this.audioContext.createBiquadFilter();
            boomFilter.type = 'lowpass';
            boomFilter.frequency.value = 150;
            boomFilter.Q.value = 2;

            const boomGain = this.audioContext.createGain();
            boomGain.gain.setValueAtTime(0, now);
            boomGain.gain.linearRampToValueAtTime(0.9, now + 0.005);
            boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            // Layer 4: BLAST - Explosive noise burst
            const blastSource = this.audioContext.createBufferSource();
            blastSource.buffer = this.whiteNoiseBuffer;

            const blastFilter = this.audioContext.createBiquadFilter();
            blastFilter.type = 'lowpass';
            blastFilter.frequency.setValueAtTime(5000, now);
            blastFilter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
            blastFilter.Q.value = 1;

            const blastGain = this.audioContext.createGain();
            blastGain.gain.setValueAtTime(0, now);
            blastGain.gain.linearRampToValueAtTime(0.7, now + 0.003);
            blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

            // Layer 5: SMOKE/ECHO - Rolling thunder tail
            const echoSource = this.audioContext.createBufferSource();
            echoSource.buffer = this.brownNoiseBuffer;

            const echoFilter = this.audioContext.createBiquadFilter();
            echoFilter.type = 'lowpass';
            echoFilter.frequency.value = 300;

            const echoGain = this.audioContext.createGain();
            echoGain.gain.setValueAtTime(0, now + 0.1);
            echoGain.gain.linearRampToValueAtTime(0.25, now + 0.2);
            echoGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Layer 6: High frequency sizzle (gunpowder)
            const sizzleSource = this.audioContext.createBufferSource();
            sizzleSource.buffer = this.whiteNoiseBuffer;

            const sizzleFilter = this.audioContext.createBiquadFilter();
            sizzleFilter.type = 'highpass';
            sizzleFilter.frequency.value = 4000;

            const sizzleGain = this.audioContext.createGain();
            sizzleGain.gain.setValueAtTime(0, now);
            sizzleGain.gain.linearRampToValueAtTime(0.2, now + 0.005);
            sizzleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            // Connect all through compressor -> panner
            subOsc.connect(subGain);
            subGain.connect(compressor);

            crackOsc.connect(crackGain);
            crackGain.connect(compressor);

            boomOsc.connect(boomFilter);
            boomFilter.connect(boomGain);
            boomGain.connect(compressor);

            blastSource.connect(blastFilter);
            blastFilter.connect(blastGain);
            blastGain.connect(compressor);

            echoSource.connect(echoFilter);
            echoFilter.connect(echoGain);
            echoGain.connect(compressor);

            sizzleSource.connect(sizzleFilter);
            sizzleFilter.connect(sizzleGain);
            sizzleGain.connect(compressor);

            compressor.connect(panner);
            panner.connect(this.masterGain);

            // Start all
            subOsc.start(now);
            subOsc.stop(now + 0.5);
            crackOsc.start(now);
            crackOsc.stop(now + 0.15);
            boomOsc.start(now);
            boomOsc.stop(now + 0.6);
            blastSource.start(now);
            blastSource.stop(now + 0.4);
            echoSource.start(now + 0.05);
            echoSource.stop(now + duration);
            sizzleSource.start(now);
            sizzleSource.stop(now + 0.2);

            this.trackSound({ subOsc, subGain, crackOsc, crackGain, boomOsc, boomFilter, boomGain, blastSource, blastFilter, blastGain, echoSource, echoFilter, echoGain, sizzleSource, sizzleFilter, sizzleGain, compressor, panner }, duration);
        } catch (error) {
            console.warn('[SoundManager] Failed to play cannon fire:', error);
        }
    }

    /**
     * Play realistic water splash sound
     */
    playWaterSplash(screenX = 0.5) {
        if (!this.canPlaySound() || !this.throttleSound('splash', 0.1)) return;

        try {
            const now = this.audioContext.currentTime;
            const duration = 0.6;

            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = (screenX - 0.5) * 2;

            // Layer 1: Initial impact (short burst)
            const impactSource = this.audioContext.createBufferSource();
            impactSource.buffer = this.whiteNoiseBuffer;

            const impactFilter = this.audioContext.createBiquadFilter();
            impactFilter.type = 'bandpass';
            impactFilter.frequency.setValueAtTime(2000, now);
            impactFilter.frequency.exponentialRampToValueAtTime(500, now + 0.15);
            impactFilter.Q.value = 0.7;

            const impactGain = this.audioContext.createGain();
            impactGain.gain.setValueAtTime(0, now);
            impactGain.gain.linearRampToValueAtTime(this.config.categories.combat * 0.4, now + 0.005);
            impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            // Layer 2: Water bubbles (modulated low noise)
            const bubbleSource = this.audioContext.createBufferSource();
            bubbleSource.buffer = this.pinkNoiseBuffer;
            bubbleSource.playbackRate.value = 0.5;

            const bubbleFilter = this.audioContext.createBiquadFilter();
            bubbleFilter.type = 'lowpass';
            bubbleFilter.frequency.value = 400;

            const bubbleGain = this.audioContext.createGain();
            bubbleGain.gain.setValueAtTime(0, now + 0.05);
            bubbleGain.gain.linearRampToValueAtTime(this.config.categories.combat * 0.2, now + 0.1);
            bubbleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Layer 3: Splash spray (high frequency)
            const spraySource = this.audioContext.createBufferSource();
            spraySource.buffer = this.whiteNoiseBuffer;

            const sprayFilter = this.audioContext.createBiquadFilter();
            sprayFilter.type = 'highpass';
            sprayFilter.frequency.value = 3000;

            const sprayGain = this.audioContext.createGain();
            sprayGain.gain.setValueAtTime(0, now);
            sprayGain.gain.linearRampToValueAtTime(this.config.categories.combat * 0.15, now + 0.01);
            sprayGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            // Connect
            impactSource.connect(impactFilter);
            impactFilter.connect(impactGain);
            impactGain.connect(panner);

            bubbleSource.connect(bubbleFilter);
            bubbleFilter.connect(bubbleGain);
            bubbleGain.connect(panner);

            spraySource.connect(sprayFilter);
            sprayFilter.connect(sprayGain);
            sprayGain.connect(panner);

            panner.connect(this.masterGain);

            impactSource.start(now);
            impactSource.stop(now + 0.2);
            bubbleSource.start(now + 0.05);
            bubbleSource.stop(now + duration);
            spraySource.start(now);
            spraySource.stop(now + 0.25);

            this.trackSound({ impactSource, impactFilter, impactGain, bubbleSource, bubbleFilter, bubbleGain, spraySource, sprayFilter, sprayGain, panner }, duration);
        } catch (error) {
            console.warn('[SoundManager] Failed to play water splash:', error);
        }
    }

    /**
     * Play dramatic wood splintering/impact sound
     */
    playWoodImpact(screenX = 0.5) {
        if (!this.canPlaySound() || !this.throttleSound('impact', 0.1)) return;

        try {
            const now = this.audioContext.currentTime;
            const duration = 0.8;

            const panner = this.audioContext.createStereoPanner();
            panner.pan.value = (screenX - 0.5) * 2;

            // Compressor for punch
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.value = -15;
            compressor.knee.value = 5;
            compressor.ratio.value = 6;
            compressor.attack.value = 0.001;
            compressor.release.value = 0.05;

            // Layer 1: IMPACT - Heavy thud (cannonball hitting wood)
            const impactOsc = this.audioContext.createOscillator();
            impactOsc.type = 'sine';
            impactOsc.frequency.setValueAtTime(250, now);
            impactOsc.frequency.exponentialRampToValueAtTime(50, now + 0.08);

            const impactGain = this.audioContext.createGain();
            impactGain.gain.setValueAtTime(0, now);
            impactGain.gain.linearRampToValueAtTime(1.0, now + 0.001);
            impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

            // Layer 2: CRACK - Sharp wood breaking
            const crackOsc = this.audioContext.createOscillator();
            crackOsc.type = 'square';
            crackOsc.frequency.setValueAtTime(400, now);
            crackOsc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

            const crackGain = this.audioContext.createGain();
            crackGain.gain.setValueAtTime(0, now);
            crackGain.gain.linearRampToValueAtTime(0.6, now + 0.001);
            crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            // Layer 3: SNAP - High frequency crack noise
            const snapSource = this.audioContext.createBufferSource();
            snapSource.buffer = this.whiteNoiseBuffer;

            const snapFilter = this.audioContext.createBiquadFilter();
            snapFilter.type = 'bandpass';
            snapFilter.frequency.setValueAtTime(4000, now);
            snapFilter.frequency.exponentialRampToValueAtTime(1500, now + 0.08);
            snapFilter.Q.value = 3;

            const snapGain = this.audioContext.createGain();
            snapGain.gain.setValueAtTime(0, now);
            snapGain.gain.linearRampToValueAtTime(0.7, now + 0.001);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            // Layer 4: SPLINTERS - Multiple rapid cracking sounds
            const splintersSource = this.audioContext.createBufferSource();
            splintersSource.buffer = this.createSplinterBuffer(0.4);

            const splintersFilter = this.audioContext.createBiquadFilter();
            splintersFilter.type = 'bandpass';
            splintersFilter.frequency.value = 2000;
            splintersFilter.Q.value = 1;

            const splintersGain = this.audioContext.createGain();
            splintersGain.gain.setValueAtTime(0, now + 0.01);
            splintersGain.gain.linearRampToValueAtTime(0.5, now + 0.03);
            splintersGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            // Layer 5: DEBRIS - Wood fragments falling
            const debrisSource = this.audioContext.createBufferSource();
            debrisSource.buffer = this.createCrackleBuffer(0.5);

            const debrisFilter = this.audioContext.createBiquadFilter();
            debrisFilter.type = 'highpass';
            debrisFilter.frequency.value = 800;

            const debrisGain = this.audioContext.createGain();
            debrisGain.gain.setValueAtTime(0, now + 0.05);
            debrisGain.gain.linearRampToValueAtTime(0.4, now + 0.1);
            debrisGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

            // Layer 6: HULL GROAN - Low resonance of the ship
            const hullOsc = this.audioContext.createOscillator();
            hullOsc.type = 'triangle';
            hullOsc.frequency.setValueAtTime(100 + Math.random() * 30, now);
            hullOsc.frequency.exponentialRampToValueAtTime(40, now + duration);

            const hullGain = this.audioContext.createGain();
            hullGain.gain.setValueAtTime(0, now + 0.02);
            hullGain.gain.linearRampToValueAtTime(0.25, now + 0.05);
            hullGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Layer 7: RATTLE - Wood pieces rattling
            const rattleSource = this.audioContext.createBufferSource();
            rattleSource.buffer = this.pinkNoiseBuffer;
            rattleSource.playbackRate.value = 0.3;

            const rattleFilter = this.audioContext.createBiquadFilter();
            rattleFilter.type = 'bandpass';
            rattleFilter.frequency.value = 600;
            rattleFilter.Q.value = 2;

            const rattleGain = this.audioContext.createGain();
            rattleGain.gain.setValueAtTime(0, now + 0.1);
            rattleGain.gain.linearRampToValueAtTime(0.15, now + 0.15);
            rattleGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            // Connect all through compressor
            impactOsc.connect(impactGain);
            impactGain.connect(compressor);

            crackOsc.connect(crackGain);
            crackGain.connect(compressor);

            snapSource.connect(snapFilter);
            snapFilter.connect(snapGain);
            snapGain.connect(compressor);

            splintersSource.connect(splintersFilter);
            splintersFilter.connect(splintersGain);
            splintersGain.connect(compressor);

            debrisSource.connect(debrisFilter);
            debrisFilter.connect(debrisGain);
            debrisGain.connect(compressor);

            hullOsc.connect(hullGain);
            hullGain.connect(compressor);

            rattleSource.connect(rattleFilter);
            rattleFilter.connect(rattleGain);
            rattleGain.connect(compressor);

            compressor.connect(panner);
            panner.connect(this.masterGain);

            // Start all
            impactOsc.start(now);
            impactOsc.stop(now + 0.15);
            crackOsc.start(now);
            crackOsc.stop(now + 0.1);
            snapSource.start(now);
            snapSource.stop(now + 0.1);
            splintersSource.start(now + 0.01);
            splintersSource.stop(now + 0.5);
            debrisSource.start(now + 0.05);
            debrisSource.stop(now + 0.6);
            hullOsc.start(now);
            hullOsc.stop(now + duration);
            rattleSource.start(now + 0.1);
            rattleSource.stop(now + duration);

            this.trackSound({ impactOsc, impactGain, crackOsc, crackGain, snapSource, snapFilter, snapGain, splintersSource, splintersFilter, splintersGain, debrisSource, debrisFilter, debrisGain, hullOsc, hullGain, rattleSource, rattleFilter, rattleGain, compressor, panner }, duration);
        } catch (error) {
            console.warn('[SoundManager] Failed to play wood impact:', error);
        }
    }

    /**
     * Create splintering sound buffer - rapid wood cracks
     */
    createSplinterBuffer(duration) {
        const bufferSize = Math.floor(this.audioContext.sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Create multiple short crack impulses
        let nextCrack = 0;
        const numCracks = 8 + Math.floor(Math.random() * 6); // 8-14 cracks
        const avgGap = bufferSize / numCracks;

        for (let crack = 0; crack < numCracks; crack++) {
            const crackStart = Math.floor(crack * avgGap + (Math.random() - 0.5) * avgGap * 0.5);
            const crackLength = Math.floor(20 + Math.random() * 60);
            const amplitude = 0.5 + Math.random() * 0.5;

            for (let i = 0; i < crackLength && crackStart + i < bufferSize; i++) {
                // Sharp attack, quick decay
                const env = Math.exp(-i / (crackLength * 0.2));
                data[crackStart + i] = (Math.random() * 2 - 1) * amplitude * env;
            }
        }

        return buffer;
    }

    /**
     * Create crackling/debris noise buffer
     */
    createCrackleBuffer(duration) {
        const bufferSize = Math.floor(this.audioContext.sampleRate * duration);
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Create random impulses at random intervals
        let nextImpulse = 0;
        for (let i = 0; i < bufferSize; i++) {
            if (i >= nextImpulse) {
                // Random impulse
                const impulseLength = Math.floor(10 + Math.random() * 30);
                const amplitude = 0.3 + Math.random() * 0.7;
                for (let j = 0; j < impulseLength && i + j < bufferSize; j++) {
                    data[i + j] = (Math.random() * 2 - 1) * amplitude * (1 - j / impulseLength);
                }
                // Next impulse with random gap
                nextImpulse = i + impulseLength + Math.floor(Math.random() * 100);
            } else {
                data[i] = (Math.random() * 2 - 1) * 0.05; // Quiet between impulses
            }
        }

        return buffer;
    }

    /**
     * Check if we can play a sound
     */
    canPlaySound() {
        if (!this.initialized || this.config.muted) return false;
        if (this.activeSounds.length >= this.config.maxConcurrentSounds) {
            return false;
        }
        return true;
    }

    /**
     * Throttle rapid repeated sounds
     */
    throttleSound(key, minInterval) {
        const now = performance.now() / 1000;
        if (this.lastSoundTimes[key] && now - this.lastSoundTimes[key] < minInterval) {
            return false;
        }
        this.lastSoundTimes[key] = now;
        return true;
    }

    /**
     * Track active sound for cleanup
     */
    trackSound(nodes, duration) {
        this.activeSounds.push(nodes);

        setTimeout(() => {
            this.cleanupSound(nodes);
        }, duration * 1000 + 100);
    }

    /**
     * Clean up audio nodes
     */
    cleanupSound(nodes) {
        try {
            Object.values(nodes).forEach(node => {
                if (node && typeof node.disconnect === 'function') {
                    node.disconnect();
                }
            });

            const index = this.activeSounds.indexOf(nodes);
            if (index > -1) {
                this.activeSounds.splice(index, 1);
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.config.muted = !this.config.muted;
        console.log('[SoundManager] Muted:', this.config.muted);

        if (this.config.muted) {
            this.stopAmbientSounds();
        }

        return this.config.muted;
    }

    /**
     * Stop all ambient sounds
     */
    stopAmbientSounds() {
        if (this.ambientSounds.waves) {
            try {
                Object.values(this.ambientSounds.waves).forEach(node => {
                    if (node && node.stop) node.stop();
                    if (node && node.disconnect) node.disconnect();
                });
            } catch (e) { }
            this.ambientSounds.waves = null;
        }

        if (this.ambientSounds.wind) {
            try {
                Object.values(this.ambientSounds.wind).forEach(node => {
                    if (node && node.stop) node.stop();
                    if (node && node.disconnect) node.disconnect();
                });
            } catch (e) { }
            this.ambientSounds.wind = null;
        }
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.config.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.config.masterVolume;
        }
    }

    /**
     * Get current mute state
     */
    isMuted() {
        return this.config.muted;
    }
}
