# Guía rápida: Firebase + Vercel + GitHub privado

## GitHub privado

1. Crea un repositorio nuevo.
2. Selecciona `Private`.
3. Sube todos los archivos del proyecto.
4. No subas archivos `.env`, `.env.local` ni JSON de cuenta de servicio.

## Vercel

1. Entra a Vercel.
2. Add New Project.
3. Importa el repositorio privado de GitHub.
4. Framework: Next.js.
5. Agrega las variables de entorno.
6. Deploy.

## Firebase Admin SDK

En Firebase Console:

1. Project settings.
2. Service accounts.
3. Generate new private key.
4. Del JSON toma:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

Nunca pegues ese JSON en GitHub.

## Firebase Auth

1. Authentication.
2. Sign-in method.
3. Activar Email/Password.

## Firestore

1. Firestore Database.
2. Crear base de datos.
3. Rules.
4. Pegar `firestore.rules`.
5. Publish.

## App Check recomendado

Cuando ya tengas dominio en Vercel:

1. Firebase Console.
2. App Check.
3. Selecciona Web App.
4. Activa reCAPTCHA v3 o Enterprise.
5. Copia la site key.
6. Ponla en Vercel como `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`.
