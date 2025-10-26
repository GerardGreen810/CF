// --- INICIO 1: referencias a los elementos ---
const videoFondo = document.getElementById("backgroundVideoInicio1");
const transicion = document.getElementById("transicionInicio");
const cinematica = document.getElementById("cinematica1");
const menu = document.getElementById("menuInicio1");

// --- INICIO 2: referencias a los elementos ---
const menuInicio2 = document.getElementById("menuInicio2");
const btnContinuar = document.getElementById("inicio2_leaf1") || document.getElementById("btnContinuar");
const btnNueva = document.getElementById("inicio2_leaf2") || document.getElementById("btnNueva");
const btnEpisodios = document.getElementById("inicio2_leaf3") || document.getElementById("btnEpisodios");
const btnSalirEsquina = document.getElementById("btnSalirEsquina");

let partidaEstado = "no_iniciada"; //'iniciada' o 'no_iniciada'
let estado = "on"; //Estado actual: "on", "transition", "off"

// --- Flag para controlar la carga de escena ---
// Lo usaremos para decirle a iniciarJuego si debe cargar desde un save o empezar en scene_1
window._isContinuingGame = false;


// Tiempo mínimo para la pantalla de carga en ms (ajusta a 3000 - 5000 según prefieras)
window.LOADING_MIN_MS = 4000; // 4000 ms = 4 segundos (como solicitaste)

// bloqueo general de inputs (movimiento y E) durante transiciones/loads
window.inputLocked = false;

// pequeño debounce para la tecla E si lo quieres más restrictivo (opcional)
let canPressE = true;

// registro de escenas completadas (evita reentrar a slides ya vistas)
window.COMPLETED_SCENES = window.COMPLETED_SCENES || {};


/* ---------------- Start overlay lógica (inicio) ---------------- */
(function () {
  const overlay = document.getElementById('startOverlay');
  const prompt = document.getElementById('startOverlayPrompt');
  const titulo = document.getElementById('titulo');

  if (!overlay) return; // si por alguna razon no existe, salir

  // marcar overlay activo
  window._startOverlayActive = true;

  // añadir clase al body para poder ocultar elementos (ej. botón de sonido)
  document.body.classList.add('overlay-active');

  // Mostrar título (fade-in) de forma fiable usando requestAnimationFrame
  if (titulo) {
    // nos aseguramos de arrancar desde estado invisible (CSS ya lo define así)
    // y añadimos la clase en el siguiente frame para forzar la transición
    requestAnimationFrame(() => {
      titulo.classList.add('titulo--visible');
    });
  }

  // marcar prompt visible (inicia su animación)
  // usamos requestAnimationFrame para mejores timing en animación
  requestAnimationFrame(() => {
    overlay.classList.add('start-overlay--visible');
  });

  // bloquear inputs generales mientras el overlay esté activo
  const prevInputLocked = !!window.inputLocked;
  window.inputLocked = true;

  // Handler de aceptación (click o tecla E)
  function acceptOverlay() {
    if (!window._startOverlayActive) return;
    window._startOverlayActive = false;

    // iniciar fade-out del overlay
    overlay.classList.remove('start-overlay--visible');
    overlay.classList.add('start-overlay--hidden');

    // quitar la clase de body (oculta el botón de sonido) para mostrar controles después del fade
    document.body.classList.remove('overlay-active');

    // restaurar inputLocked tras la animación (coincide con CSS: 900ms)
    setTimeout(() => {
      window.inputLocked = !!prevInputLocked;
    }, 2050);

    // ACTIVAR sonido: comporta igual que si se hubiera pulsado el botón de volumen
    try {
      sonidoActivo = true;
      if (iconoSonido) {
        iconoSonido.classList.remove('fa-volume-mute');
        iconoSonido.classList.add('fa-volume-up');
      }
      // desmutear todos los audios/videos
      document.querySelectorAll('audio, video').forEach(media => {
        try { media.muted = false; } catch (e) {}
      });
      // intentar reproducir la música de inicio si existe
      if (typeof musicaInicio !== 'undefined' && musicaInicio) {
        try {
          musicaInicio.muted = false;
          const p = musicaInicio.play();
          if (p && typeof p.catch === 'function') p.catch(()=>{ /* autoplay puede fallar pero el usuario acaba de interactuar */ });
        } catch(e) {}
      }
    } catch (e) {
      console.warn('[startOverlay] error al activar audio:', e);
    }

    // limpiar listeners
    document.removeEventListener('keydown', keydownHandler, true);
    overlay.removeEventListener('click', clickHandler);

    // remover nodo del DOM después del fade-out (un poco después)
    setTimeout(() => {
      try { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); } catch(e){}
    }, 2200);
  }

  function keydownHandler(ev) {
    if (!window._startOverlayActive) return;
    if (ev.key && ev.key.toLowerCase() === 'e') {
      try { ev.preventDefault(); ev.stopImmediatePropagation(); } catch(e){}
      acceptOverlay();
    }
  }

  function clickHandler(ev) {
    acceptOverlay();
  }

  // usar capture true para interceptar E antes que otros handlers
  document.addEventListener('keydown', keydownHandler, true);
  overlay.addEventListener('click', clickHandler, false);
})();


// loadingOverlay - versión robusta: fetch -> blob -> objectURL -> img.decode()
(function () {
  const MIN_SHOW_MS = (window.LOADING_MIN_MS || 3000);
  const MAX_WAIT_MS = 7000; // timeout máximo (ajusta si quieres más paciencia)
  const overlay = document.getElementById('loadingOverlay');
  const textEl = document.getElementById('loadingOverlayText');
  const menuInicio2 = document.getElementById('menuInicio2');
  const menuInicio1 = document.getElementById('menuInicio1');
  const btnSalirEsquina = document.getElementById('btnSalirEsquina');
  if (!overlay || !textEl) {
    console.warn('loadingOverlay: elementos no encontrados.');
    return;
  }

  let dotInterval = null;
  function startDots(){ let d=0; dotInterval=setInterval(()=>{ d=(d%3)+1; textEl.textContent='Cargando'+'.'.repeat(d); },400); }
  function stopDots(){ if(dotInterval) clearInterval(dotInterval); dotInterval=null; textEl.textContent='Cargando'; }

  function showOverlay(){
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden','false');
    startDots();
    document.documentElement.style.overflow='hidden';
    document.body.style.overflow='hidden';
    document.body.classList.add('loading-active');
  }
  function hideOverlay(){
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden','true');
    stopDots();
    document.documentElement.style.overflow='';
    document.body.style.overflow='';
    document.body.classList.remove('loading-active');
  }

  // recoge imgs relevantes (puedes filtrar si hay otras imgs que no sean críticas)
  function collectMenuInicio2ImageElements(){
    if(!menuInicio2) return [];
    // aquí seleccionamos sólo las imgs dentro de #inicio2_container para ser más robustos
    return Array.from(menuInicio2.querySelectorAll('img'));
  }

  // fetch + blob + objectURL + decode para cada URL
  async function fetchAndDecode(url, timeoutMs = 6000){
    // intenta con timeout. Si falla, devolvemos null.
    try {
      const controller = new AbortController();
      const timer = setTimeout(()=>controller.abort(), timeoutMs);
      const res = await fetch(url, {signal: controller.signal, cache: 'force-cache'});
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const blob = await res.blob();
      const objectURL = URL.createObjectURL(blob);
      const tmpImg = new Image();
      tmpImg.src = objectURL;
      // esperar decode
      if (tmpImg.decode) await tmpImg.decode();
      return {ok:true, objectURL};
    } catch (e) {
      console.warn('[preload] fetch/decode failed for', url, e);
      return {ok:false, objectURL:null};
    }
  }

  // precarga todas las imágenes (limita con timeout global MAX_WAIT_MS)
  async function preloadAllImages(imgElements, perImageTimeout = 6000, globalTimeout = MAX_WAIT_MS){
    if (!imgElements || imgElements.length===0) return [];
    const urlSet = new Set();
    for (const img of imgElements) {
      if (img.src) urlSet.add(img.src);
      // Revisamos el dataset (data-*) para todas las variantes
      if (img.dataset) {
        if (img.dataset.normal) urlSet.add(img.dataset.normal);
        if (img.dataset.hover) urlSet.add(img.dataset.hover);
        if (img.dataset.disabled) urlSet.add(img.dataset.disabled);
      }
    }
    // Usar .filter(Boolean) para eliminar null/undefined/empty strings
    const urls = Array.from(urlSet).filter(Boolean);
    console.debug('[preloadAllImages] URLs a precargar:', urls);
    const results = {};
    // Start a global timeout
    let timedOut = false;
    const globalTimer = setTimeout(()=>{ timedOut = true; }, globalTimeout);

    // kick off all fetches in parallel but await them selectively with checks for global timeout
    const promises = urls.map(async (url) => {
      if (timedOut) return {url, ok:false, objectURL:null};
      const r = await fetchAndDecode(url, perImageTimeout);
      results[url] = r;
      return {url, ...r};
    });

    const all = await Promise.all(promises);
    clearTimeout(globalTimer);
    return all; // array of {url, ok, objectURL}
  }

  // Clean up object URLs after a delay to free memory
  function scheduleRevoke(objectURL, delay=30000){
    try {
      setTimeout(()=> {
        try { URL.revokeObjectURL(objectURL); } catch(e){}
      }, delay);
    } catch(e){}
  }

  // wrapper sobre la función global jugar()
  const originalJugar = window.jugar;

  window.jugar = async function (...args) {
    // Si existe auth y no logueado, delegamos (evita empezar precarga si no abrirá menu)
    if (typeof window.AUTH !== 'undefined' && !window.AUTH.logged) {
      if (typeof originalJugar === 'function') return originalJugar.apply(this, args);
      if (typeof openAuthModal === 'function') return openAuthModal('login');
      return;
    }

    // 1) preparar menuInicio2 en DOM pero oculto visualmente
    const imgEls = collectMenuInicio2ImageElements();
    try {
      if (menuInicio2) {
        menuInicio2.style.display = 'block';
        menuInicio2.style.visibility = 'hidden';
        menuInicio2.style.pointerEvents = 'none';
        menuInicio2.setAttribute('aria-hidden','true');
      }
      if (menuInicio1) menuInicio1.style.zIndex = menuInicio1.style.zIndex || '150';
    } catch (e) { console.warn('[jugar wrapper] prep DOM failed', e); }

    // 2) muestra overlay y empieza precarga con fetch+decode
    const t0 = Date.now();
    showOverlay();
    const preloads = await preloadAllImages(imgEls, /*perImageTimeout*/ 6000, /*globalTimeout*/ MAX_WAIT_MS);

    // Si hubo blobs ok, asignarlos a los elementos correspondientes (para forzar uso de objectURLs)
    try {
      for (const imgEl of imgEls) {
        const url = (imgEl.dataset && imgEl.dataset.normal) ? imgEl.dataset.normal : imgEl.src;
        const res = preloads.find(p => p.url === url);
        if (res && res.ok && res.objectURL) {
          // Guarda el original por si necesitas revertir
          if (!imgEl.dataset._origSrc) imgEl.dataset._origSrc = imgEl.src;
          imgEl.src = res.objectURL;
          scheduleRevoke(res.objectURL, 60000); // revocar después de 60s
        } else {
          // si no se pudo, dejamos lo que haya (ya lo descargará el navegador)
        }
      }
    } catch(e){
      console.warn('[jugar wrapper] asignando objectURLs falló', e);
    }

    // 3) esperar al tiempo mínimo visible
    const elapsed = Date.now() - t0;
    const remaining = Math.max(0, MIN_SHOW_MS - elapsed);
    await new Promise(r => setTimeout(r, remaining));

    // 4) ya podemos ejecutar la jugar original (o fallback) y revelar menuInicio2
    try {
      if (typeof originalJugar === 'function') {
        originalJugar.apply(this, args);
      } else {
        if (menuInicio1) menuInicio1.style.display = 'none';
        if (menuInicio2) {
          menuInicio2.style.visibility = 'visible';
          menuInicio2.style.pointerEvents = 'auto';
          menuInicio2.setAttribute('aria-hidden','false');
        }
        if (btnSalirEsquina) btnSalirEsquina.style.display = 'inline-block';
      }
    } catch (err) {
      console.error('Error ejecutando jugar original:', err);
    } finally {
      // 5) Ocultamos overlay (ya está todo listo para pintar sin parpadeos)
      hideOverlay();
      // Asegurar menuInicio2 visible
      try {
        if (menuInicio2) {
          menuInicio2.style.visibility = 'visible';
          menuInicio2.style.pointerEvents = 'auto';
          menuInicio2.setAttribute('aria-hidden','false');
        }
      } catch (e){}
    }
  };

  // Exponer controles por si quieres llamarlo manually
  window.showLoadingOverlay = showOverlay;
  window.hideLoadingOverlay = hideOverlay;
})();



