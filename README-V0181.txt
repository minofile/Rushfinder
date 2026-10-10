RushFinder V0181

Removed legacy MajidAPI/Melobit playback resolution and Cloudflare fallback from the active music player. Removed unused api/iranian-music.js.
Persian free-text queries use /api/rss-music and require RSS_MUSIC_FEEDS to be configured in Vercel with authorized HTTPS RSS feeds containing direct audio enclosures. Without feeds, no Iranian songs can be fetched.
Playback only accepts direct HTTPS audio URLs and reports origin playback errors. The browser and origin determine whether direct download works.
No changes to video search or visual layout.
