# Bikram Sambat month lengths: sources, library audit, and a design for punji-ui

Research date: 2026-11-07 (BS 2083 Kartik 21). No repo edits were made. Every number below was fetched or computed during this session. Anything not verified is marked **UNVERIFIED**.

**Status:** PR 1 of 4 landed (own table in `src/nepal/bs-data.ts` and pure converter; the dependency remains only for a temporary parity test, removal is PR 4). `proposed-table.json` and `.csv` now match the shipped table for 2096 (the valid 366-day variant 31,32,31,32,31,30,30,30,29,29,30,31; the 5-source variant summed to 364 and was rejected). PR 2 of 4 adds the provenance API (`toBS`, `toAD`, `bsDateStatus`) and the `projected` flag on fiscal periods.

Working files (all in ``):
- `data/all.json`, `data/all-tables.csv`: every month-length table extracted (12 library tables and 2 scraped web calendars).
- `data/disagree-1970-1999.txt`, `data/disagree-2000-2083.txt`, `data/disagree-2084-2100.txt`: every year where any two sources differ.
- `data/proposed-table.json`, `data/proposed-table.csv`: the proposed table with per-year status.
- `scripts/`: the extraction, diff, and Rajpatra-derivation scripts (`extract.mjs`, `addpy.mjs`, `hp.py`, `r32.py`, `build_web.py`, `years.mjs`, `matrix.mjs`, `sat.py`, `propose.mjs`, `anchor.mjs`).
- `web/moha/h2080.pdf` to `h2083.pdf`: the four Nepal Rajpatra holiday notices.

---

## 0. Summary

- **Who decides.** The Nepal Panchanga Nirnayak Bikas Samiti (नेपाल पञ्चाङ्ग निर्णायक विकास समिति) approves each year's panchang and wall calendars. It was constituted under a 2077 BS formation order and sits under the Ministry of Culture, Tourism and Civil Aviation. Calendar makers submit their calculations, the Samiti checks them, and it normally approves next year's calendar by the end of Poush (mid-January). That is about three months before Baisakh 1. Official month lengths therefore exist for **the current year, plus the next year from about January to March**. Every later year in any library is a projection.
- **Primary source we can actually use.** The Samiti does not publish a machine-readable table. Each year, though, the Home Ministry (गृह मन्त्रालय) publishes the next year's public-holiday notice in **Nepal Rajpatra Part 5**. That notice lists **every Saturday of every month** and names the weekday of Baisakh 1. Those two facts are enough to determine all 12 month lengths exactly. I transcribed the 2080, 2081, 2082 and 2083 notices and derived the lengths.
- **Range verified against a primary source:** BS **2080 Baisakh 1 to 2083 Falgun 30**, which is 2023-04-14 to 2027-03-14 AD. 2083 Chaitra (30 days) is cross-checked but not yet primary; the 2084 notice, expected around Falgun 2083 (Feb–Mar 2027), will confirm it.
- **Range cross-checked by at least two independent sources:** BS **2000 to 2079**. Here Hamro Patro and nepalicalendar.rat32.com, both scraped, agree with the library consensus in every year except **2062** (Baisakh and Jestha disputed) and **2055** (rat32 alone differs on Magh and Falgun). For **1990–1999** only one web source exists (rat32), and **1991** is disputed. For **1975–1989** there is library consensus only, with disputes in 1975, 1977, 1981 and 1989.
- **`@remotemerge/nepali-date-converter` (pinned 1.2.5; the latest, 1.2.7, has an identical table):**
  - Its table cites no source, and 112 of its 125 year rows are written as aliases of other years (`years[2084] = years[1976]`).
  - It matches the primary data for 2080–2083 and the consensus for 2000–2079.
  - It is the odd one out in **1977, 1981 and 1998**; in all three it is the sole dissenter against every other source covering that year.
  - It is on the minority side of the 1991 split (3 sources against 4).
  - Its **2084–2099** rows are copies of 1975–2000 rows and disagree with every web calendar: 119 of 192 month starts differ from Hamro Patro, by up to 2 days.
  - It gives no signal that 2084+ is projected.
- **Recommendation:**
  - Drop the dependency.
  - Ship our own versioned table with month-level provenance (`official` / `cross-checked` / `unverified` / `projected`) and a pure day-count converter.
  - The API should return provenance with every conversion and, by option, throw or return null instead of quietly returning projected dates.
  - Components show "projected" for future dates and fiscal-year bounds.
  - Update the table each year from the Rajpatra holiday notice. The steps, migration plan and tests are in section 5.

---

## 1. How BS month lengths are determined and published

### 1.1 Rule

- The Nepali BS calendar is the **solar** form of Vikram Samvat. Wikipedia: "in Nepal the solar version of Vikram Samvat is a civil calendar for general usage". The Rana government made it official in 1901 CE. Source: https://en.wikipedia.org/wiki/Vikram_Samvat
- Each month begins with the sun's entry into the next sidereal sign (sankranti). Because of that, months run 29–32 days and change from year to year. There is no closed formula; the lengths come from an astronomical computation (siddhanta) and from the Samiti's rulings.
  - **UNVERIFIED in a primary source:** the exact sunrise rule the Samiti uses to assign a sankranti to a civil day. I found no Samiti document stating it.
- In Bhadra 2083 the Samiti instructed panchang makers to compute the panchang section by the **सौरोक्त (Saurokta) method** and other planets by the केतकीय (Ketakiya) method. It added that "विसं २०८३ को पात्रोसमेत यही पद्धतिबाट स्वीकृति दिइएको छ" (the 2083 calendar was also approved this way). Source: Radio Nepal, 2026-09-11, https://radionepalonline.com/2026/09/11/734283.html (same story: https://www.ratopati.com/story/591556/calendar-decision-development-committee-calls-on-those-who-want-to-publish-calendars)

### 1.2 Authority

- **Nepal Panchanga Nirnayak Bikas Samiti.** Its formation order is listed by the Nepal Law Commission as "नेपाल पञ्चाङ्ग निर्णायक विकास समिति (गठन) आदेश, २०७७": https://lawcommission.gov.np/content/12400/12400-nepal-panchang-adjudicatory-de/
  - I could not download the order's full text; the PDF link returned HTML. Its legal basis (Development Committee Act 2013 BS, section 3) and cabinet approval date (2077 Poush 20) come only from search snippets and are **UNVERIFIED**.
