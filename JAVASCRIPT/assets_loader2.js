//assets_loader.js

/* CARGA DE ESCENAS DESDE SERVER
   - Soporta scene.format === 'side_scroll'
   - Soporta scene.format === 'slides'
*/

(function () {
  // Helper: construir ruta completa de asset (desde el navegador ubicado en novela/HTML)
  function assetUrl(pathRelativeFromNovela) {
    return '../' + pathRelativeFromNovela;
  }

  function preloadImage(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ url, width: img.width, height: img.height });
      img.onerror = () => resolve({ url, error: true });
      img.src = url;
    });
  }

  function preloadVideo(url) {
    return new Promise((resolve) => {
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.muted = true;
      vid.src = url;
      vid.onloadedmetadata = () => resolve({ url, duration: vid.duration });
      vid.onerror = () => resolve({ url, error: true });
    });
  }

  function preloadAudio(url) {
    return new Promise((resolve) => {
      const a = new Audio();
      a.preload = 'metadata';
      a.src = url;
      a.onloadedmetadata = () => resolve({ url, duration: a.duration });
      a.onerror = () => resolve({ url, error: true });
    });
  }

  // -------------------------------
  // Util: deduplicar array de assets por path (preservando primer elemento)
  // -------------------------------
  function uniqueAssetsByPath(list = []) {
    const seen = new Set();
    const out = [];
    for (const a of list) {
      if (!a || !a.path) continue;
      if (seen.has(a.path)) continue;
      seen.add(a.path);
      out.push(a);
    }
    return out;
  }

  // -------------------------------
  // Reproductor genérico de SFX por role ('start' | 'end')
  // - acepta sceneData o assetsRaw; NO aplica cache-bust para SFX (para permitir debounce)
  // - evita reproducir la misma URL si se ha reproducido en los últimos X ms
  // -------------------------------
  window._playedSFXTimestamps = window._playedSFXTimestamps || {};
  const SFX_DEBOUNCE_MS = 300; // tiempo corto para evitar duplicados instantáneos

  window.playSceneSFX = function (role = 'start', sceneOrAssets = null) {
    try {
      role = (role || 'start').toString().replace(/^sfx_?/i, '').toLowerCase(); // 'start'|'end'
      const roleKey = 'sfx_' + role;

      // Normalizar assetsRaw:
      let assetsRaw = {};
      if (sceneOrAssets && sceneOrAssets.assets) {
        assetsRaw = sceneOrAssets.assets;
      } else if (sceneOrAssets && typeof sceneOrAssets === 'object') {
        assetsRaw = sceneOrAssets;
      } else {
        assetsRaw = window.CURRENT_SCENE_ASSETS_RAW || {};
      }

      // Priorizar sfx_start / sfx_end; fallback a 'sfx'
      let list = [].concat(assetsRaw[roleKey] || [], assetsRaw['sfx'] || []);
      if (!list || !list.length) return false;

      // Deduplicar por path (muy útil cuando la BD tiene filas duplicadas)
      list = uniqueAssetsByPath(list);

      const played = [];
      for (const a of list) {
        if (!a || !a.path) continue;

        const url = (typeof assetUrl === 'function') ? assetUrl(a.path) : ('../' + a.path);
        const finalUrl = url; // intentional: no cache-bust for sfx

        // debounce por URL
        const now = Date.now();
        const last = window._playedSFXTimestamps[finalUrl] || 0;
        if (now - last < SFX_DEBOUNCE_MS) {
          console.debug('[playSceneSFX] skipping (debounced):', finalUrl);
          continue;
        }
        window._playedSFXTimestamps[finalUrl] = now;

        const audioEl = new Audio(finalUrl);
        try {
          const meta = (a.meta && typeof a.meta === 'string') ? JSON.parse(a.meta) : (a.meta || {});
          audioEl.volume = (meta && meta.volume != null) ? meta.volume : 1.0;
          if (meta && meta.loop) audioEl.loop = true;
        } catch (e) {
          audioEl.volume = 1.0;
        }
        audioEl.play().catch((err) => {
          console.warn('[playSceneSFX] play failed', finalUrl, err);
        });
        audioEl.addEventListener('ended', () => { try { audioEl.src = ''; } catch (e) {} });
        played.push(audioEl);
        console.debug('[playSceneSFX] played', roleKey, finalUrl);
      }

      return played.length ? played : true;
    } catch (err) {
      console.warn('playSceneSFX error', err);
      return false;
    }
  };

  // ---------------------------
  // Llamada al servidor
  // ---------------------------
  async function loadSceneFromServer({ slug = null, id = null } = {}) {
    let q = '';
    if (slug) q = '?slug=' + encodeURIComponent(slug);
    else if (id) q = '?id=' + encodeURIComponent(id);
    const res = await fetch('../PHP/get_scene.php' + q, { cache: 'no-store' });
    const data = await res.json(); // asumimos JSON válido por el PHP
    if (!data.success) throw new Error(data.message || 'Error al obtener escena');
    return data; // contiene: scene, assets, events
  }

  // ---------------------------
  // applyScene: aplica la escena en pantalla
  // si scene.format === 'slides' llama a activateSlides
  // ---------------------------
  async function applyScene(sceneData, { entrada = 'left' } = {}) {
    if (!sceneData || !sceneData.scene) {
      console.warn('applyScene: sceneData inválido');
      return false;
    }

    // Normalizamos assets (ya agrupados por role en get_scene.php)
    const assets = sceneData.assets || {};
    // Exponer raw assets de la escena actual para utilidades genéricas
    window.CURRENT_SCENE_ASSETS_RAW = assets;
    window.CURRENT_SCENE_SLUG = (sceneData.scene && sceneData.scene.slug) ? sceneData.scene.slug : window.CURRENT_SCENE_SLUG;
    const format = (sceneData.scene.format || 'side_scroll').toString();

    // Si es formato slides, manejamos con activateSlides
    if (format === 'slides') {
      await activateSlides(sceneData, { entrada });
      return true;
    }

    // --- default / side_scroll ---
    const bgList = assets['background'] || [];
    const musicList = assets['bg_music'] || assets['music'] || [];
    const videoList = assets['video'] || [];
    const spriteList = assets['npc_sprite'] || assets['sprite'] || [];

    const bg = bgList.length ? bgList[0] : null;
    const versionParam = (new Date()).getTime();

    // 1) Fondo
    try {
      if (typeof escenario === 'undefined' || !escenario) {
        console.warn('applyScene: elemento #escenario no disponible en DOM (todavía).');
      } else {
        if (bg) {
          const bgUrl = assetUrl(bg.path) + '?v=' + versionParam;
          try {
            await preloadImage(bgUrl);
            escenario.style.backgroundImage = `url('${bgUrl}')`;
            escenario.style.backgroundSize = "cover";
            escenario.style.backgroundRepeat = "no-repeat";
            escenario.style.backgroundPosition = "center";

            // actualizar fondoImagen global si existe
            try {
              window.fondoImagen = new Image();
              window.fondoImagen.src = bgUrl;
              window.fondoImagen.onload = window.calcularLimites || (() => {});
            } catch (e) {}
          } catch (err) {
            console.warn('No se pudo precargar background', err);
            escenario.style.backgroundImage = `url('${assetUrl(bg.path)}')`;
          }
        } else {
          escenario.style.backgroundImage = '';
        }
      }
    } catch (e) {
      console.warn('applyScene fondo error', e);
    }

    // 2) Música de escena
    try {
      if (musicList.length) {
        const music = musicList[0];
        const url = assetUrl(music.path) + '?v=' + versionParam;
        let escenaAudio = document.getElementById('escenaAudio');
        if (!escenaAudio) {
          escenaAudio = document.createElement('audio');
          escenaAudio.id = 'escenaAudio';
          escenaAudio.loop = true;
          document.body.appendChild(escenaAudio);
        }
        escenaAudio.src = url;
        try {
          const meta = (music.meta && typeof music.meta === 'string') ? JSON.parse(music.meta) : (music.meta || {});
          escenaAudio.volume = (meta.volume != null) ? meta.volume : 0.6;
          escenaAudio.loop = !!meta.loop;
        } catch (e) {
          escenaAudio.volume = 0.6;
          escenaAudio.loop = true;
        }
        escenaAudio.play().catch(()=>{/* autoplay bloqueado */});
      } else {
        // si no hay música, dejar la existente (o detenerla si quieres)
      }
    } catch (e) {
      console.warn('applyScene music error', e);
    }

    // 3) Registrar assets role->asset (primer elemento por role)
    window.CURRENT_SCENE_ASSETS = {};
    for (const role in assets) {
      const list = assets[role];
      if (list && list.length) {
        // guardamos el primer asset por role (como convención)
        window.CURRENT_SCENE_ASSETS[role] = list[0];
      }
    }

    // Precargar vídeos, sprites y SFX (si existen)
    try {
      const preloaders = [];
      if (videoList.length) for (const v of videoList) preloaders.push(preloadVideo(assetUrl(v.path) + '?v=' + versionParam));
      if (spriteList.length) for (const s of spriteList) preloaders.push(preloadImage(assetUrl(s.path) + '?v=' + versionParam));

      // PRELOAD SFX roles comunes: sfx_start, sfx_end, sfx (fallback)
      const sfxRoles = ['sfx_start','sfx_end','sfx'];
      for (const r of sfxRoles) {
        const list = assets[r] || [];
        // dedupe por path
        const unique = uniqueAssetsByPath(list);
        for (const a of unique) {
          if (a && a.path) preloaders.push(preloadAudio(assetUrl(a.path) + '?v=' + versionParam));
        }
      }

      await Promise.all(preloaders);
    } catch (e) {
      console.warn('applyScene preloads error', e);
    }

    // Eventos
    window.CURRENT_SCENE_EVENTS = sceneData.events || [];

    // Posicionamiento inicial según 'entrada'
    try {
      if (entrada === 'right') {
        setTimeout(() => {
          try {
            window.fondoX = window.limiteDer || window.fondoX || 0;
            if (escenario) escenario.style.backgroundPosition = `${Math.round(window.fondoX)}px 0`;
          } catch (e) {}
        }, 120);
      } else {
        window.fondoX = 0;
        if (escenario) escenario.style.backgroundPosition = `${Math.round(window.fondoX)}px 0`;
      }
    } catch (e) {}

    // reproducir SFX de inicio **inmediatamente** si existe (sin esperar)
    try {
      if (typeof window.playSceneSFX === 'function') {
        window.playSceneSFX('start', sceneData);
      }
    } catch (e) {
      console.warn('applyScene: playSceneSFX start failed', e);
    }

    console.log('Escena aplicada:', sceneData.scene.slug, 'format:', format);
    return true;
  } // applyScene

  // ---------------------------
  // activateSlides: presenta slides (sin personaje), avanza con tecla E
  // - busca assets role 'slide' en sceneData.assets (ordenados por ordering)
  // - reproduce slide_sfx o sfx con ordering que coincida
  // ---------------------------
  async function activateSlides(sceneData, { entrada = 'left' } = {}) {
    // Bloquear inputs globales (para prevenir movimiento y transiciones)
    window.inputLocked = true;

    // Guardamos señal global para el frontend
    window.SLIDE_MODE = true;
    window.CURRENT_SLIDES = []; // array de {path, name, type}

    const assets = sceneData.assets || {};
    // Preferimos role 'slide'
    const slidesList = assets['slide'] && assets['slide'].slice().sort((a,b) => (a.ordering||0)-(b.ordering||0));
    if (slidesList && slidesList.length) {
      window.CURRENT_SLIDES = slidesList;
    } else {
      // fallback: si hay múltiples backgrounds, usarlos como slides
      const bgList = assets['background'] && assets['background'].slice().sort((a,b) => (a.ordering||0)-(b.ordering||0));
      if (bgList && bgList.length > 1) window.CURRENT_SLIDES = bgList;
      else if (bgList && bgList.length === 1) window.CURRENT_SLIDES = bgList; // al menos 1 slide
    }

    if (!window.CURRENT_SLIDES.length) {
      console.warn('activateSlides: no hay slides para', sceneData.scene.slug);
      window.SLIDE_MODE = false;
      window.inputLocked = false;
      return;
    }

    // Preparar UI: ocultar personaje, detener animaciones relacionadas
    try { if (typeof personajeContenedor !== 'undefined' && personajeContenedor) personajeContenedor.style.display = 'none'; } catch (e) {}

    // Cargar primer slide (con cache-busting)
    let idx = 0;
    const versionParam = (new Date()).getTime();

    async function showSlide(i) {
      const asset = window.CURRENT_SLIDES[i];
      if (!asset) return;
      const url = assetUrl(asset.path) + '?v=' + versionParam;
      // Preload (intenta)
      await preloadImage(url);
      if (escenario) {
        escenario.style.backgroundImage = `url('${url}')`;
        escenario.style.backgroundSize = 'cover';
        escenario.style.backgroundRepeat = 'no-repeat';
        escenario.style.backgroundPosition = 'center';
      }
      console.log('Slide mostrado:', i, url);

      // --- reproducir SFX asociados a este slide (si existen) ---
      try {
        const allAssets = sceneData.assets || {};
        // juntamos posibles roles que soporten sfx por slide
        const slideSfxList = [].concat(allAssets['slide_sfx'] || [], allAssets['sfx'] || []);
        // dedupe por path antes de filtrar por ordering
        const uniqueSfx = uniqueAssetsByPath(slideSfxList);

        const slideOrdering = (asset.ordering != null) ? asset.ordering : (i + 1);

        // filtrar por ordering igual al slideOrdering
        const matched = uniqueSfx.filter(s => (s && (s.ordering != null ? s.ordering === slideOrdering : false)));

        // Si no se encontró por ordering, no hacemos heurísticas aquí (evitamos replicar sonidos)
        for (const sfx of matched) {
          if (!sfx || !sfx.path) continue;
          const sfxUrl = (typeof assetUrl === 'function') ? assetUrl(sfx.path) : ('../' + sfx.path);
          // Reproducir sin cache-bust (para permitir debounce)
          const audio = new Audio(sfxUrl);
          try {
            const meta = (sfx.meta && typeof sfx.meta === 'string') ? JSON.parse(sfx.meta) : (sfx.meta || {});
            audio.volume = (meta && meta.volume != null) ? meta.volume : 1.0;
            if (meta && meta.loop) audio.loop = true;
          } catch (e) { audio.volume = 1.0; }
          audio.play().catch(()=>{/* autoplay bloqueado */});
          audio.addEventListener('ended', ()=>{ try{ audio.src=''; }catch(e){} });
          console.debug('[activateSlides] played slide sfx', sfxUrl, 'for slide', i);
        }
      } catch (e) {
        console.warn('Error reproduciendo SFX por slide', e);
      }
    }

    await showSlide(0);

    // --- Mostrar mensaje exclusivo para slides y ocultar el mensaje general ---
    (function () {
      let slideMsg = document.getElementById('mensajeE_slides');
      if (!slideMsg) {
        slideMsg = document.createElement('div');
        slideMsg.id = 'mensajeE_slides';
        slideMsg.textContent = 'Presiona "E" para avanzar';
        document.body.appendChild(slideMsg);
      }
      slideMsg.style.display = 'block';

      // ocultar el mensaje general (para que no aparezca sobre el contenedor invisible)
      const generalMsg = document.getElementById('mensajeE');
      if (generalMsg) {
        generalMsg._wasHiddenBySlides = true;
        generalMsg.style.display = 'none';
      }
    })();

    // Listener para avanzar con E (se conecta sólo para slides)
    const onKeySlide = async (ev) => {
      if (ev.key.toLowerCase() !== 'e') return;

      ev.stopImmediatePropagation();
      ev.preventDefault();

      const now = Date.now();
      if (now - (window._lastSlideKey || 0) < 200) return;
      window._lastSlideKey = now;

      if (window._slideTransitioning) return;
      window._slideTransitioning = true;

      // helper: crear/obtener overlay de fade (reusa id fadeTransicion si existe)
      const getOverlay = () => {
        let overlay = document.getElementById('fadeTransicion');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'fadeTransicion';
          Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'black',
            opacity: '0',
            transition: 'opacity 0.35s ease',
            zIndex: '99999',
            pointerEvents: 'none'
          });
          document.body.appendChild(overlay);
        }
        return overlay;
      };

      const fadeOverlay = (targetOpacity = 1, duration = 350) => {
        return new Promise((resolve) => {
          const overlay = getOverlay();
          overlay.style.transition = `opacity ${duration}ms ease`;
          requestAnimationFrame(() => {
            overlay.style.opacity = (targetOpacity).toString();
          });
          setTimeout(() => resolve(), duration + 20);
        });
      };

      try {
        window.inputLocked = true;
        idx++;
        if (idx < window.CURRENT_SLIDES.length) {
          await fadeOverlay(1, 300);
          await showSlide(idx);
          await fadeOverlay(0, 300);
        } else {
          await fadeOverlay(1, 300);

          window.removeEventListener('keydown', onKeySlide);
          window.COMPLETED_SCENES = window.COMPLETED_SCENES || {};
          try {
            window.COMPLETED_SCENES[window.indiceEscenarioActual || 0] = true;
          } catch (e) {
            console.warn('No se pudo marcar escena como completada:', e);
          }

          window.SLIDE_MODE = false;
          window.inputLocked = false;
          if (window._onKeySlideHandler) delete window._onKeySlideHandler;
          if (window._lastSlideKey) window._lastSlideKey = 0;

          const slideMsgEl = document.getElementById('mensajeE_slides');
          if (slideMsgEl) slideMsgEl.style.display = 'none';

          const generalMsg = document.getElementById('mensajeE');
          if (generalMsg && generalMsg._wasHiddenBySlides) {
            generalMsg.style.display = 'none';
            delete generalMsg._wasHiddenBySlides;
          }

          try { if (typeof personajeContenedor !== 'undefined' && personajeContenedor) personajeContenedor.style.display = 'block'; } catch(e){}

          // Interpretar meta
          let nextSlug = null;
          try {
            const meta = (sceneData.scene.meta && typeof sceneData.scene.meta === 'string')
              ? JSON.parse(sceneData.scene.meta)
              : (sceneData.scene.meta || {});
            if (meta && meta.next_scene_slug) nextSlug = meta.next_scene_slug;
          } catch (e) {
            console.warn('No se pudo parsear scene.meta JSON', e);
          }

          if (nextSlug) {
            if (typeof window.changeToSceneBySlug === 'function') {
              window.changeToSceneBySlug(nextSlug).catch(err => console.error(err));
            } else if (typeof window.cambiarEscenarioPorSlug === 'function') {
              window.cambiarEscenarioPorSlug(nextSlug).catch(err => console.error(err));
            } else {
              if (typeof window.cambiarEscenario === 'function') {
                window.cambiarEscenario(1).catch(()=>{});
              }
            }
          } else {
            console.log('Slides finalizados (sin next_scene_slug).');
          }

          await fadeOverlay(0, 300);
        }
      } catch (err) {
        console.error('Error durante transición de slide:', err);
      } finally {
        window._slideTransitioning = false;
        if (!window.SLIDE_MODE) window.inputLocked = false;
      }
    };

    window.addEventListener('keydown', onKeySlide);
    window._onKeySlideHandler = onKeySlide;
    return true;
  } // activateSlides

  // ---------------------------
  // actualizarEscenario: usa server (compatibilidad)
  // ---------------------------
  async function actualizarEscenario({ entrada = "left" } = {}) {
    const slug = 'scene_' + ((window.indiceEscenarioActual || 0) + 1);
    try {
      const sceneData = await loadSceneFromServer({ slug });
      await applyScene(sceneData, { entrada });
    } catch (err) {
      console.error('Error cargando escena desde server:', err);
    }
  }

  // Exponer funciones útiles globalmente
  window.assetUrl = assetUrl;
  window.loadSceneFromServer = loadSceneFromServer;
  window.applyScene = applyScene;
  window.activateSlides = activateSlides;
  window.actualizarEscenario = actualizarEscenario;

  console.log('assets_loader.js cargado y listo.');
})();