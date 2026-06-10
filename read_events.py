#!/usr/bin/env python3
"""read_events.py - Read events from Apple Calendar and output JSON

Usage: python3 read_events.py "日历名称" [start_date] [end_date]
  dates in YYYY-MM-DD format, defaults to today
Output: JSON array to stdout

Uses JXA (osascript -l JavaScript) for Calendar access.
Note: JXA console.log() outputs to stderr, not stdout.
"""

import subprocess, json, sys, os, tempfile
from datetime import date


def build_jxa_script(cal_name, start_date, end_date):
    """Build JXA script as a Python string (avoids shell escaping)."""
    # Escape single quotes for JavaScript string literal
    cal_name_escaped = cal_name.replace("'", "\\'")
    
    lines = [
        "var app = Application('Calendar')",
        "app.includeStandardAdditions = true",
        "var cals = app.calendars()",
        "var targetCal = null",
        "for (var i = 0; i < cals.length; i++) {",
        "    if (cals[i].name() === '" + cal_name_escaped + "') {",
        "        targetCal = cals[i]",
        "        break",
        "    }",
        "}",
        "if (!targetCal) { console.log(JSON.stringify({error: 'CAL_NOT_FOUND'})); }",
        "else {",
        "    var evts = targetCal.events()",
        "    var output = []",
        "    for (var j = 0; j < evts.length; j++) {",
        "        var evt = evts[j]",
        "        var evtStart = evt.startDate()",
        "        var evtEnd = evt.endDate()",
        "        var y = evtStart.getFullYear()",
        "        var mo = String(evtStart.getMonth() + 1).padStart(2, '0')",
        "        var dy = String(evtStart.getDate()).padStart(2, '0')",
        "        var h = String(evtStart.getHours()).padStart(2, '0')",
        "        var mi = String(evtStart.getMinutes()).padStart(2, '0')",
        "        var dateOnly = y + '-' + mo + '-' + dy",
        "        var startFull = dateOnly + 'T' + h + ':' + mi + ':00'",
        "        if (dateOnly < '" + start_date + "' || dateOnly > '" + end_date + "') continue",
        "        var eh = String(evtEnd.getHours()).padStart(2, '0')",
        "        var emi = String(evtEnd.getMinutes()).padStart(2, '0')",
        "        var endFull = dateOnly + 'T' + eh + ':' + emi + ':00'",
        "        var summary = evt.summary() || ''",
        "        var desc = ''",
        "        try { desc = evt.description() || '' } catch(e) {}",
        "        var location = ''",
        "        try { location = evt.location() || '' } catch(e) {}",
        "        if (!location) {",
        "            var locMatch = desc.match(/地点\\s*[:：]\\s*([^\\n]+)/)",
        "            if (locMatch) { location = locMatch[1].trim() }",
        "        }",
        "        output.push({start: startFull, end: endFull, summary: summary, description: desc, location: location})",
        "    }",
        "    console.log(JSON.stringify(output))",
        "}",
    ]
    return '\n'.join(lines)


def run_read_events(cal_name, start_date, end_date):
    """Run JXA via temp file and parse JSON output."""
    script = build_jxa_script(cal_name, start_date, end_date)
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(script)
        script_path = f.name
    
    try:
        result = subprocess.run(
            ['osascript', '-l', 'JavaScript', script_path],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # JXA console.log() goes to stderr
        raw = result.stderr.strip()
        
        if result.returncode != 0:
            return None, f"osascript error: {result.stderr.strip()[-200:]}"
        
        if not raw:
            return [], None
        
        # Try to parse as JSON
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            # Check for CAL_NOT_FOUND
            try:
                err_obj = json.loads(raw)
                if isinstance(err_obj, dict) and err_obj.get('error') == 'CAL_NOT_FOUND':
                    return [], None
            except json.JSONDecodeError:
                pass
            return None, f"Failed to parse JXA output as JSON: {raw[:200]}"
        
        if isinstance(data, dict) and data.get('error') == 'CAL_NOT_FOUND':
            return [], None
        
        return data, None
        
    finally:
        try:
            os.unlink(script_path)
        except Exception:
            pass


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: read_events.py <calendar_name> [start_date] [end_date]")
        sys.exit(1)
    
    cal_name = sys.argv[1]
    if len(sys.argv) >= 3:
        start_date = sys.argv[2]
    else:
        start_date = date.today().isoformat()
    if len(sys.argv) >= 4:
        end_date = sys.argv[3]
    else:
        end_date = start_date
    
    events, err = run_read_events(cal_name, start_date, end_date)
    if err:
        print(f"Error: {err}", file=sys.stderr)
        sys.exit(1)
    
    print(json.dumps(events, ensure_ascii=False, indent=2))
