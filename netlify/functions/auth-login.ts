import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { createClient } from "@sanity/client";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

// Initialize Sanity client
const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || process.env.VITE_SANITY_DATASET || "production",
  apiVersion: "2023-05-03",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// JWT secret - should be set in environment
const JWT_SECRET = process.env.JWT_SECRET || process.env.SANITY_API_TOKEN || "fallback-secret-change-me";
const JWT_EXPIRES_IN = "24h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  passwordHash: string;
  isActive: boolean;
  avatar?: {
    asset: {
      url: string;
    };
  };
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight
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
    const { email, password } = JSON.parse(event.body || "{}");

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Email and password are required" }),
      };
    }

    // Find user in Sanity
    const user = await sanityClient.fetch<AdminUser | null>(
      `*[_type == "adminUser" && email == $email][0]{
        _id,
        email,
        name,
        role,
        passwordHash,
        isActive,
        "avatar": avatar.asset->url
      }`,
      { email: email.toLowerCase() }
    );

    if (!user) {
      // Don't reveal whether user exists
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid email or password" }),
      };
    }

    if (!user.isActive) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Account is deactivated. Contact administrator." }),
      };
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid email or password" }),
      };
    }

    // Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    // Update last login and store refresh token
    await sanityClient
      .patch(user._id)
      .set({
        lastLogin: new Date().toISOString(),
        refreshToken: await bcrypt.hash(refreshToken, 10),
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .commit();

    // Return user info (without sensitive data)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
        accessToken,
        refreshToken,
      }),
    };
  } catch (error) {
    console.error("Login error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

export { handler };
