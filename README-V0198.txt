RushFinder V0198 - Appwrite archive connection fix
- Uses the verified Appwrite Frankfurt project and bucket as safe public fallbacks in the server API.
- Keeps API key server-side only (optional when bucket has public read permissions).
- Supports OGG and other audio formats.
- Does not change YouTube code or visual layout.
- For initial test search "Sugerencia". Persian "بندری" needs actual tagged Bandari music in archive.
- If Vercel has INCORRECT APPWRITE_* environment variables, correct/remove them: explicit environment variables override fallbacks.
