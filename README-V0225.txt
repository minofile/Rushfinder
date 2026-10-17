RushFinder V0225 - security preparation (not a completed Vercel integration)

Changes:
- Local archive server binds to 127.0.0.1 by default instead of 0.0.0.0.
- The existing archive access key and signed 15-minute video URLs remain unchanged.
- Optional company IP filter via RUSH_COMPANY_IP; requires CF-Connecting-IP from a trusted Cloudflare Tunnel and loopback binding.
- The music, search, UI, and Vercel API files are copied unchanged from V0224.

Steps now:
1. Close the old server window.
2. Extract this ZIP, run lan-rush/start-windows.bat.
3. Open http://localhost:8787 and enter the existing archive key.
4. Do NOT add a public Cloudflare route yet.

Important: cloudflared installed as a Windows service is not yet linked to any published application.
Without a Cloudflare-managed domain, a named tunnel alone cannot provide a stable public hostname for Vercel.
A temporary trycloudflare.com URL may be used for short-lived tests only, after reviewing access controls; it is not a stable production solution.
The company public IP may change; verify it before enforcing the allowlist.
