#!/usr/bin/env ts-node

import fs from "fs";
import path from "path";

const INPUT = path.resolve(process.cwd(), "assets.json");
const OUTPUT = path.resolve(process.cwd(), "assets-reduced.ndjson");

function convertJsonToNdjson() {
  if (!fs.existsSync(INPUT)) {
    console.error(`Input file not found: ${INPUT}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT, "utf-8");
  let items: any[];
  try {
    items = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    process.exit(1);
  }

  const stream = fs.createWriteStream(OUTPUT, { flags: "w" });
  for (const item of items) {
    stream.write(JSON.stringify(item) + "\n");
  }
  stream.end(() => {
    console.log(`→ Wrote ${OUTPUT} (${items.length} records)`);
  });
}

convertJsonToNdjson();
