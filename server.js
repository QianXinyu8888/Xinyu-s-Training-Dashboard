require('dotenv').config();
const express = require('express');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const READ_EVENTS_PY = path.join(__dirname, 'read_events.py');
const READ_EVENTS_SCPT = path.join(__dirname, 'read_events.scpt');
const COROS_SCRIPT = path.join(__dirname, 'get_coros_data_mcp.js');
const MCP_TIMEOUT_WEEKLY = 15000;
const MCP_TIMEOUT_HISTORY = 25000;

// Calendar names (configurable via .env or fallback)
const CAL_COURSE = process.env.CAL_COURSE || '大三下课程表';
const CAL_PLAN = process.env.CAL_PLAN || '训练计划';

// ─── Helpers ───────────────────────────────────────────────────────────────

function readAppleCalendar(calName, startDate, endDate) {
  try {
    const result = execSync(
      `python3 "${READ_EVENTS_PY}" "${calName}" "${startDate}" "${endDate}"`,
      { timeout: 60000 }
    );
    const data = JSON.parse(result.toString());
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function parseCalScptOutput(raw) {
  const events = [];
  const eventRe = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let m;
  while ((m = eventRe.exec(raw)) !== null) {
    const ev = {};
    m[1].replace(/^(DTSTART|DTEND|SUMMARY|DESCRIPTION|UID):(.+)$/gm, (_, k, v) => { ev[k] = v; });
    if (ev.DTSTART) events.push(ev);
  }
  return events;
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function toIcsEvent(ev) {
  return {
    SUMMARY: ev.summary,
    DESCRIPTION: ev.description,
    DTSTART: ev.start.replace(/[-:]/g, '').replace('T', '').slice(0, 15) + '00',
    DTEND:   ev.end.replace(/[-:]/g, '').replace('T', '').slice(0, 15) + '00',
    LOCATION: ev.location || '',
    _time: ev.start ? ev.start.slice(11, 16) + ' - ' + ev.end.slice(11, 16) : '',
  };
}

// ─── Routes (before static, so dynamic embedding works) ───────────────────

// GET / ── Serve index.html with embedded data for offline resilience
app.get('/', (req, res) => {
  const htmlFile = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlFile, 'utf8');
  const today = new Date();
  const todayStr = fmtDate(today);

  // 1. COROS weekly summary (only embed summary sub-object, not full response)
  try {
    const wkData = execSync('node "' + COROS_SCRIPT + '" --weekly', { timeout: MCP_TIMEOUT_WEEKLY });
    const wk = JSON.parse(wkData.toString());
    html = html.replace(/let\s+_embeddedWeekly_\s*=\s*null;?/, `let _embeddedWeekly_ = ${JSON.stringify(wk.summary || {})};`);
  } catch(e) { console.error('Embed weekly failed:', e.message); }

  // 2. COROS training history (too slow for MCP, deferred to client-side loadData)

  // 3. Today's course events from Apple Calendar
  try {
    const result = readAppleCalendar(CAL_COURSE, todayStr, todayStr);
    if (result.ok && result.data.length > 0) {
      const icsEvents = result.data.map(toIcsEvent);
      html = html.replace(/let\s+_embeddedCourse_\s*=\s*\[\s*\];?/, `let _embeddedCourse_ = ${JSON.stringify(icsEvents)};`);
    }
  } catch(e) { /* offline */ }

  // 4. Today's training plan from Apple Calendar
  try {
    const scptResult = execSync(
      `osascript "${READ_EVENTS_SCPT}" "${CAL_PLAN}"`,
      { timeout: 20000 }
    );
    const raw = scptResult.toString().trim();
    if (raw && raw !== '[]' && raw !== '"[]"') {
      const events = parseCalScptOutput(raw);
      if (events.length > 0) {
        html = html.replace(/let\s+_embeddedPlans_\s*=\s*\[\s*\];?/, `let _embeddedPlans_ = ${JSON.stringify(events)};`);
      }
    }
  } catch(e) { /* offline */ }

  res.send(html);
});

// GET /api/course/apple ── Today's course events
app.get('/api/course/apple', (req, res) => {
  const todayStr = fmtDate(new Date());
  const result = readAppleCalendar(CAL_COURSE, todayStr, todayStr);
  if (!result.ok) {
    return res.status(500).json({ error: 'Failed to read calendar', detail: result.error });
  }
  res.json({ events: result.data.map(toIcsEvent) });
});

// GET /api/course/apple/all ── This week's course events (Mon–Sun)
app.get('/api/course/apple/all', (req, res) => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const result = readAppleCalendar(CAL_COURSE, fmtDate(startOfWeek), fmtDate(endOfWeek));
  if (!result.ok) {
    return res.status(500).json({ error: result.error });
  }
  res.json({ events: result.data.map(toIcsEvent) });
});

// GET /api/plans ── Today's training plan
app.get('/api/plans', (req, res) => {
  try {
    const result = execSync(
      `osascript "${READ_EVENTS_SCPT}" "${CAL_PLAN}"`,
      { timeout: 20000 }
    );
    const raw = result.toString().trim();
    if (!raw || raw === '[]' || raw === '"[]"') {
      return res.json({ events: [] });
    }
    const events = parseCalScptOutput(raw);
    res.json({ events });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/weekly ── COROS weekly summary
app.get('/api/weekly', (req, res) => {
  try {
    const data = execSync('node "' + COROS_SCRIPT + '" --weekly', { timeout: MCP_TIMEOUT_WEEKLY });
    res.json(JSON.parse(data.toString()));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/coros ── Composite COROS endpoint (used by index.html loadData)
app.get('/api/coros', (req, res) => {
  const mode = (req.query.mode || '').toLowerCase();
  try {
    const scriptArgs = mode === 'history' ? '--history' : '--weekly';
    const timeout = mode === 'history' ? MCP_TIMEOUT_HISTORY : MCP_TIMEOUT_WEEKLY;
    const data = execSync('node "' + COROS_SCRIPT + '" ' + scriptArgs, { timeout });
    res.json(JSON.parse(data.toString()));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Static files (after dynamic routes) ──────────────────────────────────
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});
