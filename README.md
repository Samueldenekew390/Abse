# CanadaConnect — static HTML/CSS/JavaScript + Supabase

## Included
- `index.html`: public information page and admin portal
- `styles.css`: responsive red/white design
- `app.js`: Supabase Auth, applicant CRUD, photo upload, public listing, status filters
- `supabase.sql`: database, view, row-level security, and Storage policies

## Setup
1. Create a Supabase project.
2. Open SQL Editor and run all of `supabase.sql`.
3. In Supabase Authentication > Users, create your administrator user (email + password). Disable public sign-ups in Authentication settings.
4. Copy that user's UUID and run the final `insert into public.admin_users...` statement from the SQL file with the real UUID.
5. In Project Settings > API, copy the Project URL and anon/public key. Paste them into `SUPABASE_URL` and `SUPABASE_ANON_KEY` at the top of `app.js`.
6. Upload the four files to your static host (Netlify, Vercel, GitHub Pages, or your own hosting). Set the canonical URL in `index.html` to your real domain.
7. Visit `/#admin` and sign in.

## Security and privacy
- Never put the Supabase `service_role` key in browser JavaScript.
- Applicant records are private to authorized admin accounts. The public page reads a restricted view.
- Phone and age are hidden by default. Do not enable public phone visibility unless the applicant has explicitly consented.
- The public photo bucket means uploaded applicant photos can be viewed by anyone. Obtain clear consent before uploading/publishing a person's photo.
- Passport number/document images are not collected. The public page only displays a passport status label. Do not store passport numbers in this public-facing app.
- This is an independent applicant showcase, not a Canadian government/IRCC website. Do not imply that statuses are official immigration decisions. Only publish status information you are authorized to share.
- Admin password changes use Supabase Auth; the website never stores passwords itself.

## Notes
The demo names shown before Supabase is configured are clearly labelled sample records and are not real applicant data. Once configured, the live public list is read from Supabase. Applicant ordering is Accepted, Pending, Rejected; each group is alphabetized by name.
