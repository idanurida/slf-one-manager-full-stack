// fix-import-alias.js
const path = require("path");
const fs = require("fs");
const replace = require("replace-in-file");

const SRC_DIR = path.join(__dirname, "src");

function getRelativePath(from, to) {
  let rel = path.relative(path.dirname(from), to).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

function fixImports() {
  const files = [];

  // Cari semua file JS/JSX/TS/TSX di src
  function scan(dir) {
    for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        scan(fullPath);
      } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
        files.push(fullPath);
      }
    }
  }
  scan(SRC_DIR);

  for (const file of files) {
    let content = fs.readFileSync(file, "utf-8");
    const updated = content.replace(/(['"])@\/([^'"]+)\1/g, (match, quote, importPath) => {
      const absoluteTarget = path.join(SRC_DIR, importPath);
      if (fs.existsSync(absoluteTarget) || fs.existsSync(absoluteTarget + ".js") || fs.existsSync(absoluteTarget + ".jsx")) {
        return quote + getRelativePath(file, absoluteTarget) + quote;
      }
      return match; // biarkan kalau tidak ditemukan
    });

    if (updated !== content) {
      fs.writeFileSync(file, updated, "utf-8");
      console.log(`✅ Fixed imports in: ${path.relative(SRC_DIR, file)}`);
    }
  }
}

fixImports();
