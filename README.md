# logos

<div align="center">
  <img src="icon.png" alt="logos icon" width="80" height="80" style="border-radius: 16px;" />
  <p><strong>A personal release radar for movies, TV series, games, and news.</strong></p>
  <p>Runs entirely on free static infrastructure: GitHub Actions + GitHub Pages + Client-side SQLite (WASM).</p>
</div>

---

## Highlights

- **Split-Stream Radar**: Live split stream separating **New Arrivals** (discovery order via `first_seen_at`) from **Upcoming Radar** (chronological release order).
- **Popular & Trending Side Rail**: Top 10 trending items filtered dynamically as you switch between categories (Movies, TV, Games, News).
- **Explorer & Interactive Calendar**: Browse the full release catalog with Grid, Timeline, and a full monthly visual calendar grid.
- **My Library & ICS Calendar Export**: Save releases, track countdown chronometers, mark as watched, and export your personal watchlist directly to your Apple/Google/Outlook calendar (`.ics`).
- **Custom RSS Feeds**: Add and toggle personal blogs or niche news feeds directly from browser settings without writing any code.
- **Global Keyboard Shortcuts**: Jump between views using `1-4`, hit `/` to search, scroll feeds with `j`/`k`, and press `?` to toggle the shortcuts cheatsheet.
- **Zero Backend Cost**: No server, no external database container, and no backend API. Browser loads `aggregator.db` as binary and queries it directly with `sql.js` (WASM).
- **Privacy & Local Storage**: Bookmarks, custom RSS feeds, and settings stay private in your browser (`localStorage`).

---

## How It Works

```
GitHub Actions (Scheduled Cron at 06:00 UTC)
  │
  ├─► Fetch TMDB (Movies & TV)
  ├─► Fetch RAWG (Games)
  ├─► Fetch RSS Feeds (News)
  │
  ▼
Upsert normalized rows into single SQLite file (data/aggregator.db)
  │
  ├─► Commit data/aggregator.db if changed
  │
  ▼
Deploy Workflow
  │
  ├─► Build React + Vite app (app/)
  ├─► Bundle sql.js WASM + data/aggregator.db
  │
  ▼
GitHub Pages (Static Web Hosting)
  │
  ▼
User Browser: Loads aggregator.db into sql.js (WASM) & queries client-side
```

---

## Quick Start (Local Development)

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/logos.git
cd logos

# Install frontend dependencies
cd app
npm install

# Install fetch script dependencies
cd ../scripts
npm install
```

### 2. Run Local Frontend

```bash
cd ../app
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Fetch Scripts Locally (Optional)

Fetch scripts upsert into `data/aggregator.db`:

```bash
cd ../scripts

# Run RSS news fetch (requires no API key)
node fetch-rss.js

# Run TMDB movies/TV fetch (requires TMDB_API_KEY env var)
# TMDB_API_KEY="your_key" node fetch-tmdb.js

# Run RAWG games fetch (requires RAWG_API_KEY env var)
# RAWG_API_KEY="your_key" node fetch-rawg.js
```

Sync updated DB to local dev server public folder:
```powershell
Copy-Item -Path ../data/aggregator.db -Destination ../app/public/aggregator.db -Force
```

---

## Testing & Quality Gates

Run all automated test suites and linters:

```bash
# Frontend tests (27 unit tests: calendar, feeds, deduplication, shortcuts, platforms)
cd app
npm test

# Frontend linting (oxlint)
npm run lint

# Frontend production build
npm run build

# Ingestion pipeline tests (10 unit tests: normalization, schema preservation)
cd ../scripts
npm test
```

---

## Deploying to GitHub Pages

### 1. Push to GitHub
```bash
git remote add origin https://github.com/<your-username>/logos.git
git branch -M main
git push -u origin main
```

### 2. Configure GitHub Pages
1. In your GitHub repository, go to **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**.

### 3. Enable Workflow Write Permissions
1. Go to **Settings** → **Actions** → **General**.
2. Under **Workflow permissions**, select **Read and write permissions** and click **Save**. *(This enables the daily fetch job to commit the updated `aggregator.db`).*

### 4. Configure API Keys (Optional)
In **Settings** → **Secrets and variables** → **Actions**, add:
- `TMDB_API_KEY` — [The Movie Database API Key (Free)](https://www.themoviedb.org/documentation/api)
- `RAWG_API_KEY` — [RAWG Video Games Database API Key (Free)](https://rawg.io/apidocs)

*(If keys are omitted, news RSS feeds still update automatically and existing database rows remain intact).*

---

## Repository Structure

```
├── .github/workflows/
│   ├── fetch.yml         # Daily scheduled fetch job (commits data/aggregator.db)
│   └── deploy.yml        # Vite production build & GitHub Pages deploy
├── app/                  # React 19 + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/   # Radar, Explorer, Calendar, Library, Settings, Navbar
│   │   └── lib/          # sql.js loader, calendar math, custom feeds, shortcuts
│   ├── tests/            # Automated node:test suites
│   └── public/           # Static assets, wasm binaries, icon
├── data/
│   └── aggregator.db     # Committed SQLite database file
├── scripts/              # Node.js ingestion scripts (better-sqlite3)
│   ├── fetch-tmdb.js     # Movies and TV show scraper
│   ├── fetch-rawg.js     # Video games scraper
│   ├── fetch-rss.js      # News and blog RSS aggregator
│   └── tests/            # Ingestion unit tests
└── icon.png              # logos brand logo & favicon source
```

---

## License

MIT License. Built with React, Vite, Tailwind CSS, and `sql.js`.
