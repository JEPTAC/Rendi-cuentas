'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db, startAppCheck } from '../lib/firebaseClient';
import { CONFIG_DOC_ID, ESTADOS, TEMAS, TIPOS_PARTICIPANTE, TIPOS_SOLICITUD } from '../lib/constants';

const DEFAULT_CONFIG = {
  nombre: 'Rendición de Cuentas 2026',
  entidad: 'Alcaldía Municipal de San Pedro Valle',
  estado: 'Programada',
  liveInput: '',
  liveEmbedUrl: '',
  liveExternalUrl: '',
  livePlatform: 'Sin transmisión',
  liveMessage: 'Aún no se ha configurado la transmisión.'
};

function formatDate(value) {
  if (!value) return '-';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function cleanVideoId(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').trim();
}

function extractIframeSrc(raw) {
  const text = String(raw || '').trim();
  const match = text.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match ? match[1].replaceAll('&amp;', '&') : text;
}

function normalizeUrl(raw) {
  let text = extractIframeSrc(raw).trim();
  if (!text) return '';
  if (/^\/\//.test(text)) text = `https:${text}`;
  if (/^www\./i.test(text)) text = `https://${text}`;
  return text;
}

function resolveVideoSource(raw) {
  const original = String(raw || '').trim();
  const url = normalizeUrl(original);
  if (!url) return { kind: 'empty', src: '', externalUrl: '', platform: 'Sin transmisión', message: 'Aún no se ha configurado la transmisión.' };

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return { kind: 'external', src: '', externalUrl: url, platform: 'Enlace no permitido', message: 'Solo se permiten enlaces http o https.' };
    const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '').replace(/^web\./, '').toLowerCase();
    const parts = parsed.pathname.split('/').filter(Boolean);
    const path = parsed.pathname.toLowerCase();

    if (/\.(mp4|webm|ogv|ogg|mov)($|\?)/.test(path)) return { kind: 'video', src: url, externalUrl: url, platform: 'Archivo de video', message: 'Video directo detectado.' };

    if (host === 'youtu.be' && parts[0]) return { kind: 'iframe', src: `https://www.youtube.com/embed/${cleanVideoId(parts[0])}?rel=0`, externalUrl: url, platform: 'YouTube', message: 'Video de YouTube detectado.' };
    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      const watchId = cleanVideoId(parsed.searchParams.get('v'));
      if (watchId) return { kind: 'iframe', src: `https://www.youtube.com/embed/${watchId}?rel=0`, externalUrl: url, platform: 'YouTube', message: 'Video o live de YouTube detectado.' };
      if (parts[0] === 'embed' && parts[1]) return { kind: 'iframe', src: url, externalUrl: `https://www.youtube.com/watch?v=${cleanVideoId(parts[1])}`, platform: 'YouTube', message: 'Código embed de YouTube detectado.' };
      if (parts[0] === 'shorts' && parts[1]) return { kind: 'iframe', src: `https://www.youtube.com/embed/${cleanVideoId(parts[1])}?rel=0`, externalUrl: url, platform: 'YouTube Shorts', message: 'Short de YouTube detectado.' };
      const liveIndex = parts.indexOf('live');
      if (liveIndex >= 0 && parts[liveIndex + 1]) return { kind: 'iframe', src: `https://www.youtube.com/embed/${cleanVideoId(parts[liveIndex + 1])}?rel=0`, externalUrl: url, platform: 'YouTube Live', message: 'Transmisión de YouTube detectada.' };
    }

    if (host.endsWith('facebook.com') || host === 'fb.watch') {
      if (parsed.pathname.includes('/plugins/video.php') || parsed.pathname.includes('/plugins/post.php')) {
        const href = parsed.searchParams.get('href') || url;
        return { kind: 'iframe', src: url, externalUrl: href, platform: 'Facebook', message: 'Código embed oficial de Facebook detectado.' };
      }
      return { kind: 'iframe', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=1280`, externalUrl: url, platform: 'Facebook', message: 'Enlace de Facebook convertido al reproductor oficial.' };
    }

    if (host.endsWith('vimeo.com')) {
      const id = cleanVideoId(parts.find(part => /^\d+$/.test(part)) || '');
      if (id) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}`, externalUrl: url, platform: 'Vimeo', message: 'Video de Vimeo detectado.' };
    }

    if (host.endsWith('drive.google.com')) {
      const fileIndex = parts.indexOf('d');
      if (parts[0] === 'file' && fileIndex >= 0 && parts[fileIndex + 1]) return { kind: 'iframe', src: `https://drive.google.com/file/d/${encodeURIComponent(parts[fileIndex + 1])}/preview`, externalUrl: url, platform: 'Google Drive', message: 'Vista previa de Google Drive detectada.' };
    }

    return { kind: 'iframe', src: url, externalUrl: url, platform: 'Enlace universal', message: 'Intento de reproducción universal. Si el origen bloquea iframe, usa el enlace externo.' };
  } catch {
    return { kind: 'external', src: '', externalUrl: url, platform: 'Enlace externo', message: 'No se pudo convertir el texto a reproductor.' };
  }
}

