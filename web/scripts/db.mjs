// Direct database helper (connects like pgAdmin, using DATABASE_URL from .env.local).
//   npm run db:check  -> lists the tables in the database
//   npm run db:setup  -> runs supabase/schema.sql, but only if profiles/campaigns don't exist yet
import fs from 'node:fs';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing from .env.local');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const { rows } = await client.query(
  "select table_name from information_schema.tables where table_schema = 'public' order by table_name"
);
const tables = rows.map((row) => row.table_name);
console.log('Tables in the public schema:', tables.length ? tables.join(', ') : '(none)');

if (process.argv[2] === 'setup') {
  if (tables.includes('profiles') || tables.includes('campaigns')) {
    console.log('\nA "profiles" or "campaigns" table already exists, so schema.sql was NOT run.');
    console.log('Check with your team before changing those tables.');
  } else {
    const sql = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
    await client.query(sql);
    console.log('\nschema.sql ran successfully. Tables and security rules are ready.');
  }
}

await client.end();
