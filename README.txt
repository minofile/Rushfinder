RushFinder V0102
YouTube quota optimization:
- 6-hour server-side cache for repeated YouTube searches on warm Vercel instances.
- Cached YouTube search.list responses avoid repeated 100-unit calls for identical searches.
- Cached videos.list metadata responses.
- Keeps V0101 protection against repeated YouTube fill-round requests.
Note: cache reduces future quota usage; it cannot restore quota already exhausted today.
