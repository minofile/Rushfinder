RushFinder V0222 — company rush connection setup (built on V0221)

Keeps music/Appwrite and existing pages. Adds an in-page company archive HTTPS endpoint setup, validation, connection diagnostics, and LAN archive navigation.

IMPORTANT: A local HTTP server at 192.168.x.x:8787 cannot be accessed directly by https://rushfinder.vercel.app due to browser mixed-content/private-network protections. This ZIP does NOT automatically establish a secure tunnel, certificate, network access restriction or authentication. Set up a company-only HTTPS endpoint and then enter it in the Company Rush settings. Do not publish the archive unauthenticated to the Internet.

The company archive remains read-only and is scanned from the existing SMB folder by lan-rush/server.js on the central Windows PC. PC must remain on during work hours.
