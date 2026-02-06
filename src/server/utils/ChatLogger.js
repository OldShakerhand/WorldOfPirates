const fs = require('fs');
const path = require('path');

/**
 * ChatLogger - Logs all chat messages to daily log files
 * Format: [YYYY-MM-DD HH:MM:SS] [TYPE] PlayerName: message
 */
class ChatLogger {
    constructor() {
        this.logDir = path.join(__dirname, '../../logs/chat');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
            console.log(`[ChatLogger] Created log directory: ${this.logDir}`);
        }
    }

    /**
     * Get current date in YYYY-MM-DD format
     */
    getDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Get current timestamp in HH:MM:SS format
     */
    getTimeString() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * Log a chat message to file
     * @param {Object} message - Chat message object
     * @param {string} message.type - 'player' or 'system'
     * @param {string} message.text - Message text
     * @param {string} [message.playerName] - Player name (for player messages)
     */
    log(message) {
        const dateStr = this.getDateString();
        const timeStr = this.getTimeString();
        const logFile = path.join(this.logDir, `${dateStr}.log`);

        // Format log entry
        let logEntry;
        if (message.type === 'player') {
            logEntry = `[${dateStr} ${timeStr}] [PLAYER] ${message.playerName}: ${message.text}\n`;
        } else {
            logEntry = `[${dateStr} ${timeStr}] [SYSTEM] ${message.text}\n`;
        }

        // Append to log file
        fs.appendFile(logFile, logEntry, (err) => {
            if (err) {
                console.error(`[ChatLogger] Failed to write to log: ${err.message}`);
            }
        });
    }
}

module.exports = ChatLogger;
