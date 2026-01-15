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

const JWT_SECRET = process.env.JWT_SECRET || process.env.SANITY_API_TOKEN || "fallback-secret-change-me";
const JWT_EXPIRES_IN = "24h";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  refreshToken: string;
  tokenExpiry: string;
  isActive: boolean;
  avatar?: string;
}

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
    const { refreshToken } = JSON.parse(event.body || "{}");

    if (!refreshToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Refresh token is required" }),
      };
    }

    // Verify the refresh token
    let decoded: { userId: string };
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string };
    } catch (error) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid refresh token" }),
      };
    }

    // Find user and verify stored refresh token
    const user = await sanityClient.fetch<AdminUser | null>(
      `*[_type == "adminUser" && _id == $userId][0]{
        _id,
        email,
        name,
        role,
        refreshToken,
        tokenExpiry,
        isActive,
        "avatar": avatar.asset->url
      }`,
      { userId: decoded.userId }
    );

    if (!user || !user.isActive) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid session" }),
      };
    }

    // Verify stored refresh token matches
    const tokenValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokenValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Session expired" }),
      };
    }

    // Check token expiry
    if (new Date(user.tokenExpiry) < new Date()) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Session expired" }),
      };
    }

    // Generate new tokens
    const newAccessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const newRefreshToken = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    // Update refresh token
    await sanityClient
      .patch(user._id)
      .set({
        refreshToken: await bcrypt.hash(newRefreshToken, 10),
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .commit();

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
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }),
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

export { handler };