- Under the 2077 order, the Samiti checks the calculations of panchangs, wall calendars and pocket calendars and grants permission to publish them. It also decides tithi, muhurta, eclipses and festival dates, and supplies festival data to the government. Source: Ratopati/RSS, 2082 Mangsir 22 (2025-12-08), https://www.ratopati.com/story/528868/process-of-approving-2083-bs-calendar-blocked-in-panchanga-selection-committee
- The supervising ministry is Culture, Tourism and Civil Aviation (same Ratopati article).
- In Sep 2026 the Samiti said it may act against almanacs whose festival dates differ and cause confusion. Wall-calendar printers need prior approval. Source: the Radio Nepal link above.

### 1.3 Publication cadence and lead time

| Step | When | Source |
|---|---|---|
| Samiti calls for next year's calculations (for 2084: due by Asoj 20, 2083 ≈ 2026-10-06; new makers submit 3 years, 2084–2086) | about 6 months before Baisakh 1 | Radio Nepal, 2026-09-11 |
| Samiti verifies and approves (normally "पुस मसान्तसम्म", by the end of Poush ≈ mid-January); calendars on sale from the first week of Magh | about 3 months before Baisakh 1 | Ratopati, 2025-12-08 |
| 2083 approval was **delayed** because there was no executive director for 5 months; the 2083 calendar was reported published on 2082 Falgun 2 (≈ 2026-02-14) | late | Ratopati above; Everest Dainik, https://everestdainik.com/news/2083-calendar-released--when-is-dasain-and/ |
| Home Ministry's next-year holiday notice in Rajpatra Part 5 | Chaitra 2, 2079 / Magh 29, 2080 / Falgun 15, 2081 / Falgun 18, 2082 | the PDFs, section 2.1 |
| Older timing example: "BS 2076 calendar will be available in market by February first week" | | https://english.onlinekhabar.com/authority-bs-2076-calendar-will-be-available-in-market-by-february-first-week.html (headline only, via the tag page https://english.onlinekhabar.com/tag/nepal-panchanga-nirnayak-samiti) |

**How far ahead years are fixed:** at most one year beyond the current one, and only from about January to March. Today (2083 Kartik) the official horizon is 2083 Chaitra end. The 2084 calendar is not yet approved; it is expected around Poush–Falgun 2083 (Jan–Mar 2027).

> Consequence for punji-ui: the **current fiscal year 2083/84 ends on Asar-end 2084, which is a projected date today.** Both projection families happen to give the same 2084 Shrawan 1 (2027-07-17), because Baisakh + Jestha + Asar total 94 days in both. That agreement is a coincidence of the projections, not a verified fact.

### 1.4 History of discrepancies and corrections (verified examples)

