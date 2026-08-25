# Souhaieb Marzouk — Cybersecurity Resume (Cinematic Static Site)

> A dynamic, cinematic, cybersecurity-themed resume website built with **vanilla HTML5 + CSS3 + JavaScript** — no build step, no framework, no server-side code. Designed to deploy to **GitHub Pages** at `https://souhaieb-marzouk.github.io`.

---

## ✨ Features

- **Boot splash sequence** — Linux-style `[ OK ]` boot log on page load
- **Matrix rain background** — animated falling katakana / binary characters on a `<canvas>`
- **Scan-line CRT overlay** — subtle phosphor-green horizontal lines
- **Typed-out hero taglines** — cycling role titles under the name (`SOC Analyst`, `Threat Hunter`, ...)
- **Reverse-chronological experience timeline** with scroll-reveal animations
- **Live in-modal simulations** for every experience, skill, and project — including:
  - SOC SIEM dashboard with live-streaming Splunk events, MITRE ATT&CK heatmap, 9-phase attack chain
  - Sigma rule + Splunk SPL code viewers (real queries from the home lab)
  - Simulated SSH terminal reconstructing the LibertyGlobal critical finding
  - AXA mobile automation pipeline visualizer (Java + Selenium + Azure CI/CD)
  - Sagemcom KDG DOCSIS 3.1 critical bug reproduction terminal + ISO 27001 traceability matrix
  - Parrot Bluetooth stress-test simulation with animated signal waveform + Bugzilla report
  - CyberGuardian 6-tile malware triage grid (Process / File / Registry / Network / Memory / AI)
- **Skills grid** — 7 groups, 67 skills, click any skill to open a calibrated simulation matching the level
- **Certifications grid** — every card opens the official verification portal in a new tab
- **Projects portfolio** — CyberGuardian + SOC/Pentest Home Lab, each with live sim + GitHub link
- **Keyboard accessible** — `ESC` closes modals, focus-visible outlines, semantic HTML
- **`prefers-reduced-motion` aware** — disables animations for accessibility
- **Responsive** — desktop / tablet / mobile breakpoints with collapsible nav

---

## 📁 Project Structure

```
souhaieb-marzouk-resume/
├── index.html              # Single-page HTML shell
├── css/
│   └── styles.css          # Cinematic cybersecurity theme (≈40 KB, no framework)
├── js/
│   ├── data.js             # ALL resume content lives here — edit this file to update
│   ├── simulations.js      # In-browser simulations for experiences / skills / projects
│   └── main.js             # Boot sequence, matrix rain, typed text, modals, scroll reveal
├── assets/
│   ├── favicon.svg         # Browser tab icon
│   └── profile-placeholder.svg  # Replace with your real photo
├── preview/                # Screenshots for quick reference (safe to delete)
├── README.md               # This file
└── DEPLOYMENT.md            # Beginner-friendly GitHub Pages publishing guide
```

> 💡 **Design principle:** all content lives in `js/data.js`. The HTML, CSS, and simulation logic are fully reusable for any other candidate — just swap the data.

---

## 🚀 Run Locally

You can open `index.html` directly in a browser, **but** for the JavaScript to load cleanly (browsers restrict `file://` module scripts), use a tiny local server instead:

### Option A — Python (simplest, already installed on macOS/Linux)

```bash
cd souhaieb-marzouk-resume
python3 -m http.server 8000
# then visit http://localhost:8000
```

### Option B — VS Code Live Server extension

1. Install the **Live Server** extension (by Ritwick Dey)
2. Right-click `index.html` → **Open with Live Server**

### Option C — Node.js

```bash
npx serve souhaieb-marzouk-resume
```

---

## ✏️ How To Customize

Everything you'll ever want to edit is in **`js/data.js`**. The file is a single JavaScript object literal — no build step, no JSX, no framework.

### Replace the profile photo

1. Drop a square image (recommended 600×600px or larger) into `assets/`
2. Edit `index.html` → find `<img src="assets/profile-placeholder.svg" ...>` and change the `src` to your new image (e.g. `assets/souhaieb-photo.jpg`)
3. Done. The CSS auto-applies the cyberpunk filter (scanline, hue rotation, corner brackets). To disable the filter, edit `.profile-pic-frame img` in `css/styles.css`.

### Update contact info

In `js/data.js`, top of the file:

```js
personal: {
  contact: {
    email:    "marzouk.souhaieb@proton.me",
    phone:    "+216 95 551 955",
    whatsapp: "+31 6 4848 7594",
    linkedin: "https://www.linkedin.com/in/souhaiebmarzouk",
    github:   "https://github.com/Souhaieb-Marzouk",
    website:  "https://www.cyberpulseacademy.com",
    mapQuery: "Tunis, Tunisia"
  }
}
```

### Edit work experiences

In `js/data.js`, the `experiences:` array. Each entry:

```js
{
  id: "libertyglobal",                       // unique, used as modal id
  role: "Senior Network & Vulnerability Analysis Engineer",
  company: "LibertyGlobal (via TEKSystems)",
  location: "Netherlands (Remote)",
  period: "July 2020 — March 2023",
  type: "Contract (renewed: 1y + 1y + 6m + 3m)",
  summary: "...",
  highlights: [ "...", "..." ],              // bullet list
  stack: ["DHCP","DNS", ...],                // tech chips
  simulation: "libertyglobal-soc"            // matches a key in simulations.js
}
```

