const crypto = require("crypto");

const AUTH_COOKIE = "tobar_session";
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function authIsConfigured() {
  return Boolean(process.env.TALLER_USER && process.env.TALLER_PASSWORD);
}

function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
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

async function readBuffer(request) {
  const chunks = [];
  let total = 0;

  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_PHOTO_BYTES) {
      const error = new Error("La foto supera el tamaño permitido. Intenta con una imagen más liviana.");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function readJson(request) {
  const raw = (await readBuffer(request)).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function cleanName(value) {
  return String(value || "foto-revision.jpg")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function getBlobOptions(extra = {}) {
  const options = { ...extra };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    options.token = process.env.BLOB_READ_WRITE_TOKEN;
  }

  if (process.env.BLOB_STORE_ID) {
    options.storeId = process.env.BLOB_STORE_ID;
  }

  return options;
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

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    sendJson(response, 503, { error: "Falta conectar Vercel Blob al proyecto." });
    return;
  }

  try {
    const { put, del } = await import("@vercel/blob");

    if (request.method === "POST") {
      const contentType = request.headers["content-type"] || "image/jpeg";
      if (!String(contentType).startsWith("image/")) {
        sendJson(response, 400, { error: "Solo se permiten imágenes." });
        return;
      }

      const recordId = cleanName(decodeURIComponent(request.headers["x-record-id"] || "registro"));
      const fileName = cleanName(decodeURIComponent(request.headers["x-file-name"] || "foto-revision.jpg"));
      const body = await readBuffer(request);

      if (!body.length) {
        sendJson(response, 400, { error: "No se recibió ninguna foto." });
        return;
      }

      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const random = crypto.randomBytes(4).toString("hex");
      const pathname = `tobar/revisiones/${recordId}/${stamp}-${random}-${fileName}`;
      const blob = await put(pathname, body, getBlobOptions({
        access: "public",
        contentType,
        addRandomSuffix: false,
      }));

      sendJson(response, 200, {
        photo: {
          id: crypto.randomUUID(),
          url: blob.url,
          pathname: blob.pathname,
          name: fileName,
          size: body.length,
          contentType,
          uploadedAt: new Date().toISOString(),
        },
      });
      return;
    }

    if (request.method === "DELETE") {
      const body = await readJson(request);
      if (!body.url) {
        sendJson(response, 400, { error: "Indica la URL de la foto a eliminar." });
        return;
      }

      await del(body.url, getBlobOptions());
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: "Método no permitido." });
  } catch (error) {
    sendJson(response, error.statusCode || 500, { error: error.message || "No se pudo procesar la foto." });
  }
};
