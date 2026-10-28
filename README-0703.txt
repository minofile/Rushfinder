RushFinder Web 0703
- netarz API timeout increased from 55s to 240s; Vercel maxDuration=300s (requires Fluid Compute).
- Do not retry failed same-prompt requests without checking usage.
- Safe elapsedMs and stage in error replies.
- Existing images may exceed Vercel 4.5MB response limit; the API reports this rather than silently retrying.
- Existing Netarz calls cannot be resumed or recovered unless the provider offers a supported status/result endpoint.
- No new API function files added.
