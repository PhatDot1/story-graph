// recover.ts
import "dotenv/config";
import axios from "axios";
import fs from "fs";
import path from "path";

//
// CONFIG: paste your failing cursor here
//
const AFTER: string = "gqtDb2x1bW5OYW1lc5GoX19za2lwX1+mVmFsdWVzkc2AhA==";
const LIMIT: number = 1;     // fetch 1 item per request
const START_PAGE: number = 330;

async function main() {
  // ensure output dir exists
  const OUTDIR = path.resolve(process.cwd(), "pages");
  if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

  const api = axios.create({
    baseURL: "https://api.storyapis.com/api/v3",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.STORY_API_KEY!,
      "X-Chain": "story-aeneid",
    },
  });

  let after: string | null = AFTER;
  let page: number = START_PAGE;

  console.log(`→ Recovering from cursor="${AFTER}" one item at a time…`);

  while (after) {
    const body: any = { options: { where: {}, pagination: { after, limit: LIMIT } } };
    try {
      const resp: any = await api.post("/assets", body);
      const items = resp.data.data as any[];
      const nextCursor = resp.data.next || null;

      console.log(
        `[Recover ${page}] fetched ipId=${items[0]?.ipId} (count=${items.length}), next="${nextCursor}"`
      );

      // write this single‐item page out
      const dump = { page, requestedAfter: after, data: items, next: nextCursor };
      const filename = path.join(OUTDIR, `assets-page-${page}.json`);
      fs.writeFileSync(filename, JSON.stringify(dump, null, 2));
      console.log(`→ Wrote ${filename}`);

      // advance
      after = nextCursor;
      page++;
    } catch (err: any) {
      console.error(
        `[Recover ${page}] ERROR status=${err.response?.status}, data=`,
        err.response?.data || err.message
      );
      break;
    }
  }

  console.log("✅ Recover script finished.");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
