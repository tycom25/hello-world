const db = require('./index');

async function migrate() {
  console.log('Running migrations...');
  await db.migrate.latest({ directory: __dirname + '/migrations' });
  console.log('Migrations complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
