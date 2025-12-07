const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, '..', 'src', 'pages', 'dashboard');

// Files to skip
const skipFiles = ['.backup', 'node_modules', '.next'];

function shouldSkip(filePath) {
  return skipFiles.some(pattern => filePath.includes(pattern));
}

// Patterns to remove - ordered from most specific to least specific
const replacements = [
  // Pattern 1: Header dengan H1 + deskripsi dalam div wrapper
  {
    find: /<div>\s*\n?\s*<h1[^>]*className="[^"]*text-(?:2xl|3xl)[^"]*font-bold[^"]*"[^>]*>\s*\n?\s*[^<]+\s*\n?\s*<\/h1>\s*\n?\s*<p[^>]*className="[^"]*text-(?:slate|muted)[^"]*"[^>]*>\s*\n?\s*[^<]+\s*\n?\s*<\/p>\s*\n?\s*<\/div>/g,
    replace: '',
    desc: 'H1 + description in div'
  },
  // Pattern 2: Standalone H1 dengan text besar
  {
    find: /<h1[^>]*className="[^"]*text-(?:xl|2xl|3xl)[^"]*font-(?:bold|semibold)[^"]*"[^>]*>\s*\n?\s*(?:Dashboard|Manajemen|Daftar|Kelola|Timeline|Team|Proyek|Jadwal|Komunikasi|Verifikasi|Laporan|Progress|Selamat datang|My Documents|Upload|Edit|Detail|Buat)[^<]*<\/h1>/gi,
    replace: '',
    desc: 'Standalone page title H1'
  }
];

let totalModified = 0;
let totalFiles = 0;

function processFile(filePath) {
  if (shouldSkip(filePath)) return;
  
  totalFiles++;
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changes = [];

  for (const rep of replacements) {
    const matches = content.match(rep.find);
    if (matches && matches.length > 0) {
      changes.push(`${rep.desc}: ${matches.length}`);
      content = content.replace(rep.find, rep.replace);
    }
  }

  // Clean up excessive empty lines
  content = content.replace(/\n{3,}/g, '\n\n');
  
  // Clean up empty div wrappers
  content = content.replace(/<div>\s*\n?\s*<\/div>/g, '');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Modified: ${path.relative(dashboardDir, filePath)}`);
    changes.forEach(c => console.log(`  - ${c}`));
    totalModified++;
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      processFile(filePath);
    }
  }
}

console.log('Removing duplicate page titles...\n');
walkDir(dashboardDir);
console.log(`\nDone! Modified ${totalModified} of ${totalFiles} files.`);
