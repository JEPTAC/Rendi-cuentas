import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc, query, where, serverTimestamp, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBW-HYPyV4LfMEgV1Yor98dehewQIYWalU",
  authDomain: "rendi-cuentas.firebaseapp.com",
  projectId: "rendi-cuentas",
  storageBucket: "rendi-cuentas.firebasestorage.app",
  messagingSenderId: "234640973194",
  appId: "1:234640973194:web:4a89139ac58aceccae7c73",
  measurementId: "G-DDNDYMPKTF"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
isSupported().then(ok => ok && getAnalytics(app)).catch(() => {});

const responsablesBase = [
  { id: "cio-tics", nombre: "Juan Esteban Pérez", cargo: "CIO TICs", dependencia: "Tecnologías de la Información y las Comunicaciones", orden: 1, activo: true },
  { id: "hacienda", nombre: "Felipe García", cargo: "Secretario de Hacienda", dependencia: "Secretaría de Hacienda", orden: 2, activo: true },
  { id: "salud", nombre: "Yeini Coromoto", cargo: "Secretaria de Salud", dependencia: "Secretaría de Salud", orden: 3, activo: true },
  { id: "gobierno", nombre: "Laura Cristina Gonzales", cargo: "Secretaria de Gobierno", dependencia: "Secretaría de Gobierno", orden: 4, activo: true },
  { id: "desarrollo", nombre: "Einar Gonzales", cargo: "Secretario de Desarrollo", dependencia: "Secretaría de Desarrollo", orden: 5, activo: true },
  { id: "agricultura", nombre: "Diego Efraín", cargo: "Secretario de Agricultura", dependencia: "Secretaría de Agricultura", orden: 6, activo: true },
  { id: "educacion-cultura-deporte", nombre: "Valentina Erazo", cargo: "Técnica Administrativa de Educación, Cultura y Deporte", dependencia: "Educación, Cultura y Deporte", orden: 7, activo: true },
  { id: "bienestar-social", nombre: "Valeria Giraldo", cargo: "Técnica Administrativa de Bienestar Social", dependencia: "Bienestar Social", orden: 8, activo: true },
  { id: "gestion-social", nombre: "Yasmin Tascon", cargo: "Gestora Social", dependencia: "Gestión Social", orden: 9, activo: true },
  { id: "alcalde", nombre: "Diego Fernando Mendoza", cargo: "Alcalde Municipal", dependencia: "Despacho del Alcalde", orden: 10, activo: true }
];

