// ═══════════════════════════════════════════════════════════════════════
// ROULETTE PREDICTOR PRO — popup.js
// 12 Strategy Algorithms + Q-Learning AI Agent
// Manual input only. No auto-spin. No auto-bet.
// ═══════════════════════════════════════════════════════════════════════

'use strict';

// ── Wheel & number constants ───────────────────────────────────────────
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

// Physical European wheel order
const WHEEL = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,
               24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const WPOS  = {};
WHEEL.forEach((n, i) => { WPOS[n] = i; });

// Number classification helpers
const numCol   = n => n === 0 ? 'g' : RED.has(n) ? 'r' : 'b';
const numIsEv  = n => n !== 0 && n % 2 === 0;
const numIsOd  = n => n !== 0 && n % 2 !== 0;
const numIsLo  = n => n >= 1  && n <= 18;
const numIsHi  = n => n >= 19 && n <= 36;
const numDoz   = n => n === 0 ? 0 : n <= 12 ? 1 : n <= 24 ? 2 : 3;
const numColn  = n => n === 0 ? 0 : n % 3 === 0 ? 3 : n % 3;

// Chip display colours
const CBG = { r: '#8a1020', b: '#0e1830', g: '#0a3018' };
const CBD = { r: '#e84060', b: '#34c8e0', g: '#27c97a' };

