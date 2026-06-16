# Topside: Dice Drop — Leaderboard Design

## Overview

The leaderboard supports two parallel views of every player's performance: **Overall** (any run, even if a continue was used) and **Unassisted** (only the score earned before any continue was used). These are not separate leaderboards — they are two lenses on the same underlying data.

In addition, scores can be filtered by **difficulty** (easy / medium / hard / all), **time period** (All Time / This Month / This Week / Today), and **scope** (Global / Following). All combinations of these filters work correctly.

---

## Core Design Principle: One Run, Two Scores

When a player uses a continue, a single game session produces two meaningful scores:

1. The **unassisted leg** — the score at the moment the player tapped "Continue." This is what they achieved without help.
2. The **overall leg** — the final score when the game ended after the continue.

These are captured in a single `runs` row and a single `leaderboard` upsert. There is no duplicate entry — one game = one row in `runs`.

---

## Database Schema

### `players`
Registered players. Created on first app launch via `register_player`.

| Column | Type | Notes |
|--------|------|-------|
| `player_id` | text PK | UUID generated client-side, stored in AsyncStorage |
| `display_name` | text UNIQUE | Random adjective+noun+number (e.g. SpookySnap635) |
| `created_at` | timestamptz | |

### `leaderboard`
All-time aggregate stats per player per difficulty. Updated on every `submit_score` call. This is the source of truth for "All Time" queries — never scanned for period queries.

| Column | Type | Notes |
|--------|------|-------|
| `player_id` | text FK → players | |
| `difficulty` | text | 'easy', 'medium', 'hard' |
| `display_name` | text | Denormalized for display; canonical name lives in `players` |
| `best_score` | integer | All-time best overall score |
| `best_unassisted` | integer | All-time best score achieved without any continue |
| `best_chain` | integer | All-time best chain length |
| `lifetime_score` | bigint | Sum of all final run scores |
| `unassisted_lifetime_score` | bigint | Sum of unassisted legs only (see logic below) |
| `run_count` | integer | Total runs submitted |
| `last_played_at` | timestamptz | |

PK: `(player_id, difficulty)`

### `runs`
One row per completed game submission. Drives **period-based** (day/week/month) leaderboard queries. Rows older than 35 days are purged nightly by pg_cron.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigserial PK | |
| `player_id` | text FK → players | |
| `difficulty` | text | |
| `score` | integer | Final overall score |
| `unassisted_score` | integer | Pre-continue score if continue used; otherwise same as `score` |
| `best_chain` | integer | |
| `used_continue` | boolean | |
| `played_at` | timestamptz | |
| `idempotency_key` | text UNIQUE (nullable) | UUID generated per game session; prevents duplicate rows on timeout retry |

### `follows`
Social graph. `(follower_id, following_id)` unique pairs. Used to scope leaderboard to followed players.

---

## How Scores Are Submitted

### Normal run (no continue)

App calls `submit_score(p_used_continue=false)`:

- `v_unassisted = p_score` (full score is unassisted)
- `v_run_unassisted = p_score`
- `leaderboard`: `best_score`, `best_unassisted`, `lifetime_score`, `unassisted_lifetime_score` all updated
- `runs`: `score = p_score`, `unassisted_score = p_score`, `used_continue = false`

### Run with continue

**At continue time** (before the ad or free continue fires):

App calls `update_best_unassisted(p_score = <score at moment of continue>)`:
- Updates `leaderboard.best_unassisted = GREATEST(existing, p_score)`
- Does NOT touch `unassisted_lifetime_score` or `runs`
- This call is **best-effort and idempotent** — if it fails (network down), `submit_score` will still update `best_unassisted` correctly at game-end via `p_pre_continue_score`

**At game-over** (after player finishes the continued run):

App calls `submit_score(p_used_continue=true, p_pre_continue_score=<score captured at continue time>)`:
- `v_unassisted = p_pre_continue_score` (the unassisted leg for both leaderboard and runs)
- `leaderboard`: `best_score` and `best_unassisted` updated, `lifetime_score += final_score`, `unassisted_lifetime_score += pre_continue_score`
- `runs`: `score = final_score`, `unassisted_score = pre_continue_score`, `used_continue = true`

**Why `submit_score` owns all accounting?** Previously `update_best_unassisted` incremented `unassisted_lifetime_score` at continue time, and `submit_score` used `v_unassisted=0` to avoid double-counting. This created a silent failure: if `update_best_unassisted` failed due to network issues, the all-time unassisted stats were permanently wrong. Now `submit_score` is the single source of truth for all aggregate updates. `update_best_unassisted` is purely a real-time optimization (updates `best_unassisted` before the run ends) and is safe to fail.

### Worked example (SharpBump880 test data)

| Run | What happened | DB row |
|-----|--------------|--------|
| Game 1 | Played to 6, no continue | score=6, unassisted=6, used_continue=false |
| Game 2 | Played to 22, hit continue, finished at 43 | score=43, unassisted=22, used_continue=true |

