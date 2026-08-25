# 🚀 Deploy This Resume To GitHub Pages — Complete Guide

This guide assumes you have **basic command-line comfort** but no prior GitHub Pages experience. By the end you'll have a live website at `https://souhaieb-marzouk.github.io`.

---

## 0. Prerequisites

Before you start, make sure you have:

### 0.1 Git installed
Check by opening a terminal and typing:

```bash
git --version
```

- **macOS:** if not installed, a prompt will offer to install Xcode Command Line Tools → click Install
- **Windows:** download from <https://git-scm.com/download/win> (use the 64-bit setup, default options are fine)
- **Linux:** `sudo apt install git` (Debian/Ubuntu) or `sudo dnf install git` (Fedora)

### 0.2 A GitHub account
If you don't have one yet → sign up free at <https://github.com/signup>. Use the username you want in your URL — the URL will be `<username>.github.io`. Souhaieb's username is `Souhaieb-Marzouk`, so the URL will be `Souhaieb-Marzouk.github.io`.

### 0.3 Basic terminal use
You need to:
- Navigate folders (`cd`)
- Run a few commands (just copy/paste from this guide)

That's it. No coding required.

---

## 1. Create The GitHub Repository

1. Sign in to GitHub → click the **+** in the top-right corner → **New repository**
2. **Repository name:** type `Souhaieb-Marzouk.github.io` (exactly — case-sensitive, with the dots)
3. **Description:** `Cybersecurity resume — interactive cinematic portfolio`
4. **Visibility:** Public (GitHub Pages for free accounts only works on public repos)
5. **Initialize this repository with:** leave all unchecked (no README, no .gitignore, no license — we'll add our own files)
6. Click **Create repository**

GitHub will show you a page with sample commands. You don't need to copy them — the next section gives you the exact commands.

---

## 2. Set Up The Project Locally

### 2.1 Clone the empty repository

Open a terminal (Terminal.app on macOS, Git Bash on Windows, your preferred terminal on Linux) and run:

```bash
# Replace Souhaieb-Marzouk with your actual GitHub username
git clone https://github.com/Souhaieb-Marzouk/Souhaieb-Marzouk.github.io.git
cd Souhaieb-Marzouk.github.io
```

### 2.2 Copy the website files

Copy **everything** from the `souhaieb-marzouk-resume/` folder into the freshly-cloned repo folder. The structure should look like:

```
Souhaieb-Marzouk.github.io/      <-- the git repo (just cloned)
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── data.js
│   ├── simulations.js
│   └── main.js
├── assets/
│   ├── favicon.svg
│   └── profile-placeholder.svg
└── README.md
```

> 💡 The `preview/` folder with screenshots is optional — safe to delete to keep the repo small.

### 2.3 Test locally (recommended)

Before pushing, verify everything renders:

```bash
python3 -m http.server 8000
```

(On Windows, use `python` instead of `python3`, or install Python from <https://python.org> if needed.)

Open your browser at <http://localhost:8000> and click around:
- Click any **EXPLORE_ROLE** button → modal should open with a live simulation
- Click any **skill** → modal opens with skill-level simulation
- Click any **certification card** → opens the issuer verification page in a new tab
- Click any **RUN_SIMULATION** button → modal opens with project demo

Press **Ctrl+C** in the terminal to stop the local server when you're done.

---

## 3. Commit And Push

Inside the `Souhaieb-Marzouk.github.io` folder:

```bash
# Stage every file
git add .

# Verify what's staged (optional)
git status

# Create your first commit
git commit -m "Initial website upload"

# Push to GitHub
git push origin main
```

> **Note on branch names:** GitHub now defaults to `main` for new repositories. If for some reason yours defaults to `master` (older accounts), use `git push origin master` instead, or rename the branch:
>
> ```bash
> git branch -M main
> git push origin main
> ```

The first push may ask for your GitHub credentials. Use a **Personal Access Token** instead of your password:

1. Go to <https://github.com/settings/tokens>
2. Click **Generate new token (classic)**
3. **Note:** `GitHub Pages deploy`
4. **Expiration:** 90 days
5. **Scopes:** tick `repo` (full repo access)
6. Click **Generate token** → copy the token immediately (you won't see it again)
7. When `git push` asks for your password, paste the token

> 💡 To avoid re-entering the token every time, configure the Git credential helper:
> ```bash
> git config --global credential.helper store
> ```

---

## 4. Enable GitHub Pages

1. Go to your repository on GitHub: <https://github.com/Souhaieb-Marzouk/Souhaieb-Marzouk.github.io>
2. Click the **Settings** tab (top-right of the repo, not your account settings)
3. In the left sidebar, click **Pages**
4. Under **Source** → **Deploy from a branch**
5. **Branch:** select `main` (or `master` if you used that) and `/(root)` folder
6. Click **Save**

Wait 2–5 minutes. GitHub builds and deploys your static site behind a global CDN — for free.

Refresh the Pages settings page after a couple of minutes; you'll see a green box saying:

> ✅ Your site is live at `https://souhaieb-marzouk.github.io/`

---

## 5. Verify The Live Site

Open a new browser tab and visit:

> **<https://souhaieb-marzouk.github.io>**

You should see:
1. The boot splash sequence (Linux-style `[ OK ]` log)
2. The hero section with your name and animated taglines
3. The matrix-rain background falling behind the content

Click around to make sure modals, simulations, and external links all work.

If something's broken → see **Troubleshooting** below.

---

## 6. Update The Site Later

To make changes:

```bash
cd Souhaieb-Marzouk.github.io

# (edit files in your editor — for example, edit js/data.js to add a new certification)

git add .
git commit -m "Add new certification"
git push origin main
```

GitHub Pages auto-redeploys within 1–2 minutes of every push. Hard-refresh your browser (`Ctrl+Shift+R` / `Cmd+Shift+R`) to see the update.

---

## 7. Custom Domain (Optional)

If you own a domain like `souhaiebmarzouk.com` and want to use it instead of the default `souhaieb-marzouk.github.io`:

### 7.1 DNS setup
At your domain registrar (Namecheap, GoDaddy, Cloudflare, etc.), add these DNS records:

| Type  | Name             | Value                          |
|-------|------------------|--------------------------------|
| A     | `@`              | `185.199.108.153`              |
| A     | `@`              | `185.199.109.153`              |
| A     | `@`              | `185.199.110.153`              |
| A     | `@`              | `185.199.111.153`              |
| CNAME | `www`            | `souhaieb-marzouk.github.io.`  |

> Note the trailing dot in the CNAME — it's required.

### 7.2 GitHub Pages config
1. Go to repo **Settings** → **Pages**
2. Under **Custom domain**, type `souhaiebmarzouk.com` (your apex domain) → click **Save**
3. Tick **Enforce HTTPS** (GitHub auto-provisions a free TLS certificate — may take 10–15 minutes the first time)

DNS propagation can take 10 minutes to 2 hours. Once your domain resolves, GitHub Pages will serve the site over HTTPS automatically.

---

## 8. Troubleshooting

### 8.1 Site shows 404 at `https://souhaieb-marzouk.github.io`

**Cause:** repository not named exactly `Souhaieb-Marzouk.github.io`, or branch not selected in Pages settings, or first push hasn't finished building.

**Fix:**
1. Repository name must be **EXACTLY** `Souhaieb-Marzouk.github.io` (case-sensitive). Rename it via **Settings → Repository name** if needed.
2. Confirm your local branch is `main` (or whatever you selected in Pages settings): `git branch`
3. Confirm your latest commit is on GitHub: the repo page on github.com should show "X commits" with your last commit message
4. Re-check **Settings → Pages** shows the green "live" box. If it shows "Building" → wait 5 more minutes.

### 8.2 Site loads but is broken (no styling, plain text)

**Cause:** `index.html` is at the wrong path (e.g. inside a subfolder).

**Fix:**
- The file MUST be at the repo root: `<repo>/index.html` (not `<repo>/souhaieb-marzouk-resume/index.html`)
- Re-check by visiting <https://github.com/Souhaieb-Marzouk/Souhaieb-Marzouk.github.io> — `index.html` should be visible right inside the repo

### 8.3 Modals / simulations don't open

**Cause:** the `js/simulations.js` file isn't loading, or your browser blocked it.

**Fix:**
1. Open DevTools (F12 → **Console** tab). Look for red errors.
2. Common cause: `js/simulations.js` not pushed. Re-run `git add . && git commit -m "fix" && git push`.
3. GitHub Pages is **case-sensitive** — the file is `simulations.js` (lowercase). If you accidentally uploaded `Simulations.js`, rename it.

### 8.4 Fonts look wrong (no Orbitron, looks like Times)

**Cause:** Google Fonts CDN blocked (corporate network / firewall) — but the CSS has system fallbacks so it should still look fine.

**Fix:** none needed — the fallback monospace stack renders correctly. If you really want Orbitron, your visitors need network access to `fonts.googleapis.com`.

### 8.5 Mixed content warning in browser

**Cause:** you linked to an `http://` resource from your HTTPS site. The site itself loads over `https://`, but the browser blocks mixed content.

**Fix:** check `js/data.js` — all URLs should use `https://` (LinkedIn, GitHub, etc. already do).

### 8.6 Image shows broken on the live site (but works locally)

**Cause:** the image path uses a different case on your local machine (case-insensitive on macOS by default) than on GitHub Pages (case-sensitive).

**Fix:** make sure the path in `index.html` exactly matches the file name. `assets/profile-placeholder.svg` ≠ `assets/Profile-Placeholder.svg`.

### 8.7 Cached old version of the site keeps showing

**Cause:** your browser cached the previous version.

**Fix:** hard-refresh with **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (macOS). Or open in an incognito/private window. Or use the GitHub Pages URL with a cache-busting query string: `https://souhaieb-marzouk.github.io/?v=2`.

### 8.8 Push fails with "Authentication failed"

**Cause:** GitHub no longer accepts your account password for Git operations over HTTPS.

**Fix:** use a Personal Access Token (see section 3 above) or switch to SSH:

```bash
# Switch to SSH (one-time setup)
git remote set-url origin git@github.com:Souhaieb-Marzouk/Souhaieb-Marzouk.github.io.git
```

For SSH you'll need to generate an SSH key and add it to your GitHub account: <https://docs.github.com/en/authentication/connecting-to-github-with-ssh>

### 8.9 "Custom domain already taken" error

**Cause:** only one GitHub account can use a given `<username>.github.io` URL. If you're seeing this, you (or someone else) already created a repo named `Souhaieb-Marzouk.github.io` on GitHub.

**Fix:** check your existing repos — there should be one with that exact name. Either use it, or delete it (the old one) and create a fresh one.

---

## 9. Performance & SEO Tips (Optional)

### 9.1 Add Google Analytics or Plausible
Skip this — recruiters hate trackers, and the resume is fast enough that you don't need analytics.

### 9.2 Add a `CNAME` file (if using a custom domain)
Just create a file named `CNAME` (no extension) at the repo root with a single line containing your custom domain. This prevents GitHub Pages from resetting your custom domain setting on every push.

### 9.3 Add `robots.txt` and `sitemap.xml`
Optional — GitHub Pages auto-injects the right headers, and recruiters will find you via the direct link.

### 9.4 Open Graph preview (for LinkedIn / Twitter shares)
Already in `index.html`:

```html
<meta property="og:title" content="Souhaieb Marzouk | Cybersecurity Resume" />
<meta property="og:description" content="SOC Analyst | Threat Hunter | Cybersecurity Engineer — interactive cinematic resume" />
<meta property="og:type" content="website" />
```

To make the preview image work, add `<meta property="og:image" content="https://souhaieb-marzouk.github.io/preview/01-desktop-hero.png" />` and push a screenshot to `preview/`.

---

## 10. Final Checklist

Before you reach out to recruiters with the URL:

- [ ] Repo named `Souhaieb-Marzouk.github.io` exactly
- [ ] `index.html` at the repo root
- [ ] All three JS files in `js/` (data.js, simulations.js, main.js)
- [ ] `css/styles.css` and `assets/` both pushed
- [ ] Pages settings: Source = `main` branch / `/root` folder, saved (green "live" box visible)
- [ ] <https://souhaieb-marzouk.github.io> loads without console errors (F12 → Console)
- [ ] Profile picture placeholder replaced with a real photo
- [ ] All certifications in `js/data.js` point to real `verifyUrl` links
- [ ] LinkedIn + GitHub + email links all work when clicked
- [ ] Tested on mobile (responsive nav collapses to hamburger)

When everything ticks → you're live. 🎉

---

## 🆘 Still Stuck?

- Email: [marzouk.souhaieb@proton.me](mailto:marzouk.souhaieb@proton.me)
- GitHub repo for this resume: <https://github.com/Souhaieb-Marzouk/Souhaieb-Marzouk.github.io>
- GitHub Pages official docs: <https://docs.github.com/en/pages>
