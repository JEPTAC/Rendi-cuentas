import { adminDb } from '../../../lib/firebaseAdmin';
import { cleanText, json } from '../../../lib/security';

export async function POST(request) {
  try {
    const body = await request.json();
    const radicado = cleanText(body.radicado, 30).toUpperCase();
    const token = cleanText(body.token, 120);
    if (!/^RC-2026-\d{6}$/.test(radicado)) return json({ ok: false, message: 'Radicado inválido.' }, 400);

    const snap = await adminDb.collection('solicitudes').doc(radicado).get();
    if (!snap.exists) return json({ ok: false, message: 'No se encontró el radicado.' }, 404);
    const data = snap.data();

    const base = {
      radicado: data.radicado,
      estado: data.estado,
      tema: data.tema,
      tipoSolicitud: data.tipoSolicitud,
      dependenciaAsignada: data.dependenciaAsignada,
      responsableNombre: data.responsableNombre,
      respondidaEnVivo: Boolean(data.respondidaEnVivo),
      minutoLive: data.minutoLive || '',
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null
    };

    if (token && token === data.publicToken) {
      return json({ ok: true, solicitud: {
        ...base,
        mensaje: data.mensaje || '',
        respuestaOficial: data.respuestaOficial || '',
        evidenciaUrl: data.evidenciaUrl || ''
      }});
    }

    return json({ ok: true, limited: true, solicitud: base, message: 'Por seguridad, para ver el texto completo y la respuesta necesitas el token entregado al registrar la solicitud.' });
  } catch (error) {
    return json({ ok: false, message: error.message || 'No se pudo consultar el radicado.' }, 500);
  }
}
