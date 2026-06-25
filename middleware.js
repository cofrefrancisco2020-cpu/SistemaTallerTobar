export default function middleware(request) {
  const user = process.env.TALLER_USER;
  const password = process.env.TALLER_PASSWORD;

  // If credentials are not configured yet, do not block local previews.
  if (!user || !password) {
    return;
  }

  const auth = request.headers.get("authorization");

  if (!auth || !auth.startsWith("Basic ")) {
    return new Response("Acceso restringido", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Historial Taller Tobar"',
      },
    });
  }

  const encoded = auth.replace("Basic ", "");
  const [inputUser, inputPassword] = atob(encoded).split(":");

  if (inputUser !== user || inputPassword !== password) {
    return new Response("Acceso restringido", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Historial Taller Tobar"',
      },
    });
  }
}

export const config = {
  matcher: ["/((?!api/records).*)"],
};
