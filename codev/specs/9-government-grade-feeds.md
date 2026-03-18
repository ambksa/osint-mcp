# Spec 9: Government-Grade OSINT Feeds — Brainstorm

**Date**: 2026-03-18
**Status**: Brainstorm (not yet specified)

## What governments actually use

Based on publicly documented OSINT capabilities of Five Eyes (US IC, UK GCHQ, AU ASD), NATO ACT, EU INTCEN, and open-source intelligence doctrine (NATO OSINT Handbook, DNI Open Source Enterprise):

---

## Tier 1: High Priority (free/cheap, high value, proven in gov use)

### Maritime Domain Awareness

| Feed | Source | Auth | Gov users | Why |
|------|--------|------|-----------|-----|
| **AIS (Automatic Identification System)** | MarineTraffic, VesselFinder, or AISHub | API key (free tiers) | Every navy, coast guard, customs | Vessel tracking — who is where, dark ship detection (AIS off = suspicious) |
| **Lloyd's List Intelligence** | lloydslistintelligence.com | Paid | UK MOD, US ONI, insurers | Port calls, vessel ownership chains, sanctions evasion |
| **Sea-web / IHS Markit** | ihsmarkit.com | Paid | NATO MARCOM | Vessel registry, ownership, flag history |
| **IMO GISIS** | gisis.imo.org | Free (account) | IMO member states | Ship inspections, port state control detentions, casualties |

**Recommendation**: Add AISHub or MarineTraffic free tier for basic vessel tracking. This fills the gap left by the broken `maritime_snapshot` module.

### Sanctions & Financial Intelligence

| Feed | Source | Auth | Gov users | Why |
|------|--------|------|-----------|-----|
| **OpenSanctions** | opensanctions.org | Free bulk | EU INTCEN, compliance teams | Unified dataset: OFAC + EU + UN + UK + 40 more lists. PEPs (Politically Exposed Persons) |
| **UN Security Council Sanctions** | un.org/securitycouncil/sanctions | Scrape/RSS | All member states | The canonical international sanctions list |
| **EU Sanctions Map** | sanctionsmap.eu | Free API | EU member states | EU restrictive measures with legal references |
| **FATF Blacklist/Greylist** | fatf-gafi.org | Scrape | Every central bank | Money laundering/terror financing risk countries |
| **GLEIF (Legal Entity Identifier)** | gleif.org | Free API | Financial regulators | Company ownership chains, UBO (Ultimate Beneficial Owner) |

**Recommendation**: Add OpenSanctions (free, 1M+ entities, better than OFAC alone). Add FATF list (small, high signal).

### Signals Intelligence (SIGINT) — Open Equivalents

| Feed | Source | Auth | Gov users | Why |
|------|--------|------|-----------|-----|
| **Shodan** | shodan.io | Free tier | NSA TAO (open equiv), FBI | Internet-exposed devices, ICS/SCADA, IoT, honeypots |
| **Censys** | censys.io | Free tier | DHS CISA | Certificate transparency, internet-wide scans |
| **GreyNoise** | greynoise.io | Free community | SOC teams | Mass scanner detection — separates targeted attacks from noise |
| **Binary Edge** | binaryedge.io | Free tier | PT gov CERT | Internet exposure, data leaks, vulnerability scanning |
| **ZoomEye** | zoomeye.hk | Free | CN gov equiv | Chinese internet-wide scanner (alternative perspective) |

**Recommendation**: Add Shodan + GreyNoise (free community APIs, enormous value for cyber OSINT).

### Geospatial Intelligence (GEOINT) — Open Equivalents

| Feed | Source | Auth | Gov users | Why |
|------|--------|------|-----------|-----|
| **Sentinel-2** (already have) | Copernicus | Free | EU SatCen, every imagery analyst | 10m resolution, 5-day revisit |
| **Landsat** | USGS | Free | US NGA | 30m resolution, 40+ year archive |
| **FIRMS** (broken) | NASA | Free | Every wildfire agency | Thermal anomaly = fires, but also military activity, industrial events |
| **Planet** | planet.com | Paid | US NGA, UK MOD | Daily 3m imagery (the real game changer) |
| **Maxar Open Data** | maxar.com/open-data | Free (disasters) | US NGA (parent company) | High-res imagery released after disasters |
| **Copernicus EMS** | emergency.copernicus.eu | Free | EU Civil Protection | Post-disaster damage assessment maps |