// Physical wheel neighbours
function wheelNeighbours(n, radius = 2) {
  const p = WPOS[n];
  if (p === undefined) return [];
  const L = WHEEL.length, out = [];
  for (let d = -radius; d <= radius; d++) {
    if (d !== 0) out.push(WHEEL[(p + d + L) % L]);
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════
// 12 PREDICTION STRATEGIES
// Each: spinHistory[] → { numbers[], confidence(0–100), reasoning }  | null
// ═══════════════════════════════════════════════════════════════════════
const STRATEGIES = {

  // ─── 1. HOT NUMBERS ─────────────────────────────────────────────────
  // Rolling 50-spin window. Picks 12 most frequent numbers.
  // Weighted by deviation from expected (expected = window/37).
  'Hot Numbers': (h) => {
    const w = h.slice(-50);
    if (w.length < 5) return null;
    const f = Array(37).fill(0);
    w.forEach(n => f[n]++);
    const exp = w.length / 37;
    const scored = [...Array(37).keys()]
      .map(n => ({ n, sc: f[n] / Math.max(0.01, exp) }))
      .sort((a, b) => b.sc - a.sc);
    const top = scored[0];
    return {
      numbers: scored.slice(0, 12).map(x => x.n),
      confidence: Math.min(90, Math.round(top.sc * 28 + w.length / 4)),
      reasoning: `Top 12 most frequent in last ${w.length} spins. Hottest: ${top.n} at ${f[top.n]}× (${(top.sc * 100).toFixed(0)}% above average). Classic frequency betting.`,
    };
  },

  // ─── 2. COLD NUMBERS ────────────────────────────────────────────────
  // 80-spin window. Least seen numbers — contrarian "due" theory.
  'Cold Numbers': (h) => {
    const w = h.slice(-80);
    if (w.length < 10) return null;
    const f = Array(37).fill(0);
    w.forEach(n => f[n]++);
    const scored = [...Array(37).keys()]
      .map(n => ({ n, f: f[n] }))
      .sort((a, b) => a.f - b.f);
    return {
      numbers: scored.slice(0, 12).map(x => x.n),
      confidence: Math.min(68, Math.round(18 + w.length / 6)),
      reasoning: `12 least-seen numbers in last ${w.length} spins. Coldest: ${scored[0].n} (${scored[0].f} hits). Contrarian gambler's fallacy — "overdue" numbers.`,
    };
  },

  // ─── 3. WHEEL SECTOR BIAS ───────────────────────────────────────────
  // Finds hot pocket clusters on the physical wheel.
  // Each number scored = own freq×2 + sum(4 neighbours freq).
  // Expands top centre to 9 physical neighbours.
  'Wheel Sector Bias': (h) => {
    const w = h.slice(-30);
    if (w.length < 6) return null;
    const f = Array(37).fill(0);
    w.forEach(n => f[n]++);
    const scored = [...Array(37).keys()].map(n => {
      const nbs = wheelNeighbours(n, 2);
      return { n, sc: f[n] * 2 + nbs.reduce((s, x) => s + f[x], 0) };
    }).sort((a, b) => b.sc - a.sc);
    const centre = scored[0].n;
    const sector = [...new Set([centre, ...wheelNeighbours(centre, 4)])].slice(0, 15);
    return {
      numbers: sector,
      confidence: Math.min(85, Math.round(36 + w.length)),
      reasoning: `Hottest wheel sector centred on pocket ${centre} (pos ${WPOS[centre]}). Includes ±4 physical neighbours on actual wheel layout. Ball may be landing in this arc.`,
    };
  },

  // ─── 4. PATTERN REPEAT ──────────────────────────────────────────────
  // Scans spinHistory for the last 3-number sequence.
  // Records what came AFTER each occurrence and predicts those followers.
  // Falls back to 2-number if no 3-matches found.
  'Pattern Repeat': (h) => {
    if (h.length < 8) return null;
    const tryPattern = (seqLen) => {
      const seq = h.slice(-seqLen);
      const found = new Map();
      for (let i = 0; i <= h.length - seqLen - 1; i++) {
        let match = true;
        for (let k = 0; k < seqLen; k++) if (h[i + k] !== seq[k]) { match = false; break; }
        if (match) {
          const nx = h[i + seqLen];
          if (nx !== undefined) found.set(nx, (found.get(nx) || 0) + 1);
        }
      }
      return found;
    };
    let found = tryPattern(3);
    let seqUsed = 3;
    if (found.size === 0) { found = tryPattern(2); seqUsed = 2; }
    if (found.size === 0) return null;
    const sorted = [...found.entries()].sort((a, b) => b[1] - a[1]);
    const total  = sorted.reduce((s, [, c]) => s + c, 0);
    const seq    = h.slice(-seqUsed).join('→');
    return {
      numbers: sorted.slice(0, 12).map(([n]) => n),
      confidence: Math.min(80, Math.round(30 + total * 10)),
      reasoning: `Sequence [${seq}] found ${total}× in spinHistory (${seqUsed}-step). Shows which numbers followed that exact sequence. Pattern continuation bet.`,
    };
  },

  // ─── 5. COLOUR STREAK ───────────────────────────────────────────────
  // Detects current red/black streak length.
  // Streak ≥3: predicts reversal to opposite colour.
  // Streak <3: predicts continuation.
  'Colour Streak': (h) => {
    if (h.length < 5) return null;
    const lastC = numCol(h[h.length - 1]);
    let streak = 0;
    for (let i = h.length - 1; i >= 0; i--) {
      if (numCol(h[i]) === lastC) streak++;
      else break;
    }
    const reversal = streak >= 3;
    const target   = reversal ? (lastC === 'r' ? 'b' : 'r') : lastC;
    const cname    = { r: 'Red', b: 'Black', g: 'Green' };
    const nums     = [...Array(37).keys()].filter(n => numCol(n) === target);
    return {
      numbers: nums,
      confidence: reversal
        ? Math.min(74, 38 + streak * 7)
        : Math.min(54, 26 + streak * 5),
      reasoning: reversal
        ? `${cname[lastC]} streak of ${streak} — statistical reversal to ${cname[target]} predicted. Colour alternation tendency.`
        : `${cname[lastC]} momentum: ${streak} in a row. Predicting continuation before reversal.`,
    };
  },

  // ─── 6. DOZEN ROTATION ──────────────────────────────────────────────
  // 24-spin window. Finds which dozen(s) are underrepresented.
  // Expects roughly 8 hits per dozen per 24 spins.
  'Dozen Rotation': (h) => {
    if (h.length < 10) return null;
    const dozens = h.map(numDoz).filter(d => d > 0);
    if (dozens.length < 6) return null;
    const w  = dozens.slice(-24);
    const cnt = [0, 0, 0, 0];
    w.forEach(d => cnt[d]++);
    const mn  = Math.min(cnt[1], cnt[2], cnt[3]);
    const due = [1, 2, 3].filter(d => cnt[d] === mn);
    const rng = {
      1: Array.from({ length: 12 }, (_, i) => i + 1),
      2: Array.from({ length: 12 }, (_, i) => i + 13),
      3: Array.from({ length: 12 }, (_, i) => i + 25),
    };
    const exp = Math.round(w.length / 3);
    return {
      numbers: due.flatMap(d => rng[d]),
      confidence: Math.min(72, 32 + w.length),
      reasoning: `Dozen ${due.join(' & ')} underrepresented: ${cnt[due[0]]} hits (expected ~${exp} in ${w.length} non-zero spins). Rotation theory — cover the lagging dozen.`,
    };
  },

  // ─── 7. GAP ANALYSIS ────────────────────────────────────────────────
  // Tracks when each number was last seen.
  // Picks 12 numbers with the longest absence.
  // Gap expressed as spins since last appearance.
  'Gap Analysis': (h) => {
    if (h.length < 15) return null;
    const seen = Array(37).fill(-1);
    h.forEach((n, i) => { seen[n] = i; });
    const gaps = [...Array(37).keys()]
      .map(n => ({ n, gap: seen[n] === -1 ? h.length + 99 : h.length - 1 - seen[n] }))
      .sort((a, b) => b.gap - a.gap);
    const topGap = gaps[0];
    return {
      numbers: gaps.slice(0, 12).map(x => x.n),
      confidence: Math.min(76, Math.round(26 + topGap.gap * 1.5)),
      reasoning: `${topGap.n} absent for ${topGap.gap} spins (${Math.round(topGap.gap / h.length * 100)}% of session). Expected every ~37 spins. Gap overdue — absence correction theory.`,
    };
  },

  // ─── 8. EVEN/ODD SHIFT ──────────────────────────────────────────────
  // 20-spin window. Detects even/odd imbalance.
  // >65% one side → predict reversal. Otherwise → predict continuation.
  'Even/Odd Shift': (h) => {
    if (h.length < 8) return null;
    const nz = h.filter(n => n !== 0).slice(-20);
    if (nz.length < 6) return null;
    const ev = nz.filter(numIsEv).length;
    const ep = ev / nz.length;
    let target, reason;
    if (ep > 0.65) {
      target = 'odd';
      reason = `Even dominance: ${Math.round(ep * 100)}% in last ${nz.length} non-zero spins. Odd correction predicted.`;
    } else if (ep < 0.35) {
      target = 'even';
      reason = `Odd dominance: ${Math.round((1 - ep) * 100)}% in last ${nz.length} spins. Even correction predicted.`;
    } else {
      target = ep >= 0.5 ? 'even' : 'odd';
      reason = `Slight ${target} lean (${Math.round((target === 'even' ? ep : 1 - ep) * 100)}%) continuing.`;
    }
    return {
      numbers: [...Array(37).keys()].filter(n => target === 'even' ? numIsEv(n) : numIsOd(n)),
      confidence: Math.min(66, Math.round(24 + Math.abs(ep - 0.5) * 90)),
      reasoning: reason,
    };
  },

  // ─── 9. HIGH/LOW BALANCE ────────────────────────────────────────────
  // 24-spin window on non-zero numbers.
  // Detects imbalance between 1-18 and 19-36, predicts correction.
  'High/Low Balance': (h) => {
    if (h.length < 10) return null;
    const nz = h.filter(n => n !== 0).slice(-24);
    if (nz.length < 8) return null;
    const lc = nz.filter(numIsLo).length;
    const lp = lc / nz.length;
    const target = lp > 0.6 ? 'high' : lp < 0.4 ? 'low' : (lp >= 0.5 ? 'low' : 'high');
    return {
      numbers: [...Array(37).keys()].filter(n => target === 'low' ? numIsLo(n) : numIsHi(n)),
      confidence: Math.min(63, Math.round(22 + Math.abs(lp - 0.5) * 80)),
      reasoning: `${target === 'low' ? '1-18' : '19-36'} predicted. Low: ${lc}, High: ${nz.length - lc} in last ${nz.length} non-zero spins. Range balance correction.`,
    };
  },

  // ─── 10. COLUMN CYCLE ───────────────────────────────────────────────
  // 30-spin window on non-zero numbers.
  // Finds underperforming column(s) and predicts recovery.
  'Column Cycle': (h) => {
    if (h.length < 12) return null;
    const cols = h.map(numColn).filter(c => c > 0).slice(-30);
    if (cols.length < 8) return null;
    const cnt = [0, 0, 0, 0];
    cols.forEach(c => cnt[c]++);
    const mn  = Math.min(cnt[1], cnt[2], cnt[3]);
    const due = [1, 2, 3].filter(c => cnt[c] === mn);
    const CN  = {
      1: [1,4,7,10,13,16,19,22,25,28,31,34],
      2: [2,5,8,11,14,17,20,23,26,29,32,35],
      3: [3,6,9,12,15,18,21,24,27,30,33,36],
    };
    const exp = Math.round(cols.length / 3);
    return {
      numbers: due.flatMap(d => CN[d]),
      confidence: Math.min(67, 28 + cols.length),
      reasoning: `Column ${due.join(' & ')} underperforming: ${cnt[due[0]]} hits (expected ~${exp} in ${cols.length} spins). Column rotation theory.`,
    };
  },

  // ─── 11. RECENCY CLUSTER ────────────────────────────────────────────
  // Takes last 5 numbers and expands to their physical wheel neighbours.
  // Hypothesis: ball dealer/machine may be landing in same physical zone.
  'Recency Cluster': (h) => {
    if (h.length < 5) return null;
    const recent = h.slice(-5);
    const set    = new Set();
    recent.forEach(n => {
      set.add(n);
      wheelNeighbours(n, 2).forEach(x => set.add(x));
    });
    return {
      numbers: [...set].slice(0, 15),
      confidence: Math.min(58, 18 + recent.length * 5),
      reasoning: `Last 5 results [${recent.join(', ')}] plus their ±2 physical wheel neighbours. Cluster/dealer signature approach — recent zone momentum.`,
    };
  },

  // ─── 12. FIBONACCI POSITIONS ────────────────────────────────────────
  // From last number's wheel position, projects Fibonacci-spaced pockets
  // in both directions. Mathematical spacing hypothesis.
  'Fibonacci Positions': (h) => {
    if (h.length < 3) return null;
    const last = h[h.length - 1];
    const pos  = WPOS[last];
    const L    = WHEEL.length;
    const fibs = [1, 1, 2, 3, 5, 8, 13];
    const fw   = fibs.map(f => WHEEL[(pos + f) % L]);
    const bw   = fibs.map(f => WHEEL[(pos - f + L) % L]);
    const nums = [...new Set([...fw, ...bw])].slice(0, 12);
    return {
      numbers: nums,
      confidence: Math.min(52, 15 + h.length / 4),
      reasoning: `Fibonacci-spaced pockets from ${last} (pos ${pos}) on physical wheel. Offsets ±[1,1,2,3,5,8,13]. Mathematical betting pattern.`,
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════
// CONSENSUS ENGINE
// Runs all strategies, weights votes by confidence × specificity.
// Numbers recommended by multiple high-confidence strategies rank highest.
// ═══════════════════════════════════════════════════════════════════════
function runConsensus(history) {
  const votes   = {};
  const results = {};

  for (const [name, fn] of Object.entries(STRATEGIES)) {
    try {
      const r = fn(history);
      results[name] = r;
      if (!r) continue;
      // Specificity bonus: fewer numbers = stronger signal per number
      const weight = r.confidence * (12 / Math.max(1, r.numbers.length));
      r.numbers.forEach(n => {
        votes[n] = (votes[n] || 0) + weight;
      });
    } catch (e) {
      results[name] = null;
    }
  }

  const ranked = Object.entries(votes)
    .map(([n, sc]) => ({ n: parseInt(n), sc }))
    .sort((a, b) => b.sc - a.sc);

  const maxSc       = ranked[0]?.sc || 1;
  const activeCount = Object.values(results).filter(Boolean).length;

  // Produce top predictions (min 12)
  const predictions = ranked.slice(0, Math.max(12, Math.ceil(ranked.length * 0.32))).slice(0, 18).map(x => ({
    number:     x.n,
    color:      numCol(x.n),
    confidence: Math.min(99, Math.round((x.sc / maxSc) * 80 + 12)),
    voteCount:  Object.values(results).filter(r => r?.numbers.includes(x.n)).length,
  }));

  return { predictions, results, activeCount };
}

// ═══════════════════════════════════════════════════════════════════════
// CATEGORY BUILDER
// Scores all outside/inside bet types by how many consensus picks they cover.
// ═══════════════════════════════════════════════════════════════════════
function buildCategories(topNums, history) {
  const w = spinHistory.slice(-20);
  const score = (nums) => {
    if (!nums.length) return 0;
    return nums.filter(n => topNums.includes(n)).length / nums.length;
  };

  const rRate = w.filter(n => numCol(n) === 'r').length / Math.max(1, w.length);
  const eRate = w.filter(numIsEv).length             / Math.max(1, w.length);
  const lRate = w.filter(numIsLo).length             / Math.max(1, w.length);
  const dCnt  = [0,0,0,0]; w.forEach(n => dCnt[numDoz(n)]++);

  const RN = [...Array(37).keys()].filter(n => numCol(n) === 'r');
  const BN = [...Array(37).keys()].filter(n => numCol(n) === 'b');
  const EN = [...Array(37).keys()].filter(numIsEv);
  const ON = [...Array(37).keys()].filter(numIsOd);
  const LN = [...Array(37).keys()].filter(numIsLo);
  const HN = [...Array(37).keys()].filter(numIsHi);
  const D1 = Array.from({ length: 12 }, (_, i) => i + 1);
  const D2 = Array.from({ length: 12 }, (_, i) => i + 13);
  const D3 = Array.from({ length: 12 }, (_, i) => i + 25);
  const C1 = [1,4,7,10,13,16,19,22,25,28,31,34];
  const C2 = [2,5,8,11,14,17,20,23,26,29,32,35];
  const C3 = [3,6,9,12,15,18,21,24,27,30,33,36];

  // Recent bias bonus: underrepresented categories get +0.25
  const cats = [
    { id:'red',   label:'Red (18)',    grp:'COLOUR',    nums:RN, pay:'1:1',  cov:48.6, sc:score(RN) + (rRate < 0.4 ? 0.25 : 0), cl:'#e84060' },
    { id:'black', label:'Black (18)',  grp:'COLOUR',    nums:BN, pay:'1:1',  cov:48.6, sc:score(BN) + (rRate > 0.6 ? 0.25 : 0), cl:'#5090c0' },
    { id:'even',  label:'Even (18)',   grp:'PARITY',    nums:EN, pay:'1:1',  cov:48.6, sc:score(EN) + (eRate < 0.4 ? 0.25 : 0), cl:'#34c8e0' },
    { id:'odd',   label:'Odd (18)',    grp:'PARITY',    nums:ON, pay:'1:1',  cov:48.6, sc:score(ON) + (eRate > 0.6 ? 0.25 : 0), cl:'#9b7fe8' },
    { id:'low',   label:'1–18',        grp:'RANGE',     nums:LN, pay:'1:1',  cov:48.6, sc:score(LN) + (lRate < 0.4 ? 0.25 : 0), cl:'#27c97a' },
    { id:'high',  label:'19–36',       grp:'RANGE',     nums:HN, pay:'1:1',  cov:48.6, sc:score(HN) + (lRate > 0.6 ? 0.25 : 0), cl:'#d4a843' },
    { id:'d1',    label:'1st Dozen',   grp:'DOZEN',     nums:D1, pay:'2:1',  cov:32.4, sc:score(D1) + (dCnt[1] < dCnt[2] && dCnt[1] < dCnt[3] ? 0.2 : 0), cl:'#e8932a' },
    { id:'d2',    label:'2nd Dozen',   grp:'DOZEN',     nums:D2, pay:'2:1',  cov:32.4, sc:score(D2) + (dCnt[2] < dCnt[1] && dCnt[2] < dCnt[3] ? 0.2 : 0), cl:'#e8932a' },
    { id:'d3',    label:'3rd Dozen',   grp:'DOZEN',     nums:D3, pay:'2:1',  cov:32.4, sc:score(D3) + (dCnt[3] < dCnt[1] && dCnt[3] < dCnt[2] ? 0.2 : 0), cl:'#e8932a' },
    { id:'c1',    label:'Column 1',    grp:'COLUMN',    nums:C1, pay:'2:1',  cov:32.4, sc:score(C1), cl:'#6080a0' },
    { id:'c2',    label:'Column 2',    grp:'COLUMN',    nums:C2, pay:'2:1',  cov:32.4, sc:score(C2), cl:'#6080a0' },
    { id:'c3',    label:'Column 3',    grp:'COLUMN',    nums:C3, pay:'2:1',  cov:32.4, sc:score(C3), cl:'#6080a0' },
  ];

  // Best 6-number Line (rows of 6)
  let bestLine = null, bestLineSc = -1;
  for (let r = 1; r <= 31; r += 3) {
    const line = [r,r+1,r+2,r+3,r+4,r+5].filter(n => n <= 36);
    if (line.length === 6) {
      const s = score(line);
      if (s > bestLineSc) { bestLineSc = s; bestLine = line; }
    }
  }
  if (bestLine) cats.push({ id:'line', label:`Line ${bestLine[0]}–${bestLine[5]}`, grp:'LINE(6)', nums:bestLine, pay:'5:1', cov:16.2, sc:bestLineSc, cl:'#34c8e0' });

  // Best Corner (4-number corners)
  const CORNERS = [
    [1,2,4,5],[2,3,5,6],[4,5,7,8],[5,6,8,9],[7,8,10,11],[8,9,11,12],
    [10,11,13,14],[11,12,14,15],[13,14,16,17],[14,15,17,18],[16,17,19,20],[17,18,20,21],
    [19,20,22,23],[20,21,23,24],[22,23,25,26],[23,24,26,27],[25,26,28,29],[26,27,29,30],
    [28,29,31,32],[29,30,32,33],[31,32,34,35],[32,33,35,36],
  ];
  let bestCorner = null, bestCornerSc = -1;
  CORNERS.forEach(c => { const s = score(c); if (s > bestCornerSc) { bestCornerSc = s; bestCorner = c; } });
  if (bestCorner) cats.push({ id:'corner', label:`Corner ${bestCorner.join('/')}`, grp:'CORNER(4)', nums:bestCorner, pay:'8:1', cov:10.8, sc:bestCornerSc, cl:'#9b7fe8' });

  // Best Split (2-number splits)
  const splits = [];
  for (let n = 1; n <= 35; n++) if (n % 3 !== 0 && n + 1 <= 36) splits.push([n, n + 1]);
  for (let n = 1; n <= 33; n++) splits.push([n, n + 3]);
  let bestSplit = null, bestSplitSc = -1;
  splits.forEach(s => { const sc = score(s); if (sc > bestSplitSc) { bestSplitSc = sc; bestSplit = s; } });
  if (bestSplit) cats.push({ id:'split', label:`Split ${bestSplit.join('/')}`, grp:'SPLIT(2)', nums:bestSplit, pay:'17:1', cov:5.4, sc:bestSplitSc, cl:'#e84060' });

  return cats.sort((a, b) => b.sc - a.sc);
}

// ═══════════════════════════════════════════════════════════════════════
// Q-LEARNING AI AGENT
// State: last 3 numbers encoded + colour/dozen/parity trends
// Actions: each of the 18 bet categories
// Reward: +1 if action's numbers covered the winning number, -0.1 miss
// ═══════════════════════════════════════════════════════════════════════
const QAGENT = {
  alpha:   0.15,   // learning rate
  gamma:   0.90,   // discount factor
  epsilon: 0.90,   // initial exploration rate (decays)
  epsilonMin: 0.05,
  epsilonDecay: 0.97,
  qtable:  {},     // state → { action → value }
  updates: 0,

  // Encode current state from last 3 results + trends
  encode(h) {
    if (h.length < 3) return 'INIT';
    const last3 = h.slice(-3);
    const cols  = last3.map(n => numCol(n)[0]).join('');
    const dozs  = last3.map(n => String(numDoz(n))).join('');
    // Colour trend in last 8
    const w8    = h.slice(-8);
    const rTrend = w8.filter(n => numCol(n) === 'r').length > 4 ? 'H' : 'L'; // red heavy or light
    // Even trend
    const eTrend = w8.filter(n => n !== 0).filter(numIsEv).length > 4 ? 'E' : 'O';
    // Dozen with highest recent frequency
    const dCnt = [0,0,0,0]; w8.forEach(n => dCnt[numDoz(n)]++);
    const hotD = dCnt.indexOf(Math.max(...dCnt.slice(1))) + 1; // 1,2,3 only
    return `${cols}|${dozs}|${rTrend}${eTrend}${hotD}`;
  },

  // Get Q-value for state+action
  q(state, action) {
    if (!this.qtable[state]) return 0;
    return this.qtable[state][action] || 0;
  },

  // Update Q-table after seeing outcome (Bellman update)
  learn(prevState, action, reward, nextState, actions) {
    if (!this.qtable[prevState]) this.qtable[prevState] = {};
    const maxNext = actions.reduce((mx, a) => Math.max(mx, this.q(nextState, a)), -Infinity);
    const current = this.q(prevState, action);
    this.qtable[prevState][action] = current + this.alpha * (reward + this.gamma * maxNext - current);
    this.updates++;
    // Decay epsilon
    this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
  },

  // Get best actions from current state (greedy)
  bestActions(state, actions, topN = 5) {
    return actions
      .map(a => ({ action: a, qval: this.q(state, a) }))
      .sort((a, b) => b.qval - a.qval)
      .slice(0, topN);
  },

  stateCount() {
    return Object.keys(this.qtable).length;
  },
};

// Action list matching bet categories
const AI_ACTIONS = ['red','black','even','odd','low','high','d1','d2','d3','c1','c2','c3','line','corner','split','hot12','sector','fibonacci'];

// Train agent on full spinHistory
function trainAgent(history) {
  if (spinHistory.length < 4) return;

  // Build coverage maps for each action
  const RN = [...Array(37).keys()].filter(n => numCol(n) === 'r');
  const BN = [...Array(37).keys()].filter(n => numCol(n) === 'b');
  const EN = [...Array(37).keys()].filter(numIsEv);
  const ON = [...Array(37).keys()].filter(numIsOd);
  const LN = [...Array(37).keys()].filter(numIsLo);
  const HN = [...Array(37).keys()].filter(numIsHi);
  const D1 = Array.from({ length: 12 }, (_, i) => i + 1);
  const D2 = Array.from({ length: 12 }, (_, i) => i + 13);
  const D3 = Array.from({ length: 12 }, (_, i) => i + 25);
  const C1 = [1,4,7,10,13,16,19,22,25,28,31,34];
  const C2 = [2,5,8,11,14,17,20,23,26,29,32,35];
  const C3 = [3,6,9,12,15,18,21,24,27,30,33,36];

  // Replay all transitions in history
  for (let i = 3; i < spinHistory.length - 1; i++) {
    const slice  = spinHistory.slice(0, i);
    const state  = QAGENT.encode(slice);
    const result = history[i];
    const nextSl = spinHistory.slice(0, i + 1);
    const nxSt   = QAGENT.encode(nextSl);

    // Dynamic action coverage
    const f = Array(37).fill(0);
    slice.slice(-50).forEach(n => f[n]++);
    const hot12 = [...Array(37).keys()].sort((a,b) => f[b]-f[a]).slice(0,12);
    const topN  = slice[slice.length-1];
    const sector = [...new Set([topN, ...wheelNeighbours(topN,4)])].slice(0,15);
    const lastPos = WPOS[topN];
    const fibs = [1,1,2,3,5,8,13];
    const fibNums = [...new Set([...fibs.map(f2=>WHEEL[(lastPos+f2)%37]),...fibs.map(f2=>WHEEL[(lastPos-f2+37)%37])])];

    const COV = { red:RN,black:BN,even:EN,odd:ON,low:LN,high:HN,d1:D1,d2:D2,d3:D3,c1:C1,c2:C2,c3:C3,line:D1,corner:D1,split:D1,hot12,sector,fibonacci:fibNums };

    // Choose action (epsilon-greedy)
    let action;
    if (Math.random() < QAGENT.epsilon) {
      action = AI_ACTIONS[Math.floor(Math.random() * AI_ACTIONS.length)];
    } else {
      action = QAGENT.bestActions(state, AI_ACTIONS, 1)[0]?.action || AI_ACTIONS[0];
    }

    const hit    = (COV[action] || []).includes(result);
    const reward = hit ? 1 : -0.1;
    QAGENT.learn(state, action, reward, nxSt, AI_ACTIONS);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// STATE — spinHistory array persisted to chrome.storage.local
// ═══════════════════════════════════════════════════════════════════════
let spinHistory = [];

function loadHistory() {
  return new Promise(ok => {
    chrome.storage.local.get(['rp_history', 'rp_qtable', 'rp_epsilon', 'rp_updates'], d => {
      spinHistory = d.rp_history || [];
      if (d.rp_qtable)  QAGENT.qtable  = d.rp_qtable;
      if (d.rp_epsilon) QAGENT.epsilon = d.rp_epsilon;
      if (d.rp_updates) QAGENT.updates = d.rp_updates;
      ok();
    });
  });
}

function saveHistory() {
  chrome.storage.local.set({
    rp_history: spinHistory,
    rp_qtable:  QAGENT.qtable,
    rp_epsilon: QAGENT.epsilon,
    rp_updates: QAGENT.updates,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// NUMPAD BUILDER
// ═══════════════════════════════════════════════════════════════════════
function buildNumpad() {
  const pad = document.getElementById('numpad');
  for (let n = 0; n <= 36; n++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'np-btn np-' + numCol(n);
    btn.textContent = n;
    btn.dataset.num = n;
    pad.appendChild(btn);
  }
  // Single delegated listener on pad (much safer than per-button)
  pad.addEventListener('click', (e) => {
    const btn = e.target.closest('.np-btn');
    if (!btn) return;
    addNumber(parseInt(btn.dataset.num, 10));
  });
}

// ═══════════════════════════════════════════════════════════════════════
// CORE ACTIONS
// ═══════════════════════════════════════════════════════════════════════
function addNumber(n) {
  if (isNaN(n) || n < 0 || n > 36) return;
  // Train agent before adding (needs pre-add state)
  if (spinHistory.length >= 4) {
    const state  = QAGENT.encode(spinHistory);
    const nextH  = [...spinHistory, n];
    const nxSt   = QAGENT.encode(nextH);
    // Use best current action and observe reward
    const best   = QAGENT.bestActions(state, AI_ACTIONS, 1)[0];
    if (best) {
      const f = Array(37).fill(0);
      spinHistory.slice(-50).forEach(x => f[x]++);
      const hot12 = [...Array(37).keys()].sort((a,b) => f[b]-f[a]).slice(0,12);
      const COV_SIMPLE = {
        red:[...Array(37).keys()].filter(x=>numCol(x)==='r'),
        black:[...Array(37).keys()].filter(x=>numCol(x)==='b'),
        even:[...Array(37).keys()].filter(numIsEv),
        odd:[...Array(37).keys()].filter(numIsOd),
        low:[...Array(37).keys()].filter(numIsLo),
        high:[...Array(37).keys()].filter(numIsHi),
        d1:Array.from({length:12},(_,i)=>i+1),
        d2:Array.from({length:12},(_,i)=>i+13),
        d3:Array.from({length:12},(_,i)=>i+25),
        hot12,
      };
      const hitSet = COV_SIMPLE[best.action] || hot12;
      const reward = hitSet.includes(n) ? 1 : -0.1;
      QAGENT.learn(state, best.action, reward, nxSt, AI_ACTIONS);
    }
  }
  spinHistory.push(n);
  saveHistory();
  renderAll();
  // If predictions were already showing, auto-refresh them with new number
  if (predictionsGenerated && spinHistory.length >= 5) {
    runPredictions();
  }
  // Clear input and refocus
  const inp = document.getElementById('num-input');
  inp.value = '';
  inp.focus();
}

function undoLast() {
  if (spinHistory.length === 0) return;
  spinHistory.pop();
  saveHistory();
  renderAll();
  if (predictionsGenerated && spinHistory.length >= 5) runPredictions();
  else if (spinHistory.length < 5) { hideEl('pred-content'); showEl('pred-need'); }
}

function clearAll() {
  if (spinHistory.length === 0) return;
  if (!confirm(`Clear all ${spinHistory.length} recorded numbers and reset AI? This cannot be undone.`)) return;
  spinHistory = [];
  predictionsGenerated = false;
  lastPredictTime = null;
  QAGENT.qtable  = {};
  QAGENT.epsilon = 0.9;
  QAGENT.updates = 0;
  saveHistory();
  renderAll();
  hideEl('pred-content'); showEl('pred-need');
}

function exportCSV() {
  if (!spinHistory.length) return;
  const rows = ['Spin,Number,Color,OddEven,Range,Dozen,Column'];
  spinHistory.forEach((n, i) => {
    rows.push([
      i + 1, n,
      { r:'Red', b:'Black', g:'Green' }[numCol(n)],
      n === 0 ? '—' : numIsEv(n) ? 'Even' : 'Odd',
      n === 0 ? '—' : numIsLo(n) ? '1-18' : '19-36',
      ['—','1st','2nd','3rd'][numDoz(n)],
      numColn(n) === 0 ? '—' : `Col${numColn(n)}`,
    ].join(','));
  });
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `roulette_history_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════
// RENDER — all UI updates
// ═══════════════════════════════════════════════════════════════════════
function renderAll() {
  renderHeader();
  renderStrip();
  renderPredict();
  renderStrategies();
  renderAI();
  renderAnalysis();
  renderHistory();
}

// ── Header ─────────────────────────────────────────────────────────────
function renderHeader() {
  document.getElementById('hdr-count').textContent = spinHistory.length;
}

// ── History strip ──────────────────────────────────────────────────────
function renderStrip() {
  const strip = document.getElementById('hstrip');
  const empty = document.getElementById('hstrip-empty');
  if (!spinHistory.length) {
    empty.style.display = '';
    // Remove all chips
    strip.querySelectorAll('.hchip').forEach(c => c.remove());
    return;
  }
  empty.style.display = 'none';
  // Rebuild chips (reversed — newest first)
  const existing = [...strip.querySelectorAll('.hchip')];
  // Efficient: only rebuild if needed
  const needed = spinHistory.length;
  if (existing.length !== needed) {
    strip.querySelectorAll('.hchip').forEach(c => c.remove());
    const frag = document.createDocumentFragment();
    [...spinHistory].reverse().forEach((n, ri) => {
      const idx = spinHistory.length - 1 - ri;
      const c   = numCol(n);
      const chip = document.createElement('span');
      chip.className    = 'hchip' + (ri === 0 ? ' newest' : '');
      chip.style.background   = CBG[c];
      chip.style.borderColor  = CBD[c];
      chip.title  = `Spin #${idx + 1} · Click to remove`;
      chip.dataset.idx = idx;
      chip.textContent = n;
      frag.appendChild(chip);
    });
    strip.appendChild(frag);
    // Delegated click on strip
    strip.onclick = (e) => {
      const chip = e.target.closest('.hchip');
      if (!chip) return;
      const idx = parseInt(chip.dataset.idx, 10);
      spinHistory.splice(idx, 1);
      saveHistory();
      renderAll();
    };
  }
}

// ── Predict pane ───────────────────────────────────────────────────────
function renderPredict() {
  const enough = spinHistory.length >= 5;
  toggleEl('pred-need',    !enough);
  toggleEl('pred-content', enough);
  if (!enough) return;

  const { predictions, results, activeCount } = runConsensus(spinHistory);
  const cats = buildCategories(predictions.map(p => p.number), spinHistory);

  // AI top action
  const curState  = QAGENT.encode(spinHistory);
  const aiActions = QAGENT.bestActions(curState, AI_ACTIONS, 1);
  const aiConf    = aiActions[0] ? Math.round((aiActions[0].qval + 1) / 2 * 100) : 0;

  document.getElementById('cb-count').textContent  = predictions.length;
  document.getElementById('cb-cov').innerHTML      = `${Math.round(predictions.length / 37 * 100)}<span class="pct-sign">%</span>`;
  document.getElementById('cb-active').textContent = `${activeCount}/12`;
  document.getElementById('cb-ai').textContent     = `${Math.min(99, Math.max(1, aiConf))}%`;

  // Predicted number grid
  const grid = document.getElementById('pred-grid');
  grid.innerHTML = predictions.map((p, i) => {
    const c    = numCol(p.number);
    const rank = i === 0 ? 'rank1' : i === 1 ? 'rank2' : i === 2 ? 'rank3' : 'rankN';
    const glow = i < 3 ? `;box-shadow:0 0 14px ${CBD[c]}55` : '';
    const crown = i === 0 ? '<span class="rank-crown">👑</span>' : '';
    return `<div class="pred-wrap" title="${p.number} · ${p.voteCount} strategies · ${p.confidence}% confidence">
      <div class="pred-chip ${rank}" style="background:${CBG[c]};border-color:${CBD[c]}${glow}">
        ${crown}${p.number}
      </div>
      <div class="pred-meta">${p.voteCount}✓ ${p.confidence}%</div>
    </div>`;
  }).join('');

  // Category cards (top 8)
  const catGrid = document.getElementById('cat-grid');
  catGrid.innerHTML = cats.slice(0, 8).map((cat, i) => {
    const pct = Math.min(100, Math.round(cat.sc * 100));
    return `<div class="cat-card ${i === 0 ? 'cat-best' : ''}">
      <div class="cat-grp" style="color:${cat.cl}">${i === 0 ? '⭐ ' : ''}${cat.grp}</div>
      <div class="cat-name">${cat.label}</div>
      <div class="cat-row"><span>Win coverage</span><span style="color:${cat.cl}">${cat.cov}%</span></div>
      <div class="cat-row"><span>Payout</span><span class="cat-payout" style="color:${cat.cl}">${cat.pay}</span></div>
      <div class="cat-row"><span>Match score</span><span style="color:${cat.cl}">${pct}%</span></div>
      <div class="winbar"><div class="winbar-fill" style="width:${pct}%;background:${cat.cl}"></div></div>
    </div>`;
  }).join('');
}

// ── Strategies pane ────────────────────────────────────────────────────
function renderStrategies() {
  const enough = spinHistory.length >= 5;
  toggleEl('strat-need', !enough);
  const list = document.getElementById('strat-list');
  if (!enough) { list.innerHTML = ''; return; }

  const { results } = runConsensus(spinHistory);
  const confClass   = c => c >= 70 ? 'conf-high' : c >= 48 ? 'conf-medium' : 'conf-low';

  let idx = 0;
  list.innerHTML = Object.entries(results).map(([name, r]) => {
    idx++;
    if (!r) {
      return `<div class="strat-card strat-inactive">
        <div class="strat-hdr">
          <span class="strat-idx">${idx}.</span>
          <span class="strat-name">${name}</span>
          <span class="strat-conf conf-na">NEED MORE DATA</span>
        </div>
        <div class="strat-reason" style="font-style:italic;font-size:8px">Requires more spinHistory to activate.</div>
      </div>`;
    }
    const chips = r.numbers.slice(0, 14).map(n => {
      const c = numCol(n);
      return `<span class="strat-chip" style="background:${CBG[c]};border-color:${CBD[c]}">${n}</span>`;
    }).join('');
    const more = r.numbers.length > 14 ? `<span class="strat-more">+${r.numbers.length - 14}</span>` : '';
    return `<div class="strat-card strat-active">
      <div class="strat-hdr">
        <span class="strat-idx">${idx}.</span>
        <span class="strat-name">${name}</span>
        <span class="strat-conf ${confClass(r.confidence)}">${r.confidence}%</span>
      </div>
      <div class="strat-reason">${r.reasoning}</div>
      <div class="strat-chips">${chips}${more}</div>
    </div>`;
  }).join('');
}

// ── AI Agent pane ──────────────────────────────────────────────────────
function renderAI() {
  const enough = spinHistory.length >= 8;
  toggleEl('ai-need',    !enough);
  toggleEl('ai-content', enough);
  if (!enough) return;

  // Re-train agent if not enough updates
  if (QAGENT.updates < spinHistory.length - 3) {
    QAGENT.qtable  = {};
    QAGENT.epsilon = 0.9;
    QAGENT.updates = 0;
    trainAgent(spinHistory);
  }

  const curState = QAGENT.encode(spinHistory);
  const topActs  = QAGENT.bestActions(curState, AI_ACTIONS, 6);
  const maxQ     = topActs[0]?.qval || 1;

  document.getElementById('ai-states').textContent  = QAGENT.stateCount();
  document.getElementById('ai-epsilon').textContent = (QAGENT.epsilon * 100).toFixed(1) + '%';
  document.getElementById('ai-updates').textContent = QAGENT.updates;

  // Average reward estimate
  let totalQ = 0, cnt = 0;
  for (const st of Object.values(QAGENT.qtable)) {
    for (const v of Object.values(st)) { totalQ += v; cnt++; }
  }
  document.getElementById('ai-reward').textContent = cnt > 0 ? (totalQ / cnt).toFixed(3) : '—';

  // Top action bars
  const actNames = {
    red:'Red (18)',black:'Black (18)',even:'Even (18)',odd:'Odd (18)',
    low:'Low 1-18',high:'High 19-36',d1:'1st Dozen',d2:'2nd Dozen',d3:'3rd Dozen',
    c1:'Column 1',c2:'Column 2',c3:'Column 3',line:'Best Line (6)',
    corner:'Best Corner (4)',split:'Best Split (2)',hot12:'Hot 12',
    sector:'Wheel Sector',fibonacci:'Fibonacci Positions',
  };
  const qColors = ['#d4a843','#27c97a','#34c8e0','#9b7fe8','#e8932a','#5090c0'];

  document.getElementById('ai-actions').innerHTML = topActs.map((a, i) => {
    const pct = maxQ > 0 ? Math.max(0, Math.min(100, Math.round(((a.qval / maxQ) * 80) + 10))) : 0;
    return `<div class="ai-action-row">
      <span class="ai-action-rank">${i + 1}.</span>
      <span class="ai-action-name" style="color:${qColors[i] || '#ccc'}">${actNames[a.action] || a.action}</span>
      <div class="ai-qbar-wrap">
        <div class="ai-qbar"><div class="ai-qbar-fill" style="width:${pct}%;background:${qColors[i] || '#ccc'}"></div></div>
      </div>
      <span class="ai-action-q">Q=${a.qval.toFixed(3)}</span>
    </div>`;
  }).join('');

  // State encoding display
  const last3 = spinHistory.slice(-3);
  const w8    = spinHistory.slice(-8);
  const rPct  = Math.round(w8.filter(n => numCol(n) === 'r').length / w8.length * 100);
  const ePct  = Math.round(w8.filter(n => n !== 0).filter(numIsEv).length / Math.max(1, w8.filter(n=>n!==0).length) * 100);
  document.getElementById('ai-state-box').innerHTML = `
    <span class="ai-state-key">State ID: </span><span class="ai-state-val">${curState}</span><br>
    <span class="ai-state-key">Last 3:   </span><span class="ai-state-val">${last3.join(' → ')}</span><br>
    <span class="ai-state-key">Colors:   </span><span class="ai-state-val">${last3.map(n=>({r:'R',b:'B',g:'G'})[numCol(n)]).join('')}</span><br>
    <span class="ai-state-key">Red rate: </span><span class="ai-state-val">${rPct}% in last 8 spins</span><br>
    <span class="ai-state-key">Even rate:</span><span class="ai-state-val">${ePct}% in last 8 non-zero</span><br>
    <span class="ai-state-key">Q-States: </span><span class="ai-state-val">${QAGENT.stateCount()} unique states learned</span>
  `;
}

// ── Analysis pane ──────────────────────────────────────────────────────
function renderAnalysis() {
  const enough = spinHistory.length >= 5;
  toggleEl('anal-need',    !enough);
  toggleEl('anal-content', enough);
  if (!enough) return;

  const nz    = spinHistory.filter(n => n !== 0);
  const w20   = spinHistory.slice(-20);
  const freq  = Array(37).fill(0);
  spinHistory.forEach(n => freq[n]++);

  const rC = spinHistory.filter(n => numCol(n) === 'r').length;
  const bC = spinHistory.filter(n => numCol(n) === 'b').length;
  const gC = spinHistory.filter(n => n === 0).length;
  const eC = nz.filter(numIsEv).length;
  const lC = nz.filter(numIsLo).length;

  const hot  = [...Array(37).keys()].reduce((a, b) => freq[a] > freq[b] ? a : b);
  const cold = [...Array(37).keys()].reduce((a, b) => freq[a] < freq[b] ? a : b);

  const seen = Array(37).fill(-1);
  spinHistory.forEach((n, i) => { seen[n] = i; });
  const gaps = [...Array(37).keys()].map(n => seen[n] === -1 ? spinHistory.length : spinHistory.length - 1 - seen[n]);
  const maxGap = Math.max(...gaps);
  const gapNum = gaps.indexOf(maxGap);

  // Stats table
  document.getElementById('sess-stats').innerHTML = [
    ['Total Spins',      spinHistory.length,                               'var(--txt)'],
    ['Hottest Number',   `${hot} — ${freq[hot]} hits`,                 'var(--gold)'],
    ['Coldest Number',   `${cold} — ${freq[cold]} hits`,               'var(--cyan)'],
    ['Longest Absence',  `#${gapNum} (${maxGap} spins)`,               maxGap > 20 ? 'var(--red)' : 'var(--dim2)'],
    ['Red / Black / 0',  `${rC} / ${bC} / ${gC}`,                     'var(--dim2)'],
    ['Even / Odd',        nz.length ? `${eC} / ${nz.length - eC}` : '—', 'var(--dim2)'],
    ['1-18 / 19-36',      nz.length ? `${lC} / ${nz.length - lC}` : '—', 'var(--dim2)'],
    ['Zero frequency',   `${gC} times (${(gC / spinHistory.length * 100).toFixed(1)}%)`, 'var(--green)'],
  ].map(([l, v, c]) => `<div class="stat-row"><span class="stat-lbl">${l}</span><span class="stat-val" style="color:${c}">${v}</span></div>`).join('');

  // Bias bars (last 20)
  const t20 = w20.length;
  const nz20 = w20.filter(n => n !== 0);
  const rR20  = w20.filter(n => numCol(n) === 'r').length / Math.max(1, t20);
  const eR20  = nz20.filter(numIsEv).length             / Math.max(1, nz20.length);
  const lR20  = nz20.filter(numIsLo).length             / Math.max(1, nz20.length);
  const d1R   = w20.filter(n => numDoz(n) === 1).length / Math.max(1, t20);
  const d2R   = w20.filter(n => numDoz(n) === 2).length / Math.max(1, t20);
  const d3R   = w20.filter(n => numDoz(n) === 3).length / Math.max(1, t20);

  const biasItems = [
    ['Red',    rR20 * 100,        '#e84060', 48.6],
    ['Black', (1-rR20)*100,       '#5090c0', 48.6],
    ['Even',   eR20 * 100,        '#34c8e0', 48.6],
    ['Odd',   (1-eR20)*100,       '#9b7fe8', 48.6],
    ['1–18',   lR20 * 100,        '#27c97a', 48.6],
    ['19–36', (1-lR20)*100,       '#d4a843', 48.6],
    ['D1',     d1R * 100,         '#e8932a', 32.4],
    ['D2',     d2R * 100,         '#e8932a', 32.4],
    ['D3',     d3R * 100,         '#e8932a', 32.4],
  ];
  document.getElementById('bias-bars').innerHTML = biasItems.map(([l, p, c, exp]) => {
    const deviation = p - exp;
    const dLabel = deviation > 5 ? '▲' : deviation < -5 ? '▼' : '≈';
    return `<div class="bias-item">
      <div class="bias-row">
        <span style="color:var(--dim2)">${l}</span>
        <span style="color:${c};font-weight:700">${p.toFixed(1)}% ${dLabel}</span>
      </div>
      <div class="bias-bar"><div class="bias-fill" style="width:${Math.min(100,p)}%;background:${c}"></div></div>
    </div>`;
  }).join('');

  // Heatmap
  const exp = spinHistory.length / 37;
  document.getElementById('heatmap').innerHTML = [...Array(37).keys()].map(n => {
    const f   = freq[n];
    const r   = f / Math.max(0.01, exp);
    const hot = r > 1.5;
    const cld = r < 0.5 && spinHistory.length > 15;
    const c   = numCol(n);
    const bg  = hot ? '#300610' : cld ? '#061828' : CBG[c];
    const bd  = hot ? '#e84060' : cld ? '#34c8e0' : CBD[c];
    const tc  = hot ? '#ff8090' : cld ? '#34c8e0' : '#c0d0e0';
    return `<div class="hm-cell" style="background:${bg};border-color:${bd}" title="${n}: ${f} hits (${r.toFixed(1)}× expected)">
      <div class="hm-n" style="color:${tc}">${n}</div>
      <div class="hm-f">${f}</div>
    </div>`;
  }).join('');

  // Trend cells
  const trendData = [
    { lbl: 'RED %',   val: Math.round(rC / spinHistory.length * 100), exp: 48.6, c: '#e84060', target: rC },
    { lbl: 'EVEN %',  val: nz.length ? Math.round(eC / nz.length * 100) : 0, exp: 50, c: '#34c8e0' },
    { lbl: '1-18 %',  val: nz.length ? Math.round(lC / nz.length * 100) : 0, exp: 50, c: '#27c97a' },
    { lbl: 'ZERO %',  val: Math.round(gC / spinHistory.length * 100), exp: 2.7, c: '#40e890' },
  ];
  document.getElementById('trend-section').innerHTML = `<div class="trend-row">${
    trendData.map(td => {
      const dev = td.val - td.exp;
      const ar  = Math.abs(dev) < 3 ? '≈' : dev > 0 ? '▲' : '▼';
      return `<div class="trend-cell">
        <div class="trend-lbl">${td.lbl}</div>
        <div class="trend-val" style="color:${td.c}">${td.val}%</div>
        <div class="trend-pct">${ar} exp ${td.exp}%</div>
      </div>`;
    }).join('')
  }</div>`;
}

// ── History pane ───────────────────────────────────────────────────────
function renderHistory() {
  const empty = spinHistory.length === 0;
  toggleEl('hist-need',    empty, 'block');
  toggleEl('hist-content', !empty);
  if (empty) return;

  document.getElementById('hist-count-label').textContent = `${spinHistory.length} spins recorded`;
  const dz = ['—', '1st', '2nd', '3rd'];
  document.getElementById('hist-body').innerHTML = [...spinHistory].reverse().map((n, ri) => {
    const idx = spinHistory.length - 1 - ri;
    const c   = numCol(n);
    const cn  = { r: 'RED', b: 'BLACK', g: 'ZERO' };
    return `<tr>
      <td style="color:var(--dim);font-size:8px">#${idx + 1}</td>
      <td><span class="h-ball" style="background:${CBG[c]};border-color:${CBD[c]}">${n}</span></td>
      <td><span class="badge badge-${c}">${cn[c]}</span></td>
      <td style="color:var(--dim2)">${n === 0 ? '—' : numIsEv(n) ? 'Even' : 'Odd'}</td>
      <td style="color:var(--dim2)">${n === 0 ? '—' : numIsLo(n) ? '1-18' : '19-36'}</td>
      <td style="color:var(--dim2)">${dz[numDoz(n)]}</td>
      <td style="color:var(--dim2)">${numColn(n) === 0 ? '—' : `Col ${numColn(n)}`}</td>
    </tr>`;
  }).join('');
}

// ── Show/hide helper — uses style.display directly, no class conflicts ──
function showEl(id, as) { const e = document.getElementById(id); if (e) e.style.display = as || 'block'; }
function hideEl(id)      { const e = document.getElementById(id); if (e) e.style.display = 'none'; }

// Track whether predictions have been generated at least once
let predictionsGenerated = false;
let lastPredictTime = null;

// ── Wrapper for renderPredict that also flips visibility ────────────────
function runPredictions() {
  if (spinHistory.length < 5) {
    showEl('pred-need'); hideEl('pred-content');
    return;
  }
  hideEl('pred-need'); showEl('pred-content');
  lastPredictTime = Date.now();
  predictionsGenerated = true;
  renderPredict();

  // Update status bar
  const txt  = document.getElementById('pred-status-text');
  const time = document.getElementById('pred-status-time');
  if (txt)  txt.textContent  = `Based on ${spinHistory.length} numbers · ${document.getElementById('cb-active').textContent} strategies active`;
  if (time) time.textContent = new Date(lastPredictTime).toLocaleTimeString();
}

// ── Override renderPredict to NOT touch visibility (runPredictions does it) ─
// Also override renderStrategies / renderAI / renderAnalysis / renderHistory
// to use direct style.display instead of toggleEl

// ── Util ───────────────────────────────────────────────────────────────
// (kept for backward compat but fixed: no classList.hidden involved)
function toggleEl(id, hidden, showAs) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = hidden ? 'none' : (showAs || 'block');
}

// ═══════════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════════════
function switchTab(paneId) {
  document.querySelectorAll('.tab').forEach(t  => t.classList.remove('tab-on'));
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('pane-on'));
  const tab  = document.querySelector(`[data-pane="${paneId}"]`);
  const pane = document.getElementById(`pane-${paneId}`);
  if (tab)  tab.classList.add('tab-on');
  if (pane) pane.classList.add('pane-on');
}

function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.pane));
  });
}