function VideoPlayer({ config }) {
  const source = useMemo(() => {
    if (config?.liveEmbedUrl) return { kind: 'iframe', src: config.liveEmbedUrl, externalUrl: config.liveExternalUrl, platform: config.livePlatform, message: config.liveMessage };
    return resolveVideoSource(config?.liveInput);
  }, [config]);

  return (
    <div className="video-card live-fade-in">
      <div className="video-status"><span className="pulse-dot" />{config?.estado || 'Programada'}</div>
      <div className="video-frame">
        {source.kind === 'iframe' && <iframe title="Transmisión Rendición de Cuentas 2026" src={source.src} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" allowFullScreen loading="lazy" />}
        {source.kind === 'video' && <video src={source.src} controls playsInline />}
        {source.kind === 'empty' && <div className="video-placeholder"><strong>Transmisión pendiente</strong><span>{source.message}</span></div>}
        {source.kind === 'external' && <div className="video-placeholder"><strong>Enlace externo</strong><span>{source.message}</span></div>}
      </div>
      <div className="video-footer"><strong>{source.platform || 'Video'}:</strong><span>{source.message || 'Reproductor configurado.'}</span>{source.externalUrl && <a href={source.externalUrl} target="_blank" rel="noreferrer">Abrir enlace original</a>}</div>
    </div>
  );
}

function PublicHome({ config, responsables, setView, publicResponses }) {
  return (
    <>
      <section className="hero-shell">
        <div className="hero-left">
          <img src="/assets/logo.png" alt="Logo Alcaldía Municipal de San Pedro Valle" className="brand-logo" />
          <p className="eyebrow">{config.entidad || DEFAULT_CONFIG.entidad}</p>
          <h1>{config.nombre || DEFAULT_CONFIG.nombre}</h1>
          <p className="hero-copy">Participa en vivo, registra preguntas, dudas, inquietudes, peticiones o propuestas, y consulta la respuesta oficial mediante radicado seguro.</p>
          <div className="hero-actions">
            <button className="btn primary" onClick={() => setView('registro')}>Registrar pregunta</button>
            <button className="btn ghost" onClick={() => setView('consulta')}>Consultar respuesta</button>
            <button className="btn ghost strong" onClick={() => setView('login')}>Panel interno</button>
          </div>
          <div className="trust-row">
            <span>Radicado automático</span><span>Trazabilidad institucional</span><span>Acceso por roles</span>
          </div>
        </div>
        <VideoPlayer config={config} />
      </section>

      <section className="cards-grid compact">
        <div className="info-card"><strong>Responsables asignables</strong><span>{responsables.length} funcionarios cargados</span></div>
        <div className="info-card"><strong>Consulta segura</strong><span>Radicado + token privado</span></div>
        <div className="info-card"><strong>Video responsive</strong><span>Facebook, YouTube, iframe o enlace externo</span></div>
      </section>

      <section className="panel-card">
        <div className="section-title"><h2>Preguntas respondidas en vivo</h2><p>Listado público de solicitudes marcadas como respondidas durante la transmisión.</p></div>
        {publicResponses.length === 0 ? <p className="empty">Aún no hay preguntas marcadas como respondidas en vivo.</p> : <div className="public-response-list">{publicResponses.map(item => <div className="public-response" key={item.radicado}><strong>{item.radicado}</strong><span>{item.tema} · {item.dependenciaAsignada}</span><p>{item.resumenRespuesta}</p>{item.minutoLive && <em>Minuto del live: {item.minutoLive}</em>}</div>)}</div>}
      </section>
    </>
  );
}

function Registro({ responsables, setView }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    nombreCiudadano: '', correo: '', celular: '', barrioVereda: '', zona: 'Urbana', tipoParticipante: TIPOS_PARTICIPANTE[0], tipoSolicitud: TIPOS_SOLICITUD[0], tema: TEMAS[0], assignedTo: responsables[0]?.id || '', mensaje: '', tratamientoDatos: false, ubicacionAutorizada: false, latitud: null, longitud: null
  });

  useEffect(() => {
    if (!form.assignedTo && responsables[0]?.id) setForm(prev => ({ ...prev, assignedTo: responsables[0].id }));
  }, [responsables, form.assignedTo]);

  async function requestLocation() {
    if (!navigator.geolocation) return alert('Este navegador no permite geolocalización.');
    navigator.geolocation.getCurrentPosition(
      pos => setForm(prev => ({ ...prev, ubicacionAutorizada: true, latitud: pos.coords.latitude, longitud: pos.coords.longitude })),
      () => alert('No fue posible obtener la ubicación. Puedes registrar la solicitud sin ubicación.')
    );
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/submit-solicitud', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!data.ok) throw new Error(data.message || 'No se pudo registrar.');
      setResult(data);
    } catch (error) {
      setResult({ ok: false, message: error.message });
    } finally {
      setLoading(false);
    }
  }

  if (result?.ok) {
    return <section className="panel-card success-card"><h2>Solicitud registrada</h2><p>Tu radicado es:</p><div className="radicado-box">{result.radicado}</div><p className="warning-text">Guarda este token para consultar el detalle completo de la respuesta:</p><code className="token-box">{result.token}</code><div className="actions-row"><button className="btn primary" onClick={() => setView('consulta')}>Consultar respuesta</button><button className="btn ghost" onClick={() => setView('publico')}>Volver al inicio</button></div></section>;
  }

  return (
    <section className="panel-card form-panel">
      <div className="section-title"><h2>Registrar participación ciudadana</h2><p>La solicitud quedará con radicado, hora, responsable y trazabilidad.</p></div>
      <form onSubmit={submit} className="form-grid">
        <label>Nombre completo<input value={form.nombreCiudadano} onChange={e => setForm({ ...form, nombreCiudadano: e.target.value })} placeholder="Nombre del ciudadano" /></label>
        <label>Correo electrónico<input type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} placeholder="correo@ejemplo.com" /></label>
        <label>Celular<input value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} placeholder="Opcional" /></label>
        <label>Barrio o vereda<input required value={form.barrioVereda} onChange={e => setForm({ ...form, barrioVereda: e.target.value })} /></label>
        <label>Zona<select value={form.zona} onChange={e => setForm({ ...form, zona: e.target.value })}><option>Urbana</option><option>Rural</option></select></label>
        <label>Tipo de participante<select value={form.tipoParticipante} onChange={e => setForm({ ...form, tipoParticipante: e.target.value })}>{TIPOS_PARTICIPANTE.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Tipo de solicitud<select value={form.tipoSolicitud} onChange={e => setForm({ ...form, tipoSolicitud: e.target.value })}>{TIPOS_SOLICITUD.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Tema<select value={form.tema} onChange={e => setForm({ ...form, tema: e.target.value })}>{TEMAS.map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Dirigida a<select value={form.assignedTo} onChange={e => setForm({ ...form, assignedTo: e.target.value })}>{responsables.map(r => <option key={r.id} value={r.id}>{r.cargo} — {r.nombre}</option>)}</select></label>
        <label className="full">Pregunta, duda, inquietud, petición o propuesta<textarea required minLength="10" rows="6" value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })} /></label>
        <label className="check full"><input type="checkbox" checked={form.tratamientoDatos} onChange={e => setForm({ ...form, tratamientoDatos: e.target.checked })} required /> Autorizo el tratamiento de mis datos personales para gestionar mi participación en la Rendición de Cuentas 2026, responder mi solicitud y realizar trazabilidad institucional.</label>
        <div className="full geolocation-box"><button type="button" className="btn ghost" onClick={requestLocation}>Autorizar ubicación aproximada</button><span>{form.ubicacionAutorizada ? 'Ubicación capturada con autorización.' : 'Opcional. Solo se captura si el ciudadano autoriza.'}</span></div>
        {result?.ok === false && <p className="error full">{result.message}</p>}
        <div className="actions-row full"><button className="btn primary" disabled={loading}>{loading ? 'Registrando...' : 'Registrar solicitud'}</button><button type="button" className="btn ghost" onClick={() => setView('publico')}>Volver</button></div>
      </form>
    </section>
  );
}