### Edit skills

In `js/data.js`, the `skills:` array. Each group has a `group` name, an `icon` (emoji), and a list of `skills` with `name`, `level` (Beginner / Intermediate / Advanced / Expert), `percent`, and `sources`.

### Edit certifications

The `certifications:` array. **Important:** the `verifyUrl` is where the card opens when clicked — point it at the official issuer verification page (Credly, CompTIA, ISTQB, etc.).

### Edit projects

The `projects:` array. `githubUrl` is where the GITHUB → button points. `simulation` matches a key in `simulations.js`.

### Add a brand-new simulation

If you add a new experience or project and want a custom simulation for it:

1. Add an entry to `js/data.js` with `simulation: "my-new-sim"`
2. Open `js/simulations.js` and register a renderer:

```js
SIMS['my-new-sim'] = (host, ctx) => {
  host.innerHTML = `<div class="sim-h">MY NEW SIMULATION</div>
                    <div class="sim-p">Description...</div>`;
  // ctx.tabs is optional — if you want tabs:
  ctx.tabs = [
    { id: 'tab1', label: '// Tab 1' },
    { id: 'tab2', label: '// Tab 2' }
  ];
};
```

### Edit colors / theme

All colors are CSS custom properties at the top of `css/styles.css`:

```css
:root {
  --bg:      #050810;   /* deep void background */
  --neon:    #00ff88;   /* primary phosphor green */
  --neon-2:  #00e0ff;   /* cyan */
  --neon-3:  #ff3b5c;   /* alert red */
  --neon-4:  #ffb800;   /* warning amber */
}
```

---

## 🌐 Publish To GitHub Pages

See **[`DEPLOYMENT.md`](./DEPLOYMENT.md)** for a complete beginner-friendly, step-by-step guide.

**TL;DR:**

```bash
# 1. Create a new GitHub repo named EXACTLY:
#    Souhaieb-Marzouk.github.io

# 2. Clone it locally
git clone https://github.com/Souhaieb-Marzouk/Souhaieb-Marzouk.github.io.git
cd Souhaieb-Marzouk.github.io

# 3. Copy all files from this project into the repo folder
#    (index.html, css/, js/, assets/)

# 4. Commit & push
git add .
git commit -m "Initial website upload"
git push origin main

# 5. On GitHub: Settings → Pages → Source: Deploy from a branch
#    Branch: main / root → Save

# 6. Wait 2-5 minutes, then visit:
#    https://souhaieb-marzouk.github.io
```

---

## 🧪 Built-in QA — Verified

The site was tested locally with a headless Chromium browser at three viewports:

| Viewport | Result | Console Errors |
|---|---|---|
| Desktop 1920×1080 | ✅ All sections render, modals open/close, ESC works | 0 |
| Tablet 768×1024 | ✅ Layout collapses, nav remains usable | 0 |
| Mobile 375×812 | ✅ Nav collapses to hamburger menu, all sections stacked | 0 |

All `node --check` syntax validations pass for `js/data.js`, `js/main.js`, `js/simulations.js`.
All HTTP requests return 200. No external runtime dependencies (everything runs offline once loaded — no CDN hits, no API calls).

---

## 🔧 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Markup | Semantic HTML5 | Accessibility + SEO |
| Styling | Vanilla CSS3 (custom properties, grid, flexbox, animations) | No framework = no CDN dependency, instant load |
| Interactivity | Vanilla JavaScript (ES2017+) | No build step, no transpiler, runs directly on GitHub Pages |
| Canvas | HTML5 Canvas API (matrix rain) | Hardware-accelerated, GPU-friendly |
| Animations | CSS keyframes + IntersectionObserver | 60fps, respects `prefers-reduced-motion` |
| Fonts | System monospace + Google Fonts Orbitron (CDN, with system fallback) | Pixel-perfect terminal vibe |

**Total bundle size:** ~155 KB uncompressed (HTML + CSS + JS + SVG assets) — loads in under 1s on a slow 3G connection.

---

## 📋 Accessibility Notes

- All interactive elements are keyboard-focusable with visible focus outlines
- `ESC` closes any open modal
- `aria-label`, `aria-modal`, `aria-hidden`, `aria-expanded` used appropriately
- Skip-to-content link added at the top of the DOM
- `prefers-reduced-motion` disables all animations and the matrix background
- All non-decorative images have descriptive `alt` text
- Color contrast meets WCAG AA for body text (phosphor green on near-black)

---

## 📄 License & Credits

- **Content:** © Souhaieb Marzouk
- **Theme code:** Released into the public domain via CC0 — fork it, ship your own resume.
- **No third-party tracking, no cookies, no analytics.** Zero data leaves the browser.

---

## ❓ Need Help?

- Email: [marzouk.souhaieb@proton.me](mailto:marzouk.souhaieb@proton.me)
- LinkedIn: [linkedin.com/in/souhaiebmarzouk](https://www.linkedin.com/in/souhaiebmarzouk)
- GitHub: [github.com/Souhaieb-Marzouk](https://github.com/Souhaieb-Marzouk)