**Unassisted filter** sees: 6 (run 1) + 22 (unassisted leg of run 2) → lifetime = 28  
**Overall filter** sees: 6 (run 1) + 43 (final score of run 2) → lifetime = 49  

`leaderboard` row: `best_score=43, best_unassisted=22, lifetime_score=49, unassisted_lifetime_score=28` ✓

---

## Query Routing: All Time vs Period

All four leaderboard query functions (`get_leaderboard_best`, `get_leaderboard_lifetime`, `get_best_rank_and_percentile`, `get_lifetime_rank_and_percentile`) use the same branching logic:

```
p_time_period = 'all'          → query leaderboard table (fast aggregate, indexed)
p_time_period = 'day'          → query runs WHERE played_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
p_time_period = 'week'         → query runs WHERE played_at >= date_trunc('week', ...) [ISO week, starts Monday]
p_time_period = 'month'        → query runs WHERE played_at >= date_trunc('month', ...)
```

Period resets are **UTC midnight** (day), **Monday UTC midnight** (week), **1st of month UTC midnight** (month). "All Time" never resets.

For period queries:
- **Best score** = `MAX(score)` or `MAX(unassisted_score)` from `runs` in the window
- **Lifetime** = `SUM(score)` or `SUM(unassisted_score)` from `runs` in the window

The `leaderboard` table is **never used for period queries**. It only serves "All Time."

---

## Overall vs Unassisted: Per-Query Logic

Both `get_leaderboard_best` and `get_leaderboard_lifetime` accept `p_unassisted boolean`:

| `p_unassisted` | Best score column | Lifetime column | Filter |
|----------------|------------------|-----------------|--------|
| `false` (Overall) | `best_score` / `score` | `lifetime_score` / `score` | All runs |
| `true` (Unassisted) | `best_unassisted` / `unassisted_score` | `unassisted_lifetime_score` / `unassisted_score` | Excludes runs where unassisted value = 0 |

The `used_continue` badge shown on leaderboard entries is derived, not stored: if a player's best overall score > their best unassisted score, their best came from a continued run.

---

## Rank and Percentile

`get_best_rank_and_percentile` and `get_lifetime_rank_and_percentile` compute:

- `rank` = (count of players with a higher score) + 1
- `percentile` = percentage of players the user beats = `(total - better - 1) / total * 100`

Both functions accept the same filter parameters (difficulty, time period, scope) as the corresponding leaderboard functions, so rank is always computed against the same population shown in the list.

---

## Difficulty Filter

- When `p_difficulty` is a specific value: filters `leaderboard`/`runs` rows to that difficulty only.
- When `p_difficulty IS NULL` (All): aggregates across all difficulty rows per player. For best score, the difficulty shown is whichever difficulty produced the player's top score. For lifetime, all difficulties are summed.

---

## Scope (Global vs Following)

When `p_follower_id` is provided, all queries add:

```sql
AND player_id IN (
  SELECT following_id FROM follows WHERE follower_id = p_follower_id
  UNION ALL SELECT p_follower_id  -- include the viewer themselves
)
```

---

## Security Model

- `anon` and `authenticated` roles have **SELECT only** on all tables. INSERT/UPDATE/DELETE/TRUNCATE are revoked.
- All write functions are `SECURITY DEFINER` — they run as the function owner (postgres) and bypass RLS.
- The only write path is through the defined stored procedures.
- **Supabase Anonymous Auth** is enabled. On first launch, `getPlayerIdentity()` calls `supabase.auth.signInAnonymously()`, which issues a JWT bound to that device. The JWT's `auth.uid()` becomes the player's permanent `player_id`.
- Every write function begins with: `IF auth.uid() IS NULL OR auth.uid()::text != p_player_id THEN RETURN; END IF;` — so a caller cannot write data under any player_id other than their own authenticated UID. Impersonating another player is fully blocked.
- **Remaining limitation**: A player can still inflate their own score by calling `submit_score` directly with an arbitrary `p_score`. Preventing this would require server-side game logic validation.
- **Migration**: `migrate_player_id` handles existing installs that had a random UUID before anonymous auth was introduced. It moves all `leaderboard`, `runs`, and `follows` rows to the new auth UID atomically.

---

## Stored Functions Reference

| Function | Security | Purpose |
|----------|----------|---------|
| `submit_score` | DEFINER | Main score submission. Accepts optional `p_idempotency_key`; early-returns if key already exists in `runs`. Upserts `players`, `leaderboard`, inserts `runs`. Single source of truth for all aggregate accounting. |
| `update_best_unassisted` | DEFINER | Called at continue time. Updates `leaderboard.best_unassisted` only (idempotent GREATEST — safe to fail). Does NOT touch `unassisted_lifetime_score`. |
| `get_leaderboard_best` | INVOKER | Returns top-N players by best score. Routes to `leaderboard` or `runs` based on period. |
| `get_leaderboard_lifetime` | INVOKER | Returns top-N players by lifetime score. Same routing. |
| `get_best_rank_and_percentile` | DEFINER | Computes rank + percentile for a given score. |
| `get_lifetime_rank_and_percentile` | INVOKER | Same for lifetime. |
| `register_player` | DEFINER | Called on first launch. Inserts into `players` with collision-safe name. |
| `update_display_name` | DEFINER | Renames player in both `players` and `leaderboard`. |
| `reset_player_scores` | DEFINER | Deletes player's rows from `leaderboard` and `runs`. Does not touch `players`. |
| `search_players` | DEFINER | Search by display_name. Only returns players with `best_score > 0`. |
| `get_following` | DEFINER | Returns list of followed players with their best scores. |
| `migrate_player_id` | DEFINER | One-time migration: moves all rows from old random UUID to new Supabase auth UID. Guards against caller claiming a UID they don't own. |
| `follow_player` | DEFINER | Adds a follow. Guards against self-follow. |
| `unfollow_player` | DEFINER | Removes a follow. |

