// Gera src/app/build-info.ts com timestamp do build (fuso de Brasília)
const fs = require('fs');

function brasiliaTimestamp() {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')} BRT`;
}

const ts = brasiliaTimestamp();
fs.writeFileSync(
  'src/app/build-info.ts',
  `// Gerado automaticamente no build — não editar\nexport const BUILD_TIME = '${ts}';\n`,
);
console.log('build-info:', ts);