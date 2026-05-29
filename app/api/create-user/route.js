import { adminAuth, adminDb, serverTimestamp } from '../../../lib/firebaseAdmin';
import { cleanEmail, cleanText, json, requireSuperAdmin, requireUser, validatePassword } from '../../../lib/security';

const ROLES = new Set(['responsable', 'responsable_alcalde', 'moderador', 'super_admin']);

export async function POST(request) {
  try {
    const profile = await requireUser(request);
    requireSuperAdmin(profile);

    const body = await request.json();
    const email = cleanEmail(body.email);
    const password = String(body.password || '');
    const nombre = cleanText(body.nombre, 120);
    const cargo = cleanText(body.cargo, 160);
    const dependencia = cleanText(body.dependencia, 160);
    const role = cleanText(body.role, 40) || 'responsable';
    const responsibleId = cleanText(body.responsibleId, 80);

    if (!email || !email.includes('@')) return json({ ok: false, message: 'Correo inválido.' }, 400);
    if (!nombre || !cargo || !dependencia || !responsibleId) return json({ ok: false, message: 'Faltan datos obligatorios.' }, 400);
    if (!ROLES.has(role)) return json({ ok: false, message: 'Rol no permitido.' }, 400);
    if (!validatePassword(password)) return json({ ok: false, message: 'La contraseña debe tener mínimo 10 caracteres, mayúscula, minúscula y número.' }, 400);

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(userRecord.uid, { password, displayName: nombre, disabled: false });
    } catch {
      userRecord = await adminAuth.createUser({ email, password, displayName: nombre, disabled: false });
    }

    await adminAuth.setCustomUserClaims(userRecord.uid, { role, responsibleId });

    const batch = adminDb.batch();
    batch.set(adminDb.collection('users').doc(userRecord.uid), {
      uid: userRecord.uid,
      email,
      nombre,
      cargo,
      dependencia,
      role,
      responsibleId,
      activo: true,
      createdBy: profile.uid,
      updatedAt: serverTimestamp()
    }, { merge: true });

    batch.set(adminDb.collection('responsables').doc(responsibleId), {
      id: responsibleId,
      nombre,
      cargo,
      dependencia,
      activo: true,
      asignable: true,
      updatedAt: serverTimestamp()
    }, { merge: true });

    batch.set(adminDb.collection('auditoria').doc(), {
      accion: 'crear_actualizar_usuario',
      usuarioUid: profile.uid,
      usuarioNombre: profile.nombre,
      objetivoUid: userRecord.uid,
      objetivoEmail: email,
      fecha: serverTimestamp()
    });

    await batch.commit();
    return json({ ok: true, message: 'Usuario creado o actualizado.', uid: userRecord.uid });
  } catch (error) {
    const status = /autorizado|Super Admin|inactivo/i.test(error.message) ? 403 : 500;
    return json({ ok: false, message: error.message || 'Error al crear usuario.' }, status);
  }
}
