/**
 * Setup Admin User Script
 * 
 * Run with: npx ts-node scripts/setup-admin.ts
 * 
 * Creates the initial admin user in Sanity CMS
 */

import { createClient } from "@sanity/client";
import * as bcrypt from "bcryptjs";
import * as readline from "readline";

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || "tvi7xjbr",
  dataset: process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || "production",
  apiVersion: "2023-05-03",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log("\n🔐 Resonance Admin User Setup\n");
  console.log("This script will create an admin user in your Sanity CMS.\n");

  // Check if admin users already exist
  const existingAdmins = await sanityClient.fetch(
    `*[_type == "adminUser" && role == "admin"] | order(_createdAt asc)[0...5]{
      _id, email, name, role, isActive
    }`
  );

  if (existingAdmins.length > 0) {
    console.log("⚠️  Existing admin users found:");
    existingAdmins.forEach((admin: any) => {
      console.log(`   - ${admin.email} (${admin.name}) - ${admin.isActive ? "Active" : "Inactive"}`);
    });
    console.log("");

    const proceed = await question("Create another admin user? (yes/no): ");
    if (proceed.toLowerCase() !== "yes" && proceed.toLowerCase() !== "y") {
      console.log("Setup cancelled.");
      rl.close();
      process.exit(0);
    }
  }

  // Gather user information
  const email = await question("Email: ");
  const name = await question("Full Name: ");
  const password = await question("Password (min 8 characters): ");

  // Validate
  if (!email || !email.includes("@")) {
    console.error("❌ Invalid email address");
    rl.close();
    process.exit(1);
  }

  if (!name || name.length < 2) {
    console.error("❌ Name is required");
    rl.close();
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error("❌ Password must be at least 8 characters");
    rl.close();
    process.exit(1);
  }

  // Check if email already exists
  const existingUser = await sanityClient.fetch(
    `*[_type == "adminUser" && email == $email][0]{ _id }`,
    { email: email.toLowerCase() }
  );

  if (existingUser) {
    console.error(`❌ A user with email ${email} already exists`);
    rl.close();
    process.exit(1);
  }

  console.log("\nCreating admin user...");

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await sanityClient.create({
    _type: "adminUser",
    email: email.toLowerCase(),
    name,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  console.log("\n✅ Admin user created successfully!");
  console.log(`   ID: ${user._id}`);
  console.log(`   Email: ${email}`);
  console.log(`   Name: ${name}`);
  console.log(`   Role: admin`);
  console.log("\n🔑 You can now log in at /admin/login\n");

  rl.close();
}

main().catch((error) => {
  console.error("Error:", error);
  rl.close();
  process.exit(1);
});
