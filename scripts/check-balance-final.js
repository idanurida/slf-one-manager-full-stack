const fs = require('fs');
const content = fs.readFileSync('src/pages/dashboard/admin-lead/projects/new.js', 'utf8');

// Regex to find all motion.div openings (block or self-closing)
const allOpens = content.match(/<motion\.div/g) || [];
const allCloses = content.match(/<\/motion\.div>/g) || [];
const selfCloses = content.match(/<motion\.div[^>]*\/>/gs) || []; // Use 's' flag for multi-line

console.log(`Openings (Total): ${allOpens.length}`);
console.log(`Closings (Total): ${allCloses.length}`);
console.log(`Self-Closing (Detected): ${selfCloses.length}`);

const realBlocksNeeded = allOpens.length - selfCloses.length;
console.log(`Real blocks needing closure: ${realBlocksNeeded}`);

if (realBlocksNeeded !== allCloses.length) {
    console.log('❌ MISMATCH DETECTED!');
} else {
    console.log('✅ BALANCED!');
}