// --- SONIDO Y MÚSICA DE INICIO ---
const btnSonido = document.getElementById("btnSonido");
const iconoSonido = document.getElementById("iconoSonido");
let sonidoActivo = false;

if (btnSonido) {
  btnSonido.addEventListener("click", () => {
    sonidoActivo = !sonidoActivo;
    if (sonidoActivo) {
      iconoSonido.classList.remove("fa-volume-mute");
      iconoSonido.classList.add("fa-volume-up");
    } else {
      iconoSonido.classList.remove("fa-volume-up");
      iconoSonido.classList.add("fa-volume-mute");
    }
    document.querySelectorAll("audio, video").forEach(media => {
      media.muted = !sonidoActivo;
    });
  });
}

const musicaInicio = document.getElementById("musicaInicio");
if (musicaInicio) musicaInicio.volume = 0.5;

// Intentar reproducir automáticamente
window.addEventListener("load", () => {
  if (musicaInicio) musicaInicio.play().catch(() => {
    console.warn("El navegador bloqueó el autoplay hasta que el usuario interactúe.");
  });
});

// Silenciar durante la cinemática
if (cinematica && musicaInicio) {
  cinematica.addEventListener("play", () => {
    musicaInicio.pause();
  });
  cinematica.addEventListener("ended", () => {
    musicaInicio.pause();
    musicaInicio.currentTime = 0;
  });
}


// --- Transición automática de velas ---
setTimeout(() => {
  if (estado === "on" && videoFondo) {
    estado = "transition";
    videoFondo.loop = false;
    videoFondo.pause();
    videoFondo.src = "../videos/candles-off-transition.mp4";
    videoFondo.load();
    videoFondo.play().catch(()=>{});

    videoFondo.onended = () => {
      if (estado === "transition") {
        estado = "off";
        videoFondo.loop = true;
        videoFondo.pause();
        videoFondo.src = "../videos/candles-off-loop.mp4";
        videoFondo.load();
        videoFondo.play().catch(()=>{});
      }
    };
  }
}, 10000);


// --- BOTONES ---
function jugar() {
  // Si no hay sesión iniciada, mostremos modal de login/registro
  if (!window.AUTH || !window.AUTH.logged) {
    openAuthModal('login'); // función definida en auth.js
    return;
  }

  // Si llegamos aquí, hay sesión -> comportamiento original
  menu.style.display = "none";
  menuInicio2.style.display = "block";
  btnSalirEsquina.style.display = "inline-block";
  actualizarBotonesSegunEstado();
}



function mostrarInicio1() {
  menu.style.display = "block";
  menuInicio2.style.display = "none";
  btnSalirEsquina.style.display = "none";
}

function actualizarBotonesSegunEstado() {
  // mantiene comportamiento anterior para el botón "real" (si existe)
  if (!btnContinuar) return;

  if (partidaEstado === "iniciada") {
    btnContinuar.classList.remove("inactivo");
    btnContinuar.disabled = false;
  } else {
    btnContinuar.classList.add("inactivo");
    btnContinuar.disabled = true;
  }

  // Delegar la actualización visual/handlers específicos de la hoja
  try {
    if (typeof window._updateLeaf1ByState === 'function') {
      window._updateLeaf1ByState();
    } else {
      // Si no existe la función (caso muy raro), hacemos un cambio visual mínimo SIN
      // adjuntar hover handlers: solo pointerEvents y aria.
      const leaf1 = document.getElementById('inicio2_leaf1');
      if (leaf1) {
        if (partidaEstado === 'iniciada') {
          leaf1.style.pointerEvents = 'auto';
          leaf1.setAttribute('aria-disabled', 'false');
          const normal = leaf1.getAttribute('data-normal') || leaf1.dataset._origSrc || '';
          if (normal) leaf1.src = normal;
          leaf1.classList.remove('disabled');
        } else {
          leaf1.style.pointerEvents = 'none';
          leaf1.setAttribute('aria-disabled', 'true');
          // solo cambiar imagen si existe la de disabled; no tocar hover handlers
          if (leaf1.dataset && leaf1.dataset.disabled) {
            leaf1.src = leaf1.dataset.disabled;
          } else {
            leaf1.classList.add('disabled');
          }
        }
      }
    }
  } catch (e) {
    console.warn('actualizarBotonesSegunEstado: fallo updating leaf1', e);
  }
}



// ==================================================================
// ----------               continuarPartida                ----------
//            (REESCRITA v2, con 'await play()')
// ==================================================================
async function continuarPartida() {
  if (partidaEstado !== "iniciada") return;

  // 1. Obtener referencias
  const loadingScreenEl = document.getElementById('loadingScreen');
  const loadingVideoEl = document.getElementById('loadingVideo');
  const menuEl = document.getElementById('menuInicio1');
  const menu2El = document.getElementById('menuInicio2');
  const btnSalirEl = document.getElementById('btnSalirEsquina');

  if (!loadingScreenEl || !loadingVideoEl) {
    console.error("Faltan elementos de loadingScreen. Abortando.");
    // Fallback sin pantalla de carga
    window._isContinuingGame = true;
    await iniciarJuego();
    return;
  }

  // 2. Definir la tarea de carga (se ejecutará en paralelo)
  const loadTask = async () => {
    try {
      // Ocultar menús (esto se ejecuta en paralelo, "detrás" del telón)
      if (menuEl) menuEl.style.display = "none";
      if (menu2El) menu2El.style.display = "none";
      if (btnSalirEl) btnSalirEl.style.display = "none";
      
      // Iniciar la carga del juego
      window._isContinuingGame = true;
      await iniciarJuego(); // Esto carga y muestra escenario (z-index 2)
    } catch (err) {
      console.error("Error durante loadTask en continuarPartida:", err);
    }
  };
  
  // 3. Definir el tiempo mínimo
  const minTimePromise = new Promise(r => setTimeout(r, window.LOADING_MIN_MS || 4000));

  // 4. Mostrar la pantalla de carga (el "telón")
  try {
    loadingScreenEl.classList.remove('hidden');
    loadingScreenEl.style.display = 'flex';
    loadingScreenEl.setAttribute('aria-hidden', 'false');
    
    // Configurar video
    const videoSrc = '../videos/pruebas/candles-on-loop.mp4';
    const sourceEl = loadingVideoEl.querySelector('source');
    if (sourceEl && !sourceEl.src.includes(videoSrc)) {
        sourceEl.src = videoSrc;
        loadingVideoEl.load();
    } else if (!sourceEl) {
        loadingVideoEl.innerHTML = `<source src="${videoSrc}" type="video/mp4">`;
        loadingVideoEl.load();
    }
    
    loadingVideoEl.muted = !window.sonidoActivo;
    loadingVideoEl.loop = true;
    loadingVideoEl.currentTime = 0;

    // ¡¡¡CAMBIO CLAVE!!!
    // Primero, intentamos reproducir el video y ESPERAMOS (await)
    // a que el navegador nos diga que ha comenzado.
    await loadingVideoEl.play();
    console.log("Video de carga iniciado.");

  } catch (e) {
    console.warn("Error al mostrar/reproducir loadingScreen. El juego cargará de todos modos.", e);
    // Si el play() falla (ej. autoplay bloqueado), no nos detenemos.
    // La carga del juego (paso 5) se ejecutará de todos modos.
  }

  // 5. Iniciar la tarea de carga y esperar a que AMBAS (tarea y tiempo) terminen
  try {
    // Ejecutamos la carga y esperamos a que el tiempo mínimo pase
    const loadPromise = loadTask(); // Inicia la carga AHORA
    await Promise.all([loadPromise, minTimePromise]);

    console.log("Carga y tiempo mínimo completados.");

    // 6. Transición de salida:
    //    Ahora la escena 1 está cargada y visible (pero oculta por loadingScreenEl).
    //    Simplemente desvanecemos loadingScreenEl usando su clase CSS 'hidden'
    //    que ya tiene la transición de 1.6s.
    
    loadingScreenEl.classList.add('hidden');
    loadingScreenEl.setAttribute('aria-hidden', 'true');

    // Esperamos a que la transición termine (1600ms) antes de ocultarlo
    // con display:none y detener el video.
    setTimeout(() => {
        try {
            loadingScreenEl.style.display = 'none';
            loadingVideoEl.pause();
            console.log("Pantalla de carga oculta.");
        } catch (e) { /* ignorado */ }
    }, 1600); // Debe coincidir con la transición en styles.css

  } catch (err) {
    console.error('[continuarPartida] Error en Promise.all o fade-out:', err);
    // Fallback: ocultar la pantalla de carga de golpe si todo lo demás falla
    loadingScreenEl.classList.add('hidden');
    loadingScreenEl.style.display = 'none';
    loadingVideoEl.pause();
  }
}


