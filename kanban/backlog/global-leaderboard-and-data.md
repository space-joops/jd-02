# 🏆 Global Leaderboard & Real Data

## 🎯 Design Vision
Arcade games thrive on competition. We need to transition from local `Best Score` to a global ranking system, and incorporate real satellite data to educate and immerse players.

## 📝 Specifications
- **Backend**: Supabase (PostgreSQL) for fast, lightweight leaderboard queries.
- **Anonymous Auth**: Allow players to submit scores using a 3-letter arcade-style initial (e.g., "TOM", "AAA").
- **Real Satellite API**: Pull a subset of real space debris data from CelesTrak or similar APIs and inject them as special "Boss" level junks.

## 🧠 Designer's Note
To maintain the casual vibe, the leaderboard should highlight "Total Junk Cleared Globally" as a collective community goal, fostering a sense of shared environmental responsibility.
