/* ===================================================================
 *  main.js — Application bootstrap & interactivity
 *  Depends on: data.js (RESUME_DATA), simulations.js (SIMULATIONS)
 * =================================================================== */

(function () {
  'use strict';

  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const D = window.RESUME_DATA;
  if (!D) { console.error('RESUME_DATA not loaded — check data.js'); return; }

  /* =================================================================
   *  BOOT SPLASH SEQUENCE
   * ================================================================= */
  function bootSequence() {
    const splash = $('#boot-splash');
    if (!splash) return afterBoot();

    const text = $('#boot-text');
    const bar  = $('#boot-bar-fill');
    const status = $('#boot-status');

    const lines = [
      '[BOOT] initializing secure shell...',
      '[ OK ] mounting /dev/cyber-ops',
      '[ OK ] loading kernel module: mitre_attack.ko',
      '[ OK ] loading kernel module: splunk_spl.ko',
      '[ OK ] loading kernel module: sigma_rules.ko',
      '[ OK ] establishing TLS 1.3 handshake',
      '[ OK ] verifying certificate chain',
      '[ OK ] loading resume profile: souhaieb_marzouk.dat',
      '[ OK ] decrypting work history (5 missions)',
      '[ OK ] decrypting skills matrix (67 skills)',
      '[ OK ] decrypting certifications (6 credentials)',
      '[ OK ] launching simulations runtime',
      '[BOOT] system ready. WELCOME, RECRUITER.'
    ];

    let i = 0;
    function next() {
      if (i >= lines.length) {
        status.textContent = 'SYSTEM ONLINE • PRESS ANY KEY OR WAIT 1.5s';
        bar.style.width = '100%';
        setTimeout(afterBoot, 1200);
        return;
      }
      text.textContent += lines[i] + '\n';
      status.textContent = lines[i].replace(/\[|\]/g, '').trim();
      bar.style.width = Math.round(((i + 1) / lines.length) * 100) + '%';
      i++;
      setTimeout(next, 130);
    }
    next();
  }

  function afterBoot() {
    const splash = $('#boot-splash');
    if (splash) {
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 700);
    }
    document.body.classList.add('booted');
    // start hero typed effect after boot
    startHeroTyped();
    startFooterCmd();
  }

  /* =================================================================
   *  MATRIX RAIN BACKGROUND
   * ================================================================= */
  function matrixRain() {
    const canvas = $('#matrix-bg');
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    let cols, drops, fontSize = 14;
    const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン$+*<>{}[]/\\=';
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / fontSize);
      drops = new Array(cols).fill(0).map(() => Math.random() * -100);
    }
    resize();
    window.addEventListener('resize', resize);

    let lastTime = 0;
    function draw(t) {
      if (t - lastTime < 80) { requestAnimationFrame(draw); return; }
      lastTime = t;

      ctx.fillStyle = 'rgba(5, 8, 16, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < cols; i++) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // gradient: bright head, dim tail
        ctx.fillStyle = Math.random() > 0.97 ? '#00e0ff' : '#00ff88';
        ctx.fillText(ch, x, y);

        if (y > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  /* =================================================================
   *  HERO TYPED EFFECT
   * ================================================================= */
  function startHeroTyped() {
    const titleEl = $('#hero-title-typed');
    if (!titleEl || !D.personal.taglines || !D.personal.taglines.length) return;

    let tagIdx = 0;
    let charIdx = 0;
    let deleting = false;

    function tick() {
      const cur = D.personal.taglines[tagIdx];
      if (!deleting) {
        charIdx++;
        const text = cur.slice(0, charIdx);
        titleEl.innerHTML = escapeHtml(text) + '<span class="cursor">▊</span>';
        if (charIdx >= cur.length) {
          deleting = true;
          setTimeout(tick, 1800);
          return;
        }
        setTimeout(tick, 55 + Math.random() * 30);
      } else {
        charIdx--;
        const text = cur.slice(0, charIdx);
        titleEl.innerHTML = escapeHtml(text) + '<span class="cursor">▊</span>';
        if (charIdx <= 0) {
          deleting = false;
          tagIdx = (tagIdx + 1) % D.personal.taglines.length;
          setTimeout(tick, 320);
          return;
        }
        setTimeout(tick, 25);
      }
    }
    tick();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* =================================================================
   *  HERO PROFILE (typed-in paragraph)
   * ================================================================= */
  function renderHeroProfile() {
    const host = $('#hero-profile');
    if (!host) return;
    const txt = D.personal.profile;
    let i = 0;
    function step() {
      i += 2;
      host.textContent = txt.slice(0, i);
      if (i < txt.length) setTimeout(step, 10);
    }
    // wait for boot
    setTimeout(step, 1500);
  }

  /* =================================================================
   *  HERO TARGETING CHIPS
   * ================================================================= */
  function renderTargeting() {
    const host = $('#hero-targeting');
    if (!host) return;
    const t = D.targeting;
    const chips = [
      { label: `TARGETING: ${t.primary}`, primary: true },
      { label: `2nd: ${t.secondary}` },
      { label: `3rd: ${t.tertiary}` },
      { label: t.availability },
      { label: t.remote }
    ];
    host.innerHTML = chips.map(c => `<span class="target-chip ${c.primary ? 'primary' : ''}">${escapeHtml(c.label)}</span>`).join('');
  }

  /* =================================================================
   *  HERO META (location, availability, work auth)
   * ================================================================= */
  function renderMeta() {
    const loc = $('#meta-location'); if (loc) loc.textContent = D.personal.location;
    const av = $('#meta-availability'); if (av) av.textContent = D.personal.availability;
    const au = $('#meta-auth'); if (au) au.textContent = D.targeting.workAuth;
  }

  /* =================================================================
   *  LANGUAGES (badge + bar)
   * ================================================================= */
  function renderLanguages() {
    const host = $('#lang-list');
    if (!host) return;
    host.innerHTML = D.personal.languages.map(l => `
      <li class="lang-item">
        <div class="lang-row">
          <span class="lang-name">${l.name}</span>
          <span class="lang-level">${l.level} · ${l.cefr}</span>
        </div>
        <div class="lang-bar"><div class="lang-bar-fill" data-pct="${l.percent}"></div></div>
      </li>
    `).join('');
  }

  /* =================================================================
   *  EXPERIENCES (timeline)
   * ================================================================= */
  function renderExperiences() {
    const host = $('#timeline');
    if (!host) return;
    host.innerHTML = D.experiences.map(exp => `
      <article class="exp-item" role="listitem">
        <div class="exp-node"></div>
        <div class="exp-card">
          <div class="exp-head">
            <div>
              <div class="exp-role">${escapeHtml(exp.role)}</div>
              <div class="exp-company">${escapeHtml(exp.company)} <span class="exp-loc">▸ ${escapeHtml(exp.location)}</span></div>
            </div>
            <span class="exp-period">${escapeHtml(exp.period)}</span>
          </div>
          <div class="exp-type">${escapeHtml(exp.type)}</div>
          <p class="exp-summary">${escapeHtml(exp.summary)}</p>
          <ul class="exp-highlights">
            ${exp.highlights.map(h => `<li>${escapeHtml(h)}</li>`).join('')}
          </ul>
          <div class="exp-stack">
            ${exp.stack.map(s => `<span class="stack-chip">${escapeHtml(s)}</span>`).join('')}
          </div>
          <div class="exp-actions">
            <button class="btn-sim" data-sim-key="${exp.simulation}" data-sim-title="${escapeHtml(exp.role)}" data-sim-id="${exp.id}">
              <span class="blink">▸</span> EXPLORE_ROLE
            </button>
          </div>
        </div>
      </article>
    `).join('');
  }

  /* =================================================================
   *  SKILLS (grouped grid)
   *  - Sources are NOT shown in the main grid (only in the modal).
   *  - Groups flagged with `split: true` render as two parallel sub-lists.
   * ================================================================= */
  function renderSkills() {
    const host = $('#skills-grid');
    if (!host) return;

    const renderItem = (s, groupName) => `
      <li class="skill-item" data-skill-name="${escapeHtml(s.name)}" data-skill-group="${escapeHtml(groupName)}">
        <div class="skill-row">
          <span class="skill-name">${escapeHtml(s.name)}</span>
          <span class="skill-level ${s.level}">${s.level}</span>
        </div>
        <div class="skill-bar"><div class="skill-bar-fill" data-pct="${s.percent}"></div></div>
      </li>
    `;

    const renderGroup = (g) => {
          // Split group into two parallel sub-lists (vertically aligned)
          if (g.split && g.skills.length > 4) {
                const mid = Math.ceil(g.skills.length / 2);
                const left  = g.skills.slice(0, mid);
                const right = g.skills.slice(mid);
                return `
                  <section class="skill-group skill-group-split">
                        <header class="skill-group-head">
                          <span class="skill-group-icon">${g.icon}</span>
                          <h3 class="skill-group-name">${escapeHtml(g.group)}</h3>
                        </header>
                        <div class="skill-split-grid">
                          <ul class="skill-list">${left.map(s => renderItem(s, g.group)).join('')}</ul>
                          <ul class="skill-list">${right.map(s => renderItem(s, g.group)).join('')}</ul>
                        </div>
                  </section>
                `;
          }
          // Standard single-list group
          return `
                <section class="skill-group">
                  <header class="skill-group-head">
                        <span class="skill-group-icon">${g.icon}</span>
                        <h3 class="skill-group-name">${escapeHtml(g.group)}</h3>
                  </header>
                  <ul class="skill-list">
                        ${g.skills.map(s => renderItem(s, g.group)).join('')}
                  </ul>
                </section>
          `;
        };

    host.innerHTML = D.skills.map(renderGroup).join('');
  }

  /* =================================================================
   *  CERTIFICATIONS (grid)
   *  - Real issuer logo (SVG), title, issuer, date — no description here.
   *  - Card click opens the cert-view modal (image + description + VERIFY).
   *  - VERIFY_CERTIFICATE button stays external (in modal only).
   * ================================================================= */
  const ISSUER_LOGO_PATH = {
    htb:        'assets/issuer-logos/HTB-Logo.png',
    comptia:    'assets/issuer-logos/Comptia-Logo.png',
    tryhackme:  'assets/issuer-logos/THM-Logo.jpg',
    google:     'assets/issuer-logos/Google-Logo.png',
    atsqa:      'assets/issuer-logos/ATSQA-Logo.jpeg'
  };

  /* SVG fallbacks (used automatically when local PNG/JPG logos are absent) */
  const ISSUER_LOGO_FALLBACK = {
    'assets/issuer-logos/HTB-Logo.png':      'assets/issuer-logos/htb.svg',
    'assets/issuer-logos/Comptia-Logo.png':  'assets/issuer-logos/comptia.svg',
    'assets/issuer-logos/THM-Logo.jpg':      'assets/issuer-logos/tryhackme.svg',
    'assets/issuer-logos/Google-Logo.png':   'assets/issuer-logos/google.svg',
    'assets/issuer-logos/ATSQA-Logo.jpeg':   'assets/issuer-logos/atsqa.svg'
  };

  function issuerLogoSrc(c) {
    if (c.issuerKey && ISSUER_LOGO_PATH[c.issuerKey]) return ISSUER_LOGO_PATH[c.issuerKey];
    // Fallback map by issuer name
    const m = {
      'HackTheBox':     'assets/issuer-logos/HTB-Logo.png',
      'CompTIA':        'assets/issuer-logos/Comptia-Logo.png',
      'TryHackMe':      'assets/issuer-logos/THM-Logo.jpg',
      'Google / Coursera':      'assets/issuer-logos/Google-Logo.png',
      'AT*SQA': 'assets/issuer-logos/ATSQA-Logo.jpeg'
    };
    return m[c.issuer] || 'assets/issuer-logos/Google-Logo.png';
  }

  function issuerLogoFallback(src) {
    return ISSUER_LOGO_FALLBACK[src] || 'assets/issuer-logos/google.svg';
  }

  function renderCerts() {
    const industrial = D.certifications.filter(c => c.category === 'industrial');
    const learning   = D.certifications.filter(c => c.category === 'learning');
    renderCertGrid($('#certs-grid-industrial'), industrial);
    renderCertGrid($('#certs-grid-learning'),   learning);
  }

  function renderCertGrid(host, certs) {
    if (!host) return;
    host.innerHTML = certs.map(c => {
      const i = D.certifications.indexOf(c);  // global index for click handler
      return `
      <button type="button" class="cert-card" data-cert-index="${i}"
              aria-label="View certificate: ${escapeHtml(c.title)} — ${escapeHtml(c.issuer)} (${escapeHtml(c.date)})">
        <div class="cert-head">
          <div class="cert-logo">
            <img src="${issuerLogoSrc(c)}" alt="${escapeHtml(c.issuer)} logo" loading="lazy" onerror="this.onerror=null;this.src='${issuerLogoFallback(issuerLogoSrc(c))}'" />
          </div>
          <div class="cert-meta">
            <div class="cert-title">${escapeHtml(c.title)}</div>
            <div class="cert-issuer">${escapeHtml(c.issuer)}</div>
            <div class="cert-date">${escapeHtml(c.date)}</div>
          </div>
        </div>
        <div class="cert-verify">
          <span>VIEW_CERTIFICATE</span>
          <span class="arrow">→</span>
        </div>
      </button>
    `;
    }).join('');
  }

  /* =================================================================
   *  PROJECTS (grid)
   * ================================================================= */
  function renderProjects() {
    const host = $('#projects-grid');
    if (!host) return;
    host.innerHTML = D.projects.map(p => `
      <article class="project-card">
        <div class="project-hero">
          <div class="project-name-block">
            <div class="project-name">${escapeHtml(p.name)}</div>
            <div class="project-tagline">${escapeHtml(p.tagline)}</div>
          </div>
          <div class="project-year">${escapeHtml(p.year)}</div>
        </div>
        <div class="project-body">
          <p class="project-desc">${escapeHtml(p.description)}</p>
          <div class="project-metrics">
            ${p.metrics.map(m => `<div class="metric"><span class="metric-lbl">${escapeHtml(m.label)}</span><span class="metric-val">${escapeHtml(m.value)}</span></div>`).join('')}
          </div>
          <div class="project-tech">
            ${p.tech.map(t => `<span class="stack-chip">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
        <div class="project-actions">
          <button class="btn-project-sim" data-sim-key="${p.simulation}" data-sim-title="${escapeHtml(p.name)}" data-sim-id="${p.id}">
            <span class="blink">▸</span> RUN_SIMULATION
          </button>
          <a class="btn-project-gh" href="${escapeHtml(p.githubUrl)}" target="_blank" rel="noopener noreferrer">GITHUB →</a>
        </div>
      </article>
    `).join('');
  }

  /* =================================================================
   *  EDUCATION
   * ================================================================= */
  function renderEducation() {
    const host = $('#edu-list');
    if (!host) return;
    host.innerHTML = D.education.map(e => `
      <article class="edu-card">
        <div>
          <div class="edu-degree">${escapeHtml(e.degree)}</div>
          <div class="edu-school">${escapeHtml(e.school)} <span style="color:var(--fg-dim);font-size:11px">▸ ${escapeHtml(e.location)}</span></div>
          <div class="edu-detail">${escapeHtml(e.detail)}</div>
        </div>
        <span class="edu-period">${escapeHtml(e.period)}</span>
      </article>
    `).join('');
  }

  /* =================================================================
   *  CONTACT GRID
   * ================================================================= */
  function renderContact() {
    const host = $('#contact-grid');
    if (!host) return;
    const c = D.personal.contact;
    const items = [
      { label: 'EMAIL',     value: c.email,    href: `mailto:${c.email}`,            icon: '✉' },
      { label: 'PHONE',     value: c.phone,    href: `tel:${c.phone.replace(/\s/g, '')}`, icon: '☎' },
      { label: 'WHATSAPP',  value: c.whatsapp, href: `https://wa.me/${c.whatsapp.replace(/[^\d]/g, '')}`, icon: '📱' },
      { label: 'LINKEDIN',  value: 'linkedin.com/in/souhaiebmarzouk', href: c.linkedin, icon: 'in' },
      { label: 'GITHUB',    value: 'github.com/Souhaieb-Marzouk', href: c.github, icon: '</>' },
      { label: 'WEBSITE',   value: 'cyberpulseacademy.com', href: c.website, icon: '🌐' },
      { label: 'Try Hack Me',   value: 'Souhaieb.M', href: c.tryhackme, icon: '🌐' },
      { label: 'LOCATION',  value: D.personal.location, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapQuery)}`, icon: '◉' }
    ];
    host.innerHTML = items.map(i => `
      <a class="contact-item" href="${escapeHtml(i.href)}" ${i.href.startsWith('http') ? 'target="_blank" rel="noopener noreferrer"' : ''} aria-label="${escapeHtml(i.label)} — opens in ${i.href.startsWith('http') ? 'new tab' : 'default client'}">
        <div class="contact-icon">${i.icon}</div>
        <div class="contact-text">
          <div class="contact-label">${escapeHtml(i.label)}</div>
          <div class="contact-value">${escapeHtml(i.value)}</div>
        </div>
      </a>
    `).join('');
  }

  /* =================================================================
   *  FOOTER COMMAND TYPED
   * ================================================================= */
  function startFooterCmd() {
    const host = $('#footer-cmd');
    if (!host) return;
    const cmds = [
      'whoami',
      'cat /etc/profile.txt',
      'git log --oneline',
      'echo "open to opportunities"',
      'ssh recruiter@career.pro',
      'nmap -sV opportunity.all',
      'curl https://souhaieb-marzouk.github.io'
    ];
    let cmdIdx = 0;
    function typeCmd() {
      const cmd = cmds[cmdIdx];
      let i = 0;
      host.textContent = '';
      function step() {
        i++;
        host.textContent = cmd.slice(0, i);
        if (i < cmd.length) setTimeout(step, 90);
        else setTimeout(() => {
          // simulate "result"
          host.textContent = cmd;
          setTimeout(() => {
            cmdIdx = (cmdIdx + 1) % cmds.length;
            typeCmd();
          }, 2200);
        }, 200);
      }
      step();
    }
    typeCmd();
  }

  /* =================================================================
   *  SCROLL REVEAL (IntersectionObserver)
   * ================================================================= */
  function setupScrollReveal() {
    const targets = $$('.exp-item, .skill-group, .cert-card, .project-card, .edu-card, .lang-bar-fill, .skill-bar-fill');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(t => {
        t.classList.add('revealed');
        const fill = t.classList.contains('lang-bar-fill') || t.classList.contains('skill-bar-fill');
        if (fill) t.style.width = (t.dataset.pct || 0) + '%';
      });
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const t = e.target;
        t.classList.add('revealed');
        if (t.classList.contains('lang-bar-fill') || t.classList.contains('skill-bar-fill')) {
          t.style.width = (t.dataset.pct || 0) + '%';
        }
        io.unobserve(t);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(t => io.observe(t));
  }

  /* =================================================================
   *  NAV — active section, smooth scroll, mobile toggle
   * ================================================================= */
  function setupNav() {
    // mobile toggle
    const toggle = $('.nav-toggle');
    const links = $('.nav-links');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    // close on link click (mobile)
    $$('.nav-links a').forEach(a => a.addEventListener('click', () => {
      if (links) links.classList.remove('open');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }));

    // active section detection — scroll-based scroll-spy
    // (IntersectionObserver proved unreliable for tall sections like Skills & Certifications;
    //  the scroll handler below picks the section whose top is just above the nav line.)
    const navLinks = $$('.nav-links a');
    const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h') || '60px', 10);
    const probeOffset = navHeight + 80; // pixels below nav where the "active" probe sits
    let ticking = false;

    function updateActive() {
      const probeY = (window.scrollY || window.pageYOffset) + probeOffset;
      let activeId = null;
      // walk sections in DOM order; the last one whose top is above the probe wins
      const sections = Array.from(document.querySelectorAll('section[id], header[id]'));
      for (let i = 0; i < sections.length; i++) {
        const top = sections[i].getBoundingClientRect().top + window.scrollY;
        if (top <= probeY) activeId = sections[i].id;
      }
      // At the very top of the page (no scroll), default to header
      if (!activeId && sections.length) activeId = sections[0].id;
      navLinks.forEach(a => {
        a.classList.toggle('active', a.getAttribute('data-section') === activeId);
      });
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateActive);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // initial paint
    updateActive();
  }

  /* =================================================================
   *  MODAL SYSTEM
   * ================================================================= */
  function setupModal() {
    const host = $('#modal-host');
    const titleEl = $('#modal-title');
    const idEl = $('#modal-id');
    const body = $('#modal-body');
    const tabsHost = $('#modal-tabs');

    function open({ key, title, id, skill, cert }) {
      // cleanup
      if (body.__cleanup) { body.__cleanup(); body.__cleanup = null; }
      body.innerHTML = '';
      tabsHost.innerHTML = '';
      titleEl.textContent = title || 'SIMULATION';
      idEl.textContent = id ? `// ${id}` : '';

      const ctx = { skill, cert };
      window.SIMULATIONS.render(key, body, ctx);

      // build tabs
      if (ctx.tabs && ctx.tabs.length) {
        tabsHost.innerHTML = ctx.tabs.map((t, i) => `
          <button class="modal-tab ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${escapeHtml(t.label)}</button>
        `).join('');
        // sections
        $$('.sim-section', body).forEach((s, i) => s.classList.toggle('active', i === 0));
        $$('.modal-tab', tabsHost).forEach(t => {
          t.addEventListener('click', () => {
            $$('.modal-tab', tabsHost).forEach(x => x.classList.remove('active'));
            t.classList.add('active');
            const id2 = t.getAttribute('data-tab');
            $$('.sim-section', body).forEach(s => s.classList.toggle('active', s.getAttribute('data-sim') === id2));
          });
        });
      }

      host.classList.add('open');
      host.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      // focus the close button for accessibility
      setTimeout(() => { const c = $('.modal-close', host); if (c) c.focus(); }, 100);
    }

    function close() {
      if (body.__cleanup) { body.__cleanup(); body.__cleanup = null; }
      host.classList.remove('open');
      host.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    // openers
    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-sim-key]');
      if (opener) {
        e.preventDefault();
        open({
          key:   opener.getAttribute('data-sim-key'),
          title: opener.getAttribute('data-sim-title') || 'SIMULATION',
          id:    opener.getAttribute('data-sim-id') || ''
        });
        return;
      }
      const skillItem = e.target.closest('.skill-item');
      if (skillItem) {
        const name = skillItem.getAttribute('data-skill-name');
        const group = skillItem.getAttribute('data-skill-group');
        // find skill object
        const grp = D.skills.find(g => g.group === group);
        if (!grp) return;
        const skill = grp.skills.find(s => s.name === name);
        if (!skill) return;
        open({
          key: name,   // SIMULATIONS.render will try SKILL_SIMS[name] first
          title: `${name} — Skill Simulation`,
          id: `skill.${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          skill
        });
        return;
      }
      const certCard = e.target.closest('.cert-card[data-cert-index]');
      if (certCard) {
        const idx = parseInt(certCard.getAttribute('data-cert-index'), 10);
        const cert = D.certifications[idx];
        if (!cert) return;
        // VERIFY_CERTIFICATE button INSIDE the card → external link, not modal
        // (There's no such button in the card, but be safe for future changes.)
        if (e.target.closest('[data-cert-verify]')) return;
        e.preventDefault();
        open({
          key: '__cert_view__',
          title: 'CERTIFICATE DETAILS',
          id: `cert.${idx}`,
          cert
        });
        return;
      }
      if (e.target.closest('[data-close-modal]')) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && host.classList.contains('open')) close();
    });

    window.__openModal = open;
    window.__closeModal = close;
  }

  /* =================================================================
   *  INIT
   * ================================================================= */
  function init() {
    renderLanguages();
    renderTargeting();
    renderMeta();
    renderExperiences();
    renderSkills();
    renderCerts();
    renderProjects();
    renderEducation();
    renderContact();

    $('#footer-year').textContent = new Date().getFullYear();

    setupNav();
    setupModal();

    // start background animations immediately (boot splash covers them)
    matrixRain();

    // start boot sequence
    bootSequence();

    // start typed profile (delayed so it appears after boot)
    renderHeroProfile();

    // skip-to-content link
    const skip = el('a', 'skip-link', 'Skip to main content');
    skip.href = '#header';
    document.body.insertBefore(skip, document.body.firstChild);

    // scroll reveal — after initial render so observer sees all targets
    setupScrollReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