const cargos = [...new Set(responsablesBase.map(r => r.cargo))];
const dependencias = [...new Set(responsablesBase.map(r => r.dependencia))];
const state = { view: "inicio", user: null, profile: null, responsables: responsablesBase, liveConfig: null, solicitudes: [], publicResponses: [], selectedRequest: null };
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function toast(message, type = "ok") {
  const el = $("#toast");
  el.textContent = message;
  el.className = `toast show ${type === "error" ? "error" : ""}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.className = "toast", 3600);
}

function esc(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function clean(value, max = 2000) {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

function slug(value) {
  return String(value || "item").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `item-${Date.now()}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function changeView(view) {
  state.view = view;
  $$(".view").forEach(el => el.classList.toggle("active", el.id === view));
  $$(`[data-go]`).forEach(btn => btn.classList.toggle("active", btn.dataset.go === view));
  $("#mainNav")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function token() {
  const array = new Uint32Array(2);
  crypto.getRandomValues(array);
  return Array.from(array).map(n => n.toString(36)).join("").slice(0, 10).toUpperCase();
}

function radicado() {
  const now = new Date();
  const day = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `RC-2026-${day}-${token().slice(0, 4)}`;
}

function extractIframeSrc(raw) {
  const text = String(raw || "").trim();
  const match = text.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match ? match[1].replaceAll("&amp;", "&") : text;
}

function normalizeUrl(raw) {
  let text = extractIframeSrc(raw).trim();
  if (!text) return "";
  if (/^\/\//.test(text)) text = `https:${text}`;
  if (/^www\./i.test(text)) text = `https://${text}`;
  return text;
}

function videoType(pathname) {
  const path = String(pathname || "").toLowerCase();
  if (/\.m3u8($|\?)/.test(path)) return "hls";
  if (/\.(mp4|webm|ogv|ogg|mov)($|\?)/.test(path)) return "video";
  return "";
}

function videoSource(raw) {
  const original = String(raw || "").trim();
  const url = normalizeUrl(original);
  if (!url) return { kind: "empty", src: "", external: "", platform: "Transmisión", message: "Aún no se ha configurado el reproductor." };
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "").toLowerCase();
    const parts = parsed.pathname.split("/").filter(Boolean);
    const direct = videoType(parsed.pathname);
    if (direct === "video") return { kind: "video", src: url, external: url, platform: "Video", message: "Archivo de video detectado." };
    if (direct === "hls") return { kind: "video", src: url, external: url, platform: "Streaming", message: "Streaming HLS detectado." };
    if (host === "youtu.be" && parts[0]) return { kind: "iframe", src: `https://www.youtube.com/embed/${encodeURIComponent(parts[0])}?rel=0`, external: url, platform: "YouTube", message: "Video o live de YouTube detectado." };
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0`, external: url, platform: "YouTube", message: "Video o live de YouTube detectado." };
      if (parts[0] === "embed" && parts[1]) return { kind: "iframe", src: url, external: url, platform: "YouTube", message: "Código embed de YouTube detectado." };
      if (parts[0] === "shorts" && parts[1]) return { kind: "iframe", src: `https://www.youtube.com/embed/${encodeURIComponent(parts[1])}?rel=0`, external: url, platform: "YouTube Shorts", message: "Short de YouTube detectado." };
      const liveIndex = parts.indexOf("live");
      if (liveIndex >= 0 && parts[liveIndex + 1]) return { kind: "iframe", src: `https://www.youtube.com/embed/${encodeURIComponent(parts[liveIndex + 1])}?rel=0`, external: url, platform: "YouTube Live", message: "Transmisión de YouTube detectada." };
    }
    if (host.endsWith("facebook.com") || host === "fb.watch") {
      if (parsed.pathname.includes("/plugins/video.php")) {
        return { kind: "iframe", src: url, external: parsed.searchParams.get("href") || url, platform: "Facebook", message: "Código embed oficial de Facebook detectado." };
      }
      return { kind: "iframe", src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=1280`, external: url, platform: "Facebook", message: "Enlace de Facebook convertido al reproductor oficial." };
    }
    if (host.endsWith("vimeo.com")) {
      const id = parts.find(part => /^\d+$/.test(part));
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}`, external: url, platform: "Vimeo", message: "Video de Vimeo detectado." };
    }
    return { kind: "iframe", src: url, external: url, platform: "Enlace", message: "Se intentará reproducir el enlace dentro del sitio." };
  } catch {
    return { kind: "empty", src: "", external: "", platform: "Transmisión", message: "El enlace no es válido." };
  }
}

function renderVideo() {
  const config = state.liveConfig || {};
  const embed = config.embed || "";
  const src = videoSource(embed);
  const text = String(embed).toLowerCase();
  const vertical = text.includes("/reel") || text.includes("/shorts");
  $("#liveTitle").textContent = config.title || "Live institucional";
  $("#openLive").href = src.external || "#";
  $("#openLive").style.display = src.external ? "inline-flex" : "none";
  let player = `<div class="video-stage ${vertical ? "is-vertical" : "is-wide"}"><div class="video-loading"><span class="loader-orbit"></span><strong>Preparando reproductor</strong><small>${esc(src.platform)}</small></div>`;
  if (src.kind === "iframe") player += `<iframe title="${esc(src.platform)}" src="${esc(src.src)}" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen" allowfullscreen loading="lazy"></iframe>`;
  else if (src.kind === "video") player += `<video controls playsinline preload="metadata" src="${esc(src.src)}"></video>`;
  else player += `<div class="video-loading"><strong>Transmisión pendiente</strong><small>${esc(src.message)}</small></div>`;
  player += `</div><div class="video-note"><strong>${esc(src.platform)}:</strong> ${esc(src.message)}${src.external ? ` <a class="text-link" href="${esc(src.external)}" target="_blank" rel="noopener noreferrer">Abrir enlace original</a>` : ""}</div>`;
  $("#videoMount").innerHTML = player;
  $$(".video-stage iframe, .video-stage video").forEach(el => {
    const stage = el.closest(".video-stage");
    const loaded = () => stage?.classList.add("is-loaded");
    el.addEventListener("load", loaded, { once: true });
    el.addEventListener("loadedmetadata", loaded, { once: true });
    setTimeout(loaded, 1600);
  });
}

function responsableName(id) {
  const r = state.responsables.find(x => x.id === id);
  return r ? `${r.cargo} - ${r.nombre}` : id;
}

