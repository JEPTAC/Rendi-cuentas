import { adminAuth, adminDb, serverTimestamp } from '../../../lib/firebaseAdmin';
import { RESPONSABLES_BASE, CONFIG_DOC_ID } from '../../../lib/constants';
import { cleanEmail, cleanText, json, validatePassword } from '../../../lib/security';

export async function POST(request) {
  try {
    const body = await request.json();
    const secret = cleanText(body.secret, 240);
    if (!process.env.BOOTSTRAP_SECRET || secret !== process.env.BOOTSTRAP_SECRET) {
      return json({ ok: false, message: 'Clave de arranque inválida.' }, 403);
    }

    const email = cleanEmail(body.email);
    const password = String(body.password || '');
    if (!email || !email.includes('@')) return json({ ok: false, message: 'Correo inválido.' }, 400);
    if (!validatePassword(password)) {
      return json({ ok: false, message: 'La contraseña debe tener mínimo 10 caracteres, mayúscula, minúscula y número.' }, 400);
    }

    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(userRecord.uid, {
        password,
        displayName: 'Juan Esteban Pérez',
        emailVerified: false,
        disabled: false
      });
    } catch {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: 'Juan Esteban Pérez',
        disabled: false
      });
    }

    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: 'super_admin',
      responsibleId: 'cio-tics'
    });

    const batch = adminDb.batch();
    for (const responsable of RESPONSABLES_BASE) {
      const ref = adminDb.collection('responsables').doc(responsable.id);
      batch.set(ref, {
        ...responsable,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    batch.set(adminDb.collection('users').doc(userRecord.uid), {
      uid: userRecord.uid,
      email,
      nombre: 'Juan Esteban Pérez',
      cargo: 'CIO TICs',
      dependencia: 'Tecnologías de la Información y las Comunicaciones',
      role: 'super_admin',
      responsibleId: 'cio-tics',
      activo: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    batch.set(adminDb.collection('config').doc(CONFIG_DOC_ID), {
      anio: 2026,
      nombre: 'Rendición de Cuentas 2026',
      entidad: 'Alcaldía Municipal de San Pedro Valle',
      estado: 'Programada',
      liveInput: '',
      liveEmbedUrl: '',
      liveExternalUrl: '',
      livePlatform: 'Sin transmisión',
      liveMessage: 'Aún no se ha configurado la transmisión.',
      updatedAt: serverTimestamp()
    }, { merge: true });

    batch.set(adminDb.collection('counters').doc('radicados_2026'), {
      current: 0,
      updatedAt: serverTimestamp()
    }, { merge: true });

    await batch.commit();

    return json({ ok: true, message: 'Super Admin creado y responsables base cargados.', uid: userRecord.uid });
  } catch (error) {
    return json({ ok: false, message: error.message || 'Error al crear Super Admin.' }, 500);
  }
}
