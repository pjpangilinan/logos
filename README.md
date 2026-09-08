# logos

A lightweight personal release radar for movies, TV series, games, and news.  
Runs 100% on free static infrastructure (GitHub Actions + GitHub Pages + client-side SQLite via WASM). No backend server, zero hosting cost.

---

## Features

- **Radar Deck**: Split-stream feed separating New Arrivals (discovery date) from Upcoming Releases (chronological release date).
- **Popular & Trending**: Top 10 trending releases, dynamically filtered by category (Movies, TV, Games, News).
- **Explorer & Calendar**: Full release catalog with Grid, Timeline, and interactive Monthly Calendar views.
- **My Library**: Save bookmarks, track countdowns, and export directly to `.ics` (Apple, Google, Outlook calendar).
- **Custom RSS Feeds**: Add and manage personal RSS/Atom feeds from Settings.
- **Keyboard Navigation**: Press `1`–`4` for tabs, `/` to search, `j`/`k` to scroll, `?` for shortcuts.

---

## Local Development

```bash
# 1. Install dependencies
cd app && npm install
cd ../scripts && npm install

# 2. Start dev server
cd ../app && npm run dev
```

Open `http://localhost:5173`.

---

## Deploy to GitHub Pages

1. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/<username>/logos.git
   git branch -M main
   git push -u origin main
   ```

2. **Enable Pages**:
   - Go to repository **Settings** → **Pages** → Source: select **GitHub Actions**.

3. **Enable Write Permissions**:
   - Go to **Settings** → **Actions** → **General** → Workflow permissions → select **Read and write permissions** → click **Save**.

4. *(Optional)* Add free `TMDB_API_KEY` and `RAWG_API_KEY` in repository **Settings** → **Secrets and variables** → **Actions** for daily scheduled data fetches.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1` / `2` / `3` / `4` | Switch to Radar / Explorer / Library / Settings |
| `/` or `Cmd+K` | Focus search |
| `Esc` | Clear/blur search or close modals |
| `j` / `k` | Scroll down / up |
| `?` | Toggle shortcuts modal |
