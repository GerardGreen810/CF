// novela/JAVASCRIPT/saveManager.js
// Añade comportamiento de guardado a la imagen #btnGuardarPartida (debe existir en el HTML).
(function () {
  const debug = false;
  const SAVE_ENDPOINT = '../PHP/guardar_partida.php';
  const GET_SAVE_ENDPOINT = '../PHP/get_save.php';
  const DEBOUNCE_MS = 1500; // bloqueo entre clicks

  // obtener elemento existente (debe estar en el HTML)
  function getSaveImg() {
    return document.getElementById('btnGuardarPartida');
  }

  // pequeño toast para feedback
  function showToast(text, { timeout = 1800, danger = false } = {}) {
    let t = document.getElementById('saveManager_toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'saveManager_toast';
      Object.assign(t.style, {
        position: 'fixed',
        right: '16px',
        bottom: '90px',
        zIndex: '120001',
        background: 'rgba(0,0,0,0.78)',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '10px',
        fontFamily: 'NewYork, Arial, sans-serif',
        fontSize: '14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        opacity: '0',
        transition: 'opacity 220ms ease, transform 220ms ease',
        transform: 'translateY(6px)'
      });
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.style.opacity = '1';
    t.style.transform = 'translateY(0)';
    t.style.background = danger ? 'rgba(140,20,20,0.88)' : 'rgba(0,0,0,0.78)';

    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(6px)';
    }, timeout);
  }

  // Validar si en este momento se puede guardar
  function canSaveNow() {
    if (typeof window.inputLocked !== 'undefined' && window.inputLocked) return { ok: false, reason: 'Durante una transición/diálogo no puedes guardar.' };
    if (typeof window.SLIDE_MODE !== 'undefined' && window.SLIDE_MODE) return { ok: false, reason: 'No puedes guardar durante una secuencia de Slides.' };
    try {
      const dm = (window.dialogManager && typeof window.dialogManager._internal === 'function') ? window.dialogManager._internal() : null;
      if (dm && dm.current) return { ok: false, reason: 'No puedes guardar mientras hay un diálogo activo.' };
    } catch (e) { /* ignore */ }
    if (!window.AUTH || !window.AUTH.logged) return { ok: false, reason: 'Debes iniciar sesión para guardar.' };
    if (!window.CURRENT_SCENE_SLUG && (typeof window.indiceEscenarioActual === 'undefined')) return { ok: false, reason: 'No hay escena activa para guardar.' };
    return { ok: true };
  }

  // Enviar POST al servidor para guardar
  async function doSave(payload) {
    try {
      const res = await fetch(SAVE_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, message: 'Fallo de conexión.' };
    }
  }

  // Handler: guardar la escena actual
  let _lastSave = 0;
  async function handleSaveClick(ev) {
    const now = Date.now();
    if (now - _lastSave < DEBOUNCE_MS) {
      showToast('Guardando — espera un momento...', { timeout: 900 });
      return;
    }
    _lastSave = now;

    const ok = canSaveNow();
    if (!ok.ok) { showToast(ok.reason, { danger: true }); return; }

    // construir payload mínimo (AHORA enviamos scene_id también)
    const scene_slug = window.CURRENT_SCENE_SLUG || null;

    // 1) intento leer variable global declarada con let (no es property de window)
    let scene_index = null;
    if (typeof indiceEscenarioActual !== 'undefined' && indiceEscenarioActual !== null) {
      scene_index = Number(indiceEscenarioActual);
    } else if (typeof window.indiceEscenarioActual !== 'undefined' && window.indiceEscenarioActual !== null) {
      scene_index = Number(window.indiceEscenarioActual);
    } else if (scene_slug && typeof scene_slug === 'string') {
      // fallback: extraer número de slug 'scene_N'
      const m = String(scene_slug).match(/scene_(\d+)/);
      if (m) scene_index = Number(m[1]) - 1;
    }

    // scene_id = scene_index + 1 si podemos inferirlo
    const scene_id = (scene_index !== null && !isNaN(scene_index)) ? (scene_index + 1) : null;

    const state_json = {
      scene_slug: scene_slug,
      scene_index: scene_index,
      scene_id: scene_id,
      saved_at: (new Date()).toISOString()
    };

    // feedback visual
    const img = getSaveImg();
    if (img) img.style.opacity = '0.6';
    showToast('Guardando partida...', { timeout: 4000 });

    // Enviamos scene_id + slug + state_json para que el backend pueda actualizar correctamente
    const result = await doSave({ scene_slug, scene_index, scene_id, state_json });


    if (img) img.style.opacity = '1';
    if (result && result.success) {
      showToast('Partida guardada ✔');
    } else {
      showToast(result && result.message ? result.message : 'Error al guardar.', { danger: true, timeout: 3000 });
    }
  }

  // Recuperar save desde servidor
  async function fetchSave() {
    try {
      const res = await fetch(GET_SAVE_ENDPOINT, { method: 'GET', credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.success) return null;
      return data.save || null;
    } catch (e) {
      return null;
    }
  }

     // Función que carga la escena guardada y llama a iniciarJuego().
  // Este método reemplaza (wrap) la función global continuarPartida definida en script.js.
  function overrideContinue() {
    const originalContinue = (typeof window.continuarPartida === 'function') ? window.continuarPartida : null;

    window.continuarPartida = async function continuarPartida_with_load() {
      // Si la partida no está iniciada, fallback al original
      if (typeof partidaEstado !== 'undefined' && partidaEstado !== 'iniciada') {
        if (originalContinue) return originalContinue();
        return;
      }

      const hasLoading = (typeof showLoadingScreen === 'function' && typeof hideLoadingScreen === 'function');

      // --- CREAR PROMESA DIFERIDA que usaremos para que showLoadingScreen espere a la carga real ---
      let assetsResolve, assetsReject;
      const assetsPromise = new Promise((resolve, reject) => { assetsResolve = resolve; assetsReject = reject; });

      // Preferimos resolver la promesa cuando la escena se aplique (applyScene emite 'scene:applied')
      let sceneAppliedHandler = null;
      const sceneAppliedTimeoutMs = 15000; // timeout de seguridad: 15s (ajusta si quieres)
      const sceneAppliedTimer = setTimeout(() => {
        console.warn('[saveManager] scene:applied timeout after', sceneAppliedTimeoutMs, 'ms -> resolving assetsPromise as fallback');
        try { if (typeof assetsResolve === 'function') assetsResolve(); } catch(e){}
      }, sceneAppliedTimeoutMs);

      // handler que resuelve la promesa cuando applyScene emite su evento
      sceneAppliedHandler = (ev) => {
        try {
          console.debug('[saveManager] scene:applied event received', ev && ev.detail);
          clearTimeout(sceneAppliedTimer);
          window.removeEventListener('scene:applied', sceneAppliedHandler);
          if (typeof assetsResolve === 'function') assetsResolve();
        } catch (e) {
          try { if (typeof assetsResolve === 'function') assetsResolve(); } catch(e){}
        }
      };
      window.addEventListener('scene:applied', sceneAppliedHandler, { once: true });

      // Mostrar loading y pasar waitForAssets = assetsPromise
      let showPromise = Promise.resolve();
      if (hasLoading) {
        try {
          showPromise = showLoadingScreen({
            src: '../videos/pruebas/candles-on-loop.mp4',
            minMs: (window.LOADING_MIN_MS || 3500),
            waitForAssets: assetsPromise, // <-- importante: pasamos la promesa diferida
            loop: true
          });
        } catch (e) {
          console.warn('[saveManager] showLoadingScreen threw', e);
        }
      }

      try {
        // Obtener save del servidor
        const save = await fetchSave();

        if (save && (save.scene_slug || save.scene_id)) {
          const slug = save.scene_slug || null;
          const scene_id = save.scene_id || null;
          try {
            // Iniciar la carga de la escena guardada. changeToSceneBySlug/actualizarEscenario devuelven promesas.
            let loadPromise = null;
            if (slug && typeof window.changeToSceneBySlug === 'function') {
              console.debug('[saveManager] loading scene by slug', slug);
              loadPromise = window.changeToSceneBySlug(slug);
            } else if (scene_id != null && typeof window.actualizarEscenario === 'function') {
              console.debug('[saveManager] loading scene by id', scene_id);
              window.indiceEscenarioActual = parseInt(scene_id, 10) - 1;
              loadPromise = window.actualizarEscenario({ entrada: 'left' });
            } else {
              // si no hay forma de cargar, fallback al original
              if (originalContinue) loadPromise = originalContinue();
            }

            // Esperar la promesa de carga si existe (aunque normalmente applyScene emitirá 'scene:applied')
            if (loadPromise && typeof loadPromise.then === 'function') {
              try {
                await loadPromise;
              } catch (err) {
                console.warn('[saveManager] loadPromise rejected', err);
                // fallback: si algo falla y el evento no llegó, resolvemos la promesa para no bloquear la UI indefinidamente
                try { if (typeof assetsResolve === 'function') assetsResolve(); } catch(e){}
              }
            }
            // Nota: NO resolvemos assetsPromise aquí en el path exitoso: esperamos al evento 'scene:applied' para mayor seguridad.
          } catch (err) {
            console.warn('saveManager: fallo al cargar save -> fallback to original', err);
            // Resolver assetsPromise para no bloquear la pantalla de carga
            try { if (typeof assetsResolve === 'function') assetsResolve(); } catch(e){}
            // Intentar fallback
            if (originalContinue) await originalContinue();
          }
        } else {
          // No hay save: resolvemos assetsPromise y fallback al original
          try { if (typeof assetsResolve === 'function') assetsResolve(); } catch(e){}
          if (originalContinue) await originalContinue();
        }
      } catch (err) {
        // fallo en fetchSave: resolver assetsPromise y fallback
        console.warn('[saveManager] error fetching save', err);
        try { if (typeof assetsResolve === 'function') assetsResolve(); } catch(e){}
        if (originalContinue) await originalContinue();
      }

      // Aguardar que showLoadingScreen complete su propia lógica interna (minMs + frame + assetsPromise)
      try { await showPromise; } catch (e) { /* ignore */ }

      // Ahora ocultamos loading screen (ya estamos seguros que la escena cargó o hubo fallback)
      if (hasLoading) {
        try { await hideLoadingScreen(); } catch(e) { console.warn('[saveManager] hideLoadingScreen failed', e); }
      }

      // UI final / transición hacia el juego (mantengo tu comportamiento original)
      try {
        if (transicion) transicion.style.opacity = "1";
        if (menuInicio2) menuInicio2.style.display = "none";
        if (btnSalirEsquina) btnSalirEsquina.style.display = "none";
      } catch(e){}

      const AFTER_FADE_MS = 1200;
      setTimeout(() => {
        try { if (transicion) transicion.style.opacity = "0"; } catch(e){}
        try { if (cinematica) cinematica.style.display = "none"; } catch(e){}
        try { if (typeof iniciarJuego === 'function') iniciarJuego(); } catch(e){}
      }, AFTER_FADE_MS);

      return;
    };
  }


  // Init: conectar evento al elemento que está en HTML
  const imgEl = getSaveImg();
  if (imgEl) {
    imgEl.addEventListener('click', handleSaveClick);
  } else {
    console.warn('saveManager: no se encontró #btnGuardarPartida en el HTML. Asegúrate de añadirlo.');
  }

  try { overrideContinue(); } catch (e) { console.warn('saveManager: no pude override continuarPartida', e); }

  // Exponer API global por si quieres usarlo desde consola / otros módulos
  window.saveManager = {
    saveNow: handleSaveClick,
    fetchSave,
    overrideContinue
  };

})();