---

## Data Lifecycle

- **Registration**: `register_player` is called on first app launch. A `players` row is created with a unique display name. No `leaderboard` row exists yet.
- **Score submission**: `submit_score` upserts both `leaderboard` (all-time) and `runs` (period). The player appears in leaderboards only after their first submission.
- **Continue**: `update_best_unassisted` optimistically updates `best_unassisted` in the leaderboard (best-effort, safe to fail). At game end, `submit_score` is the authoritative write: it sets `unassisted_score = p_pre_continue_score` in `runs` and increments `unassisted_lifetime_score` in `leaderboard`.
- **Reset**: `reset_player_scores` wipes `leaderboard` and `runs` for the player. The `players` row (name) is preserved. The player disappears from leaderboards until their next game.
- **Purge**: pg_cron runs `DELETE FROM runs WHERE played_at < now() - interval '35 days'` nightly at 3:00 AM UTC. The `leaderboard` table is never purged — it holds all-time aggregates indefinitely.

---

## Offline Queue

Scores that fail to submit (network timeout, offline) are queued in AsyncStorage (`td_score_queue`). The queue is replayed on the next app launch via `replayQueue()` in `lib/scoreQueue.ts`. Each queued entry includes:
- `p_pre_continue_score` — so the `runs` table is correctly populated on replay
- `p_idempotency_key` — a UUID generated at submit time and preserved across retries, so if the original request actually succeeded (Supabase accepted it but the reply timed out), the replay is a safe no-op

Entries with unknown player identity are temporarily stored as `player_id: 'unknown'` and resolved on replay.

---

## Analytics

### `analytics_daily` table

One row per UTC calendar day. Written nightly by pg_cron at **3:01 AM UTC** (one minute after the `runs` purge, so yesterday's data is always complete). Never purged — grows by one row per day indefinitely.

| Column | Description |
|--------|-------------|
| `date` | UTC calendar date (PK) |
| `dau` | Distinct players who completed a run that day |
| `wau` | Distinct players in the trailing 7 days ending that day |
| `mau` | Distinct players in the trailing 30 days ending that day |
| `new_players` | Players who registered that day |
| `total_players` | Cumulative total registered players |
| `total_runs` | Runs completed that day |
| `runs_per_dau` | Average runs per active player (engagement depth) |
| `continue_rate` | % of runs where a continue was used (monetization signal) |
| `runs_easy/medium/hard` | Run volume by difficulty |
| `avg_score` | Average score across all runs that day |
| `avg_score_easy/medium/hard` | Average score per difficulty |
| `retained_d1` | Players who registered the prior day and played today (Day 1 retention) |
| `retained_d7` | Players who registered 7 days prior and played in the 7-day window (Day 7 retention) |

### Querying analytics

```sql
-- Full history at a glance
SELECT date, dau, new_players, total_runs, runs_per_dau, continue_rate, retained_d1, retained_d7
FROM analytics_daily ORDER BY date DESC;

-- Continue rate with 7-day rolling average
SELECT date, continue_rate,
  ROUND(AVG(continue_rate) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW), 2) AS rolling_7d
FROM analytics_daily ORDER BY date;

-- Monthly rollup
SELECT DATE_TRUNC('month', date) AS month,
  ROUND(AVG(continue_rate), 2) AS avg_continue_rate,
  SUM(total_runs) AS total_runs
FROM analytics_daily GROUP BY 1 ORDER BY 1;
```

Run `SELECT public.record_daily_analytics()` manually in the Supabase SQL editor to backfill or re-run any day. `ON CONFLICT DO UPDATE` makes it safe to run multiple times.

---

## Known Limitations

1. **No server-side score validation**: `submit_score` accepts any integer score. A maximum score guard (e.g. `IF p_score > 9999999 THEN RETURN`) has not been added but would be easy to add inside the function.
2. **Self-score inflation**: With anonymous auth, the server can verify a caller is who they claim to be, but cannot verify the submitted score actually occurred in a real game. Fully preventing this requires server-side game logic validation.
3. **`update_best_unassisted` is a real-time optimization only**: It updates `best_unassisted` before the run is over so the leaderboard reflects the pre-continue score immediately. It does NOT touch `unassisted_lifetime_score`. All aggregate accounting is owned exclusively by `submit_score`. Do not add cumulative increments back to `update_best_unassisted`.
