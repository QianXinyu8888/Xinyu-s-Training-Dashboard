require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { readFileSync, readdirSync, statSync } = require('fs');
const { join, basename } = require('path');
const { execSync, execFileSync, execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

const app = express();
const PORT = 3000;
const PLANS_DIR = '/Users/xinyu/Desktop/Xinyu\'s plans';
const COURSE_DIR = join(PLANS_DIR, 'course_schedule');
const COROS_SCRIPT = join(__dirname, 'get_coros_data.js');

app.use(cors());

// Serve index.html with pre-embedded COROS data (bypass fetch)
// IMPORTANT: must come BEFORE static middleware
app.get('/', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const htmlFile = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(htmlFile, 'utf8');
  
  // Embed COROS history + weekly summary inline to survive fetch failures
  try {
    // Embed history
    const histData = execFileSync('node', [COROS_SCRIPT, '--history'], { timeout: 30000, env: { ...process.env } });
    const hist = JSON.parse(histData.toString());
    const histJson = JSON.stringify(hist.activities || []).replace(/</g, '\\u003c');
    html = html.replace('let allHistory = [];', `let allHistory = ${histJson};`);

    // Embed weekly summary (for AE score fallback)
    const wkData = execFileSync('node', [COROS_SCRIPT, '--weekly'], { timeout: 30000, env: { ...process.env } });
    const wk = JSON.parse(wkData.toString());
    const wkJson = JSON.stringify(wk).replace(/</g, '\\u003c');
    html = html.replace('let _embeddedWeekly_ = null;', `let _embeddedWeekly_ = ${wkJson};`);

    // Embed today's course schedule
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const courseFile = join(COURSE_DIR, `course_${yyyy}-${mm}-${dd}.ics`);
      const courseContent = readFileSync(courseFile, 'utf8');
      const courseEvents = parseICS(courseContent);
      const courseJson = JSON.stringify(courseEvents).replace(/</g, '\\u003c');
      const target = 'let _embeddedCourse_ = [];';
      const newVal = `let _embeddedCourse_ = ${courseJson};`;
      const idx = html.indexOf(target);
      console.log('Course: target idx =', idx, 'target len =', target.length, 'html len =', html.length);
      if(idx >= 0) html = html.replace(target, newVal);
      else console.log('Course embed: pattern not found');
    } catch(e) {
      console.error('Course embed error:', e.message);
      // no course file → keep empty
    }
  } catch(e) {
    // keep empty on error
  }
  
  res.type('html').send(html);
});

app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// 解析 .ics 文件
function parseICS(icsContent) {
  const events = [];
  const eventBlocks = icsContent.split('BEGIN:VEVENT');
  
  for (const block of eventBlocks.slice(1)) {
    const event = {};
    const lines = block.split(/\r?\n/);
    let currentKey = '';
    let currentValue = '';
    
    for (const line of lines) {
      if (line.startsWith(' ') && currentKey) {
        currentValue += ' ' + line.trim();
      } else if (line.includes(':')) {
        const [key, ...valueParts] = line.split(':');
        const [mainKey, ...subKeys] = key.split(';');
        
        if (currentKey) {
          event[currentKey] = currentValue.trim();
        }
        currentKey = mainKey;
        currentValue = valueParts.join(':');
      }
    }
    
    if (currentKey) {
      event[currentKey] = currentValue.trim();
    }
    
    if (event.DTSTART) {
      events.push(event);
    }
  }
  
  return events;
}

// API: 获取今日课程表
app.get('/api/course', (req, res) => {
  try {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}${mm}${dd}`;
    const fileName = `course_${yyyy}-${mm}-${dd}.ics`;
    const filePath = join(COURSE_DIR, fileName);
    
    let events = [];
    try {
      const content = readFileSync(filePath, 'utf8');
      events = parseICS(content);
    } catch(e) {
      // File not found or parse error → empty
    }
    
    res.json({ success: true, date: todayStr, events });
  } catch (err) {
    res.json({ success: false, error: err.message, events: [] });
  }
});

// API: 获取最新计划
app.get('/api/plans', (req, res) => {
  try {
    // 按修改时间降序排序（最新文件优先）
    const files = readdirSync(PLANS_DIR)
      .filter(f => f.endsWith('.ics'))
      .sort((a, b) => {
        const tA = statSync(join(PLANS_DIR, a)).mtimeMs;
        const tB = statSync(join(PLANS_DIR, b)).mtimeMs;
        return tB - tA; // 最新文件优先
      });
    
    // 去重：同一天只保留最新文件的事件
    const latestByDate = {};
    for (const file of files) {
      const filePath = join(PLANS_DIR, file);
      const content = readFileSync(filePath, 'utf8');
      const events = parseICS(content);
      for (const ev of events) {
        // 用 DTSTART 提取日期键（兼容 VALUE=DATE 和 DATE-TIME 格式）
        const dateStr = String(ev.DTSTART || '').slice(0, 8); // YYYYMMDD
        if (!latestByDate[dateStr]) {
          latestByDate[dateStr] = { ...ev, _file: file };
        }
      }
    }
    
    const allEvents = Object.values(latestByDate);
    
    // 按日期排序
    allEvents.sort((a, b) => {
      const dateA = a.DTSTART ? new Date(a.DTSTART.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')) : new Date(0);
      const dateB = b.DTSTART ? new Date(b.DTSTART.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')) : new Date(0);
      return dateA - dateB;
    });
    
    res.json({ success: true, events: allEvents });
  } catch (err) {
    res.json({ success: false, error: err.message, events: [] });
  }
});

// API: 获取 COROS 训练数据
// GET /api/coros                  → 今天
// GET /api/coros?date=20260529     → 指定日期
// GET /api/coros?mode=todayplan   → 今天+未来7天训练计划
// GET /api/coros?mode=weekly      → 本周汇总
app.get('/api/coros', async (req, res) => {
  const { date, mode } = req.query;
  let args = '';
  if (mode === 'todayplan') args = '--todayplan';
  else if (mode === 'weekly') args = '--weekly';
  else if (mode === 'history') args = '--history';
  else if (date) args = date;
  else args = 'today';
  
  try {
    const { stdout } = await execFileAsync('node', [COROS_SCRIPT, args], { timeout: 30000, env: { ...process.env } });
    const data = JSON.parse(stdout);
    res.json(data);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏊‍♂️🚴🏃‍♂️ Xinyu's Training Dashboard`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📂 Reading from: ${PLANS_DIR}`);
  console.log(`⌚ COROS API: http://localhost:${PORT}/api/coros`);
});