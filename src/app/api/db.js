import { neon } from '@neondatabase/serverless';

export function getDb() {
  return neon(process.env.DATABASE_URL);
}

export async function ensureTables(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address1 TEXT DEFAULT '',
      address2 TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      zip TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      join_date DATE DEFAULT CURRENT_DATE,
      last_dues_paid DATE,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS speakers (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      speaker TEXT DEFAULT '',
      org TEXT DEFAULT '',
      title TEXT DEFAULT '',
      topic TEXT DEFAULT '',
      recruited_by TEXT DEFAULT '',
      recruiter_phone TEXT DEFAULT '',
      no_meeting BOOLEAN DEFAULT false,
      reason TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS email_log (
      id SERIAL PRIMARY KEY,
      subject TEXT NOT NULL,
      recipient_count INTEGER NOT NULL DEFAULT 0,
      recipient_emails TEXT DEFAULT '',
      sent_at TIMESTAMP DEFAULT NOW(),
      status TEXT DEFAULT 'sent',
      error TEXT DEFAULT ''
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS inbox_messages (
      id SERIAL PRIMARY KEY,
      from_address TEXT NOT NULL,
      to_address TEXT DEFAULT '',
      subject TEXT DEFAULT '(no subject)',
      body_text TEXT DEFAULT '',
      body_html TEXT DEFAULT '',
      message_id TEXT DEFAULT '',
      is_read BOOLEAN DEFAULT false,
      received_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS email_lists (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      member_ids INTEGER[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  const existing = await sql`SELECT COUNT(*) as count FROM users`;
  if (parseInt(existing[0].count) === 0) {
    await sql`INSERT INTO users (name, username, password) VALUES ('Admin', 'admin', 'admin123')`;
  }
}
