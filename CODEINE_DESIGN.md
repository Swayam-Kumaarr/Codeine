# Codeine — Project Design Document

> Personal productivity PWA for a CSA 2nd-year student (Swayam). Tracks coding roadmaps, college syllabus, gym splits, streaks, and XP. Built to be used daily like a habit tracker meets study planner.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router |
| Language | TypeScript, React 19 |
| Styling | Tailwind CSS v4 + inline styles (design tokens via CSS vars) |
| Database | Supabase (Postgres + Auth + RLS + RPC functions) |
| Animations | GSAP (cubes background), Lenis (smooth scroll) |
| Hosting | Vercel (Production) |
| Push notifications | Web Push API + VAPID keys |
| Icons | Lucide React |
| Fonts | Clash Display (headings), Cabinet Grotesk / Inter (body) |

---

## Design Tokens (globals.css)

```css
--bg:          #F0EDE8   /* warm off-white, main background */
--bg-panel:    #EAE6E0   /* slightly darker, card/panel bg */
--bg-hover:    #E4DFD8   /* hover state */
--ink:         #1A1714   /* near-black, primary text + buttons */
--ink-2:       #6B6560   /* secondary text */
--ink-3:       #A8A29C   /* placeholder, muted labels */
--line:        rgba(26,23,20,0.08)   /* subtle dividers */
--line-strong: rgba(26,23,20,0.14)  /* stronger borders */

/* Subject/roadmap palette */
--dsa-bg:   #EDE8F7  --dsa-ink:  #3D1F8A   /* purple — DSA */
--java-bg:  #E0EDEA  --java-ink: #1A4A3C   /* green  — Java */
--lc-bg:    #FDF0D8  --lc-ink:   #7A4800   /* amber  — LeetCode */
--rev-bg:   #F2E8E8  --rev-ink:  #7A2020   /* red    — Revision/Gym */

--r: 3px   /* max border-radius everywhere — keep it sharp */
```

**Typography rules:**
- Headings: `font-family: var(--font-head)` — Clash Display, weight 600–700, tight `letter-spacing: -0.03em`
- Body: Inter, 15px base, `line-height: 1.55`
- Labels/tags: 10–11px, `font-weight: 600`, `letter-spacing: 0.08em`, `text-transform: uppercase`
- Numbers/stats: `font-variant-numeric: tabular-nums`, Clash Display

**Do NOT:**
- Use rounded corners beyond `var(--r)` (3px) — this is a deliberate sharp aesthetic
- Use white (`#fff`) as background — always use `var(--bg)` or `var(--bg-panel)`
- Add box shadows unless absolutely necessary
- Use emojis in UI unless already present

