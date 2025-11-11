// scripts/fixImports.js
const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '../src');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content
    .replace(/\.\.\/\.\.\/\.\.\/services\/api/g, 'services/api')
    .replace(/\.\.\/\.\.\/services\/api/g, 'services/api');

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Fixed import in: ${filePath}`);
  }
}

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      replaceInFile(fullPath);
    }
  });
}

walk(baseDir);
console.log('🎉 All imports fixed to use alias `services/api`');
