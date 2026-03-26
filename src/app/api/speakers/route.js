import { getDb, ensureTables } from '../db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`SELECT * FROM speakers ORDER BY date ASC`;
    const speakers = rows.map(r => ({
      id: r.id.toString(),
      date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
      speaker: r.speaker || '',
      org: r.org || '',
      title: r.title || '',
      topic: r.topic || '',
      recruitedBy: r.recruited_by || '',
      recruiterPhone: r.recruiter_phone || '',
      noMeeting: r.no_meeting || false,
      reason: r.reason || '',
    }));
    return NextResponse.json(speakers);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const b = await req.json();
    const result = await sql`
      INSERT INTO speakers (date, speaker, org, title, topic, recruited_by, recruiter_phone, no_meeting, reason)
      VALUES (${b.date}, ${b.speaker || ''}, ${b.org || ''}, ${b.title || ''}, ${b.topic || ''}, ${b.recruitedBy || ''}, ${b.recruiterPhone || ''}, ${b.noMeeting || false}, ${b.reason || ''})
      RETURNING id
    `;
    return NextResponse.json({ id: result[0].id.toString() });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const sql = getDb();
    const b = await req.json();
    await sql`
      UPDATE speakers SET
        date = ${b.date},
        speaker = ${b.speaker || ''},
        org = ${b.org || ''},
        title = ${b.title || ''},
        topic = ${b.topic || ''},
        recruited_by = ${b.recruitedBy || ''},
        recruiter_phone = ${b.recruiterPhone || ''},
        no_meeting = ${b.noMeeting || false},
        reason = ${b.reason || ''},
        updated_at = NOW()
      WHERE id = ${parseInt(b.id)}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const sql = getDb();
    const b = await req.json();
    await sql`DELETE FROM speakers WHERE id = ${parseInt(b.id)}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
