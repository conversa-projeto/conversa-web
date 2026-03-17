import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');
const INDEX_HTML = path.join(process.cwd(), 'index.html');

const colorMap = {
    'slate': 'surface',
    'blue': 'primary',
    'emerald': 'success',
    'rose': 'danger',
    'sky': 'info'
};

const prefixes = 'bg|text|border|ring|divide|from|to|via|stroke|fill';

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;

    // Replace scale colors (e.g. bg-slate-500 -> bg-surface-500)
    for (const [oldName, newName] of Object.entries(colorMap)) {
        const regex = new RegExp(`\\b(${prefixes})-${oldName}-(\\d+)`, 'g');
        content = content.replace(regex, `$1-${newName}-$2`);
    }

    // Replace non-scale colors optionally if they exist (none for these palettes usually, but just in case)
    // Replaces bg-white with bg-surface-base to make background dynamic
    // Note: We leave text-white as text-white so buttons stay white in dark mode.
    content = content.replace(/\bbg-white\b/g, 'bg-surface-base');

    // What about bg-slate-900 or bg-slate-950 that act as dark backgrounds in light mode?
    // They will become bg-surface-900. When dark mode is active, surface-900 maps to a LIGHT color in our flip.
    // This means a sidebar that is dark in light mode will become light in dark mode. 
    // Is this desired? Usually dark UI becomes darker. 
    // Wait, if the sidebar is ALWAYS dark, it should just be hardcoded, or it should use surface-inverted.
    // The sidebar in this app is: `<ChatSidebar class="bg-slate-900">` ? Actually the app is light. 
    // We will let the flip handle it.

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated: ${filePath}`);
    }
}

function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDir(fullPath);
        } else if (fullPath.endsWith('.vue') || fullPath.endsWith('.ts') || fullPath.endsWith('.js') || fullPath.endsWith('.html')) {
            processFile(fullPath);
        }
    }
}

console.log('Starting theme update...');
traverseDir(SRC_DIR);
if (fs.existsSync(INDEX_HTML)) {
    processFile(INDEX_HTML);
}
console.log('Theme update complete!');
