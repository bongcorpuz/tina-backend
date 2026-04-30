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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ================= REGISTER ================= */

export async function registerUser(
  username,
  password,
  role = "user",
  email = "",
  mobile = "",
  company = ""
) {
  // ✅ FIX: company is now optional
  if (!username || !password || !email || !mobile) {
    throw new Error(
      "Username, password, email, and mobile are required"
    );
  }

  // Minimum 6 chars, at least 1 uppercase, 1 number, 1 special character
const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;

if (!passwordRegex.test(password)) {
  throw new Error(
    "Password must be at least 6 characters and include 1 uppercase letter, 1 number, and 1 special character"
  );
}

  const cleanUsername = username.trim().toLowerCase();
  const cleanEmail = email.trim().toLowerCase();
  const cleanMobile = mobile.trim();

  // ✅ FIX: handle optional company safely
  const cleanCompany = company ? company.trim() : "";

  const passwordHash = await bcrypt.hash(password, 12);

  const { data, error } = await supabase
    .from("app_users")
    .insert({
      username: cleanUsername,
      password_hash: passwordHash,
      role,
      email: cleanEmail,
      mobile: cleanMobile,
      company: cleanCompany || null, // optional stored as null if empty
      otp_verified: false,
      is_active: true // ensure active by default
    })
    .select("id, username, email, mobile, company, role, otp_verified")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Username already exists");
    }

    throw new Error(error.message);
  }

  return data;
}

/* ================= LOGIN ================= */

export async function loginUser(username, password) {
  if (!username || !password) {
    return null;
  }

  const cleanUsername = username.trim().toLowerCase();

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

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      otpVerified: user.otp_verified
    },
    JWT_SECRET,
    { expiresIn: "8h" }
  );

  return {
    token,
    role: user.role,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    company: user.company || "",
    otpVerified: user.otp_verified
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
    next();
  } catch (error) {
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

  next();
}