# Rendición de Cuentas 2026 - GitHub Pages

Esta versión es estática y funciona sin Node.js. Ya trae cargado el iframe de prueba de Facebook Live enviado por el usuario:

```html
<iframe src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2FMunicipioSanPedroValle%2Fvideos%2F1558463162283224%2F&width=1280" width="1280" height="720" style="border:none;overflow:hidden" scrolling="no" frameborder="0" allowfullscreen="true" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen="true"></iframe>
```

## Publicar en GitHub Pages

1. Crear un repositorio en GitHub.
2. Subir el contenido de esta carpeta, no el ZIP completo.
3. Ir a **Settings > Pages**.
4. En **Build and deployment**, elegir:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/root**
5. Guardar y esperar unos minutos.

## Archivos que deben subirse

- `index.html`
- `styles.css`
- `app.js`
- `assets/logo.png`
- `.nojekyll`
- Archivos `.md` de guía, si se quieren conservar.

## Nota de prueba

Esta versión usa almacenamiento local del navegador para validar el flujo. Para la versión real se debe conectar a Firebase/Vercel/backend seguro.

Si Facebook bloquea la visualización embebida por permisos, privacidad, restricción del live de prueba o audiencia, la app conserva el botón de respaldo para abrir el enlace original.
