const crypto = require("crypto");

const AUTH_COOKIE = "tobar_session";

let cachedSql = null;
let schemaReady = false;

async function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está configurada.");
  }

  if (!cachedSql) {
    const { neon } = await import("@neondatabase/serverless");
    cachedSql = neon(process.env.DATABASE_URL);
  }

  return cachedSql;
}

async function ensureSchema(sql) {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS workshop_records (
      id TEXT PRIMARY KEY,
      patent_normalized TEXT NOT NULL,
      client_name TEXT,
      intake_date DATE,
      next_maintenance_date DATE,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS workshop_records_patent_idx
    ON workshop_records (patent_normalized)
  `;

  schemaReady = true;
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function authIsConfigured() {
  return Boolean(process.env.TALLER_USER && process.env.TALLER_PASSWORD);
}

function parseCookies(request) {
  const raw = request.headers.cookie || "";
  return Object.fromEntries(
    raw
      .split(";")
      .map((item) => item.trim().split("="))
      .filter(([key, value]) => key && value)
  );
}

function sign(value) {
  return crypto.createHmac("sha256", process.env.TALLER_PASSWORD).update(value).digest("base64url");
}

function verifyToken(token) {
  if (!authIsConfigured()) return true;
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.user === process.env.TALLER_USER && Number(data.expiresAt) > Date.now();
  } catch (error) {
    return false;
  }
}

function isAuthorized(request) {
  return verifyToken(parseCookies(request)[AUTH_COOKIE]);
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function normalizeDate(value) {
  return value || null;
}

function normalizeText(value) {
  return value || null;
}

async function upsertRecord(sql, record) {
  if (!record?.id || !record?.patentNormalized) {
    const error = new Error("El registro necesita id y patente.");
    error.statusCode = 400;
    throw error;
  }

  await sql`
    INSERT INTO workshop_records (
      id,
      patent_normalized,
      client_name,
      intake_date,
      next_maintenance_date,
      data,
      updated_at
    )
    VALUES (
      ${record.id},
      ${record.patentNormalized},
      ${normalizeText(record.clientName)},
      ${normalizeDate(record.intakeDate)},
      ${normalizeDate(record.nextMaintenanceDate)},
      ${JSON.stringify(record)}::jsonb,
      NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
      patent_normalized = EXCLUDED.patent_normalized,
      client_name = EXCLUDED.client_name,
      intake_date = EXCLUDED.intake_date,
      next_maintenance_date = EXCLUDED.next_maintenance_date,
      data = EXCLUDED.data,
      updated_at = NOW()
  `;
}

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: "Acceso no autorizado.", authRequired: true });
    return;
  }

  try {
    const sql = await getSql();
    await ensureSchema(sql);

    if (request.method === "GET") {
      const rows = await sql`
        SELECT data
        FROM workshop_records
        ORDER BY intake_date DESC NULLS LAST, updated_at DESC
      `;
      sendJson(response, 200, { records: rows.map((row) => row.data) });
      return;
    }

    if (request.method === "POST") {
      const body = await readBody(request);
      await upsertRecord(sql, body.record);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "DELETE") {
      const url = new URL(request.url, "http://localhost");
      const id = url.searchParams.get("id");
      const patent = url.searchParams.get("patent");

      if (id) {
        await sql`DELETE FROM workshop_records WHERE id = ${id}`;
        sendJson(response, 200, { ok: true });
        return;
      }

      if (patent) {
        await sql`DELETE FROM workshop_records WHERE patent_normalized = ${patent}`;
        sendJson(response, 200, { ok: true });
        return;
      }

      sendJson(response, 400, { error: "Indica id o patente para eliminar." });
      return;
    }

    sendJson(response, 405, { error: "Método no permitido." });
  } catch (error) {
    const status = error.statusCode || (String(error.message).includes("DATABASE_URL") ? 503 : 500);
    sendJson(response, status, {
      error: error.message || "Error interno",
      mode: "database_unavailable",
    });
  }
};
