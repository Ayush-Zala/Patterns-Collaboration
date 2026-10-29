const fs = require('fs');
const path = require('path');

const replaceInDir = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      replaceInDir(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const oldContent = content;
      
      content = content
        .replace(/hover:text-white/g, 'hover:text-foreground')
        .replace(/group-hover:text-white/g, 'group-hover:text-foreground')
        .replace(/focus:text-white/g, 'focus:text-foreground')
        .replace(/data-\[state=active\]:text-white/g, 'data-[state=active]:text-foreground')
        .replace(/data-\[state=checked\]:text-white/g, 'data-[state=checked]:text-foreground');
        
      content = content.replace(/className="([^"]*)"/g, (match, classes) => {
        if (classes.match(/bg-primary|bg-red-|bg-indigo-|bg-emerald-|bg-amber-|bg-blue-|bg-zinc-800|bg-\[#|bg-card/)) {
          return match;
        }
        return 'className="' + classes.replace(/\btext-white\b/g, 'text-foreground') + '"';
      });
      
      if (content !== oldContent) {
        fs.writeFileSync(filePath, content);
        console.log('Updated ' + filePath);
      }
    }
  }
};

try {
  replaceInDir('c:/Users/ACHAL.TRIVEDI/Downloads/patterns-shared-inbox/frontend/components');
  replaceInDir('c:/Users/ACHAL.TRIVEDI/Downloads/patterns-shared-inbox/frontend/app/(app)');
} catch (e) {
  console.error(e);
}