function fillSelects() {
  const options = state.responsables.filter(r => r.activo !== false).sort((a,b) => (a.orden || 99) - (b.orden || 99)).map(r => `<option value="${esc(r.id)}">${esc(r.cargo)} - ${esc(r.nombre)}</option>`).join("");
  ["#publicAssignedTo", "#dialogAssignedTo"].forEach(id => { const el = $(id); if (el) el.innerHTML = `<option value="">Seleccionar</option>${options}`; });
  const cargoSelect = $("#cargoSelect");
  const depSelect = $("#dependenciaSelect");
  if (cargoSelect) cargoSelect.innerHTML = `<option value="">Seleccionar</option>${cargos.map(c => `<option>${esc(c)}</option>`).join("")}`;
  if (depSelect) depSelect.innerHTML = `<option value="">Seleccionar</option>${dependencias.map(d => `<option>${esc(d)}</option>`).join("")}`;
}

function profileFromCargo(cargo, dependencia) {
  const found = responsablesBase.find(r => r.cargo === cargo && r.dependencia === dependencia) || responsablesBase.find(r => r.cargo === cargo) || responsablesBase.find(r => r.dependencia === dependencia);
  return found ? found.id : slug(`${cargo}-${dependencia}`);
}

async function loadPublicData() {
  try {
    const [resSnap, configSnap, publicSnap] = await Promise.all([
      getDocs(collection(db, "responsables")),
      getDoc(doc(db, "config", "rendicion-2026")),
      getDocs(query(collection(db, "publicResponses"), where("respondidaEnVivo", "==", true)))
    ]);
    if (!resSnap.empty) state.responsables = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.liveConfig = configSnap.exists() ? configSnap.data() : { title: "Live institucional", embed: "" };
    state.publicResponses = publicSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    fillSelects();
    renderVideo();
    renderLiveAnswered();
  } catch (error) {
    fillSelects();
    renderVideo();
    toast("No se pudo cargar la información pública. Revisa reglas y conexión.", "error");
  }
}

async function ensureBaseData() {
  if (state.profile?.role !== "super_admin") return;
  const batch = writeBatch(db);
  responsablesBase.forEach(r => batch.set(doc(db, "responsables", r.id), r, { merge: true }));
  batch.set(doc(db, "config", "rendicion-2026"), { title: "Live institucional", embed: state.liveConfig?.embed || "", updatedAt: serverTimestamp() }, { merge: true });
  await batch.commit();
  await loadPublicData();
}

async function submitPublicForm(event) {
  event.preventDefault();
  const fd = new FormData(event.currentTarget);
  const assignedTo = clean(fd.get("assignedTo"), 80);
  if (!assignedTo) return toast("Selecciona a quién va dirigida la solicitud.", "error");
  const id = radicado();
  const consultaToken = token();
  const lookupId = `${id}_${consultaToken}`;
  const responsable = state.responsables.find(r => r.id === assignedTo) || {};
  const data = {
    radicado: id,
    consultaToken,
    anio: 2026,
    nombreCiudadano: clean(fd.get("nombreCiudadano"), 90),
    correo: clean(fd.get("correo"), 120),
    celular: clean(fd.get("celular"), 20),
    barrioVereda: clean(fd.get("barrioVereda"), 90),
    zona: clean(fd.get("zona"), 20),
    tipoParticipante: clean(fd.get("tipoParticipante"), 50),
    tipoSolicitud: clean(fd.get("tipoSolicitud"), 50),
    tema: clean(fd.get("tema"), 80),
    assignedTo,
    responsableNombre: responsable.nombre || "",
    responsableCargo: responsable.cargo || "",
    dependencia: responsable.dependencia || "",
    mensaje: clean(fd.get("mensaje"), 1800),
    estado: "recibida",
    respondidaEnVivo: false,
    respuestaOficial: "",
    evidenciaUrl: "",
    minutoLive: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if (!data.nombreCiudadano || !data.barrioVereda || !data.mensaje) return toast("Completa los campos obligatorios.", "error");
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, "solicitudes", id), data);
    batch.set(doc(db, "publicResponses", lookupId), {
      radicado: id,
      consultaToken,
      estado: "recibida",
      tema: data.tema,
      tipoSolicitud: data.tipoSolicitud,
      pregunta: data.mensaje,
      assignedTo,
      responsable: `${data.responsableCargo} - ${data.responsableNombre}`,
      respondidaEnVivo: false,
      respuestaOficial: "",
      evidenciaUrl: "",
      minutoLive: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await batch.commit();
    event.currentTarget.reset();
    $("#radicadoBox").classList.remove("hidden");
    $("#radicadoBox").innerHTML = `<h3>Solicitud registrada</h3><p><strong>Radicado:</strong> ${esc(id)}</p><p><strong>Código de consulta:</strong> ${esc(consultaToken)}</p><p>Guarda ambos datos para consultar la respuesta.</p>`;
    toast("Solicitud registrada correctamente.");
  } catch (error) {
    toast("No fue posible registrar la solicitud. Revisa las reglas de Firebase.", "error");
  }
}

