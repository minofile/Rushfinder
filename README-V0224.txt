RushFinder V0224 — secure archive preparation

- Server now requires a 64-character random access key for listing files.
- The key is created on first run in lan-rush/.rushfinder-secret (do not share publicly).
- Video and download URLs use 15-minute HMAC signatures.
- The main site sends the key using X-Rush-Key; never place it in a URL.
- Keep your existing Cloudflare tunnel without public routes until an HTTPS hostname and access controls are configured.
- IMPORTANT: Cloudflare Tunnel alone does not restrict access to the company network. A shared key alone does not prove company network location.
- This ZIP does not automatically connect the site to Cloudflare or configure a hostname.
- Old archive server must be stopped before starting this version.
