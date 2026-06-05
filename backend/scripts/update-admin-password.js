const { Client } = require('pg');

const main = async () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL manquant');
  if (!process.env.ADMIN_PASSWORD_HASH) throw new Error('ADMIN_PASSWORD_HASH manquant');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const result = await client.query(
    'UPDATE admins SET password = $1 WHERE email = $2',
    [process.env.ADMIN_PASSWORD_HASH, 'admin@diagauto.mg']
  );
  console.log(JSON.stringify({ updated: result.rowCount }));
  await client.end();
};

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
