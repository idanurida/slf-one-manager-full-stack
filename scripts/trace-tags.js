const fs = require('fs');
const content = fs.readFileSync('src/pages/dashboard/admin-lead/projects/new.js', 'utf8');
const lines = content.split('\n');

let balance = 0;
lines.forEach((line, index) => {
    const openMatches = line.match(/<motion\.div/g) || [];
    const closeMatches = line.match(/<\/motion\.div>/g) || [];
    const selfCloseMatches = line.match(/<motion\.div[^>]*\/>/g) || [];

    // This is a naive check but might help
    balance += openMatches.length;
    balance -= closeMatches.length;
    balance -= selfCloseMatches.length;

    if (openMatches.length > 0 || closeMatches.length > 0 || selfCloseMatches.length > 0) {
        console.log(`${index + 1}: [Balance: ${balance}] ${line.trim()}`);
    }
});
console.log(`Final Balance: ${balance}`);