- **2081 Jestha/Asar dispute (subeshb1/Nepali-Date PR #47, June 2023 to Mar 2024).** https://github.com/subeshb1/Nepali-Date/issues/47
  - Before the 2081 calendar was fixed, published calendars disagreed. Some showed Jestha 31 / Asar 32 (the maintainer cited Hamro Patro and rat32 at the time); others showed Jestha 32 / Asar 31 (nepalipatro.com.np, ashesh.com.np).
  - The library later also corrected 2081 Falgun 30→29 and Chaitra 30→31.
  - The Rajpatra notice settles it: **2081 = Jestha 32, Asar 31, Falgun 29, Chaitra 31** (section 2.1). This is a textbook case of a projection being revised once the official calendar appeared.
- **binodnepali/react-nepali-datetime-picker #15 and #13 (2024–2026).** https://github.com/binodnepali/react-nepali-datetime-picker/issues/15
  - The maintainer hand-patched 2080 and 2081 from Hamro Patro and called hardcoded tables a recurring problem.
  - The issue was closed in Jul 2026, citing a planned `refresh-calendar-data.yml` pipeline. **UNVERIFIED** whether that pipeline exists.
- **leapfrogtechnology/nepali-date-picker 2.0.2.** Its decoder contains hardcoded special cases for 2081 (months 2, 3, 11, 12), 2085 (month 5) and 2088 (month 5). These are after-the-fact patches over an encoded table. The text is in `pkgs/nepali-date-picker-2.0.2/package/dist/nepaliDatePicker.min.js`, `getBsMonthDays`.
- **ad-bs-converter 0.5.0 (last published 2022).** Still carries the old 2081–2083 projections; it is wrong against the Rajpatra in 2081 (4 months), 2082 (6) and 2083 (6).
- A dhis2 mailing-list item (2014) about replacing 2081–2083 arrays appeared in search results only and was not opened: https://archive.lists.launchpad.net/dhis2-devs/msg31972.html — **UNVERIFIED**.

---

## 2. Primary and secondary data sources

### 2.1 Primary: Nepal Rajpatra Part 5, Home Ministry public-holiday notices (used)

The notices are indexed at https://aaosanku.moha.gov.np/archive under the menu "बिदा". All four are scanned images: no text layer, so I read them visually.

| BS year | Rajpatra | Notice date | Page | PDF |
|---|---|---|---|---|
| 2080 | खण्ड ७२ संख्या ६५ भाग ५ | 2079-12-02 | https://aaosanku.moha.gov.np/page/public-holidays-for-2080 | `/upload/e66443e81e8cc9c4fa5c099a1fb1bb87/files/२०८०_साल_भरिको_सार्वजनिक_विदा_संम्वन्धी_(६५)(1).pdf` |
| 2081 | खण्ड ७३ संख्या ५४ भाग ५ | 2080-10-29 | https://aaosanku.moha.gov.np/page/government-and-public-holidays-in-2081 | `…/२०८१_सालको_सरकारी_तथा_सार्वजनिक_विदा_(५४_१०_२९)(1).pdf` |
| 2082 | खण्ड ७४ संख्या ५९ भाग ५ | 2081-11-15 | https://aaosanku.moha.gov.np/page/government-and-public-holidays-in-2082 | `…/२०८२_सालको_सार्वजनिक_बिदा_सम्बन्धी.pdf` |
| 2083 | खण्ड ७५ संख्या ६७ भाग ५ | 2082-11-18 | https://aaosanku.moha.gov.np/page/government-and-public-holidays-in-2083 | `…/२०८३_सालको_सार्वजनिक_विदा_(67_11_18).pdf` |

**Method.** Each notice's section 1, "वर्षभरिका शनिबार बिदा", lists all Saturdays of each month; section 2.1(क) gives the weekday of Baisakh 1.
- For months 1–11: length(m) = last Saturday(m) + 7 − first Saturday(m+1).
- For Chaitra: the last Saturday of Chaitra plus the gap to the next year's Baisakh 1 weekday, which needs the next year's notice.
- The script is `scripts/sat.py`. It asserts that consecutive Saturdays are exactly 7 days apart and that the Baisakh 1 weekday matches.

Transcribed Saturdays (Devanagari numerals read from the scans):

| Month | 2080 | 2081 | 2082 | 2083 |
|---|---|---|---|---|
| Baisakh | 2,9,16,23,30 | 1,8,15,22,29 | 6,13,20,27 | 5,12,19,26 |
| Jestha | 6,13,20,27 | 5,12,19,26 | 3,10,17,24,31 | 2,9,16,23,30 |
| Asar | 2,9,16,23,30 | 1,8,15,22,29 | 7,14,21,28 | 6,13,20,27 |
| Shrawan | 6,13,20,27 | 5,12,19,26 | 3,10,17,24,31 | 2,9,16,23,30 |
| Bhadra | 2,9,16,23,30 | 1,8,15,22,29 | 7,14,21,28 | 6,13,20,27 |
| Ashwin | 6,13,20,27 | 5,12,19,26 | 4,11,18,25 | 3,10,17,24,31 |
| Kartik | 4,11,18,25 | 3,10,17,24 | 1,8,15,22,29 | 7,14,21,28 |
| Mangsir | 2,9,16,23,30 | 1,8,15,22,29 | 6,13,20,27 | 5,12,19,26 |
| Poush | 7,14,21,28 | 6,13,20,27 | 5,12,19,26 | 4,11,18,25 |
| Magh | 6,13,20,27 | 5,12,19,26 | 3,10,17,24 | 2,9,16,23 |
| Falgun | 5,12,19,26 | 3,10,17,24 | 2,9,16,23,30 | 1,8,15,22,29 |
| Chaitra | 3,10,17,24 | 2,9,16,23,30 | 7,14,21,28 | 6,13,20,27 |
| Baisakh 1 weekday | Friday | Saturday | Monday | Tuesday |

**Derived month lengths (primary):**

| BS | Bai | Jes | Asa | Shr | Bha | Asw | Kar | Man | Pou | Mag | Fal | Cha | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2080 | 31 | 32 | 31 | 32 | 31 | 30 | 30 | 30 | 29 | 29 | 30 | 30 | 365 |
| 2081 | 31 | 32 | 31 | 32 | 31 | 30 | 30 | 30 | 29 | 30 | 29 | 31 | 366 |
| 2082 | 31 | 31 | 32 | 31 | 31 | 31 | 30 | 29 | 30 | 29 | 30 | 30 | 365 |
| 2083 | 31 | 31 | 32 | 31 | 31 | 31 | 30 | 29 | 30 | 29 | 30 | (30)* | 365* |

\* 2083 Chaitra is at least 27 from the notice. 30 is the value in every web and library source; it becomes primary once the 2084 notice gives the weekday of 2084 Baisakh 1.

**AD anchors in the same notices.** Each notice dates Christmas (डिसेम्बर २५):
- 2080 Poush 9, Monday = 2023-12-25
- 2081 Poush 10, Wednesday = 2024-12-25
- 2082 Poush 10, Thursday = 2025-12-25
- 2083 Poush 10, Friday = 2026-12-25

Each weekday was checked against the Gregorian calendar, and each matches remotemerge, Hamro Patro and the derived table. Baisakh 1 for 2080, 2081, 2082 and 2083 = 2023-04-14, 2024-04-13, 2025-04-14 and 2026-04-14 respectively; the weekdays printed in the notices match.

Fixed-date holidays in the notices give further anchors. In 2083 these are Asoj 25 Ghatasthapana (Sunday), Asoj 31 to Kartik 6 Dashain, and Kartik 22–26 Tihar.

**Older notices.** Rajpatra notices for older years are expected at https://rajpatra.dop.gov.np. I did **not** retrieve any; the 2079 and earlier notices are a follow-up. This same method could make 2062 and earlier disputed years primary-verified.

### 2.2 Other primary or semi-primary sources (not used as data)

- **The Samiti's approved panchang.** It is printed and sold as a book; I found no online table. Festival lists reach the press (for example Everest Dainik above) but give no month lengths.
- **The Samiti website.** None located. **UNVERIFIED** whether one exists.
- **Nepal Rastra Bank calendars and publications.** Not checked; **UNVERIFIED**.
- **Fiscal-year law.**
  - Income Tax Act 2058 defines "income-year" as the start of Shrawan to the end of Ashad. Search snippet only; the act PDF is linked at https://nepalindata.com/media/resources/items/0/bINCOME_TAX_ACT_2000.pdf but I did not open it.
  - The Financial Procedures and Fiscal Responsibility Act 2076 defines the fiscal year as starting 1 Shrawan. Snippet only, **UNVERIFIED** in full text: https://shisiradhikari.com.np/storage/uploads/Financial%20Procedures%20Fiscal%20Responsibility%20Act,%202076.pdf

### 2.3 Secondary sources (scraped and diffed)

| Source | Coverage I fetched | How | Notes |
|---|---|---|---|
| **Hamro Patro**, https://www.hamropatro.com/calendar/{y}/{m}/ | BS 2000–2100 (pre-2000 returns 404) | 404 month pages; each page embeds day records (`year_ad, month_ad, day_ad, year_bs, month_bs, day_bs`); lengths are differences between consecutive month-start AD dates | Shows years up to 2100, so years after 2083/84 are its own projections. **Its 2087 sums to 367 days and its 2096 (and others' 2096) to 364**, both impossible for a solar year, which proves those rows are unreliable. |
| **nepalicalendar.rat32.com** /{y}/{month} | BS 1990–2100 | Grid parsed; month length = largest BS day, including the cells that wrap into the first row | Claims "Based on Ministry of Information" (**UNVERIFIED**). Cited in PR #47. |
| **Nepali Patro** (nepalipatro.com.np) | not obtained | It is a single-page app; data is loaded through an API I did not reverse-engineer | Treated as official by some developers (PR #47); no evidence it is official. |
| ashesh.com.np | not fetched | | Cited in PR #47. |

**Which BS years are verified:**

- **Primary (Rajpatra):** 2080, 2081, 2082 in full; 2083 Baisakh–Falgun.
- **Two independent web calendars plus the library consensus agree:** 2000–2054, 2056–2061, 2063–2079 (77 years).
- **2055:** Hamro Patro and 11 libraries say Magh 29 / Falgun 30. rat32 alone has Magh 30 / Falgun 29. Treat as cross-checked, with a note.
- **2062 (disputed):**
  - 10 sources (all libraries except the PyPI one, plus rat32) say 30,32,… : Baisakh 30, Jestha 32, so Jestha 1 = 2005-05-14 (Saturday).
  - Hamro Patro and PyPI `nepali-datetime` say Baisakh 31, Jestha 31, so Jestha 1 = 2005-05-15.
  - A vedicmarga.com panchang page also implies 2005-05-14, but it is computed, not official: https://vedicmarga.com/hindu-calendar/2005/05/
  - Needs the 2062 Rajpatra notice.
- **1990, 1992–1999:** rat32 plus libraries (one web source).
  - 1998: rat32 and 5 libraries outvote remotemerge, which is the only dissenter.
  - **1991 disputed:** 4 sources (bikram-sambat, ad-bs-converter, sbmdkl, rat32) against 3 (remotemerge, nepali-date-library, PyPI nepali-datetime).
- **1975–1989:** libraries only, which largely copy each other.
  - Disputed: 1975 (bikram-sambat alone differs), 1977 (three variants), 1981 (remotemerge alone differs), 1989 (PyPI alone differs).
- **2084+:** projections only. No source can be verified.

---

## 3. Libraries: range, provenance, licence, maintenance, and the diff

Raw tables were extracted from the published packages without running their code, except for two cases:
- leapfrog's decoder function, run in a `vm` sandbox;
- remotemerge, whose own conversion API was used to derive lengths, because its table is aliased.

The PyPI `nepali-datetime` table is from GitHub `master` (`nepali_datetime/data/calendar_bs.csv`), not from the 1.0.8.5 wheel.

| Package | Version checked | BS range | Licence | Last activity | Data provenance stated? |
|---|---|---|---|---|---|
| `@remotemerge/nepali-date-converter` (npm) | 1.2.5 pinned; 1.2.7 latest (identical table) | 1975–2099 | MIT | repo pushed 2026-10-31; 1.2.7 published 2026-10-31 | **No.** `src/years.ts` header says only "The Nepali calendar data from 1975 BS to 2099 BS"; 112 of 125 year rows are aliases of other years. https://github.com/remotemerge/nepali-date-converter |
| `bikram-sambat` (npm, medic) | 1.8.1 | 1970–2090 | Apache-2.0 | npm modified 2026-09-25 | No; bit-packed `ENCODED_MONTH_LENGTHS` |
| `nepali-date-converter` (npm, subeshb1) | 3.4.2 | 2000–2090 | MIT | npm modified 2026-10-29 | No; has a public correction history (PR #47) |
| `ad-bs-converter` (npm, techgaun) | 0.5.0 | 1978–2100 | ISC | 2022-06 (stale) | No |
| `nepali-date` (npm, sharingapples) | 0.1.4 | 2000–2088 | MIT | npm modified 2026-10-26 | No |
| `nepali-date-library` (npm) | 1.1.16 | 1976–2100 | MIT | 2026-08-11 | No |
| `nepali-datetime` (npm, opensource-nepal) | 2.0.0 | 2000–2099 | **GPL-3.0** | 2026-04-11 | No |
| `@sbmdkl/nepali-date-converter` (npm) | 2.0.5 | 1978–2099 | MIT | 2026-05-02 | No |
| `nepali-date-picker` (npm, leapfrog) | 2.0.2 | 1970–2100 | ISC | 2024-06-03 | No; run-length-encoded data plus hardcoded patches |
| `nepali-datetime` (PyPI, amitgaru) | CSV from GitHub master | 1975–2100 | PyPI says MIT; the GitHub API reports **Apache-2.0** (inconsistent) | repo pushed 2026-05-08; 1.0.8.5 uploaded 2026-05-07 | No |
| `nepali` (PyPI, opensource-nepal/py-nepali) | `main` | 2000–2099 | MIT | 1.2.0 uploaded 2026-02-02; repo pushed 2026-07-26 | Reference date 2000-01-01 BS = 1943-04-14 AD; no data source |

All libraries that cover 2000 use the same epoch, 2000-01-01 BS = 1943-04-14 AD. Within 1975–2099, every remotemerge month-start date for 2000–2083 equals Hamro Patro's, except 2062 Jestha 1 (`scripts/anchor.mjs`).

### 3.1 Every disagreement (the leapfrog picker is listed separately)

Format: year: month values for Baisakh…Chaitra = year total ← sources. "RM" = remotemerge 1.2.5 and 1.2.7. The full lists are in `data/disagree-*.txt`.

**1975–1999**
- **1975:** 31,31,32,32,**31,30**,30,29,30,29,30,30 ← RM, PyPI nepali-datetime | 31,31,32,32,**30,31**,… ← bikram-sambat
- **1977:** three variants.
  - 30,32,31,32,31,**31,29,30,30,29,29**,31 ← RM
  - …,31,**30,30,30,29,30,29**,31 ← bikram-sambat, PyPI nepali-datetime
  - …,**31,29,30,29,30,29**,31 ← nepali-date-library
- **1981:** …,29,30,30,29,**29,31** ← RM only | …,**30,30** ← bikram-sambat, ad-bs-converter, nepali-date-library, sbmdkl, PyPI nepali-datetime
- **1989:** …,**30,29**,30,29,30,30 ← RM, bikram-sambat, ad-bs, nepali-date-library, sbmdkl | **29,30,30**,29,30,30 ← PyPI nepali-datetime only
- **1991:** 31,32,31,32,31,30,30,**30,29,29**,30,30 ← RM, nepali-date-library, PyPI nepali-datetime | …,**29,30,29**,… ← bikram-sambat, ad-bs, sbmdkl, rat32
- **1993:** 31,31,31,32,… ← RM and 5 others plus rat32 | 31,31,**32,31**,… ← PyPI nepali-datetime only
- **1998:** 31,31,32,31,**32,30**,… ← RM only | …,**31,31**,… ← bikram-sambat, ad-bs, nepali-date-library, sbmdkl, PyPI nepali-datetime, rat32

**2000–2083**
- **2055:** Magh/Falgun 29/30 ← all 12 tables and Hamro Patro | 30/29 ← rat32 only
- **2062:** 30,32,… ← 10 sources (including RM and rat32) | 31,31,… ← Hamro Patro, PyPI nepali-datetime
- **2081:** official 31,32,31,32,31,30,30,30,29,30,29,31 ← every library except ad-bs-converter; both web sources; **Rajpatra** | ad-bs-converter: 31,31,32,32,31,30,30,30,29,30,30,30 (wrong)
- **2082:** official 31,31,32,31,31,31,30,29,30,29,30,30 ← all except ad-bs-converter and the leapfrog picker; **Rajpatra** | those two: 30,32,31,32,31,30,30,30,29,30,30,30 (wrong)
- **2083:** official ← all except ad-bs-converter and leapfrog (31,31,32,31,31,30,30,30,29,30,30,30; wrong)

**2084–2100 (projections; there are two families)**
- **Family A: remotemerge, npm nepali-datetime (GPL), py-nepali, and mostly nepali-date-library.** These are copies of earlier rows; remotemerge literally aliases `2084=1976`, `2085=2000`, `2086=1978`, `2087=1975`, and so on.
- **Family B: bikram-sambat, subeshb1, sbmdkl, nepali-date, ad-bs-converter, PyPI nepali-datetime, rat32, Hamro Patro, leapfrog.** rat32 and PyPI nepali-datetime are **identical** for 2084–2100. Hamro Patro differs from them only in 2087 (367 days) and 2097.
- Disagreements between the families in every year from 2084 to 2099:

| Year | Family A (RM) | Family B (rat32 / PyPI) |
|---|---|---|
| 2084 | 31,32,31,32,31,30,30,30,29,29,30,31 = 366 | 31,31,32,31,31,30,30,30,29,30,30,30 = 365 |
| 2085 | 30,32,31,32,31,30,30,30,29,30,29,31 | 31,32,31,32,30,31,30,30,29,30,30,30 = 366 |
| 2086 | 31,31,32,31,31,31,30,29,30,29,30,30 | 30,32,31,32,31,30,30,30,29,30,30,30 |
| 2087 | 31,31,32,32,31,30,30,29,30,29,30,30 | 31,31,32,31,31,31,30,29,30,30,30,30 = 366 (HP has 367) |
| 2088 | 31,32,31,32,31,30,30,30,29,29,30,31 = 366 | 30,31,32,32,30,31,30,30,29,30,30,30 |
| 2089 | 30,32,31,32,31,30,30,30,29,30,29,31 | 30,32,31,32,31,30,30,30,29,30,30,30 |
| 2090–2099 | (see file) | (see file) |

- Drift of remotemerge against Hamro Patro over 2084–2099: 119 of 192 month starts differ, by up to 2 days.
- Against PyPI / rat32: 63 of 192 differ, by up to 1 day.

**leapfrog nepali-date-picker 2.0.2**
- Decoding it with its own `getBsMonthDays` gives 1971–1998 rows that match no other source; they look shifted by one year.
- Its 2082 and 2083 rows are wrong against the Rajpatra.
- It also carries hardcoded patches for 2081, 2085 and 2088.
- **UNVERIFIED** whether its UI uses another code path. Do not use it as a reference.

### 3.2 Pairwise disagreement counts (months), BS 2000–2079
Every pair of sources has 0 disagreements, except pairs involving PyPI nepali-datetime or Hamro Patro (2062: 2 months) and rat32 (2055: 2 months). See `scripts/matrix.mjs`.

---

## 4. `@remotemerge/nepali-date-converter` and every place punji-ui uses it

### 4.1 What the package contains
- **Version and licence:** v1.2.5, pinned in `package.json` as `"@remotemerge/nepali-date-converter": "1.2.5"` and enforced at that version by `scripts/check-source.mjs`. Latest is 1.2.7, published 2026-10-31, with an identical table. MIT, © 2026 Madan Sapkota.
- **Range and behaviour:** BS 1975-01-01 to 2099-12-30 (AD 1918-04-13 to 2043-04-13). It throws `The input date is out of supported range.` for out-of-range or nonexistent dates; for example, 2081-02-33 and 2081-01-32 throw. It has no projected or official distinction and **no data source**.
- **Known errors:**
  1. It is the only dissenter in 1977, 1981 and 1998, against every other source covering those years (rat32 covers 1998).
  2. It is on the minority side of the disputed 1991.
  3. Its 2084–2099 rows are aliases of 1975–2000 rows that disagree with every web calendar.
  4. Its README says dates outside the range "throw rather than return an estimate", which is misleading, because its in-range future years are themselves estimates.
- **Correct where it matters most:** it matches the primary data for 2080–2083 and the cross-checked consensus for 2000–2079, including 2062, where it sides with the majority.

### 4.2 Every usage in punji-ui (`src/`, excluding tests and stories)

**Wrapper (the only import of the package):** `src/nepal/calendar.ts`
- `gregorianToBS`, `bsToGregorian`
- `formatBSDate`, which validates through `bsToGregorian`
- `nepalFiscalYear`, `getNepalFiscalPeriod`
- `BS_SUPPORTED_RANGE` (1975-01-01 to 2099-12-30)
- `instantToNepalDate`, which is Intl-only and does not use the package

It is re-exported by `src/nepal/nepal.ts` and published as the `./nepal/calendar` and `./nepal` subpaths in `package.json`.

**Callers:**

| File | Use | Future dates? |
|---|---|---|
| `src/calendar/calendarMath.ts` | `displayParts` and `storageDate` use the converter. `monthLength()` probes days 32 down to 28 with try/catch against the converter. `calendarLimits()` returns 1918-04-13 to 2043-04-13 and re-exports `BS_SUPPORTED_RANGE`. | yes: the Calendar can browse to 2099 |
| `src/calendar/Calendar.tsx` | uses calendarMath, and `instantToNepalDate` for today | yes |
| `src/date-picker/DatePicker.tsx`, `DatePickerPanel.tsx` | `calendarLimits`, `displayParts`, `parseDateInput` (BS typed input) | yes (due dates) |
| `src/internal/dualDate.tsx` | `dualDateText` / `DualDate`; BS text, or null if out of range | depends on the caller |
| ↳ `src/issue-card/IssueCard.tsx` | open and close dates | **yes** |
| ↳ `src/corporate-action-timeline/CorporateActionTimeline.tsx` (the "Timeline") | book-close, listing and credit dates, marked upcoming | **yes** |
| ↳ `src/demat-account-card/DematAccountCard.tsx` | expiry date | **yes** |
| ↳ `src/edis-confirmation/EdisConfirmation.tsx` | transfer dates | mostly past or near |
| ↳ `src/article/Article.tsx` (`dualDateText`) | event dates | either |
| ↳ `src/allotment-checker/AllotmentChecker.tsx`, `src/apply-issue-form/ApplyIssueForm.tsx` | through DualDate | near future |
| `src/date-range-presets/nepal.ts` | `nepalFiscalYearToDate`, previous FY, BS month starts (`getNepalFiscalPeriod`, `bsToGregorian`) | **FY end is projected today** |
| `src/period-selector/periods.ts` (feeds `FinancialPeriodSelector`) | `nepalFiscalYearPeriods`, BS month lists, labels like "2083/84" with BS and AD ranges | **yes** |
| `src/portfolio/portfolio.ts` (feeds `DividendHistory`) | `nepalFiscalYear(gregorianToBS(date))` to bucket dividends | past |
| `src/tax-invoice/TaxInvoice.tsx`, `src/bill-summary/BillSummary.tsx`, `src/transaction-list/TransactionList.tsx` | BS display of a date | past |
| `src/interest-rate-table/InterestRateTable.tsx` | BS display of effective dates | either |
| `src/ledger-table/LedgerTable.tsx`, `src/transaction-history/TransactionHistory.tsx` | doc comments only, recommending `formatBSDate(gregorianToBS(d))` | n/a |

**Components that do not use the converter:**
- `src/month-grid/MonthGrid.tsx` uses only the month names `BS_MONTHS` (from `src/nepal/locale.ts`) for 'bs' headers.
- `src/market-status/session.ts` and `MarketStatus.tsx`: holidays are supplied by the caller ("none are built in").
- `CandlestickChart` and `chartMath` mention holidays only as gaps.
- `InsurancePremiumCard` takes caller text for BS.

**Tooling and docs:**
- `scripts/check-boundaries.mjs` (`PURE.nepal['calendar.ts']` allows the package; `date-range-presets` may import `../nepal/calendar.ts`).
- `scripts/check-source.mjs`: the import allowlist and a pinned-version check (`Unreviewed runtime dependency`).
- `docs/RESEARCH.md` says to "wrap rather than copy/reinvent its calendar table", and that official-data reconciliation "remain[s] a release checklist item".
- Also: `docs/ARCHITECTURE.md`, `docs/FINANCIAL.md`, `docs/SECURITY-AUDIT-2026.md`, `docs/audit/*`, `docs/migration/parity-kit-and-shared.md`.

**Tests that pin current behaviour:**
- `test/nepal.test.ts`: anchors 2021-07-16 = 2078-04-01 and 2024-02-29 = 2080-11-17; throws for 2100-01-01 and 2080-01-32.
- `test/calendar.test.tsx`: `monthLength(2080,1)=31`; `calendarLimits` = 1918-04-13 to 2043-04-13; BS input parsing.
- Also `test/accounting.test.tsx`, `test/forms-pure.test.ts`, `test/date-only.test.ts`, `test/visual/fixtures-domain.tsx`.

---

## 5. Recommended design for punji-ui

### 5.1 Principles
1. **Own the data.** One reviewed table in the repo. Each month carries provenance, and each year cites its source.
2. **Pure code, no dependency.** Day-count arithmetic from a single anchor.
3. **Never guess silently.** Every conversion can report its provenance. Strict callers can refuse projected or unverified dates. UI shows "projected" where a user would act on the date.
4. **The calendar, the fiscal year and holidays are separate concerns.** Fiscal-year rules sit on top of the calendar. Holidays stay caller-supplied (or go in a separate, separately versioned dataset), never baked into the converter.

### 5.2 Data module: `src/nepal/bs-data.ts`

A generated or hand-edited TS file, with a JSON twin for the docs:

```ts
export const BS_DATA_VERSION = '2026.11.0'; // bump on every data change
export type BsProvenance = 'official' | 'cross-checked' | 'unverified' | 'projected';
// Anchor: an officially verified day. 2080-01-01 BS = 2023-04-14 AD (Rajpatra 2079-12-02, Friday).
export const BS_ANCHOR = { bs: { year: 2080, month: 1, day: 1 }, epochDay: /* days since 1970-01-01 */ 19461 };
export interface BsYearRecord {
  year: number;
  months: readonly [number, number, number, number, number, number, number, number, number, number, number, number];
  provenance: readonly BsProvenance[]; // per month (2083 Chaitra differs from 2083 Baisakh–Falgun)
  sources: readonly string[];          // e.g. ['rajpatra:75/67/2082-11-18', 'hamropatro', 'rat32']
  note?: string;                       // e.g. 2062 dispute
}
export const BS_YEARS: readonly BsYearRecord[] = [ /* 1975…2099 */ ];
```

Initial classification, from `data/proposed-table.json`:

| Years | Provenance | Basis |
|---|---|---|
| 2080–2082 (all); 2083 Bai–Fal | `official` | Rajpatra Saturday lists (section 2.1) |
| 2083 Chaitra | `cross-checked` → `official` when the 2084 notice lands | all sources agree on 30 |
| 2000–2079 except 2062 Bai/Jes (and note 2055) | `cross-checked` | Hamro Patro, rat32 and all libraries agree |
| 2062 Baisakh, Jestha | `unverified` (disputed) | 10 sources against 2 (HP, PyPI); ship the majority 30/32 and note the dispute |
| 1990–1999 | `cross-checked` (single web source), except 1991 `unverified` | rat32 plus the library majority |
| 1975–1989 | `unverified` | library consensus only; ship the majority values: 1977 = 30,32,31,32,31,30,30,30,29,30,29,31; 1981 = …,30,30 |
| 2084–2099 | `projected` | ship Family B (rat32 = PyPI nepali-datetime, the most widely shared projection, and all rows valid), not remotemerge's aliases |

**Licence hygiene.** Write the table from our own transcription and diff, citing sources. Do not copy the GPL-3.0 npm `nepali-datetime` file. Month lengths are facts, but attribution keeps it clean (**not legal advice**). Keep the transcribed Rajpatra Saturday lists as a test fixture; that is our evidence.

Consider whether to keep 1975–1989 at all. NEPSE-era finance needs only about 2050 BS onward. Shrinking the table to 1990+ (or 2000+) would make everything we ship at least `cross-checked`. Keeping 1975 avoids a breaking change to `calendarLimits`. My recommendation: keep it, mark it `unverified`, and let strict mode refuse it.

### 5.3 Converter API: `src/nepal/calendar.ts`, rewritten as pure code

```ts
export type ProjectedPolicy = 'allow' | 'flag' | 'throw' | 'null';
export interface BsOptions { projected?: ProjectedPolicy; unverified?: ProjectedPolicy } // default: 'flag'
export interface Converted { date: CalendarDate; provenance: BsProvenance; projected: boolean; verified: boolean }

export function toBS(ad: CalendarDate, options?: BsOptions): Converted | null;
export function toAD(bs: CalendarDate, options?: BsOptions): Converted | null;
export function bsMonthLength(year: number, month: number): { days: number; provenance: BsProvenance };
export function bsProvenance(bs: CalendarDate): BsProvenance;      // throws outside the table
export const BS_TABLE_RANGE: { from: CalendarDate; to: CalendarDate };
export const BS_VERIFIED_RANGE: { from: CalendarDate; to: CalendarDate }; // largest contiguous official ∪ cross-checked span: 2062-03-01 … 2083-12-30 today (2000–2061 is also cross-checked, but the disputed 2062 Baisakh/Jestha breaks contiguity; both 2062 variants total 62 days, so Asar 1 onward is unaffected)
export const BS_OFFICIAL_THROUGH: CalendarDate;                    // 2083-11-30 today

// Backward-compatible wrappers (minor release): same signatures, now table-backed.
export function gregorianToBS(date: CalendarDate, options?: BsOptions): CalendarDate; // throws when the policy says so
export function bsToGregorian(date: CalendarDate, options?: BsOptions): CalendarDate;
```

**Semantics:**
- Outside the table, every function always throws (or returns null for `toBS` and `toAD` with `'null'`). Nothing is ever extrapolated.
- Inside the table, `projected` and `unverified` dates follow the policy:
  - `'flag'` (the default for `toBS` and `toAD`) returns the date with `projected: true` or `verified: false`;
  - `'throw'` raises a `BsProjectedDateError` that names the provenance;
  - `'null'` returns null;
  - `'allow'` returns the date silently. Only the legacy wrappers use `'allow'`.
- **Semver path:**
  - Minor release: add the new API, keep `gregorianToBS` and `bsToGregorian` defaulting to `'allow'`, document it, and mark `BS_SUPPORTED_RANGE` deprecated in favour of `BS_TABLE_RANGE` and `BS_VERIFIED_RANGE`.
  - Next major: switch the wrappers' default to `'throw'` for projected dates, so nothing guesses silently.
  - The owner decides the timing, per the release gates.
- **Implementation:**
  - Precompute a cumulative day index per (year, month), about 1,500 integers.
  - AD → BS: compute days since the anchor, binary-search the index.
  - BS → AD: index plus day, then UTC date arithmetic. No `Date` parsing of strings and no time zones; reuse `dayNumber` and `fromDayNumber` from `calendarMath.ts`.
  - Validate the day against the month length; there is no rollover.
- `calendarMath.monthLength()` becomes `bsMonthLength(...).days`. The probing try/catch loop goes away.

### 5.4 Fiscal year and holidays (separate)
- **Fiscal year.**
  - `nepalFiscalYear(bs)` stays pure label arithmetic on BS fields: Shrawan = month 4, the FY runs Shrawan 1 to Asar end, `2083/84`.
  - `getNepalFiscalPeriod` returns `{ ..., provenance: { start, end }, projected: boolean }`. The end is Asar-end of the next BS year, so **today's FY 2083/84 has `projected: true` until the 2084 calendar is official**. The same applies to `nepalFiscalYearPeriods` (each `FinancialPeriod` gets `projected`) and to the `date-range-presets` outputs.
  - Cite the fiscal-year rule (Income Tax Act 2058 "income-year"; FPFR Act 2076) in docs, after reading the full text; both are currently **UNVERIFIED** beyond snippets.
- **Holidays.**
  - Keep `MarketSchedule.holidays` caller-supplied, as today.
  - If the kit ever ships data, use a separate `nepal-holidays` dataset per BS year with its Rajpatra citation. Do not couple it to the calendar data version. Note that Rajpatra 2083 fixes Eid days and some regional holidays only as "the day of", so they cannot be precomputed.

### 5.5 Where components show "projected"

| Component | Change |
|---|---|
| `DualDate` / `dualDateText` (IssueCard, CorporateActionTimeline, DematAccountCard, EdisConfirmation, Article, AllotmentChecker, ApplyIssueForm) | Return `{ bs, ad, bsProjected }`. Render a marker (for example "12 Baisakh 2084 BS (projected)") with a `labels.projected` override and a title or tooltip: "Bikram Sambat dates after 2083 Chaitra are projections until Nepal's calendar committee publishes them." |
| `Calendar` / `DatePicker` | When the visible BS month's provenance is not `official` or `cross-checked`, show a quiet note under the month title ("Projected calendar"); add an `aria-describedby` hint. Optional prop `bsPolicy` to block projected months. |
| `FinancialPeriodSelector` / `periods.ts` | FY label "2083/84" stays; the end date shows "(projected)" when `projected`. |
| `date-range-presets/nepal.ts` | Return `projected` on presets whose bounds are projected. |
| `TaxInvoice`, `BillSummary`, `TransactionList`, `InterestRateTable`, `portfolio` | Mostly past dates. Use `'flag'` and show the marker if a projected date ever reaches them (for example a future maturity in InterestRateTable). |
| `MonthGrid`, `MarketStatus` | No change: names only, and caller-supplied holidays. |

### 5.6 Annual update process (`docs/BS-CALENDAR.md` plus a checklist)
1. **Trigger:** around Magh–Chaitra each year, two things appear: the Samiti's next-year calendar approval (news) and the Home Ministry's holiday notice in Rajpatra Part 5, which has appeared between Magh 29 and Chaitra 2 in recent years (https://aaosanku.moha.gov.np/archive, menu "बिदा"; https://rajpatra.dop.gov.np). A scheduled GitHub issue (cron in mid-January, repeating weekly until closed) is optional.
2. **Transcribe:** copy the notice's Saturday list and the Baisakh 1 weekday into `test/fixtures/rajpatra/<year>.json`, with the Rajpatra volume, number and date and the PDF URL. Commit the PDF hash, not the PDF.
3. **Derive:** run `node scripts/bs-from-rajpatra.mjs <year>`, a port of `scripts/sat.py`. It yields 11 months of the new year plus Chaitra of the previous year.
4. **Cross-check:** compare with Hamro Patro (and rat32 or Nepali Patro) for the new year. Any disagreement blocks the release until it is resolved.
5. **Update:** set the year's months to `official`, set the previous year's Chaitra to `official`, bump `BS_DATA_VERSION`, update `BS_OFFICIAL_THROUGH`, and add a changeset (minor: "BS 2084 official").
6. **Behaviour diff:** the test suite prints which AD↔BS dates changed relative to the previous data version. If any date that was `official` or `cross-checked` changes, the release is blocked.

### 5.7 Migration plan off the dependency
1. **PR 1 (data and pure converter, parity mode).**
   - Add `bs-data.ts`, `scripts/bs-from-rajpatra.mjs` and the fixtures.
   - Reimplement `gregorianToBS` and `bsToGregorian` on the table, with the same signatures.
   - Keep the dependency as a dev-only oracle in a temporary parity test. That test asserts equality for every day in 2000–2083, and asserts that differences occur **only** in the documented months (1977, 1981, 1991, 1998, 2084–2099). Changing 1975 or 2062 is a separate decision; the proposed table already agrees with remotemerge there.
2. **PR 2 (provenance API).** Add `toBS`, `toAD`, `bsMonthLength`, `bsProvenance` and the ranges. Make calendarMath use table lookups. Export the new API from `./nepal/calendar` and `./nepal`.
3. **PR 3 (UI).** Add the DualDate, Calendar/DatePicker, periods and presets markers and labels, plus stories and visual fixtures.
4. **PR 4 (removal).**
   - Delete the dependency from `package.json`.
   - In `scripts/check-source.mjs`, remove the import allowlist entry and the pinned-version rule, and add a rule that fails if any calendar dependency reappears.
   - In `scripts/check-boundaries.mjs`, set `PURE.nepal['calendar.ts']` to `{}` and allow `./bs-data.ts`.
   - Update `docs/RESEARCH.md` (reverse the "wrap rather than copy" decision and record why), `ARCHITECTURE.md`, `FINANCIAL.md` and `SECURITY-AUDIT-2026.md`.
   - Add a changeset that calls out the 1977/1981/1991/1998 and 2084+ behaviour changes.
5. **Next major:** projected dates throw by default in the legacy wrappers.

### 5.8 Tests needed
- **Primary fixtures:** for 2080–2083, every month length equals the length derived from the Rajpatra Saturday lists. The weekday of each listed Saturday equals Saturday through `toAD`. Baisakh 1 weekdays match the notices.
- **AD anchors:**
  - Baisakh 1 = 2023-04-14, 2024-04-13, 2025-04-14, 2026-04-14.
  - Poush 9/10 = Dec 25 in 2023–2026.
  - 2083-07-21 = 2026-11-07 (today, Hamro Patro).
  - 2000-01-01 = 1943-04-14 (all libraries).
  - The existing 2078-04-01 = 2021-07-16 and 2080-11-17 = 2024-02-29.
- **Round trips:** every BS day in the table goes BS → AD → BS, and every AD day in the table's AD span goes AD → BS → AD. Both directions are strictly monotonic and contiguous (no gaps or overlaps between months or years).
- **Table invariants:**
  - 12 months per year; each month 29–32 days.
  - Year totals 365 or 366 (this would have caught Hamro Patro's 2087 = 367 and 2096 = 364).
  - Per-month historical bounds as a data-entry guard (for example Baisakh 30–31, Jestha 31–32, Poush 29–30).
  - Provenance arrays have length 12, and every year has at least one source.
- **Cross-check snapshot:** a checked-in `test/fixtures/bs-crosscheck.json`, with Hamro Patro and rat32 lengths for 2000–2083 taken from this research. The table equals both everywhere except the listed exceptions (2055 rat32; 2062 HP). Any new mismatch fails.
- **Provenance and policy:**
  - The first day after `BS_OFFICIAL_THROUGH` is `cross-checked` (2083 Chaitra 1), and 2084-01-01 is `projected`.
  - `'flag'`, `'throw'`, `'null'` and `'allow'` each behave as documented.
  - Outside the table, every call throws or returns null.
  - `BS_VERIFIED_RANGE` is contiguous and contains no `unverified` or `projected` month.
- **Fiscal year:** `getNepalFiscalPeriod` for 2083/84 has `projected: true` on its end and `false` on its start; 2081/82 has both `false`. Labels are unchanged.
- **Components:** DualDate shows the marker only for projected dates. The Calendar month note appears for 2084+. Period and preset outputs carry `projected`. Snapshot and visual stories cover both states.
- **Tooling:** check-source fails if `@remotemerge/nepali-date-converter` (or any BS calendar package) is imported.

---

## 6. Open items and unverified points
- The 2062 Baisakh/Jestha dispute and the pre-2000 disputes (1975, 1977, 1981, 1989, 1991) need the Rajpatra holiday notices for those years from rajpatra.dop.gov.np. They were not retrieved.
- 2083 Chaitra becomes primary only after the 2084 notice (expected Feb–Mar 2027).
- The Samiti formation order's text (legal basis, cabinet date) was not read; the PDF link returned HTML.
- The full texts of the fiscal-year statutes were not read.
- Nepali Patro and ashesh.com.np were not diffed (single-page app and not fetched, respectively).
- The leapfrog picker decode may not reflect its UI path.
- PyPI `nepali-datetime`: the licence is inconsistent (MIT on PyPI, Apache-2.0 on GitHub), and its data was taken from GitHub master rather than the released wheel.
