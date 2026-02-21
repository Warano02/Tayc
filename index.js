const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const { execSync } = require('child_process');
const obfuscator = require('javascript-obfuscator');

const REPO = 'https://github.com/Warano02/f2bot.git';
const TEMP_DIR = 'temp_clone';
const ROOT = process.cwd();

const KEEP = ['Tayc.js',"src", "index.js", 'package.json', "session", 'node_modules', '.env', ".gitignore", ".vscode", "prompt.js"];

function run(cmd, cwd = process.cwd(), silent = false) {
    execSync(cmd, { stdio: silent ? 'ignore' : 'inherit', cwd });
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
    const targetPkgPath = path.join(ROOT, tempPath, 'package.json');
    const targetPkg = require(targetPkgPath);

    const mergedPkg = {
        ...targetPkg,
        dependencies: {
            ...(targetPkg.dependencies || {}),
            ...(basePkg.dependencies || {}),
        },
        scripts: {
            start: targetPkg.scripts?.start || 'node Tayc.js',
        },
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
                console.warn(` Failed to remove ${file}: ${err.message}`);
            }
        }
    });
}


(async () => {
    console.log('\n [TAYC-FAN] Start...');
    run(`git clone ${REPO} ${TEMP_DIR}`, process.cwd(), true);

    console.log('\n [TAYC] Download...');
    obfuscateAllJS(TEMP_DIR);

    fse.copySync(TEMP_DIR, ROOT, { overwrite: true });
    mergePackageJsons(TEMP_DIR);

    cleanRootExcept(KEEP);


    const envPath = path.join(ROOT, '.env');
    if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, `# Bot configuration
# Example:
# SESSION_ID=your_session_id_here
# API_KEY=your_api_key_here
`);
    }

    const promptPath = path.join(ROOT, "prompt.txt")
    if (!fs.existsSync(promptPath)) {
        fs.writeFileSync(promptPath, `Tu t'appelles Tayc, t’es pas un bot classique : t’es un vrai relai pour Warano, ton créateur. Il est entrepreneur, il a du réseau, du flair, et il cherche toujours à capter des opportunités. Ton rôle, c’est simple :

💼 Transformer les conversations en vraies opportunités de business ou de connexion, sans jamais forcer ni paraître fake.

🎙️ Tu dois parler comme Warano : naturel, cool, cash quand il faut, jamais robotique. Si la personne écrit en mode détendu, tu fais pareil. Si c’est plus pro, tu t’adaptes. Tu balances des vrais messages, jamais de tournures trop parfaites ou “assistantes IA”.

✅ Ton rôle dans chaque discussion :
– Créer une vibe dans la discussion, comme un pote qui capte les bonnes vibes ou les bons moves.
– Savoir écouter : tu cherches à comprendre ce que la personne fait, ce qu’elle cherche, ses projets, ses galères ou ses ambitions.
– Repérer les ouvertures : si y'a un besoin, une idée, un projet ou même juste une curiosité, tu le captes.
– Glisser subtilement que Warano peut aider, connecter, proposer un truc. Mais tu le fais smooth, sans forcer.
– Tu peux proposer un appel, un contact direct avec Warano, ou juste dire :
“Tu sais quoi, je sens que toi et Warano vous devriez parler. Je t’le connecte si t’es chaud.”

❌ Évite :
– De répondre comme une IA. Pas de “Bonjour, comment puis-je vous aider aujourd’hui ?”
– Les phrases parfaites qui sonnent robot.
– Les longs blocs chiants à lire. Sois concis, réel, efficace.`)
    }

    fse.removeSync(TEMP_DIR);

    console.log('\n📦 Installing dependencies...');
    run('npm install');

    run("npm start")
})();
