RushFinder V0197 - Appwrite OGG playback test

Fixes Appwrite adapter accepting MP3 only; now supports MP3, OGG, OGA, WAV, M4A, FLAC. Appwrite download action uses actual download endpoint. No YouTube/video changes.

Vercel environment variables (server-side only): APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_BUCKET_ID, APPWRITE_API_KEY. Use correct bucket ID 6aca3a52000d75ea5085. API key requires files.read; bucket must allow public read for browser playback. Redeploy Vercel after changing env vars.

Test: https://YOUR-SITE/api/appwrite-music?q=music should return data containing Sugerencia.ogg. On the site music search enter music, play and download.
