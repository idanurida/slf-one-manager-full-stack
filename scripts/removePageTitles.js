const fs = require('fs');
const path = require('path');

const dashboardDir = path.join(__dirname, '..', 'src', 'pages', 'dashboard');

// Pattern untuk mendeteksi blok H1 yang perlu dihapus
const patterns = [
  // Pattern 1: H1 dengan div wrapper yang berisi judul dan deskripsi
  {
    regex: /(\s*<div[^>]*>\s*\n?\s*<h1[^>]*className="[^"]*text-[^"]*font-[^"]*"[^>]*>[^<]*<\/h1>\s*\n?\s*(?:<p[^>]*>[^<]*<\/p>\s*\n?)?\s*<\/div>)/g,
    name: 'H1 with wrapper div'
  },
  // Pattern 2: Standalone H1 dengan judul halaman
  {
    regex: /(\s*<h1[^>]*className="[^"]*text-(?:xl|2xl|3xl)[^"]*font-(?:bold|semibold)[^"]*"[^>]*>\s*\n?\s*[^<]*\s*\n?\s*<\/h1>)/g,
    name: 'Standalone H1'
  }
];

// Files to skip (backup files, etc.)
const skipPatterns = ['.backup', 'node_modules', '.next'];

function shouldSkipFile(filePath) {
  return skipPatterns.some(pattern => filePath.includes(pattern));
}

function processFile(filePath) {
  if (shouldSkipFile(filePath)) {
    return { skipped: true, file: filePath };
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let changes = [];

    // Cari pattern H1 yang merupakan judul halaman utama
    // Biasanya berada setelah DashboardLayout dan sebelum konten utama
    
    // Pattern untuk menghapus blok judul halaman yang duplikat
    const titleBlockPatterns = [
      // Pattern: <div><h1>Title</h1><p>Description</p></div>
      {
        regex: /<div[^>]*>\s*\n?\s*<h1[^>]*className="[^"]*text-(?:2xl|3xl)[^"]*font-bold[^"]*"[^>]*>\s*\n?\s*[A-Za-z\s&]+\s*\n?\s*<\/h1>\s*\n?\s*<p[^>]*className="[^"]*text-(?:muted-foreground|slate)[^"]*"[^>]*>[^<]*<\/p>\s*\n?\s*<\/div>/g,
        replacement: '',
        name: 'Title block with description'
      },
      // Pattern: Standalone title in header section
      {
        regex: /<div>\s*\n?\s*<h1[^>]*className="[^"]*text-(?:2xl|3xl)[^"]*font-bold[^"]*"[^>]*>\s*\n?\s*(?:Dashboard|Manajemen|Daftar|Kelola|Timeline|Team|Proyek|Jadwal|Komunikasi|Verifikasi|Laporan|Progress|Ringkasan|Selamat)[^<]*<\/h1>\s*\n?\s*(?:<p[^>]*>[^<]*<\/p>\s*\n?)?\s*<\/div>/gi,
        replacement: '',
        name: 'Title section'
      }
    ];

    for (const pattern of titleBlockPatterns) {
      if (pattern.regex.test(content)) {
        const matches = content.match(pattern.regex);
        if (matches) {
          changes.push({ pattern: pattern.name, count: matches.length });
          content = content.replace(pattern.regex, pattern.replacement);
          modified = true;
        }
      }
    }

    if (modified) {
      // Clean up empty lines yang berlebihan
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      fs.writeFileSync(filePath, content, 'utf8');
      return { modified: true, file: filePath, changes };
    }

    return { modified: false, file: filePath };
  } catch (error) {
    return { error: error.message, file: filePath };
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      callback(filePath);
    }
  });
}

console.log('Scanning dashboard pages for duplicate titles...\n');

const results = {
  modified: [],
  skipped: [],
  errors: []
};

walkDir(dashboardDir, (filePath) => {
  const result = processFile(filePath);
  if (result.error) {
    results.errors.push(result);
  } else if (result.skipped) {
    results.skipped.push(result);
  } else if (result.modified) {
    results.modified.push(result);
  }
});

console.log('=== Results ===\n');
console.log(`Modified: ${results.modified.length} files`);
results.modified.forEach(r => {
  console.log(`  - ${path.relative(dashboardDir, r.file)}`);
  r.changes?.forEach(c => console.log(`      ${c.pattern}: ${c.count} matches`));
});

console.log(`\nSkipped: ${results.skipped.length} files`);
console.log(`Errors: ${results.errors.length} files`);
results.errors.forEach(r => console.log(`  - ${r.file}: ${r.error}`));
