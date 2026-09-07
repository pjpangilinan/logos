# /scripts

Node fetch scripts — one per data source. Run by GitHub Actions on a schedule.

Each script upserts normalized rows into `data/aggregator.db` using `better-sqlite3`.
