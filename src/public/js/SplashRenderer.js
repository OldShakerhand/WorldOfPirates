class SplashRenderer {
    constructor() {
        this.particles = [];
        this.maxParticles = 200;
    }

    /**
     * Trigger a splash effect at the given coordinates
     * @param {number} x - World X position
     * @param {number} y - World Y position
     */
    triggerSplash(x, y) {
        // Create a burst of particles
        const particleCount = 8 + Math.floor(Math.random() * 4); // 8-12 particles

        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 30; // Explosion speed

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 3 + Math.random() * 4,
                alpha: 0.8,
                age: 0,
                maxAge: 0.4 + Math.random() * 0.2 // 0.4 - 0.6 seconds
            });
        }

        // Add a central "ring" or "foam" particle that stays
        this.particles.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            radius: 5,
            startRadius: 5,
            endRadius: 15 + Math.random() * 5,
            alpha: 0.6,
            age: 0,
            maxAge: 0.5,
            isRing: true
        });
    }

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += deltaTime;

            if (p.age >= p.maxAge) {
                this.particles.splice(i, 1);
                continue;
            }

            // Move particles
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;

            // Drag/Friction
            p.vx *= 0.95;
            p.vy *= 0.95;

            // Ring expansion
            if (p.isRing) {
                const progress = p.age / p.maxAge;
                p.radius = p.startRadius + (p.endRadius - p.startRadius) * progress;
            } else {
                // Shrink normal particles
                p.radius *= 0.98;
            }

            // Fade out
            p.alpha = Math.max(0, p.alpha - (deltaTime / p.maxAge));
        }
    }

    draw(ctx) {
        if (this.particles.length === 0) return;

        ctx.save();

        for (const p of this.particles) {
            ctx.fillStyle = `rgba(200, 230, 255, ${p.alpha})`;

            ctx.beginPath();
            if (p.isRing) {
                // Draw expanding ring
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(220, 240, 255, ${p.alpha})`;
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                // Draw droplet
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}
