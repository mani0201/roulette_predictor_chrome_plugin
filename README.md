# roulette_predictor_chrome_plugin
# 🎯 Roulette Predictor Pro

> A Chrome Extension for analysing roulette simulator results using **12 statistical prediction strategies** and a **Q-Learning AI agent** — built for testing patterns against simulator apps, not real casino automation.

![Version](https://img.shields.io/badge/version-3.1.0-gold)
![Manifest](https://img.shields.io/badge/manifest-v3-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20%2F%20Edge-orange)

<img width="618" height="987" alt="image" src="https://github.com/user-attachments/assets/776dde94-b95c-4a26-a14e-5bd0518068d7" />
<img width="622" height="982" alt="image" src="https://github.com/user-attachments/assets/2cea2474-1d22-4dc2-9bbf-c2eb0cd761d9" />
<img width="618" height="981" alt="image" src="https://github.com/user-attachments/assets/3701b6a6-254f-459b-9a40-54452a14e13d" />

---

## ⚠️ Disclaimer

This tool is designed **exclusively for use with roulette simulators** for pattern research and educational purposes. It does **not** automate bets, does **not** connect to any casino website, and does **not** guarantee any outcome. Roulette is a game of chance — no prediction system changes the underlying odds.

---

## 📋 Table of Contents

- [What It Does](#what-it-does)
- [Features at a Glance](#features-at-a-glance)
- [Installation](#installation)
- [How to Use](#how-to-use)
- [The 12 Prediction Strategies](#the-12-prediction-strategies)
- [Consensus Engine](#consensus-engine)
- [Bet Category Ranking](#bet-category-ranking)
- [Q-Learning AI Agent](#q-learning-ai-agent)
- [Statistical Analysis Tab](#statistical-analysis-tab)
- [File Structure](#file-structure)
- [Code Architecture](#code-architecture)
- [Key Technical Decisions](#key-technical-decisions)
- [Known Limitations](#known-limitations)

---

## What It Does

You enter the winning numbers from your roulette simulator one by one. The extension analyses your history using 12 independent algorithms and a reinforcement learning agent, then tells you which numbers and bet categories to consider on the next spin.

**Workflow:**
```
Simulator spins → You type the result → ADD → repeat → 🔮 PREDICT → see ranked predictions
```

Everything runs **locally in your browser**. No servers, no accounts, no tracking.

---

## Features at a Glance

| Feature | Detail |
|---|---|
| **Input methods** | 37-button colour-coded numpad + text field (Enter or ADD button) |
| **Prediction strategies** | 12 independent algorithms, each with its own logic and confidence score |
| **Consensus engine** | Weighted voting system — numbers agreed on by multiple strategies rank highest |
| **AI agent** | Q-Learning reinforcement agent with Bellman updates, 18 actions, epsilon-greedy exploration |
| **Bet categories** | 15 types ranked by match score: Colour, Parity, Range, Dozens, Columns, Line, Corner, Split |
| **Analysis tab** | Frequency heatmap, bias bars, session stats, trend indicators |
| **History tab** | Full spin log with CSV export |
| **Persistent window** | Stays open when you click your simulator — won't auto-close on blur |
| **Session memory** | Spin history and AI Q-table saved to `chrome.storage.local`, survive popup close |
| **UNDO / CLEAR** | Remove last entry or reset everything with one click |
| **Close button** | Explicit ✕ in the header — no accidental closes |

---

## Installation

> No build step required. Pure HTML + CSS + JS.

### Step 1 — Download

Download `roulette-predictor-final.zip` and unzip it. You'll get a folder called `rp_final/`.

### Step 2 — Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** ON (top-right corner)
3. Click **Load unpacked**
4. Select the `rp_final/` folder
5. The 🎯 icon appears in your Chrome toolbar

### Step 3 — Open the predictor

Click the 🎯 icon in the toolbar. A **detached popup window** opens (510×800px). This window:
- Stays open when you click away to your simulator
- Remembers position on screen
- Only one instance opens — clicking the icon again focuses the existing window

> **Edge users:** Works identically on Microsoft Edge (also Chromium-based).

---

## How to Use

### Entering numbers

- **Numpad:** Click any of the 37 coloured buttons (0–36). Red numbers are red, black numbers are dark, 0 is green.
- **Type + Enter:** Click the text field, type a number (0–36), press Enter or click **ADD**.
- Each entered number appears as a colour-coded chip in the history strip below. Click any chip to remove it.

### Getting predictions

Once you have **5 or more** numbers entered, press **🔮 PREDICT**. The PREDICT tab shows:
- Top predicted numbers ranked by consensus score (up to 18 numbers, minimum 12)
- The top 3 numbers are shown larger with a glow effect and 👑 crown
- Each number shows how many strategies agree and the confidence percentage
- Top 8 bet categories ranked by strategy match score, with payout odds

After the first PREDICT, every subsequent **ADD** automatically refreshes the predictions.

### Buttons

| Button | Function |
|---|---|
| **ADD** | Record the number in the text field |
| **🔮 PREDICT** | Run all 12 strategies and display consensus predictions |
| **↩ UNDO** | Remove the last recorded number |
| **🗑 CLEAR** | Erase all history and reset the AI (asks for confirmation) |
| **✕** | Close the predictor window |
| **📥 EXPORT CSV** | Download full spin history as a `.csv` file |

### Tabs

| Tab | Contents |
|---|---|
| **PREDICT** | Consensus number predictions + bet category rankings |
| **STRATEGIES** | All 12 algorithms shown individually with reasoning and confidence |
| **AI AGENT** | Q-Learning agent stats, top action picks, state encoding, Bellman equation |
| **ANALYSIS** | Session stats, bias bars (last 20 spins), 37-number heatmap, trend summary |
| **HISTORY** | Full reverse-chronological table of every spin recorded |

---

## The 12 Prediction Strategies

Each strategy function takes the full spin history array and returns:
```js
{
  numbers: number[],      // predicted numbers (0–36)
  confidence: number,     // 0–100, used for consensus weighting
  reasoning: string       // human-readable explanation shown in UI
}
// or null if not enough data yet
```

### 1. Hot Numbers
- **Window:** last 50 spins
- **Minimum data:** 5 spins
- **Logic:** Counts frequency of each number. Scores by deviation from expected frequency (expected = window ÷ 37). Top 12 numbers by score are returned.
- **Confidence:** Up to 90. Scales with the hottest number's deviation ratio and window size.
- **Bet type signal:** Frequency continuation — hot numbers stay hot in short windows.

### 2. Cold Numbers
- **Window:** last 80 spins
- **Minimum data:** 10 spins
- **Logic:** Picks the 12 least-seen numbers. Contrarian "gambler's fallacy" theory — numbers that haven't appeared may be statistically overdue.
- **Confidence:** Up to 68. Grows with window size.

### 3. Wheel Sector Bias
- **Window:** last 30 spins
- **Minimum data:** 6 spins
- **Logic:** Uses the physical European wheel layout (`[0,32,15,19,4,21,2,25,17,34,6,27...]`). Each number is scored as `own_freq × 2 + sum(±2 neighbours' freq)`. The highest-scoring number becomes the sector centre, then the prediction expands to ±4 physical neighbours (up to 15 numbers total).
- **Confidence:** Up to 85. This is one of the highest-confidence strategies because physical clustering is a real dealer/wheel bias signal.
- **Use case:** Detecting croupier throw bias or mechanical wheel tilt.

### 4. Pattern Repeat
- **Minimum data:** 8 spins
- **Logic:** Takes the last 3 results as a sequence. Scans all of history for that exact 3-number sequence and records what came *after* each occurrence. Those followers become predictions, ranked by frequency. Falls back to 2-number sequences if no 3-match is found.
- **Confidence:** Up to 80. Scales with how many times the pattern has been seen.
- **Use case:** Exploiting simulator RNG patterns that repeat.

### 5. Colour Streak
- **Minimum data:** 5 spins
- **Logic:** Counts the current red or black streak length. If streak ≥ 3, predicts reversal (returns all numbers of the opposite colour). If streak < 3, predicts continuation.
- **Confidence:** Reversal: up to 74 (`38 + streak × 7`). Continuation: up to 54.

### 6. Dozen Rotation
- **Window:** last 24 non-zero spins
- **Minimum data:** 10 spins
- **Logic:** Counts hits in each dozen (1–12, 13–24, 25–36). Finds the minimum count and returns all numbers from the underrepresented dozen(s). Expects ~8 hits per dozen per 24 spins.
- **Confidence:** Up to 72.

### 7. Gap Analysis
- **Minimum data:** 15 spins
- **Logic:** Tracks the last-seen position of every number. Ranks all 37 numbers by how long they've been absent (gap = current spin count − last seen index). Returns top 12 by absence length.
- **Confidence:** Up to 76. Scales with the largest gap found.

### 8. Even/Odd Shift
- **Window:** last 20 non-zero spins
- **Minimum data:** 8 spins
- **Logic:** Calculates the even ratio in the window. If > 65% even → predicts odd correction. If < 35% even → predicts even correction. Otherwise predicts the slight lean continuing.
- **Confidence:** Up to 66. Scales with the strength of the imbalance.

### 9. High/Low Balance
- **Window:** last 24 non-zero spins
- **Minimum data:** 10 spins
- **Logic:** Calculates the 1–18 ratio vs 19–36. If > 60% low → predicts high. If < 40% low → predicts low. Otherwise predicts the slight lean.
- **Confidence:** Up to 63.

### 10. Column Cycle
- **Window:** last 30 non-zero spins
- **Minimum data:** 12 spins
- **Logic:** Tracks hits per column (Col 1: 1,4,7…34 · Col 2: 2,5,8…35 · Col 3: 3,6,9…36). Finds the underperforming column(s) and returns their numbers.
- **Confidence:** Up to 67.

### 11. Recency Cluster
- **Minimum data:** 5 spins
- **Logic:** Takes the last 5 results. For each, adds the number itself plus its ±2 physical wheel neighbours (using the actual European wheel order). The combined set (up to 15 numbers) forms the prediction.
- **Confidence:** Up to 58.
- **Use case:** Detecting short-term dealer signature or ball landing zone momentum.

### 12. Fibonacci Positions
- **Minimum data:** 3 spins
- **Logic:** Takes the last result's position on the physical wheel. Projects Fibonacci offsets `[1, 1, 2, 3, 5, 8, 13]` in both directions around the wheel. Returns the unique set of numbers at those positions (up to 12).
- **Confidence:** Up to 52. The lowest-confidence strategy — used as a mathematical diversifier.

---

## Consensus Engine

```
weight = strategy.confidence × (12 / strategy.numbers.length)
```

The **specificity bonus** (`12 / count`) means a strategy that predicts 3 numbers contributes 4× more per number than one predicting 12. High-confidence strategies with narrow predictions dominate the consensus.

**Voting process:**
1. All 12 strategies run in parallel
2. Each strategy's numbers receive weighted votes
3. All numbers are ranked by total vote weight
4. Top 32% (minimum 12, maximum 18) become predictions
5. Each prediction displays its vote count (how many strategies agreed) and a normalised confidence score (12–99%)

---

## Bet Category Ranking

After consensus predictions are generated, all bet types are scored:

```
match_score = (predicted_numbers ∩ category_numbers) / category_numbers.length
```

A **recent bias bonus** is added (+0.25 for outside bets, +0.20 for dozens) when a category is underrepresented in the last 20 spins, combining prediction signal with statistical correction.

**Categories evaluated:**

| Type | Options | Payout | Win Chance |
|---|---|---|---|
| Colour | Red, Black | 1:1 | 48.6% |
| Parity | Even, Odd | 1:1 | 48.6% |
| Range | 1–18, 19–36 | 1:1 | 48.6% |
| Dozen | 1st, 2nd, 3rd | 2:1 | 32.4% |
| Column | Col 1, Col 2, Col 3 | 2:1 | 32.4% |
| Line | Best 6-number line | 5:1 | 16.2% |
| Corner | Best 4-number corner | 8:1 | 10.8% |
| Split | Best 2-number split | 17:1 | 5.4% |

Top 8 categories are shown, with the best marked ⭐.

---

## Q-Learning AI Agent

The AI agent uses **Q-Learning** (a model-free reinforcement learning algorithm) to learn which bet category performs best given the current game state.

### State encoding

```js
state = `${last3_colours}|${last3_dozens}|${red_trend}${even_trend}${hot_dozen}`
// e.g. "rbr|213|HE2"
```

- `last3_colours` — colour codes of last 3 results (r/b/g)
- `last3_dozens` — dozen codes of last 3 results (0/1/2/3)
- `red_trend` — H if red > 4/8 recent, L otherwise
- `even_trend` — E if even > 4/8 recent, O otherwise
- `hot_dozen` — which dozen appeared most in last 8 spins

### Actions (18 total)

`red`, `black`, `even`, `odd`, `low`, `high`, `d1`, `d2`, `d3`, `c1`, `c2`, `c3`, `line`, `corner`, `split`, `hot12`, `sector`, `fibonacci`

### Bellman update (runs on every ADD)

```
Q(s,a) ← Q(s,a) + α [ r + γ · max Q(s',a') − Q(s,a) ]
```

| Parameter | Value | Meaning |
|---|---|---|
| α (alpha) | 0.15 | Learning rate — how fast new experience overrides old |
| γ (gamma) | 0.90 | Discount factor — value of future rewards vs immediate |
| ε (epsilon) | 0.90 → 0.05 | Exploration rate, decays by 0.97× each update |
| Reward | +1 hit / −0.1 miss | Signal given after each spin outcome |

The Q-table is persisted to `chrome.storage.local` alongside the spin history, so the agent **retains everything it has learned** between sessions.

### What the AI tab shows

- **States learned** — unique state encodings seen so far
- **Explore rate ε** — current epsilon value
- **Q updates** — total Bellman updates applied
- **Avg reward** — mean Q-value across all state-action pairs
- **Top 6 actions** — ranked by Q-value for the current state, with bar chart
- **Current state** — the encoded state string, decoded into human-readable lines

---

## Statistical Analysis Tab

### Session stats
Total spins, hottest number, coldest number, longest absence (highlighted red if > 20 spins), red/black/zero split, even/odd split, 1–18/19–36 split, zero frequency %.

### Bias bars (last 20 spins)
9 bars showing recent % for: Red, Black, Even, Odd, 1–18, 19–36, D1, D2, D3. Each bar includes a deviation indicator (▲ above expected, ▼ below, ≈ near-normal).

### Frequency heatmap
All 37 numbers displayed as chips. Numbers appearing > 1.5× expected frequency get a **red border** (hot). Numbers appearing < 0.5× expected (with enough data) get a **cyan border** (cold). Shows raw hit count.

### Trend summary
Four cells showing overall session percentages for Red, Even, 1–18, and Zero — each compared against its theoretical expected value.

---

## File Structure

```
rp_final/
│
├── manifest.json          # Chrome Extension config (MV3)
├── background.js          # Service worker — opens persistent window
│
├── popup/
│   ├── popup.html         # UI structure — 5 tabs, input zone, header
│   ├── popup.css          # All styling (~630 lines, dark theme)
│   └── popup.js           # All logic (~1,170 lines)
│
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Code Architecture

### popup.js — module breakdown

| Section | Lines (approx) | Purpose |
|---|---|---|
| Constants & helpers | 1–45 | Wheel layout, number classifiers, chip colours |
| `STRATEGIES` object | 46–315 | All 12 strategy functions |
| `runConsensus()` | 317–357 | Weighted voting engine |
| `buildCategories()` | 359–435 | Bet type scoring |
| `QAGENT` object | 437–497 | Q-Learning agent (encode, q, learn, bestActions) |
| `trainAgent()` | 499–552 | Replay training on full history |
| State & storage | 554–578 | `spinHistory` array, `loadHistory()`, `saveHistory()` |
| `buildNumpad()` | 580–595 | Creates 37 buttons with delegated click listener |
| Core actions | 597–680 | `addNumber()`, `undoLast()`, `clearAll()`, `exportCSV()` |
| Render functions | 682–1033 | `renderAll()`, `renderStrip()`, `renderPredictions()`, etc. |
| Utilities | 1035–1075 | `showEl()`, `hideEl()`, `runPredictions()`, `toggleEl()` |
| Tab init | 1077–1090 | `switchTab()`, `initTabs()` |
| Button init | 1092–1135 | `initButtons()` — all event listeners |
| Init | 1137–1150 | `DOMContentLoaded` — load, train, render |

### background.js

Opens the predictor as a detached `chrome.windows` popup (not an ephemeral browser action popup). Tracks `winId` so only one instance exists at a time. Re-focuses on second click.

```js
chrome.action.onClicked.addListener(async () => {
  if (winId !== null) {
    await chrome.windows.update(winId, { focused: true }); return;
  }
  const win = await chrome.windows.create({
    url: chrome.runtime.getURL('popup/popup.html'),
    type: 'popup', width: 510, height: 800, ...
  });
  winId = win.id;
});
```

### manifest.json

```json
{
  "manifest_version": 3,
  "permissions": ["storage", "windows"],
  "action": { "default_popup": "" },
  "background": { "service_worker": "background.js" }
}
```

`"default_popup": ""` disables the default popup behaviour so clicks go to the background service worker instead, which opens the persistent window.

---

## Key Technical Decisions

**`spinHistory` not `history`**
The global variable is named `spinHistory` (not `history`) to avoid colliding with `window.history`, which is a read-only browser built-in. Attempting to assign to `window.history` throws `TypeError: Cannot set property history of #<Window> which has only a getter`.

**`style.display` not CSS classes for show/hide**
Content divs use `style="display:none"` in HTML and are shown/hidden via `element.style.display` in JS. An earlier version used `class="hidden"` with `display: none !important` in CSS — the `!important` silently won over JS's `element.style.display = 'block'`, causing the prediction pane to never appear.

**Separate JS file (CSP compliance)**
Chrome Extension Manifest V3 enforces strict Content Security Policy that blocks all inline `<script>` tags and inline event handlers (`onclick=`, `oninput=`, etc.). All logic lives in `popup.js` which is referenced via `<script src="popup.js">`. All events are bound via `addEventListener` after `DOMContentLoaded`.

**Delegated event listeners**
The numpad uses a single `click` listener on the `.numpad` container (`e.target.closest('.np-btn')`) rather than 37 individual listeners. Same pattern for the history chip strip.

**Persistent storage**
`chrome.storage.local` stores `rp_history` (the spin array), `rp_qtable` (the Q-table object), `rp_epsilon` (current exploration rate), and `rp_updates` (update counter). Everything is reloaded on window open. History survives extension reloads.

---

## Known Limitations

- **European wheel only.** The wheel layout constant assumes a single-zero European wheel (`[0,32,15,19,4,21,2,25...]`). American double-zero wheels have a different physical layout — Wheel Sector Bias, Recency Cluster, and Fibonacci Positions would give inaccurate physical neighbour results on an American wheel.
- **No real predictive power over a fair RNG.** On a truly random simulator, no strategy performs better than chance over a large sample. The value is in spotting *simulator* patterns (fixed seeds, weak PRNGs) not in predicting physics.
- **Q-table grows with unique states.** With enough varied history the Q-table can become large. `chrome.storage.local` has a 5MB quota; at typical session lengths this is not a concern.
- **Minimum spin requirements.** Some strategies need 8–15 spins before activating. The STRATEGIES and AI AGENT tabs show "NEED MORE DATA" for inactive algorithms.

---

## Contributing

Pull requests welcome. Main areas for improvement:

- **American wheel support** — add a second `WHEEL` constant and a wheel-type toggle
- **Strategy backtesting** — export prediction accuracy per strategy across the session
- **Custom strategy builder** — let users define parameter thresholds (window sizes, streak length, etc.)
- **Multi-session comparison** — save named sessions and compare heatmaps

---

## License

MIT — free to use, modify, and distribute. No warranty implied.

---

*Built with vanilla JS, HTML, and CSS. No frameworks, no npm, no build step.*
