# Historial Taller Tobar en Vercel

Esta carpeta es un proyecto independiente. Puedes subir **solo esta carpeta** a GitHub y desplegarla en Vercel.

Proyecto: `sistema-taller-tobar`

Sistema interno: “Historial Taller Tobar”.

## Cómo guarda datos el sistema

La app intenta usar `/api/records`.

- En Vercel, `/api/records` guarda los registros en una base de datos Neon Postgres usando `DATABASE_URL`.
- Si no existe `DATABASE_URL`, la app funciona en modo local con `localStorage` solo para pruebas.

## Base de datos recomendada

Usar Neon Postgres desde Vercel Marketplace.

Pasos:

1. Subir el proyecto a Vercel.
2. En Vercel, ir a Marketplace o Storage.
3. Agregar Neon Postgres al proyecto.
4. Confirmar que Vercel creó la variable `DATABASE_URL`.
5. Volver a desplegar.

La tabla se crea sola la primera vez que el sistema llama a `/api/records`.

## Fotografías por revisión

La versión 2 permite subir fotos en cada registro de trabajo.

Las fotos no se guardan en Neon. Se guardan en Vercel Blob y Neon guarda solo los enlaces.

Variable necesaria:

- `BLOB_READ_WRITE_TOKEN`

Pasos:

1. Entra al proyecto en Vercel.
2. Ve a Storage.
3. Elige Blob.
4. Crea o conecta un Blob Store al proyecto.
5. Confirma que Vercel agregó `BLOB_READ_WRITE_TOKEN` en Environment Variables.
6. Haz Redeploy.

El navegador comprime las fotos antes de subirlas para usar menos espacio.

## Protección del sistema interno

El sistema interno muestra una pantalla de ingreso si configuras estas variables en Vercel:

- `TALLER_USER`
- `TALLER_PASSWORD`

El archivo que valida esta protección es `api/auth.js`.

La protección se aplica a los registros del sistema:

- La interfaz pide usuario y contraseña al abrir.
- `/api/records` no entrega ni guarda registros sin una sesión activa.

## Peso estimado

Los registros del taller son texto y pesan muy poco. Miles de registros normalmente ocupan pocos MB. Las imágenes del sistema quedan en `assets/` para reemplazarlas fácilmente.

Las fotos de revisiones ocupan más espacio, pero esta versión las reduce antes de subirlas. La recomendación es usar fotos de evidencia, no fotos originales pesadas.

## Sobre guardar datos

Vercel publica los archivos como una versión del sistema. Esa versión no es una base de datos editable. Para datos que cambian y deben verse desde celular o computador, se usa Neon Postgres mediante `/api/records`.
