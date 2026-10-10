RushFinder V0180 — RSS music integration

Set the Vercel environment variable RSS_MUSIC_FEEDS to comma-separated HTTPS RSS URLs
from publishers that authorize indexing and linking to their audio files.
Only RSS <enclosure url="https://...mp3" type="audio/mpeg" /> entries are included.
No source websites or feeds are preconfigured; this avoids inventing providers or
extracting MP3 links from websites without permission.

For Persian search queries, the site searches /api/rss-music rather than MajidAPI.
Results preserve the real titles. Download buttons link to the original MP3 URL.
The browser or origin server can still choose to play the MP3 instead of saving it;
cross-origin download attributes cannot guarantee a forced download.

Example: RSS_MUSIC_FEEDS=https://example.org/music/feed.xml
(The example is illustrative, not an actual music feed.)
