/* =====================================================================
 *  data.js — Single source of truth for ALL resume content
 *  Edit this file to update the website (no need to touch HTML/CSS).
 * ===================================================================== */

const RESUME_DATA = {

  /* ---------- 1. PERSONAL / CONTACT ---------- */
  personal: {
    fullName: "Souhaieb Marzouk",
    title: "SOC Analyst | Threat Hunter | Cybersecurity Engineer",
    // typed-out taglines cycling under the name
    taglines: [
      "Detection Engineer @ Tier-2 SOC",
      "Threat Hunter — Hypothesis-driven",
      "HTB CDSA Certified Analyst",
      "10+ yrs Protocol-level Network Security",
      "Open-source Author — CyberGuardian"
    ],
    profile: "Mid-level Detection Engineer and SOC Analyst with 10+ years of protocol-level network and security testing (TCP/IP, SIP/RTP, DNS, DHCP, TR-069, WiFi, DOCSIS, XGPON) across telecom, ISP and broadband environments. Now applying deep systems knowledge to SIEM-driven detection engineering and threat hunting. HTB CDSA certified, hands-on Sigma + Splunk SPL authoring validated through certification exams and a reproducible 9-phase Active Directory attack-chain home lab. Designed CyberGuardian, an open-source malware detection tool with YARA + VirusTotal + MITRE ATT&CK integration. 4 years of prior EU work experience (Netherlands, Portugal) plus on-site client engagements in Germany, Finland, UK and Portugal. Led a team of 8 engineers with daily stakeholder reporting. Seeking a SOC L2 or Threat Hunting role to scale detection engineering and incident response at enterprise scale.",
    location: "Tunis, Tunisia",
    availability: "Available immediately — open to EU relocation & remote",
    contact: {
      email:    "marzouk.souhaieb@proton.me",
      phone:    "+216 95 551 955",
      whatsapp: "+31 6 4848 7594",
      linkedin: "https://www.linkedin.com/in/souhaiebmarzouk",
      github:   "https://github.com/Souhaieb-Marzouk",
      website:  "https://www.cyberpulseacademy.com",
      mapQuery: "Tunis, Tunisia"
    },
    languages: [
      { name: "Arabic",   level: "Native",            percent: 100, cefr: "C2" },
      { name: "English",  level: "Fluent",            percent:  78, cefr: "B2" },
      { name: "French",   level: "Intermediate",     percent:  65, cefr: "B1/B2" }
    ]
  },

  /* ---------- 2. WORK EXPERIENCES (reverse chronological) ---------- */
  // Each experience has a `simulation` key that drives the modal simulation
  experiences: [
    {
      id: "ind-research",
      role: "Independent Security Research & Skill Development",
      company: "Freelancer",
      location: "Tunisia",
      period: "April 2023 — Present",
      type: "Career Gap filled with Projects, Certifications & Practical Labs",
      summary: "Self-directed full-time cybersecurity retraining: built a complete SOC + Pentest home lab, authored CyberGuardian (open-source malware triage tool), earned 5 industry certifications (HTB CDSA, CompTIA Security+, Network+, CTFL, CTFL-AT), and completed 400+ TryHackMe hands-on rooms ranked global top 1%.",
      highlights: [
        "Authored 9-phase Active Directory attack-chain detections (Splunk SPL + Sigma rules) mapped to MITRE ATT&CK",
        "Architected CyberGuardian with YARA + VirusTotal + AI (OpenAI/Gemini/DeepSeek) malware triage",
        "Earned HTB CDSA — examiner praised \"commendable documentation, well-structured report\"",
        "Completed 400+ TryHackMe rooms — global rank #2637 (top 1%)",
        "Created cybersecurity education content (Udemy courses + Cyber Pulse Academy website)"
      ],
      stack: ["Splunk SPL", "Sigma", "YARA", "Sysmon", "Volatility 3", "Autopsy", "MITRE ATT&CK", "Python", "PowerShell", "VirtualBox"],
      simulation: "soc-homelab"
    },
    {
      id: "libertyglobal",
      role: "Senior Network & Vulnerability Analysis Engineer",
      company: "LibertyGlobal (via TEKSystems)",
      location: "Netherlands (Remote)",
      period: "July 2020 — March 2023",
      type: "Contract (renewed: 1y + 1y + 6m + 3m)",
      summary: "Anomaly-driven security testing and protocol-level threat hunting across LibertyGlobal's production Cable DOCSIS, RDK-B, XGS-PON fiber and VoIP (Asterisk/Kamailio) infrastructure in a major European ISP environment serving millions of subscribers. Promoted to lead the new XGS-PON product line — led and mentored a team of 8 engineers with daily stakeholder reporting.",
      highlights: [
        "Discovered SSH remote access enabled by default with admin-equivalent GUI password — rated Critical, full remediation cycle (read-only + opt-in)",
        "Validated WPA2/WPA3/WiFi 6 security across 2.4/5/6 GHz with throughput, interference and isolation testing",
        "Led 8-engineer validation team for the new XGS-PON product line (onshore + offshore mix) — promoted from individual contributor",
        "Owned the full validation responsibility of XGS-PON solo for 2 months before team handover",
        "Daily standups + bi-weekly metrics reports: tests executed (passed/failed/blocked), anomalies found, anomalies fixed & re-checked, engineer availability"
      ],
      stack: ["DHCP","DNS","SIP/RTP","TLS","SSH","TR-069","DOCSIS 3.0/3.1","XGS-PON","RDK-B","Docker","Jenkins","Jira","Wireshark","tcpdump","Nmap"],
      simulation: "libertyglobal-soc"
    },
    {
      id: "capgemini",
      role: "Security Quality & Automation Engineer",
      company: "Capgemini (Altran Portugal)",
      location: "Fundão, Portugal",
      period: "June 2019 — June 2020",
      type: "Permanent, on-site",
      summary: "Built automated security test suites for AXA Assurance (France) mobile (iOS + Android) and web platforms using Appium, Selenium WebDriver and Java on Azure cloud. Tests implicitly validated authentication flows, session handling, and access-control logic — catching flaws that static analysis missed.",
      highlights: [
        "Automated authentication, navigation, and payment simulation flows for AXA mobile/web on Azure device cloud",
        "Integrated tests into Azure CI/CD pipelines — shift-left security caught auth/access regressions at build time",
        "Mastered SQL injection simulation, malicious file upload validation, and session-handling automation",
        "Personally built the automation framework solo with a single supervisor for weekly reviews"
      ],
      stack: ["Java","Selenium","Appium","Azure Cloud","GitHub Actions","Jenkins","CI/CD"],
      simulation: "axa-automation"
    },
    {
      id: "sagemcom",
      role: "Network & Protocol Security Engineer (Validation & Vulnerability Assessment)",
      company: "Sagemcom",
      location: "Tunis, Tunisia (with on-site EU missions)",
      period: "May 2014 — May 2019",
      type: "Permanent, full-time",
      summary: "Embedded-device and CPE vulnerability assessment program for European ISP-grade broadband products (routers, gateways, xDSL, DOCSIS, XGS-PON CPE) across 10+ product lines. Primary technical contact for 4 European ISP clients with on-site engagements in Manchester, Helsinki, Lisbon and Berlin. Reported 800+ findings over 5 years with critical findings triggering pre-release firmware remediation cycles.",
      highlights: [
        "Critical finding on KDG DOCSIS 3.1: factory reset from GUI/SNMP caused gateway boot loop — CVSS 8.0, mass-impact remediation",
        "Built bidirectional traceability matrices between ISO 27001:2022 Annex A controls, security requirements and test artifacts (audit-ready)",
        "Mentored ~10 engineers across multiple product lines — recognized by management for elevating team capability (1-month readiness)",
        "On-site missions: KDG (Berlin), Telia (Helsinki), Vodafone (Lisbon), TalkTalk (Manchester) as primary technical liaison",
        "Hypothesis-driven 'Free Testing' methodology — engineers invented attack steps from imagination to find undocumented vulnerabilities"
      ],
      stack: ["Nmap","Wireshark","tcpdump","iperf","Omnipeek","CDRouter","Kali Linux","Bugzilla","Jira","ISO 27001","CVSS v3.0","BBox3","Vodafone","KDG","TalkTalk","Telia","Bouygues","Sunrise","KPN"],
      simulation: "sagemcom-terminal"
    },
    {
      id: "focus",
      role: "Embedded Systems Test Engineer",
      company: "Focus International Corporation",
      location: "Tunis, Tunisia",
      period: "March 2012 — April 2014",
      type: "Full-time, permanent",
      summary: "Adversarial security testing of Bluetooth stack implementations embedded in Parrot automotive products (CK3100, Porsche Carkit). Validated protocol state machines under repeated stress and disconnection conditions, documenting reproducible steps for each finding in Bugzilla. Developed adversarial testing intuition on the same class of Bluetooth stacks later affected by industry-wide vulnerabilities publicly disclosed as BlueBorne (2017) and BrakTooth (2021).",
      highlights: [
        "Manual validation of Bluetooth car-kit connectivity: incoming/outgoing calls, music streaming, contact sync, multi-phone support",
        "Stress-tested protocol state machines: repeated connect/disconnect, multi-phone handoff, overnight persistence",
        "Bugzilla bug reporting with reproducible steps — direct reporting to client (Parrot, France)",
        "Built the validation-engineer mindset that powered my entire later career"
      ],
      stack: ["Bluetooth","Bugzilla","Excel","Manual Testing","Stress Testing","CK3100","Porsche Carkit"],
      simulation: "bluetooth-test"
    }
  ],

  /* ---------- 3. SKILLS (grouped, with self-assessed levels) ---------- */
  skills: [
    {
      group: "SIEM & Detection",
      icon: "📡",
      skills: [
        { name: "Splunk SPL",            level: "Intermediate", percent: 65, sources: ["TryHackMe","HTB CDSA","Home Lab"] },
        { name: "Splunk CIM",            level: "Beginner",     percent: 30, sources: ["TryHackMe"] },
        { name: "Splunk Alerts/Dashboards", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Sysmon",                level: "Intermediate", percent: 65, sources: ["TryHackMe","HTB","Home Lab"] },
        { name: "Windows Event Logs",    level: "Intermediate", percent: 65, sources: ["TryHackMe","HTB CDSA","Home Lab"] },
        { name: "Kibana",                level: "Beginner",     percent: 30, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Log Parsing",           level: "Advanced",     percent: 82, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "Sigma Rule Authoring",  level: "Intermediate", percent: 65, sources: ["TryHackMe","HTB CDSA","Home Lab"] },
        { name: "Detection Engineering", level: "Advanced",     percent: 80, sources: ["TryHackMe","HTB","Home Lab","Sagemcom","LibertyGlobal"] },
        { name: "Alert Triage",          level: "Advanced",     percent: 80, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] }
      ]
    },
    {
      group: "Threat Hunting & Forensics",
      icon: "🔍",
      skills: [
        { name: "Hypothesis-driven Hunting", level: "Advanced", percent: 80, sources: ["TryHackMe","HTB","Home Lab","Sagemcom","LibertyGlobal"] },
        { name: "Network Forensics / Packet Analysis", level: "Advanced", percent: 82, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "Memory Forensics (Volatility 3)", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Disk Forensics (Autopsy)", level: "Intermediate", percent: 58, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Disk Forensics (FTK Imager)", level: "Beginner", percent: 30, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Malware Analysis (YARA)", level: "Intermediate", percent: 65, sources: ["TryHackMe","HTB","Home Lab"] },
        { name: "Malware Analysis (PEStudio)", level: "Beginner", percent: 35, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Process Analysis (Procmon)", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA"] },
        { name: "KAPE", level: "Beginner", percent: 30, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Steganography Detection", level: "Beginner", percent: 30, sources: ["TryHackMe"] }
      ]
    },
    {
      group: "Penetration Testing & VA",
      icon: "⚔️",
      skills: [
        { name: "Nmap",            level: "Advanced",     percent: 85, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "Wireshark",       level: "Advanced",     percent: 88, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "tcpdump",         level: "Advanced",     percent: 82, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "OSINT Framework", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB"] },
        { name: "OWASP Top 10",    level: "Intermediate", percent: 62, sources: ["TryHackMe","HTB"] },
        { name: "CVSS v3.1",       level: "Advanced",     percent: 78, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "NIST SP 800-115", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","LibertyGlobal"] },
        { name: "Burp Suite",      level: "Intermediate", percent: 55, sources: ["TryHackMe","HTB"] },
        { name: "Metasploit",      level: "Beginner",     percent: 35, sources: ["TryHackMe","HTB"] }
      ]
    },
    {
      group: "Networking & Protocols",
      icon: "🌐",
      skills: [
        { name: "TCP/IP",        level: "Advanced", percent: 88, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "DHCP",          level: "Advanced", percent: 86, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "DNS",           level: "Advanced", percent: 86, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "HTTP/HTTPS",    level: "Advanced", percent: 85, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "SIP/RTP",       level: "Advanced", percent: 84, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "SSH",           level: "Advanced", percent: 84, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "TLS",           level: "Advanced", percent: 82, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "TR-069 / CWMP", level: "Advanced", percent: 82, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "ARP",           level: "Advanced", percent: 84, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "ICMP",          level: "Advanced", percent: 84, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "GRE",           level: "Intermediate", percent: 60, sources: ["Sagemcom"] },
        { name: "PPP",           level: "Intermediate", percent: 60, sources: ["Sagemcom"] },
        { name: "WiFi WPA2/WPA3/WiFi 6", level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "DOCSIS",        level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "XGPON",         level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "VoIP Security", level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "Firewall",      level: "Advanced", percent: 82, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "ACL",           level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "NAT",           level: "Advanced", percent: 82, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "QoS",           level: "Intermediate", percent: 60, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "IPSec",         level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "AES Encryption", level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] }
      ]
    },
    {
      group: "Cloud & DevSecOps",
      icon: "☁️",
      skills: [
        { name: "Azure",          level: "Beginner",     percent: 35, sources: ["TryHackMe","Capgemini"] },
        { name: "Docker",         level: "Intermediate", percent: 60, sources: ["TryHackMe","LibertyGlobal"] },
        { name: "Jenkins",        level: "Intermediate", percent: 58, sources: ["TryHackMe","Capgemini"] },
        { name: "GitHub Actions", level: "Intermediate", percent: 58, sources: ["TryHackMe","Capgemini"] },
        { name: "TheHive",        level: "Beginner",     percent: 30, sources: ["TryHackMe","HTB"] }
      ]
    },
    {
      group: "Frameworks & Standards",
      icon: "📋",
      skills: [
        { name: "MITRE ATT&CK",    level: "Intermediate", percent: 65, sources: ["TryHackMe","HTB CDSA","Home Lab"] },
        { name: "Cyber Kill Chain", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB"] },
        { name: "Diamond Model",   level: "Intermediate", percent: 58, sources: ["TryHackMe","HTB"] },
        { name: "NIST SP 800-61r2", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Sagemcom"] },
        { name: "NIST CSF 2.0",    level: "Beginner",     percent: 35, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "ISO 27001:2022 Annex A", level: "Intermediate", percent: 60, sources: ["Sagemcom"] },
        { name: "STRIDE",          level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "CVE",             level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] }
      ]
    },
    {
      group: "Scripting & Automation",
      icon: "💻",
      skills: [
        { name: "Python",   level: "Intermediate", percent: 60, sources: ["TryHackMe","Coddy.Tech","Sagemcom"] },
        { name: "PowerShell", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Home Lab"] },
        { name: "Bash",     level: "Intermediate", percent: 58, sources: ["TryHackMe","HTB","Final Study Project"] },
        { name: "Java",     level: "Intermediate", percent: 58, sources: ["Capgemini","Final Study Project"] },
        { name: "Selenium", level: "Intermediate", percent: 58, sources: ["Capgemini"] },
        { name: "Appium",   level: "Intermediate", percent: 55, sources: ["Capgemini"] },
        { name: "CI/CD (Jenkins)", level: "Intermediate", percent: 58, sources: ["Capgemini"] },
        { name: "Jira",     level: "Advanced",     percent: 82, sources: ["Capgemini","Sagemcom","LibertyGlobal"] }
      ]
    }
  ],

  /* ---------- 4. CERTIFICATIONS ---------- */
  certifications: [
    {
      title: "HTB Certified Defensive Security Analyst (CDSA)",
      issuer: "HackTheBox",
      date: "August 2025",
      logo: "🎓",
      logoColor: "#9FE870",
      verifyUrl: "https://academy.hackthebox.com/verification/certificates",
      blurb: "Two critical incident-response scenarios requiring full attack-chain reconstruction (forward & reverse), Splunk SPL queries, Sigma rules, and a structured forensic report. Examiner feedback: \"The way you documented the detection activities was commendable and easy to follow. Your report was nicely structured as well. Well done!\""
    },
    {
      title: "CompTIA Security+ (SY0-701)",
      issuer: "CompTIA",
      date: "February 2025",
      logo: "🛡️",
      logoColor: "#E91E25",
      verifyUrl: "https://www.comptia.org/credentials/verification",
      blurb: "Global benchmark for foundational cybersecurity skills — threats, vulnerabilities, architecture, operations, incident response, governance."
    },
    {
      title: "CompTIA Network+ (N10-009)",
      issuer: "CompTIA",
      date: "December 2024",
      logo: "🌐",
      logoColor: "#0070C0",
      verifyUrl: "https://www.comptia.org/credentials/verification",
      blurb: "Network architecture, protocols, operations, security, and troubleshooting — the foundation for protocol-level threat hunting."
    },
    {
      title: "Google Cybersecurity Professional Certificate",
      issuer: "Google / Coursera",
      date: "September 2024",
      logo: "🟢",
      logoColor: "#34A853",
      verifyUrl: "https://www.coursera.org/verify/professional-cert/GOOGLE-CYBERSECURITY",
      blurb: "Foundational SOC analyst skills: SIEM basics, Python for security, Linux, SQL, intrusion detection, incident response."
    },
    {
      title: "ISTQB Certified Tester Foundation Level — Agile Tester (CTFL-AT)",
      issuer: "ISTQB",
      date: "March 2024",
      logo: "✅",
      logoColor: "#0066B3",
      verifyUrl: "https://istqb-web.astqb.org/?&_v=12&_lp=1",
      blurb: "Agile testing methodology, ceremonies, and test design — proves my long-standing Agile team experience at Sagemcom & LibertyGlobal."
    },
    {
      title: "ISTQB Certified Tester Foundation Level (CTFL)",
      issuer: "ISTQB",
      date: "February 2024",
      logo: "✅",
      logoColor: "#0066B3",
      verifyUrl: "https://istqb-web.astqb.org/?&_v=12&_lp=1",
      blurb: "Foundational software testing principles, test design techniques, test management — anchors my 10-year QA background."
    }
  ],

  /* ---------- 5. PROJECTS ---------- */
  projects: [
    {
      id: "cyberguardian",
      name: "CyberGuardian",
      tagline: "Open-Source Windows Malware Detection & AI Triage Tool",
      year: "2025",
      description: "Multi-layered malware detection tool that performs local static analysis of Windows endpoints (running processes, registry, local files, network connections) and correlates findings with YARA rules, VirusTotal API, and AI-based analysis (OpenAI, Gemini, DeepSeek) for malware classification with automatic MITRE ATT&CK technique mapping. Implementation was AI-assisted using Python; my ownership covered system architecture, detection logic, security validation, threat modeling and VirusTotal/AI integration strategy.",
      tech: ["Python","psutil","ctypes","YARA","VirusTotal API","OpenAI","Gemini","DeepSeek","Windows API","Tkinter"],
      githubUrl: "https://github.com/Souhaieb-Marzouk/CyberGuardian",
      metrics: [
        { label: "Detection Vectors", value: "5 (Process, File, Registry, Network, Memory)" },
        { label: "AI Providers",      value: "3 (DeepSeek, OpenAI, Gemini)" },
        { label: "VirusTotal Engines", value: "70+ AV engines per scan" },
        { label: "YARA Rules",        value: "Custom + community signatures" }
      ],
      simulation: "cyberguardian-scan"
    },
    {
      id: "homelab",
      name: "SOC & Pentest Full Home Lab",
      tagline: "Reproducible 9-Phase Active Directory Attack-Chain Detection",
      year: "2025",
      description: "Complete SOC + Pentest home lab simulating a 9-phase Active Directory attack chain. Architecture: 2 Windows Server 2019 (1 DC + 1 IIS Web Server), Windows 10 Pro 22H2 victim, Kali Linux 2026.1 attacker, Splunk SIEM, Sysmon endpoint telemetry. Attack chain: Initial Access (phishing macro) → Execution (PowerShell loader) → Enumeration → Privilege Escalation (UAC bypass) → Persistence → Lateral Movement (WinRM) → C2 Beacon on DC → Persistence (malicious service) → Credential Dump (LSASS). Detection: Splunk SPL queries + Sigma rules mapped to MITRE ATT&CK for each phase. IR documentation: detection, containment (krbtgt double-reset), eradication, recovery, lessons learned. Fully reproducible, published on GitHub with screenshots, videos, and step-by-step instructions.",
      tech: ["VirtualBox","Windows Server 2019","Windows 10","Kali Linux","Splunk Enterprise","Sysmon","PowerShell","Rubeus","ProcDump","Mimikatz"],
      githubUrl: "https://github.com/Souhaieb-Marzouk/SOC-PenTest-Full-Home-Lab-Project",
      metrics: [
        { label: "Attack Phases",  value: "9 phases mapped to MITRE ATT&CK" },
        { label: "Detection Rules", value: "9 Sigma + 9 SPL query sets" },
        { label: "VMs",            value: "4 (DC, Web, Victim, Attacker)" },
        { label: "IR Phases",      value: "Detection → Containment → Eradication → Recovery → Lessons Learned" }
      ],
      simulation: "homelab-attack-chain"
    }
  ],

  /* ---------- 6. EDUCATION ---------- */
  education: [
    {
      degree: "Master's Degree, Computer Science",
      school: "ESPRIT — École Supérieure Privée d'Ingénierie et de Technologies",
      location: "Tunis, Tunisia",
      period: "2012 — 2016 (night courses)",
      detail: "Final project: Architected and built a JavaFX desktop application that automates end-to-end VPN validation campaigns on Linux gateways, replacing a manual shell-script workflow at Sagemcom. Implemented GUI wizards for 6 VPN protocol stacks (L2TP/IPSec, L2TP/PPP/IPSec, PPPoE/PPP/IP, PPPoE/PPP/IPSec, PPTP, GRE) covering both Site-to-Site and Client-to-Site topologies, and a bidirectional test orchestrator running Ping, iPerf3, traceroute and Wireshark captures on both endpoints. Completed while working full-time."
    },
    {
      degree: "Bachelor's Degree, Industrial Computing",
      school: "Higher Institute of Computer Science",
      location: "Tunis, Tunisia",
      period: "2008 — 2011",
      detail: "Embedded systems focus. Final-year project: Built an electronic RFID tool for blind people — a wearable device that vibrated when the correct bus arrived at the station, helping visually impaired riders board the right vehicle and reach their destination independently."
    }
  ],

  /* ---------- 7. TARGET ROLES (drives the 'Targeting' chips) ---------- */
  targeting: {
    primary: "SOC L2 Analyst",
    secondary: "Threat Hunter",
    tertiary: "Penetration Tester",
    availability: "Available immediately",
    relocation: "EU (Spain, Portugal, France, Malta, Belgium preferred) — sponsorship required",
    remote: "Open to remote / hybrid",
    workAuth: "Tunisian citizen — EU sponsorship required for on-site work"
  }
};

// expose globally
window.RESUME_DATA = RESUME_DATA;
