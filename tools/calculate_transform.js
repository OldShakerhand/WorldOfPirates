const fs = require('fs');

// Original coordinates (from CSV import with old map)
const original = {
    nassau: { x: 43825, y: 11075 },
    eleuthera: { x: 46425, y: 11125 },
    andros: { x: 43175, y: 11725 },
    abaco: { x: 44350, y: 9425 }
};

// Correct coordinates (verified in-game on new map)
const correct = {
    nassau: { x: 41516, y: 10490 },
    eleuthera: { x: 43700, y: 10622 },
    andros: { x: 40655, y: 10676 },
    abaco: { x: 42070, y: 8547 }
};

console.log('=== RECALCULATING TRANSFORMATION WITH 4 DATA POINTS ===\n');

// Calculate transformation using least-squares fit
let sumX = 0, sumY = 0, sumXX = 0, sumYY = 0;
let sumOrigX = 0, sumOrigY = 0, sumCorrX = 0, sumCorrY = 0;
const n = 4;

for (const name of Object.keys(original)) {
    const orig = original[name];
    const corr = correct[name];

    sumX += orig.x * corr.x;
    sumY += orig.y * corr.y;
    sumXX += orig.x * orig.x;
    sumYY += orig.y * orig.y;
    sumOrigX += orig.x;
    sumOrigY += orig.y;
    sumCorrX += corr.x;
    sumCorrY += corr.y;
}

const scaleX = (n * sumX - sumOrigX * sumCorrX) / (n * sumXX - sumOrigX * sumOrigX);
const scaleY = (n * sumY - sumOrigY * sumCorrY) / (n * sumYY - sumOrigY * sumOrigY);
const offsetX = (sumCorrX - scaleX * sumOrigX) / n;
const offsetY = (sumCorrY - scaleY * sumOrigY) / n;

console.log('Transformation (least-squares fit):');
console.log('  scaleX:', scaleX.toFixed(6));
console.log('  scaleY:', scaleY.toFixed(6));
console.log('  offsetX:', offsetX.toFixed(2));
console.log('  offsetY:', offsetY.toFixed(2));

console.log('\nVerification:');
let totalError = 0;
for (const [name, orig] of Object.entries(original)) {
    const testX = orig.x * scaleX + offsetX;
    const testY = orig.y * scaleY + offsetY;
    const target = correct[name];
    const errorX = Math.abs(testX - target.x);
    const errorY = Math.abs(testY - target.y);
    totalError += errorX + errorY;
    console.log(`${name}: (${Math.round(testX)}, ${Math.round(testY)}) vs (${target.x}, ${target.y}) - error: ${errorX.toFixed(1)}px X, ${errorY.toFixed(1)}px Y`);
}

console.log('\nAverage error:', (totalError / (n * 2)).toFixed(1), 'px');

// Export for use in fix script
module.exports = { scaleX, scaleY, offsetX, offsetY };
