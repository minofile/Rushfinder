RushFinder V0195 — incremental reliability patch on user-provided V0194.
- No modifications to video search or YouTube.
- Music endpoint no longer invokes Freesound and legacy provider searches whose results are always discarded by the download-only filter; reduces avoidable latency and external requests.
- Stops reporting a misleading cumulative minimumTotal derived from page number; exact total remains unknown until a persistent indexed catalog is built.
- No claims of 1000 stored songs: storage account, rights clearance, and ingestion are not yet configured.
- Live provider playback/downloads cannot be verified from this offline build environment.
Deployment: preserve JAMENDO_CLIENT_ID if configured. Audius requires no key for current public search route.
