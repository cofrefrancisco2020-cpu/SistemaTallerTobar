import { next } from "@vercel/functions";

const protectedPaths = ["/", "/api/records"];

function isProtectedPath(pathname) {
  if (pathname.startsWith("/assets/")) return true;
  if (pathname === "/styles.css" || pathname === "/app.js") return true;
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function unauthorized() {
  return new Response("Acceso restringido", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Historial Taller Tobar"',
    },
  });
}

export default function middleware(request) {
  const { pathname } = new URL(request.url);

  if (!isProtectedPath(pathname)) {
    return next();
  }

  const expectedUser = process.env.TALLER_USER;
  const expectedPassword = process.env.TALLER_PASSWORD;

  // Without credentials configured, local previews stay usable, but production should set these env vars.
  if (!expectedUser || !expectedPassword) {
    return next();
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return unauthorized();
  }

  const encoded = authorization.slice("Basic ".length);
  const [user, password] = atob(encoded).split(":");

  if (user !== expectedUser || password !== expectedPassword) {
    return unauthorized();
  }

  return next();
}

export const config = {
  matcher: ["/:path*"],
};