function Consulta({ setView }) {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const [radicado, setRadicado] = useState(params.get('radicado') || '');
  const [token, setToken] = useState(params.get('token') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/public-consulta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ radicado, token }) });
      setResult(await response.json());
    } catch (error) {
      setResult({ ok: false, message: error.message });
    } finally {
      setLoading(false);
    }
  }

  return <section className="panel-card form-panel"><div className="section-title"><h2>Consultar respuesta</h2><p>Por seguridad, el radicado muestra estado general; el token permite ver detalle completo.</p></div><form onSubmit={submit} className="form-grid narrow"><label>Radicado<input value={radicado} onChange={e => setRadicado(e.target.value.toUpperCase())} placeholder="RC-2026-000001" required /></label><label>Token seguro<input value={token} onChange={e => setToken(e.target.value)} placeholder="Pega el token recibido" /></label><div className="actions-row full"><button className="btn primary" disabled={loading}>{loading ? 'Consultando...' : 'Consultar'}</button><button type="button" className="btn ghost" onClick={() => setView('publico')}>Volver</button></div></form>{result && <div className={`result-card ${result.ok ? '' : 'danger'}`}>{result.ok ? <SolicitudPublica solicitud={result.solicitud} limited={result.limited} message={result.message} /> : <p>{result.message}</p>}</div>}</section>;
}

