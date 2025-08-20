import { Pool } from "pg";

export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
};

let pool: Pool | null = null;
function getPool() {
  if (!pool) {
    // Supabase Postgres typically requires SSL in prod
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } as any });
  }
  return pool;
}

export async function readUsers(): Promise<StoredUser[]> {
  const db = getPool();
  await db.query(
    `CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL
    )`
  );
  const res = await db.query("SELECT id, email, password_hash FROM users ORDER BY email ASC");
  return res.rows.map((r) => ({ id: r.id, email: r.email, passwordHash: r.password_hash }));
}

export async function writeUsers(users: StoredUser[]): Promise<void> {
  const db = getPool();
  await db.query(
    `CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL
    )`
  );
  await db.query("TRUNCATE TABLE users");
  if (users.length === 0) return;
  const values: any[] = [];
  const chunks: string[] = [];
  users.forEach((u, i) => {
    values.push(u.id, u.email, u.passwordHash);
    chunks.push(`($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
  });
  await db.query(`INSERT INTO users (id, email, password_hash) VALUES ${chunks.join(",")}`, values);
}


