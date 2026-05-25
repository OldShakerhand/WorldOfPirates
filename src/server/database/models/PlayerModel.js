const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    lastHarborId: { type: String, default: null }, // Fallback spawn safety
    spawnMode: { type: String, enum: ['HARBOR', 'AT_SEA'], default: 'HARBOR' },
    gold: { type: Number, default: 1000 },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    crewCount: { type: Number, default: 0 },
    fleet: [{
        id: String,
        classId: Number,
        hullHP: Number,
        sailIntegrity: Number,
        cargo: mongoose.Schema.Types.Mixed, // Use Mixed for flexible object
        customName: String
    }],
    lastSaved: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', PlayerSchema);
