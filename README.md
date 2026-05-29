# RindeCuentas San Pedro 2026 - Versión segura para Vercel + Firebase

Aplicativo para rendición de cuentas con:

- Landing pública responsive.
- Reproductor responsive para iframe, Facebook, YouTube, video viejo o live.
- Registro público de preguntas vía API segura.
- Radicado automático `RC-2026-000001`.
- Consulta por radicado + token privado.
- Login interno con Firebase Auth.
- Roles y restricciones en Firestore Rules.
- Super Admin CIO TICs con acceso total.
- Responsables con acceso únicamente a sus solicitudes.
- Gestor del live para actualizar iframe/enlace sin tocar código.
- Creación de usuarios desde panel interno.
- Auditoría básica.

## 1. Orden recomendado

1. Crear repositorio privado en GitHub.
2. Subir todo el contenido de esta carpeta.
3. Importar el repositorio en Vercel.
4. Configurar variables de entorno en Vercel.
5. Publicar reglas de Firestore.
6. Activar Firebase Authentication con Email/Password.
7. Abrir `/`, entrar a `Setup`, crear Super Admin.
8. Ingresar al panel y crear usuarios responsables.

## 2. Variables de entorno en Vercel

Copia las variables de `.env.example` en Vercel:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` opcional al inicio
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `BOOTSTRAP_SECRET`

El `FIREBASE_PRIVATE_KEY` se obtiene del JSON de cuenta de servicio de Firebase Admin SDK. Pégalo en Vercel como variable de entorno; si te queda con saltos `\n`, la app los interpreta correctamente.

## 3. Firebase Authentication

En Firebase Console:

- Authentication > Sign-in method.
- Activar Email/Password.

## 4. Firestore Rules

Copia el contenido de `firestore.rules` en:

- Firebase Console > Firestore Database > Rules.

Publica las reglas.

## 5. Crear Super Admin

Abre la web desplegada en Vercel y entra a:

- Botón inferior `Setup`.
- Ingresa `BOOTSTRAP_SECRET`.
- Crea el acceso del CIO TICs.

Esto crea:

- Juan Esteban Pérez como `super_admin`.
- Responsables base.
- Configuración inicial de Rendición de Cuentas 2026.
- Contador de radicados.

Después de crear el Super Admin, cambia o elimina `BOOTSTRAP_SECRET` en Vercel para endurecer el arranque.

## 6. Roles

- `super_admin`: ve y modifica todo.
- `responsable`: ve únicamente solicitudes asignadas a su `responsibleId`.
- `responsable_alcalde`: funciona como responsable asignable al despacho.
- `moderador`: reservado para siguientes mejoras.

## 7. Video / Live

Desde el panel del Super Admin:

- Gestor del live.
- Pega iframe completo o enlace.
- Guarda.

La actualización se guarda en Firebase y la ven todos los visitantes.

## 8. Seguridad aplicada

- El formulario público no escribe directo a Firestore: pasa por `/api/submit-solicitud`.
- Rate limit básico por IP hasheada.
- Sanitización de texto.
- Firestore Rules con mínimo privilegio.
- Respuestas públicas consultables con radicado + token.
- Variables privadas fuera del código.
- No se permite borrar solicitudes desde cliente.
- Auditoría básica de cambios.

## 9. Pendiente recomendado para fase 2

- App Check con reCAPTCHA v3 o Enterprise.
- Correos automáticos con Resend/SendGrid/Gmail API institucional.
- Exportación Excel desde panel.
- Informe PDF.
- Módulo de moderador en vivo.
- Notificación por WhatsApp/SMS mediante proveedor externo.
