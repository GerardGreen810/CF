// actsManager.js (versión corregida - flips robustos, tamaño video ajustado)
// Responsable de cargar actos y ejecutarlos secuencialmente.
// Exposición global: window.actsManager

const actsManager = (function() {
  let acts = {};
  let runningAct = null;
  window.COMPLETED_ACTS = window.COMPLETED_ACTS || {};

  const sleep = (ms) => new Promise(res => setTimeout(res, ms));
  const debug = (...args) => {
    if (typeof window.ACTS_DEBUG !== 'undefined' && !!window.ACTS_DEBUG) console.debug('[actsManager]', ...args);
  };

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
    window.ACTS_LOADED = true;
    window.dispatchEvent(new CustomEvent('acts:loaded', { detail: { keys: Object.keys(acts) } }));
    debug('acts loaded', Object.keys(acts));
    return acts;
  }

  // --- helper: obtener el contenedor del personaje de forma robusta ---
  function _getPersonajeContenedor() {
    if (window.personajeContenedor) return window.personajeContenedor;
    const el = document.getElementById('personaje-contenedor');
    if (el) {
      window.personajeContenedor = el;
      return el;
    }
    return null;
  }

  // set facing del jugador; animate = false => giro en seco
  function setPersonajeFacing(facingLeft, { animate = true } = {}) {
    try {
      const pc = _getPersonajeContenedor();
      if (!pc) { debug('setPersonajeFacing: personajeContenedor no encontrado'); return; }
      if (!animate) pc.style.transition = '';
      else pc.style.transition = 'transform 0ms'; // puedes ajustar duración si quieres animación más suave
      pc.style.transform = 'translateX(-50%) scaleX(' + (facingLeft ? '-1' : '1') + ')';
    } catch (e) { debug('setPersonajeFacing failed', e); }
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

    let sp = String(spritePath || '');
    if (sp && !sp.match(/^(\.|\/)/)) sp = '../' + sp;

    const inner = document.createElement('div');
    inner.className = 'npc-inner';
    inner.style.position = 'relative';
    inner.style.width = '100%';
    inner.style.height = '100%';
    inner.style.overflow = 'visible';
    inner.style.display = 'flex';
    inner.style.alignItems = 'flex-end';
    inner.style.justifyContent = 'center';
    el.appendChild(inner);

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

    const img = document.createElement('img');
    if (sp) img.src = sp;
    img.alt = id;
    img.style.width = 'auto';
    img.style.height = '100%';
    img.style.display = (opts.showStaticInitially ? 'block' : 'none');
    img.style.objectFit = 'contain';
    inner.appendChild(img);

    // wrapper styles
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

    // try to set height equal to personajeContenedor height (px) so media aligns
    try {
      const pc = _getPersonajeContenedor();
      if (pc) {
        const rect = pc.getBoundingClientRect();
        if (rect && rect.height) {
          el.style.height = rect.height + 'px';
          // also reduce maxWidth so width% doesn't blow up
          if (!opts.maxWidth) el.style.maxWidth = Math.round(rect.width * 0.6) + 'px';
        }
      }
    } catch (e) { debug('set npc height failed', e); }

    if (videoEl) el._npcVideo = videoEl;
    el._npcImg = img;
    el._npcInner = inner;
    el._baseTransform = 'translateX(-50%)';

    c.appendChild(el);
    return el;
  }

  function _removeNpcElem(id) {
    const el = document.getElementById('npc_act_' + id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  // flip helper: apply scaleX to wrapper and to media
  function _applyNpcFlip(el, faceLeft) {
    if (!el) return;
    const scale = faceLeft ? -1 : 1;
    try {
      el.style.transform = (el._baseTransform || 'translateX(-50%)') + ' scaleX(' + scale + ')';
      if (el._npcImg) el._npcImg.style.transform = 'scaleX(' + scale + ')';
      if (el._npcVideo) el._npcVideo.style.transform = 'scaleX(' + scale + ')';
    } catch (e) { debug('_applyNpcFlip failed', e); }
  }

  async function startActByKey(key) {
    if (!acts[key]) { debug('startActByKey: act not found', key); return false; }
    if (runningAct) { debug('startActByKey: another act running', runningAct.key); return false; }
    const act = acts[key];
    if (window.COMPLETED_ACTS && window.COMPLETED_ACTS[key] && !(act.meta && act.meta.allow_repeat)) {
      debug('startActByKey: already completed and not repeatable', key); return false;
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

        // player_action: permite voltear al jugador, entre otras acciones pequeñas
        if (step.type === 'player_action') {
          const p = step.params || {};
          if (p.action === 'set_facing') {
            let facingLeft = false;
            if (typeof p.facingLeft === 'boolean') facingLeft = !!p.facingLeft;
            else if (p.facing === 'left') facingLeft = true;
            else if (p.facing === 'right') facingLeft = false;
            const animate = (p.animate !== undefined) ? !!p.animate : false;
            setPersonajeFacing(facingLeft, { animate });
            await sleep(30);
          } else {
            debug('player_action unknown', p);
          }

        } else if (step.type === 'spawn_npc') {
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
            const sval = String(p.startLeft); const num = parseFloat(sval);
            if (!isNaN(num)) startSide = (num >= 50) ? 'right' : 'left';
          }

          const targetXPercent = (p.targetXPercent != null ? p.targetXPercent : (p.targetX != null ? p.targetX : 50));
          const width = p.width || '12%';
          const bottomPct = (p.bottomPct != null ? p.bottomPct : 8);
          const maxWidth = p.maxWidth || '160px';

          let startLeftVal;
          if (p.startLeft != null) startLeftVal = (typeof p.startLeft === 'number' ? String(p.startLeft) + '%' : String(p.startLeft));
          else if (p.startXPercent != null) startLeftVal = (String(p.startXPercent) + '%');
          else startLeftVal = (startSide === 'left' ? '-20%' : '120%');

          const el = _createNpcElem(id, staticAsset, { startLeft: startLeftVal, width, maxWidth, bottomPct, zIndex: p.zIndex, walkUrl: walkUrl });
          runningAct._tempNpcs.push(id);

          // ajustar vertical align al personaje (px) si existe
          try {
            const pc = _getPersonajeContenedor();
            if (pc) {
              const pcRect = pc.getBoundingClientRect();
              const bottomPx = Math.max(0, Math.round(window.innerHeight - pcRect.bottom));
              el.style.bottom = `${bottomPx}px`;
              // establecer altura del wrapper acorde al personaje si no se hizo
              if (!el.style.height) el.style.height = pcRect.height + 'px';
            } else {
              el.style.bottom = (p.bottomPct != null ? p.bottomPct + '%' : el.style.bottom);
            }
          } catch(e) { debug('spawn_npc vertical align failed', e); }

          // show initial media
          try {
            if (el._npcVideo) {
              el._npcVideo.playbackRate = 1;
              el._npcVideo.loop = true;
              el._npcVideo.muted = true;
              el._npcVideo.currentTime = 0;
              // ensure video sizing limits
              try {
                const pc = _getPersonajeContenedor();
                if (pc) {
                  const rect = pc.getBoundingClientRect();
                  el._npcVideo.style.maxHeight = Math.round(rect.height * 1.05) + 'px';
                }
              } catch(e){}
              el._npcVideo.style.display = 'block';
              if (el._npcImg) el._npcImg.style.display = 'none';
              el._npcVideo.play().catch(e => debug('npc video play failed', e));
            } else if (el._npcImg) {
              el._npcImg.style.display = 'block';
            }
          } catch (e) { debug('spawn_npc: set initial media failed', e); }

          // compute distance and durations
          const parsePercent = (v) => { const s = String(v); if (s.endsWith('%')) return parseFloat(s); const n = parseFloat(s); return isNaN(n) ? 0 : n; };
          const startPercent = parsePercent(startLeftVal);
          const tgtPercent = parseFloat(targetXPercent);
          const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
          const pixelDistance = Math.abs((tgtPercent - startPercent) / 100) * vw;
          const globalBaseSpeed = (typeof window.baseSpeedPxPerSec === 'number') ? window.baseSpeedPxPerSec : 350;

          let effectiveEntrySpeedPxPerSec = null;
          if (p.speedPxPerSec && Number(p.speedPxPerSec) > 0) effectiveEntrySpeedPxPerSec = Number(p.speedPxPerSec);
          else if (p.speedMultiplier && !isNaN(Number(p.speedMultiplier))) effectiveEntrySpeedPxPerSec = Math.max(1, Math.round(globalBaseSpeed * Number(p.speedMultiplier)));
          else effectiveEntrySpeedPxPerSec = globalBaseSpeed;

          // static facing (how NPC stands before walking) and whether to flip when walking starts
          const staticFacing = (p.staticFacing === 'left' || p.staticFacing === 'right') ? p.staticFacing : 'right';
          const flipOnStart = (p.flipOnStart !== undefined) ? !!p.flipOnStart : true;
          // Movement direction
          const movementFacesLeft = !(tgtPercent > startPercent); // if moving to right -> movementFacesLeft=false
          // apply static facing first
          _applyNpcFlip(el, staticFacing === 'left');

          let entryMs;
          if (p.entryAnimationMs == null || p.entryAnimationMs === 'auto') entryMs = Math.max(250, Math.round((pixelDistance / effectiveEntrySpeedPxPerSec) * 1000));
          else { const maybe = Number(p.entryAnimationMs); entryMs = (!isNaN(maybe) && maybe > 0) ? maybe : Math.max(250, Math.round((pixelDistance / effectiveEntrySpeedPxPerSec) * 1000)); }
          entryMs = Math.min(entryMs, 30000);

          // small delay then flip to walking-facing (if requested) then animate
          await sleep(30);
          if (flipOnStart) {
            // flip to movement direction just before moving
            _applyNpcFlip(el, movementFacesLeft);
            await sleep(80);
          }

          el.style.transition = `left ${entryMs}ms linear, opacity ${Math.min(300, entryMs/2)}ms linear`;
          el.style.left = targetXPercent + '%';
          el.style.opacity = '1';
          await sleep(entryMs + 40);

          // Arrival: swap to static image if available
          try {
            if (el._npcVideo) {
              el._npcVideo.pause();
              el._npcVideo.style.display = 'none';
              if (el._npcImg && el._npcImg.src && el._npcImg.src.length) {
                el._npcImg.style.display = 'block';
              } else {
                el._npcVideo.style.display = 'block';
              }
            } else if (el._npcImg) el._npcImg.style.display = 'block';
          } catch(e){ debug('spawn_npc arrival swap failed', e); }

        } else if (step.type === 'wait') {
          const ms = (step.params && step.params.ms) || 200;
          await sleep(ms);

        } else if (step.type === 'dialog') {
          const dkey = (step.params && (step.params.dialog_key || step.params.dialogKey || step.params.key));
          if (!dkey) { debug('dialog step missing dialog_key, skipping'); continue; }
          const dm = window.dialogManager;
          let started = false;
          if (dm && typeof dm.startDialog === 'function') {
            started = await dm.startDialog(dkey).catch(e => { debug('dialog start error', e); return false; });
          } else if (dm && typeof dm.startDialogForTrigger === 'function') {
            started = await dm.startDialogForTrigger(dkey).catch(e => { debug('startDialogForTrigger error', e); return false; });
          } else { debug('dialogManager not available, skipping dialog step'); started = false; }

          if (!started) { debug('dialog not started or already completed:', dkey); continue; }
          await new Promise((resolve) => {
            const onEnd = (ev) => {
              try {
                if (!ev || !ev.detail || !ev.detail.key) { window.removeEventListener('dialog:ended', onEnd); resolve(); return; }
                if (ev.detail.key === dkey) { window.removeEventListener('dialog:ended', onEnd); resolve(); }
              } catch (e) { window.removeEventListener('dialog:ended', onEnd); resolve(); }
            };
            window.addEventListener('dialog:ended', onEnd);
          });

        } else if (step.type === 'npc_action') {
          const p = (step.params || {});
          const id = p.id;
          const el = document.getElementById('npc_act_' + id);
          if (!el) { debug('npc_action target not found', id); continue; }
          const action = p.action || 'exit';
          const exitSide = p.exitSide || 'left';
          if (action === 'exit') {
            // --- AÑADIR/PEGAR AL INICIO del branch `if (action === 'exit')` ---
            const exitSide = p.exitSide || 'left'; // ya deberías tener esto; si no, defínelo
            // decide si debe voltearse: por defecto sí (flipOnExit true)
            const flipOnExit = (p.flipOnExit === undefined) ? true : !!p.flipOnExit;
            // faceLeft = true si debe mirar a la izquierda
            const faceLeftForExit = (exitSide === 'left');

            // aplicar flip solo si lo permitimos
            if (flipOnExit) {
            try {
                _applyNpcFlip(el, faceLeftForExit);
                // Si quieres que el cambio sea "en seco" (sin transición), asegúrate que no haya transition inline:
                try { el.style.transition = el.style.transition.replace(/transform[^,;]+[;,]?/g,''); } catch(e){}
                // Forzar también la imagen estática/video (por si no están sincronizados)
                try { if (el._npcImg) el._npcImg.style.transform = 'scaleX(' + (faceLeftForExit ? '-1' : '1') + ')'; } catch(e){}
                try { if (el._npcVideo) el._npcVideo.style.transform = 'scaleX(' + (faceLeftForExit ? '-1' : '1') + ')'; } catch(e){}
            } catch(e){ debug('npc_action exit: flip on exit failed', e); }
        }


            // flip to face exit direction, show walking video
            try { _applyNpcFlip(el, exitSide === 'left'); } catch(e){ debug('npc_action flip failed', e); }
            try {
              if (el._npcImg) el._npcImg.style.display = 'none';
              if (el._npcVideo) {
                el._npcVideo.style.display = 'block';
                el._npcVideo.playbackRate = 1;
                el._npcVideo.loop = true;
                el._npcVideo.muted = true;
                el._npcVideo.currentTime = 0;
                el._npcVideo.play().catch((e) => { debug('npc exit video play failed', e); });
              }
            } catch(e){ debug('npc_action exit: show video failed', e); }

            const curRect = el.getBoundingClientRect();
            const vw = window.innerWidth || document.documentElement.clientWidth || 1024;
            const curCenterPx = curRect.left + curRect.width / 2;
            const curPercent = (curCenterPx / vw) * 100;
            const exitTargetPercent = (exitSide === 'left' ? -20 : 120);
            const pxDistanceExit = Math.abs((exitTargetPercent - curPercent) / 100) * vw;
            const globalSpeed = (typeof window.baseSpeedPxPerSec === 'number') ? window.baseSpeedPxPerSec : 350;
            let effectiveExitSpeed = globalSpeed;
            if (p.speedPxPerSec && Number(p.speedPxPerSec) > 0) effectiveExitSpeed = Number(p.speedPxPerSec);
            else if (p.speedMultiplier && !isNaN(Number(p.speedMultiplier))) effectiveExitSpeed = Math.max(1, Math.round(globalSpeed * Number(p.speedMultiplier)));
            let dur = p && p.durationMs ? p.durationMs : Math.max(300, Math.round((pxDistanceExit / effectiveExitSpeed) * 1000));
            dur = Math.min(dur, 30000);

            el.style.transition = `left ${dur}ms linear`;
            el.style.left = (exitSide === 'left' ? '-20%' : '120%');
            await sleep(dur + 40);
            try { if (el._npcVideo) { el._npcVideo.pause(); el._npcVideo.style.display = 'none'; } } catch(e){}
            _removeNpcElem(id);
          } else {
            debug('npc_action unknown action', action);
          }
        } else if (step.type === 'complete') {
          debug('act complete step', step.params || {});
        } else {
          debug('unknown act step type', step.type);
        }
      } // end for steps

      window.COMPLETED_ACTS[key] = true;
      window.dispatchEvent(new CustomEvent('act:ended', { detail: { key } }));
      debug('act finished', key);
      return true;
    } catch (err) {
      console.error('[actsManager] error during act', key, err);
      window.dispatchEvent(new CustomEvent('act:error', { detail: { key, error: err } }));
      return false;
    } finally {
      try { for (const id of (runningAct && runningAct._tempNpcs ? runningAct._tempNpcs : [])) _removeNpcElem(id); } catch(e){}
      try {
        const cm = (window.dialogManager && typeof window.dialogManager._internal === 'function') ? window.dialogManager._internal() : null;
        if (cm && cm.current) debug('finalize: active dialog present, keeping input locked for dialogManager to control');
        else window.inputLocked = !!(runningAct && runningAct.prevInputLocked) ? runningAct.prevInputLocked : false;
      } catch (e) { window.inputLocked = !!(runningAct && runningAct.prevInputLocked) ? runningAct.prevInputLocked : false; }
      runningAct = null;
    }
  }

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
    if (!candidates.length) { debug('startActForTrigger: no act candidate for trigger', triggerSignal, 'currentScene', currentScene); return false; }
    const candidate = candidates[0];
    return startActByKey(candidate.key);
  }

  function forceAbortAct() {
    debug('forceAbortAct called');
    try { if (runningAct) { for (const id of (runningAct._tempNpcs || [])) _removeNpcElem(id); runningAct = null; } } catch(e){}
    window.inputLocked = false;
    window.dispatchEvent(new CustomEvent('act:aborted', {}));
  }

  return {
    load,
    startActForTrigger,
    startActByKey,
    forceAbortAct,
    setPersonajeFacing, // API pública
    _internal: () => ({ acts, runningAct })
  };
})();

window.actsManager = actsManager;