"use strict";
const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const { signToken, adminRequired } = require("../middleware/auth");
const { createRateLimiter } = require("../middleware/rateLimiter");

const loginLimiter = createRateLimiter(10, 15);

const TOKEN_EXPIRY = "1h";
const REFRESH_EXPIRY = "24h";

router.post("/login", loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass) {
    return res.status(503).json({ error: "Admin authentication not configured on this server" });
  }

  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ role: "admin", sub: username }, TOKEN_EXPIRY);
  const refreshToken = signToken({ role: "admin", sub: username, type: "refresh" }, REFRESH_EXPIRY);
  return res.json({ success: true, data: { token, refreshToken, expiresIn: 3600 } });
});

router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  try {
    const decoded = require("../middleware/auth").verifyToken(refreshToken);
    if (decoded.type !== "refresh") {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    const token = signToken({ role: "admin", sub: decoded.sub }, TOKEN_EXPIRY);
    res.json({
      success: true,
      data: { token, expiresIn: 3600 },
    });
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

router.get("/me", adminRequired, (req, res) => {
  res.json({
    success: true,
    data: {
      username: req.admin.sub,
      role: req.admin.role,
    },
  });
});

router.get("/audit-log", adminRequired, async (req, res, next) => {
  try {
    const { actor, action, page = "1", pageSize = "50" } = req.query;
    const where = [];
    const values = [];

    if (actor && typeof actor === "string") {
      values.push(actor);
      where.push(`actor = $${values.length}`);
    }
    if (action && typeof action === "string") {
      values.push(action);
      where.push(`action = $${values.length}`);
    }

    const limit = Math.min(Number.parseInt(pageSize, 10) || 50, 200);
    const offset = (Math.max(Number.parseInt(page, 10) || 1, 1) - 1) * limit;
    values.push(limit, offset);

    // eslint-disable-next-line sql-injection/no-sql-injection
    let query = "SELECT id, actor, action, target_type, target_id, metadata, ip_address, created_at FROM admin_audit_log";
    if (where.length) {
      // eslint-disable-next-line sql-injection/no-sql-injection
      query += " WHERE " + where.join(" AND ");
    }
    query += ` ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;

    // eslint-disable-next-line sql-injection/no-sql-injection
    const result = await pool.query(query, values);

    let countQuery = "SELECT COUNT(*) AS total FROM admin_audit_log";
    if (where.length) {
      // eslint-disable-next-line sql-injection/no-sql-injection
      countQuery += " WHERE " + where.join(" AND ");
    }
    // eslint-disable-next-line sql-injection/no-sql-injection
    const countResult = await pool.query(countQuery, values.slice(0, -2));

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      pageSize: limit,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
