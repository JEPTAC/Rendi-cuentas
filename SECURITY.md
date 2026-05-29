# Seguridad del aplicativo

## Datos públicos

El SDK de Firebase Web contiene `apiKey`, `authDomain` y otros datos públicos. Eso no equivale a credenciales de administrador. La seguridad real está en:

- Firebase Auth.
- Firestore Rules.
- Backend API con Firebase Admin SDK.
- Variables de entorno privadas en Vercel.
- App Check.
- Reglas de mínimo privilegio.

## Acceso por rol

- El Super Admin puede leer y escribir todas las solicitudes.
- Cada responsable solo puede leer solicitudes con `assignedTo == responsibleId`.
- El responsable no puede reasignar solicitudes.
- El responsable no puede borrar solicitudes.
- La ciudadanía no lee Firestore directamente.

## Consulta pública

La consulta pública usa API:

- Con solo radicado: muestra estado general.
- Con radicado + token: muestra solicitud y respuesta completa.

Esto evita que una persona consulte datos de otra solo adivinando el radicado.

## Variables que nunca deben subirse

- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- JSON completo de service account.
- Tokens de APIs de correo, WhatsApp o SMS.

## Recomendaciones de endurecimiento

- Activar App Check antes de producción.
- Restringir dominios autorizados en Firebase Auth.
- Usar contraseñas temporales fuertes y obligar cambio manual.
- Usar 2FA en las cuentas de GitHub, Vercel y Firebase.
- Revisar auditoría después del evento.
- No publicar respuestas con datos sensibles sin revisión.
