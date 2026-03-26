import { getDb, ensureTables } from '../../db';
import { NextResponse } from 'next/server';

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQYVapvyoREErPS7Y_sVrObT3cfIrUCojg1GdX5FjGHaYJne8wr4YkYOfPLWDpSbJxqwWZAKu1qwQ5-/pub?output=csv';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (inQuotes) {
      if (line[i] === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (line[i] === '"') {
        inQuotes = false;
      } else {
        current += line[i];
      }
    } else {
      if (line[i] === '"') {
        inQuotes = true;
      } else if (line[i] === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += line[i];
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  let [month, day, year] = parts;
  if (year.length === 2) year = '20' + year;
  const m = month.padStart(2, '0');
  const d = day.padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export async function GET() {
  try {
    const res = await fetch(SHEET_CSV_URL, { cache: 'no-store' });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch Google Sheet: ' + res.status }, { status: 500 });
    }
    const text = await res.text();
    const lines = text.split('\n').filter(l => l.trim());

    const dataRows = lines.slice(1);

    const speakers = [];
    for (const line of dataRows) {
      const cols = parseCSVLine(line);
      const dateStr = cols[0] || '';
      const date = parseDate(dateStr);
      if (!date) continue;

      const speakerName = cols[1] || '';
      const org = cols[2] || '';
      const title = cols[3] || '';
      const topic = cols[4] || '';
      const recruitedBy = cols[5] || '';
      const recruiterPhone = cols[6] || '';

      const isNoMeeting = speakerName.toUpperCase() === 'NO MEETING';

      speakers.push({
        date,
        speaker: isNoMeeting ? '' : speakerName,
        org: isNoMeeting ? '' : org,
        title: isNoMeeting ? '' : title,
        topic: isNoMeeting ? '' : topic,
        recruitedBy: isNoMeeting ? '' : recruitedBy,
        recruiterPhone: isNoMeeting ? '' : recruiterPhone,
        noMeeting: isNoMeeting,
        reason: isNoMeeting ? (org || 'NO MEETING') : '',
      });
    }

    const sql = getDb();
    await ensureTables(sql);

    await sql`DELETE FROM speakers`;

    let inserted = 0;
    for (const s of speakers) {
      await sql`
        INSERT INTO speakers (date, speaker, org, title, topic, recruited_by, recruiter_phone, no_meeting, reason)
        VALUES (${s.date}, ${s.speaker}, ${s.org}, ${s.title}, ${s.topic}, ${s.recruitedBy}, ${s.recruiterPhone}, ${s.noMeeting}, ${s.reason})
      `;
      inserted++;
    }

    return NextResponse.json({
      message: `Synced ${inserted} speaker entries from Google Sheet`,
      count: inserted,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
