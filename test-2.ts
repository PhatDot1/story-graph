// resume-assets.ts
import "dotenv/config";
import axios, { AxiosError } from "axios";
import fs from "fs";
import path from "path";
import minimist from "minimist";

//
// 1) Parse CLI args
//
const argv = minimist(process.argv.slice(2), {
  string: ["after"],
  boolean: ["help"],
});
if (argv.help) {
  console.log(`
Usage: ts-node resume-assets.ts [--after <cursor>]
  --after   start from this pagination cursor (as returned in 'next')
  --help    show this help
`);
  process.exit(0);
}
const startAfter = typeof argv.after === "string" ? argv.after : undefined;

//
// 2) Prepare output directory under your CWD
//
const OUTDIR = path.resolve(process.cwd(), "pages");
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR);

//
// 3) Story API client
//
const API = axios.create({
  baseURL: "https://api.storyapis.com/api/v3",
  headers: {
    "Content-Type": "application/json",
    "X-Api-Key": process.env.STORY_API_KEY!,
    "X-Chain": "story-aeneid",
  },
});

//
// 4) Fetch one page with exponential backoff
//
async function fetchPage(after: string | null): Promise<any> {
  let attempt = 0;
  const maxAttempts = 5;
  let delay = 1000;

  while (true) {
    try {
      const resp = await API.post("/assets", {
        options: { where: {}, pagination: { after, limit: 100 } },
      });
      return resp.data;
    } catch (e) {
      const err = e as AxiosError;
      const status = err.response?.status;
      if (status && status >= 500 && status < 600 && attempt < maxAttempts - 1) {
        console.warn(
          `[Retry] page after="${after}", status=${status}, attempt=${attempt + 1}/${maxAttempts}`
        );
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
        delay *= 2;
        continue;
      }
      console.error("[Error] failed to fetch page:", err.response?.data || err.message);
      throw err;
    }
  }
}

//
// 5) Main loop: resume pagination and dump each page
//
(async () => {
  console.log("→ Resuming assets fetch", startAfter ? `from cursor="${startAfter}"` : "(from start)");
  let after: string | null = startAfter || null;
  let page = 1;
  let totalFetched = 0;

  try {
    do {
      console.log(`\n[Page ${page}] fetching after="${after}"`);
      const data = await fetchPage(after);
      const batch: any[] = data.data;
      console.log(`[Page ${page}] got ${batch.length} items, nextCursor="${data.next}"`);

      // save raw JSON for diagnostics
      const filename = path.join(OUTDIR, `assets-page-${page}.json`);
      fs.writeFileSync(filename, JSON.stringify({ after, data }, null, 2));
      console.log(`[Page ${page}] dumped to ${filename}`);

      totalFetched += batch.length;
      after = data.next || null;
      page++;
    } while (after);

    console.log("\n🎉 All done!");
    console.log(`Total assets fetched: ${totalFetched}`);
  } catch {
    console.error("\n❌ Fetch aborted due to error.");
    process.exit(1);
  }
})();
