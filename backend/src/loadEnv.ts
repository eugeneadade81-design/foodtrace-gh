import dotenv from "dotenv";
import fs from "fs";
import path from "path";

let dir = process.cwd();
let loaded = false;
for (let i = 0; i < 8; i++) {
  const envPath = path.join(dir, ".env");
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loaded = true;
    break;
  }
  const parent = path.dirname(dir);
  if (parent === dir) break;
  dir = parent;
}
if (!loaded) dotenv.config();
dotenv.config();