**Recommendation**: Add Copernicus Emergency Management Service (free, provides actual damage assessment maps after disasters). Fix NASA FIRMS if possible.

### Human Intelligence (HUMINT) — Open Equivalents

| Feed | Source | Auth | Gov users | Why |
|------|--------|------|-----------|-----|
| **Telegram channels** (broken) | Telegram | Relay needed | Every OSINT unit | Primary source for conflict zone reporting, especially UA/RU |
| **Reddit threat subs** | reddit.com/r/... | Free API | Open source analysts | r/geopolitics, r/CredibleDefense, r/LessCredibleDefence |
| **Twitter/X lists** | x.com | API ($) | Every gov OSINT unit | Real-time event detection, faster than news |
| **Liveuamap** | liveuamap.com | Scrape | UA/NATO situation awareness | Crowdsourced conflict mapping |

**Recommendation**: Reddit API is free for small volumes — add r/worldnews + r/geopolitics feeds. High signal.

### Nuclear & WMD Monitoring

| Feed | Source | Auth | Gov users | Why |
|------|--------|------|-----------|-----|
| **CTBTO/IMS** | ctbto.org | Limited | Nuclear treaty states | Seismic/hydroacoustic/infrasound nuclear test detection |
| **IAEA INES** | iaea.org | RSS | Nuclear regulators | International Nuclear Event Scale incidents |
| **RadNet** (broken) | EPA | Free | US EPA, NRC | Radiation monitoring — fix or find alternative |
| **Safecast** (working) | safecast.org | Free | Citizen science | Global radiation sensors |
| **European Radiological Data Exchange** | eurdep.jrc.ec.europa.eu | Free | EU member states | European radiation monitoring network |

**Recommendation**: Add EURDEP (European radiation, complements Safecast) and IAEA INES RSS.

### Economic Intelligence

| Feed | Source | Auth | Gov users | Why |
|------|--------|------|-----------|-----|
| **FRED** (have, needs key) | stlouisfed.org | Free key | Every central bank | US economic indicators |
| **BIS** (working) | bis.org | Free | Central banks | Policy rates, FX, credit |
| **WTO Trade Monitoring** | wto.org | Scrape | Trade ministries | Trade restriction alerts |
| **Kpler** | kpler.com | Paid | Energy ministries | Oil/gas tanker tracking + commodity flows |
| **Refinitiv Eikon** | refinitiv.com | Paid | Finance ministries | Real-time market + news terminal |
| **Global Trade Alert** | globaltradealert.org | Free | Trade negotiators | Trade policy interventions database |

**Recommendation**: Add Global Trade Alert (free, replaces broken WTO trade modules).

---

## Tier 2: Medium Priority (some auth needed, high value)

### Cyber Threat Intelligence

| Feed | Source | Auth | Gov users |
|------|--------|------|-----------|
| **AlienVault OTX** | otx.alienvault.com | Free key | SOC teams worldwide |
| **AbuseIPDB** | abuseipdb.com | Free key | CERTs |
| **VirusTotal** | virustotal.com | Free key (4/min) | Every malware analyst |
| **MITRE ATT&CK** | attack.mitre.org | Free JSON | Every CTI team |
| **Shadowserver** | shadowserver.org | Free (gov/CERT) | 175+ national CERTs |
| **Have I Been Pwned** | haveibeenpwned.com | $3.50/mo | Credential monitoring |
| **PhishTank** | phishtank.org | Free API | Anti-phishing teams |
| **MalwareBazaar** | bazaar.abuse.ch | Free | Malware sample sharing |

### Diplomatic & Political

