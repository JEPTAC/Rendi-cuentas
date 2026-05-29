# Corrección de registro ciudadano

Esta versión muestra el error técnico real de Firebase si el registro de una solicitud falla.

Si aparece `permission-denied`, revisar:

1. Las reglas deben estar publicadas en Firestore Database > Rules del proyecto `rendi-cuentas`.
2. No pegarlas en Realtime Database ni Storage.
3. App Check no debe estar en modo obligatorio para Firestore mientras se usa GitHub Pages sin App Check.
4. Si el usuario inició sesión, debe tener documento en `users/{UID}` con `activo: true`.

Después de subir esta versión, recarga con Ctrl + F5.
