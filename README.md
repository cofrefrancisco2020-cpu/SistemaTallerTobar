# Historial Taller Tobar

Sistema interno independiente para registrar clientes, vehículos, trabajos realizados, observaciones y próximas mantenciones.

Esta es la **versión 3**.

Incluye las fotografías por revisión/trabajo de la versión 2 y agrega mensajes rápidos de WhatsApp para próximas mantenciones.

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

Las fotos se guardan en Vercel Blob. Neon solo guarda los enlaces de cada foto para mantener liviana la base de datos.

En la sección de próximas mantenciones, el botón `WhatsApp` abre un mensaje listo para enviar al cliente con la fecha y recomendación registrada por el taller.
