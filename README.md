# Salary Hub

**Live site:** [https://salary-hub.netlify.app/](https://salary-hub.netlify.app/)

Salary Hub is a **community-built**, **anonymous** salary transparency tool focused on **India’s tech and professional workforce**. It exists because most salary platforms show a headline number—or rough bands—without the **full compensation picture**. Real decisions depend on **base**, **variable**, **joining and retention bonuses**, **equity annualisation**, **vesting**, **clawbacks**, and **benefits**. Salary Hub is designed so contributors can share that **complete breakdown** in one place, for everyone else’s benefit.

---

## Why this project

- **Built for the community** — submissions are anonymous; the dataset grows when people opt in to share.
- **Beyond headline CTC** — capture how pay is structured, not just a single total.
- **Honest comparisons** — filters and charts help you compare across **industry**, **city**, **experience**, and **company**, using the same breakdown logic.

---

## Features

| Area | What you get |
|------|----------------|
| **Feed** | Search and filter by industry and city; sort by newest, total CTC, or years of experience. |
| **Submission flow** | Multi-step form: role & location → fixed pay → variable → equity → perks → review. |
| **Breakdown** | Base, variable (target), joining bonus, retention bonus, equity type & annualised value, vesting notes. |
| **Transparency** | Optional notes on variable pay and equity; clawback flags where relevant. |
| **Charts** | Averages by industry, CTC vs experience bands, mix by industry, average CTC by city. |
| **Leaderboard** | Company-level stats: averages, medians, max CTC, average base. |
| **Privacy** | No accounts required for browsing or submitting in the current design. |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | [React](https://react.dev/) 18 |
| Build | [Vite](https://vitejs.dev/) 5 |
| Charts | [Recharts](https://recharts.org/) |
| Backend / DB | [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security) |
| Hosting | [Netlify](https://www.netlify.com/) (static deploy from `dist`) |

---

## Data model (Supabase)

Rows live in **`salary_entries`**:

- **Queryable columns** — fields used for filters, sorting, search, and aggregates (e.g. company, role, industry, location, experience, pay components, submitted date). **`total_ctc`** is a generated column aligned with the app’s total compensation formula.
- **`metadata` (JSONB)** — richer, display-oriented fields (equity grant totals, vesting text, perk IDs, free-text notes, clawback months, etc.).

Apply the schema from:

```text
supabase/migrations/20260501000000_salary_entries.sql
```

Run it in the Supabase SQL Editor (or your usual migration workflow).

---

## Local development

**Requirements:** Node.js 18+ (20 recommended).

```bash
git clone https://github.com/Souraja-Dasray/salary-hub.git
cd salary-hub
npm install
```

Create **`.env.local`** (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Set:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase **anon / publishable** key (never `service_role`) |

Start the dev server:

```bash
npm run dev
```

Production build and local preview of `dist/`:

```bash
npm run build
npm run preview
```

---

## Deploying (Netlify)

This repo includes **`netlify.toml`** so Netlify:

- runs **`npm run build`**
- publishes **`dist`** (required for Vite; publishing the repo root causes a blank page)

In **Netlify → Site configuration → Environment variables**, add the same **`VITE_*`** variables as in `.env.local`. Redeploy after any change—Vite inlines these at **build** time.

---

## Security notes

- Use only the **anon / publishable** key in the frontend and in `VITE_SUPABASE_ANON_KEY`.
- Keep **`service_role`** off the client and out of Netlify env vars that end up in the bundle.
- Do not commit **`.env.local`** (it is gitignored).

---

## Repository layout

```text
├── App.jsx                 # Main UI, tabs, form, Supabase load/submit
├── main.jsx                # React entry
├── salaryEntryDb.js        # Row ↔ app shape mapping
├── index.html
├── vite.config.js
├── netlify.toml            # Build & publish settings for Netlify
├── supabase/migrations/    # SQL schema for salary_entries
└── README.md
```

---

## Contributing

Issues and pull requests are welcome. Ideas that fit the project:

- Stronger anti-spam / abuse controls for anonymous inserts.
- Export or anonymised aggregates for research.
- Accessibility and mobile polish.

When contributing, avoid committing secrets; use `.env.local` locally only.

---

## Acknowledgment

Salary Hub is meant as a **good-faith community resource**. Compensation varies by individual, performance, and timing—use shared data as **signal**, not a contract or promise.
