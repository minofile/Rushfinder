RushFinder V064
- Fixed duration filtering execution order.
- زیر ۱ دقیقه: only duration > 0 and < 60 seconds.
- بالای ۱ دقیقه: only duration >= 60 seconds.
- Unknown/zero duration items are excluded while a duration filter is active.
- Disabled API response caching for filter changes so an old unfiltered result is not reused.
Commit: Rush-V064