---

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page (cube bg + hero)
│   ├── layout.tsx                  # Root layout (Lenis, cursor, push setup)
│   ├── globals.css                 # All tokens + layout CSS
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx         # DPDP-compliant, consent logging
│   │   └── forgot-password/page.tsx
│   ├── auth/callback/route.ts      # Supabase OAuth callback
│   ├── onboarding/page.tsx         # First-time setup (name, usernames, study time)
│   ├── dashboard/
│   │   ├── layout.tsx              # Sidebar nav + XP bar + streaks
│   │   ├── page.tsx                # Today — tasks, roadmap progress
│   │   ├── roadmaps/page.tsx       # Preset + custom roadmaps, pause/resume
│   │   ├── upcoming/page.tsx       # Week view timetable
│   │   ├── pending/page.tsx        # Overdue tasks
│   │   ├── syllabus/
│   │   │   ├── page.tsx            # Subject list + file import
│   │   │   └── [id]/page.tsx       # Subject detail, topic checkoff
│   │   ├── gym/page.tsx            # Weekly split + workout log
│   │   ├── notifications/page.tsx  # Push prefs, LC/GH status, log
│   │   └── settings/page.tsx       # Profile, usernames, study time
│   ├── api/
│   │   ├── leetcode/route.ts       # Proxy LC GraphQL stats
│   │   ├── leetcode/contests/route.ts
│   │   ├── github/status/route.ts  # Last commit + days ago
│   │   ├── push/subscribe/route.ts # Save push subscription
│   │   ├── push/send/route.ts      # Send push notification
│   │   ├── push/test/route.ts      # Test push (dev)
│   │   ├── consent/route.ts        # DPDP consent logging (service role)
│   │   └── notify/
│   │       ├── digest/route.ts     # Cron: daily roadmap digest
│   │       ├── github/route.ts     # Cron: GitHub inactivity
│   │       ├── leetcode/route.ts   # Cron: LC daily reminder
│   │       ├── gym/route.ts        # Cron: gym reminder
│   │       └── missed/route.ts     # Cron: missed tasks
│   ├── terms/page.tsx              # T&C (v1.0, India governing law)
│   └── privacy/page.tsx            # Privacy policy (DPDP Act 2023)
├── components/
│   ├── Cubes.tsx                   # Interactive 3D cube grid (GSAP)
│   ├── Cursor.tsx                  # Custom cursor (dot + ring)
│   ├── CursorInit.tsx              # Client-side cursor init
│   ├── PushSetup.tsx               # Auto push subscription on load
│   ├── TimePicker.tsx              # Time input component
│   └── OfflineBanner.tsx           # PWA offline indicator
├── data/
│   └── roadmaps.ts                 # All preset roadmap data (Java OOP, DSA)
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client (cookies)
│   │   └── middleware.ts           # Auth session refresh middleware
│   ├── hooks/
│   │   ├── useProfile.ts           # Profile fetch + cache + invalidate
│   │   └── useTodaysTasks.ts       # Today's task gen + markDone + XP
│   └── utils.ts
└── proxy.ts                        # Next.js proxy config (replaces middleware.ts)
```

---

## Supabase Schema

### Tables

```sql
-- User profiles (extends auth.users)
profiles (
  id uuid PK references auth.users,
  name text,
  github_username text,
  leetcode_username text,
  study_time text,           -- "08:00"
  xp int default 0,
  level int default 1,
  streak int default 0,      -- consecutive all-tasks-done days
  login_streak int default 0,
  last_active date,
  last_login_date date,
  avatar_url text,
  created_at timestamptz
)

-- Daily tasks (auto-generated from journeys + manual)
tasks (
  id uuid PK,
  user_id uuid FK profiles,
  roadmap_id text,           -- 'dsa' | 'java' | null (custom)
  topic_number int,
  title text,
  description text,
  scheduled_date date,
  done boolean default false,
  done_at timestamptz,
  xp_value int default 30,
  created_at timestamptz
)

-- Preset roadmap journeys
journeys (
  id uuid PK,
  user_id uuid FK,
  roadmap_id text,           -- 'dsa' | 'java'
  started_at date,
  paused_at date,            -- null = active
  days_paused int default 0,
  created_at timestamptz,
  UNIQUE(user_id, roadmap_id)
)

-- Custom roadmaps
custom_roadmaps (
  id uuid PK,
  user_id uuid FK,
  name text,
  description text,
  created_at timestamptz
)

custom_roadmap_topics (
  id uuid PK,
  roadmap_id uuid FK custom_roadmaps,
  name text,
  duration_days int default 1,
  position int default 0,
  notes text
)

custom_journeys (
  id uuid PK,
  user_id uuid FK,
  custom_roadmap_id uuid FK custom_roadmaps,
  started_at date,
  paused_at date,
  days_paused int default 0,
  UNIQUE(user_id, custom_roadmap_id)
)

-- College subjects + syllabus
subjects (
  id uuid PK,
  user_id uuid FK,
  name text,
  code text,
  color text,                -- hex e.g. "#3D1F8A"
  bg_color text,             -- hex e.g. "#EDE8F7"
  topics text[],             -- flat array of topic strings
  topics_done text[],        -- subset of topics that are checked off
  created_at timestamptz
)

