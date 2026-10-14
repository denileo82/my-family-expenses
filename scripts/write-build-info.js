// Gera src/app/build-info.ts com timestamp do build
const fs = require('fs');
const ts = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
fs.writeFileSync(
  'src/app/build-info.ts',
  `// Gerado automaticamente no build — não editar\nexport const BUILD_TIME = '${ts}';\n`,
);
console.log('build-info:', ts);