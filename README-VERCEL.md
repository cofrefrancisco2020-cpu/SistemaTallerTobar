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

## Protección del sistema interno

El sistema interno está protegido con autenticación básica si configuras estas variables en Vercel:

- `TALLER_USER`
- `TALLER_PASSWORD`

El archivo que activa esta protección es `middleware.js`. Debe estar en la raíz del repositorio, al mismo nivel que `index.html`.

La protección aplica a todo el sistema:

- `/`
- `/api/records`

## Peso estimado

Los registros del taller son texto y pesan muy poco. Miles de registros normalmente ocupan pocos MB. Las imágenes principales están optimizadas en WebP para reducir el peso del deploy.

## Sobre guardar datos

Vercel publica los archivos como una versión del sistema. Esa versión no es una base de datos editable. Para datos que cambian y deben verse desde celular o computador, se usa Neon Postgres mediante `/api/records`.
