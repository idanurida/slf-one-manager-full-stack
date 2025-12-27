const fs = require('fs');
const content = fs.readFileSync('src/pages/dashboard/admin-lead/projects/new.js', 'utf8');
const lines = content.split('\n');

console.log('--- OPENING TAGS ---');
lines.forEach((line, index) => {
    if (line.includes('<motion.div')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});

console.log('\n--- CLOSING TAGS ---');
lines.forEach((line, index) => {
    if (line.includes('</motion.div>')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
