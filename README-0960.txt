RushFinder 0960 - Persian title and button text repair

Why the previous version displayed strange symbols:
Windows PowerShell 5.1 can read a UTF-8 PowerShell script without BOM as
an ANSI encoding. The Persian characters in the older script were corrupted.
This version is ASCII-only and constructs the proper Persian letters by code point.

On-screen text after patch:
- Title: تدوین
- Button: ارسال درخواست

How to use:
1. Extract the two scripts into the EXISTING local RushFinder Git folder,
   beside smart-edit.html.
2. Run PUBLISH-0960-FIX-TEXT.cmd.
3. Confirm Vercel deployment Ready, then press Ctrl+F5 in RushFinder.

Only smart-edit.html is committed; no credentials are included.
A local .backup-before-0960 copy of smart-edit.html is saved automatically.
The button ID and event handler are retained; Hermes connection itself is not changed.
