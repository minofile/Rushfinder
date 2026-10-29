RushFinder 0709 Gemini — Chabokan chat endpoint patch

Only API file changed: api/avalai-image.js.
CHABOKAN_API_KEY = secret from Chabokan (never place in Git)
CHABOKAN_IMAGE_MODEL = google/gemini-3.1-flash-lite-image
CHABOKAN_IMAGE_URL = https://ai.chabokan.net/v1/chat/completions

Set these in Vercel Preview for a preview deployment; redeploy Preview after updating environment variables.
Do not overwrite Production or change domain until Preview is tested.

Warning: Chabokan documents OpenAI-compatible chat/completions, but an image response from the selected model is not independently verified. One image attempt may incur charges. If the model responds with text only, the API will show NO_IMAGE_IN_RESPONSE; check Chabokan request logs before retrying.
