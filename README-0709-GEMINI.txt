RushFinder 0709 - Gemini Image via Chabokan

1. This ZIP is a complete copy of RushFinder 0708 with only the infographic provider changed.
2. Deploy this as a NEW preview / test deployment first. Do not delete the live site.
3. Configure these server-side environment variables in Vercel or Node.js host:
   CHABOKAN_API_KEY = private API key (NEVER commit)
   CHABOKAN_IMAGE_URL = full HTTPS image-generation POST URL from Chabokan API docs
   CHABOKAN_IMAGE_MODEL = exact model ID from Chabokan API docs for Nano Banana 2 Lite
4. Uses OpenAI-compatible POST /images/generations schema. You MUST verify that Chabokan supports this endpoint and schema. It has not been confirmed.
5. On test site open /api/avalai-image?probe=gemini for a zero-image, zero-billing configuration check.
6. Image generation may cost money. Press free template test first.
7. The legacy API function name is intentionally preserved so Vercel Hobby function count stays unchanged.
8. Do NOT put API key in GitHub, HTML, frontend JavaScript, screenshots, or chat.
9. Real image generation could not be end-to-end tested without provider documentation and credentials.
