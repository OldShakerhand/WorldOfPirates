/**
 * MobileControls.js
 * Handles touch input for mobile devices:
 * - Virtual Joystick (Left) for steering
 * - Action Pad (Right) for sails and combat
 * - Interaction Button
 * - Orientation Lock
 */
class MobileControls {
    constructor() {
        this.touchEnabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.active = false;

        // Input state mirroring the keyboard input
        this.inputState = {
            up: false,
            down: false,
            left: false,
            right: false,
            q: false,
            e: false,
            f: false
        };

        if (this.touchEnabled) {
            this.init();
        }
    }

    init() {
        console.log('[MobileControls] Touch device detected, initializing controls...');
        this.active = true;
        this.createOverlay();
        this.setupOrientationLock();
        this.setupEventListeners();
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'mobile-overlay';
        overlay.innerHTML = `
            <div id="joystick-zone">
                <div id="joystick-base">
                    <div id="joystick-knob"></div>
                </div>
            </div>
            
            <div id="aim-zone">
                <!-- Action Pad -->
                <button id="btn-sail-up" class="action-btn" data-key="up">▲</button>
                <div class="middle-row">
                    <button id="btn-fire-left" class="action-btn side" data-key="q">◀</button>
                    <button id="btn-fire-right" class="action-btn side" data-key="e">▶</button>
                </div>
                <button id="btn-sail-down" class="action-btn" data-key="down">▼</button>
            </div>

            <button id="btn-interact" class="interactive-btn" data-key="f">⚓</button>
        `;
        document.body.appendChild(overlay);

        // References
        this.joystickBase = document.getElementById('joystick-base');
        this.joystickKnob = document.getElementById('joystick-knob');
        this.interactBtn = document.getElementById('btn-interact');
    }

    setupOrientationLock() {
        const lock = document.createElement('div');
        lock.id = 'orientation-lock';
        lock.innerHTML = `
            <div class="msg">
                <div class="icon">📱</div>
                <h2>Please Rotate Device</h2>
                <p>Landscape mode required</p>
            </div>
        `;
        document.body.appendChild(lock);

        const checkOrientation = () => {
            const isPortrait = window.innerHeight > window.innerWidth;
            lock.style.display = isPortrait ? 'flex' : 'none';
        };

        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        checkOrientation();
    }

    setupEventListeners() {
        // Joystick Logic
        const zone = document.getElementById('joystick-zone');
        const knob = this.joystickKnob;
        const base = this.joystickBase;

        // Joystick state
        let joystickActive = false;
        let startX = 0;
        let startY = 0; // Not used for steering but needed for distance calc if we wanted 2D
        const maxDist = 40;

        zone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            joystickActive = true;
            startX = touch.clientX;
            // Visual feedback
            base.style.transform = `scale(1.1)`;
        }, { passive: false });

        zone.addEventListener('touchmove', (e) => {
            if (!joystickActive) return;
            e.preventDefault();
            const touch = e.changedTouches[0];

            const deltaX = touch.clientX - startX;
            // Clamp distance for visual
            const dist = Math.min(Math.abs(deltaX), maxDist);
            const sign = Math.sign(deltaX);

            knob.style.transform = `translateX(${dist * sign}px)`;

            // Update Input State (Threshold based)
            this.inputState.left = deltaX < -10;
            this.inputState.right = deltaX > 10;
        }, { passive: false });

        const endJoystick = (e) => {
            joystickActive = false;
            knob.style.transform = `translateX(0px)`;
            base.style.transform = `scale(1)`;
            this.inputState.left = false;
            this.inputState.right = false;
        };

        zone.addEventListener('touchend', endJoystick);
        zone.addEventListener('touchcancel', endJoystick);

        // Button Logic (Delegation)
        const handleButton = (e, state) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            e.preventDefault();

            const key = btn.dataset.key; // 'up', 'down', 'q', 'e', 'f'
            if (key) {
                this.inputState[key] = state;
                if (state) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        };

        const aimZone = document.getElementById('aim-zone');
        // Add listeners to aimZone and interactBtn
        [aimZone, this.interactBtn].forEach(el => {
            if (!el) return;
            el.addEventListener('touchstart', (e) => handleButton(e, true), { passive: false });
            el.addEventListener('touchend', (e) => handleButton(e, false));
            el.addEventListener('touchcancel', (e) => handleButton(e, false));
            // Prevent mouse emulation
            el.addEventListener('mousedown', (e) => e.preventDefault());
        });
    }

    // Public method to get combined input
    getInputState() {
        return this.inputState;
    }
}

// Export global instance
window.MobileControls = new MobileControls();
