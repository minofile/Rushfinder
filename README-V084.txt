RushFinder V084 — AI Assistant
1) Add OPENAI_API_KEY in Vercel > Project Settings > Environment Variables (Production).
2) Optional: OPENAI_MODEL. Default is gpt-6-luna.
3) Redeploy after adding the environment variable.
4) The API key is only used in /api/chat.js and is never exposed in index.html.
5) Chat uses OpenAI Responses API and keeps recent conversation context in the browser request.
