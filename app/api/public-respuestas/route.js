import { adminDb } from '../../../lib/firebaseAdmin';
import { json } from '../../../lib/security';

export async function GET() {
  try {
    const snap = await adminDb.collection('solicitudes')
      .where('respondidaEnVivo', '==', true)
      .orderBy('updatedAt', 'desc')
      .limit(30)
      .get();

    const items = snap.docs.map(doc => {
      const data = doc.data();
      return {
        radicado: data.radicado,
        tema: data.tema,
        tipoSolicitud: data.tipoSolicitud,
        dependenciaAsignada: data.dependenciaAsignada,
        responsableNombre: data.responsableNombre,
        minutoLive: data.minutoLive || '',
        estado: data.estado,
        resumenRespuesta: data.respuestaOficial ? String(data.respuestaOficial).slice(0, 260) : 'Respondida durante la transmisión en vivo.'
      };
    });

    return json({ ok: true, items });
  } catch (error) {
    return json({ ok: false, message: error.message || 'No se pudo cargar el listado público.' }, 500);
  }
}
