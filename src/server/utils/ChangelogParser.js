/**
 * ChangelogParser.js
 * 
 * RESPONSIBILITY: Read and parse CHANGELOG.md to extract recent changes
 * - Reads valid "Keep a Changelog" format
 * - Extracts "Unreleased" section if present, otherwise latest version
 * - Returns structured data for client display
 */

const fs = require('fs');
const path = require('path');

class ChangelogParser {
    constructor(changelogPath) {
        this.changelogPath = changelogPath;
        this.cache = null;
        this.lastRead = 0;
    }

    /**
     * Get the latest changelog entry
     * @returns {Object|null} Structured changelog data or null if error
     */
    getLatest() {
        // Simple cache (1 minute) to avoid reading file on every connection
        if (this.cache && Date.now() - this.lastRead < 60000) {
            return this.cache;
        }

        try {
            const content = fs.readFileSync(this.changelogPath, 'utf8');
            const parsed = this.parseContent(content);

            if (parsed) {
                this.cache = parsed;
                this.lastRead = Date.now();
                return parsed;
            }
        } catch (err) {
            console.error('[ChangelogParser] Error reading changelog:', err.message);
        }

        return null;
    }

    parseContent(markdown) {
        const lines = markdown.split('\n');
        let version = null;
        let date = null;
        let sections = {};
        let currentSection = null;
        let findingVersion = true;

        // Regex patterns
        const versionRegex = /^## \[(.*?)\](?: - (\d{4}-\d{2}-\d{2}))?/;
        const sectionRegex = /^### (Added|Changed|Fixed|Removed|Deprecated|Security)/;

        for (const line of lines) {
            // Stop if we find the second version header (we only want the latest)
            if (version && versionRegex.test(line)) {
                break;
            }

            // Find first version header
            if (findingVersion) {
                const match = line.match(versionRegex);
                if (match) {
                    version = match[1];
                    date = match[2] || 'Just now'; // Default for Unreleased
                    findingVersion = false;
                }
                continue;
            }

            // Parse sections
            const sectionMatch = line.match(sectionRegex);
            if (sectionMatch) {
                currentSection = sectionMatch[1];
                sections[currentSection] = [];
                continue;
            }

            // Parse list items
            const trimmedLine = line.trim();

            if (currentSection && trimmedLine.startsWith('-')) {
                const text = trimmedLine.substring(1).trim();
                const isSubItem = line.startsWith('  ') || line.startsWith('\t');

                if (isSubItem) {
                    // Handle indented bullets (sub-items) -> Append to last item
                    const lastIdx = sections[currentSection].length - 1;
                    if (lastIdx >= 0) {
                        // Use a marker that client side can easily parse, or keep markdown structure
                        // We use \n  - to preserve it for the client to replace with <br>
                        sections[currentSection][lastIdx] += `\n  - ${text}`;
                    }
                } else {
                    // New top-level item
                    sections[currentSection].push(text);
                }
                continue;
            }
        }

        if (!version) return null;

        return {
            version,
            date,
            sections // { Added: [...], Fixed: [...] }
        };
    }
}

module.exports = ChangelogParser;
