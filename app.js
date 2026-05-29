(() => {
  const STORAGE_KEY = "rindecuentas-san-pedro-2026-github-pages-v1";
  const root = document.getElementById("root");

  const initialUsers = [
    { id: "juan-esteban-perez", nombre: "Juan Esteban Pérez", cargo: "CIO TICs", dependencia: "Tecnologías de la Información y las Comunicaciones", rol: "super_admin", correo: "", celular: "", activo: true, asignable: true },
    { id: "felipe-garcia", nombre: "Felipe García", cargo: "Secretario de Hacienda", dependencia: "Secretaría de Hacienda", rol: "responsable", correo: "", celular: "", activo: true, asignable: true },
    { id: "yeini-coromoto", nombre: "Yeini Coromoto", cargo: "Secretaria de Salud", dependencia: "Secretaría de Salud", rol: "responsable", correo: "", celular: "", activo: true, asignable: true },
    { id: "laura-cristina-gonzales", nombre: "Laura Cristina Gonzales", cargo: "Secretaria de Gobierno", dependencia: "Secretaría de Gobierno", rol: "responsable", correo: "", celular: "", activo: true, asignable: true },
    { id: "einar-gonzales", nombre: "Einar Gonzales", cargo: "Secretario de Desarrollo", dependencia: "Secretaría de Desarrollo", rol: "responsable", correo: "", celular: "", activo: true, asignable: true },
    { id: "diego-efrain", nombre: "Diego Efraín", cargo: "Secretario de Agricultura", dependencia: "Secretaría de Agricultura", rol: "responsable", correo: "", celular: "", activo: true, asignable: true },
    { id: "valentina-erazo", nombre: "Valentina Erazo", cargo: "Técnica Administrativa de Educación, Cultura y Deporte", dependencia: "Educación, Cultura y Deporte", rol: "responsable", correo: "", celular: "", activo: true, asignable: true },
    { id: "valeria-giraldo", nombre: "Valeria Giraldo", cargo: "Técnica Administrativa de Bienestar Social", dependencia: "Bienestar Social", rol: "responsable", correo: "", celular: "", activo: true, asignable: true },
    { id: "yasmin-tascon", nombre: "Yasmin Tascon", cargo: "Gestora Social", dependencia: "Gestión Social", rol: "responsable", correo: "", celular: "", activo: true, asignable: true },
    { id: "diego-fernando-mendoza", nombre: "Diego Fernando Mendoza", cargo: "Alcalde Municipal", dependencia: "Despacho del Alcalde", rol: "responsable_alcalde", correo: "", celular: "", activo: true, asignable: true }
  ];

  const temas = ["Alcaldía / Gestión general", "Hacienda", "Salud", "Gobierno", "Desarrollo", "Agricultura", "Educación", "Cultura", "Deporte", "Bienestar Social", "Gestión Social", "TICs / Transformación digital", "Obras públicas", "Seguridad", "Ambiente", "Otro"];
  const tiposSolicitud = ["Pregunta", "Duda", "Inquietud", "Petición", "Propuesta", "Comentario", "Solicitud de información"];
  const tiposParticipante = ["Ciudadano", "Líder comunitario", "Veeduría", "Comerciante", "Joven", "Adulto mayor", "Servidor público", "Representante de organización", "Otro"];
  const estados = ["Recibida", "En revisión", "Asignada", "Reasignada", "Priorizada para live", "Respondida en vivo", "Pendiente de respuesta escrita", "En elaboración de respuesta", "Respondida", "Notificada", "Cerrada", "Escalada"];

  let activeTab = "publico";
  let consultaRadicado = "";
  let selectedResponsable = "felipe-garcia";
  let filters = { estado: "Todos", responsableId: "Todos", texto: "" };
  let toastTimer;
  let state = loadState();

  function defaultState() {
    return {
      liveUrl: "",
      liveEmbedUrl: "",
      eventoEstado: "Programado",
      usuarios: initialUsers,
      solicitudes: [],
      auditoria: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed, usuarios: Array.isArray(parsed.usuarios) && parsed.usuarios.length ? parsed.usuarios : initialUsers };
    } catch (error) {
      console.warn("No se pudo leer la información local", error);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function formatDate(value) {
    if (!value) return "-";
    try {
      return new Intl.DateTimeFormat("es-CO", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
    } catch {
      return value;
    }
  }

  function slug(value) {
    return String(value || "usuario")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `usuario-${Date.now()}`;
  }

  function nextRadicado() {
    const max = state.solicitudes.reduce((acc, item) => {
      const number = Number(String(item.radicado || "").split("-").pop() || "0");
      return Number.isFinite(number) ? Math.max(acc, number) : acc;
    }, 0);
    return `RC-2026-${String(max + 1).padStart(6, "0")}`;
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

  function cleanVideoId(value) {
    return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").trim();
  }

  function directVideoType(pathname) {
    const path = String(pathname || "").toLowerCase();
    if (/\.m3u8($|\?)/.test(path)) return "hls";
    if (/\.(mp4|webm|ogv|ogg|mov)($|\?)/.test(path)) return "video";
    return "";
  }

  function resolveVideoSource(raw) {
    const original = String(raw || "").trim();
    const url = normalizeUrl(original);
    if (!url) {
      return { kind: "empty", src: "", externalUrl: "", platform: "Sin transmisión", message: "Aún no se ha configurado un enlace de transmisión o video." };
    }

    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { kind: "external", src: "", externalUrl: url, platform: "Enlace no permitido", message: "Solo se permiten enlaces http o https." };
      }

      const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "").replace(/^web\./, "").toLowerCase();
      const path = parsed.pathname;
      const parts = path.split("/").filter(Boolean);
      const fileKind = directVideoType(path);

      if (fileKind === "video") return { kind: "video", src: url, externalUrl: url, platform: "Archivo de video", message: "Reproducción directa desde archivo de video." };
      if (fileKind === "hls") return { kind: "hls", src: url, externalUrl: url, platform: "Streaming HLS", message: "Reproducción de streaming HLS. En algunos navegadores se usa HLS.js." };

      if (host === "youtu.be") {
        const id = cleanVideoId(parts[0]);
        if (id) return { kind: "iframe", src: `https://www.youtube.com/embed/${id}?rel=0`, externalUrl: url, platform: "YouTube", message: "Video de YouTube detectado." };
      }

      if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
        const watchId = cleanVideoId(parsed.searchParams.get("v"));
        const listId = parsed.searchParams.get("list");
        if (watchId) return { kind: "iframe", src: `https://www.youtube.com/embed/${watchId}?rel=0`, externalUrl: url, platform: "YouTube", message: "Video o live de YouTube detectado." };
        if (listId && (parts[0] === "playlist" || parsed.searchParams.has("list"))) return { kind: "iframe", src: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(listId)}`, externalUrl: url, platform: "YouTube playlist", message: "Lista de reproducción de YouTube detectada." };
        const liveIndex = parts.indexOf("live");
        if (liveIndex >= 0 && parts[liveIndex + 1]) return { kind: "iframe", src: `https://www.youtube.com/embed/${cleanVideoId(parts[liveIndex + 1])}?rel=0`, externalUrl: url, platform: "YouTube Live", message: "Transmisión de YouTube detectada." };
        if (parts[0] === "embed" && parts[1]) return { kind: "iframe", src: url, externalUrl: `https://www.youtube.com/watch?v=${cleanVideoId(parts[1])}`, platform: "YouTube", message: "Código embed de YouTube detectado." };
        if (parts[0] === "shorts" && parts[1]) return { kind: "iframe", src: `https://www.youtube.com/embed/${cleanVideoId(parts[1])}?rel=0`, externalUrl: url, platform: "YouTube Shorts", message: "Short de YouTube detectado." };
      }

      if (host.endsWith("facebook.com") || host === "fb.watch") {
        if (path.includes("/plugins/video.php") || path.includes("/plugins/post.php")) {
          const href = parsed.searchParams.get("href") || url;
          return { kind: "iframe", src: url, externalUrl: href, platform: "Facebook", message: "Código embed oficial de Facebook detectado." };
        }
        const plugin = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=1280`;
        return { kind: "iframe", src: plugin, externalUrl: url, platform: "Facebook", message: "Enlace de Facebook convertido al reproductor oficial. Si Facebook lo bloquea, usa el botón externo." };
      }

      if (host.endsWith("vimeo.com")) {
        const id = cleanVideoId(parts.find(part => /^\d+$/.test(part)) || "");
        if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}`, externalUrl: url, platform: "Vimeo", message: "Video de Vimeo detectado." };
      }

      if (host.endsWith("dailymotion.com") || host === "dai.ly") {
        let id = "";
        if (host === "dai.ly") id = cleanVideoId(parts[0]);
        else {
          const videoIndex = parts.indexOf("video");
          if (videoIndex >= 0 && parts[videoIndex + 1]) id = cleanVideoId(parts[videoIndex + 1].split("_")[0]);
        }
        if (id) return { kind: "iframe", src: `https://www.dailymotion.com/embed/video/${id}`, externalUrl: url, platform: "Dailymotion", message: "Video de Dailymotion detectado." };
      }

      if (host.endsWith("twitch.tv")) {
        const parent = encodeURIComponent(location.hostname || "localhost");
        if (parts[0] === "videos" && parts[1]) return { kind: "iframe", src: `https://player.twitch.tv/?video=${cleanVideoId(parts[1])}&parent=${parent}`, externalUrl: url, platform: "Twitch", message: "Video de Twitch detectado." };
        if (parts[0]) return { kind: "iframe", src: `https://player.twitch.tv/?channel=${encodeURIComponent(parts[0])}&parent=${parent}`, externalUrl: url, platform: "Twitch", message: "Canal de Twitch detectado." };
      }

      if (host.endsWith("drive.google.com")) {
        const fileIndex = parts.indexOf("d");
        if (parts[0] === "file" && fileIndex >= 0 && parts[fileIndex + 1]) {
          const id = encodeURIComponent(parts[fileIndex + 1]);
          return { kind: "iframe", src: `https://drive.google.com/file/d/${id}/preview`, externalUrl: url, platform: "Google Drive", message: "Vista previa de video de Google Drive detectada." };
        }
      }

      // Modo universal: intenta incrustar cualquier URL HTTPS como iframe. Si el sitio externo
      // usa X-Frame-Options o Content-Security-Policy, el navegador lo bloqueará y quedará el botón externo.
      return { kind: "iframe", src: url, externalUrl: url, platform: "Enlace universal", message: "Intento de reproducción universal. Si el origen bloquea iframe, abre el enlace externo." };
    } catch {
      return { kind: "external", src: "", externalUrl: url, platform: "Enlace externo", message: "El texto ingresado no se pudo convertir a reproductor. Se mostrará como enlace externo." };
    }
  }

  function embedFromUrl(raw) {
    const resolved = resolveVideoSource(raw);
    return resolved.src || "";
  }

  function livePlatformName(url) {
    return resolveVideoSource(url).platform || "plataforma de transmisión";
  }

  function renderVideoPlayer() {
    const resolved = resolveVideoSource(state.liveUrl);
    const fallback = resolved.externalUrl || normalizeUrl(state.liveUrl);
    const title = escapeHtml(resolved.platform || "Transmisión");
    let player = "";

    if (resolved.kind === "iframe") {
      player = `<iframe title="${title} - Rendición de Cuentas 2026" src="${escapeHtml(resolved.src)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>`;
    } else if (resolved.kind === "video") {
      player = `<video class="native-video" controls playsinline preload="metadata" src="${escapeHtml(resolved.src)}"></video>`;
    } else if (resolved.kind === "hls") {
      player = `<video class="native-video hls-player" controls playsinline preload="metadata" data-hls="${escapeHtml(resolved.src)}"></video>`;
    } else if (resolved.kind === "external") {
      player = `<div class="video-placeholder"><strong>No se pudo crear reproductor interno</strong><span>${escapeHtml(resolved.message)}</span></div>`;
    } else {
      player = `<div class="video-placeholder"><strong>Reproductor del live</strong><span>Pega un enlace de YouTube, Facebook, video antiguo, live, MP4, HLS, Vimeo, Google Drive o código iframe.</span></div>`;
    }

    const help = state.liveUrl ? `<div class="live-help"><strong>${escapeHtml(resolved.platform)}:</strong> ${escapeHtml(resolved.message)} ${fallback ? `<a class="link light" href="${escapeHtml(fallback)}" target="_blank" rel="noopener noreferrer">Abrir enlace original</a>` : ""}</div>` : "";
    return `<div class="video-frame">${player}</div>${help}`;
  }

  function initializeVideoPlayers() {
    document.querySelectorAll("video.hls-player[data-hls]").forEach(video => {
      const src = video.dataset.hls;
      if (!src) return;
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
      } else if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls();
        hls.loadSource(src);
        hls.attachMedia(video);
      } else {
        video.outerHTML = `<div class="video-placeholder"><strong>HLS no soportado</strong><span>Este navegador no puede reproducir este streaming directamente. Usa el botón de enlace externo.</span></div>`;
      }
    });
  }

  function statusBadgeClass(estado) {
    if (["Respondida", "Notificada", "Cerrada", "Respondida en vivo"].includes(estado)) return "green";
    if (["Priorizada para live", "Reasignada", "En elaboración de respuesta"].includes(estado)) return "gold";
    if (["Escalada"].includes(estado)) return "red";
    if (["Asignada", "Pendiente de respuesta escrita"].includes(estado)) return "blue";
    return "gray";
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    let node = document.querySelector(".toast");
    if (!node) {
      node = document.createElement("div");
      node.className = "toast";
      document.body.appendChild(node);
    }
    node.textContent = message;
    toastTimer = setTimeout(() => node.remove(), 4200);
  }

  function optionList(items, selected) {
    return items.map(item => `<option ${item === selected ? "selected" : ""}>${escapeHtml(item)}</option>`).join("");
  }

  function userOptions(selectedId, includeTodos = false) {
    const asignables = state.usuarios.filter(u => u.activo && u.asignable);
    return `${includeTodos ? `<option value="Todos" ${selectedId === "Todos" ? "selected" : ""}>Todos</option>` : ""}${asignables.map(u => `<option value="${escapeHtml(u.id)}" ${u.id === selectedId ? "selected" : ""}>${escapeHtml(u.cargo)} — ${escapeHtml(u.nombre)}</option>`).join("")}`;
  }

  function setTab(tab) {
    activeTab = tab;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function audit(radicado, accion, usuario, antes, despues, motivo) {
    state.auditoria = [{ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, radicado, accion, usuario, antes, despues, motivo, fecha: nowIso() }, ...state.auditoria];
  }

  function updateSolicitud(radicado, patch, motivo = "Actualización desde panel") {
    const current = state.solicitudes.find(s => s.radicado === radicado);
    if (!current) return;
    state.solicitudes = state.solicitudes.map(s => s.radicado === radicado ? { ...s, ...patch } : s);
    audit(radicado, "Actualización", "Panel interno", JSON.stringify(current), JSON.stringify({ ...current, ...patch }), motivo);
    saveState();
    render();
  }

  function stats() {
    const total = state.solicitudes.length;
    const enVivo = state.solicitudes.filter(s => s.respondidaEnVivo).length;
    const pendientes = state.solicitudes.filter(s => ["Recibida", "En revisión", "Asignada", "Reasignada", "Pendiente de respuesta escrita", "En elaboración de respuesta"].includes(s.estado)).length;
    const cerradas = state.solicitudes.filter(s => ["Respondida", "Notificada", "Cerrada", "Respondida en vivo"].includes(s.estado)).length;
    return { total, enVivo, pendientes, cerradas };
  }

  function renderHero() {
    return `
      <section class="hero">
        <div>
          <div class="brand">
            <div class="logo-box" aria-label="Logo institucional"><img src="assets/logo.png" alt="Escudo institucional" /></div>
            <div>
              <p class="eyebrow">Alcaldía Municipal de San Pedro Valle</p>
              <h1>Rendición de Cuentas 2026</h1>
              <p class="lead">Participa en vivo, registra preguntas, dudas, inquietudes, peticiones o propuestas, y consulta la respuesta oficial mediante radicado.</p>
              <div class="hero-actions">
                <button class="btn" data-tab="publico">Registrar pregunta</button>
                <button class="btn secondary" data-tab="consulta">Consultar respuesta</button>
                <button class="btn ghost" data-tab="superadmin">Panel interno</button>
              </div>
            </div>
          </div>
        </div>
        <div class="live-card">
          <div class="live-status"><span class="pulse"></span> ${escapeHtml(state.eventoEstado)}</div>
          ${renderVideoPlayer()}
        </div>
      </section>`;
  }

  function renderNav() {
    const tabs = [
      ["publico", "Participación ciudadana"],
      ["consulta", "Consulta por radicado"],
      ["superadmin", "Super Admin"],
      ["responsable", "Responsables"],
      ["seguridad", "Seguridad"]
    ];
    return `<nav class="nav-tabs" aria-label="Navegación principal">${tabs.map(([key, label]) => `<button class="tab-btn ${activeTab === key ? "active" : ""}" data-tab="${key}">${label}</button>`).join("")}</nav>`;
  }

  function renderPublico() {
    return `
      <section class="grid">
        <div class="card col-7">
          <h2>Registrar pregunta, duda, inquietud, petición o propuesta</h2>
          <p>La solicitud queda con radicado automático, hora exacta, responsable asignado y trazabilidad para respuesta oficial.</p>
          <form id="preguntaForm">
            <div class="form-row">
              <div class="field"><label>Nombre completo</label><input class="input" name="nombreCiudadano" placeholder="Nombre del ciudadano" /></div>
              <div class="field"><label>Barrio o vereda *</label><input class="input" name="barrioVereda" placeholder="Ej. Centro, corregimiento, vereda..." required /></div>
            </div>
            <div class="form-row three">
              <div class="field"><label>Correo electrónico</label><input class="input" type="email" name="correo" placeholder="correo@dominio.com" /></div>
              <div class="field"><label>Celular</label><input class="input" name="celular" inputmode="tel" placeholder="Número de contacto" /></div>
              <div class="field"><label>Zona</label><select class="select" name="zona"><option>Urbana</option><option>Rural</option><option selected>No informa</option></select></div>
            </div>
            <div class="form-row three">
              <div class="field"><label>Tipo de participante</label><select class="select" name="tipoParticipante">${optionList(tiposParticipante, "Ciudadano")}</select></div>
              <div class="field"><label>Tipo de solicitud</label><select class="select" name="tipoSolicitud">${optionList(tiposSolicitud, "Pregunta")}</select></div>
              <div class="field"><label>Tema</label><select class="select" name="tema">${optionList(temas, "Alcaldía / Gestión general")}</select></div>
            </div>
            <div class="field"><label>Dirigida a</label><select class="select" name="responsableId">${userOptions("diego-fernando-mendoza")}</select></div>
            <div class="field"><label>Texto de la solicitud *</label><textarea class="textarea" name="mensaje" maxlength="1800" placeholder="Escribe la pregunta o solicitud que deseas realizar durante la Rendición de Cuentas 2026." required></textarea><span class="small muted">Máximo 1.800 caracteres.</span></div>
            <div class="field">
              <label class="check"><input type="checkbox" name="tratamientoDatos" required /> <span>Autorizo el tratamiento de mis datos personales para gestionar mi participación, responder mi solicitud, realizar trazabilidad institucional y generar reportes estadísticos de la Rendición de Cuentas 2026.</span></label>
            </div>
            <input type="hidden" name="latitud" />
            <input type="hidden" name="longitud" />
            <input type="hidden" name="ubicacionAutorizada" value="false" />
            <div class="action-bar">
              <button class="btn" type="submit">Enviar y generar radicado</button>
              <button class="btn secondary" type="button" id="locationBtn">Compartir ubicación aproximada</button>
            </div>
          </form>
        </div>
        <div class="card col-5">
          <h2>Preguntas respondidas en vivo</h2>
          <p>Cuando una solicitud se marque como respondida en vivo, aparecerá aquí para consulta pública.</p>
          ${renderRespondidasEnVivo()}
        </div>
      </section>`;
  }

  function renderRespondidasEnVivo() {
    const items = state.solicitudes.filter(s => s.respondidaEnVivo).slice(0, 8);
    if (!items.length) return `<div class="empty">Aún no hay preguntas marcadas como respondidas en vivo.</div>`;
    return `<div class="security-list">${items.map(s => `<div class="security-item"><span class="badge green">${escapeHtml(s.radicado)}</span><div><b>${escapeHtml(s.tema)}</b><div class="small muted">${escapeHtml(s.dirigidaA)} ${s.minutoLive ? `— minuto ${escapeHtml(s.minutoLive)}` : ""}</div><div>${escapeHtml(s.mensaje).slice(0, 180)}${String(s.mensaje).length > 180 ? "..." : ""}</div></div></div>`).join("")}</div>`;
  }

  function renderConsulta() {
    const consulta = state.solicitudes.find(s => String(s.radicado).toLowerCase() === consultaRadicado.trim().toLowerCase());
    return `
      <section class="grid">
        <div class="card col-5">
          <h2>Consultar respuesta con radicado</h2>
          <p>Ingresa el radicado entregado al registrar la participación.</p>
          <form id="consultaForm">
            <div class="field"><label>Radicado</label><input class="input" name="radicado" value="${escapeHtml(consultaRadicado)}" placeholder="RC-2026-000001" /></div>
            <button class="btn" type="submit">Consultar</button>
          </form>
          <div class="divider"></div>
          <p class="small muted">En producción, esta consulta debe usar un token seguro además del radicado para proteger datos personales.</p>
        </div>
        <div class="card col-7">
          ${consulta ? renderConsultaResultado(consulta) : `<div class="empty">Aún no se ha consultado un radicado válido.</div>`}
        </div>
      </section>`;
  }

  function renderConsultaResultado(s) {
    const respuesta = s.respuestaOficial ? escapeHtml(s.respuestaOficial) : "La solicitud aún no tiene respuesta oficial registrada.";
    return `
      <h2>Resultado de la solicitud</h2>
      <div class="answer-box">
        <span class="badge ${statusBadgeClass(s.estado)}">${escapeHtml(s.estado)}</span>
        <h3>${escapeHtml(s.radicado)}</h3>
        <p><b>Responsable:</b> ${escapeHtml(s.dirigidaA)} — ${escapeHtml(s.dependenciaAsignada)}</p>
        <p><b>Tema:</b> ${escapeHtml(s.tema)} | <b>Tipo:</b> ${escapeHtml(s.tipoSolicitud)}</p>
        <p><b>Fecha de registro:</b> ${formatDate(s.createdAt)}</p>
        <div class="divider"></div>
        <p><b>Solicitud:</b><br>${escapeHtml(s.mensaje)}</p>
        <p><b>Respuesta oficial:</b><br>${respuesta}</p>
        ${s.respondidaEnVivo ? `<p><b>Respondida en vivo:</b> Sí ${s.minutoLive ? `— minuto ${escapeHtml(s.minutoLive)}` : ""}</p>` : ""}
        ${s.evidenciaUrl ? `<p><b>Evidencia / hipervínculo:</b> <a class="link" href="${escapeHtml(s.evidenciaUrl)}" target="_blank" rel="noopener noreferrer">Abrir soporte</a></p>` : ""}
        <p class="small muted"><b>Fecha de respuesta:</b> ${formatDate(s.answeredAt)} | <b>Fecha de cierre:</b> ${formatDate(s.closedAt)}</p>
      </div>`;
  }

  function renderSuperAdmin() {
    const st = stats();
    const filtered = filteredSolicitudes();
    return `
      <section class="grid">
        <div class="card col-12">
          <div class="notice"><b>Modo de prueba para GitHub Pages:</b> esta versión funciona sin instalar Node.js y guarda los datos en el navegador. Sirve para visualizar y validar el flujo. Para evento real con varios ciudadanos al tiempo, se conecta después a Firebase/Vercel.</div>
        </div>
        <div class="card col-12">
          <div class="stats">
            <div class="stat"><span>Total solicitudes</span><strong>${st.total}</strong></div>
            <div class="stat"><span>Respondidas en vivo</span><strong>${st.enVivo}</strong></div>
            <div class="stat"><span>Pendientes</span><strong>${st.pendientes}</strong></div>
            <div class="stat"><span>Cerradas</span><strong>${st.cerradas}</strong></div>
          </div>
        </div>
        <div class="card col-5">
          <h2>Configurar transmisión universal</h2>
          <p>Pega cualquier enlace de video, live o grabación. La app intentará convertirlo automáticamente a reproductor interno y siempre dejará el botón de respaldo para abrirlo afuera.</p>
          <div class="notice small"><b>Soporta:</b> YouTube normal/live/shorts/listas, Facebook live/video/reel público o iframe, Vimeo, Dailymotion, Twitch, Google Drive, MP4/WebM/MOV y HLS .m3u8. Si la plataforma bloquea iframe por privacidad o permisos, ningún aplicativo puede forzarlo; en ese caso se muestra el botón externo.</div>
          <form id="liveForm">
            <div class="field"><label>Link del video, live, grabación o código iframe</label><textarea class="textarea compact-textarea" name="liveUrl" placeholder="https://www.youtube.com/watch?v=... | https://youtu.be/... | https://www.facebook.com/.../videos/... | https://fb.watch/... | https://servidor/video.mp4 | https://servidor/live.m3u8 | &lt;iframe src='...'&gt;">${escapeHtml(state.liveUrl)}</textarea></div>
            <div class="field"><label>Estado del evento</label><select class="select" name="eventoEstado">${optionList(["Programado", "En vivo", "Grabación disponible", "Cerrado"], state.eventoEstado)}</select></div>
            <button class="btn" type="submit">Guardar transmisión</button>
          </form>
        </div>
        <div class="card col-7">
          <h2>Crear usuario responsable</h2>
          <p>El Super Admin puede crear usuarios internos y dejarlos disponibles para asignación.</p>
          <form id="userForm">
            <div class="form-row"><div class="field"><label>Nombre</label><input class="input" name="nombre" required /></div><div class="field"><label>Cargo</label><input class="input" name="cargo" required /></div></div>
            <div class="form-row"><div class="field"><label>Dependencia</label><input class="input" name="dependencia" required /></div><div class="field"><label>Correo</label><input class="input" name="correo" type="email" /></div></div>
            <div class="field"><label>Celular</label><input class="input" name="celular" /></div>
            <button class="btn" type="submit">Crear usuario</button>
          </form>
        </div>
        <div class="card col-12">
          <div class="action-bar" style="justify-content:space-between">
            <div><h2>Control de solicitudes</h2><p>Revisar, filtrar, reasignar, priorizar para live, responder y exportar.</p></div>
            <div class="action-bar"><button class="btn secondary" data-action="export-csv">Exportar CSV/Excel</button><button class="btn danger" data-action="reset-demo">Reiniciar demo local</button></div>
          </div>
          <div class="form-row three">
            <div class="field"><label>Estado</label><select class="select" id="filterEstado"><option>Todos</option>${optionList(estados, filters.estado)}</select></div>
            <div class="field"><label>Responsable</label><select class="select" id="filterResponsable">${userOptions(filters.responsableId, true)}</select></div>
            <div class="field"><label>Búsqueda</label><input class="input" id="filterTexto" value="${escapeHtml(filters.texto)}" placeholder="Radicado, barrio, tema, texto..." /></div>
          </div>
          ${renderSolicitudesTable(filtered, false)}
        </div>
        <div class="card col-6">
          <h2>Usuarios base</h2>
          <div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Cargo</th><th>Rol</th><th>Asignable</th></tr></thead><tbody>${state.usuarios.map(u => `<tr><td><b>${escapeHtml(u.nombre)}</b><br><span class="muted small">${escapeHtml(u.dependencia)}</span></td><td>${escapeHtml(u.cargo)}</td><td><span class="badge blue">${escapeHtml(u.rol)}</span></td><td>${u.asignable ? "Sí" : "No"}</td></tr>`).join("")}</tbody></table></div>
        </div>
        <div class="card col-6">
          <h2>Auditoría reciente</h2>
          ${renderAuditoria()}
        </div>
      </section>`;
  }

  function filteredSolicitudes() {
    return state.solicitudes.filter(s => {
      const byEstado = filters.estado === "Todos" || s.estado === filters.estado;
      const byResponsable = filters.responsableId === "Todos" || s.responsableId === filters.responsableId;
      const q = filters.texto.trim().toLowerCase();
      const byText = !q || [s.radicado, s.nombreCiudadano, s.barrioVereda, s.mensaje, s.tema, s.dependenciaAsignada].join(" ").toLowerCase().includes(q);
      return byEstado && byResponsable && byText;
    });
  }

  function renderAuditoria() {
    if (!state.auditoria.length) return `<div class="empty">Aún no hay cambios auditados.</div>`;
    return `<div class="security-list">${state.auditoria.slice(0, 8).map(a => `<div class="security-item"><span class="badge">${escapeHtml(a.radicado)}</span><div><b>${escapeHtml(a.accion)}</b><div class="small muted">${formatDate(a.fecha)} — ${escapeHtml(a.usuario)}</div><div class="small">${escapeHtml(a.motivo)}</div></div></div>`).join("")}</div>`;
  }

  function renderResponsable() {
    const user = state.usuarios.find(u => u.id === selectedResponsable) || state.usuarios[0];
    const assigned = state.solicitudes.filter(s => s.responsableId === selectedResponsable);
    return `
      <section class="grid">
        <div class="card col-4">
          <h2>Panel de responsable</h2>
          <p>Selecciona un usuario para simular su bandeja. En producción esto será con inicio de sesión real.</p>
          <div class="field"><label>Usuario responsable</label><select class="select" id="selectResponsable">${userOptions(selectedResponsable)}</select></div>
          <div class="answer-box"><h3>${escapeHtml(user.nombre)}</h3><p>${escapeHtml(user.cargo)}</p><span class="badge blue">Solicitudes asignadas: ${assigned.length}</span></div>
        </div>
        <div class="card col-8">
          <h2>Solicitudes asignadas</h2>
          ${renderSolicitudesTable(assigned, true)}
        </div>
      </section>`;
  }

  function renderSeguridad() {
    return `
      <section class="grid">
        <div class="card col-7">
          <h2>Parámetros de seguridad para producción</h2>
          <p>Esta versión de GitHub Pages es solo para visualización inicial. Para producción, los datos reales deben entrar por backend, autenticación y reglas.</p>
          <div class="security-list">
            ${securityItem("Repositorio privado + Vercel", "El repositorio puede quedar privado y Vercel despliega desde GitHub. El código frontend que llega al navegador no queda totalmente oculto; lo sensible debe ir en backend.")}
            ${securityItem("Firebase Auth", "Los secretarios, alcalde, gestora, técnicas y CIO TICs deben iniciar sesión. No se deben quemar contraseñas ni PIN en el frontend.")}
            ${securityItem("API segura para formulario público", "La ciudadanía no debe escribir directo en Firestore. La solicitud debe pasar por una función backend con validación, rate limit y reCAPTCHA/App Check.")}
            ${securityItem("Reglas por rol", "Super Admin ve y reasigna todo. Cada responsable ve solo lo asignado. Ciudadano consulta con radicado y token seguro.")}
            ${securityItem("Auditoría inalterable", "Toda reasignación, respuesta, cierre o notificación debe guardar usuario, fecha, hora, antes, después y motivo.")}
            ${securityItem("Datos personales", "El formulario debe solicitar autorización de tratamiento de datos y recolectar solo lo necesario.")}
          </div>
        </div>
        <div class="card col-5">
          <h2>Checklist técnico</h2>
          <div class="kpi-strip"><span>HTTPS obligatorio</span><span>reCAPTCHA/App Check</span><span>Rate limiting</span><span>Sanitización XSS</span><span>Variables de entorno</span><span>Backups</span><span>Logs de acceso</span><span>Firestore Rules</span><span>Token de consulta pública</span><span>Exportación controlada</span></div>
          <div class="divider"></div>
          <p class="small muted">Cuando pasemos a Vercel/Firebase, esta misma interfaz se conecta a base de datos real, autenticación y notificaciones.</p>
        </div>
      </section>`;
  }

  function securityItem(title, text) {
    return `<div class="security-item"><span class="badge blue">✓</span><div><b>${escapeHtml(title)}</b><div class="small">${escapeHtml(text)}</div></div></div>`;
  }

  function renderSolicitudesTable(solicitudes, compactRole) {
    if (!solicitudes.length) return `<div class="empty">No hay solicitudes para mostrar.</div>`;
    return `<div class="table-wrap"><table><thead><tr><th>Radicado</th><th>Ciudadano / territorio</th><th>Solicitud</th><th>Responsable</th><th>Estado</th><th>Gestión</th></tr></thead><tbody>${solicitudes.map(s => renderSolicitudRow(s, compactRole)).join("")}</tbody></table></div>`;
  }

  function renderSolicitudRow(s, compactRole) {
    return `
      <tr data-radicado="${escapeHtml(s.radicado)}">
        <td><b>${escapeHtml(s.radicado)}</b><br><span class="small muted">${formatDate(s.createdAt)}</span></td>
        <td><b>${escapeHtml(s.nombreCiudadano)}</b><br>${escapeHtml(s.barrioVereda)} — ${escapeHtml(s.zona)}<br><span class="small muted">${escapeHtml(s.correo || "Sin correo")} | ${escapeHtml(s.celular || "Sin celular")}</span>${s.ubicacionAutorizada ? `<br><span class="small muted">Ubicación: ${escapeHtml(s.latitud)}, ${escapeHtml(s.longitud)}</span>` : ""}</td>
        <td><span class="badge blue">${escapeHtml(s.tipoSolicitud)}</span> <span class="badge">${escapeHtml(s.tema)}</span><br>${escapeHtml(s.mensaje)}${s.respondidaEnVivo ? `<br><span class="badge green">Respondida en vivo ${s.minutoLive ? `— ${escapeHtml(s.minutoLive)}` : ""}</span>` : ""}</td>
        <td><b>${escapeHtml(s.dirigidaA)}</b><br><span class="small muted">${escapeHtml(s.dependenciaAsignada)}</span>${!compactRole ? `<div class="field" style="margin-top:8px"><select class="select compact reassignSelect">${userOptions(s.responsableId)}</select><button class="btn secondary compact" data-action="reassign" data-radicado="${escapeHtml(s.radicado)}" type="button">Reasignar</button></div>` : ""}</td>
        <td><span class="badge ${statusBadgeClass(s.estado)}">${escapeHtml(s.estado)}</span><div class="field" style="margin-top:8px"><select class="select compact estadoSelect">${optionList(estados, s.estado)}</select><button class="btn ghost compact" data-action="change-estado" data-radicado="${escapeHtml(s.radicado)}" type="button">Cambiar</button></div>${s.notificacionEnviada ? `<br><span class="badge green">Notificada</span>` : ""}</td>
        <td>
          <div class="field"><label>Respuesta oficial</label><textarea class="textarea respuestaInput" placeholder="Respuesta oficial para el ciudadano">${escapeHtml(s.respuestaOficial || "")}</textarea></div>
          <div class="form-row">
            <div class="field"><label>Minuto live</label><input class="input minutoInput" value="${escapeHtml(s.minutoLive || "")}" placeholder="01:18:40" /></div>
            <div class="field"><label>Evidencia / URL</label><input class="input evidenciaInput" value="${escapeHtml(s.evidenciaUrl || "")}" placeholder="https://..." /></div>
          </div>
          <label class="check"><input type="checkbox" class="enVivoInput" ${s.respondidaEnVivo ? "checked" : ""} /> <span>Respondida en vivo</span></label>
          <div class="action-bar" style="margin-top:10px">
            <button class="btn success compact" data-action="save-respuesta" data-radicado="${escapeHtml(s.radicado)}" type="button">Guardar respuesta</button>
            <button class="btn gold compact" data-action="mark-notificada" data-radicado="${escapeHtml(s.radicado)}" type="button">Marcar notificada</button>
          </div>
        </td>
      </tr>`;
  }

  function render() {
    const section = activeTab === "publico" ? renderPublico()
      : activeTab === "consulta" ? renderConsulta()
      : activeTab === "superadmin" ? renderSuperAdmin()
      : activeTab === "responsable" ? renderResponsable()
      : renderSeguridad();

    root.innerHTML = `<main class="app-shell">${renderHero()}${renderNav()}${section}</main>`;
    bindForms();
    initializeVideoPlayers();
  }

  function bindForms() {
    document.querySelectorAll("[data-tab]").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));

    const preguntaForm = document.getElementById("preguntaForm");
    if (preguntaForm) preguntaForm.addEventListener("submit", handlePregunta);

    const consultaForm = document.getElementById("consultaForm");
    if (consultaForm) consultaForm.addEventListener("submit", handleConsulta);

    const liveForm = document.getElementById("liveForm");
    if (liveForm) liveForm.addEventListener("submit", handleLive);

    const userForm = document.getElementById("userForm");
    if (userForm) userForm.addEventListener("submit", handleUser);

    const locationBtn = document.getElementById("locationBtn");
    if (locationBtn) locationBtn.addEventListener("click", requestLocation);

    const filterEstado = document.getElementById("filterEstado");
    if (filterEstado) filterEstado.addEventListener("change", e => { filters.estado = e.target.value; render(); });
    const filterResponsable = document.getElementById("filterResponsable");
    if (filterResponsable) filterResponsable.addEventListener("change", e => { filters.responsableId = e.target.value; render(); });
    const filterTexto = document.getElementById("filterTexto");
    if (filterTexto) filterTexto.addEventListener("input", e => { filters.texto = e.target.value; clearTimeout(filterTexto._timer); filterTexto._timer = setTimeout(render, 250); });
    const selectResponsable = document.getElementById("selectResponsable");
    if (selectResponsable) selectResponsable.addEventListener("change", e => { selectedResponsable = e.target.value; render(); });
  }

  function handlePregunta(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!data.get("tratamientoDatos")) {
      showToast("Debes aceptar la autorización de tratamiento de datos.");
      return;
    }
    const mensaje = String(data.get("mensaje") || "").trim();
    const barrioVereda = String(data.get("barrioVereda") || "").trim();
    if (!mensaje || !barrioVereda) {
      showToast("Completa barrio/vereda y el texto de la solicitud.");
      return;
    }
    const responsable = state.usuarios.find(u => u.id === data.get("responsableId")) || state.usuarios[0];
    const radicado = nextRadicado();
    const solicitud = {
      radicado,
      anio: 2026,
      nombreCiudadano: String(data.get("nombreCiudadano") || "").trim() || "Ciudadano no identificado",
      correo: String(data.get("correo") || "").trim(),
      celular: String(data.get("celular") || "").trim(),
      barrioVereda,
      zona: String(data.get("zona") || "No informa"),
      tipoParticipante: String(data.get("tipoParticipante") || "Ciudadano"),
      tipoSolicitud: String(data.get("tipoSolicitud") || "Pregunta"),
      tema: String(data.get("tema") || "Alcaldía / Gestión general"),
      dirigidaA: responsable.nombre,
      responsableId: responsable.id,
      dependenciaAsignada: responsable.dependencia,
      mensaje,
      estado: "Asignada",
      respondidaEnVivo: false,
      minutoLive: "",
      respuestaOficial: "",
      evidenciaUrl: "",
      notificacionEnviada: false,
      ubicacionAutorizada: data.get("ubicacionAutorizada") === "true",
      latitud: data.get("latitud") ? Number(data.get("latitud")) : "",
      longitud: data.get("longitud") ? Number(data.get("longitud")) : "",
      createdAt: nowIso(),
      assignedAt: nowIso(),
      answeredAt: "",
      closedAt: ""
    };
    state.solicitudes = [solicitud, ...state.solicitudes];
    audit(radicado, "Creación de solicitud", "Formulario ciudadano", "Sin registro", responsable.nombre, "Solicitud creada desde el portal público.");
    saveState();
    consultaRadicado = radicado;
    activeTab = "consulta";
    render();
    showToast(`Solicitud registrada correctamente. Radicado: ${radicado}`);
  }

  function requestLocation() {
    const form = document.getElementById("preguntaForm");
    if (!form) return;
    if (!navigator.geolocation) {
      showToast("Este navegador no permite geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        form.elements.latitud.value = Number(pos.coords.latitude.toFixed(6));
        form.elements.longitud.value = Number(pos.coords.longitude.toFixed(6));
        form.elements.ubicacionAutorizada.value = "true";
        showToast("Ubicación aproximada autorizada y registrada en la solicitud.");
      },
      () => showToast("No fue posible obtener la ubicación. Puedes continuar sin compartirla."),
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 60000 }
    );
  }

  function handleConsulta(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    consultaRadicado = String(data.get("radicado") || "").trim();
    render();
    if (!state.solicitudes.some(s => String(s.radicado).toLowerCase() === consultaRadicado.toLowerCase())) showToast("No se encontró ese radicado en esta prueba local.");
  }

  function handleLive(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.liveUrl = String(data.get("liveUrl") || "").trim();
    state.liveEmbedUrl = embedFromUrl(state.liveUrl);
    state.eventoEstado = String(data.get("eventoEstado") || "Programado");
    saveState();
    render();
    showToast("Configuración del live actualizada.");
  }

  function handleUser(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nombre = String(data.get("nombre") || "").trim();
    const cargo = String(data.get("cargo") || "").trim();
    const dependencia = String(data.get("dependencia") || "").trim();
    if (!nombre || !cargo || !dependencia) {
      showToast("Nombre, cargo y dependencia son obligatorios.");
      return;
    }
    const usuario = { id: `${slug(nombre)}-${Date.now().toString(36)}`, nombre, cargo, dependencia, rol: "responsable", correo: String(data.get("correo") || "").trim(), celular: String(data.get("celular") || "").trim(), activo: true, asignable: true };
    state.usuarios.push(usuario);
    saveState();
    render();
    showToast(`Usuario creado: ${usuario.nombre}.`);
  }

  function exportCsv() {
    const header = ["Radicado", "Año", "Fecha y hora", "Nombre ciudadano", "Correo", "Celular", "Barrio/vereda", "Zona", "Tipo participante", "Tipo solicitud", "Tema", "Dirigida a", "Dependencia asignada", "Estado", "Respondida en vivo", "Minuto live", "Respuesta oficial", "Evidencia", "Notificación enviada", "Ubicación autorizada", "Latitud", "Longitud", "Fecha respuesta", "Fecha cierre"];
    const rows = state.solicitudes.map(s => [s.radicado, s.anio, formatDate(s.createdAt), s.nombreCiudadano, s.correo, s.celular, s.barrioVereda, s.zona, s.tipoParticipante, s.tipoSolicitud, s.tema, s.dirigidaA, s.dependenciaAsignada, s.estado, s.respondidaEnVivo ? "Sí" : "No", s.minutoLive, s.respuestaOficial, s.evidenciaUrl, s.notificacionEnviada ? "Sí" : "No", s.ubicacionAutorizada ? "Sí" : "No", s.latitud, s.longitud, formatDate(s.answeredAt), formatDate(s.closedAt)]);
    const escapeCsv = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map(row => row.map(escapeCsv).join(";")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rendicion-cuentas-2026-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function findRowButton(button) {
    const row = button.closest("tr[data-radicado]");
    if (!row) return null;
    const radicado = row.dataset.radicado;
    const solicitud = state.solicitudes.find(s => s.radicado === radicado);
    return { row, radicado, solicitud };
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const action = button.dataset.action;

    if (action === "export-csv") return exportCsv();
    if (action === "reset-demo") {
      if (confirm("Esto borrará las solicitudes de prueba guardadas en este navegador. ¿Continuar?")) {
        localStorage.removeItem(STORAGE_KEY);
        state = defaultState();
        consultaRadicado = "";
        filters = { estado: "Todos", responsableId: "Todos", texto: "" };
        render();
        showToast("Base local reiniciada.");
      }
      return;
    }

    const info = findRowButton(button);
    if (!info || !info.solicitud) return;
    const { row, radicado, solicitud } = info;

    if (action === "reassign") {
      const select = row.querySelector(".reassignSelect");
      const responsable = state.usuarios.find(u => u.id === select.value);
      if (!responsable) return;
      updateSolicitud(radicado, { responsableId: responsable.id, dirigidaA: responsable.nombre, dependenciaAsignada: responsable.dependencia, estado: "Reasignada", assignedAt: nowIso() }, `Reasignación de ${solicitud.dirigidaA} a ${responsable.nombre}`);
      showToast(`${radicado} reasignada a ${responsable.nombre}.`);
      return;
    }

    if (action === "change-estado") {
      const estado = row.querySelector(".estadoSelect").value;
      updateSolicitud(radicado, { estado }, `Cambio de estado a ${estado}`);
      showToast(`${radicado} quedó en estado ${estado}.`);
      return;
    }

    if (action === "save-respuesta") {
      const respuesta = row.querySelector(".respuestaInput").value.trim();
      const evidenciaUrl = row.querySelector(".evidenciaInput").value.trim();
      const minutoLive = row.querySelector(".minutoInput").value.trim();
      const respondidaEnVivo = row.querySelector(".enVivoInput").checked;
      const estado = respondidaEnVivo ? "Respondida en vivo" : "Respondida";
      updateSolicitud(radicado, { respuestaOficial: respuesta, evidenciaUrl, minutoLive, respondidaEnVivo, estado, answeredAt: nowIso(), closedAt: nowIso() }, "Respuesta oficial registrada por responsable.");
      showToast(`${radicado} quedó con respuesta oficial registrada.`);
      return;
    }

    if (action === "mark-notificada") {
      updateSolicitud(radicado, { notificacionEnviada: true, estado: "Notificada" }, "Marcación de notificación enviada al ciudadano.");
      showToast(`Notificación marcada como enviada para ${radicado}.`);
    }
  });

  render();
})();
