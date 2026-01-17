class WakeRenderer {
    constructor() {
        this.particles = [];
        this.maxParticles = 500; // Performance cap
    }

    /**
     * Update all wake particles (fading, expanding)
     * @param {number} deltaTime - Time in seconds
     */
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += deltaTime;

            if (p.age >= p.maxAge) {
                this.particles.splice(i, 1);
                continue;
            }

            // Expansion
            p.radius += p.expansionRate * deltaTime;

            // Fade out
            p.alpha = p.startAlpha * (1 - (p.age / p.maxAge));
        }
    }

    /**
     * Draw all active wake particles
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (this.particles.length === 0) return;

        ctx.save();

        // Batch drawing for performance? 
        // Simple iteration is usually fine for < 500 particles
        for (const p of this.particles) {
            ctx.fillStyle = `rgba(200, 220, 255, ${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Spawn wake particles for a ship
     * @param {Object} ship - The ship object (player or NPC)
     * @param {Object} shipProps - Dimensions { spriteWidth, spriteHeight }
     * @param {number} deltaTime - Time step to rate-limit spawning
     */
    spawnFor(ship, shipProps, deltaTime) {
        // Only spawn if moving significantly
        const speedThreshold = 2; // Knots
        const speed = ship.speedInKnots || 0;
        if (speed < speedThreshold) return;

        // Reduce density: Propeller look -> Natural wake
        // Only spawn ~30% of frames
        if (Math.random() > 0.3) return;

        // Rate limit: Spawn proportional to speed to avoid gaps
        // Distance covered = speed * dt
        // We want drops every X pixels
        const dropInterval = 15;
        const distanceMoved = ship.speed * deltaTime;

        // Simple probability check if moving slowly relative to frame rate
        // or just spawn every frame if fast enough. 
        // For smoothness, every frame is best, vary size/alpha

        // Calculate stern position (back of ship)
        // Sprite is centered at x,y. Rotation 0 points North (Up, -Y)
        // Stern is at +Y (down) relative to ship center

        // NOTE: ship.rotation 0 = North (-Y). Math.sin/cos expect 0 = East (+X).
        // Standard geometric rotation: angle - PI/2
        const heading = ship.rotation - Math.PI / 2;

        // Stern offset: Half length backwards
        // "Backwards" vector is opposite to heading vector
        const sternDist = (shipProps.spriteHeight / 2) * 0.85; // 85% to be slightly inside/under ship

        const backX = ship.x - Math.cos(heading) * sternDist;
        const backY = ship.y - Math.sin(heading) * sternDist;

        // Wake width based on hull width (hitbox), not full sprite (sails)
        // Default to 0.4 implied width if factor missing
        const hullWidth = shipProps.spriteWidth * (shipProps.hitboxWidthFactor || 0.4);

        // Spawn 1-2 particles
        const count = 1;
        for (let i = 0; i < count; i++) {
            // Random offset constrained to hull width
            const lateralOffset = (Math.random() - 0.5) * (hullWidth * 0.8);
            const perpHeading = heading + Math.PI / 2;

            const pX = backX + Math.cos(perpHeading) * lateralOffset;
            const pY = backY + Math.sin(perpHeading) * lateralOffset;

            this.particles.push({
                x: pX,
                y: pY,
                // Particle size relative to hull width
                radius: (hullWidth * 0.4) * (0.8 + Math.random() * 0.4),
                startAlpha: 0.15 + Math.random() * 0.10, // Softer alpha (0.15-0.25)
                alpha: 0.2,
                age: 0,
                maxAge: 1.0 + Math.random() * 1.0, // Last 1-2 seconds
                expansionRate: 4 + (speed * 0.5) // Faster ships make more turbulent/expanding wake
            });
        }

        // Cap particles
        if (this.particles.length > this.maxParticles) {
            this.particles.shift();
        }
    }
}

// Global instance if needed, or expected to be instantiated by game
// window.WakeRenderer = WakeRenderer; -- implicitly available if script included 