// --- Helper para el modal de confirmación de Nueva Partida ---
// Esta función devuelve una Promesa que se resuelve (true) si confirman, o (false) si cancelan.
function _mostrarConfirmacionNuevaPartida() {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmNuevaPartidaModal");
    const btnOK = document.getElementById("btnConfirmNuevaPartida_OK");
    const btnCancel = document.getElementById("btnConfirmNuevaPartida_Cancel");

    // Si por alguna razón no encontramos los elementos, fallamos de forma segura
    // (resolve(true)) para no bloquear al jugador.
    if (!modal || !btnOK || !btnCancel) {
      console.warn("Elementos del modal de confirmación no encontrados. Saltando confirmación.");
      resolve(true); 
      return;
    }

    // Función interna para cerrar y limpiar
    function cerrar(decision) {
      modal.style.display = "none";
      // Limpiamos los listeners para evitar clics duplicados en el futuro
      btnOK.onclick = null;
      btnCancel.onclick = null;
      resolve(decision);
    }

    // Asignamos los eventos de clic
    // Usamos .onclick para sobreescribir fácilmente cualquier listener antiguo
    btnOK.onclick = () => cerrar(true);
    btnCancel.onclick = () => cerrar(false);

    // Mostramos el modal
    modal.style.display = "flex";
  });
}


// ==================================================================
// ----------                nuevaPartida                   ----------
// (REESCRITA para usar cinemática como pantalla de carga)
// ==================================================================
async function nuevaPartida() {
  // 1. Comprobar autenticación
  if (!window.AUTH || !window.AUTH.logged) {
    openAuthModal('login');
    return;
  }

  // 2. Pedir confirmación si ya existe una partida
  if (partidaEstado === "iniciada") {
    const ok = await _mostrarConfirmacionNuevaPartida();
    if (!ok) return;
  }

  // 3. Crear/Reiniciar el guardado en el servidor
  try {
    const nuevaPartidaPayload = {
      scene_id: 1, // El ID de la escena en la BD
      scene_slug: "scene_1", // El slug de la primera escena
      state_json: { // Un estado mínimo para que no esté vacío
        scene_slug: "scene_1",
        scene_index: 0,
        scene_id: 1,
        saved_at: (new Date()).toISOString(),
        new_game: true
      }
    };

    const res = await fetch("../PHP/guardar_partida.php", {
      method: "POST",
      cache: "no-store",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaPartidaPayload)
    });

    const data = await res.json();
    if (data && data.success) {
      partidaEstado = "iniciada";
      localStorage.setItem("partida_estado", "iniciada");
      actualizarBotonesSegunEstado();
    } else {
      throw new Error(data.message || "Fallo al guardar en servidor");
    }
  } catch (err) {
    console.warn("Error al crear nueva partida (network). Se activará localmente:", err);
    partidaEstado = "iniciada";
    localStorage.setItem("partida_estado", "iniciada");
    actualizarBotonesSegunEstado();
  }

  // 4. Ocultar menús INMEDIATAMENTE
  if (menu) menu.style.display = "none";
  if (menuInicio2) menuInicio2.style.display = "none";
  if (btnSalirEsquina) btnSalirEsquina.style.display = "none";

  // 5. Iniciar la carga de la escena 1 EN SEGUNDO PLANO
  //    (No usamos 'await' para que continúe la ejecución)
  window._isContinuingGame = false; // Es partida nueva
  const gameLoadPromise = iniciarJuego(); // ¡Guarda la promesa!

  // 6. Iniciar transición visual (fade a negro)
  await fadeOverlay(1, 500); // Usamos el helper de fade

  // 7. Preparar botón de skip y función de limpieza
  const btnSkip = document.getElementById('btnSkipCinematica');
  let cinematicFinished = false; // Flag para evitar doble ejecución

  const handleSkipOrEnd = async () => {
    if (cinematicFinished) return; // Evitar doble ejecución
    cinematicFinished = true;

    if (btnSkip) {
      btnSkip.style.display = 'none';
      btnSkip.onclick = null;
    }
    
    // Iniciar fade a negro (o asegurarse de que sigue negro)
    await fadeOverlay(1, 300);

    // Detener cinemática
    if (cinematica) {
      cinematica.pause();
      cinematica.onended = null;
      cinematica.style.display = 'none';
    }
    
    // ¡AQUÍ ESTÁ LA MAGIA!
    // Esperar a que la carga del juego (que empezó en paso 5) termine
    try {
      await gameLoadPromise;
    } catch (err) {
      console.error("Error durante la carga del juego (en nuevaPartida):", err);
    }

    // Ahora que el juego está cargado, hacer fade in para revelar la escena 1
    await fadeOverlay(0, 500);
  };
  
  // 8. Mostrar y reproducir la cinemática
  if (cinematica) {
    cinematica.style.display = "block";
    try { cinematica.removeAttribute("controls"); } catch(e){}
    
    if (btnSkip) {
      btnSkip.style.display = 'block';
      btnSkip.onclick = handleSkipOrEnd;
    }

    // Hacer fade in para mostrar la cinemática
    await fadeOverlay(0, 500);

    cinematica.play().catch(() => {
      console.warn("Autoplay bloqueado. Saltando cinemática.");
      handleSkipOrEnd(); // Si falla, se salta
    });
    
    // Cuando el video termine NORMALMENTE, también llamamos a la limpieza
    cinematica.onended = handleSkipOrEnd;

  } else {
    // Fallback si no hay cinemática
    console.warn("No se encontró cinemática, saltando a la carga.");
    handleSkipOrEnd(); // Ir directo a la parte final (esperar carga y fade in)
  }
}



if (btnSalirEsquina) btnSalirEsquina.addEventListener("click", mostrarInicio1);


// --- CARGAR DIALOGS AL INICIO ---
window.addEventListener('load', () => {
  if (window.dialogManager && typeof window.dialogManager.load === 'function') {
    dialogManager.load('../data/dialogs.json').catch((err) => {
      console.warn('No se pudieron cargar los diálogos (../data/dialogs.json):', err);
    });
  } else {
    console.warn('dialogManager no encontrado al intentar cargar ../data/dialogs.json');
  }

  // Cargar acts.json
  if (window.actsManager && typeof window.actsManager.load === 'function') {
    actsManager.load('../data/acts.json')
      .then(() => console.debug('[load] acts.json cargado', window.actsManager._internal().acts))
      .catch((err) => console.warn('No se pudieron cargar los actos (../data/acts.json):', err));
  } else {
    console.warn('actsManager no encontrado o no tiene método load.');
  }
});



