/* Creates the initial director account. Run with: npm run seed */
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Load .env.local (plain node script — no Next.js env loading here).
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  /* .env.local optional */
}

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/bata-csr";
const name = process.env.DIRECTOR_NAME ?? "Bata Director";
const email = (process.env.DIRECTOR_EMAIL ?? "director@bata.com").toLowerCase();
const password = process.env.DIRECTOR_PASSWORD ?? "Director@123";

await mongoose.connect(uri);

const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      name: String,
      email: String,
      passwordHash: String,
      role: String,
      active: Boolean,
      mustChangePassword: Boolean,
    },
    { timestamps: true, strict: false }
  )
);

const existing = await User.findOne({ email });
if (existing) {
  console.log(`✔ Director already exists: ${email} — nothing to do.`);
} else {
  await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: "director",
    active: true,
    mustChangePassword: false,
  });
  console.log("✔ Director account created:");
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log("  Change this password after first login (Dashboard → Settings).");
}

await mongoose.disconnect();