async function lookupResponse(event) {
  event.preventDefault();
  const fd = new FormData(event.currentTarget);
  const id = clean(fd.get("radicado"), 30).toUpperCase();
  const consultaToken = clean(fd.get("token"), 20).toUpperCase();
  try {
    const snap = await getDoc(doc(db, "publicResponses", `${id}_${consultaToken}`));
    const box = $("#lookupResult");
    box.classList.remove("hidden");
    if (!snap.exists()) {
      box.innerHTML = `<strong>No se encontró una respuesta con esos datos.</strong><p>Verifica el radicado y el código de consulta.</p>`;
      return;
    }
    const data = snap.data();
    box.innerHTML = `<h3>${esc(data.radicado)}</h3><p><strong>Estado:</strong> ${esc(labelEstado(data.estado))}</p><p><strong>Responsable:</strong> ${esc(data.responsable || responsableName(data.assignedTo))}</p><p><strong>Pregunta:</strong> ${esc(data.pregunta || "")}</p>${data.respondidaEnVivo ? `<p><strong>Respondida en vivo:</strong> Sí ${data.minutoLive ? `- Minuto ${esc(data.minutoLive)}` : ""}</p>` : ""}<p><strong>Respuesta oficial:</strong></p><p>${esc(data.respuestaOficial || "La respuesta aún se encuentra en trámite.")}</p>${data.evidenciaUrl ? `<p><a class="text-link" href="${esc(data.evidenciaUrl)}" target="_blank" rel="noopener noreferrer">Abrir evidencia o enlace</a></p>` : ""}`;
  } catch (error) {
    toast("No fue posible consultar la respuesta.", "error");
  }
}

function labelEstado(value) {
  const map = { recibida: "Recibida", asignada: "Asignada", respondida_en_vivo: "Respondida en vivo", respondida: "Respondida", cerrada: "Cerrada" };
  return map[value] || value || "Recibida";
}

function renderLiveAnswered() {
  const list = $("#liveAnsweredList");
  const rows = state.publicResponses.filter(r => r.respondidaEnVivo || r.estado === "respondida_en_vivo");
  if (!rows.length) {
    list.innerHTML = `<div class="card"><strong>Aún no hay preguntas marcadas como respondidas en vivo.</strong><p>Cuando una dependencia marque una respuesta durante la transmisión, aparecerá aquí.</p></div>`;
    return;
  }
  list.innerHTML = rows.map(item => `<article class="card"><strong>${esc(item.radicado)}</strong><div class="badges"><span class="badge">${esc(item.tema || "Tema")}</span><span class="badge">${esc(item.minutoLive || "Live")}</span></div><p>${esc(item.pregunta || "")}</p><p><strong>Respuesta:</strong> ${esc(item.respuestaOficial || "Pendiente de consolidación")}</p></article>`).join("");
}

async function login(event) {
  event.preventDefault();
  const fd = new FormData(event.currentTarget);
  try {
    await signInWithEmailAndPassword(auth, fd.get("email"), fd.get("password"));
    event.currentTarget.reset();
    toast("Ingreso correcto.");
  } catch (error) {
    toast("Correo o contraseña incorrectos.", "error");
  }
}

async function loadProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() ? { uid: user.uid, ...snap.data() } : null;
}

async function handleAuth(user) {
  state.user = user;
  state.profile = null;
  $("#loginPanel").classList.toggle("hidden", !!user);
  $("#privatePanel").classList.toggle("hidden", !user);
  if (!user) return;
  const profile = await loadProfile(user);
  if (!profile || profile.activo === false) {
    await signOut(auth);
    toast("El usuario no tiene perfil activo en el sistema.", "error");
    return;
  }
  state.profile = profile;
  $("#userWelcome").textContent = `${profile.nombre}`;
  $("#userRoleLine").textContent = `${profile.cargo} · ${profile.dependencia}`;
  $("#superTools").classList.toggle("hidden", profile.role !== "super_admin");
  await ensureBaseData();
  await loadRequests();
}

