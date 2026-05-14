// FILE: auth.js

import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const JWT_SECRET = process.env.JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const JWT_EXPIRES_IN =
  process.env.JWT_EXPIRES_IN || "8h";

const AUTH_ENGINE_VERSION = "3.0.0";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase credentials are missing");
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

/* =========================================================
 * HELPERS
 * ========================================================= */

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeLower(value = "") {
  return normalizeText(value).toLowerCase();
}

function safeBoolean(value) {
  return Boolean(value);
}

function generateSessionId() {
  return crypto.randomUUID();
}

function createAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      otpVerified: safeBoolean(user.otp_verified),

      /*
       * TINA Adaptive Compatibility
       */
      adaptiveEnabled: true,
      orchestrationCompatible: true,

      /*
       * TINA Mode Context
       */
      activeMode:
        user.active_mode ||
        "STANDARD_TAX_MODE",

      activeHook:
        user.active_hook ||
        "/ask"
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
}

function buildPublicUser(user) {
  return {
    id: user.id,

    username: user.username,

    email: user.email,

    mobile: user.mobile,

    company: user.company || "",

    role: user.role,

    otpVerified: safeBoolean(
      user.otp_verified
    ),

    /*
     * Adaptive Metadata
     */
    activeMode:
      user.active_mode ||
      "STANDARD_TAX_MODE",

    activeHook:
      user.active_hook ||
      "/ask",

    adaptiveEnabled: true
  };
}

/* =========================================================
 * USER LOOKUP
 * ========================================================= */

async function getUserByUsername(username) {
  const cleanUsername =
    normalizeLower(username);

  if (!cleanUsername) {
    return null;
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("username", cleanUsername)
    .maybeSingle();

  if (error) {
    console.error(
      "getUserByUsername error:",
      error.message
    );

    return null;
  }

  return data || null;
}

/* =========================================================
 * REGISTER
 * ========================================================= */

export async function registerUser(
  username,
  password,
  role = "user",
  email = "",
  mobile = "",
  company = ""
) {
  const cleanUsername =
    normalizeLower(username);

  const cleanEmail =
    normalizeLower(email);

  const cleanMobile =
    normalizeText(mobile);

  const cleanCompany =
    normalizeText(company);

  const cleanRole =
    normalizeLower(role) || "user";

  if (
    !cleanUsername ||
    !password ||
    !cleanEmail ||
    !cleanMobile
  ) {
    throw new Error(
      "Username, password, email, and mobile are required"
    );
  }

  /*
   * Enterprise Password Policy
   */
  const passwordRegex =
    /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  if (!passwordRegex.test(password)) {
    throw new Error(
      "Password must be at least 8 characters and include 1 uppercase letter, 1 number, and 1 special character"
    );
  }

  const existingUser =
    await getUserByUsername(cleanUsername);

  if (existingUser) {
    throw new Error(
      "Username already exists"
    );
  }

  const passwordHash =
    await bcrypt.hash(password, 12);

  const sessionId =
    generateSessionId();

  const payload = {
    username: cleanUsername,

    password_hash: passwordHash,

    role: cleanRole,

    email: cleanEmail,

    mobile: cleanMobile,

    company:
      cleanCompany || null,

    otp_verified: false,

    is_active: true,

    /*
     * TINA Adaptive Defaults
     */
    active_mode:
      "STANDARD_TAX_MODE",

    active_hook: "/ask",

    adaptive_enabled: true,

    orchestration_compatible: true,

    last_session_id: sessionId,

    auth_engine_version:
      AUTH_ENGINE_VERSION
  };

  const { data, error } =
    await supabase
      .from("app_users")
      .insert(payload)
      .select("*")
      .single();

  if (error) {
    console.error(
      "registerUser error:",
      error
    );

    if (error.code === "23505") {
      throw new Error(
        "Username, email, or mobile already exists"
      );
    }

    throw new Error(
      error.message ||
        "Registration failed"
    );
  }

  return {
    ...buildPublicUser(data),

    sessionId,

    authEngineVersion:
      AUTH_ENGINE_VERSION
  };
}

/* =========================================================
 * LOGIN
 * ========================================================= */

export async function loginUser(
  username,
  password
) {
  const cleanUsername =
    normalizeLower(username);

  if (
    !cleanUsername ||
    !password
  ) {
    return null;
  }

  const user =
    await getUserByUsername(
      cleanUsername
    );

  if (
    !user ||
    !safeBoolean(user.is_active)
  ) {
    return null;
  }

  const validPassword =
    await bcrypt.compare(
      password,
      user.password_hash
    );

  if (!validPassword) {
    return null;
  }

  /*
   * New Session
   */
  const sessionId =
    generateSessionId();

  /*
   * Update last login metadata
   */
  await supabase
    .from("app_users")
    .update({
      last_login_at:
        new Date().toISOString(),

      last_session_id:
        sessionId
    })
    .eq("id", user.id);

  const token =
    createAuthToken({
      ...user,
      session_id: sessionId
    });

  return {
    token,

    sessionId,

    authEngineVersion:
      AUTH_ENGINE_VERSION,

    ...buildPublicUser(user)
  };
}

/* =========================================================
 * VERIFY TOKEN
 * ========================================================= */

export function verifyAuthToken(
  token
) {
  try {
    return jwt.verify(
      token,
      JWT_SECRET
    );
  } catch (error) {
    return null;
  }
}

/* =========================================================
 * AUTH MIDDLEWARE
 * ========================================================= */

export function authenticate(
  req,
  res,
  next
) {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith(
      "Bearer "
    )
  ) {
    return res
      .status(401)
      .json({
        error:
          "Authentication required"
      });
  }

  const token =
    authHeader.split(" ")[1];

  try {
    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    /*
     * TINA Adaptive Context
     */
    req.user = decoded;

    req.tinaAuth = {
      adaptiveEnabled:
        decoded.adaptiveEnabled !==
        false,

      orchestrationCompatible:
        decoded.orchestrationCompatible !==
        false,

      activeMode:
        decoded.activeMode ||
        "STANDARD_TAX_MODE",

      activeHook:
        decoded.activeHook ||
        "/ask"
    };

    return next();
  } catch (error) {
    return res
      .status(401)
      .json({
        error:
          "Invalid or expired token"
      });
  }
}

