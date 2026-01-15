import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@sanity/client";
import * as bcrypt from "bcryptjs";

// Initialize Sanity client
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || "production",
  apiVersion: "2023-05-03",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// Secret key for setup (should only be used once)
const SETUP_KEY = process.env.ADMIN_SETUP_KEY || process.env.JWT_SECRET;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { setupKey, email, password, name } = JSON.parse(event.body || "{}");

    // Verify setup key
    if (!setupKey || setupKey !== SETUP_KEY) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Invalid setup key" }),
      };
    }

    if (!email || !password || !name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Email, password, and name are required" }),
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Password must be at least 8 characters" }),
      };
    }

    // Check if user already exists
    const existingUser = await sanityClient.fetch(
      `*[_type == "adminUser" && email == $email][0]{ _id }`,
      { email: email.toLowerCase() }
    );

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    let userId: string;

    if (existingUser) {
      // Update existing user
      const result = await sanityClient
        .patch(existingUser._id)
        .set({
          passwordHash,
          name,
          isActive: true,
        })
        .commit();
      userId = result._id;
      console.log("Updated existing admin user:", userId);
    } else {
      // Create new user
      const result = await sanityClient.create({
        _type: "adminUser",
        email: email.toLowerCase(),
        name,
        passwordHash,
        role: "admin",
        isActive: true,
      });
      userId = result._id;
      console.log("Created new admin user:", userId);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: existingUser ? "Admin user updated" : "Admin user created",
        userId,
      }),
    };
  } catch (error: any) {
    console.error("Setup error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal server error" }),
    };
  }
};

export { handler };
