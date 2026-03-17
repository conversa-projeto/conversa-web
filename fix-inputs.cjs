const fs = require('fs');
const path = require('path');
const srcDir = path.join(process.cwd(), 'src');

let totalFixed = 0;

function traverse(dir) {
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) traverse(full);
        else if (full.endsWith('.vue')) fix(full);
    }
}

function fix(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Fix broken opacity modifiers - replace /50 and /30 with solid colors
    content = content.replace(/dark:bg-danger-900\/50/g, 'dark:bg-danger-900');
    content = content.replace(/dark:bg-success-900\/50/g, 'dark:bg-success-900');
    content = content.replace(/dark:bg-amber-900\/50/g, 'dark:bg-amber-900');
    content = content.replace(/dark:hover:bg-danger-900\/30/g, 'dark:hover:bg-danger-800');
    content = content.replace(/dark:hover:bg-amber-800\/50/g, 'dark:hover:bg-amber-800');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Fixed: ' + path.relative(process.cwd(), filePath));
        totalFixed++;
    }
}

traverse(srcDir);
console.log('Total files fixed: ' + totalFixed);
console.log('Done!');
