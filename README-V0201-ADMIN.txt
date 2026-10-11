RushFinder V0201 - Private Music Upload Panel

Open /admin.html. This is a real Appwrite email/password login, not a hardcoded password.

ONE-TIME APPWRITE SETUP (required):
1. Appwrite > Auth > Users: create your own administrator user with email and password.
2. Appwrite > Auth > Settings: disable public signup (if available in your Appwrite version).
3. Appwrite > Storage > rushfinder-music > Settings > Permissions:
   - READ: Any (so employees can listen and download without login)
   - CREATE: User with your administrator Appwrite user ID ONLY
   - UPDATE/DELETE: User with your administrator user ID ONLY, or none.
   - Remove CREATE permissions for Any, Guests, or Users (all logged-in users).
4. Appwrite > Overview > Platforms: add your production Vercel domain as a Web platform, to allow browser authentication.
5. Appwrite > Storage > rushfinder-music: ensure allowed extensions include mp3, wav, ogg, oga, m4a, flac and max file size is adequate.
6. Open https://YOUR-SITE/admin.html and sign in.

IMPORTANT: Hiding the admin page is not security. The Appwrite bucket permissions enforce uploads.
Only upload audio you have permission to redistribute. Public visitors never need login.
The page stores category, Persian title and keywords in the filename to support the existing filename-based archive search.
The existing YouTube search and site UI have not been modified.
