import "dotenv/config";
import bcrypt from "bcrypt";
import { db, pool } from "./db.js";
import { admins } from "./schema.js";

async function seedAdmin() {
  const username = "admin3";
  const plainPassword = "admin";

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  await db
    .insert(admins)
    .values({
      username,
      password: passwordHash,
      phoneNumber: "0000000000",
      permissions: ["product_read", "product_add", "product_update", "product_delete", "order_add"],
      type: "regular_admin",
    })
    .onConflictDoNothing({ target: admins.username });

  console.log(`✅ Admin "${username}" created (or already exists).`);
  await pool.end();
}

seedAdmin().catch((err) => {
  console.error("❌ Failed to seed admin:", err);
  process.exit(1);
});


// "product_read",
//   "product_delete",
//   "product_add",
//   "product_update",