| Feed | Source | Auth | Gov users |
|------|--------|------|-----------|
| **UN Digital Library** | digitallibrary.un.org | Free | All member states |
| **EU Council decisions** | consilium.europa.eu | RSS | EU member states |
| **Congressional Research Service** | crsreports.congress.gov | Free | US Congress |
| **SIPRI Arms Transfers** | sipri.org | Free DB | Arms control analysts |
| **ACAPS Crisis Insights** | acaps.org | Free | Humanitarian responders |
| **ICG CrisisWatch** | crisisgroup.org | Free | Conflict prevention |

### Transportation & Infrastructure

| Feed | Source | Auth | Gov users |
|------|--------|------|-----------|
| **Eurocontrol NM** | eurocontrol.int | Account | European ATC |
| **NOTAMs** | FAA/ICAO | Free/Paid | Every aviation authority |
| **Port congestion** | MarineTraffic | API key | Port authorities |
| **Rail disruptions** | national rail APIs | Free | Transport ministries |
| **Pipeline incidents** | PHMSA (US) | Free | Energy regulators |

---

## Tier 3: Nice to Have (specialized)

| Feed | Domain | Source | Notes |
|------|--------|--------|-------|
| ACARS/VDL2 messages | Aviation | airframes.io | Needs feeder station or paid API |
| Dark web monitoring | Cyber | Various | Tor scraping, specialized |
| Satellite RF detection | SIGINT | HawkEye 360 | Commercial RF geolocation |
| Synthetic aperture radar | GEOINT | Capella Space | See through clouds/night |
| Election monitoring | Political | OSCE/ODIHR | Free reports |
| Food price monitoring | Humanitarian | WFP VAM | Free API |
| Climate projection | Environmental | IPCC/Copernicus C3S | Free |

---

## Recommended Implementation Order

**Phase 1 — Free, no auth, drop-in plugins** (Spec 5):
1. URLhaus
2. NVD/CVE
3. Tor exit nodes
4. Space weather
5. IODA outages

**Phase 2 — Free with API key registration**:
6. OpenSanctions (bulk download, no key needed actually)
7. Shodan (free tier: 100 queries/mo)
8. GreyNoise (free community: 50/day)
9. AlienVault OTX (free key)
10. Global Trade Alert (free)

**Phase 3 — Scrape/RSS additions**:
11. FATF blacklist/greylist
12. IAEA INES nuclear events
13. EURDEP radiation
14. Copernicus EMS disaster maps
15. NOTAMs (FAA API)
16. UN Security Council sanctions RSS
17. Reddit geopolitical feeds

**Phase 4 — Paid/specialized** (if budget allows):
18. MarineTraffic AIS
19. Planet imagery
20. SIPRI arms transfers DB

---

## What we already have vs government capability

| Gov Capability | Our Coverage | Gap |
|---------------|-------------|-----|
| **Conflict tracking** | Broken (ACLED dead) | Need alternative conflict feed |
| **Maritime domain** | Broken (AIS dead) | Need AIS provider |
| **Aircraft tracking** | STRONG (ADSB.fi unfiltered) | Better than most gov OSINT |
| **Cyber threat intel** | Good (CISA, ThreatFox, ransomware) | Add Shodan, OTX, GreyNoise |
| **Sanctions** | Good (OFAC) | Add OpenSanctions for global |
| **Natural disasters** | STRONG (USGS, GDACS, EONET, NWS) | Best-in-class |
| **Economic intel** | Good (BIS, FRED, World Bank, IMF) | Working, some need keys |
| **Nuclear monitoring** | Partial (Safecast only) | Add EURDEP, IAEA |
| **Geospatial** | Basic (Sentinel-2 search) | Planet would be game-changer |
| **News/media monitoring** | STRONG (198 items, 15+ feeds) | Already excellent |
| **Travel/diplomatic** | Good (State Dept, FCDO, embassy) | Working |
| **Trade intelligence** | Broken (WTO modules dead) | Add Global Trade Alert |
| **Prediction markets** | Broken (Polymarket dead) | Low priority |
| **Social media OSINT** | None | Add Reddit, would need X API |
