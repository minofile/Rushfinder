RushFinder V0231 — Real company archive thumbnails

IMPORTANT: Deploy this ZIP to Vercel AND replace lan-rush/server.js on the Windows archive computer. Restart the local server. Deploying to Vercel alone cannot update the Windows LAN server.

On Windows install FFmpeg if not installed:
  winget install --id Gyan.FFmpeg -e
Close and reopen CMD after installation, check: ffmpeg -version

The server reads videos from the configured RUSH_ROOT and extracts a JPEG at 1 second on demand; files remain on the LAN. The /thumbnail URL is short-lived signed, and images use the same fixed RushFinder CORS origin. For very short clips or unsupported codecs the placeholder will remain.

Keep the local Node server and Cloudflare Tunnel CMD windows running. Quick Tunnel URLs can change after restart.
