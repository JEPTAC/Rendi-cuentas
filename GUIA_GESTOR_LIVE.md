# Guía rápida: actualizar el live sin tocar código

Esta versión permite pegar el código iframe o enlace del nuevo live desde el panel interno.

## Ruta dentro de la app

1. Abrir la página publicada en GitHub Pages.
2. Entrar a **Panel interno / Super Admin**.
3. Buscar **Gestor rápido del live > Actualizar solo el video**.
4. Pegar el código iframe de Facebook Live Producer o el enlace del video.
5. Seleccionar el estado: Programado, En vivo, Grabación disponible o Cerrado.
6. Clic en **Actualizar live/video**.

## Qué acepta el campo

- iframe completo de Facebook.
- Link de Facebook Live, video o reel público.
- Link de YouTube Live o video viejo.
- Vimeo, Dailymotion, Twitch.
- Google Drive preview.
- Archivo directo MP4/WebM/MOV.
- HLS .m3u8.

## Importante para GitHub Pages

Esta versión guarda el cambio en el navegador donde se hace la prueba. Eso sirve para validar visualmente.

Para que el cambio del live se vea para todos los ciudadanos sin subir archivos de nuevo a GitHub, se debe conectar este mismo campo a una base central, por ejemplo:

- Firebase Firestore.
- Firebase Realtime Database.
- Backend en Vercel.

En producción, el Super Admin pegaría el iframe una sola vez en el panel y todos los visitantes verían el nuevo live.
