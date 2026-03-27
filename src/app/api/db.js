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
      error TEXT DEFAULT '',
      deleted BOOLEAN DEFAULT false
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
      received_at TIMESTAMP DEFAULT NOW(),
      deleted BOOLEAN DEFAULT false
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
  await sql`
    CREATE TABLE IF NOT EXISTS email_templates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      body_html TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // Safe migrations
  await sql`ALTER TABLE email_log ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false`;

  // Seed default templates if table is empty
  const tCount = await sql`SELECT COUNT(*) as count FROM email_templates`;
  if (parseInt(tCount[0].count) === 0) {
    await sql`
      INSERT INTO email_templates (name, subject, body_html) VALUES
      (
        'Dues Reminder',
        'Annual Dues Reminder — Senior Men''s Club',
        '<p>Dear Member,</p><p>We hope this note finds you well. This is a friendly reminder that your annual dues for the <strong>Senior Men''s Club</strong> are now due.</p><p><strong>Annual Dues: $50.00</strong></p><p>Payment may be made in one of two ways:</p><ul><li>By <strong>check</strong> made payable to <em>Senior Men''s Club</em>, delivered to the club treasurer</li><li>By <strong>cash</strong> at the next scheduled club meeting</li></ul><p>If you have already submitted your payment, please disregard this notice — and thank you!</p><p>Your continued membership means a great deal to our club and community. We look forward to seeing you at our upcoming events.</p><p>Warm regards,<br><strong>The Senior Men''s Club Officers</strong></p>'
      ),
      (
        'Meeting Announcement',
        'Upcoming Meeting — Senior Men''s Club',
        '<p>Dear Member,</p><p>This is a friendly reminder about our upcoming <strong>Senior Men''s Club</strong> meeting. We look forward to seeing everyone there.</p><p>Please check the club calendar for the date, time, and location. If you have any agenda items you would like to bring before the group, kindly contact the club secretary in advance so we can include them on the agenda.</p><p>Your participation and involvement make our meetings worthwhile — we hope to see you there!</p><p>Warm regards,<br><strong>The Senior Men''s Club Officers</strong></p>'
      )
    `;
  }

  const existing = await sql`SELECT COUNT(*) as count FROM users`;
  if (parseInt(existing[0].count) === 0) {
    await sql`INSERT INTO users (name, username, password) VALUES ('Admin', 'admin', 'admin123')`;
  }
}