/* =========================================================
 * ADMIN GUARD
 * ========================================================= */

export function requireAdmin(
  req,
  res,
  next
) {
  if (
    !req.user ||
    req.user.role !== "admin"
  ) {
    return res
      .status(403)
      .json({
        error:
          "Admin access only"
      });
  }

  return next();
}

/* =========================================================
 * ROLE GUARD
 * ========================================================= */

export function requireRole(
  allowedRoles = []
) {
  return (
    req,
    res,
    next
  ) => {
    const normalized =
      Array.isArray(
        allowedRoles
      )
        ? allowedRoles.map(
            (r) =>
              normalizeLower(r)
          )
        : [];

    const userRole =
      normalizeLower(
        req.user?.role
      );

    if (
      !userRole ||
      !normalized.includes(
        userRole
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            "Insufficient permissions"
        });
    }

    return next();
  };
}

/* =========================================================
 * CURRENT USER
 * ========================================================= */

export async function getCurrentUser(
  userId
) {
  if (!userId) {
    return null;
  }

  const { data, error } =
    await supabase
      .from("app_users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

  if (error) {
    console.error(
      "getCurrentUser error:",
      error.message
    );

    return null;
  }

  if (!data) {
    return null;
  }

  return buildPublicUser(data);
}

/* =========================================================
 * HEALTH CHECK
 * ========================================================= */

export function authHealthCheck() {
  return {
    ok: true,

    engine:
      "TINA_AUTH_ENGINE",

    version:
      AUTH_ENGINE_VERSION,

    adaptiveCompatible: true,

    orchestrationCompatible: true,

    jwtCompatible: true,

    supabaseCompatible: true
  };
}
