const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const { execSync } = require('child_process');
const obfuscator = require('javascript-obfuscator');

const REPO = 'https://github.com/Warano02/f2bot.git';
const TEMP_DIR = 'tmp';
const ROOT = process.cwd();

// Fichiers à ne pas supprimer
const KEEP = ['Tayc.js',"index.js","src","lib", "main.js","settings.js",".git", 'package.json', "prompt.txt", "Docker",".env.exemple", ".gitignore", "session", 'node_modules', '.env'];

function run(cmd, cwd = process.cwd()) {
  execSync(cmd, { stdio: 'inherit', cwd });
}

function obfuscateAllJS(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      obfuscateAllJS(fullPath);
    } else if (file.endsWith('.js')) {
      const code = fs.readFileSync(fullPath, 'utf8');
      const obfuscated = obfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        stringArray: true,
        rotateStringArray: true,
        stringArrayThreshold: 0.75,
      }).getObfuscatedCode();
      fs.writeFileSync(fullPath, obfuscated);
    }
  }
}

function mergePackageJsons(tempPath) {
  const basePkg = require('./package.json');
  const targetPkgPath = path.join(__dirname, tempPath, 'package.json');
  const targetPkg = require(targetPkgPath);

  const mergedPkg = {
    ...targetPkg,
    dependencies: {
      ...(targetPkg.dependencies || {}),
      ...(basePkg.dependencies || {})
    },
    scripts: {
      start: targetPkg.scripts?.start || 'node index.js'
    }
  };

  fs.writeFileSync(path.join(ROOT, 'package.json'), JSON.stringify(mergedPkg, null, 2));
}

function cleanRootExcept(keepList) {
  fs.readdirSync(ROOT).forEach(file => {
    if (!keepList.includes(file)) {
      const fullPath = path.join(ROOT, file);
      try {
        fse.removeSync(fullPath);
      } catch (err) {
        console.warn(`⚠️ Failed to remove ${file}: ${err.message}`);
      }
    }
  });
}

(async () => {
  console.log('\n📥[TAYC] Starting...');
  console.log('\n[TAYC] 1/3 ...');
  run(`git clone ${REPO} ${TEMP_DIR}`);

  console.log('\n🔐 [TAYC] 2/3 ...');
  obfuscateAllJS(TEMP_DIR);

  console.log('\n📦[TAYC] 3/4 ...');
  mergePackageJsons(TEMP_DIR);

  fse.copySync(TEMP_DIR, ROOT, { overwrite: true });

  cleanRootExcept(KEEP);

  fse.removeSync(TEMP_DIR);

  console.log('📥 Installing dependencies...');
  run('npm install');
  console.log('\n📦[TAYC] 4/4 ...');

  run('npm start');

})();