async function loadRequests() {
  if (!state.profile) return;
  try {
    let snap;
    if (state.profile.role === "super_admin") snap = await getDocs(collection(db, "solicitudes"));
    else snap = await getDocs(query(collection(db, "solicitudes"), where("assignedTo", "==", state.profile.responsibleId)));
    state.solicitudes = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => String(b.radicado).localeCompare(String(a.radicado)));
    renderRequests();
  } catch (error) {
    toast("No fue posible cargar las solicitudes del panel.", "error");
  }
}

function renderRequests() {
  const text = clean($("#searchBox").value, 120).toLowerCase();
  const status = $("#statusFilter").value;
  let rows = [...state.solicitudes];
  if (status) rows = rows.filter(r => r.estado === status);
  if (text) rows = rows.filter(r => JSON.stringify(r).toLowerCase().includes(text));
  const list = $("#requestsList");
  if (!rows.length) {
    list.innerHTML = `<div class="request-item"><div><strong>No hay solicitudes para mostrar.</strong><p>Los registros aparecerán de acuerdo con los permisos del usuario.</p></div></div>`;
    return;
  }
  list.innerHTML = rows.map(item => `<article class="request-item"><div><strong>${esc(item.radicado)}</strong><div class="badges"><span class="badge">${esc(labelEstado(item.estado))}</span><span class="badge">${esc(item.tema)}</span><span class="badge">${esc(responsableName(item.assignedTo))}</span></div><p>${esc(item.mensaje)}</p><small>${esc(formatDate(item.createdAt))}</small></div><button class="primary" type="button" data-open="${esc(item.id)}">Gestionar</button></article>`).join("");
  $$('[data-open]').forEach(btn => btn.addEventListener("click", () => openRequest(btn.dataset.open)));
}

function openRequest(id) {
  const item = state.solicitudes.find(r => r.id === id);
  if (!item) return;
  state.selectedRequest = item;
  $("#dialogRadicado").textContent = item.radicado;
  $("#dialogTitle").textContent = item.tipoSolicitud || "Solicitud ciudadana";
  $("#dialogMeta").innerHTML = `<div><strong>Ciudadano:</strong> ${esc(item.nombreCiudadano)}</div><div><strong>Barrio/vereda:</strong> ${esc(item.barrioVereda)} · ${esc(item.zona)}</div><div><strong>Dirigida a:</strong> ${esc(responsableName(item.assignedTo))}</div><div><strong>Mensaje:</strong> ${esc(item.mensaje)}</div>`;
  $("#reassignField").classList.toggle("hidden", state.profile?.role !== "super_admin");
  $("#dialogAssignedTo").value = item.assignedTo || "";
  const form = $("#answerForm");
  form.estado.value = item.estado || "recibida";
  form.respondidaEnVivo.checked = !!item.respondidaEnVivo;
  form.minutoLive.value = item.minutoLive || "";
  form.evidenciaUrl.value = item.evidenciaUrl || "";
  form.respuestaOficial.value = item.respuestaOficial || "";
  $("#requestDialog").showModal();
}

async function saveAnswer(event) {
  event.preventDefault();
  const item = state.selectedRequest;
  if (!item) return;
  const fd = new FormData(event.currentTarget);
  const assignedTo = state.profile.role === "super_admin" ? clean(fd.get("assignedTo"), 80) : item.assignedTo;
  const estado = clean(fd.get("estado"), 40);
  const response = {
    assignedTo,
    estado,
    respondidaEnVivo: fd.get("respondidaEnVivo") === "on" || estado === "respondida_en_vivo",
    minutoLive: clean(fd.get("minutoLive"), 12),
    evidenciaUrl: clean(fd.get("evidenciaUrl"), 300),
    respuestaOficial: clean(fd.get("respuestaOficial"), 2800),
    updatedAt: serverTimestamp()
  };
  if (["respondida", "respondida_en_vivo", "cerrada"].includes(estado)) response.answeredAt = serverTimestamp();
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "solicitudes", item.id), response);
    batch.set(doc(db, "publicResponses", `${item.radicado}_${item.consultaToken}`), {
      radicado: item.radicado,
      consultaToken: item.consultaToken,
      estado: response.estado,
      tema: item.tema,
      tipoSolicitud: item.tipoSolicitud,
      pregunta: item.mensaje,
      assignedTo: response.assignedTo,
      responsable: responsableName(response.assignedTo),
      respondidaEnVivo: response.respondidaEnVivo,
      minutoLive: response.minutoLive,
      evidenciaUrl: response.evidenciaUrl,
      respuestaOficial: response.respuestaOficial,
      updatedAt: serverTimestamp()
    }, { merge: true });
    batch.set(doc(collection(db, "auditoria")), { radicado: item.radicado, accion: "actualizar_respuesta", usuario: state.profile.uid, nombre: state.profile.nombre, createdAt: serverTimestamp() });
    await batch.commit();
    $("#requestDialog").close();
    toast("Respuesta guardada.");
    await loadRequests();
    await loadPublicData();
  } catch (error) {
    toast("No fue posible guardar la respuesta.", "error");
  }
}

