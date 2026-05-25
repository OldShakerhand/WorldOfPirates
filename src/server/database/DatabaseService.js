const mongoose = require('mongoose');
const PlayerModel = require('./models/PlayerModel');
require('dotenv').config();

class DatabaseService {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.warn('[DB] WARNING: MONGODB_URI not found in .env. Database persistence is disabled.');
            return false;
        }

        try {
            console.log('[DB] Connecting to MongoDB Atlas...');
            await mongoose.connect(uri);
            this.isConnected = true;
            console.log('[DB] Successfully connected to MongoDB Atlas');
            return true;
        } catch (error) {
            console.error('[DB] Failed to connect to MongoDB:', error);
            return false;
        }
    }

    /**
     * Loads a player from the database using their token.
     * If they don't exist, returns null (caller should create new).
     */
    async loadPlayer(token, name) {
        if (!this.isConnected) return null;

        try {
            // Find by token. We update the name just in case they changed it on login screen
            const playerDoc = await PlayerModel.findOneAndUpdate(
                { token },
                { $set: { name } }, // Ensure latest name is saved
                { returnDocument: 'after' }
            );
            
            if (playerDoc) {
                console.log(`[DB] Loaded existing player: ${name} (${token})`);
                return playerDoc.toObject();
            }
            
            console.log(`[DB] No existing save found for: ${name} (${token})`);
            return null;
        } catch (error) {
            console.error(`[DB] Error loading player ${token}:`, error);
            return null;
        }
    }

    /**
     * Upserts a player state into the database.
     * playerData should be an object matching the Mongoose schema.
     */
    async savePlayer(playerData) {
        if (!this.isConnected || !playerData || !playerData.token) return false;

        try {
            playerData.lastSaved = new Date();
            
            await PlayerModel.findOneAndUpdate(
                { token: playerData.token },
                { $set: playerData },
                { upsert: true, returnDocument: 'after' }
            );
            return true;
        } catch (error) {
            console.error(`[DB] Error saving player ${playerData.token}:`, error);
            return false;
        }
    }
}

// Export as singleton
module.exports = new DatabaseService();