-- Gym
gym_split (
  id uuid PK,
  user_id uuid FK,
  day_of_week int,           -- 0=Sun … 6=Sat
  label text,                -- 'Push' | 'Pull' | 'Legs' | 'Rest' etc.
  exercises text[],
  notes text,
  UNIQUE(user_id, day_of_week)
)

gym_logs (
  id uuid PK,
  user_id uuid FK,
  log_date date,
  split_label text,
  notes text,
  done boolean default false,
  done_at timestamptz,
  UNIQUE(user_id, log_date)
)

-- Daily streak log
streak_log (
  id uuid PK,
  user_id uuid FK,
  log_date date,
  tasks_done int default 0,
  UNIQUE(user_id, log_date)
)

-- Push notifications
push_subscriptions (
  id uuid PK,
  user_id uuid FK,
  endpoint text,
  p256dh text,
  auth text,
  created_at timestamptz
)

notification_prefs (
  id uuid PK,
  user_id uuid FK UNIQUE,
  github_enabled boolean default true,
  github_inactive_days int default 7,
  leetcode_daily boolean default true,
  leetcode_contests boolean default true,
  gym_reminder boolean default true,
  gym_reminder_time text default '07:00',
  roadmap_daily boolean default true,
  updated_at timestamptz
)

notification_log (
  id uuid PK,
  user_id uuid FK,
  type text,                 -- 'github' | 'leetcode_daily' | 'gym' | 'roadmap'
  title text,
  body text,
  sent_at timestamptz default now()
)

-- DPDP Act 2023 consent (service role only, 7yr retention)
consent_log (
  id uuid PK,
  user_id uuid FK,
  email text,
  consent_type text,         -- 'terms' | 'privacy' | 'marketing'
  accepted boolean,
  ip_address text,
  user_agent text,
  tc_version text,
  pp_version text,
  created_at timestamptz default now()
)
```

### RPC Functions

```sql
-- Award XP + update level
award_xp(p_user_id uuid, p_xp int, p_reason text)

-- Recalculate task streak (called after every task completion)
update_streak(p_user_id uuid)

-- Increment login streak once per calendar day
update_login_streak(p_user_id uuid)
```

### Required Index

```sql
create index idx_streak_log_user_date on streak_log(user_id, date desc);
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://nutdkfixsooxcaczhzde.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only, consent logging

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:mailbox.swayam@gmail.com

# Cron auth
CRON_SECRET=...                      # Vercel cron routes check: Bearer <CRON_SECRET>
```

---

## Key Patterns

### Supabase clients
- `createClient()` from `@/lib/supabase/client` — browser (anon key)
- `createClient()` from `@/lib/supabase/server` — server components/routes (reads cookies)
- Service role client — only in API routes that need to bypass RLS (consent logging)

### Auth flow
- Email/password + Google OAuth
- `src/app/auth/callback/route.ts` handles OAuth redirect
- `src/proxy.ts` (not middleware.ts — deleted) refreshes session on every request

### Task generation logic (`useTodaysTasks.ts`)
- On load: fetch active journeys → check if today's roadmap task exists → if not, auto-insert
- Skips paused journeys (`journey.paused_at !== null`)
- `generating` ref with try/finally prevents race conditions
- `markDone` → update task → `award_xp` RPC → upsert streak_log → `update_streak` RPC

### Roadmap day calculation
```ts
// getDayNumber(startDateISO, daysPaused?)
// Returns: days since start - days paused, minimum 1
// When paused: freeze at paused_at date (don't count forward)
getActiveDayNumber(startISO, daysPaused, pausedAt):
  if pausedAt → return diff(pausedAt - startISO) - daysPaused
  else → return diff(today - startISO) - daysPaused
