// Переключает datasource-провайдер в prisma/schema.prisma между sqlite и postgresql.
// Использование:
//   node scripts/set-db.js sqlite
//   node scripts/set-db.js postgresql
//
// Нужно потому, что Prisma не поддерживает env() в поле provider.

const fs = require('fs');
const path = require('path');

const target = (process.argv[2] || '').toLowerCase();
const allowed = ['sqlite', 'postgresql'];

if (!allowed.includes(target)) {
  console.error(`Укажите провайдер: ${allowed.join(' | ')}`);
  process.exit(1);
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const original = fs.readFileSync(schemaPath, 'utf8');
const updated = original.replace(
  /provider = "(sqlite|postgresql)"/,
  `provider = "${target}"`
);

fs.writeFileSync(schemaPath, updated, 'utf8');
console.log(`Prisma datasource provider -> ${target}`);
