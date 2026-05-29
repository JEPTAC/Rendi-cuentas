import { adminDb, serverTimestamp } from '../../../lib/firebaseAdmin';
import { RESPONSABLES_BASE, TEMAS, TIPOS_PARTICIPANTE, TIPOS_SOLICITUD } from '../../../lib/constants';
import { cleanEmail, cleanPhone, cleanText, hashIp, json, publicToken } from '../../../lib/security';

function getClientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function isValidChoice(value, list) {
  return list.includes(value);
}

async function checkRateLimit(ipHash) {
  const ref = adminDb.collection('rateLimits').doc(ipHash);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const max = 8;
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const start = Number(data.windowStart || 0);
  const count = Number(data.count || 0);

  if (start && now - start < windowMs && count >= max) return false;
  if (!start || now - start >= windowMs) {
    await ref.set({ windowStart: now, count: 1, updatedAt: serverTimestamp() }, { merge: true });
  } else {
    await ref.set({ count: count + 1, updatedAt: serverTimestamp() }, { merge: true });
  }
  return true;
}

export async function POST(request) {
  try {
    const ipHash = hashIp(getClientIp(request));
    const allowed = await checkRateLimit(ipHash);
    if (!allowed) return json({ ok: false, message: 'Has enviado varias solicitudes en poco tiempo. Intenta nuevamente más tarde.' }, 429);

    const body = await request.json();
    const nombreCiudadano = cleanText(body.nombreCiudadano, 120) || 'Ciudadano no identificado';
    const correo = cleanEmail(body.correo);
    const celular = cleanPhone(body.celular);
    const barrioVereda = cleanText(body.barrioVereda, 120);
    const zona = cleanText(body.zona, 40);
    const tipoParticipante = cleanText(body.tipoParticipante, 80);
    const tipoSolicitud = cleanText(body.tipoSolicitud, 80);
    const tema = cleanText(body.tema, 120);
    const assignedTo = cleanText(body.assignedTo, 100);
    const mensaje = cleanText(body.mensaje, 2500);
    const tratamientoDatos = Boolean(body.tratamientoDatos);
    const ubicacionAutorizada = Boolean(body.ubicacionAutorizada);
    const latitud = Number(body.latitud);
    const longitud = Number(body.longitud);

    if (!tratamientoDatos) return json({ ok: false, message: 'Debes aceptar el tratamiento de datos personales para registrar la solicitud.' }, 400);
    if (!barrioVereda || !zona || !mensaje || mensaje.length < 10) return json({ ok: false, message: 'Completa barrio/vereda, zona y una solicitud de mínimo 10 caracteres.' }, 400);
    if (!isValidChoice(tipoParticipante, TIPOS_PARTICIPANTE)) return json({ ok: false, message: 'Tipo de participante inválido.' }, 400);
    if (!isValidChoice(tipoSolicitud, TIPOS_SOLICITUD)) return json({ ok: false, message: 'Tipo de solicitud inválido.' }, 400);
    if (!isValidChoice(tema, TEMAS)) return json({ ok: false, message: 'Tema inválido.' }, 400);

    const responsableSnap = await adminDb.collection('responsables').doc(assignedTo).get();
    if (!responsableSnap.exists || responsableSnap.data().activo === false || responsableSnap.data().asignable === false) {
      return json({ ok: false, message: 'Responsable no válido.' }, 400);
    }
    const responsable = responsableSnap.data();

    const token = publicToken();
    const counterRef = adminDb.collection('counters').doc('radicados_2026');
    const result = await adminDb.runTransaction(async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const current = counterSnap.exists ? Number(counterSnap.data().current || 0) : 0;
      const next = current + 1;
      const radicado = `RC-2026-${String(next).padStart(6, '0')}`;
      const ref = adminDb.collection('solicitudes').doc(radicado);
      tx.set(counterRef, { current: next, updatedAt: serverTimestamp() }, { merge: true });
      tx.set(ref, {
        radicado,
        anio: 2026,
        nombreCiudadano,
        correo,
        celular,
        barrioVereda,
        zona,
        tipoParticipante,
        tipoSolicitud,
        tema,
        assignedTo,
        dependenciaAsignada: responsable.dependencia || '',
        responsableNombre: responsable.nombre || '',
        responsableCargo: responsable.cargo || '',
        mensaje,
        tratamientoDatos: true,
        ubicacionAutorizada,
        latitud: ubicacionAutorizada && Number.isFinite(latitud) ? latitud : null,
        longitud: ubicacionAutorizada && Number.isFinite(longitud) ? longitud : null,
        estado: 'Recibida',
        respondidaEnVivo: false,
        minutoLive: '',
        respuestaOficial: '',
        evidenciaUrl: '',
        publicToken: token,
        ipHash,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      tx.set(adminDb.collection('auditoria').doc(), {
        radicado,
        accion: 'solicitud_recibida',
        actor: 'publico',
        assignedTo,
        fecha: serverTimestamp()
      });
      return { radicado };
    });

    return json({ ok: true, radicado: result.radicado, token, consultaUrl: `/consulta?radicado=${encodeURIComponent(result.radicado)}&token=${encodeURIComponent(token)}` });
  } catch (error) {
    return json({ ok: false, message: error.message || 'No se pudo registrar la solicitud.' }, 500);
  }
}
