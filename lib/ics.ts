// lib/ics.ts
type IcsOpts = {
  title: string;
  date: string;      // "YYYY-MM-DD"
  time: string;      // "HH:MM"
  durationMinutes: number; // napr. 60
  timezone?: string; // default "Europe/Bratislava"
  location?: string;
  description?: string;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

// pripočíta minúty k "YYYY-MM-DD" + "HH:MM" a vráti nový [date, time]
function addMinutes(date: string, time: string, minutes: number): [string, string] {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm]  = time.split(':').map(Number);

  // spravíme to „bez timezonu“ a iba aritmeticky
  const start = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  const end   = new Date(start.getTime() + minutes * 60_000);

  const ey = end.getUTCFullYear();
  const em = pad(end.getUTCMonth() + 1);
  const ed = pad(end.getUTCDate());
  const eh = pad(end.getUTCHours());
  const eM = pad(end.getUTCMinutes());
  return [`${ey}-${em}-${ed}`, `${eh}:${eM}`];
}

// z "YYYY-MM-DD" + "HH:MM" → "YYYYMMDDTHHMMSS"
function toIcsStamp(date: string, time: string) {
  const [y, m, d] = date.split('-');
  const [hh, mm]  = time.split(':');
  return `${y}${m}${d}T${hh}${mm}00`;
}

export function buildICS(opts: IcsOpts) {
  const tz   = opts.timezone ?? 'Europe/Bratislava';
  const dtStart = toIcsStamp(opts.date, opts.time);
  const [endDate, endTime] = addMinutes(opts.date, opts.time, opts.durationMinutes);
  const dtEnd   = toIcsStamp(endDate, endTime);

  const escape = (s = '') => s.replace(/\r?\n/g, '\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//Lezenie s Nicol//Booking//SK',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:${escape(opts.title)}`,
    `DTSTART;TZID=${tz}:${dtStart}`,
    `DTEND;TZID=${tz}:${dtEnd}`,
    opts.location ? `LOCATION:${escape(opts.location)}` : '',
    opts.description ? `DESCRIPTION:${escape(opts.description)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ].filter(Boolean).join('\r\n');
}
