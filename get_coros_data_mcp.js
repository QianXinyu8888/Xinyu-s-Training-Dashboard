#!/usr/bin/env node
/**
 * COROS 数据获取脚本 (官方 MCP 版)
 * 
 * 替代旧 get_coros_data.js，使用 COROS 官方 coros-mcp CLI 获取数据。
 * 不再使用逆向 API，不再需要明文密码。
 * 
 * 用法:
 *   node get_coros_data_mcp.js              # 今天
 *   node get_coros_data_mcp.js 20260611    # 指定日期
 *   node get_coros_data_mcp.js --history   # 近180天全部历史
 *   node get_coros_data_mcp.js --weekly    # 本周 Mon→Sun
 * 
 * 输出 JSON 到 stdout，与旧脚本格式兼容，供 Dashboard server/index.html 使用。
 * 
 * ⚠️ 已知差异 vs 旧脚本：
 *   - trainingLoad: MCP 不提供每条活动的 TL 值（前端已有 null 保护，自动隐藏）
 *   - lactateThresholdScore: MCP 不支持（前端未使用此字段）
 *   - 数值来自文本解析，极端短距离(<10m)可能有 1-2m 精度偏差
 */

const { execSync } = require('child_process');

// ─── 运动类型映射（与旧脚本一致） ──────────────────────────────────
const SPORT_MAP = {
  100: { label: "户外跑步", icon: "🏃" },
  101: { label: "室内跑步", icon: "🏃" },
  102: { label: "越野跑", icon: "🌲" },
  103: { label: "跑步机", icon: "🏃" },
  200: { label: "公路骑行", icon: "🚴" },
  201: { label: "室内骑行", icon: "🚴" },
  202: { label: "山地骑行", icon: "🚴" },
  203: { label: "铁人三项", icon: "🔥" },
  204: { label: "砾石骑行", icon: "🚴" },
  300: { label: "泳池游泳", icon: "🏊" },
  301: { label: "开放水域", icon: "🌊" },
  10000: { label: "标铁/半铁", icon: "🔥" },
};
const getSportInfo = (type) => SPORT_MAP[type] || { label: `类型${type}`, icon: "🏃" };

// ─── 日期工具 ──────────────────────────────────────────────────────
function getYYYYMMDD(d) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function getToday() { return getYYYYMMDD(new Date()); }
function parseDateArg(arg) {
  if (!arg || arg === "today") return getToday();
  return arg.replace(/-/g, '');
}

// ─── MCP 调用封装 ─────────────────────────────────────────────────
function mcpCall(tool, argsJson) {
  const cmd = `npx coros-mcp call-tool --tool ${tool} --arguments-json '${JSON.stringify(argsJson)}'`;
  try {
    const raw = execSync(cmd, { timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] });
    const json = JSON.parse(raw.toString());
    if (json.isError) {
      console.error(`⚠️ MCP ${tool} error: ${JSON.stringify(json.content)}`);
      return null;
    }
    // content[0].text is a JSON-encoded string (double-wrapped)
    const text = json.content?.[0]?.text;
    if (!text) return null;
    try { return JSON.parse(text); }
    catch { return text; }
  } catch (e) {
    console.error(`⚠️ MCP ${tool} failed: ${e.message}`);
    return null;
  }
}

// ─── 解析运动记录 ─────────────────────────────────────────────────
/**
 * querySportRecords 输出格式:
 * 
 * Sport Records — 2026-06-06 to 2026-06-11 (2 records)
 * ========================
 * 
 * 1. Pool Swim — 2026-06-11
 *    Location: 泳池游泳
 *    Duration: 37:41 | Distance: 1.50 km
 *    Average Pace: 2:29 /km | Avg HR: 137 bpm | Calories: 253 kcal
 *    LabelId: 478125157091672067 | SportType: 300
 */
