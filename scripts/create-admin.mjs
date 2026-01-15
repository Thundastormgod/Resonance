// Simple admin user creation script
// Run with: node scripts/create-admin.mjs

import { createClient } from "@sanity/client";
import bcrypt from "bcryptjs";

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || "tvi7xjbr",
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: "2023-05-03",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// Admin user details - CHANGE THESE
const ADMIN_EMAIL = "admin@theresonance.news";
const ADMIN_NAME = "Admin";
const ADMIN_PASSWORD = "Resonance2026!"; // Change this!

async function main() {
  console.log("\n🔐 Creating admin user...\n");

  // Check if user exists
  const existing = await sanityClient.fetch(
    `*[_type == "adminUser" && email == $email][0]{ _id }`,
    { email: ADMIN_EMAIL.toLowerCase() }
  );

  if (existing) {
    console.log(`⚠️  User ${ADMIN_EMAIL} already exists. Updating password...`);
    
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await sanityClient
      .patch(existing._id)
      .set({ passwordHash, isActive: true })
      .commit();
    
    console.log("✅ Password updated!");
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // Create user
  const user = await sanityClient.create({
    _type: "adminUser",
    email: ADMIN_EMAIL.toLowerCase(),
    name: ADMIN_NAME,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  console.log("✅ Admin user created successfully!");
  console.log(`   ID: ${user._id}`);
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(`   Role: admin`);
  console.log("\n🔑 You can now log in at /admin/login\n");
}

main().catch(console.error);