function SolicitudPublica({ solicitud, limited, message }) {
  return <><h3>{solicitud.radicado}</h3><div className="status-line"><span>{solicitud.estado}</span><span>{solicitud.dependenciaAsignada}</span><span>{solicitud.respondidaEnVivo ? 'Respondida en vivo' : 'Respuesta escrita'}</span></div>{limited && <p className="warning-text">{message}</p>}{solicitud.mensaje && <><strong>Solicitud</strong><p>{solicitud.mensaje}</p></>}{solicitud.respuestaOficial && <><strong>Respuesta oficial</strong><p>{solicitud.respuestaOficial}</p></>}{solicitud.minutoLive && <p><strong>Minuto del live:</strong> {solicitud.minutoLive}</p>}{solicitud.evidenciaUrl && <a href={solicitud.evidenciaUrl} target="_blank" rel="noreferrer">Ver evidencia o soporte</a>}</>;
}

function Login({ user, setView }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setError('');
    try { await signInWithEmailAndPassword(auth, email, password); setView('panel'); } catch { setError('No fue posible iniciar sesión. Revisa correo, contraseña o permisos.'); }
  }
  if (user) return <section className="panel-card"><h2>Sesión activa</h2><p>Ya puedes entrar al panel interno.</p><button className="btn primary" onClick={() => setView('panel')}>Ir al panel</button></section>;
  return <section className="panel-card form-panel"><div className="section-title"><h2>Panel interno</h2><p>Ingreso seguro para Super Admin y responsables.</p></div><form onSubmit={submit} className="form-grid narrow"><label>Correo institucional<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label><label>Contraseña<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>{error && <p className="error full">{error}</p>}<div className="actions-row full"><button className="btn primary">Ingresar</button><button type="button" className="btn ghost" onClick={() => setView('publico')}>Volver</button></div></form></section>;
}

