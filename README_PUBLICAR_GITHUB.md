# Rendición de Cuentas 2026

## Publicar en GitHub Pages

1. Entra a GitHub.
2. Crea un repositorio nuevo.
3. Marca el repositorio como público.
4. Sube el contenido de esta carpeta, no el ZIP.
5. Entra a Settings > Pages.
6. En Source selecciona Deploy from a branch.
7. En Branch selecciona main y carpeta /root.
8. Guarda y espera la URL pública de GitHub Pages.

## Firebase requerido

Activa estos servicios en el proyecto rendi-cuentas:

- Authentication > Sign-in method > Email/Password > Enable.
- Firestore Database > Create database.
- Firestore Database > Rules > pegar firestore.rules.
- Storage > Rules > pegar storage.rules.

En Authentication > Settings > Authorized domains agrega el dominio de GitHub Pages, por ejemplo:

usuario.github.io

## Primer usuario

1. En Firebase entra a Authentication > Users > Add user.
2. Crea el usuario con el correo institucional y una contraseña segura.
3. Abre el usuario creado y copia el UID.
4. Entra a Firestore Database.
5. Crea la colección users.
6. Crea un documento con ID igual al UID copiado.
7. Agrega estos campos:

nombre: string = Juan Esteban Pérez
correo: string = correo del usuario
cargo: string = CIO TICs
dependencia: string = Tecnologías de la Información y las Comunicaciones
role: string = super_admin
responsibleId: string = cio-tics
activo: boolean = true

8. Publica la app en GitHub Pages.
9. Ingresa desde Panel interno con el correo y contraseña creados.
10. Al ingresar como Super Admin, el sistema carga los responsables base.

## Usuarios institucionales

Desde el panel Super Admin se crean los usuarios con:

- Nombre completo.
- Correo electrónico.
- Contraseña temporal.
- Cargo desde lista.
- Dependencia desde lista.
- Rol.
- Estado.

Cada responsable solo ve las solicitudes dirigidas a su responsibleId. El Super Admin ve todas las solicitudes.
