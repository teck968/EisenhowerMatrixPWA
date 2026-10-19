import { mkdir, copyFile } from 'node:fs/promises';
const files = ['index.html','styles.css','app.js','data.js','storage.js','matrix.js','sw.js','manifest.webmanifest','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
await mkdir('dist/icons', { recursive: true });
for (const file of files) await copyFile(file, `dist/${file}`);
console.log(`Prepared ${files.length} static files in dist/.`);
