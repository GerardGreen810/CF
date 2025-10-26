// actsManager.js
// Responsable de cargar actos y ejecutarlos secuencialmente.
// Exposición global: window.actsManager

const actsManager = (function() {
  let acts = {}; // cargado desde JSON
  let runningAct = null; // { key, meta, prevInputLocked, _tempNpcs: [] }
  window.COMPLETED_ACTS = window.COMPLETED_ACTS || {};

  // util
  const sleep = (ms) => new Promise(res => setTimeout(res, ms));
  const debug = (...args) => {
    if (typeof window.ACTS_DEBUG === 'undefined' ? false : !!window.ACTS_DEBUG) {
      console.debug('[actsManager]', ...args);
    }
  };

  // valor por defecto de velocidad global (px/s). Puedes setear window.baseSpeedPxPerSec en tu script principal.
  if (typeof window.baseSpeedPxPerSec !== 'number') window.baseSpeedPxPerSec = 350;

  // load acts.json (acepta scene-wrapped o lista plana)
  async function load(url = '../data/acts.json') {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar acts.json: ' + res.status + ' ' + res.url);
    const raw = await res.json();

    acts = {};

    const isSceneWrapped = Object.keys(raw || {}).some(k => raw[k] && typeof raw[k] === 'object' && raw[k].acts);
    if (isSceneWrapped) {
      for (const sceneKey of Object.keys(raw || {})) {
        const sceneObj = raw[sceneKey];
        if (!sceneObj || !sceneObj.acts) continue;
        for (const k of Object.keys(sceneObj.acts)) {
          const a = sceneObj.acts[k];
          const key = a.key || k;
          acts[key] = Object.assign({}, a, { key, scene: sceneKey });
        }
      }
    } else {
      for (const k of Object.keys(raw || {})) {
        const a = raw[k];
        if (!a || typeof a !== 'object') continue;
        const key = a.key || k;
        const scene = (a.meta && (a.meta.scene_slug || a.meta.scene)) || null;
        acts[key] = Object.assign({}, a, { key, scene });
      }
    }

    debug('acts loaded', Object.keys(acts));
    window.ACTS_LOADED = true;
    window.dispatchEvent(new CustomEvent('acts:loaded', { detail: { keys: Object.keys(acts) } }));
    return acts;
  }

  // helper para ajustar la escala X de personaje sin perder translateX
  function _setPersonajeFacing(facingLeft) {
    try {
      if (!personajeContenedor) return;
      // Nota: mantenemos translateX(-50%) y aplicamos scaleX
      personajeContenedor.style.transition = 'transform 180ms ease';
      personajeContenedor.style.transform = 'translateX(-50%) scaleX(' + (facingLeft ? '-1' : '1') + ')';
    } catch (e) { debug('_setPersonajeFacing failed', e); }
  }

  function _ensureNpcContainer() {
    let c = document.getElementById('npcContainer');
    if (!c) {
      c = document.createElement('div');
      c.id = 'npcContainer';
      Object.assign(c.style, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: 10010 });
      const esc = document.getElementById('escenario');
      (esc || document.body).appendChild(c);
    }
    return c;
  }

  function _createNpcElem(id, spritePath, opts = {}) {
    const c = _ensureNpcContainer();
    const el = document.createElement('div');
    el.className = 'npc';
    el.id = 'npc_act_' + id;
    el.dataset.actNpcId = id;

    // normalize spritePath
    let sp = String(spritePath || '');
    if (sp && !sp.match(/^(\.|\/)/)) sp = '../' + sp;

    // inner container
    const inner = document.createElement('div');
    inner.className = 'npc-inner';
    inner.style.position = 'relative';
    inner.style.width = '100%';
    inner.style.height = '100%';
    inner.style.overflow = 'visible';
    el.appendChild(inner);

    // video (walking) - opcional
    let videoEl = null;
    if (opts.walkUrl) {
      videoEl = document.createElement('video');
      videoEl.src = opts.walkUrl;
      videoEl.autoplay = false;
      videoEl.muted = true;
      videoEl.loop = true;
      videoEl.playsInline = true;
      videoEl.style.display = 'none';
      videoEl.style.width = 'auto';
      videoEl.style.height = '100%';
      videoEl.style.objectFit = 'contain';
      inner.appendChild(videoEl);
    }

    // ajustar maxHeight relativo al personaje principal si existe
    const pcRect = (typeof personajeContenedor !== 'undefined' && personajeContenedor && personajeContenedor.getBoundingClientRect)
      ? personajeContenedor.getBoundingClientRect()
      : null;
    if (videoEl && pcRect) {
      videoEl.style.maxHeight = (pcRect.height * 1.05) + 'px';
    }

    // imagen estática fallback
    const img = document.createElement('img');
    if (sp) img.src = sp;
    img.alt = id;
    img.style.width = 'auto';
    img.style.height = '100%';
    img.style.display = (opts.showStaticInitially ? 'block' : 'none');
    img.style.objectFit = 'contain';
    inner.appendChild(img);

    Object.assign(el.style, {
      position: 'absolute',
      bottom: (opts.bottomPct != null ? opts.bottomPct : 8) + '%',
      left: (opts.startLeft != null ? opts.startLeft : '-20%'),
      transform: 'translateX(-50%)',
      width: opts.width || '12%',
      maxWidth: opts.maxWidth || '160px',
      pointerEvents: 'none',
      opacity: '0',
      zIndex: opts.zIndex != null ? String(opts.zIndex) : '10005'
    });

    if (videoEl) el._npcVideo = videoEl;
    el._npcImg = img;

    c.appendChild(el);
    return el;
  }

  function _removeNpcElem(id) {
    const el = document.getElementById('npc_act_' + id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // Restaurar orientación por defecto tras diálogo globalmente
  window.addEventListener('dialog:ended', () => {
    try {
      // restaurar a mirar derecha por defecto (si quieres otro comportamiento, podemos condicionar)
      _setPersonajeFacing(false);
    } catch (e) {}
  });

  // Execute a single act by key
  async function startActByKey(key) {
    if (!acts[key]) {
      debug('startActByKey: act not found', key);
      return false;
    }
    if (runningAct) {
      debug('startActByKey: another act running', runningAct.key);
      return false;
    }
    const act = acts[key];

    if (window.COMPLETED_ACTS && window.COMPLETED_ACTS[key] && !(act.meta && act.meta.allow_repeat)) {
      debug('startActByKey: already completed and not repeatable', key);
      return false;
    }

    debug('starting act', key);
    runningAct = { key, meta: act.meta || {}, _tempNpcs: [] };

    runningAct.prevInputLocked = (typeof window.inputLocked !== 'undefined') ? window.inputLocked : false;
    window.inputLocked = true;

    window.dispatchEvent(new CustomEvent('act:started', { detail: { key } }));

    try {
      for (const step of (act.steps || [])) {
        debug('act step', key, step.type, step.params || {});
        window.dispatchEvent(new CustomEvent('act:step', { detail: { key, step } }));

        // -------- spawn_npc --------
        if (step.type === 'spawn_npc') {
          const p = step.params || {};
          const id = p.id || ('npc_' + Math.random().toString(36).slice(2,8));

          const staticAsset = p.sprite || p.asset || p.img || null;
          let walkUrl = null;
          const walkPath = p.walk_asset || p.walk_video || p.walk;
          if (walkPath) {
            walkUrl = String(walkPath);
            if (!walkUrl.match(/^(\.|\/)/)) walkUrl = '../' + walkUrl;
          }

          // deduce start side
          let startSide = 'left';
          if (typeof p.startSide === 'string') startSide = p.startSide;
          else if (typeof p.startXPercent === 'number') startSide = (p.startXPercent >= 50) ? 'right' : 'left';
          else if (p.startLeft != null) {
            const sval = String(p.startLeft);
            const num = parseFloat(sval);
            if (!isNaN(num)) startSide = (num >= 50) ? 'right' : 'left';
          }

          // targets / sizes
          const targetXPercent = (p.targetXPercent != null ? p.targetXPercent : (p.targetX != null ? p.targetX : 50));
          const width = p.width || '12%';
          const bottomPct = (p.bottomPct != null ? p.bottomPct : 8);
          const maxWidth = p.maxWidth || '160px';

          // compute startLeft string
          let startLeftVal;
          if (p.startLeft != null) startLeftVal = (typeof p.startLeft === 'number' ? String(p.startLeft) + '%' : String(p.startLeft));
          else if (p.startXPercent != null) startLeftVal = (String(p.startXPercent) + '%');
          else startLeftVal = (startSide === 'left' ? '-20%' : '120%');

          // create element
          const el = _createNpcElem(id, staticAsset, { startLeft: startLeftVal, width, maxWidth, bottomPct, zIndex: p.zIndex, walkUrl: walkUrl });
          runningAct._tempNpcs.push(id);

          // ALIGN VERTICAL to personajeContenedor (px)
          try {
            if (typeof personajeContenedor !== 'undefined' && personajeContenedor) {
              const pcRect = personajeContenedor.getBoundingClientRect();
              const bottomPx = Math.max(0, Math.round(window.innerHeight - pcRect.bottom));
              el.style.bottom = `${bottomPx}px`;
            } else {
              el.style.bottom = (p.bottomPct != null ? p.bottomPct + '%' : el.style.bottom);
            }
          } catch (e) {
            debug('spawn_npc: vertical align failed', e);
          }

          // Show video or image initially (video for walking)
          if (el._npcVideo) {
            try {
              el._npcVideo.playbackRate = 1;
              if (typeof el._npcVideo.preservesPitch !== 'undefined') el._npcVideo.preservesPitch = true;
              el._npcVideo.loop = true;
              el._npcVideo.muted = true;
              el._npcVideo.currentTime = 0;
              el._npcVideo.style.display = 'block';
              if (el._npcImg) el._npcImg.style.display = 'none';
              // try play (may be blocked until interaction but it's OK)
              el._npcVideo.play().catch((e) => { debug('npc video play failed', e); });
            } catch (e) { debug('spawn_npc: video start failed', e); }
          } else if (el._npcImg) {
            el._npcImg.style.display = 'block';
          }

          // compute distance in px and decide duration based on player's baseSpeedPxPerSec or overrides
          const parsePercent = (v) => {
            const s = String(v);
            if (s.endsWith('%')) return parseFloat(s);
            const n = parseFloat(s);
            return isNaN(n) ? 0 : n;
          };

          const startPercent = parsePercent(startLeftVal);
          const tgtPercent = parseFloat(targetXPercent);
          const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
          const pixelDistance = Math.abs((tgtPercent - startPercent) / 100) * vw;

          const globalBaseSpeed = (typeof window.baseSpeedPxPerSec === 'number') ? window.baseSpeedPxPerSec : 350;

          // allow per-act overrides
          let effectiveEntrySpeedPxPerSec = null;
          if (p.speedPxPerSec && Number(p.speedPxPerSec) > 0) {
            effectiveEntrySpeedPxPerSec = Number(p.speedPxPerSec);
          } else if (p.speedMultiplier && !isNaN(Number(p.speedMultiplier))) {
            effectiveEntrySpeedPxPerSec = Math.max(1, Math.round(globalBaseSpeed * Number(p.speedMultiplier)));
          } else {
            effectiveEntrySpeedPxPerSec = globalBaseSpeed;
          }

          // Decide entryMs
          let entryMs;
          if (p.entryAnimationMs == null || p.entryAnimationMs === 'auto') {
            entryMs = Math.max(250, Math.round((pixelDistance / effectiveEntrySpeedPxPerSec) * 1000));
          } else {
            const maybe = Number(p.entryAnimationMs);
            entryMs = (!isNaN(maybe) && maybe > 0) ? maybe : Math.max(250, Math.round((pixelDistance / effectiveEntrySpeedPxPerSec) * 1000));
          }
          entryMs = Math.min(entryMs, 30000);

          // set visual facing according to travel direction (so the video looks correct)
          try {
            const goingRight = (tgtPercent > startPercent);
            el.style.transform = `translateX(-50%) scaleX(${goingRight ? 1 : -1})`;
            el.dataset._initialFacing = goingRight ? 'right' : 'left';
          } catch (e) { debug('spawn_npc: set facing failed', e); }

          // animate using linear movement (no easing)
          await sleep(30);
          el.style.transition = `left ${entryMs}ms linear, opacity ${Math.min(300, entryMs/2)}ms linear`;
          el.style.left = targetXPercent + '%';
          el.style.opacity = '1';

          // wait until complete
          await sleep(entryMs + 40);

          // Upon arrival, swap video->image
          try {
            if (el._npcVideo) {
              el._npcVideo.pause();
              el._npcVideo.style.display = 'none';
              if (el._npcImg && el._npcImg.src && el._npcImg.src.length) {
                el._npcImg.style.display = 'block';
              } else {
                // keep video if no static image
                el._npcVideo.style.display = 'block';
              }
            } else if (el._npcImg) {
              el._npcImg.style.display = 'block';
            }
          } catch (e) { debug('spawn_npc: arrival swap failed', e); }

        // -------- wait --------
        } else if (step.type === 'wait') {
          const ms = (step.params && step.params.ms) || 200;
          await sleep(ms);

        // -------- dialog --------
        } else if (step.type === 'dialog') {
          const dkey = (step.params && (step.params.dialog_key || step.params.dialogKey || step.params.key));
          if (!dkey) {
            debug('dialog step missing dialog_key, skipping');
            continue;
          }

          // Antes de abrir diálogo: forzar que personaje principal mire hacia la NPC (comportamiento común)
          try {
            _setPersonajeFacing(true); // true = mirar a la izquierda (ajusta según layout)
          } catch (e) { debug('failed to set personaje facing', e); }

          // Hacer que los NPCs temporales miren hacia el personaje
          try {
            for (const tmpId of (runningAct && runningAct._tempNpcs ? runningAct._tempNpcs : [])) {
              const ne = document.getElementById('npc_act_' + tmpId);
              if (!ne) continue;
              // Forzamos que mire hacia el personaje (comúnmente a la izquierda)
              try { ne.style.transform = 'translateX(-50%) scaleX(-1)'; } catch (e) {}
            }
          } catch (e) { debug('failed to set npc facing for dialog', e); }

          const dm = window.dialogManager;
          let started = false;
          if (dm && typeof dm.startDialog === 'function') {
            started = await dm.startDialog(dkey).catch(e => { debug('dialog start error', e); return false; });
          } else if (dm && typeof dm.startDialogForTrigger === 'function') {
            debug('dialogManager.startDialog not found; trying startDialogForTrigger with key');
            started = await dm.startDialogForTrigger(dkey).catch(e => { debug('startDialogForTrigger error', e); return false; });
          } else {
            debug('dialogManager not available, skipping dialog step');
            started = false;
          }

          if (!started) {
            debug('dialog not started or already completed:', dkey);
            continue;
          }

          // wait for dialog:ended (accepts event with detail.key or generic event)
          await new Promise((resolve) => {
            const onEnd = (ev) => {
              try {
                if (!ev || !ev.detail || !ev.detail.key) {
                  window.removeEventListener('dialog:ended', onEnd);
                  resolve();
                  return;
                }
                if (ev.detail.key === dkey) {
                  window.removeEventListener('dialog:ended', onEnd);
                  resolve();
                }
              } catch (e) {
                window.removeEventListener('dialog:ended', onEnd);
                resolve();
              }
            };
            window.addEventListener('dialog:ended', onEnd);
          });

        // -------- npc_action --------
        } else if (step.type === 'npc_action') {
          const p = (step.params || {});
          const id = p.id;
          const el = document.getElementById('npc_act_' + id);
          if (!el) {
            debug('npc_action target not found', id);
            continue;
          }
          const action = p.action || 'exit';
          const exitSide = p.exitSide || 'left';

          if (action === 'exit') {
            // Antes de salir: ajustar facing de salida (mirar hacia la dirección que se mueve)
            try {
              const faceLeft = (exitSide === 'left');
              el.style.transform = `translateX(-50%) scaleX(${faceLeft ? -1 : 1})`;
            } catch (e) { debug('npc_action: set exit facing failed', e); }

            // Mostrar video de caminata para la salida (si existe)
            try {
              if (el._npcImg) el._npcImg.style.display = 'none';
              if (el._npcVideo) {
                el._npcVideo.style.display = 'block';
                el._npcVideo.playbackRate = 1;
                if (typeof el._npcVideo.preservesPitch !== 'undefined') el._npcVideo.preservesPitch = true;
                el._npcVideo.loop = true;
                el._npcVideo.muted = true;
                el._npcVideo.currentTime = 0;
                el._npcVideo.play().catch((e) => debug('npc exit video play failed', e));
              }
            } catch (e) { debug('npc_action exit: show video failed', e); }

            // Calcular duración de salida usando overrides si los hay
            const curRect = el.getBoundingClientRect();
            const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
            const curCenterPx = curRect.left + curRect.width / 2;
            const curPercent = (curCenterPx / vw) * 100;
            const exitTargetPercent = (exitSide === 'left' ? -20 : 120);
            const pxDistanceExit = Math.abs((exitTargetPercent - curPercent) / 100) * vw;

            const globalBaseSpeed = (typeof window.baseSpeedPxPerSec === 'number') ? window.baseSpeedPxPerSec : 350;
            let effectiveExitSpeed = null;
            if (p.exitSpeedPxPerSec && Number(p.exitSpeedPxPerSec) > 0) {
              effectiveExitSpeed = Number(p.exitSpeedPxPerSec);
            } else if (p.exitSpeedMultiplier && !isNaN(Number(p.exitSpeedMultiplier))) {
              effectiveExitSpeed = Math.max(1, Math.round(globalBaseSpeed * Number(p.exitSpeedMultiplier)));
            } else if (p.speedPxPerSec && Number(p.speedPxPerSec) > 0) {
              // fallback to entry speed if explicitly provided
              effectiveExitSpeed = Number(p.speedPxPerSec);
            } else if (p.speedMultiplier && !isNaN(Number(p.speedMultiplier))) {
              effectiveExitSpeed = Math.max(1, Math.round(globalBaseSpeed * Number(p.speedMultiplier)));
            } else {
              effectiveExitSpeed = globalBaseSpeed;
            }

            let dur = p && p.durationMs ? p.durationMs : Math.max(200, Math.round((pxDistanceExit / effectiveExitSpeed) * 1000));
            dur = Math.min(dur, 30000);

            // animate left only (linear) - sin opacity fade para parecer caminata natural
            el.style.transition = `left ${dur}ms linear`;
            el.style.left = (exitSide === 'left' ? '-20%' : '120%');

            await sleep(dur + 40);

            // Al terminar, pausar video y remover
            try { if (el._npcVideo) { el._npcVideo.pause(); el._npcVideo.style.display = 'none'; } } catch (e) {}
            _removeNpcElem(id);
          } else {
            debug('npc_action unknown action', action);
          }

        // -------- complete --------
        } else if (step.type === 'complete') {
          debug('act complete step', step.params || {});

        } else {
          debug('unknown act step type', step.type);
        }
      }

      window.COMPLETED_ACTS[key] = true;
      window.dispatchEvent(new CustomEvent('act:ended', { detail: { key } }));
      debug('act finished', key);
      return true;

    } catch (err) {
      console.error('[actsManager] error during act', key, err);
      window.dispatchEvent(new CustomEvent('act:error', { detail: { key, error: err } }));
      return false;
    } finally {
      try {
        for (const id of (runningAct && runningAct._tempNpcs ? runningAct._tempNpcs : [])) {
          _removeNpcElem(id);
        }
      } catch (e) {}

      try {
        const cm = (window.dialogManager && typeof window.dialogManager._internal === 'function') ? window.dialogManager._internal() : null;
        if (cm && cm.current) {
          debug('finalize: active dialog present, keeping input locked for dialogManager to control');
        } else {
          window.inputLocked = !!(runningAct && runningAct.prevInputLocked) ? runningAct.prevInputLocked : false;
        }
      } catch (e) {
        window.inputLocked = !!(runningAct && runningAct.prevInputLocked) ? runningAct.prevInputLocked : false;
      }
      runningAct = null;
    }
  }

  // find act by trigger and current scene
  async function startActForTrigger(triggerSignal) {
    const currentScene = window.CURRENT_SCENE_SLUG || null;
    const candidates = Object.keys(acts).map(k => acts[k]).filter(a => {
      const metaSignal = a.trigger_signal || (a.meta && a.meta.trigger_signal) || (a.meta && a.meta.triggerSignal);
      if (!metaSignal) return false;
      if (metaSignal !== triggerSignal) return false;

      if (a.scene) {
        if (!currentScene) return false;
        if (a.scene !== currentScene) return false;
      }
      return true;
    });

    if (!candidates.length) {
      debug('startActForTrigger: no act candidate for trigger', triggerSignal, 'currentScene', currentScene);
      return false;
    }

    const candidate = candidates[0];
    return startActByKey(candidate.key);
  }

  function forceAbortAct() {
    debug('forceAbortAct called');
    try {
      if (runningAct) {
        for (const id of (runningAct._tempNpcs || [])) _removeNpcElem(id);
        runningAct = null;
      }
    } catch (e) {}
    window.inputLocked = false;
    window.dispatchEvent(new CustomEvent('act:aborted', {}));
  }

  return {
    load,
    startActForTrigger,
    startActByKey,
    forceAbortAct,
    _internal: () => ({ acts, runningAct })
  };
})();

window.actsManager = actsManager;