function parseSportRecords(text) {
  if (!text) return [];
  
  const records = [];
  // Split by numbered entries
  const blocks = text.split(/\n(?=\d+\.\s)/);
  
  for (const block of blocks) {
    const headerMatch = block.match(/^(\d+)\.\s+(.+?)\s+[—–-]\s+(\d{4}-\d{2}-\d{2})/m);
    if (!headerMatch) continue;
    
    const sportLabel = headerMatch[2].trim();
    const dateStr = headerMatch[3].replace(/-/g, ''); // "2026-06-11" → "20260611"
    
    // Parse detail fields
    const durationMatch = block.match(/Duration:\s*(\d+:\d{2}(?::\d{2})?)/);
    const distanceMatch = block.match(/Distance:\s*([\d.]+)\s*km/);
    const paceMatch = block.match(/Average Pace:\s*([\d:]+)\s*\/km/);
    const hrMatch = block.match(/Avg HR:\s*(\d+)\s*bpm/);
    const calMatch = block.match(/Calories:\s*(\d+)\s*kcal/);
    const labelIdMatch = block.match(/LabelId:\s*(\d+)/);
    const sportTypeMatch = block.match(/SportType:\s*(\d+)/);
    
    const sportType = sportTypeMatch ? parseInt(sportTypeMatch[1]) : null;
    const info = sportType ? getSportInfo(sportType) : { label: sportLabel, icon: "💪" };
    
    // Parse duration
    let durationSec = 0;
    let durationFmt = "--:--";
    if (durationMatch) {
      const parts = durationMatch[1].split(':').map(Number);
      if (parts.length === 3) durationSec = parts[0]*3600 + parts[1]*60 + parts[2];
      else durationSec = parts[0]*60 + parts[1];
      durationFmt = durationMatch[1];
    }
    
    // Parse distance
    let distanceM = 0;
    let distanceFmt = "-";
    if (distanceMatch) {
      distanceM = Math.round(parseFloat(distanceMatch[1]) * 1000);
      distanceFmt = (distanceM / 1000).toFixed(2) + "km";
    }
    
    records.push({
      date: dateStr,
      sportType: sportType,
      sportLabel: info.label,
      sportIcon: info.icon,
      distance: distanceM,
      distanceFmt: distanceFmt,
      duration: durationSec,
      durationFmt: durationFmt,
      pace: paceMatch ? paceMatch[1] + " /km" : null,
      avgHr: hrMatch ? parseInt(hrMatch[1]) : null,
      calories: calMatch ? parseInt(calMatch[1]) : null,
      trainingLoad: null,  // MCP 不提供单条活动 TL
      activityId: labelIdMatch ? labelIdMatch[1] : null,
    });
  }
  
  return records;
}

// ─── 解析体能评估 ─────────────────────────────────────────────────
/**
 * queryFitnessAssessmentOverview 输出格式:
 * 
 * Fitness Assessment
 * ==================
 * VO2max: 62
 * Updated on 2026-06-01
 * Running Level: 89
 * Threshold Pace: 3:20 /km
 * Full Marathon Prediction: 2:22:58
 * Half Marathon Prediction: 1:07:15
 * 10K Prediction: 30:02
 * 5K Prediction: 14:07
 */
function parseFitness(text) {
  if (!text) return {};
  
  const result = {};
  const vo2match = text.match(/VO2max:\s*(\d+)/);
  const runLevel = text.match(/Running Level:\s*(\d+)/);
  const thresholdPace = text.match(/Threshold Pace:\s*([\d:]+)\s*\/km/);
  const marathon = text.match(/Full Marathon Prediction:\s*([\d:]+)/);
  const halfMarathon = text.match(/Half Marathon Prediction:\s*([\d:]+)/);
  const tenK = text.match(/10K Prediction:\s*([\d:]+)/);
  const fiveK = text.match(/5K Prediction:\s*([\d:]+)/);
  
  if (vo2match) result.vo2max = parseInt(vo2match[1]);
  if (runLevel) result.aerobicEnduranceScore = parseInt(runLevel[1]);
  if (thresholdPace) result.thresholdPace = thresholdPace[1] + " /km";
  if (marathon) result.marathonPrediction = marathon[1];
  if (halfMarathon) result.halfMarathonPrediction = halfMarathon[1];
  if (tenK) result.tenKPrediction = tenK[1];
  if (fiveK) result.fiveKPrediction = fiveK[1];
  
  return result;
}

// ─── 解析训练负荷评估 ─────────────────────────────────────────────
/**
 * queryTrainingLoadAssessment 输出格式:
 * 
 * Training Load Assessment
 * ========================
 * 2026-06-12
 * Comment: Decreasing
 * Short-Term Load: 21
 * Long-Term Load: 55
 * Load Ratio: 0.38
 */
