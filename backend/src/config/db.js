require('dotenv').config();

const client = String(process.env.DB_CLIENT || process.env.DATABASE_CLIENT || 'mysql').toLowerCase();

const convertPlaceholders = (sql) => {
  let index = 0;
  let quote = null;
  let result = '';
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const prev = sql[i - 1];
    if ((char === '\'' || char === '"') && prev !== '\\') {
      quote = quote === char ? null : quote || char;
    }
    if (char === '?' && !quote) {
      index += 1;
      result += `$${index}`;
    } else {
      result += char;
    }
  }
  return result;
};

const normalizePostgresSql = (sql, params = []) => {
  let normalized = sql
    .replace(/`/g, '')
    .replace(/DELETE\s+(\w+)\s+FROM\s+(\w+)\s+\1\s+LEFT\s+JOIN\s+devis\s+d\s+ON\s+\1\.document_type='devis'\s+AND\s+\1\.document_id=d\.id\s+LEFT\s+JOIN\s+proformas\s+p\s+ON\s+\1\.document_type='proforma'\s+AND\s+\1\.document_id=p\.id\s+LEFT\s+JOIN\s+factures\s+f\s+ON\s+\1\.document_type='facture'\s+AND\s+\1\.document_id=f\.id\s+WHERE\s+d\.id\s+IS\s+NULL\s+AND\s+p\.id\s+IS\s+NULL\s+AND\s+f\.id\s+IS\s+NULL/gi,
      `DELETE FROM lignes_document l
       WHERE NOT EXISTS (SELECT 1 FROM devis d WHERE l.document_type='devis' AND l.document_id=d.id)
         AND NOT EXISTS (SELECT 1 FROM proformas p WHERE l.document_type='proforma' AND l.document_id=p.id)
         AND NOT EXISTS (SELECT 1 FROM factures f WHERE l.document_type='facture' AND l.document_id=f.id)`)
    .replace(/DELETE\s+r\s+FROM\s+rendezvous\s+r\s+LEFT\s+JOIN\s+interventions\s+i\s+ON\s+i\.rendezvous_id\s+=\s+r\.id\s+WHERE\s+r\.statut\s+=\s+'annule'\s+AND\s+i\.id\s+IS\s+NULL/gi,
      `DELETE FROM rendezvous r
       WHERE r.statut = 'annule'
         AND NOT EXISTS (SELECT 1 FROM interventions i WHERE i.rendezvous_id = r.id)`)
    .replace(/DATE\(date_rdv\)\s*=\s*CURDATE\(\)/gi, 'date_rdv = CURRENT_DATE')
    .replace(/MONTH\(date_facture\)\s*=\s*MONTH\(CURDATE\(\)\)\s+AND\s+YEAR\(date_facture\)\s*=\s*YEAR\(CURDATE\(\)\)/gi,
      'EXTRACT(MONTH FROM date_facture) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date_facture) = EXTRACT(YEAR FROM CURRENT_DATE)')
    .replace(/ORDER BY FIELD\(u\.statut,\s*'nouveau',\s*'vu',\s*'en_cours',\s*'traite',\s*'annule'\),\s*u\.created_at DESC/gi,
      `ORDER BY CASE u.statut
        WHEN 'nouveau' THEN 1
        WHEN 'vu' THEN 2
        WHEN 'en_cours' THEN 3
        WHEN 'traite' THEN 4
        WHEN 'annule' THEN 5
        ELSE 6
       END, u.created_at DESC`)
    .replace(/client_notification_non_lue\s*=\s*IF\(\?,\s*TRUE,\s*client_notification_non_lue\)/gi,
      'client_notification_non_lue = CASE WHEN ? THEN TRUE ELSE client_notification_non_lue END')
    .replace(/client_notification_version\s*=\s*client_notification_version\s*\+\s*IF\(\?,\s*1,\s*0\)/gi,
      'client_notification_version = client_notification_version + CASE WHEN ? THEN 1 ELSE 0 END')
    .replace(/IN\s*\(\?\)/gi, '= ANY(?)')
    .replace(/AFTER\s+\w+/gi, '');

  normalized = convertPlaceholders(normalized);

  if (/^\s*INSERT\s+/i.test(normalized) && !/\bRETURNING\b/i.test(normalized)) {
    normalized += ' RETURNING id';
  }

  return { sql: normalized, params };
};

if (client === 'postgres' || client === 'postgresql' || process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_SIZE || 10),
  });

  const execute = async (executor, sql, params = []) => {
    if (/^\s*SELECT\s+GET_LOCK/i.test(sql)) return [[{ acquired: 1 }]];
    if (/^\s*SELECT\s+RELEASE_LOCK/i.test(sql)) return [[{ released: 1 }]];

    const query = normalizePostgresSql(sql, params);
    const result = await executor.query(query.sql, query.params);
    const meta = {
      affectedRows: result.rowCount,
      insertId: result.rows?.[0]?.id || null,
      rowCount: result.rowCount,
    };
    if (/^\s*INSERT\s+/i.test(sql) || /^\s*UPDATE\s+/i.test(sql) || /^\s*DELETE\s+/i.test(sql) || /^\s*ALTER\s+/i.test(sql)) {
      return [meta, result.fields];
    }
    return [result.rows, result.fields];
  };

  module.exports = {
    query: (sql, params) => execute(pool, sql, params),
    getConnection: async () => {
      const connection = await pool.connect();
      return {
        query: (sql, params) => execute(connection, sql, params),
        beginTransaction: () => connection.query('BEGIN'),
        commit: () => connection.query('COMMIT'),
        rollback: () => connection.query('ROLLBACK'),
        release: () => connection.release(),
      };
    },
    end: () => pool.end(),
    type: 'postgres',
  };
} else {
  const mysql = require('mysql2/promise');
  const dbHost = process.env.DB_HOST === 'localhost'
    ? '127.0.0.1'
    : (process.env.DB_HOST || '127.0.0.1');

  const pool = mysql.createPool({
    host: dbHost,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });
  pool.type = 'mysql';
  module.exports = pool;
}
