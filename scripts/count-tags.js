const fs = require('fs');
const content = fs.readFileSync('src/pages/dashboard/admin-lead/projects/new.js', 'utf8');
const openCount = (content.match(/<motion\.div/g) || []).length;
const closeCount = (content.match(/<\/motion\.div>/g) || []).length;
console.log(`Open: ${openCount}, Close: ${closeCount}`);
if (openCount !== closeCount) {
    process.exit(1);
}
