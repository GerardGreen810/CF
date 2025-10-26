/* dialogManager.js
   - Maneja la carga de dialogs.json
   - Exponer:
     dialogManager.load(url) -> Promise
     dialogManager.startDialog(key)
     dialogManager.startDialogForTrigger(signal)
   - Emite eventos DOM: 'dialog:started', 'dialog:ended', con detail { key }
*/

const dialogManager = (function() {
  let dialogs = {}; // cargado desde JSON
  let current = null; // { key, idx, lines, meta, dom... }
  window.COMPLETED_DIALOGS = window.COMPLETED_DIALOGS || {};

  // Typewriter control
  let typingTimer = null;
  const TYPE_SPEED = 28; // ms por carácter


  // UI: si ya tienes un elemento, úsalo; si no crear uno simple
  function ensureDialogBox() {
    let box = document.getElementById('dialogBox');

    // Si no existe, crearlo y aplicar estilos base
    if (!box) {
      box = document.createElement('div');
      box.id = 'dialogBox';
      Object.assign(box.style, {
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: '6%',
        maxWidth: '85%',
        padding: '14px 18px',
        color: 'white',
        borderRadius: '8px',
        zIndex: '99999',    // <- muy alto para estar por encima de todo
        fontSize: '18px',
        display: 'none',
        lineHeight: '1.3',
        pointerEvents: 'auto' // permitir interacción con la caja
      });
      document.body.appendChild(box);
    } else {
      // si ya existe, aseguramos estilos mínimos sin tocar background-image
      Object.assign(box.style, {
        position: box.style.position || 'fixed',
        left: box.style.left || '50%',
        transform: box.style.transform || 'translateX(-50%)',
        bottom: box.style.bottom || '6%',
        maxWidth: box.style.maxWidth || '84%',
        padding: box.style.padding || '14px 18px',
        // forzamos un zIndex alto por si alguien lo cambió en runtime
        zIndex: box.style.zIndex || '99999',
        pointerEvents: box.style.pointerEvents || 'auto'
      });
      // aseguramos explícitamente que no haya un background inline que tape la imagen
      if (box.style.background && box.style.background.indexOf('rgba') !== -1) {
        box.style.background = ''; // permite que CSS background-image se muestre
      }
    }

    // Ahora asegurarnos *siempre* de que existan los nodos interiores que usamos
    if (!box.querySelector('#dialogSpeaker')) {
      const speaker = document.createElement('div');
      speaker.id = 'dialogSpeaker';
      speaker.style.fontWeight = '700';
      speaker.style.marginBottom = '6px';
      box.insertBefore(speaker, box.firstChild);
    }
    if (!box.querySelector('#dialogText')) {
      const text = document.createElement('div');
      text.id = 'dialogText';
      box.appendChild(text);
    }
    if (!box.querySelector('#dialogHint')) {
      const hint = document.createElement('div');
      hint.id = 'dialogHint';
      hint.textContent = 'Presiona "E" para continuar';
      Object.assign(hint.style, { fontSize: '12px', opacity: '0.8', marginTop: '8px', textAlign: 'right' });
      box.appendChild(hint);
    }

    return box;
  }


  async function load(url = '../data/dialogs.json') {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar dialogs.json: ' + res.status + ' ' + res.url);
    dialogs = await res.json();
    return dialogs;
  }


  // Abrir UI: además de mostrarla, la re-append al body para traerla al frente
  function openUI() {
    const box = ensureDialogBox();
    // reapend para asegurar que quede al final del body (sobre otros elementos con z-index similares)
    try {
      document.body.appendChild(box);
    } catch (e) { /* ignore */ }
    box.style.display = 'block';
    // forzar zIndex alto por si algo externo lo cambió
    box.style.zIndex = '99999';
  }
  function closeUI() {
    const box = ensureDialogBox();
    box.style.display = 'none';
  }


  // mostrar línea actual (con efecto typewriter para el texto)
  function renderCurrent() {
    if (!current) return;
    const box = ensureDialogBox();
    const speaker = box.querySelector('#dialogSpeaker');
    const textEl = box.querySelector('#dialogText');
    const line = current.lines[current.idx] || {};
    const fullText = (line.text || line.texto || '') + '';

    console.debug('[dialogManager] renderCurrent', { key: current.key, idx: current.idx, speaker: line.speaker, fullTextPreview: fullText.slice(0,120) });

    if (speaker) speaker.textContent = line.speaker || '';
    stopTyping();
    startTyping(textEl, fullText);
  }


  // Inicia el efecto de tipeo en el elemento textEl con el texto fullText
  function startTyping(textEl, fullText) {
    if (!textEl) {
      console.warn('[dialogManager] startTyping: textEl no existe');
      return;
    }
    fullText = (fullText === undefined || fullText === null) ? '' : String(fullText);
    textEl.textContent = '';
    if (current) current._typing = true;
    let i = 0;

    console.debug('[dialogManager] startTyping: inicio', { key: current && current.key, idx: current && current.idx, length: fullText.length, preview: fullText.slice(0,80) });

    function step() {
      if (!current) { stopTyping(); return; }
      if (i >= fullText.length) {
        if (current) current._typing = false;
        console.debug('[dialogManager] startTyping: terminado', { key: current && current.key, idx: current && current.idx });
        stopTyping();
        return;
      }
      textEl.textContent += fullText.charAt(i);
      i++;
      typingTimer = setTimeout(step, TYPE_SPEED);
    }
    if (fullText.length === 0) {
      if (current) current._typing = false;
      textEl.textContent = '';
      console.debug('[dialogManager] startTyping: texto vacío, show empty');
      return;
    }
    step();
  }

  function stopTyping() {
    if (typingTimer) {
      clearTimeout(typingTimer);
      typingTimer = null;
    }
    if (current) {
      const box = ensureDialogBox();
      const textEl = box.querySelector('#dialogText');
      const line = current.lines[current.idx] || {};
      if (textEl) textEl.textContent = line.text || line.texto || '';
      console.debug('[dialogManager] stopTyping: forced full text show', { key: current.key, idx: current.idx, preview: (line.text || line.texto || '').slice(0,120) });
      current._typing = false;
    }
  }


  // iniciar secuencia por key (key debe existir en dialogs)
  async function startDialog(key, { fromTrigger = false } = {}) {
    try {
      console.debug('[dialogManager] startDialog request:', key);

      if (!dialogs || !dialogs[key]) {
        console.warn('[dialogManager] startDialog: key no existe:', key);
        return false;
      }

      // obtener diálogo y validar que tenga líneas antes de bloquear inputs
      const d = dialogs[key];
      if (!d || !Array.isArray(d.lines) || d.lines.length === 0) {
        console.warn('[dialogManager] startDialog abortado: diálogo sin líneas o inválido', key, d);
        return false;
      }

      // si ya completado y no se repite, abortar
      if (window.COMPLETED_DIALOGS[key] && !(d.meta && d.meta.allow_repeat)) {
        console.debug('[dialogManager] startDialog: ya completado y no se repite:', key);
        return false;
      }

      // set current (ahora que ya validamos)
      current = {
        key,
        lines: d.lines,
        idx: 0,
        meta: d.meta || {}
      };

      // bloquear inputs globales (simple integración con tu juego)
      current._prevInputLocked = (typeof window.inputLocked !== 'undefined') ? window.inputLocked : false;
      window.inputLocked = true; // obligamos a bloquear movimiento/interacciones

      // ocultar mensaje general E (si aparece por encima)
      try {
        const gen = document.getElementById('mensajeE');
        if (gen) gen.style.display = 'none';
      } catch (e) {}

      openUI();
      renderCurrent();

      // Evitar que la misma tecla E que abrió el diálogo avance inmediatamente (debounce)
      if (current) {
        current._justOpened = true;
        setTimeout(() => {
          if (current) current._justOpened = false;
        }, 200); // 200 ms: suficiente para que el evento keydown original no vuelva a ser procesado
      }

      // notify
      window.dispatchEvent(new CustomEvent('dialog:started', { detail: { key } }));
      return true;
    } catch (err) {
      console.error('[dialogManager] startDialog error inesperado', err);
      // si algo sale mal, aseguramos dejar input desbloqueado
      try { window.inputLocked = false; } catch(e){}
      return false;
    }
  }

  // avanzar o terminar
  function advanceDialog() {
    if (!current) return;
    // si está tipeando, detener y mostrar completo en lugar de avanzar
    if (current._typing) {
      stopTyping();
      return;
    }

    // evitar spam E -> se respeta canPressE externo pero igual chequeamos
    if (typeof canPressE !== 'undefined' && !canPressE) return;

    current.idx++;
    if (current.idx >= current.lines.length) {
      // fin
      const finishedKey = current.key;
      closeDialog();
      // marcar completado
      window.COMPLETED_DIALOGS[finishedKey] = true;
      console.debug('[dialogManager] dialog marcado como completado:', finishedKey, window.COMPLETED_DIALOGS);
      window.dispatchEvent(new CustomEvent('dialog:ended', { detail: { key: finishedKey } }));
      return;
    } else {
      renderCurrent();
    }
  }


  function closeDialog() {
    if (!current) return;
    // restaurar inputLocked al previo (o false)
    window.inputLocked = !!current._prevInputLocked ? current._prevInputLocked : false;
    closeUI();
    current = null;
  }

// conectar tecla E: si diálogo activo, procesarlo aquí y detener la propagación
// Usamos captura (third arg true) para que este handler ejecute antes que otros listeners,
// y usamos stopImmediatePropagation() para evitar que otros listeners en bubbling ejecuten.
function _dialogKeydownHandler(ev) {
  try {
    if (!current) return; // si no hay diálogo, no hacemos nada
    // Evitar que la misma pulsación que abrió el diálogo avance (debounce justOpened)
    if (current._justOpened) {
      // Evitamos que otros listeners procesen esta pulsación inicial
      try { ev.stopImmediatePropagation(); } catch(e) {}
      return;
    }

    if (ev.key && ev.key.toLowerCase() === 'e') {
      // Si el diálogo está activo, prevenimos comportamiento por defecto y
      // detenemos cualquier otro handler que quiera procesar la tecla.
      try { ev.preventDefault(); } catch(e) {}
      try { ev.stopImmediatePropagation(); } catch(e) {}
      advanceDialog();
    }
  } catch (err) {
    console.warn('[dialogManager] keydown handler error', err);
  }
}

// Añadimos con useCapture=true para que corra antes del resto
window.addEventListener('keydown', _dialogKeydownHandler, true);



  // helper para triggers: puedes llamar esto desde tu listener de interacción
  async function startDialogForTrigger(triggerSignal) {
    // 1) búsqueda local por meta.trigger_signal
    for (const k of Object.keys(dialogs)) {
      const d = dialogs[k];
      if (d.meta && (d.meta.trigger_signal === triggerSignal || d.meta.trigger_signal === String(triggerSignal))) {
        return startDialog(k, { fromTrigger: true });
      }
    }

    // 2) fallback: preguntar al servidor usando el endpoint que tienes (get_dialog.php)
    try {
      const res = await fetch('../PHP/get_dialog.php?signal=' + encodeURIComponent(triggerSignal), { cache: 'no-store' });
      if (!res.ok) {
        console.warn('startDialogForTrigger: respuesta HTTP', res.status, res.url);
        return false;
      }
      const data = await res.json();
      if (data && data.dialog_key) {
        return startDialog(data.dialog_key, { fromTrigger: true });
      } else if (data && data.success && data.lines) {
        // Si el endpoint devuelve directamente 'lines' y no dialog_key,
        // podemos montar un diálogo temporal en memoria y abrirlo.
        const tempKey = '__remote_' + (data.dialog_key || triggerSignal);
        dialogs[tempKey] = { lines: data.lines.map(l => ({ speaker: l.speaker, text: l.text })) };
        return startDialog(tempKey, { fromTrigger: true });
      }
    } catch (e) {
      console.warn('startDialogForTrigger: fallo network al pedir dialog al servidor', e);
    }
    return false;
  }


  // Seguridad: si por alguna razón un diálogo terminó pero inputLocked quedó true,
  // nos aseguramos de desbloquear al terminar cualquier diálogo.
  window.addEventListener('dialog:ended', () => {
    try {
      // Solo desbloqueamos si no hay otro diálogo activo
      if (!dialogManager._internal().current) {
        window.inputLocked = false;
        console.debug('[dialogManager] dialog:ended -> inputUnlocked by safeguard');
      }
    } catch (e) {}
  });

  //expongo funciones
  return {
    load,
    startDialog,
    startDialogForTrigger,
    forceUnlock: function() {
      try {
        window.inputLocked = false;
        console.debug('[dialogManager] forceUnlock() called -> inputLocked set to false');
      } catch (e) { console.warn('[dialogManager] forceUnlock error', e); }
    },
    _internal: () => ({ dialogs, current })
  };

})();

// export global
window.dialogManager = dialogManager;