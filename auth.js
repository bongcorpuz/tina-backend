// FILE: auth.js

import "dotenv/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const JWT_SECRET = process.env.JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase credentials are missing");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false
  }
});

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeLower(value = "") {
  return normalizeText(value).toLowerCase();
}

function createAuthToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      otpVerified: Boolean(user.otp_verified)
    },
    JWT_SECRET,
    { expiresIn: "8h" }
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
    otpVerified: Boolean(user.otp_verified)
  };
}

/* ================= REGISTER ================= */

export async function registerUser(
  username,
  password,
  role = "user",
  email = "",
  mobile = "",
  company = ""
) {
  const cleanUsername = normalizeLower(username);
  const cleanEmail = normalizeLower(email);
  const cleanMobile = normalizeText(mobile);
  const cleanCompany = normalizeText(company);

  if (!cleanUsername || !password || !cleanEmail || !cleanMobile) {
    throw new Error("Username, password, email, and mobile are required");
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

  if (!passwordRegex.test(password)) {
    throw new Error(
      "Password must be at least 6 characters and include 1 uppercase letter, 1 number, and 1 special character"
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from("app_users")
    .insert({
      username: cleanUsername,
      password_hash: passwordHash,
      role: normalizeLower(role) || "user",
      email: cleanEmail,
      mobile: cleanMobile,
      company: cleanCompany || null,
      otp_verified: false,
      is_active: true
    })
    .select("id, username, email, mobile, company, role, otp_verified")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Username, email, or mobile already exists");
    }

    throw new Error(error.message || "Registration failed");
  }

  return {
    ...data,
    company: data.company || "",
    otpVerified: Boolean(data.otp_verified)
  };
}

/* ================= LOGIN ================= */

export async function loginUser(username, password) {
  const cleanUsername = normalizeLower(username);

  if (!cleanUsername || !password) {
    return null;
  }

  const { data: user, error } = await supabase
    .from("app_users")
    .select(
      "id, username, email, mobile, company, password_hash, role, is_active, otp_verified"
    )
    .eq("username", cleanUsername)
    .single();

  if (error || !user || !user.is_active) {
    return null;
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);

  if (!validPassword) {
    return null;
  }

  const token = createAuthToken(user);

  return {
    token,
    ...buildPublicUser(user)
  };
}

/* ================= AUTH MIDDLEWARE ================= */

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired token"
    });
  }
}

/* ================= ADMIN GUARD ================= */

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin access only"
    });
  }

  return next();
}
