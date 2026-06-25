# Historial Taller Tobar

Sistema interno independiente para registrar clientes, vehículos, trabajos realizados, observaciones y próximas mantenciones.

## Cómo usar esta carpeta

Sube **solo esta carpeta** (`sistema-taller-tobar`) a GitHub.

No necesitas subir la carpeta de la página pública.

## Archivos principales

- `index.html`: interfaz del sistema.
- `styles.css`: diseño visual.
- `app.js`: lógica del sistema.
- `assets/`: logo del taller.
- `api/records.js`: API para guardar y leer registros desde base de datos.
- `middleware.js`: protección con usuario y contraseña en Vercel.
- `package.json`: dependencias mínimas para Vercel.
- `README-VERCEL.md`: pasos para conectar Vercel y Neon.

## Datos

En local funciona en modo prueba con `localStorage`.

En Vercel, con `DATABASE_URL` configurada, guarda en Neon Postgres para que los datos se vean desde cualquier dispositivo.