async function saveLive(event) {
  event.preventDefault();
  const fd = new FormData(event.currentTarget);
  try {
    await setDoc(doc(db, "config", "rendicion-2026"), { title: clean(fd.get("title"), 100) || "Live institucional", embed: String(fd.get("embed") || "").trim(), updatedAt: serverTimestamp(), updatedBy: state.profile.uid }, { merge: true });
    await loadPublicData();
    toast("Transmisión actualizada.");
  } catch (error) {
    toast("No fue posible actualizar la transmisión.", "error");
  }
}

async function createInstitutionalUser(event) {
  event.preventDefault();
  if (state.profile?.role !== "super_admin") return;
  const fd = new FormData(event.currentTarget);
  const nombre = clean(fd.get("nombre"), 90);
  const correo = clean(fd.get("correo"), 120).toLowerCase();
  const password = String(fd.get("password") || "");
  const cargo = clean(fd.get("cargo"), 120);
  const dependencia = clean(fd.get("dependencia"), 120);
  const role = clean(fd.get("role"), 30);
  const responsibleId = profileFromCargo(cargo, dependencia);
  try {
    const secondary = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondary);
    const credential = await createUserWithEmailAndPassword(secondaryAuth, correo, password);
    await setDoc(doc(db, "users", credential.user.uid), { nombre, correo, cargo, dependencia, role, responsibleId, activo: fd.get("activo") === "true", createdAt: serverTimestamp(), createdBy: state.profile.uid });
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondary).catch(() => {});
    event.currentTarget.reset();
    toast("Usuario creado correctamente.");
  } catch (error) {
    toast(error.code === "auth/email-already-in-use" ? "Ese correo ya existe en Firebase Auth." : "No fue posible crear el usuario.", "error");
  }
}

function exportCsv() {
  const rows = state.solicitudes;
  if (!rows.length) return toast("No hay registros para exportar.", "error");
  const headers = ["radicado", "fecha", "nombreCiudadano", "correo", "celular", "barrioVereda", "zona", "tipoParticipante", "tipoSolicitud", "tema", "responsable", "estado", "respondidaEnVivo", "minutoLive", "mensaje", "respuestaOficial", "evidenciaUrl"];
  const csv = [headers.join(";")].concat(rows.map(r => headers.map(h => `"${String(h === "fecha" ? formatDate(r.createdAt) : h === "responsable" ? responsableName(r.assignedTo) : r[h] ?? "").replaceAll('"', '""')}"`).join(";"))).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "rendicion-cuentas-2026-solicitudes.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function bindEvents() {
  $$(`[data-go]`).forEach(btn => btn.addEventListener("click", event => { event.preventDefault(); changeView(btn.dataset.go); }));
  $("#menuBtn").addEventListener("click", () => $("#mainNav").classList.toggle("open"));
  $("#publicForm").addEventListener("submit", submitPublicForm);
  $("#lookupForm").addEventListener("submit", lookupResponse);
  $("#loginForm").addEventListener("submit", login);
  $("#logoutBtn").addEventListener("click", () => signOut(auth));
  $("#liveForm").addEventListener("submit", saveLive);
  $("#createUserForm").addEventListener("submit", createInstitutionalUser);
  $("#answerForm").addEventListener("submit", saveAnswer);
  $("#answerForm .close").addEventListener("click", () => $("#requestDialog").close());
  $("#searchBox").addEventListener("input", renderRequests);
  $("#statusFilter").addEventListener("change", renderRequests);
  $("#exportBtn").addEventListener("click", exportCsv);
  $("#cargoSelect").addEventListener("change", event => {
    const found = responsablesBase.find(r => r.cargo === event.target.value);
    if (found) $("#dependenciaSelect").value = found.dependencia;
  });
}

fillSelects();
bindEvents();
loadPublicData();
onAuthStateChanged(auth, handleAuth);
