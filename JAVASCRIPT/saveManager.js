// novela/JAVASCRIPT/saveManager.js
(function () {
  const SAVE_ENDPOINT = '../PHP/guardar_partida.php';
  const DEBOUNCE_MS = 1500; // Evitar spam de guardado
  let lastSaveTime = 0;

  function getSaveButton() {
    return document.getElementById('btnGuardarPartida');
  }

  // --- Helper para mostrar mensajes (Toast) ---
  function showToast(text, { timeout = 2000, danger = false } = {}) {
    let t = document.getElementById('saveManager_toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'saveManager_toast';
      Object.assign(t.style, {
        position: 'fixed',
        right: '16px',
        bottom: '90px', // Ajustado para no chocar con el collar
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
        transform: 'translateY(6px)',
        pointerEvents: 'none'
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

  // --- Comprueba si se puede guardar ---
  function canSaveNow() {
    if (!window.AUTH || !window.AUTH.logged) {
      return { ok: false, reason: 'Debes iniciar sesión para guardar.' };
    }
    // ¡LA REGLA CLAVE! No guardar en slides.
    if (typeof window.SLIDE_MODE !== 'undefined' && window.SLIDE_MODE) {
      return { ok: false, reason: 'No puedes guardar durante una secuencia.' };
    }
    // No guardar si hay un diálogo, transición o input bloqueado
    if (typeof window.inputLocked !== 'undefined' && window.inputLocked) {
      return { ok: false, reason: 'No puedes guardar ahora.' };
    }
    try {
      const dm = (window.dialogManager && typeof window.dialogManager._internal === 'function') ? window.dialogManager._internal() : null;
      if (dm && dm.current) {
        return { ok: false, reason: 'No puedes guardar durante un diálogo.' };
      }
    } catch (e) { /* ignorar */ }

    if (!window.CURRENT_SCENE_SLUG) {
      return { ok: false, reason: 'No hay escena activa para guardar.' };
    }
    return { ok: true };
  }

  // --- Función principal de guardado ---
  async function handleSaveClick() {
    const now = Date.now();
    if (now - lastSaveTime < DEBOUNCE_MS) {
      showToast('Guardando...', { timeout: 900 });
      return;
    }
    lastSaveTime = now;

    const check = canSaveNow();
    if (!check.ok) {
      showToast(check.reason, { danger: true });
      return;
    }

    // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
    // Leemos las variables globales de script.js
    const scene_slug = window.CURRENT_SCENE_SLUG;
    const scene_index = (typeof window.indiceEscenarioActual !== 'undefined') ? window.indiceEscenarioActual : 0;
    // El ID de la escena es el índice + 1 (ej: índice 1 = scene_id 2)
    const scene_id = scene_index + 1; 

    console.log(`[SAVE DEBUG] SCENE_SLUG: ${scene_slug} | INDEX: ${scene_index} | ID a enviar: ${scene_id}`);

    // Este es el *contenido* del estado que queremos guardar
    const gameStateData = {
      scene_slug: scene_slug,
      saved_at: (new Date()).toISOString(),
      gameState: {
        customInteractables: window.customInteractables || null,
        disabledInteractables: Array.from(window.DISABLED_INTERACTABLES || []),
        completedScenes: window.COMPLETED_SCENES || {}
      }
    };

    // Este es el *payload* que espera guardar_partida.php
    // Debe tener scene_id, scene_slug, y state_json
    const payload = {
        scene_id: scene_id,
        scene_slug: scene_slug,
        state_json: gameStateData
    };
    // --- FIN DE LA CORRECCIÓN ---

    // Feedback visual
    const btn = getSaveButton();
    if (btn) btn.style.opacity = '0.6';
    showToast('Guardando partida...', { timeout: 4000 });

    try {
      const res = await fetch(SAVE_ENDPOINT, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), // Enviamos el payload corregido
        cache: 'no-store'
      });
      const data = await res.json();
      
      if (data && data.success) {
        showToast('Partida guardada ✔');
      } else {
        throw new Error(data.message || 'Error desconocido');
      }
    } catch (err) {
      showToast(`Error al guardar: ${err.message}`, { danger: true, timeout: 3000 });
    } finally {
      if (btn) btn.style.opacity = '1';
    }
  }

  // --- Conectar el botón ---
  function initSaveButton() {
    const btn = getSaveButton();
    if (btn) {
      btn.addEventListener('click', handleSaveClick);
    } else {
      console.warn('saveManager: No se encontró #btnGuardarPartida en el HTML.');
    }
  }
  
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSaveButton);
  } else {
    initSaveButton();
  }

  // Exponer API global (opcional, pero útil)
  window.saveManager = {
    saveNow: handleSaveClick
  };

})();