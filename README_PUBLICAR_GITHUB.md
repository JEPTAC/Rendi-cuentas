# Rendición de Cuentas 2026 - Versión GitHub Pages

Esta carpeta está lista para publicarse en GitHub Pages sin instalar Node.js.

## Qué incluye

- `index.html`: página principal.
- `styles.css`: diseño visual responsive.
- `app.js`: lógica del aplicativo en JavaScript puro.
- `assets/logo.png`: logo institucional.
- `.nojekyll`: evita que GitHub Pages procese el sitio con Jekyll.

## Importante

Esta versión es una prueba visual y funcional. Guarda la información en el navegador mediante `localStorage`.

Eso quiere decir:

- Sirve para probar el diseño, el formulario, el radicado, el panel interno y el flujo de respuesta.
- No sirve todavía como base de datos real multiusuario.
- Si otra persona entra desde otro computador, no verá las solicitudes registradas en tu navegador.
- Para producción se debe conectar a Firebase/Vercel/Firebase Functions.

## Publicar en GitHub Pages sin Node.js

1. Entra a GitHub.
2. Crea un repositorio nuevo, por ejemplo: `rindecuentas-san-pedro-2026`.
3. Para la prueba inicial, déjalo público si estás usando GitHub Free.
4. Abre el repositorio.
5. Entra a `Add file` > `Upload files`.
6. Sube directamente estos archivos y carpetas:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `assets/`
   - `.nojekyll`
7. Clic en `Commit changes`.
8. Entra a `Settings` > `Pages`.
9. En `Build and deployment`, elige:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
10. Guarda y espera unos minutos.
11. GitHub mostrará una URL parecida a:

```txt
https://TU-USUARIO.github.io/rindecuentas-san-pedro-2026/
```

## Después de aprobar el diseño

La ruta recomendada para producción es:

1. Pasar el repositorio a privado.
2. Desplegar con Vercel desde el repositorio privado.
3. Conectar Firebase Auth.
4. Conectar Firestore.
5. Crear backend seguro para formulario público.
6. Activar notificaciones por correo.
7. Activar auditoría real por usuario.