function Setup({ setView }) {
  const [form, setForm] = useState({ secret: '', email: '', password: '' });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e.preventDefault(); setLoading(true); setResult(null);
    try {
      const response = await fetch('/api/bootstrap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json(); setResult(data);
    } catch (error) { setResult({ ok: false, message: error.message }); } finally { setLoading(false); }
  }
  return <section className="panel-card form-panel"><div className="section-title"><h2>Arranque seguro del sistema</h2><p>Crea el primer Super Admin: Juan Esteban Pérez / CIO TICs. Usa la clave BOOTSTRAP_SECRET configurada en Vercel.</p></div><form onSubmit={submit} className="form-grid narrow"><label>Clave de arranque<input value={form.secret} onChange={e => setForm({ ...form, secret: e.target.value })} required /></label><label>Correo del Super Admin<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label><label>Contraseña segura<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></label>{result && <p className={`${result.ok ? 'success' : 'error'} full`}>{result.message}</p>}<div className="actions-row full"><button className="btn primary" disabled={loading}>{loading ? 'Creando...' : 'Crear Super Admin'}</button><button type="button" className="btn ghost" onClick={() => setView('login')}>Ir a login</button></div></form></section>;
}

function Panel({ user, profile, setView, config, responsables }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [tab, setTab] = useState('respuestas');
  const [error, setError] = useState('');
  const isAdmin = profile?.role === 'super_admin';

  useEffect(() => {
    if (!profile) return;
    setError('');
    const base = collection(db, 'solicitudes');
    const q = isAdmin
      ? query(base, orderBy('createdAt', 'desc'), limit(300))
      : query(base, where('assignedTo', '==', profile.responsibleId), orderBy('createdAt', 'desc'), limit(150));
    const unsub = onSnapshot(q, snap => setSolicitudes(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => setError(err.message));
    return () => unsub();
  }, [profile, isAdmin]);

  if (!user) return <section className="panel-card"><h2>Debes iniciar sesión</h2><button className="btn primary" onClick={() => setView('login')}>Ingresar</button></section>;
  if (!profile) return <section className="panel-card"><h2>Cargando perfil autorizado...</h2><p>Si tarda, revisa que el usuario tenga perfil en Firestore.</p></section>;

  const mine = solicitudes.filter(s => s.assignedTo === profile.responsibleId);

  return <section className="panel-card internal-panel"><div className="internal-header"><div><p className="eyebrow">Panel interno seguro</p><h2>{isAdmin ? 'Super Admin / CIO TICs' : 'Mis respuestas'}</h2><p>{profile.nombre} · {profile.cargo}</p></div><button className="btn ghost" onClick={async () => { await signOut(auth); setView('publico'); }}>Cerrar sesión</button></div><div className="admin-tabs"><button className={tab === 'respuestas' ? 'active' : ''} onClick={() => setTab('respuestas')}>{isAdmin ? 'Todas las solicitudes' : 'Mis solicitudes'}</button>{isAdmin && <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>Gestor del live</button>}{isAdmin && <button className={tab === 'usuarios' ? 'active' : ''} onClick={() => setTab('usuarios')}>Usuarios y roles</button>}{isAdmin && <button className={tab === 'estadisticas' ? 'active' : ''} onClick={() => setTab('estadisticas')}>Estadísticas</button>}</div>{error && <p className="error">{error}</p>}{tab === 'respuestas' && <SolicitudesTable solicitudes={isAdmin ? solicitudes : mine} responsables={responsables} profile={profile} />}{tab === 'live' && isAdmin && <LiveManager config={config} />}{tab === 'usuarios' && isAdmin && <UserManager responsables={responsables} />}{tab === 'estadisticas' && isAdmin && <Stats solicitudes={solicitudes} responsables={responsables} />}</section>;
}

function SolicitudesTable({ solicitudes, responsables, profile }) {
  const [expanded, setExpanded] = useState(null);
  const isAdmin = profile.role === 'super_admin';
  if (!solicitudes.length) return <p className="empty">No hay solicitudes para mostrar.</p>;
  return <div className="requests-list">{solicitudes.map(item => <SolicitudItem key={item.id} item={item} expanded={expanded === item.id} onExpand={() => setExpanded(expanded === item.id ? null : item.id)} responsables={responsables} isAdmin={isAdmin} profile={profile} />)}</div>;
}

function SolicitudItem({ item, expanded, onExpand, responsables, isAdmin, profile }) {
  const [draft, setDraft] = useState({ estado: item.estado || 'Recibida', assignedTo: item.assignedTo || '', respuestaOficial: item.respuestaOficial || '', minutoLive: item.minutoLive || '', evidenciaUrl: item.evidenciaUrl || '', respondidaEnVivo: Boolean(item.respondidaEnVivo) });
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft({ estado: item.estado || 'Recibida', assignedTo: item.assignedTo || '', respuestaOficial: item.respuestaOficial || '', minutoLive: item.minutoLive || '', evidenciaUrl: item.evidenciaUrl || '', respondidaEnVivo: Boolean(item.respondidaEnVivo) }), [item.id, item.estado, item.assignedTo, item.respuestaOficial, item.minutoLive, item.evidenciaUrl, item.respondidaEnVivo]);

  async function save() {
    setSaving(true);
    try {
      const responsable = responsables.find(r => r.id === draft.assignedTo);
      const patch = {
        estado: draft.estado,
        respuestaOficial: draft.respuestaOficial,
        minutoLive: draft.minutoLive,
        evidenciaUrl: draft.evidenciaUrl,
        respondidaEnVivo: draft.respondidaEnVivo,
        updatedAt: serverTimestamp()
      };
      if (isAdmin) {
        patch.assignedTo = draft.assignedTo;
        patch.dependenciaAsignada = responsable?.dependencia || item.dependenciaAsignada || '';
        patch.responsableNombre = responsable?.nombre || item.responsableNombre || '';
        patch.responsableCargo = responsable?.cargo || item.responsableCargo || '';
      }
      if (draft.respuestaOficial && !item.answeredAt) patch.answeredAt = serverTimestamp();
      await updateDoc(doc(db, 'solicitudes', item.id), patch);
      await addDoc(collection(db, 'auditoria'), { radicado: item.radicado, accion: isAdmin ? 'actualizar_reasignar_responder' : 'responder_solicitud', usuarioUid: profile.uid, usuarioNombre: profile.nombre, fecha: serverTimestamp() });
    } catch (error) { alert(`No se pudo guardar: ${error.message}`); } finally { setSaving(false); }
  }

  return <div className="request-card"><button className="request-head" onClick={onExpand}><div><strong>{item.radicado}</strong><span>{item.tipoSolicitud} · {item.tema}</span></div><div className="request-meta"><span>{item.estado}</span><span>{formatDate(item.createdAt)}</span></div></button>{expanded && <div className="request-body"><p><strong>Ciudadano:</strong> {item.nombreCiudadano} · {item.barrioVereda} · {item.zona}</p><p><strong>Mensaje:</strong> {item.mensaje}</p><div className="form-grid"><label>Estado<select value={draft.estado} onChange={e => setDraft({ ...draft, estado: e.target.value })}>{ESTADOS.map(x => <option key={x}>{x}</option>)}</select></label>{isAdmin && <label>Responsable asignado<select value={draft.assignedTo} onChange={e => setDraft({ ...draft, assignedTo: e.target.value })}>{responsables.map(r => <option key={r.id} value={r.id}>{r.cargo} — {r.nombre}</option>)}</select></label>}<label className="check"><input type="checkbox" checked={draft.respondidaEnVivo} onChange={e => setDraft({ ...draft, respondidaEnVivo: e.target.checked, estado: e.target.checked ? 'Respondida en vivo' : draft.estado })} /> Respondida en vivo</label><label>Minuto del live<input value={draft.minutoLive} onChange={e => setDraft({ ...draft, minutoLive: e.target.value })} placeholder="01:18:40" /></label><label className="full">Respuesta oficial<textarea rows="5" value={draft.respuestaOficial} onChange={e => setDraft({ ...draft, respuestaOficial: e.target.value })} /></label><label className="full">Hipervínculo / evidencia<input value={draft.evidenciaUrl} onChange={e => setDraft({ ...draft, evidenciaUrl: e.target.value })} placeholder="https://..." /></label><div className="actions-row full"><button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar respuesta'}</button></div></div></div>}</div>;
}

function LiveManager({ config }) {
  const [input, setInput] = useState(config?.liveInput || '');
  const [estado, setEstado] = useState(config?.estado || 'Programada');
  const [saving, setSaving] = useState(false);
  const source = useMemo(() => resolveVideoSource(input), [input]);

  async function save() {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'config', CONFIG_DOC_ID), { liveInput: input, liveEmbedUrl: source.src || '', liveExternalUrl: source.externalUrl || '', livePlatform: source.platform || '', liveMessage: source.message || '', estado, updatedAt: serverTimestamp() });
      alert('Live actualizado para todos los visitantes.');
    } catch (error) { alert(`No se pudo actualizar: ${error.message}`); } finally { setSaving(false); }
  }

  return <div className="live-manager"><div className="form-grid"><label>Estado del evento<select value={estado} onChange={e => setEstado(e.target.value)}><option>Programada</option><option>En vivo</option><option>Grabación disponible</option><option>Cerrada</option></select></label><label className="full">Pega iframe, enlace de Facebook, YouTube, video viejo o live<textarea rows="7" value={input} onChange={e => setInput(e.target.value)} placeholder="<iframe src='...'></iframe>" /></label><div className="actions-row full"><button className="btn primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Actualizar live para todos'}</button></div></div><div className="preview-box"><h3>Vista previa</h3><VideoPlayer config={{ estado, liveEmbedUrl: source.src, liveExternalUrl: source.externalUrl, livePlatform: source.platform, liveMessage: source.message, liveInput: input }} /></div></div>;
}

