// When each docs page last changed, for the sitemap's <lastmod> and the page's JSON-LD dateModified.
// A page's date is the newest commit that touched its own files: its examples (site/src/examples/<slug>/), its guide
// files (site/src/guides/<slug>/) and the source of the modules it documents (src/<module>). The registry files are
// left out on purpose: they hold every page, so one edit there would date every page. One `git log` pass, no network.
// Without git history (a tarball, or a shallow clone that lacks a file's commit) a page falls back to the HEAD commit
// date, then to today.
import { execFileSync } from 'node:child_process';

// The UTC day, so a commit made before midnight UTC in Nepal (UTC+5:45) is not dated tomorrow by check:seo's UTC clock.
const day = (iso) => new Date(iso).toISOString().slice(0, 10);

/** File path to its newest commit date (YYYY-MM-DD), from one `git log` over the docs and the library source. */
function fileDates(root) {
  const dates = new Map();
  let log = '';
  try {
    log = execFileSync('git', ['log', '--format=%x00%cI', '--name-only', '--', 'site/src/examples', 'site/src/guides', 'src'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return { dates, head: undefined };
  }
  let current;
  let head;
  for (const line of log.split('\n')) {
    if (line.startsWith('\0')) {
      current = day(line.slice(1));
      head ??= current;
    } else if (line && current && !dates.has(line)) dates.set(line, current);
  }
  return { dates, head };
}

/** slug to YYYY-MM-DD for every page. */
export function pageDates(PAGES, root) {
  const { dates, head } = fileDates(root);
  const fallback = head ?? day(new Date().toISOString());
  const out = {};
  for (const page of PAGES) {
    const prefixes = [`site/src/examples/${page.slug}/`, `site/src/guides/${page.slug}/`, ...new Set(page.api.map((a) => a.module).filter(Boolean).map((m) => `src/${m}`))];
    let newest;
    for (const [file, date] of dates) {
      if (prefixes.some((prefix) => file === prefix || file.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`) || file.startsWith(`${prefix}.`))) {
        if (!newest || date > newest) newest = date;
      }
    }
    out[page.slug] = newest ?? fallback;
  }
  return out;
}
