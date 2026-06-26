# Historial Taller Tobar

Sistema interno independiente para registrar clientes, vehículos, trabajos realizados, observaciones y próximas mantenciones.

Esta es la **versión 2**, que agrega fotografías por revisión/trabajo.

## Cómo usar esta carpeta

Sube **solo esta carpeta** (`sistema-taller-tobar`) a GitHub.

No necesitas subir la carpeta de la página pública.

## Archivos principales

- `index.html`: interfaz del sistema.
- `styles.css`: diseño visual.
- `app.js`: lógica del sistema.
- `assets/`: logo del taller.
- `api/records.js`: API para guardar y leer registros desde base de datos.
- `api/auth.js`: acceso con usuario y contraseña configurados en Vercel.
- `api/photos.js`: API para subir y eliminar fotografías en Vercel Blob.
- `package.json`: dependencias mínimas para Vercel.
- `README-VERCEL.md`: pasos para conectar Vercel y Neon.

## Datos

En local funciona en modo prueba con `localStorage`.

En Vercel, con `DATABASE_URL` configurada, guarda en Neon Postgres para que los datos se vean desde cualquier dispositivo.

Las fotos se guardan en Vercel Blob con `BLOB_READ_WRITE_TOKEN`. Neon solo guarda los enlaces de cada foto para mantener liviana la base de datos.
