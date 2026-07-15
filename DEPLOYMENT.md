# Guía de Despliegue — Aero Panels

Pasos para realizar el despliegue de producción del Panel de Control de Aero en Netlify y Firebase.

## Paso 1: Configurar la Base de Datos Firebase (Firestore)

1. Ve a la [Consola de Firebase](https://console.firebase.google.com/) y selecciona tu proyecto **Aero Panels**.
2. Ve a **Firestore Database** e inicializa la base de datos (elige una región cercana, p. ej. `us-central`).
3. Instala las Firebase Tools en tu computadora:
   ```bash
   npm install -g firebase-tools
   ```
4. Logueate e inicializa tu proyecto en la carpeta actual:
   ```bash
   firebase login
   firebase use --add
   ```
   (Elige el ID de proyecto `aero-panels`).
5. Despliega las reglas de seguridad e índices:
   ```bash
   firebase deploy --only firestore
   ```

## Paso 2: Crear el Sitio en Netlify

1. Sube tu proyecto a un repositorio privado de GitHub, GitLab o Bitbucket.
2. Ingresa a [Netlify](https://www.netlify.com/) y haz clic en **Add new site** -> **Import an existing project**.
3. Conecta el repositorio del proyecto.
4. Ajustes del Build:
   - **Build Command**: `echo 'No build step required'`
   - **Publish directory**: `.` (Directorio raíz)
   - **Functions directory**: `netlify/functions`
5. Haz clic en **Deploy site**.

## Paso 3: Configurar Variables de Entorno en Netlify

Ve a la pestaña de **Site configuration** -> **Environment variables** en tu panel de Netlify y añade las siguientes variables del archivo `.env`:

- `NODE_ENV`: `production`
- `JWT_SECRET`: Una clave aleatoria larga y segura.
- `JWT_EXPIRES_IN`: `24h`
- `TURNSTILE_SITE_KEY`: La Site Key proporcionada por Cloudflare.
- `TURNSTILE_SECRET_KEY`: La Secret Key de Cloudflare.
- `FIREBASE_PROJECT_ID`: `aero-panels`
- `FIREBASE_CLIENT_EMAIL`: El email de tu cuenta de servicio de Firebase.
- `FIREBASE_PRIVATE_KEY`: La private key completa de Firebase. Asegúrate de incluirla entre comillas y con los saltos de línea `\n` correctos si los tiene.

¡Listo! Netlify reconstruirá y desplegará automáticamente cada vez que hagas un push a tu rama principal en Git.