function UserManager({ responsables }) {
  const [form, setForm] = useState({ responsibleId: responsables[0]?.id || '', nombre: '', cargo: '', dependencia: '', email: '', password: '', role: 'responsable' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const selected = responsables.find(r => r.id === form.responsibleId);
    if (selected) setForm(prev => ({ ...prev, nombre: selected.nombre || '', cargo: selected.cargo || '', dependencia: selected.dependencia || '', role: selected.id === 'despacho-alcalde' ? 'responsable_alcalde' : selected.id === 'cio-tics' ? 'super_admin' : 'responsable' }));
  }, [form.responsibleId, responsables]);

  async function submit(e) {
    e.preventDefault(); setMessage('');
    try {
      const token = await auth.currentUser.getIdToken(true);
      const response = await fetch('/api/create-user', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!data.ok) throw new Error(data.message);
      setMessage('Usuario creado o actualizado correctamente.');
    } catch (error) { setMessage(error.message); }
  }

  return <form onSubmit={submit} className="form-grid"><label>Responsable base<select value={form.responsibleId} onChange={e => setForm({ ...form, responsibleId: e.target.value })}>{responsables.map(r => <option key={r.id} value={r.id}>{r.cargo} — {r.nombre}</option>)}</select></label><label>Rol<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="responsable">Responsable</option><option value="responsable_alcalde">Alcalde / responsable</option><option value="moderador">Moderador</option><option value="super_admin">Super Admin</option></select></label><label>Nombre<input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required /></label><label>Cargo<input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} required /></label><label>Dependencia<input value={form.dependencia} onChange={e => setForm({ ...form, dependencia: e.target.value })} required /></label><label>Correo de acceso<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></label><label>Contraseña temporal<input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="Mínimo 10, mayúscula, minúscula y número" /></label>{message && <p className="warning-text full">{message}</p>}<div className="actions-row full"><button className="btn primary">Crear o actualizar usuario</button></div></form>;
}

