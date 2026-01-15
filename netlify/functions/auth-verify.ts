import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import * as jwt from "jsonwebtoken";

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.SANITY_API_TOKEN || "fallback-secret-change-me";

interface JWTPayload {
  userId: string;
  email: string;
  role: "admin" | "editor" | "viewer";
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
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "No token provided" }),
      };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        valid: true,
        user: {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        },
      }),
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Token expired", code: "TOKEN_EXPIRED" }),
      };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid token", code: "INVALID_TOKEN" }),
      };
    }
    console.error("Token verification error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

export { handler };
