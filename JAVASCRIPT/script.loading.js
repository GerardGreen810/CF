
/*
  script.loading.js
  Añade una pantalla de carga basada en vídeo para el flujo "Continuar" (inicio2 -> escena1)
  y soporte para usar la cinemática como pantalla de carga en "Nueva partida".

  Instrucciones de integración:
  - Incluye este script **después** de tu script principal (por ejemplo, tras script.cleaned.js)
    para que sobreescriba/añada la función continuarPartida().
  - No modifica index.html: el overlay de carga se crea dinámicamente por JS.
  - Requiere que exista en el DOM:
      - #menuInicio1  (inicio)
      - #menuInicio2  (menu con hojas)
      - #escenario     (contenedor de la escena 1)
      - #cinematica1   (video de la cinemática) -- opcional (se usa para nueva partida si se desea)
      - #btnSkipCinematica (para permitir saltar)
  - Llama a window.iniciarJuego() si existe para cargar la escena; si no, intenta loadSceneFromServer().
*/

(function () {
  // Configurables
  const DEFAULT_MIN_MS = 5000; // duración mínima de la "pantalla de carga" en ms (aprox 5s)
  const FADE_MS = 600;         // duración de crossfades entre overlay y escena
  const MENU_FADE_MS = 220;    // fade para ocultar menús
  const OVERLAY_Z = 200000;    // z-index para overlay de vídeo (muy alto para cubrir todo)

  // Ruta por defecto para el vídeo de loading si no quieres usar cinemática
  window.LOADING_SCREEN_VIDEO_SRC = window.LOADING_SCREEN_VIDEO_SRC || '../videos/pantallaCarga.mp4';

  // Estado
  let _continuarRunning = false;
  let _overlayEl = null;
  let _videoEl = null;
  let _useCinematicaForNewGame = true; // si true: nueva partida puede reutilizar #cinematica1 en vez de crear un nuevo video

  // Helpers DOM / efectos
  function qs(id) { return document.getElementById(id); }

  function fadeInEl(el, ms = FADE_MS) {
    return new Promise((resolve) => {
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.willChange = 'opacity';
      // ensure visible and start from 0
      el.style.opacity = '0';
      // force reflow
      void el.offsetWidth;
      el.style.opacity = '1';
      setTimeout(() => resolve(), ms + 20);
    });
  }
  function fadeOutEl(el, ms = FADE_MS) {
    return new Promise((resolve) => {
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.willChange = 'opacity';
      el.style.opacity = '1';
      // force reflow
      void el.offsetWidth;
      el.style.opacity = '0';
      setTimeout(() => resolve(), ms + 20);
    });
  }

  function hideElDisplayNoneAfterFade(el, ms = MENU_FADE_MS) {
    return new Promise((resolve) => {
      el.style.transition = `opacity ${ms}ms ease`;
      el.style.opacity = '1';
      void el.offsetWidth;
      el.style.opacity = '0';
      setTimeout(() => {
        try { el.style.display = 'none'; } catch(e){}
        resolve();
      }, ms + 10);
    });
  }

  function createOverlayVideo(src) {
    if (_overlayEl) return { overlay: _overlayEl, video: _videoEl };

    // overlay wrapper
    const ov = document.createElement('div');
    ov.id = 'loadingScreen';
    ov.setAttribute('aria-hidden', 'true');
    ov.style.position = 'fixed';
    ov.style.inset = '0';
    ov.style.display = 'flex';
    ov.style.alignItems = 'center';
    ov.style.justifyContent = 'center';
    ov.style.background = 'black';
    ov.style.opacity = '0';
    ov.style.transition = `opacity ${FADE_MS}ms ease`;
    ov.style.zIndex = String(OVERLAY_Z);
    ov.style.pointerEvents = 'auto';

    // video element
    const v = document.createElement('video');
    v.id = 'loadingVideo';
    v.playsInline = true;
    v.preload = 'auto';
    v.muted = true;
    v.loop = false; // no loop for loading video; if quieres loop, cambiar a true
    v.style.width = 'min(1100px, 92%)';
    v.style.maxHeight = '78vh';
    v.style.objectFit = 'contain';
    v.style.display = 'block';
    v.style.borderRadius = '6px';
    v.style.background = 'transparent';

    const srcEl = document.createElement('source');
    srcEl.src = src;
    srcEl.type = 'video/mp4';
    v.appendChild(srcEl);

    // append
    ov.appendChild(v);
    document.body.appendChild(ov);

    _overlayEl = ov;
    _videoEl = v;

    // ensure clicks on overlay don't propagate (so the UI behind is inert)
    ov.addEventListener('click', (e) => e.stopPropagation());

    return { overlay: ov, video: v };
  }

  function ensureOverlayRemoved() {
    if (!_overlayEl) return;
    try {
      _overlayEl.remove();
    } catch (e) {}
    _overlayEl = null;
    _videoEl = null;
  }

  function waitForVideoPlay(video) {
    return new Promise((resolve) => {
      let resolved = false;
      function done() {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve();
      }
      function onplaying() { done(); }
      function oncanplay() { /* fallback: canplay puede ser suficiente */ done(); }
      function onerror() { done(); }

      function cleanup() {
        video.removeEventListener('playing', onplaying);
        video.removeEventListener('canplay', oncanplay);
        video.removeEventListener('error', onerror);
      }

      video.addEventListener('playing', onplaying);
      video.addEventListener('canplay', oncanplay);
      video.addEventListener('error', onerror);

      // try to play; browsers pueden rechazar si no hubo interacción, pero en este flujo el click que origina esto es interacción
      const p = video.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          // Si play falla, resolvemos tras 120ms para que el flujo continúe
          setTimeout(done, 120);
        });
      }
    });
  }

  function waitVideoEndOrMin(video, minMs = DEFAULT_MIN_MS) {
    return new Promise((resolve) => {
      let finished = false;
      function onEnd() {
        if (finished) return;
        finished = true;
        cleanup();
        resolve({ reason: 'ended' });
      }
      function cleanup() {
        video.removeEventListener('ended', onEnd);
        clearTimeout(minTO);
      }
      video.addEventListener('ended', onEnd);
      const minTO = setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve({ reason: 'min_time' });
      }, minMs);

      // As a safety, also resolve if video errors
      video.addEventListener('error', () => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve({ reason: 'error' });
      });
    });
  }

  async function preloadScene1Safely() {
    // Intenta llamar a las funciones que posiblemente ya existan en tu proyecto para precargar la escena
    // 1) iniciarJuego() si existe -> intentamos llamar (esperamos a que termine si devuelve Promise)
    // 2) si no existe, prueba loadSceneFromServer({slug:'scene_1'}) si está presente
    // 3) fallback: intenta asegurarse de que imágenes del DOM se carguen (por si el HTML ya contiene <img>)
    try {
      if (typeof window.iniciarJuego === 'function') {
        // llamamos iniciarJuego pero no obligamos al script a mostrar la escena; en la mayoría de implementaciones
        // iniciarJuego hará la carga y dejará el DOM listo.
        return await window.iniciarJuego();
      } else if (typeof window.loadSceneFromServer === 'function') {
        // intenta cargar la escena con slug 'scene_1' (ajusta si tu slug es distinto)
        try {
          return await window.loadSceneFromServer({ slug: 'scene_1' });
        } catch (e) {
          // si falla con slug, intenta con id:1
          return await window.loadSceneFromServer({ id: 1 });
        }
      } else {
        // Fallback ligero: si hay imágenes dentro de #escenario, "preload" comprobando si están completas.
        const esc = qs('escenario');
        if (!esc) return Promise.resolve();
        const imgs = Array.from(esc.querySelectorAll('img'));
        await Promise.all(imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => { img.addEventListener('load', res); img.addEventListener('error', res); });
        }));
        return Promise.resolve();
      }
    } catch (err) {
      console.warn('[preloadScene1Safely] Error durante la precarga:', err);
      return Promise.resolve();
    }
  }

  // Public function: continuarPartida (sobre-escribe/actualiza la existente)
  window.continuarPartida = async function continuarPartida(opts = {}) {
    if (_continuarRunning) {
      console.warn('continuarPartida: ya se está ejecutando.');
      return;
    }
    _continuarRunning = true;
    opts = Object.assign({
      useVideoSrc: window.LOADING_SCREEN_VIDEO_SRC,
      minMs: DEFAULT_MIN_MS,
      useCinematicForNewGame: _useCinematicaForNewGame
    }, opts);

    const menu1 = qs('menuInicio1');
    const menu2 = qs('menuInicio2');
    const esc = qs('escenario');
    const cinematica = qs('cinematica1');
    const btnSkip = qs('btnSkipCinematica');

    // 1) Crear overlay + vídeo (o reutilizar la cinemática si opts indica)
    let createdOverlay = null;
    let videoToPlay = null;
    let usingCinematic = false;

    if (opts.useCinematicForNewGame && cinematica && opts.useVideoSrc === 'cinematica') {
      // usar cinemática existente
      usingCinematic = true;
      videoToPlay = cinematica;
      createdOverlay = null; // no overlay DOM creado aquí (pero sí aplicaremos un backdrop)
      // ensure video is visible on top via styles (we won't move it in DOM)
      cinematica.style.position = 'fixed';
      cinematica.style.inset = '0';
      cinematica.style.width = '100%';
      cinematica.style.height = '100%';
      cinematica.style.objectFit = 'cover';
      cinematica.style.zIndex = String(OVERLAY_Z);
      cinematica.style.opacity = '0';
      cinematica.style.transition = `opacity ${FADE_MS}ms ease`;
      cinematica.muted = false; // cinematica likely includes sound; muted by default? adjust
    } else {
      const { overlay, video } = createOverlayVideo(opts.useVideoSrc);
      createdOverlay = overlay;
      videoToPlay = video;
    }

    try {
      // Make escenario ready but invisible so that if iniciarJuego shows it, it's not visible yet.
      if (esc) {
        esc.style.display = 'block';
        esc.style.opacity = '0';
        esc.style.transition = `opacity ${FADE_MS}ms ease`;
        esc.style.zIndex = String(OVERLAY_Z - 100); // debajo del overlay
      }

      // 2) Start preloading/starting the game in background (don't await yet)
      const preloadPromise = preloadScene1Safely();

      // 3) Start playing video and ensure it starts BEFORE hiding the menus.
      //    Wait for 'playing' or canplay, then hide menus.
      if (!videoToPlay) {
        // safety: create overlay if none
        const { overlay, video } = createOverlayVideo(opts.useVideoSrc);
        createdOverlay = overlay;
        videoToPlay = video;
      }

      // ensure video attributes
      videoToPlay.playsInline = true;
      videoToPlay.muted = true; // autoplay safe (muted) — if using cinematic with sound, it may be unmuted
      videoToPlay.currentTime = 0;
      // start playing and wait for it to actually start
      await waitForVideoPlay(videoToPlay);

      // Fade the overlay/cinematica in (quick)
      if (createdOverlay) {
        // overlay element exists and has opacity 0 -> 1 (fadeInEl uses transition)
        await fadeInEl(createdOverlay, 260);
      } else if (usingCinematic) {
        // cinematica is already in DOM, fade in
        await fadeInEl(videoToPlay, 260);
      }

      // ensure menus are hidden AFTER video starts (so user never sees a flash)
      if (menu1) await hideElDisplayNoneAfterFade(menu1, MENU_FADE_MS);
      if (menu2) await hideElDisplayNoneAfterFade(menu2, MENU_FADE_MS);

      // 4) Now wait for BOTH: min video duration OR video ended, and preloadPromise finished.
      const videoDonePromise = waitVideoEndOrMin(videoToPlay, opts.minMs);

      // Also listen to skip button (if user wants to skip cinematica)
      let skipTriggered = false;
      function onSkipClick(e) {
        skipTriggered = true;
        try {
          if (videoToPlay && !videoToPlay.ended) videoToPlay.pause();
        } catch (err) {}
      }
      if (btnSkip) btnSkip.addEventListener('click', onSkipClick, { once: true });

      // Wait for preload & video (but if preload hangs, we set a safety timeout)
      const preloadTimeout = new Promise((res) => setTimeout(() => res('preload_timeout'), 12000));
      const preloadResult = await Promise.race([preloadPromise, preloadTimeout]);

      // Wait for video to end or min time or skip
      const videoResult = await Promise.race([videoDonePromise, (async () => {
        // If skip was clicked, resolve early
        while (!skipTriggered) {
          await new Promise(r => setTimeout(r, 100));
        }
        return { reason: 'skipped' };
      })()]);

      // 5) Crossfade: fade out video overlay and fade in escena
      const fades = [];
      if (createdOverlay) {
        fades.push(fadeOutEl(createdOverlay, FADE_MS));
      } else if (usingCinematic) {
        fades.push(fadeOutEl(videoToPlay, FADE_MS));
      }

      if (esc) {
        // ensure it's visible (display:block) and fade in
        esc.style.display = 'block';
        // give it slightly lower z-index so overlay covers it until fade completes
        esc.style.zIndex = String(OVERLAY_Z - 200);
        fades.push((async () => { await fadeInEl(esc, FADE_MS); })());
      }

      await Promise.all(fades);

      // 6) Cleanup: stop and remove overlay video if we created it; ensure escenario visible.
      if (createdOverlay) {
        try { if (_videoEl && !_videoEl.paused) _videoEl.pause(); } catch (e) {}
        ensureOverlayRemoved();
      } else if (usingCinematic) {
        // Reset cinematica styles (optional)
        try {
          videoToPlay.style.opacity = '';
          videoToPlay.style.position = '';
          videoToPlay.style.inset = '';
          videoToPlay.style.width = '';
          videoToPlay.style.height = '';
          videoToPlay.style.objectFit = '';
          videoToPlay.style.zIndex = '';
          videoToPlay.pause();
        } catch (e) {}
      }

      // Final ensure escena is visible and interactive
      if (esc) {
        esc.style.opacity = '1';
        esc.style.display = 'block';
        esc.style.zIndex = ''; // restore natural stacking
      }

    } catch (err) {
      console.error('[continuarPartida] Error en flujo de pantalla de carga:', err);
      // fallback sencillo: asegurar que menus se cierren y arrancar iniciarJuego
      try { if (menu1) menu1.style.display = 'none'; } catch(e){}
      try { if (menu2) menu2.style.display = 'none'; } catch(e){}
      try {
        if (typeof window.iniciarJuego === 'function') await window.iniciarJuego();
        else if (typeof window.loadSceneFromServer === 'function') await window.loadSceneFromServer({ id: 1 });
      } catch (e) { console.warn(e); }
      ensureOverlayRemoved();
    } finally {
      _continuarRunning = false;
    }
  }; // end continuarPartida

  // Helper para "Nueva Partida" que reutiliza la cinemática como pantalla de carga
  // Puedes llamar a window.nuevaPartidaConCinematica() desde tu lógica de 'nueva partida'.
  window.nuevaPartidaConCinematica = async function nuevaPartidaConCinematica(opts = {}) {
    opts = Object.assign({}, opts, { useVideoSrc: 'cinematica', minMs: DEFAULT_MIN_MS, useCinematicForNewGame: true });
    return window.continuarPartida(opts);
  };

  // Añadir listener por si tus botones llaman a funciones globales previas
  // Si en tu código original el botón "Continuar" llamaba a continuarPartida(), la nueva función ya sobreescribe la antigua.
  // Pero añadimos un listener directo por si el botón no invoca la función y depende del click.
  document.addEventListener('click', function (e) {
    const target = e.target;
    if (!target) return;
    // detecta click en la hoja/btn "continuar" del inicio2
    if (target.id === 'inicio2_leaf1' || target.id === 'btnContinuar') {
      // prevenir duplicado si algún handler ya llama a la función
      e.preventDefault();
      e.stopPropagation();
      setTimeout(() => { // microdelay para no interrumpir otros handlers en el mismo click
        if (typeof window.continuarPartida === 'function') window.continuarPartida();
      }, 10);
    }
    // Si el usuario inicia Nueva Partida y quieres que se use la cinemática:
    if (target.id === 'inicio2_leaf2' || target.id === 'btnNueva') {
      // No forzamos aquí; tu flujo de "nuevaPartida" puede decidir llamar a window.nuevaPartidaConCinematica()
    }
  }, { capture: true });

  // Exponer utilidades para debugging / ajustes
  window.__loadingScreen = {
    createOverlayVideo,
    ensureOverlayRemoved,
    DEFAULT_MIN_MS,
    FADE_MS
  };

})(); // IIFE