```

### Pause/resume (preset journeys)
- Pause: set `paused_at = today`
- Resume: `extraDays = today - paused_at`, add to `days_paused`, clear `paused_at`

### Preset roadmaps
- Defined in `src/data/roadmaps.ts` — two roadmaps: `'java'` (83 days) and `'dsa'` (~180 days)
- Each topic has: `number, name, durationDays, startDay, endDay, schedule[], subtopics[]`
- `getCurrentTopic(roadmap, dayNum)` returns `{ topic, dayWithinTopic }`

---

## Pages — What Each Does

| Page | Path | Data Source |
|---|---|---|
| Today | `/dashboard` | `tasks` table + `journeys` |
| Roadmaps | `/dashboard/roadmaps` | `journeys`, `custom_roadmaps`, `custom_roadmap_topics`, `custom_journeys` |
| Upcoming | `/dashboard/upcoming` | `tasks` (future 7 days) |
| Pending | `/dashboard/pending` | `tasks` where `done=false AND scheduled_date < today` |
| Syllabus | `/dashboard/syllabus` | `subjects` table |
| Subject detail | `/dashboard/syllabus/[id]` | `subjects` by id |
| Gym | `/dashboard/gym` | `gym_split`, `gym_logs` |
| Notifications | `/dashboard/notifications` | `notification_prefs`, `notification_log`, `/api/leetcode`, `/api/github/status` |
| Settings | `/dashboard/settings` | `profiles` |

---

## Sidebar (dashboard layout)
- Logo "Codeine" top left
- XP bar: level + XP / 500, progress bar
- Two streak badges side by side: login streak (📅) + task streak (🔥)
- Nav links: Today, Roadmaps, Upcoming, Pending, Syllabus, Gym
- Bottom: Notifications, GitHub ↗ (if username set), Settings, Sign out
- User name + @github shown at very bottom

---

## Cubes Background (Landing Page)
- `<Cubes>` component wraps a GSAP-powered 3D grid of cubes
- On landing page: `position: fixed; inset: 0; z-index: 0; pointer-events: none`
- `listenOnWindow={true}` — mouse events captured at window level so cubes react behind UI
- Props used on landing: `gridSize={12} maxAngle={35} radius={4} borderStyle="1px solid rgba(26,23,20,0.10)" faceColor="#EAE6E0" rippleColor="#1A1714" autoAnimate={true} rippleOnClick={true}`
- UI sits at `z-index: 1` on top; sections that need solid bg use `background: var(--bg)` explicitly

---

## Legal / Compliance
- **DPDP Act 2023 (India)** compliant signup
- Two unchecked checkboxes: T&C (required, blocks submit) + Marketing emails (optional)
- Every consent action logged to `consent_log` via `/api/consent` (POST, service role)
- Grievance Officer: mailbox.swayam@gmail.com, 72h response
- T&C at `/terms`, Privacy Policy at `/privacy`
- Retention: consent logs kept 7 years even after account deletion

---

## What's NOT done yet (pending manual SQL + features)

1. **SQL not run yet** — all tables above may not exist. Must run in Supabase SQL editor:
   - `consent_log`, `custom_roadmaps`, `custom_roadmap_topics`, `custom_journeys`
   - `alter table journeys add column if not exists paused_at date`
   - `alter table journeys add column if not exists days_paused int not null default 0`
   - Same alter for `custom_journeys`
   - `award_xp`, `update_streak`, `update_login_streak` RPC functions
   - `streak_log` index

2. **Push notifications** — non-functional until VAPID env vars added to Vercel

3. **Timetable** (`/dashboard/upcoming`) — may still use hardcoded data, needs to pull from `tasks` table

4. **APK** — PWA can be installed via "Add to Home Screen" on Android; true APK needs Capacitor setup

5. **Subject detail page** (`/dashboard/syllabus/[id]`) — exists but not audited

---

## Repo
- GitHub: `github.com/Swayam-Kumaarr/Codeine`
- Branch: `master`
- Vercel project: `codeine` (mailboxswayam-3742 team)
- Supabase project ref: `nutdkfixsooxcaczhzde`