// ═══════════════════════════════════════════════════════════════════════
// BUTTON EVENTS
// ═══════════════════════════════════════════════════════════════════════
function initButtons() {
  const addBtn     = document.getElementById('add-btn');
  const predictBtn = document.getElementById('predict-btn');
  const numInp     = document.getElementById('num-input');
  const undoBtn    = document.getElementById('undo-btn');
  const clrBtn     = document.getElementById('clear-btn');
  const closeBtn   = document.getElementById('close-btn');
  const expBtn     = document.getElementById('export-btn');

  // ── ADD ──
  addBtn.addEventListener('click', () => {
    const v = parseInt(numInp.value, 10);
    if (!isNaN(v) && v >= 0 && v <= 36) {
      addNumber(v);
    } else {
      numInp.style.borderColor = '#e84060';
      setTimeout(() => { numInp.style.borderColor = ''; }, 900);
    }
    numInp.focus();
  });

  // ── PREDICT ──
  predictBtn.addEventListener('click', () => {
    predictBtn.classList.add('flashing');
    setTimeout(() => predictBtn.classList.remove('flashing'), 460);
    runPredictions();
    switchTab('predict');
  });

  // ── ENTER key ──
  numInp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const v = parseInt(numInp.value, 10);
      if (!isNaN(v) && v >= 0 && v <= 36) addNumber(v);
    }
  });

  // ── Clamp input ──
  numInp.addEventListener('input', () => {
    const v = parseInt(numInp.value, 10);
    if (!isNaN(v) && v > 36) numInp.value = 36;
    if (!isNaN(v) && v < 0)  numInp.value = 0;
  });

  if (undoBtn)  undoBtn.addEventListener('click',  undoLast);
  if (clrBtn)   clrBtn.addEventListener('click',   clearAll);
  if (closeBtn) closeBtn.addEventListener('click', () => window.close());
  if (expBtn)   expBtn.addEventListener('click',   exportCSV);
}

// ═══════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  buildNumpad();
  initTabs();
  initButtons();
  await loadHistory();
  if (spinHistory.length >= 4) trainAgent(spinHistory);
  renderAll();
  // Auto-show predictions if we already have history from a previous session
  if (spinHistory.length >= 5) {
    runPredictions();
  }
  document.getElementById('num-input').focus();
});
