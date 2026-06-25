const crypto = require("crypto");

const COOKIE_NAME = "tobar_session";
const SESSION_SECONDS = 60 * 60 * 12;

function authIsConfigured() {
  return Boolean(process.env.TALLER_USER && process.env.TALLER_PASSWORD);
}

function sendJson(response, status, body, headers = {}) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  Object.entries(headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });

  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
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

function createToken() {
  const payload = Buffer.from(
    JSON.stringify({
      user: process.env.TALLER_USER,
      expiresAt: Date.now() + SESSION_SECONDS * 1000,
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (!authIsConfigured() || !token) return !authIsConfigured();

  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.user === process.env.TALLER_USER && Number(data.expiresAt) > Date.now();
  } catch (error) {
    return false;
  }
}

function makeCookie(request, token, maxAge) {
  const host = request.headers.host || "";
  const secure = host.includes("localhost") || host.startsWith("127.") ? "" : "; Secure";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

module.exports = async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const token = parseCookies(request)[COOKIE_NAME];
      sendJson(response, 200, {
        authRequired: authIsConfigured(),
        authenticated: verifyToken(token),
      });
      return;
    }

    if (request.method === "POST") {
      if (!authIsConfigured()) {
        sendJson(response, 200, { ok: true, authRequired: false });
        return;
      }

      const body = await readBody(request);
      const user = String(body.user || "").trim();
      const password = String(body.password || "");

      if (user !== process.env.TALLER_USER || password !== process.env.TALLER_PASSWORD) {
        sendJson(response, 401, { error: "Usuario o contraseña incorrectos." });
        return;
      }

      const token = createToken();
      sendJson(
        response,
        200,
        { ok: true, authRequired: true },
        { "Set-Cookie": makeCookie(request, token, SESSION_SECONDS) }
      );
      return;
    }

    if (request.method === "DELETE") {
      sendJson(response, 200, { ok: true }, { "Set-Cookie": makeCookie(request, "", 0) });
      return;
    }

    sendJson(response, 405, { error: "Método no permitido." });
  } catch (error) {
    sendJson(response, 500, { error: "No se pudo validar el acceso." });
  }
};
