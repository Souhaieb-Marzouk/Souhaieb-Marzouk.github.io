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
      "10+ years Protocol-level Network Security",
      "Open-source Author — CyberGuardian"
    ],
    profile: "Mid-level Detection Engineer and SOC Analyst with 10+ years of protocol-level network and security testing (TCP/IP, SIP/RTP, DNS, DHCP, TR-069, WiFi, DOCSIS, XGPON) across telecom, ISP and broadband environments. Now applying deep systems knowledge to SIEM-driven detection engineering and threat hunting. HTB CDSA certified, hands-on Sigma + Splunk SPL authoring validated through certification exams and a reproducible 9-phase Active Directory attack-chain home lab. Designed CyberGuardian, an open-source malware detection tool with YARA + VirusTotal + MITRE ATT&CK integration. 4 years of prior EU work experience (Netherlands, Portugal) plus on-site client engagements in Germany, Finland, UK and Portugal. Led a team of 8 engineers with daily stakeholder reporting. Seeking a SOC L2 or Threat Hunting role to scale detection engineering and incident response at enterprise scale.",
    location: "Tunis, Tunisia",
    availability: "Available immediately — open to relocation worldwide & remote",
    contact: {
      email:    "marzouk.souhaieb@proton.me",
      phone:    "+216 95 551 955",
      whatsapp: "+31 6 48 48 75 94",
      linkedin: "https://www.linkedin.com/in/souhaiebmarzouk",
      github:   "https://github.com/Souhaieb-Marzouk",
      website:  "https://www.cyberpulseacademy.com",
      tryhackme:  "https://tryhackme.com/p/Souhaieb.M",
      mapQuery: "Tunis, Tunisia"
    },
    languages: [
      { name: "Arabic",   level: "Native",            percent: 100, cefr: "C2" },
      { name: "English",   level: "Fluent",            percent:  78, cefr: "B2" },
      { name: "French",   level: "Fluent",            percent:  78, cefr: "B2" },
      { name: "Espagnol",   level: "Beginner",            percent:  10, cefr: "A1" }
    ]
  },

  /* ---------- 2. WORK EXPERIENCES (reverse chronological) ---------- */
  // Each experience has a `simulation` key that drives the modal simulation
  experiences: [
    {
      id: "ind-research",
      role: "Full-time Cybersecurity Specialization & Skill Development",
      company: "Freelancer",
      location: "Tunisia",
      period: "2023 — Present",
      type: "Full-time, Career Gap filled with Projects, Certifications, Practical Labs & Skills development",
      summary: "",
          highlights: [
        "Built complete SOC + Pentest home lab (Active Directory, Splunk SIEM, Sysmon) simulating a 9-phase attack chain from phishing macro to LSASS dumping; authored Splunk SPL detections and Sigma rules mapped to MITRE ATT&CK for each phase, with full IR documentation.",
        "Architected, deployed and validated CyberGuardian application, an open-source malware detection tool integrating YARA rules, VirusTotal API, and AI-based analysis with automatic MITRE ATT&CK technique mapping.",
        "Earned HTB CDSA — examiner praised \"The way you documented the detection activities was commendable and easy to follow. Your report is nicely structured as well. Well done!\"",
        "Completed 400+ TryHackMe hands-on labs (Blue & Red Team paths), ranked global top 1%; 50+ CTF challenges.",
        "Created cybersecurity education content (Udemy courses + dedicated website) covering MITRE ATT&CK tactics, SOC analyst jargon, and certification prep with real-world examples."
      ],
      /* Nested freelance project delivered inside this period */
      projects: [
        {
          tag: "FREELANCE_PROJECT",
          role: "Detection Engineer & IR Lead (Freelance)",
          company: "German Neobank (NDA)",
          location: "Full Remote · Tunisia",
          period: "Sep 2025 — Feb 2026",
          type: "SOC Modernisation for a BaFin-Regulated Neobank",
          highlights: [
            "Authored 70+ of 140+ production Sigma rules mapped to 50+ MITRE ATT&CK techniques. Built the detection-as-code CI pipeline (Sigma + sigmac + pySigma + Splunk AppInspect) with branch protection, PR review, and positive/negative unit tests.",
            "Designed and deployed 10+ AWS honey tokens (Thinkst Canary approach) with a Sigma detection firing on any honey token use.",
            "Authored 35+ NIST SP 800-61r2-aligned IR runbooks and 10+ Confluence wiki pages. Authored 120+ of 180 pages of the BaFin IT audit evidence binder, including the Detection Coverage Report and the ATT&CK Navigator layer file showing 75%+ weighted coverage.",
            "Delivered 4 SOC training sessions (Splunk SPL, Sigma authoring, alert triage, IR runbook walkthrough) to 2 internal junior SOC analysts.",
            "Achieved MTTD under 15 minutes and MTTR under 2 hours for high-severity incidents during hypercare."
          ],
          stack: ["Sigma", "pySigma", "sigmac", "Splunk AppInspect", "Splunk SPL", "MITRE ATT&CK", "Thinkst Canary", "NIST SP 800-61r2", "Confluence", "CloudTrail", "VPC Flow Log", ]
        }
      ],
      stack: ["Splunk SPL", "Sigma", "YARA", "Sysmon", "Volatility 3", "Autopsy", "MITRE ATT&CK", "Python", "PowerShell", "VirtualBox"],
      simulation: "soc-homelab"
    },
    {
      id: "libertyglobal",
      role: "Senior Network Protocol Validation & Vulnerability Assessment Engineer",
      company: "LibertyGlobal (via TEKSystems)",
      location: "Netherlands (Hybrid)",
      period: "2020 — 2023",
      type: "Full-time, Contractor",
      summary: "",
      highlights: [
        "Performed anomaly-driven security testing and protocol-level threat hunting across LibertyGlobal's production Cable DOCSIS, RDK-B, XGS-PON fiber, and VoIP (Asterisk/Kamailio) infrastructure; identifying misconfigurations, unauthorized services, and protocol-level anomalies in a major European ISP environment serving millions of subscribers.",
        "Applied deep protocol expertise (DHCP, DNS, HTTP/HTTPS, ARP, ICMP, SIP, RTP, TLS, SSH, TR-069) and encryption analysis (AES, IPSec, SSL, WPA2/WPA3) to detect weak cryptography, misconfigurations, and exploitable vulnerabilities before production deployment.",
        "Conducted vulnerability assessment and penetration testing using Nmap, Wireshark, tcpdump, and Docker-based test client environments, discovering and documenting vulnerabilities that helped reduce the attack surface of production broadband and voice platforms.",
        "Validated WiFi security across 2.4GHz / 5GHz / WiFi 6 deployments, assessing WPA2/WPA3 encryption, authentication, and client isolation against eavesdropping, rogue AP, and deauthentication attacks.",
        "Promoted to lead security testing strategy for the new XGS-PON optical-fiber product line; led and mentored a team of 8 engineers, with daily reporting to client stakeholders on findings, remediation status, and team performance."
      ],
      stack: ["DHCP","DNS","SIP/RTP","TLS","SSH","TR-069","DOCSIS 3.0/3.1","XGS-PON","RDK-B","Docker","Jenkins","Jira","Wireshark","tcpdump","Nmap"],
      simulation: "libertyglobal-soc"
    },
    {
      id: "capgemini",
      role: "Security Quality & Automation Engineer",
      company: "Capgemini (Altran Portugal)",
      location: "Portugal",
      period: "2019 — 2020",
      type: "Full-time, Permanent",
      summary: "",
      highlights: [
        "Built automated security test suites for AXA mobile (iOS/Android) and web platforms using Appium, Selenium WebDriver, and Java on Azure cloud. Tests implicitly validated authentication flows, session handling, and access control logic, catching flaws that static analysis missed.",
        "Integrated test suites into Azure CI/CD pipelines, applying shift-left security principles to catch authentication and access-control regressions during the build phase rather than post-deployment."
      ],
      stack: ["Java","Selenium","Appium","Azure Cloud","GitHub Actions","Jenkins","CI/CD"],
      simulation: "axa-automation"
    },
    {
      id: "sagemcom",
      role: "Network Protocol Validation & Vulnerability Assessment Engineer",
      company: "SAGEMCOM",
      location: "Tunisia (with on-site EU missions)",
      period: "2014 — 2019",
      type: "Full-time, Permanent",
      summary: "Embedded-device and CPE vulnerability assessment program for European ISP-grade broadband products (routers, gateways, xDSL, DOCSIS, XGS-PON CPE) across 10+ product lines, including direct on-site engagements with 4 major European ISPs:",
      highlights: [
        "Led vulnerability assessment and protocol-level security testing across the CPE product lines, deployed in production networks serving millions of subscribers across Vodafone, Telia, KDG, TalkTalk, and BBox. Identified misconfigurations, weak authentication, cryptographic flaws, and protocol implementation bugs before production deployment.",
        "Validated security controls (firewall rules, NAT, VLAN segmentation, IPSec) directly on production gateway hardware via CLI/GUI/SSH; built bidirectional traceability matrices between ISO 27001:2022 Annex A controls, security requirements, and test artifacts; directly contributing to audit readiness.",
        "Conducted hypothesis-driven hunting for protocol-level anomalies and undocumented vulnerabilities; documenting each finding as a Jira ticket with reproducible exploit steps, test environment, tools used, CVSS severity rating, and remediation proposal. Reported 800+ findings over 5 years, with critical findings triggering pre-release firmware remediation cycles.",
        "Mentored new engineers on security testing methodology and vulnerability management workflows (recognized by management for elevating team capability).",
        "Served as primary technical contact for 4 European ISP clients, delivering daily technical reports and on-site briefings in Manchester (TalkTalk), Helsinki (Telia), Lisbon (Vodafone), and Berlin (KDG)."
      ],
      stack: ["Nmap","Wireshark","tcpdump","iperf","Omnipeek","CDRouter","Kali Linux","Bugzilla","Jira","ISO 27001","CVSS v3.0","BBox3","Vodafone","KDG","TalkTalk","Telia","Bouygues","Sunrise","KPN"],
      simulation: "sagemcom-terminal"
    },
    {
      id: "focus",
      role: "Embedded Systems Test Engineer",
      company: "Focus International Corporation",
      location: "Tunisia",
      period: "2012 — 2014",
      type: "Full-time, Permanent",
      summary: "",
      highlights: [
        "Performed adversarial security testing of Bluetooth stack implementations embedded in Parrot automotive products, validating protocol state machines and testing Bluetooth connection scenarios under repeated stress and disconnection conditions, documenting reproducible steps for each finding.",
        "Developed adversarial testing intuition on the same class of Bluetooth stacks later affected by industry-wide vulnerabilities publicly disclosed as BlueBorne (2017) and BrakTooth (2021), which I studied afterward to understand their impact on similar attack architecture."
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
        { name: "Log Parsing",           level: "Advanced",     percent: 80, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
		{ name: "Detection Engineering", level: "Advanced",     percent: 80, sources: ["TryHackMe","HTB","Home Lab","Sagemcom","LibertyGlobal"] },
        { name: "Alert Triage",          level: "Advanced",     percent: 80, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
		{ name: "Splunk SPL",            level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA","Home Lab"] },
		{ name: "Splunk Alerts/Dashboards", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Sysmon",                level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Home Lab"] },
        { name: "Windows Event Logs",    level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA","Home Lab"] },
		{ name: "Sigma Rule Authoring",  level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA","Home Lab"] },
        { name: "Splunk CIM",            level: "Beginner",     percent: 40, sources: ["TryHackMe"] },
        { name: "Kibana",                level: "Beginner",     percent: 40, sources: ["TryHackMe","HTB CDSA"] }
      ]
    },
    {
      group: "Threat Hunting & Forensics",
      icon: "🔍",
      skills: [
        { name: "Hypothesis-driven Hunting", level: "Advanced", percent: 80, sources: ["TryHackMe","HTB","Home Lab","Sagemcom","LibertyGlobal"] },
        { name: "Network Forensics / Packet Analysis", level: "Advanced", percent: 80, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "Memory Forensics (Volatility 3)", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Disk Forensics (Autopsy)", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Malware Analysis (YARA)", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Home Lab"] },
        { name: "Process Analysis (Procmon)", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA"] },
        { name: "KAPE", level: "Beginner", percent: 40, sources: ["TryHackMe","HTB CDSA"] },
		{ name: "Malware Analysis (PEStudio)", level: "Beginner", percent: 40, sources: ["TryHackMe","HTB CDSA"] },
		{ name: "Disk Forensics (FTK Imager)", level: "Beginner", percent: 40, sources: ["TryHackMe","HTB CDSA"] },
        { name: "Steganography Detection", level: "Beginner", percent: 40, sources: ["TryHackMe"] }
      ]
    },
    {
      group: "Penetration Testing & VA",
      icon: "⚔️",
      skills: [
        { name: "Nmap",            level: "Advanced",     percent: 80, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "Wireshark",       level: "Advanced",     percent: 80, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "tcpdump",         level: "Advanced",     percent: 80, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "CVSS v3.1",       level: "Advanced",     percent: 80, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
		{ name: "OSINT Framework", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB"] },
        { name: "OWASP Top 10",    level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB"] },
        { name: "NIST SP 800-115", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","LibertyGlobal"] },
        { name: "Burp Suite",      level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB"] },
        { name: "Metasploit",      level: "Beginner",     percent: 40, sources: ["TryHackMe","HTB"] }
      ]
    },
        {
      group: "Networking & Protocols",
      icon: "🌐",
          split: true,
      skills: [
        { name: "TCP/IP",        level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "DHCP",          level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "DNS",           level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "HTTP/HTTPS",    level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "SIP/RTP",       level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "SSH",           level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "TLS",           level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "TR-069 / CWMP", level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "ARP",           level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "ICMP",          level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "WiFi WPA2/WPA3/WiFi 6", level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "DOCSIS",        level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "XGPON",         level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "VoIP Security", level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "Firewall",      level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "ACL",           level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "NAT",           level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal","TryHackMe"] },
        { name: "IPSec",         level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
        { name: "AES Encryption", level: "Advanced", percent: 80, sources: ["Sagemcom","LibertyGlobal"] },
		{ name: "GRE",           level: "Intermediate", percent: 60, sources: ["Sagemcom"] },
        { name: "PPP",           level: "Intermediate", percent: 60, sources: ["Sagemcom"] },
        { name: "QoS",           level: "Intermediate", percent: 60, sources: ["Sagemcom","LibertyGlobal"] }
      ]
    },
    {
      group: "Cloud & DevSecOps",
      icon: "☁️",
      skills: [
        { name: "Docker",         level: "Intermediate", percent: 60, sources: ["TryHackMe","LibertyGlobal"] },
        { name: "Jenkins",        level: "Intermediate", percent: 60, sources: ["TryHackMe","Capgemini"] },
        { name: "GitHub Actions", level: "Intermediate", percent: 60, sources: ["TryHackMe","Capgemini"] },
		{ name: "Azure",          level: "Beginner",     percent: 40, sources: ["TryHackMe","Capgemini"] },
        { name: "TheHive",        level: "Beginner",     percent: 40, sources: ["TryHackMe","HTB"] }
      ]
    },
    {
      group: "Frameworks & Standards",
      icon: "📋",
      skills: [
        { name: "MITRE ATT&CK",    level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB CDSA","Home Lab"] },
        { name: "Cyber Kill Chain", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB"] },
        { name: "Diamond Model",   level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB"] },
        { name: "NIST SP 800-61r2", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Sagemcom"] },
        { name: "ISO 27001:2022 Annex A", level: "Intermediate", percent: 60, sources: ["Sagemcom"] },
        { name: "STRIDE",          level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
        { name: "CVE",             level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] },
		{ name: "NIST CSF 2.0",    level: "Beginner",     percent: 40, sources: ["TryHackMe","HTB","Sagemcom","LibertyGlobal"] }
      ]
    },
    {
      group: "Scripting & Automation",
      icon: "💻",
      skills: [
        { name: "Jira",     level: "Advanced",     percent: 80, sources: ["Capgemini","Sagemcom","LibertyGlobal"] },
		{ name: "Python",   level: "Intermediate", percent: 60, sources: ["TryHackMe","Coddy.Tech","Sagemcom"] },
        { name: "PowerShell", level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Home Lab"] },
        { name: "Bash",     level: "Intermediate", percent: 60, sources: ["TryHackMe","HTB","Final Study Project"] },
        { name: "Java",     level: "Intermediate", percent: 60, sources: ["Capgemini","Final Study Project"] },
        { name: "Selenium", level: "Intermediate", percent: 60, sources: ["Capgemini"] },
        { name: "Appium",   level: "Intermediate", percent: 60, sources: ["Capgemini"] },
        { name: "CI/CD (Jenkins)", level: "Intermediate", percent: 60, sources: ["Capgemini"] }        
      ]
    }
  ],

  /* ---------- 4. CERTIFICATIONS ---------- */
  certifications: [
    {
      title: "HTB Certified Defensive Security Analyst (CDSA)",
      issuer: "HackTheBox",
      date: "2025",
      category: "industrial",   // industrial vs learning split
      logo: "🎓",
      logoColor: "#9FE870",
      verifyUrl: "https://www.credly.com/badges/5ba5be32-fcc6-4ddd-8a83-2fd956eab210",
      blurb: "Two critical incident-response scenarios requiring full attack-chain reconstruction (forward & reverse), Splunk SPL queries, Sigma rules, and a structured forensic report. Examiner feedback: \"The way you documented the detection activities was commendable and easy to follow. Your report was nicely structured as well. Well done!\""
    },
    {
      title: "SOC Level 2",
      issuer: "TryHackMe",
      date: "2025",
      category: "learning",   // industrial vs learning split
      logo: "✅",
      logoColor: "#0066B3",
      verifyUrl: "https://tryhackme.com/certificate/THM-IVGFNSN2SK",
      blurb: "This new and improved path builds the defensive skills and hands-on analysis experience that take you to the SOC L2 level. You'll investigate across different domains and explore new areas like threat hunting and detection engineering."
    },
    {
      title: "CompTIA Security+ (SY0-701)",
      issuer: "CompTIA",
      date: "2025",
      category: "industrial",   // industrial vs learning split
      logo: "🛡️",
      logoColor: "#E91E25",
      verifyUrl: "https://www.credly.com/badges/35da50c1-64c2-4839-a076-02c0cdf12ee1",
      blurb: "Global benchmark for foundational cybersecurity skills — threats, vulnerabilities, architecture, operations, incident response, governance."
    },
    {
      title: "SOC Level 1",
      issuer: "TryHackMe",
      date: "2024",
      category: "learning",   // industrial vs learning split
      logo: "✅",
      logoColor: "#0066B3",
      verifyUrl: "https://tryhackme.com/certificate/THM-PSA8JTEKNC",
      blurb: "This path introduces a wide array of essential defensive security topics and real-world analysis scenarios. By completing it, you will gain the knowledge and practical skills needed to become a successful SOC Level 1 Analyst, or to better structure your existing expertise if you are already working in the field."
    },
    {
      title: "CompTIA Network+ (N10-009)",
      issuer: "CompTIA",
      date: "2024",
      category: "industrial",   // industrial vs learning split
      logo: "🌐",
      logoColor: "#0070C0",
      verifyUrl: "https://www.credly.com/badges/289f617b-d7f2-4546-923e-402414077b23",
      blurb: "Network architecture, protocols, operations, security, and troubleshooting — the foundation for protocol-level threat hunting."
    },
    {
      title: "Cyber Security 101",
      issuer: "TryHackMe",
      date: "2024",
      category: "learning",   // industrial vs learning split
      logo: "✅",
      logoColor: "#0066B3",
      verifyUrl: "https://tryhackme.com/certificate/THM-6ND63COVUD",
      blurb: ""
    },
    {
      title: "Google Cybersecurity Professional Certificate",
      issuer: "Google / Coursera",
      date: "2024",
      category: "learning",   // industrial vs learning split
      logo: "🟢",
      logoColor: "#34A853",
      verifyUrl: "https://www.coursera.org/account/accomplishments/professional-cert/25R2PLPWXFVJ",
      blurb: "Foundational SOC analyst skills: SIEM basics, Python for security, Linux, SQL, intrusion detection, incident response."
    },
    {
      title: "ISTQB Certified Tester Foundation Level — Agile Tester (CTFL-AT)",
      issuer: "AT*SQA",
      date: "2024",
      category: "industrial",   // industrial vs learning split
      logo: "✅",
      logoColor: "#0066B3",
      verifyUrl: "https://atsqa.org/certified-testers/profile/9d46a58bb59740188ab21ecebed04202",
      blurb: "Agile testing methodology, ceremonies, and test design — proves my long-standing Agile team experience at Sagemcom & LibertyGlobal."
    },
    {
      title: "ISTQB Certified Tester Foundation Level (CTFL)",
      issuer: "AT*SQA",
      date: "2024",
      category: "industrial",   // industrial vs learning split
      logo: "✅",
      logoColor: "#0066B3",
      verifyUrl: "https://atsqa.org/certified-testers/profile/9d46a58bb59740188ab21ecebed04202",
      blurb: "Foundational software testing principles, test design techniques, test management — anchors my 10-year QA background."
    },
    {
      title: "Jr Penetration Tester",
      issuer: "TryHackMe",
      date: "2023",
      category: "learning",   // industrial vs learning split
      logo: "✅",
      logoColor: "#0066B3",
      verifyUrl: "https://tryhackme.com/certificate/THM-AYYUBWYYQG",
      blurb: "Learn the practical skills required to start your career as a professional penetration tester."
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
      location: "Tunisia",
      period: "2012 — 2016",
      detail: "Final project: Architected and built a JavaFX desktop application that automates end-to-end VPN validation campaigns on Linux gateways, replacing a manual shell-script workflow at Sagemcom. Implemented GUI wizards for 6 VPN protocol stacks (L2TP/IPSec, L2TP/PPP/IPSec, PPPoE/PPP/IP, PPPoE/PPP/IPSec, PPTP, GRE) covering both Site-to-Site and Client-to-Site topologies, and a bidirectional test orchestrator running Ping, iPerf3, traceroute and Wireshark captures on both endpoints. Completed while working full-time."
    },
    {
      degree: "Bachelor's Degree, Industrial Computing",
      school: "Higher Institute of Computer Science",
      location: "Tunisia",
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
    relocation: "Worldwide — sponsorship required",
    remote: "Open to remote / hybrid",
    workAuth: "Tunisian citizen — EU sponsorship required for on-site work"
  }
};

// expose globally
window.RESUME_DATA = RESUME_DATA;