// --- Estado de partida ---
// función que comprueba estado en servidor (intenta por usuario autenticado)
// y como fallback usa localStorage
function comprobarEstadoPartida() {
  const url = '../PHP/estado_partida.php';
  fetch(url, { cache: "no-store" })
    .then(res => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(data => {
      partidaEstado = (data && data.estado === "iniciada") ? "iniciada" : "no_iniciada";
      localStorage.setItem("partida_estado", partidaEstado);
      actualizarBotonesSegunEstado();

      // --- INICIO DE LA SOLUCIÓN (RACE CONDITION) ---
      // Notificamos al resto del script que la comprobación terminó
      window._lastPartidaEstado = partidaEstado;
      window._partidaChecked = true;
      try {
        window.dispatchEvent(new Event('partida:checked'));
      } catch(e) {}
      // --- FIN DE LA SOLUCIÓN ---
    })
    .catch((err) => {
      // fallback: localStorage si falla
      const local = localStorage.getItem("partida_estado");
      partidaEstado = (local === "iniciada") ? "iniciada" : "no_iniciada";
      actualizarBotonesSegunEstado();

      // --- INICIO DE LA SOLUCIÓN (también en el catch) ---
      window._lastPartidaEstado = partidaEstado;
      window._partidaChecked = true;
      try {
        window.dispatchEvent(new Event('partida:checked'));
      } catch(e) {}
      // --- FIN DE LA SOLUCIÓN ---
    });
}

// Llamada inicial (por si auth ya estaba lista)
comprobarEstadoPartida();
// Re-ejecutar cuando auth.js indique que terminó la comprobación de sesión
window.addEventListener('auth:checked', () => {
  comprobarEstadoPartida();
});


/* ---------- (FUNCIONES showLoadingScreen y hideLoadingScreen ELIMINADAS) ---------- */
// ... (El espacio de las líneas 799-923 está ahora vacío) ...


// --- INICIO2: setup de hojas / reemplazo de botones por imágenes ---
// --- SETUP INICIO2: hojas y botones ---
function setupInicio2() {
  // obtener referencias iniciales (pueden ser nodos antiguos)
  let leaf1 = document.getElementById('inicio2_leaf1'); // CONTINUAR
  let leaf2 = document.getElementById('inicio2_leaf2'); // NUEVA
  let leaf3 = document.getElementById('inicio2_leaf3'); // EPISODIOS
  const menu2 = document.getElementById('menuInicio2');

  if (!menu2 || (!leaf1 && !leaf2 && !leaf3)) return;

  // ---- Primero: clonamos leaf2 y leaf3 (si existen) para limpiar listeners antiguos,
  // y luego leemos de nuevo los nodos para trabajar sobre los elementos "frescos".
  if (leaf2) {
    try { leaf2.parentNode.replaceChild(leaf2.cloneNode(true), leaf2); } catch(e){}
  }
  if (leaf3) {
    try { leaf3.parentNode.replaceChild(leaf3.cloneNode(true), leaf3); } catch(e){}
  }

  // relectura de nodos (ahora son los nuevos clones, sin listeners)
  leaf1 = document.getElementById('inicio2_leaf1');
  leaf2 = document.getElementById('inicio2_leaf2');
  leaf3 = document.getElementById('inicio2_leaf3');

  // Preload helper
  function preload(src) {
    if (!src) return;
    const i = new Image();
    i.src = src;
  }

  [leaf1, leaf2, leaf3].forEach(l => {
    if (!l) return;
    preload(l.getAttribute('data-normal'));
    preload(l.getAttribute('data-hover'));
    if (l.dataset && l.dataset.disabled) preload(l.dataset.disabled);
  });

  // --- hover / touch handlers factory ---
  function makeHoverHandlers(imgEl) {
    if (!imgEl) return null;
    const normal = imgEl.getAttribute('data-normal');
    const hover = imgEl.getAttribute('data-hover');

    const mouseenter = () => { if (hover) imgEl.src = hover; imgEl.classList.add('is-hovered'); };
    const mouseleave = () => { if (normal) imgEl.src = normal; imgEl.classList.remove('is-hovered'); };

    let touched = false;
    const touchstart = (ev) => {
      if (!touched) {
        touched = true;
        if (hover) imgEl.src = hover;
        setTimeout(() => { touched = false; if (normal) imgEl.src = normal; }, 800);
        ev.preventDefault();
      } else {
        imgEl.click();
      }
    };

    return { mouseenter, mouseleave, touchstart };
  }

  function attachHoverSwapTo(imgEl) {
    if (!imgEl) return;
    const existing = imgEl._hoverHandlers;
    if (existing) {
      imgEl.removeEventListener('mouseenter', existing.mouseenter);
      imgEl.removeEventListener('mouseleave', existing.mouseleave);
      imgEl.removeEventListener('touchstart', existing.touchstart, { passive: false });
    }
    const h = makeHoverHandlers(imgEl);
    if (!h) return;
    imgEl.addEventListener('mouseenter', h.mouseenter);
    imgEl.addEventListener('mouseleave', h.mouseleave);
    imgEl.addEventListener('touchstart', h.touchstart, { passive: false });
    imgEl._hoverHandlers = h;
  }

  function detachHoverSwapFrom(imgEl) {
    if (!imgEl || !imgEl._hoverHandlers) return;
    const h = imgEl._hoverHandlers;
    imgEl.removeEventListener('mouseenter', h.mouseenter);
    imgEl.removeEventListener('mouseleave', h.mouseleave);
    imgEl.removeEventListener('touchstart', h.touchstart, { passive: false });
    imgEl._hoverHandlers = null;
  }

  const DISABLED_SRC = (leaf1 && leaf1.dataset && leaf1.dataset.disabled) ? leaf1.dataset.disabled : '../img/inicio2_op1_disabled.png';

  // --- Leaf2 y Leaf3: attach hover Y click sobre los clones (ya frescos) ---
  if (leaf2) {
    attachHoverSwapTo(leaf2);
    leaf2.addEventListener('click', (e) => { e.preventDefault(); if (typeof nuevaPartida === 'function') nuevaPartida(); });
  }
  if (leaf3) {
    attachHoverSwapTo(leaf3);
    leaf3.addEventListener('click', (e) => { e.preventDefault(); if (typeof episodios === 'function') episodios(); });
  }

  // --- Leaf1: funciones para habilitar / deshabilitar (idempotentes y seguras) ---
  function enableLeaf1() {
    const current = document.getElementById('inicio2_leaf1');
    if (!current) return;
    if (!current.dataset._origSrc) current.dataset._origSrc = current.getAttribute('data-normal') || current.src || '';
    current.classList.remove('disabled');
    current.setAttribute('aria-disabled', 'false');
    current.style.pointerEvents = 'auto';
    const normal = current.getAttribute('data-normal') || current.dataset._origSrc || '';
    if (normal) current.src = normal;

    // clonamos para asegurarnos de listeners limpios, y luego attach hover+click
    current.replaceWith(current.cloneNode(true));
    const fresh = document.getElementById('inicio2_leaf1');
    if (!fresh) return;
    // attach hover
    attachHoverSwapTo(fresh);
    // attach click
    fresh.addEventListener('click', (e) => { e.preventDefault(); if (typeof continuarPartida === 'function') continuarPartida(); });
  }

  function disableLeaf1() {
    const current = document.getElementById('inicio2_leaf1');
    if (!current) return;
    if (!current.dataset._origSrc) current.dataset._origSrc = current.getAttribute('data-normal') || current.src || '';
    // detach hover handlers
    detachHoverSwapFrom(current);
    // clone to remove click handlers (si existen)
    current.replaceWith(current.cloneNode(true));
    const fresh = document.getElementById('inicio2_leaf1');
    if (!fresh) return;
    if (fresh.dataset && fresh.dataset.disabled) {
      fresh.src = fresh.dataset.disabled;
    } else {
      fresh.src = DISABLED_SRC;
    }
    fresh.classList.add('disabled');
    fresh.setAttribute('aria-disabled', 'true');
    fresh.style.pointerEvents = 'none';
  }

  // sincroniza leaf1 con partidaEstado
  function updateLeaf1ByState() {
    if (typeof partidaEstado !== 'undefined' && partidaEstado === 'iniciada') {
      enableLeaf1();
    } else {
      disableLeaf1();
    }
  }

  // llamada inicial (si ya tenemos partidaEstado)
  if (typeof partidaEstado !== 'undefined') {
    updateLeaf1ByState();
  }

  // Exponer globalmente la función para que otros módulos la llamen
  window._updateLeaf1ByState = updateLeaf1ByState;
}



// --- Aseguramos que se ejecute solo después de comprobar partida ---
function initSetupInicio2AfterEstado() {
  let handled = false;

  function runSetup() {
    if (handled) return;
    handled = true;
    try {
      setupInicio2();
      if (typeof window._updateLeaf1ByState === 'function') window._updateLeaf1ByState();
    } catch (e) {
      console.warn('initSetupInicio2AfterEstado: setupInicio2 falló', e);
    }
  }

  // Si la comprobación ya terminó (flag), arrancamos inmediatamente
  if (window._partidaChecked) {
    // sincronizamos partidaEstado por si el comprobador dejó el valor
    if (typeof window._lastPartidaEstado !== 'undefined') {
      partidaEstado = window._lastPartidaEstado;
    }
    runSetup();
    return;
  }

  // escuchamos el evento normal
  const onChecked = (ev) => {
    runSetup();
    try { window.removeEventListener('partida:checked', onChecked); } catch(e){}
  };
  window.addEventListener('partida:checked', onChecked);

  // fallback: si no llega el evento, arrancamos tras timeout corto
  setTimeout(() => {
    runSetup();
    try { window.removeEventListener('partida:checked', onChecked); } catch(e){}
  }, 1200);
}


initSetupInicio2AfterEstado();


// ----------------------------
// MENU "Inicio 3" (Episodios) - USANDO EL DOM EXISTENTE EN HTML
// - No crea elementos si ya existen en el HTML (tu index.html ya tiene #menuInicio3)
// - Abre/oculta el overlay y gestiona listeners de forma idempotente
// ----------------------------
(function setupMenuInicio3FromHTML() {
  const menu3El = document.getElementById('menuInicio3');
  if (!menu3El) {
    console.warn('setupMenuInicio3FromHTML: no se encontró #menuInicio3 en el HTML. Asegúrate de añadirlo.');
    // fallback: define episodios() como alert para evitar romper llamadas previas
    window.episodios = function () { alert('Próximamente'); };
    return;
  }

  // referencias a elementos internos (según tu HTML)
  const btnCerrar = document.getElementById('btnCerrarEpisodios');
  const btn1 = document.getElementById('episodio1') || document.getElementById('episodio1_btn');
  const btn2 = document.getElementById('episodio2') || document.getElementById('episodio2_btn');
  const btn3 = document.getElementById('episodio3') || document.getElementById('episodio3_btn');

  // helpers para guardar/restore display previo
  function stashDisplay(el) {
    if (!el) return;
    el.dataset._prevDisplay = (el.style.display === '') ? getComputedStyle(el).display : el.style.display;
  }
  function restoreDisplay(el, fallback = '') {
    if (!el) return;
    el.style.display = (el.dataset && el.dataset._prevDisplay) ? el.dataset._prevDisplay : fallback;
    delete el.dataset._prevDisplay;
  }

  // función de cierre (expuesta también)
  function closeMenu3() {
    if (menu3El) menu3El.style.display = 'none';
    restoreDisplay(menuInicio2, 'block');
    restoreDisplay(menu, 'block');
    restoreDisplay(btnSalirEsquina, 'none');
    document.body.style.overflow = '';
    // si quieres, puedes remover listeners aquí (no necesario si no se crean duplicados)
  }

  // abrir (muestra y bloquea scroll)
  function openMenu3() {
    // evitar abrir si input bloqueado o en SLIDE_MODE
    if (typeof inputLocked !== 'undefined' && inputLocked) {
      console.debug('openMenu3: inputLocked activo, evitando abrir menú de episodios.');
      return;
    }

    // stash prev display values
    stashDisplay(menuInicio2);
    stashDisplay(menu);
    stashDisplay(btnSalirEsquina);

    // ocultar menús previos
    if (menuInicio2) menuInicio2.style.display = 'none';
    if (menu) menu.style.display = 'none';
    if (btnSalirEsquina) btnSalirEsquina.style.display = 'none';

    // mostrar overlay existente
    menu3El.style.display = 'flex';
    menu3El.style.flexDirection = 'column';
    document.body.style.overflow = 'hidden';
  }

  // inicialización única de listeners (idempotente)
  if (!menu3El.dataset._init) {
    // botones de episodio -> por ahora muestran "Próximamente"
    [btn1, btn2, btn3].forEach((b) => {
      if (!b) return;
      // evitar añadir el mismo listener varias veces: limpiar antes
      b.replaceWith(b.cloneNode(true));
    });

    // re-obtener referencias porque clonamos
    const _btn1 = document.getElementById('episodio1') || document.getElementById('episodio1_btn');
    const _btn2 = document.getElementById('episodio2') || document.getElementById('episodio2_btn');
    const _btn3 = document.getElementById('episodio3') || document.getElementById('episodio3_btn');

    [_btn1, _btn2, _btn3].forEach((b) => {
      if (!b) return;
      b.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Próximamente');
      });
    });

    // botón cerrar
    if (btnCerrar) {
      // quitamos listeners duplicados (reemplazando)
      btnCerrar.replaceWith(btnCerrar.cloneNode(true));
      const _btnCerrar = document.getElementById('btnCerrarEpisodios');
      if (_btnCerrar) _btnCerrar.addEventListener('click', (e) => { e.preventDefault(); closeMenu3(); });
    } else {
      // si no existe botón cerrar en HTML, permite cerrar clicando el fondo
      menu3El.addEventListener('click', (ev) => {
        if (ev.target === menu3El) closeMenu3();
      });
    }

    // cerrar con Escape
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && menu3El.style.display !== 'none') closeMenu3();
    });

    menu3El.dataset._init = '1';
  }

  // Exponer funciones globalmente por si quieres abrir/ cerrar desde consola / otras partes
  window._openMenuInicio3 = openMenu3;
  window._closeMenuInicio3 = closeMenu3;

  // Reemplazamos la función global episodios() para que abra este menu
  window.episodios = function episodios_replacement() {
    openMenu3();
  };

  // Asegurarnos de que cualquier botón antiguo con id 'btnEpisodios' use la nueva función
  const oldBtn = document.getElementById('btnEpisodios');
  if (oldBtn) {
    try {
      const clone = oldBtn.cloneNode(true);
      oldBtn.parentNode.replaceChild(clone, oldBtn);
      clone.addEventListener('click', () => { window.episodios(); });
    } catch (e) {}
  }
})();



