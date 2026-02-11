const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const CHANGELOG_PATH = path.join(__dirname, '../docs/meta/CHANGELOG.md');

// Configuration: Commit type mapping
const TYPE_MAPPING = {
    'feat': '⚔️ Gameplay & Balance',
    'fix': '🔧 Fixes & Polish',
    'chore': '🔧 Fixes & Polish',
    'refactor': '🔧 Fixes & Polish',
    'perf': '🔧 Fixes & Polish',
    'style': '🎨 Visuals & Immersion',
    'docs': null, // Ignored by default
    'test': null
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    red: '\x1b[31m'
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function getGitLog() {
    try {
        // Get last tag
        let lastTag;
        try {
            lastTag = execSync('git describe --tags --abbrev=0', { stdio: 'pipe' }).toString().trim();
            console.log(`${colors.cyan}Last tag found: ${lastTag}${colors.reset}`);
        } catch (e) {
            console.log(`${colors.yellow}No tags found. Fetching all commits.${colors.reset}`);
        }

        let limit = process.argv[2] ? parseInt(process.argv[2]) : null;

        let range;
        if (lastTag) {
            range = `${lastTag}..HEAD`;
        } else {
            // If no tag, default to last 20 commits unless specified
            limit = limit || 20;
            range = 'HEAD';
            console.log(`${colors.yellow}No tags found. Analyzing last ${limit} commits.${colors.reset}`);
        }

        const logCmd = `git log ${range} ${limit ? `-n ${limit}` : ''} --pretty=format:"%h|%an|%ad|%s"`;
        const logOutput = execSync(logCmd, { encoding: 'utf8' });

        return logOutput.split('\n').filter(line => line.trim()).map(line => {
            const [hash, author, date, message] = line.split('|');
            return { hash, author, date, message };
        });

    } catch (e) {
        console.error(`${colors.red}Error fetching git log: ${e.message}${colors.reset}`);
        process.exit(1);
    }
}

async function processCommits(commits) {
    const sections = {
        '🚀 Highlights': [],
        '⚔️ Gameplay & Balance': [],
        '🎨 Visuals & Immersion': [],
        '🔧 Fixes & Polish': []
    };

    console.log(`\n${colors.bright}Found ${commits.length} new commits.${colors.reset}\n`);

    for (const commit of commits) {
        const match = commit.message.match(/^(\w+)(?:\((.*?)\))?: (.*)$/);
        const type = match ? match[1].toLowerCase() : 'other';
        const scope = match ? match[2] : null;
        let desc = match ? match[3] : commit.message;

        // Determine default category
        let category = TYPE_MAPPING[type] || '🔧 Fixes & Polish';

        console.log(`${colors.cyan}[${commit.hash}]${colors.reset} ${commit.message}`);

        // Only ask for Highlight if it's a feature
        let isHighlight = 'n';
        if (type === 'feat') {
            isHighlight = await askQuestion(`   Is this a ${colors.green}Highlight${colors.reset}? (y/n/skip) [n]: `);
        } else if (category) {
            console.log(`   -> Auto-categorized to: ${category}`);
        } else {
            console.log(`   -> Skipped (Ignored type)`);
        }

        if (isHighlight.toLowerCase().startsWith('y')) {
            category = '🚀 Highlights';
            const newDesc = await askQuestion(`   Description [${desc}]: `);
            if (newDesc.trim()) desc = newDesc.trim();
        } else if (isHighlight.toLowerCase() === 'skip') {
            continue;
        } else {
            // If not highlight, allow category change?
            // For simplicity, just use default mapping, but maybe allow skipping?
        }

        if (category) {
            sections[category].push(`- ${scope ? `**${scope}**: ` : ''}${desc}`);
        }
    }

    return sections;
}


async function generateChangelog() {
    const commits = getGitLog();
    if (commits.length === 0) {
        console.log('No new commits found.');
        rl.close();
        return;
    }

    const sections = await processCommits(commits);

    // Ask for version
    const version = await askQuestion(`\n${colors.bright}Enter new version number (e.g. 0.3.2): ${colors.reset}`);
    const date = new Date().toISOString().split('T')[0];

    let content = `\n## [${version}] - ${date}\n\n`;

    const order = [
        '🚀 Highlights',
        '⚔️ Gameplay & Balance',
        '🎨 Visuals & Immersion',
        '🔧 Fixes & Polish'
    ];

    let hasContent = false;
    for (const key of order) {
        if (sections[key].length > 0) {
            content += `### ${key}\n`;
            content += sections[key].join('\n') + '\n\n';
            hasContent = true;
        }
    }

    if (!hasContent) {
        console.log('No categorized changes to write.');
        rl.close();
        return;
    }

    console.log(`\n${colors.green}Generated Content:${colors.reset}\n------------------\n${content}------------------`);
    const confirm = await askQuestion(`Prepend to CHANGELOG.md? (y/n) `);

    if (confirm.toLowerCase().startsWith('y')) {
        const currentContent = fs.readFileSync(CHANGELOG_PATH, 'utf8');
        // valid placement: after the header?
        // Usually after "## [Unreleased]" or at the top if no Unreleased.
        // For now, let's look for the first version header and insert before it.

        // Simple strategy: Replace "## [Unreleased]" with new content + "## [Unreleased]"?
        // Or just insert after the semantic versioning text.

        // Let's check where the first "## [" starts.
        const insertIdx = currentContent.indexOf('## [');
        if (insertIdx !== -1) {
            const newContent = currentContent.slice(0, insertIdx) + content + currentContent.slice(insertIdx);
            fs.writeFileSync(CHANGELOG_PATH, newContent);
            console.log(`${colors.green}Successfully updated CHANGELOG.md!${colors.reset}`);

            // Update package.json
            const packageJsonPath = path.join(__dirname, '../package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            packageJson.version = version;
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            console.log(`${colors.green}Updated package.json to ${version}${colors.reset}`);

            // Git Tagging
            const doTag = await askQuestion(`Commit and create git tag v${version}? (y/n) `);
            if (doTag.toLowerCase().startsWith('y')) {
                try {
                    // Use relative paths for git add to be safe
                    const relChangelog = path.relative(process.cwd(), CHANGELOG_PATH);
                    const relPackage = path.relative(process.cwd(), packageJsonPath);

                    execSync(`git add "${relChangelog}" "${relPackage}"`);
                    execSync(`git commit -m "chore: release v${version}"`);
                    execSync(`git tag v${version}`);
                    console.log(`${colors.green}Successfully created tag v${version}!${colors.reset}`);
                } catch (e) {
                    console.error(`${colors.red}Error creating tag: ${e.message}${colors.reset}`);
                }
            }
        } else {
            console.error('Could not find insertion point in CHANGELOG.md');
        }
    } else {
        console.log('Aborted.');
    }

    rl.close();
}

generateChangelog();
