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

    parseContent(markdown, limit = 1) {
        const lines = markdown.split('\n');
        const versions = [];
        let currentVersion = null;
        let currentSection = null;

        // Regex patterns
        const versionRegex = /^## \[(.*?)\](?: - (\d{4}-\d{2}-\d{2}))?/;
        const sectionRegex = /^### (.*)/;

        for (const line of lines) {
            // Check for version header
            const versionMatch = line.match(versionRegex);
            if (versionMatch) {
                // If we were processing a version, save it
                if (currentVersion) {
                    versions.push(currentVersion);
                    if (versions.length >= limit) break;
                }

                // Start new version
                currentVersion = {
                    version: versionMatch[1],
                    date: versionMatch[2] || 'Just now',
                    sections: {}
                };
                currentSection = null;
                continue;
            }

            // If we haven't found a version yet, skip preamble
            if (!currentVersion) continue;

            // Check for section header
            const sectionMatch = line.match(sectionRegex);
            if (sectionMatch) {
                currentSection = sectionMatch[1].trim();
                currentVersion.sections[currentSection] = [];
                continue;
            }

            // Parse list items
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (currentSection && trimmedLine.startsWith('-')) {
                let text = trimmedLine.substring(1).trim();
                const isSubItem = line.startsWith('  ') || line.startsWith('\t');

                if (isSubItem) {
                    const sectionList = currentVersion.sections[currentSection];
                    if (sectionList && sectionList.length > 0) {
                        sectionList[sectionList.length - 1] += `\n  - ${text}`;
                    }
                } else {
                    currentVersion.sections[currentSection].push(text);
                }
            }
        }

        // Push the last version if loop finished normally
        if (currentVersion && versions.length < limit) {
            versions.push(currentVersion);
        }

        return versions;
    }

    getRecent(limit = 3) {
        try {
            const content = fs.readFileSync(this.changelogPath, 'utf8');
            return this.parseContent(content, limit);
        } catch (err) {
            console.error('[ChangelogParser] Error reading changelog:', err);
            return [];
        }
    }

    getLatest() {
        const versions = this.getRecent(1);
        return versions.length > 0 ? versions[0] : null;
    }
}

module.exports = ChangelogParser;
