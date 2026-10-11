RushFinder V0196 — Appwrite Storage integration

Vercel > Project > Settings > Environment Variables:
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1  (replace with YOUR project's exact endpoint)
APPWRITE_PROJECT_ID=your project ID from Appwrite Overview
APPWRITE_BUCKET_ID=your bucket ID from Appwrite Storage > bucket
APPWRITE_API_KEY=server-only API key with files.read permission (never prefix VITE_ or NEXT_PUBLIC_)

Redeploy after adding environment variables. Visit /api/appwrite-music?q=music to verify that data contains actual uploaded MP3 files. A server-side API key may be required to list files even when public download access is enabled. Do not commit keys to GitHub.

Music page prefers Appwrite files when matching files exist, and otherwise uses existing audio sources. Video and YouTube code unchanged. This release does not bulk-copy copyrighted music or invent tracks. Only upload music with redistribution rights. Bucket read permission Any, no public create/update/delete.