function Stats({ solicitudes, responsables }) {
  const total = solicitudes.length;
  const enVivo = solicitudes.filter(s => s.respondidaEnVivo).length;
  const respondidas = solicitudes.filter(s => ['Respondida', 'Respondida en vivo', 'Cerrada', 'Notificada'].includes(s.estado)).length;
  const pendientes = total - respondidas;
  const byResp = responsables.map(r => ({ ...r, count: solicitudes.filter(s => s.assignedTo === r.id).length })).filter(r => r.count > 0).sort((a, b) => b.count - a.count);
  return <div><div className="cards-grid compact"><div className="info-card"><strong>{total}</strong><span>Total solicitudes</span></div><div className="info-card"><strong>{enVivo}</strong><span>Respondidas en vivo</span></div><div className="info-card"><strong>{respondidas}</strong><span>Respondidas/cerradas</span></div><div className="info-card"><strong>{pendientes}</strong><span>Pendientes</span></div></div><div className="mini-table">{byResp.map(r => <div key={r.id}><span>{r.dependencia}</span><strong>{r.count}</strong></div>)}</div></div>;
}

export default function App() {
  const [view, setView] = useState('publico');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [responsables, setResponsables] = useState([]);
  const [publicResponses, setPublicResponses] = useState([]);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => { startAppCheck(); }, []);

  useEffect(() => {
    const configUnsub = onSnapshot(doc(db, 'config', CONFIG_DOC_ID), snap => { if (snap.exists()) setConfig({ ...DEFAULT_CONFIG, ...snap.data() }); });
    const respUnsub = onSnapshot(query(collection(db, 'responsables'), where('activo', '==', true), where('asignable', '==', true)), snap => setResponsables(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.cargo || '').localeCompare(b.cargo || ''))));
    fetch('/api/public-respuestas').then(r => r.json()).then(data => { if (data.ok) setPublicResponses(data.items || []); }).catch(() => {});
    return () => { configUnsub(); respUnsub(); };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async current => {
      setUser(current);
      if (!current) { setProfile(null); return; }
      const snap = await getDoc(doc(db, 'users', current.uid));
      setProfile(snap.exists() ? { uid: current.uid, ...snap.data() } : null);
    });
    return () => unsub();
  }, []);

  return <main><nav className="topbar"><button onClick={() => setView('publico')} className="brand-mini"><img src="/assets/logo.png" alt="Logo" />RindeCuentas 2026</button><div><button onClick={() => setView('registro')}>Registrar</button><button onClick={() => setView('consulta')}>Consultar</button><button onClick={() => setView(user ? 'panel' : 'login')}>{user ? 'Panel' : 'Ingresar'}</button></div></nav>{view === 'publico' && <PublicHome config={config} responsables={responsables} setView={setView} publicResponses={publicResponses} />}{view === 'registro' && <Registro responsables={responsables} setView={setView} />}{view === 'consulta' && <Consulta setView={setView} />}{view === 'login' && <Login user={user} setView={setView} />}{view === 'setup' && <Setup setView={setView} />}{view === 'panel' && <Panel user={user} profile={profile} setView={setView} config={config} responsables={responsables} />}<footer>Alcaldía Municipal de San Pedro Valle · Sistema seguro de participación ciudadana · 2026 <button className="linklike" onClick={() => setView('setup')}>Setup</button></footer></main>;
}