function parseLoadAssessment(text) {
  if (!text) return null;
  
  const days = [];
  const blocks = text.split(/\n(?=\d{4}-\d{2}-\d{2}\n)/);
  
  for (const block of blocks) {
    const dateMatch = block.match(/^(\d{4}-\d{2}-\d{2})/m);
    const commentMatch = block.match(/Comment:\s*(.+)/);
    const shortMatch = block.match(/Short-Term Load:\s*([\d.]+)/);
    const longMatch = block.match(/Long-Term Load:\s*([\d.]+)/);
    const ratioMatch = block.match(/Load Ratio:\s*([\d.]+)/);
    
    if (!dateMatch) continue;
    days.push({
      date: dateMatch[1],
      comment: commentMatch?.[1]?.trim() || null,
      shortTermLoad: shortMatch ? parseFloat(shortMatch[1]) : null,
      longTermLoad: longMatch ? parseFloat(longMatch[1]) : null,
      loadRatio: ratioMatch ? parseFloat(ratioMatch[1]) : null,
    });
  }
  
  return days.length > 0 ? days : null;
}

// ─── 主逻辑 ────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || "today";
  const today = getToday();
  
  let startDay, endDay, queryDays;
  
  if (mode === "--weekly") {
    const d = new Date();
    const dayOfWeek = d.getDay() || 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - dayOfWeek + 1);
    startDay = getYYYYMMDD(monday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    endDay = getYYYYMMDD(sunday);
    queryDays = 7;
  } else if (mode === "--history") {
    const d = new Date();
    d.setDate(d.getDate() - 180);
    startDay = getYYYYMMDD(d);
    endDay = today;
    queryDays = 180;
  } else {
    startDay = parseDateArg(mode);
    endDay = startDay;
    queryDays = 1;
  }
  
  console.error(`📊 Fetching COROS data via MCP: ${startDay} ~ ${endDay} (mode: ${mode})`);
  
  const isHistory = mode === '--history';
  
  // 并行获取 MCP 数据：--history 只拉运动记录，跳过体能和负荷（前端不从 history 取 summary）
  const [recordsText, fitnessText, loadText] = await Promise.all([
    Promise.resolve().then(() => mcpCall('querySportRecords', { startDate: startDay, endDate: endDay, timezone: 'Asia/Shanghai' })),
    isHistory ? null : Promise.resolve().then(() => {
      try { return mcpCall('queryFitnessAssessmentOverview', {}); }
      catch (e) { console.error('⚠️ Fitness overview failed:', e.message); return null; }
    }),
    isHistory ? null : Promise.resolve().then(() => {
      try { return mcpCall('queryTrainingLoadAssessment', { days: 7, timezone: 'Asia/Shanghai' }); }
      catch (e) { console.error('⚠️ Load assessment failed:', e.message); return null; }
    }),
  ]);
  
  // 解析
  const activities = typeof recordsText === 'string' ? parseSportRecords(recordsText) : [];
  const fitnessData = typeof fitnessText === 'string' ? parseFitness(fitnessText) : {};
  const loadData = typeof loadText === 'string' ? parseLoadAssessment(loadText) : null;
  
  // 构建兼容旧格式的 summary
  const summary = {
    aerobicEnduranceScore: fitnessData.aerobicEnduranceScore || null,
    vo2max: fitnessData.vo2max || null,
    thresholdPace: fitnessData.thresholdPace || null,
    marathonPrediction: fitnessData.marathonPrediction || null,
    halfMarathonPrediction: fitnessData.halfMarathonPrediction || null,
    tenKPrediction: fitnessData.tenKPrediction || null,
    fiveKPrediction: fitnessData.fiveKPrediction || null,
  };
  
  // 训练负荷摘要（今日）
  const todayLoad = loadData?.find(d => d.date === today.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
  if (todayLoad) {
    summary.trainingLoad = {
      shortTerm: todayLoad.shortTermLoad,
      longTerm: todayLoad.longTermLoad,
      ratio: todayLoad.loadRatio,
      comment: todayLoad.comment,
    };
  } else if (loadData && loadData.length > 0) {
    // fallback: 取最新一条
    const latest = loadData[0];
    summary.trainingLoad = {
      shortTerm: latest.shortTermLoad,
      longTerm: latest.longTermLoad,
      ratio: latest.loadRatio,
      comment: latest.comment,
    };
  }
  
  const output = {
    success: true,
    query: { startDay, endDay, mode },
    timestamp: new Date().toISOString(),
    activities,
    summary,
    trainingPlan: null,
  };
  
  console.log(JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
