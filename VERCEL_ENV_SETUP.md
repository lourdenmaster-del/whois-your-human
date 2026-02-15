# Vercel setup for ligs.io

## 0. DNS: "This site can't be reached" / NXDOMAIN for www.ligs.io

If **www.ligs.io** doesn't load (browser says "can't be reached" or DNS_PROBE_FINISHED_NXDOMAIN), the **www** subdomain isn't set up in DNS.

1. **Add www in Vercel**  
   Project → **Settings** → **Domains** → **Add** → enter **www.ligs.io** → Add.  
   Vercel will show the DNS record you need.

2. **Add the record at your domain registrar**  
   Where you manage ligs.io (Cloudflare, Namecheap, Google Domains, etc.):
   - Add a **CNAME** record:
     - **Name/host:** `www` (or `www.ligs.io` depending on the registrar).
     - **Value/target:** `cname.vercel-dns.com` (or the exact value Vercel shows for www).
   - Save.

3. **Wait for DNS**  
   Propagation can take a few minutes up to 48 hours. After that, www.ligs.io should resolve.

If **ligs.io** (without www) also doesn't resolve, add **ligs.io** in Vercel Domains and create the record Vercel shows (often an A record for apex).

---

## 1. Root Directory (fix “Next.js default page” on ligs.io)

**If Vercel says "The specified Root Directory 'ligs-frontend' does not exist"**  
Your connected repo has the app at the **root** (no `ligs-frontend` subfolder). **Clear the Root Directory field** — leave it empty — and save. Then redeploy.

**If your repo has the app inside a `ligs-frontend` folder** (e.g. monorepo):

1. **Open Vercel**  
   → [https://vercel.com](https://vercel.com)  
   Log in if needed.

2. **Open your project**  
   The one connected to this repo (e.g. nextjs-boilerplate or ligs-frontend).

3. **Set Root Directory**  
   **Settings** → **General** → **Root Directory**.  
   Set it to **`ligs-frontend`** (no leading slash).  
   Leave **Build Command** and **Output Directory** as default (Vercel will use `next build` and `.next` inside `ligs-frontend`).

4. **Redeploy**  
   **Deployments** → ⋮ on the latest deployment → **Redeploy**.

After this, ligs.io should serve the LIGS landing and Beauty app, not the default Next.js page.

### Which vercel.json is used?

- **Root Directory = empty**  
  Vercel uses the **root** `vercel.json` (at the repo root). The app is expected to live at the repo root.

- **Root Directory = ligs-frontend**  
  Vercel still reads the **root** `vercel.json` for **build and install** (e.g. `installCommand`, `buildCommand`). The **app-level** `ligs-frontend/vercel.json` is used for **redirects, headers, and Next.js-specific settings** that apply to the deployed app. So: root config drives how the project is built/installed; app-level config drives routing and framework behavior.

---

## 2. Add BLOB_READ_WRITE_TOKEN in Vercel

Do this so production stores reports, beauty profiles, and images in Blob.

1. **Open Vercel**  
   → [https://vercel.com](https://vercel.com)  
   Log in if needed.

2. **Open your project**  
   Click the project that deploys **ligs-frontend** (e.g. "ligs-frontend" or your LIGS app).

3. **Go to Environment Variables**  
   Top nav: **Settings** → left sidebar: **Environment Variables**.

4. **Add the variable**  
   - Click **Add New** (or **Add**).  
   - **Key:** `BLOB_READ_WRITE_TOKEN`  
   - **Value:** paste the same value from your `.env.local` (the line `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...` — only the part after `=`).  
   - Choose **Production** (and **Preview** if you want).  
   - Save.

5. **Redeploy**  
   **Deployments** → ⋮ on the latest deployment → **Redeploy**.

Done. The next deployment will use Blob for reports and images.
