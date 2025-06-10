#!/usr/bin/env ts-node

import "dotenv/config";
import axios from "axios";
import type { AxiosResponse } from "axios";  // ← type-only
import fs from "fs";
import path from "path";
import minimist from "minimist";

//
// CLI args
//
const argv = minimist(process.argv.slice(2), {
  string: ["after"],
  boolean: ["help"],
});
if (argv.help) {
  console.log(`
Usage: ts-node fetch-all-assets.ts [--after <cursor>]
  --after   start full-page fetch from this cursor
  --help    show this help
`);
  process.exit(0);
}
const startAfter = typeof argv.after === "string" ? argv.after : undefined;

//
// Setup output dir
//
const OUTDIR = path.resolve(process.cwd(), "pages");
if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

//
// API client
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
// Helper: fetch a page with backoff
//
async function fetchPage(after: string | null, limit: number): Promise<any> {
  let attempt = 0;
  const maxAttempts = 5;
  let delay = 1000;
  while (true) {
    try {
      const resp: AxiosResponse<any> = await API.post(
        "/assets",
        { options: { where: {}, pagination: { after, limit } } }
      );
      return resp.data;
    } catch (e: any) {
      const status = e.response?.status;
      if (status >= 500 && status < 600 && attempt < maxAttempts - 1) {
        console.warn(
          `[Retry page after="${after}"] status=${status}, attempt=${attempt + 1}/${maxAttempts}`
        );
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
        delay *= 2;
        continue;
      }
      throw e;
    }
  }
}

(async () => {
  let after: string | null = startAfter || null;
  let page = 1;
  let total = 0;
  let lastNext: string | null = null;

  console.log("→ Starting full-page fetch", after ? `from cursor="${after}"` : "(from start)");

  // 1) Full pages of 100
  while (true) {
    try {
      console.log(`\n[Page ${page}] fetching after="${after}"`);
      const data = await fetchPage(after, 100);
      const batch: any[] = data.data;
      const nextCursor: string | null = data.next || null;

      // write diagnostic dump
      const filename = path.join(OUTDIR, `assets-page-${page}.json`);
      fs.writeFileSync(
        filename,
        JSON.stringify({ page, requestedAfter: after, data: batch, next: nextCursor }, null, 2)
      );
      console.log(`→ Wrote ${filename} (${batch.length} items)`);

      total += batch.length;
      after = nextCursor;
      lastNext = nextCursor;
      page++;

      if (!after) {
        console.log("\n✅ Full-page fetch complete (no more pages).");
        break;
      }
    } catch (err: any) {
      console.error(
        `\n[Page ${page}] failed after="${after}":`,
        err.response?.data || err.message
      );
      console.log("→ Switching to 1-item recovery from lastNext=", lastNext);
      break;
    }
  }

  // 2) Recovery: one item at a time from lastNext
  if (lastNext) {
    after = lastNext;
    while (after) {
      try {
        console.log(`\n[Recover ${page}] fetching after="${after}"`);
        const resp: AxiosResponse<any> = await API.post(
          "/assets",
          { options: { where: {}, pagination: { after, limit: 1 } } }
        );
        const items: any[] = resp.data.data;
        const nextCursor: string | null = resp.data.next || null;

        const filename = path.join(OUTDIR, `assets-page-${page}.json`);
        fs.writeFileSync(
          filename,
          JSON.stringify({ page, requestedAfter: after, data: items, next: nextCursor }, null, 2)
        );
        console.log(`→ Wrote ${filename} (1 item, ipId=${items[0]?.ipId})`);

        total += items.length;
        after = nextCursor;
        page++;
      } catch (err: any) {
        console.error(
          `[Recover ${page}] ERROR after="${after}":`,
          err.response?.data || err.message
        );
        break;
      }
    }
    console.log("\n✅ Recovery finished.");
  }

  console.log(`\n🎉 Fetched a total of ${total} assets across ${page - 1} pages.`);

  // 3) Merge all pages into assets.json
  console.log("\n→ Merging all page files into assets.json …");
  const merged: any[] = [];
  for (const file of fs.readdirSync(OUTDIR)) {
    if (!file.startsWith("assets-page-") || !file.endsWith(".json")) continue;
    const { data } = JSON.parse(fs.readFileSync(path.join(OUTDIR, file), "utf-8"));
    merged.push(...data);
  }
  fs.writeFileSync("assets.json", JSON.stringify(merged, null, 2));
  console.log(`→ Wrote assets.json (${merged.length} total items)`);

  // 4) Convert to newline-delimited JSON
  console.log("\n→ Writing assets.ndjson …");
  const ndjsonStream = fs.createWriteStream("assets.ndjson");
  for (const item of merged) {
    ndjsonStream.write(JSON.stringify(item) + "\n");
  }
  ndjsonStream.end();
  console.log(`→ Wrote assets.ndjson (${merged.length} lines)`);

  console.log("\nAll done!");
  process.exit(0);
})();
