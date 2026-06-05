const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const installSchema = process.argv.includes('--install-schema');

const main = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL manquant');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const info = await client.query('SELECT current_database() AS database, current_schema() AS schema');

  if (installSchema) {
    const schemaPath = path.resolve(__dirname, '..', 'database.supabase.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
  }

  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  const admins = await client.query('SELECT COUNT(*)::int AS total FROM admins');

  console.log(JSON.stringify({
    connected: true,
    database: info.rows[0].database,
    schema: info.rows[0].schema,
    schemaInstalled: installSchema,
    tables: tables.rows.map(row => row.table_name),
    admins: admins.rows[0].total,
  }, null, 2));

  await client.end();
};

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
