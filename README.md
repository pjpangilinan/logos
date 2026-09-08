# logos

[![Deploy to GitHub Pages](https://github.com/pjpangilinan/logos/actions/workflows/deploy.yml/badge.svg)](https://github.com/pjpangilinan/logos/actions/workflows/deploy.yml)
[![Fetch Data](https://github.com/pjpangilinan/logos/actions/workflows/fetch.yml/badge.svg)](https://github.com/pjpangilinan/logos/actions/workflows/fetch.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite_WASM-003B57?style=flat&logo=sqlite&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat&logo=githubactions&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-222222?style=flat&logo=githubpages&logoColor=white)

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

4. *(Optional)* Add free `TMDB_API_KEY` and `RAWG_API_KEY` in repository **Settings** → **Secrets and variables** → **Actions** for scheduled data fetches:
   - **Automated Schedule**: Runs every day at **06:00 UTC** (2:00 PM UTC+8 / Philippine Time).
   - **Manual Trigger**: Under **Actions** tab → select **Fetch Data** → click **Run workflow**.
   - **Auto Deploy**: After each fetch, GitHub Pages re-deploys automatically with the freshly updated SQLite database.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1` / `2` / `3` / `4` | Switch to Radar / Explorer / Library / Settings |
| `/` or `Cmd+K` | Focus search |
| `Esc` | Clear/blur search or close modals |
| `j` / `k` | Scroll down / up |
| `?` | Toggle shortcuts modal |
