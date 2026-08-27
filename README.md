# 🛡️ Cinematic Cybersecurity Resume — Vanilla JS Static Site

> A dynamic, cinematic, security-themed resume website built with **pure HTML5 + CSS3 + JavaScript** — no build step, no framework, no server-side code, zero runtime dependencies. Deploy to **GitHub Pages** and you're live in minutes.

---

## 🧷 Before You Go Live — Replace These Placeholders

The README and `DEPLOYMENT.md` use **masked placeholders** instead of any personal data.
Find-and-replace these tokens across the project before publishing:

| Placeholder | Replace with | Where it appears |
|---|---|---|
| `<YOUR_NAME>` | Your full name | `README.md`, `DEPLOYMENT.md`, `index.html` (title, hero, footer, OG meta) |
| `<YOUR_GITHUB_USERNAME>` | Your GitHub username (case-sensitive) | `README.md`, `DEPLOYMENT.md`, `js/data.js` (`contact.github`, `projects[].githubUrl`) |
| `<YOUR_EMAIL@example.com>` | Your contact email | `js/data.js` (`contact.email`) |
| `<YOUR_PHONE>` | International-format phone | `js/data.js` (`contact.phone`) |
| `<YOUR_WHATSAPP>` | WhatsApp number | `js/data.js` (`contact.whatsapp`) |
| `<YOUR_LINKEDIN_HANDLE>` | LinkedIn vanity slug | `js/data.js` (`contact.linkedin`) |
| `<YOUR_WEBSITE>` | Personal / portfolio site URL | `js/data.js` (`contact.website`) |
| `<YOUR_CITY>` / `<YOUR_COUNTRY>` | Location | `js/data.js` (`location`, `contact.mapQuery`) |

> 💡 Tip: run `grep -rn "<YOUR_" .` from the project root to find every placeholder quickly.

---

## ✨ Highlights

- **Boot splash sequence** — Linux-style `[ OK ]` boot log on page load
- **Matrix rain background** — animated falling katakana / binary on a `<canvas>`
- **Scan-line CRT overlay** — subtle phosphor-green horizontal lines
- **Typed-out hero taglines** — cycling role titles under the name (`SOC Analyst`, `Threat Hunter`, …)
- **Reverse-chronological experience timeline** with scroll-reveal animations
- **Live in-modal simulations** for every experience, skill, and project — see the catalogue below
- **Skills grid** — 7 groups, 67 skills, click any skill to open a calibrated simulation matching the level
- **Certifications grid** — 10 verified certs; every card opens the official issuer verification portal
- **Projects portfolio** — CyberGuardian + SOC/Pentest Home Lab, each with live sim + GitHub link
- **Keyboard accessible** — `ESC` closes modals, focus-visible outlines, semantic HTML
- **`prefers-reduced-motion` aware** — disables animations for accessibility
- **Responsive** — desktop / tablet / mobile breakpoints with collapsible nav

---

## 🎬 Live In-Browser Simulations

Every simulation is a self-contained vanilla-JS module registered in `js/simulations.js`. No images, no pre-recorded video — each run is computed live in the browser.

### Work Experience Simulations (5)

| Experience | Simulation key | Tabs inside the modal |
|---|---|---|
| Full-time Cybersecurity Specialization & Skill Development | `soc-homelab` | `// SOC & Pentest Lab Simulation` · `// Lab 02 — Sigma Rule` · `// Lab 03 — Splunk SPL` · `// Lab 04 — CyberGuardian + AI` · `// TryHackMe Achievements` |
| Senior Network Protocol Validation & Vulnerability Assessment Engineer | `libertyglobal-soc` | `// Attack Replay — SSH Takeover` · `// Jira Ticket` · `// Validation Metrics` |
| Security Quality & Automation Engineer | `axa-automation` | `// Pipeline` · `// Java Code` · `// Live Test Run` |
| Network Protocol Validation & Vulnerability Assessment Engineer | `sagemcom-terminal` | `// Attack Replay — DDoS & SIP` · `// Jira Ticket` · `// ISO 27001 Matrix` |
| Embedded Systems Test Engineer | `bluetooth-test` | `// Live Simulation` · `// Bugzilla Report` · `// Car-Kit Live Test` |

### Project Simulations (2)

| Project | Simulation key | Tabs inside the modal |
|---|---|---|
| CyberGuardian | `cyberguardian-scan` | `// Scan Output` · `// AI Analysis` |
| SOC & Pentest Full Home Lab | `homelab-attack-chain` | (reuses the 5-tab `soc-homelab` renderer) |

### Skill Simulations (10 contextual mini-sims)

Calibrated to the skill's self-assessed level (Beginner → Expert). Click any skill chip in the Skills grid to launch.

`Python` · `Wireshark` · `Splunk SPL` · `Nmap` · `tcpdump` · `MITRE ATT&CK` · `PowerShell` · `Sigma Rule Authoring` · `Jira` · `Docker`

---

## 📁 Project Structure

```
souhaieb-marzouk-resume/
cybersecurity-resume/
├── index.html              # Single-page HTML shell
├── css/
│   └── styles.css          # Cinematic cybersecurity theme (~76 KB, no framework)
├── js/
│   ├── data.js             # ALL resume content lives here — edit this file to update
│   ├── simulations.js      # In-browser simulations for experiences / skills / projects
│   └── main.js             # Boot sequence, matrix rain, typed text, modals, scroll reveal
├── assets/
