// merge-assets.js
const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "pages");
let all = [];

for (const file of fs.readdirSync(dir)) {
  if (!file.startsWith("assets-page-")) continue;
  const { data } = JSON.parse(fs.readFileSync(path.join(dir, file)));
  all = all.concat(data.data);
}

fs.writeFileSync("assets.json", JSON.stringify(all, null, 2));
console.log(`Wrote assets.json (${all.length} items)`);
