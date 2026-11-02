RushFinder 0805 - Fix download navigation in News Tag
=====================================================
- Main page: index.html (News Tag is embedded, no separate page)
- Start on Windows: Start-RushFinder.cmd
- Local address: http://127.0.0.1:18818/index.html?v=0805
- Download button now fetches the final MP4 and starts a real file download.
- It never navigates the embedded News Tag frame to the video URL.
- Download failures are shown in the News Tag status area.
- The video preview continues to work in the same panel.
- Original After Effects project and calendar assets are unchanged.
- IMPORTANT: the missing text plate in the supplied MP4 is a separate
  After Effects rendering issue; this version does not claim to fix it.
- After making a video, click "دریافت MP4 نهایی" and confirm a file
  is saved while the index.html screen remains visible.
- To test with Vercel, deploy the changed index.html + files to the
  existing project. The local render engine must be running on Windows.