// --- JUGABILIDAD ---
const escenario = document.getElementById("escenario");
const personaje = document.getElementById("personaje");
const personajeCamina = document.getElementById("personajeCamina");
const personajeContenedor = document.getElementById("personaje-contenedor");

// --- EFECTO DE SONIDO DE PASOS ---
const pasosSFX = document.getElementById("pasosSFX");


const limitePersonajeIzq = 45; 
const limitePersonajeDer = 55;
let fondoX = 0;
let limiteIzq = 0;
let limiteDer = -1000;

let posPersonaje = 50;
const minPercent = 5;
const maxPercent = 95;
const centerPercent = 50;

// velocidad base: píxeles por segundo (ajústala a tu gusto)
const baseSpeedPxPerSec = 350; 

// para cálculo de tiempo entre frames
let lastTimestamp = performance.now();


// Función para cargar diálogo desde el servidor usando un "trigger_signal"
async function loadDialogByTrigger(triggerSignal) {
  try {
    const url = `../PHP/get_dialog.php?signal=${encodeURIComponent(triggerSignal)}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.warn('loadDialogByTrigger: respuesta HTTP', response.status, response.url);
      return null;
    }
    const data = await response.json();
    if (!data || !data.success) {
      console.warn('No se encontró diálogo (server):', data && data.message);
      return null;
    }
    return data.lines || null;
  } catch (error) {
    console.error("Error al cargar diálogo (network):", error);
    return null;
  }
}


// ==================================================================
// ----------                 iniciarJuego                  ----------
//   (MODIFICADA para cargar la escena 1 o la escena guardada)
// ==================================================================
async function iniciarJuego() {
  // Ocultar login una vez se entra al juego
  const authContainer = document.getElementById("authContainer");
  if (authContainer) authContainer.style.display = "none";

  // Detener música del inicio
  if (musicaInicio && !musicaInicio.paused) {
    musicaInicio.pause();
    musicaInicio.currentTime = 0;
  }

  // Ocultar elementos del menú/intro
  if (cinematica) {
    cinematica.pause();
    cinematica.currentTime = 0;
    cinematica.style.display = "none";
  }
  if (videoFondo) {
    videoFondo.pause();
    videoFondo.currentTime = 0;
    videoFondo.style.display = "none";
  }
  if (transicion) transicion.style.display = "none";
  
  // Asegurarse de que AMBOS menús están ocultos
  if (menu) menu.style.display = "none";
  if (menuInicio2) menuInicio2.style.display = "none";
  if (btnSalirEsquina) btnSalirEsquina.style.display = "none";


  // Mostrar escenario del juego
  if (escenario) escenario.style.display = "block";
  fondoX = 0;
  if (escenario) escenario.style.backgroundPosition = "0px 0";

  console.log("Iniciando carga de escena...");
  
  try {
    // --- Lógica para cargar estado ---
    let startSlug = 'scene_1'; // Default para nueva partida
    
    // Si _isContinuingGame es true, intentamos cargar el estado
    if (window._isContinuingGame) {
      try {
        const res = await fetch('../PHP/load_state.php?latest=1', { cache: 'no-store' });
        const data = await res.json();
        if (data.success && data.save && data.save.scene_slug) {
          startSlug = data.save.scene_slug;
          console.log('load_state success, iniciando en:', startSlug);
        } else {
            console.warn('load_state exitoso, pero no se encontró scene_slug. Iniciando en scene_1');
        }
      } catch (e) {
        console.warn('load_state falló, iniciando en scene_1', e);
      }
      window._isContinuingGame = false; // reset flag
    }
    // --- Fin lógica cargar estado ---
    
    // Cargar la escena (ya sea 'scene_1' o la guardada)
    if (typeof changeToSceneBySlug === 'function') {
        await changeToSceneBySlug(startSlug);
    } else {
        // Fallback
        const m = startSlug.match(/scene_(\d+)/);
        indiceEscenarioActual = (m) ? (parseInt(m[1], 10) - 1) : 0;
        await actualizarEscenario({ entrada: 'left' });
    }
    
    console.log(`Escena ${startSlug} cargada.`);

  } catch (err) {
    console.error("Error al cargar la escena en iniciarJuego:", err);
    // Propagar el error para que el caller pueda manejarlo
    throw err; 
  }

  // El safeguard de inputLocked se movió al final de iniciarTransicion
  // para manejar mejor los diálogos que cargan al inicio
}


let teclas = { a: false, d: false };
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "a") teclas.a = true;
  if (e.key.toLowerCase() === "d") teclas.d = true;
});
document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "a") teclas.a = false;
  if (e.key.toLowerCase() === "d") teclas.d = false;
  if (personaje) personaje.style.display = "block";
  if (personajeCamina) {
    personajeCamina.style.display = "none";
    personajeCamina.pause();
  }
});

// Fondo
let fondoImagen = new Image();
fondoImagen.src = "../img/escena1.png";
fondoImagen.onload = () => calcularLimites();

function calcularLimites() {
  const ventanaAncho = window.innerWidth;
  const ventanaAlto = window.innerHeight;

  // seguridad por si fondoImagen aún no tiene dimensiones válidas
  if (!fondoImagen || !fondoImagen.width || !fondoImagen.height) {
    limiteIzq = 0;
    limiteDer = 0;
    return;
  }

  const escala = ventanaAlto / fondoImagen.height;
  const anchoRenderizado = fondoImagen.width * escala;

  limiteIzq = 0;
  // si la imagen escalada es menor o igual que la ventana -> no hay desplazamiento (limiteDer = 0)
  // si la imagen es más ancha -> limiteDer será negativo (valor máximo 0)
  limiteDer = Math.min(0, -(anchoRenderizado - ventanaAncho));
}


window.addEventListener("resize", calcularLimites);

function enExtremo() {
  return (
    (posPersonaje <= minPercent && fondoX === limiteIzq) ||
    (posPersonaje >= maxPercent && fondoX === limiteDer)
  );
}

// --- Interacción con "E" ---
const mensajeE = document.getElementById("mensajeE");
let enRangoInteraccion = false;
let puertaActual = null; // "izq" | "der" | null
if (mensajeE) mensajeE.style.display = "none";


function isElemVisibleInViewport(el) {
  if (!el) return false;
  if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
  const rect = el.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > (window.innerHeight || document.documentElement.clientHeight)) return false;
  if (rect.right < 0 || rect.left > (window.innerWidth || document.documentElement.clientWidth)) return false;
  return true;
}

function mostrarMensajeE() {
  if (!mensajeE) return;

  // limpia cualquier estilo residual (muy importante)
  // esto no elimina clases ni CSS externo, solo inline styles
  mensajeE.style.cssText = ''; 
  mensajeE.style.position = 'fixed';
  mensajeE.style.zIndex = 9998;
  mensajeE.style.whiteSpace = 'nowrap';
  mensajeE.style.pointerEvents = 'none';
  mensajeE.style.fontSize = '20px';
  mensajeE.style.fontWeight = 'bold';
  mensajeE.style.color = 'white';
  mensajeE.style.textShadow = '2px 2px 6px rgba(0,0,0,0.8)';
  mensajeE.style.padding = '6px 10px';
  mensajeE.style.background = 'rgba(0,0,0,0.45)';
  mensajeE.style.borderRadius = '6px';
  // asegurar que no hay right/left/top/bottom residuales
  mensajeE.style.left = 'auto';
  mensajeE.style.right = 'auto';
  mensajeE.style.top = 'auto';
  mensajeE.style.bottom = 'auto';
  mensajeE.style.transform = 'none';

  // Si estamos en slide mode -> mensaje centrado abajo
  if (window.SLIDE_MODE) {
    mensajeE.style.left = '50%';
    mensajeE.style.transform = 'translateX(-50%)';
    mensajeE.style.bottom = '6%';
    mensajeE.style.display = 'block';
    console.debug('[mensajeE] rama: SLIDE_MODE -> bottom center');
    return;
  }

  // Si hay rango de interacción y personaje visible -> posicionar encima del personaje
  if (enRangoInteraccion) {
    // si contenedor inexistente o no visible -> fallback a centro inferior
    if (!personajeContenedor || !isElemVisibleInViewport(personajeContenedor)) {
      mensajeE.style.left = '50%';
      mensajeE.style.transform = 'translateX(-50%)';
      mensajeE.style.bottom = '6%';
      mensajeE.style.display = 'block';
      console.debug('[mensajeE] rama: enRango but personaje no visible -> bottom center');
      return;
    }

    // obtener rect y posicionar exactamente (centro sobre la cabeza)
    const rect = personajeContenedor.getBoundingClientRect();
    const leftPx = rect.left + rect.width / 2;
    const topPx = rect.top - (rect.height * 0.15) - 6;
    const topAjustado = Math.max(8, topPx);

    mensajeE.style.left = `${Math.round(leftPx)}px`;
    mensajeE.style.top = `${Math.round(topAjustado)}px`;
    mensajeE.style.transform = 'translateX(-50%)';
    mensajeE.style.display = 'block';
    console.debug('[mensajeE] rama: enRango -> positioned over character', { leftPx, topAjustado, rect });
    return;
  }

  // Si no hay interacción ni slides: esconder mensaje
  mensajeE.style.display = 'none';
  console.debug('[mensajeE] rama: hidden');
}


// ---------------------
// Interactuables personalizados (puertas reemplazo)
// ---------------------
// Configurable: cada interactuable acepta:
// { id, xPercent, rangePercent, active, triggerSignal, direction }
// - id: string único (ej. "puerta_reemplazo")
// - xPercent: número (0..100) posición horizontal relativa
// - rangePercent: número (rango +/- en % que activa la interacción)
// - active: bool (si está activado para ser detectado)
// - triggerSignal: string (trigger a pasar a acts/dialog manager)
// - direction: 1 | -1 | null -> si debe llamar iniciarTransicion(1) o (-1) cuando no hay act/dialog
// Interactuables por defecto (incluye puertas de borde para poder habilitarlas/deshabilitarlas)
// Interactuables configurables (incluye puertas de borde para poder habilitarlas/deshabilitarlas)
// Reutilizable: cada interactuable puede tener `action: { type: 'start_scene', slug: 'scene_5' }`
window.customInteractables = window.customInteractables || [
  {
    id: 'door_left',
    xPercent: minPercent,   // usa tus constantes para mantener coherencia
    rangePercent: 6,
    active: true,
    triggerSignal: 'door_left',
    direction: -1,
    action: null
  },
  {
    id: 'door_right',
    xPercent: maxPercent,
    rangePercent: 6,
    active: true,
    triggerSignal: 'door_right',
    direction: 1,
    action: null
  },
  {
    id: 'puerta_reemplazo',
    xPercent: 40,     // ajusta la posición horizontal aquí
    rangePercent: 4,  // ajuste fino de rango
    active: false,    // INACTIVO hasta que termine el act
    triggerSignal: null, // no dispara el act; en su lugar ejecuta action
    direction: 1,
    action: { type: 'start_scene', slug: 'scene_5' } // al pulsar E -> ir a scene_5
  }
];


// Set de interactuables explícitamente deshabilitados (puedes manipular desde consola)
window.DISABLED_INTERACTABLES = window.DISABLED_INTERACTABLES || new Set();

// Helpers públicos para activar/desactivar interactuables desde la consola
window.enableInteractable = function(id) {
  const it = (window.customInteractables || []).find(i => i.id === id);
  if (it) it.active = true;
  window.DISABLED_INTERACTABLES.delete(id);
  console.debug('[interactables] enabled', id);
};
window.disableInteractable = function(id) {
  const it = (window.customInteractables || []).find(i => i.id === id);
  if (it) it.active = false;
  window.DISABLED_INTERACTABLES.add(id);
  console.debug('[interactables] disabled', id);
};
window.isInteractableEnabled = function(id) {
  const it = (window.customInteractables || []).find(i => i.id === id);
  return !!(it && it.active && !window.DISABLED_INTERACTABLES.has(id));
};

// util: buscar interactuable activo por posición (posPersonaje en %)
function _findCustomInteractableAtPosition(posPercent) {
  const list = (window.customInteractables || []).filter(i => i && i.active && !window.DISABLED_INTERACTABLES.has(i.id));
  let best = null;
  let bestDist = Infinity;
  for (const it of list) {
    const dist = Math.abs(posPercent - (Number(it.xPercent) || 0));
    const range = Number(it.rangePercent) || 0;
    if (dist <= range && dist < bestDist) {
      bestDist = dist;
      best = it;
    }
  }
  return best;
}


// util: mapear act key candidato para un triggerSignal (misma lógica que actsManager.startActForTrigger)
function _findActKeyForTrigger(triggerSignal) {
  try {
    const acts = (window.actsManager && typeof window.actsManager._internal === 'function')
      ? (window.actsManager._internal().acts || {})
      : {};
    const currentScene = window.CURRENT_SCENE_SLUG || null;
    for (const k of Object.keys(acts || {})) {
      const a = acts[k];
      const metaSignal = a.trigger_signal || (a.meta && a.meta.trigger_signal) || (a.meta && a.meta.triggerSignal);
      if (!metaSignal) continue;
      if (metaSignal !== triggerSignal) continue;
      if (a.scene) {
        if (!currentScene) continue;
        if (a.scene !== currentScene) continue;
      }
      return a.key;
    }
  } catch (e) { console.warn('_findActKeyForTrigger error', e); }
  return null;
}


function animarMovimiento(timestamp) {
  // Si input bloqueado o estamos en slide mode, no procesar movimiento
  if (window.inputLocked || window.SLIDE_MODE) {
    requestAnimationFrame(animarMovimiento);
    return;
  }

  const now = typeof timestamp === "number" ? timestamp : performance.now();
  const dt = Math.min(0.05, (now - lastTimestamp) / 1000);
  lastTimestamp = now;

  const movementPx = baseSpeedPxPerSec * dt;

  if ((teclas.a || teclas.d) && !enExtremo()) {
    if (personaje) personaje.style.display = "none";
    if (personajeCamina) {
      personajeCamina.style.display = "block";
      if (personajeCamina.paused) {
        personajeCamina.currentTime = 0;
        personajeCamina.play().catch(() => {});
      }
    }

    if (pasosSFX && pasosSFX.paused) {
      pasosSFX.currentTime = 0;
      pasosSFX.loop = true;
      pasosSFX.volume = 0.4;
      pasosSFX.play().catch(() => {});
    }
  } else {
    if (personaje) personaje.style.display = "block";
    if (personajeCamina) {
      personajeCamina.style.display = "none";
      personajeCamina.pause();
    }
    if (pasosSFX) {
      pasosSFX.pause();
      pasosSFX.currentTime = 0;
    }
  }

  const percentDelta = (movementPx / window.innerWidth) * 100;

  if (teclas.a) {
    if (personajeContenedor) personajeContenedor.style.transform = "translateX(-50%) scaleX(-1)";

    if (fondoX < limiteIzq && posPersonaje <= centerPercent) {
      fondoX = Math.min(limiteIzq, fondoX + movementPx);
    } else if (posPersonaje > minPercent) {
      posPersonaje = Math.max(minPercent, posPersonaje - percentDelta);
    }
  } else if (teclas.d) {
    if (personajeContenedor) personajeContenedor.style.transform = "translateX(-50%) scaleX(1)";

    if (fondoX > limiteDer && posPersonaje >= centerPercent) {
      fondoX = Math.max(limiteDer, fondoX - movementPx);
    } else if (posPersonaje < maxPercent) {
      posPersonaje = Math.min(maxPercent, posPersonaje + percentDelta);
    }
  }

  fondoX = Math.max(limiteDer, Math.min(limiteIzq, fondoX));
  posPersonaje = Math.max(minPercent, Math.min(maxPercent, posPersonaje));
  if (escenario) escenario.style.backgroundPosition = `${Math.round(fondoX)}px 0`;
  if (personajeContenedor) personajeContenedor.style.left = `${posPersonaje}%`;

    // ===== nueva comprobación: custom interactables por posición =====
  enRangoInteraccion = false;
  puertaActual = null;

  // Prioridad 1: custom interactables configurados (por posición)
  const foundCustom = _findCustomInteractableAtPosition(posPersonaje);
  if (foundCustom) {
    enRangoInteraccion = true;
    puertaActual = foundCustom.id; // ej. "puerta_reemplazo"
    // mostramos el mensaje y saltamos la detección por extremos
    mostrarMensajeE();
    requestAnimationFrame(animarMovimiento);
    return;
  }
  // ===== fin comprobación custom =====


  const tolerancia = 5;
  // calcular targetIndex dependiendo del borde
  if (posPersonaje <= minPercent + tolerancia) {
    const targetIndex = indiceEscenarioActual - 1;
    if (!(window.COMPLETED_SCENES && window.COMPLETED_SCENES[targetIndex])) {
      enRangoInteraccion = true;
      puertaActual = "izq";
    } else {
      // opcional: esconder mensaje si la escena destino ya fue completada
      // mensajeE.style.display = 'none';
    }
  } else if (posPersonaje >= maxPercent - tolerancia) {
    const targetIndex = indiceEscenarioActual + 1;
    if (!(window.COMPLETED_SCENES && window.COMPLETED_SCENES[targetIndex])) {
      enRangoInteraccion = true;
      puertaActual = "der";
    }
  }

  mostrarMensajeE();
  requestAnimationFrame(animarMovimiento);
}

animarMovimiento();


// Permite cambiar a escena por slug (busca índice y actualiza indiceEscenarioActual)
async function changeToSceneBySlug(slug) {
  // intenta extraer número de slug 'scene_N'
  const m = slug.match(/scene_(\d+)/);
  if (!m) {
    console.warn('Slug no soportado: ' + slug + '. Forzando a scene_1');
    indiceEscenarioActual = 0; // Fallback a escena 1
  } else {
    indiceEscenarioActual = parseInt(m[1], 10) - 1;
  }

  // forzamos aplicación
  await actualizarEscenario({ entrada: 'left' });
}
window.changeToSceneBySlug = changeToSceneBySlug;



// --- VARIABLES DE ESCENARIO ---
let indiceEscenarioActual = 0;
const escenariosLista = []; // vacío si todo viene del servidor

// --- cambiarEscenario: espera a que actualizarEscenario termine antes de fijar personaje ---
// ==================================================
async function cambiarEscenario(direccion) {
  // actualizar índice y construir slug
  indiceEscenarioActual += direccion;
  const slug = 'scene_' + (indiceEscenarioActual + 1);
  console.log('Cambiando a slug:', slug);

  try {
    const sceneData = await loadSceneFromServer({ slug });
    if (!sceneData || !sceneData.success) {
      console.warn("No existe la escena con slug:", slug);
      indiceEscenarioActual -= direccion; // revertir índice
      return;
    }

    // Guardar slug y raw assets globalmente (applyScene también lo hace normalmente)
    window.CURRENT_SCENE_SLUG = (sceneData.scene && sceneData.scene.slug) ? sceneData.scene.slug : slug;
    window.CURRENT_SCENE_ASSETS_RAW = sceneData.assets || window.CURRENT_SCENE_ASSETS_RAW || {};

    const assets = sceneData.assets || {};
    const format = (sceneData.scene && sceneData.scene.format) ? sceneData.scene.format : 'side_scroll';
    const versionParam = (new Date()).getTime();

    if (format === 'slides') {
      // PREVENT RACE: marcar SLIDE_MODE y bloquear inputs antes de cargar la escena
      window.SLIDE_MODE = true;
      window.inputLocked = true;
      enRangoInteraccion = false;
      puertaActual = null;

      // CENTRAR y OCULTAR contenedor del personaje para evitar detecciones en bordes
      posPersonaje = 50;
      if (personajeContenedor) {
        personajeContenedor.style.left = '50%';
        personajeContenedor.style.transform = 'translateX(-50%)';
        personajeContenedor.style.display = 'none';
      }
      if (personaje) try { personaje.style.display = 'none'; } catch(e) {}
      if (personajeCamina) try { personajeCamina.style.display = 'none'; } catch(e) {}

      // applyScene se encargará de setear CURRENT_SCENE_ASSETS y manejar activateSlides
      await applyScene(sceneData, { entrada: direccion === 1 ? 'left' : 'right' });

    
    // --- auto-start dialog_on_load (centralizado y retrasado ligeramente) ---
    try {
      const dialogKey = (sceneData && sceneData.scene && sceneData.scene.meta && sceneData.scene.meta.dialog_on_load)
        ? sceneData.scene.meta.dialog_on_load
        : null;

      if (dialogKey && window.dialogManager && typeof window.dialogManager.startDialogForTrigger === 'function') {
        // Retardo pequeño para garantizar que fades / loading screens han terminado.
        setTimeout(() => {
          try {
            // safeguard: sólo iniciar si la escena activa aún coincide
            const currentSlug = window.CURRENT_SCENE_SLUG || null;
            // Si sceneData tiene slug explícito, preferirlo; si no, no iniciar
            const appliedSlug = (sceneData.scene && sceneData.scene.slug) ? sceneData.scene.slug : null;
            if (appliedSlug && currentSlug && appliedSlug !== currentSlug) {
              console.debug('[cambiarEscenario] dialog_on_load skipped because slug changed', { appliedSlug, currentSlug });
              return;
            }
            dialogManager.startDialogForTrigger(dialogKey).then((started) => {
              console.debug('[cambiarEscenario] dialog_on_load attempt (delayed):', dialogKey, 'started?', started);
            }).catch((err) => {
              console.warn('[cambiarEscenario] startDialogForTrigger error for', dialogKey, err);
            });
          } catch (e) {
            console.warn('[cambiarEscenario] dialog_on_load delayed: guard failed', e);
          }
        }, 160);
      }
    } catch (e) {
      console.warn('[cambiarEscenario] error evaluating dialog_on_load (delayed)', e);
    }


      // --- seguridad: si tras aplicar la escena no hay diálogo activo, desbloqueamos input ---
      try {
        if (window.dialogManager && typeof window.dialogManager.forceUnlock === 'function') {
          const cm = window.dialogManager._internal();
          if (!cm.current) {
            dialogManager.forceUnlock();
            console.debug('[cambiarEscenario] safeguard: forceUnlock() ejecutado (no dialog activo)');
          } else {
            console.debug('[cambiarEscenario] safeguard: dialog activo tras aplicar escena:', cm.current.key);
          }
        } else {
          // fallback
          window.inputLocked = false;
          console.debug('[cambiarEscenario] safeguard fallback: inputLocked = false');
        }
      } catch (e) {
        console.warn('[cambiarEscenario] safeguard fallo', e);
        window.inputLocked = false;
      }


    } else {
      // SIDE_SCROLL u otros formatos con background
      const bgList = assets['background'] || [];
      const bgAsset = bgList[0] || null;

      if (!bgAsset) {
        console.warn("Escena no tiene background:", slug);
        indiceEscenarioActual -= direccion; // revertir índice
        return;
      }

      // Aplicar background con cache-bust
      const bgUrl = `../${bgAsset.path}?v=${versionParam}`;
      try {
        escenario.style.backgroundImage = `url('${bgUrl}')`;
        escenario.style.backgroundSize = "cover";
        escenario.style.backgroundRepeat = "no-repeat";
        escenario.style.backgroundPosition = "center";
      } catch (e) {
        console.warn('No se pudo aplicar background via estilo directa:', e);
      }

      // Recalcular límites cuando la imagen cargue
      const nuevaImagen = new Image();
      nuevaImagen.src = bgUrl;
      nuevaImagen.onload = () => {
        try {
          fondoImagen = nuevaImagen;
          const escala = window.innerHeight / nuevaImagen.height;
          const anchoRenderizado = nuevaImagen.width * escala;
          limiteIzq = 0;
          limiteDer = Math.min(0, -(anchoRenderizado - window.innerWidth));
          // Posicionar fondo según dirección de entrada
          fondoX = direccion === 1 ? limiteDer : 0;
          if (escenario) escenario.style.backgroundPosition = `${Math.round(fondoX)}px 0`;
        } catch (e) {
          console.warn('Error en onload de nuevaImagen:', e);
        }
      };

      // Aplicar el resto de assets y lógica de escena (applyScene precargará lo necesario)
      await applyScene(sceneData, { entrada: direccion === 1 ? 'left' : 'right' });

      // --- auto-start dialog_on_load ---
      // Si la escena tiene meta.dialog_on_load, intentar iniciarlo (prefiere diálogos locales)
      // --- auto-start dialog_on_load (centralizado y retrasado ligeramente) ---
      try {
        const dialogKey = (sceneData && sceneData.scene && sceneData.scene.meta && sceneData.scene.meta.dialog_on_load)
          ? sceneData.scene.meta.dialog_on_load
          : null;

        if (dialogKey && window.dialogManager && typeof window.dialogManager.startDialogForTrigger === 'function') {
          // Pequeña espera para garantizar que la UI (fades, loading screen, background render) esté estable.
          // 120-180ms es suficiente y evita que el diálogo aparezca "antes" de todo lo demás.
          setTimeout(() => {
            dialogManager.startDialogForTrigger(dialogKey).then((started) => {
              console.debug('[cambiarEscenario] dialog_on_load attempt (delayed):', dialogKey, 'started?', started);
            }).catch((err) => {
              console.warn('[cambiarEscenario] startDialogForTrigger error for', dialogKey, err);
            });
          }, 160);
        }
      } catch (e) {
        console.warn('[cambiarEscenario] error evaluating dialog_on_load (delayed)', e);
      }
    }

  } catch (err) {
    console.error('Error cargando escena desde server:', err);
    indiceEscenarioActual -= direccion; // revertir si falla
    return;
  }

  // ajustar personaje SOLO si no estamos en modo slides
  if (!window.SLIDE_MODE) {
    const margenBorde = 2;
    posPersonaje = direccion === 1 ? minPercent + margenBorde : maxPercent - margenBorde;
    try {
      if (personajeContenedor) personajeContenedor.style.left = `${posPersonaje}%`;
      if (personajeContenedor) personajeContenedor.style.transform = direccion === 1 ? "translateX(-50%) scaleX(1)" : "translateX(-50%) scaleX(-1)";
    } catch (e) {
      console.warn('No se pudo posicionar personajeContenedor:', e);
    }
  }

  console.log(`Escenario cambiado a índice ${indiceEscenarioActual}, personaje en ${posPersonaje}% (SLIDE_MODE=${!!window.SLIDE_MODE})`);
}


async function transitionToSceneSlug(slug, { fadeMs = 500 } = {}) {
  if (!slug) return;
  if (transicionEnCurso) return;
  transicionEnCurso = true;
  window.inputLocked = true;
  try {
    // fade out
    await fadeOverlay(1, fadeMs);
    // cambiar a slug (changeToSceneBySlug ya actualiza indiceEscenarioActual)
    if (typeof changeToSceneBySlug === 'function') {
      try {
        await changeToSceneBySlug(slug);
      } catch (e) {
        console.warn('transitionToSceneSlug: changeToSceneBySlug falló', e);
      }
    } else if (typeof actualizarEscenario === 'function') {
      // fallback: si sólo tienes actualizarEscenario, intenta calcular index desde slug
      try {
        const m = String(slug).match(/scene_(\d+)/);
        if (m) {
          indiceEscenarioActual = parseInt(m[1], 10) - 1;
          await actualizarEscenario({ entrada: 'left' });
        }
      } catch (e) { console.warn('transitionToSceneSlug fallback failed', e); }
    }
    // fade in
    await fadeOverlay(0, fadeMs);
  } catch (e) {
    console.warn('transitionToSceneSlug error', e);
  } finally {
    transicionEnCurso = false;
    window.inputLocked = false;
  }
}


// --- DETECCIÓN DE TECLA "E" + TRANSICIÓN SUAVE ENTRE ESCENAS ---
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() !== "e") return;

  // evitar acción si input bloqueado o en transición
  if (transicionEnCurso || inputLocked) return;

  // si estamos en slide mode, NO ejecutar la transición de escena aquí
  if (window.SLIDE_MODE) return;

  try {
    const cm = (window.dialogManager && typeof window.dialogManager._internal === 'function')
      ? window.dialogManager._internal()
      : null;
    if (cm && cm.current) {
      // diálogo activo -> ignorar E
      try { e.preventDefault(); } catch(e) {}
      return;
    }
  } catch (e) {}

  // debounce para evitar rebotes
  if (!canPressE) return;
  canPressE = false;
  setTimeout(() => { canPressE = true; }, 300);

  if (!enRangoInteraccion) return;

  // Si puertaActual es un custom interactable, obtén su definición
  let ci = null;
  if (puertaActual && (window.customInteractables || []).length) {
    ci = (window.customInteractables || []).find(i => i.id === puertaActual);
  }

  // Si el interactuable tiene una action explícita (ej. start_scene), la ejecutamos
  if (ci && ci.action && ci.action.type === 'start_scene' && ci.action.slug) {
    // Ejecutar transición a slug (sin intentar acts/dialog)
    try {
      transitionToSceneSlug(ci.action.slug).catch(()=>{});
    } catch (e) {
      console.warn('Error al ejecutar action.start_scene', e);
    }
    return;
  }

  // Determinar triggerSignal y direction usando custom interactable si existe, si no usar izq/der
  let triggerSignal = null;
  let targetDirection = null;

  if (ci && ci.active && !window.DISABLED_INTERACTABLES.has(ci.id)) {
    triggerSignal = ci.triggerSignal || null;
    targetDirection = (typeof ci.direction !== 'undefined') ? ci.direction : null;
  } else {
    if (puertaActual === "izq") { triggerSignal = 'door_left'; targetDirection = -1; }
    else if (puertaActual === "der") { triggerSignal = 'door_right'; targetDirection = 1; }
    else {
      // si no hay trigger definido: nada que hacer
      console.warn('[E handler] puertaActual no corresponde a interactuable conocido:', puertaActual);
      return;
    }
  }

  // helper: fallback a dialog/transition (centralizado)
  function _performDialogOrTransitionFallback() {
    if (window.dialogManager && typeof window.dialogManager.startDialogForTrigger === 'function') {
      dialogManager.startDialogForTrigger(triggerSignal).then((startedDialog) => {
        if (startedDialog) return;
        if (targetDirection === -1) iniciarTransicion(-1);
        else if (targetDirection === 1) iniciarTransicion(1);
        else if (puertaActual === "izq") iniciarTransicion(-1);
        else if (puertaActual === "der") iniciarTransicion(1);
      }).catch(() => {
        if (targetDirection === -1) iniciarTransicion(-1);
        else if (targetDirection === 1) iniciarTransicion(1);
        else if (puertaActual === "izq") iniciarTransicion(-1);
        else if (puertaActual === "der") iniciarTransicion(1);
      });
    } else {
      if (targetDirection === -1) iniciarTransicion(-1);
      else if (targetDirection === 1) iniciarTransicion(1);
      else if (puertaActual === "izq") iniciarTransicion(-1);
      else if (puertaActual === "der") iniciarTransicion(1);
    }
  }

  // helper: acciones a ejecutar cuando un act se ejecutó y terminó (post-act)
  function _onActCompletedForTrigger() {
    try {
      // Desactivar la puerta original (si existe) y activar la puerta de reemplazo
      window.disableInteractable && window.disableInteractable('door_right');
      window.enableInteractable && window.enableInteractable('puerta_reemplazo');
    } catch (e) {
      console.warn('[onActCompleted] fallo al togglear interactuables', e);
    }
  }

  // Intentar actsManager primero (si existe)
  if (window.actsManager && typeof window.actsManager.startActForTrigger === 'function' && triggerSignal) {
    try {
      actsManager.startActForTrigger(triggerSignal).then((startedAct) => {
        // startActForTrigger -> true si ejecutó y finalizó un act; false si no hay act candidato
        if (startedAct) {
          // Un act se ejecutó y terminó: aplicar post-act
          _onActCompletedForTrigger();
          return;
        }
        // Si no hubo act: fallback a diálogo/transition
        _performDialogOrTransitionFallback();
      }).catch((e) => {
        console.warn('[actsManager] startActForTrigger error', e);
        _performDialogOrTransitionFallback();
      });
    } catch (e) {
      console.warn('actsManager invoke failed', e);
      _performDialogOrTransitionFallback();
    }
  } else {
    // No hay actsManager o no hay trigger -> fallback
    _performDialogOrTransitionFallback();
  }
});


// --- CONTROL DE TRANSICIÓN VISUAL ENTRE ESCENARIOS ---
// --- iniciarTransicion: ahora espera al cambio de escenario antes de fade in ---
let transicionEnCurso = false;

// ----------------------------
// HELPERS: overlay / fades
// ----------------------------
function ensureFadeOverlay() {
  let overlay = document.getElementById("fadeTransicion");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "fadeTransicion";
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'black',
      opacity: '0',
      transition: 'opacity 0.5s ease',
      zIndex: '200000', // MODIFICADO: z-index alto para estar SOBRE loadingScreen
      pointerEvents: 'none'
    });
    document.body.appendChild(overlay);
  }
  return overlay;
}

function fadeOverlay(targetOpacity = 1, duration = 500) {
  const overlay = ensureFadeOverlay();
  overlay.style.transition = `opacity ${duration}ms ease`;
  // Forzamos reflow para asegurar transición real
  return new Promise(resolve => {
    requestAnimationFrame(() => { 
        overlay.style.opacity = String(targetOpacity); 
        setTimeout(resolve, duration + 20); // Esperar que la transición termine
    });
  });
}

// ----------------------------
// Reproductor genérico de SFX por role ('start' | 'end')
// - acepta sceneData completo, o assetsRaw (objeto role=>list), o nada (usa CURRENT_SCENE_ASSETS_RAW)
// ----------------------------
window.playSceneSFX = function(role = 'start', sceneOrAssets = null) {
  try {
    role = (role || 'start').toString().replace(/^sfx_?/i, '').toLowerCase(); // 'start'|'end'
    const roleKey = 'sfx_' + role;

    // Normalizar assetsRaw:
    let assetsRaw = {};
    if (sceneOrAssets && sceneOrAssets.assets) {
      // se pasó sceneData
      assetsRaw = sceneOrAssets.assets;
    } else if (sceneOrAssets && typeof sceneOrAssets === 'object') {
      // se pasó directamente assets object
      assetsRaw = sceneOrAssets;
    } else {
      // fallback global
      assetsRaw = window.CURRENT_SCENE_ASSETS_RAW || {};
    }

    // priorizar sfx_start / sfx_end; fallback a 'sfx'
    let list = assetsRaw[roleKey] || [];
    if (!list || !list.length) list = assetsRaw['sfx'] || [];
    if (!list || !list.length) return false;

    // reproducir todos los assets (no-loop por defecto)
    const played = [];
        for (const a of list) {
      if (!a || !a.path) continue; // SALTAR assets sin path válido
      if (typeof a.path !== 'string' || a.path.trim() === '') continue;
      const url = (typeof assetUrl === 'function') ? assetUrl(a.path) : ('../' + a.path);

      // create audio safely and guard play with try/catch
      try {
        const audioEl = new Audio(url + '?v=' + (new Date()).getTime());
        try {
          const meta = (a.meta && typeof a.meta === 'string') ? JSON.parse(a.meta) : (a.meta || {});
          audioEl.volume = (meta && meta.volume != null) ? meta.volume : 1.0;
          if (meta && meta.loop) audioEl.loop = true;
        } catch (e) {
          audioEl.volume = 1.0;
        }
        audioEl.play().catch((err)=>{ console.warn('playSceneSFX: play() failed for', url, err); });
        audioEl.addEventListener('ended', () => { try { audioEl.src = ''; } catch(e){} });
        played.push(audioEl);
      } catch (err) {
        console.warn('playSceneSFX: crear/reproducir audio falló para', a.path, err);
        continue;
      }
    }

    return played.length ? played : true;
  } catch (err) {
    console.warn('playSceneSFX error', err);
    return false;
  }
};


// iniciarTransicion: fade a negro -> (extra negro opcional) -> cambiarEscena -> fade in
// dirección: -1 (izq) o 1 (der)
// opciones: { fadeMs = 500, extraBlackMs = 0 }
async function iniciarTransicion(direccion, { fadeMs = 500, extraBlackMs = 0 } = {}) {
  if (transicionEnCurso) return;
  transicionEnCurso = true;
  window.inputLocked = true;

  try {
    const overlay = ensureFadeOverlay();

    // 1) reproducir SFX 'end' de la escena ACTUAL (si existe) -- pasa assets RAW actuales
    try {
      await window.playSceneSFX && window.playSceneSFX('end', window.CURRENT_SCENE_ASSETS_RAW);
    } catch (e) { console.warn('SFX end failed', e); }

    // 2) FADE OUT (a negro)
    await fadeOverlay(1, fadeMs);

    // 3) tiempo extra en negro si lo deseas
    if (extraBlackMs > 0) await new Promise(res => setTimeout(res, extraBlackMs));

    // 4) cambiar escena (espera a que terminar)
    try {
      await cambiarEscenario(direccion);
    } catch (err) {
      console.error("Error en cambiarEscenario:", err);
    }

    // 5) reproducir SFX 'start' de la nueva escena (pasando assets RAW actual)
      // pequeño retraso para asegurar que applyScene ya dejó window.CURRENT_SCENE_ASSETS_RAW listo
          // 5) reproducir SFX 'start' de la nueva escena inmediatamente (applyScene ya dejó CURRENT_SCENE_ASSETS_RAW)
    try {
      if (window.playSceneSFX) window.playSceneSFX('start', window.CURRENT_SCENE_ASSETS_RAW);
    } catch (e) {
      console.warn('SFX start failed', e);
    }

    // 6) FADE IN (revelar)
    await fadeOverlay(0, fadeMs);

  } catch (err) {
    console.error("Error en iniciarTransicion:", err);
    } finally {
    // Restaurar estado: terminar la transición y desbloquear input
    transicionEnCurso = false;
    // Solo desbloqueamos la entrada si no hay un diálogo activo
    try {
      const cm = (window.dialogManager && typeof window.dialogManager._internal === 'function')
        ? window.dialogManager._internal()
        : null;
      if (cm && cm.current) {
        // Si hay diálogo activo, mantenemos inputLocked = true (dialogManager lo controlará)
        console.debug('[iniciarTransicion] diálogo activo tras transición, no desbloqueando input');
      } else {
        window.inputLocked = false;
        console.debug('[iniciarTransicion] transición finalizada -> input desbloqueado');
      }
    } catch (e) {
      // Fallback: desbloquear para evitar quedarnos pegados por errores inesperados
      window.inputLocked = false;
      console.warn('[iniciarTransicion] error al comprobar diálogo activo, desbloqueando input por seguridad', e);
    }
  }
}
