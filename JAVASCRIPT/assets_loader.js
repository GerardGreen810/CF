/* assets_loader.js
   CARGA DE ESCENAS DESDE SERVER
   - Soporta scene.format === 'side_scroll' (por defecto)
   - Soporta scene.format === 'slides' (nuevo)
*/

// helper: construir ruta completa de asset (desde el navegador ubicado en novela/HTML)
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


// Reproductor genérico de SFX por role ('start' | 'end')
// - acepta sceneData o assetsRaw; NO aplica cache-bust para SFX (para poder debounearlos)
window._playedSFXTimestamps = window._playedSFXTimestamps || {};

window.playSceneSFX = function(role = 'start', sceneOrAssets = null) {
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
    let list = assetsRaw[roleKey] || [];
    if (!list || !list.length) list = assetsRaw['sfx'] || [];
    if (!list || !list.length) return false;

    const played = [];
    for (const a of list) {
      if (!a || !a.path) continue;
      const url = (typeof assetUrl === 'function') ? assetUrl(a.path) : ('../' + a.path);
      // IMPORTANT: NO cache-bust para SFX, así podemos debouncarlos correctamente
      const finalUrl = url; // sin '?v=...'

      // Debounce simple por URL: si se ha reproducido en los últimos 600ms, saltar
      const now = Date.now();
      const last = window._playedSFXTimestamps[finalUrl] || 0;
      if (now - last < 600) {
        console.debug('[playSceneSFX] skipping duplicate (recent):', finalUrl);
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
      audioEl.addEventListener('ended', () => { try { audioEl.src = ''; } catch(e){} });
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

  // Sincronizar slug global para que el resto del juego sepa qué escena está activa
  window.CURRENT_SCENE_SLUG = (sceneData.scene && sceneData.scene.slug) ? sceneData.scene.slug : null;
  // Emitimos un evento para depuración/otros listeners
  window.dispatchEvent(new CustomEvent('scene:applied', { detail: { slug: window.CURRENT_SCENE_SLUG } }));


  // Normalizamos assets (ya agrupados por role en get_scene.php)
  const assets = sceneData.assets || {};
  // Exponer raw assets de la escena actual para utilidades genéricas
  window.CURRENT_SCENE_ASSETS_RAW = assets;
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
  if (bg) {
    const bgUrl = assetUrl(bg.path) + '?v=' + versionParam;
    try {
      await preloadImage(bgUrl);
      escenario.style.backgroundImage = `url('${bgUrl}')`;
      escenario.style.backgroundSize = "cover";
      escenario.style.backgroundRepeat = "no-repeat";
      escenario.style.backgroundPosition = "center";

      fondoImagen = new Image();
      fondoImagen.src = bgUrl;
      fondoImagen.onload = calcularLimites;
    } catch (err) {
      console.warn('No se pudo precargar background', err);
      escenario.style.backgroundImage = `url('${assetUrl(bg.path)}')`;
    }
  } else {
    escenario.style.backgroundImage = '';
  }

  // 2) Música de escena
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
  }

  // 3) Registrar assets role->asset
  window.CURRENT_SCENE_ASSETS = window.CURRENT_SCENE_ASSETS || {};

    // 3) Registrar assets role->asset (y precargar SFX si existen)
  window.CURRENT_SCENE_ASSETS = {}; // reset
  for (const role in assets) {
    const list = assets[role];
    if (list && list.length) window.CURRENT_SCENE_ASSETS[role] = list[0];
  }

  // Precargar vídeos, sprites y SFX (si existen)
  const preloaders = [];
  if (videoList.length) for (const v of videoList) preloaders.push(preloadVideo(assetUrl(v.path) + '?v=' + versionParam));
  if (spriteList.length) for (const s of spriteList) preloaders.push(preloadImage(assetUrl(s.path) + '?v=' + versionParam));

  // PRELOAD SFX roles comunes: sfx_start, sfx_end, sfx (fallback)
  const sfxRoles = ['sfx_start','sfx_end','sfx'];
  for (const r of sfxRoles) {
    const asset = window.CURRENT_SCENE_ASSETS[r];
    if (asset && asset.path) {
      preloaders.push(preloadAudio(assetUrl(asset.path) + '?v=' + versionParam));
    }
  }

  await Promise.all(preloaders);

  // Eventos
  window.CURRENT_SCENE_EVENTS = sceneData.events || [];

  // Posicionamiento inicial según 'entrada'
  if (entrada === 'right') {
    setTimeout(() => {
      fondoX = limiteDer;
      escenario.style.backgroundPosition = `${Math.round(fondoX)}px 0`;
    }, 120);
  } else {
    fondoX = 0;
    escenario.style.backgroundPosition = `${Math.round(fondoX)}px 0`;
  }

  // reproduzco SFX de inicio si existe
  //if (typeof window.playSceneSFX === 'function') {
    // espera pequeña opcional para sincronía (puedes quitar el setTimeout si quieres inmediato)
    //setTimeout(() => { window.playSceneSFX('start', sceneData); }, 20);
  //}

  console.log('Escena aplicada:', sceneData.scene.slug, 'format:', format);
  
  // --- Auto-iniciar diálogo si la escena lo define en scene.meta.dialog_on_load ---
  // NOTE: NO auto-iniciamos diálogos aquí.
  // El arranque de los diálogos se debe hacer desde el orquestador (cambiarEscenario / activateSlides / flujo de "Continuar"),
  // para asegurar que la escena se ha aplicado completamente y que cualquier pantalla de carga / fade ya terminó.


  return true;
}


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
    return;
  }

  // Preparar UI: ocultar personaje, detener animaciones relacionadas
  try { personajeContenedor.style.display = 'none'; } catch (e) {}
  // opcional: pausar sonidos de pasos, etc (el frontend puede manejarlo)
  // Dejar la música de escena si existe (applyScene la habrá cargado si corresponde).

  // Cargar primer slide (con cache-busting)
  let idx = 0;
  const versionParam = (new Date()).getTime();

  async function showSlide(i) {
  const asset = window.CURRENT_SLIDES[i];
  if (!asset) return;
  const url = assetUrl(asset.path) + '?v=' + versionParam;
  // Preload (intenta)
  await preloadImage(url);
  escenario.style.backgroundImage = `url('${url}')`;
  escenario.style.backgroundSize = 'cover';
  escenario.style.backgroundRepeat = 'no-repeat';
  escenario.style.backgroundPosition = 'center';
  console.log('Slide mostrado:', i, url);

  // --- reproducir SFX asociados a este slide (si existen) ---
  // Suponemos que en la BD los SFX ligados a slides usan role 'slide_sfx' o 'sfx' con ordering igual al slide ordering.
  try {
    const allAssets = sceneData.assets || {};
    const slideSfxList = (allAssets['slide_sfx'] || []).concat(allAssets['sfx'] || []);
    // intención: match por ordering de la entrada slide (asset.ordering o índice+1)
    const slideOrdering = (asset.ordering != null) ? asset.ordering : (i + 1);
    const matched = slideSfxList.filter(s => (s && (s.ordering != null ? s.ordering === slideOrdering : false)));
    // si no hay ordering en asset, podríamos intentar por naming heurística (opcional)

    for (const sfx of matched) {
      if (!sfx || !sfx.path) continue;
      const sfxUrl = assetUrl(sfx.path); // NO cache-bust
      const audio = new Audio(sfxUrl);
      try {
        const meta = (sfx.meta && typeof sfx.meta === 'string') ? JSON.parse(sfx.meta) : (sfx.meta || {});
        audio.volume = (meta && meta.volume != null) ? meta.volume : 1.0;
        if (meta && meta.loop) audio.loop = true;
      } catch(e) { audio.volume = 1.0; }
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
  (function() {
    // crear/obtener elemento del mensaje de slides
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
      // guardamos un flag para restaurarlo al final si es necesario
      generalMsg._wasHiddenBySlides = true;
      generalMsg.style.display = 'none';
    }
  })();


// Listener para avanzar con E (se conecta sólo para slides)
  // Listener para avanzar con E (se conecta sólo para slides)
  const onKeySlide = async (ev) => {
    if (ev.key.toLowerCase() !== 'e') return;

    // prevenir acciones repetidas y propagation
    ev.stopImmediatePropagation();
    ev.preventDefault();

    // debounce por 200ms para evitar dobles activaciones por rebote
    const now = Date.now();
    if (now - (window._lastSlideKey || 0) < 200) return;
    window._lastSlideKey = now;

    // si ya estamos en una transición de slide, ignorar
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

    // helper: fade overlay to targetOpacity (0 or 1) en ms
    const fadeOverlay = (targetOpacity = 1, duration = 350) => {
      return new Promise((resolve) => {
        const overlay = getOverlay();
        overlay.style.transition = `opacity ${duration}ms ease`;
        // fuerza un reflow para asegurar que la transición se aplique
        requestAnimationFrame(() => {
          overlay.style.opacity = (targetOpacity).toString();
        });
        setTimeout(() => resolve(), duration + 20);
      });
    };

    try {
      // bloquear inputs de forma local (ya slides bloquea globalmente,
      // pero esto evita doble pulsación durante la animación)
      window.inputLocked = true;

      idx++; // avanzamos el índice
      if (idx < window.CURRENT_SLIDES.length) {
        // transición: fade a negro -> cambiar imagen -> fade a 0
        await fadeOverlay(1, 300);
        await showSlide(idx);
        await fadeOverlay(0, 300);
      } else {
        // Fin de slides: hacemos un fade-out antes de terminar para suavizar la salida
        await fadeOverlay(1, 300);

        // cleanup y marcar escena como completada (igual que antes)
        window.removeEventListener('keydown', onKeySlide);
        window.COMPLETED_SCENES = window.COMPLETED_SCENES || {};
        try {
          window.COMPLETED_SCENES[indiceEscenarioActual] = true;
        } catch(e) {
          console.warn('No se pudo marcar escena como completada:', e);
        }

        // liberar flags y handlers
        window.SLIDE_MODE = false;
        window.inputLocked = false;
        if (window._onKeySlideHandler) delete window._onKeySlideHandler;
        if (window._lastSlideKey) window._lastSlideKey = 0;

        // ocultar/limpiar mensaje exclusivo de slides
        const slideMsgEl = document.getElementById('mensajeE_slides');
        if (slideMsgEl) slideMsgEl.style.display = 'none';

        // restaurar mensaje general si lo ocultamos al entrar en slides
        const generalMsg = document.getElementById('mensajeE');
        if (generalMsg && generalMsg._wasHiddenBySlides) {
          generalMsg.style.display = 'none'; // lo dejamos oculto hasta que animarMovimiento lo gestione
          delete generalMsg._wasHiddenBySlides;
        }

        // Restaurar personaje (si la siguiente escena espera side_scroll)
        try { personajeContenedor.style.display = 'block'; } catch(e){}

        // Interpretar meta: cambiar a slug o reactivar modo side_scroll
        let nextSlug = null;
        try {
          const meta = (sceneData.scene.meta && typeof sceneData.scene.meta === 'string')
            ? JSON.parse(sceneData.scene.meta)
            : (sceneData.scene.meta || {});
          if (meta && meta.next_scene_slug) nextSlug = meta.next_scene_slug;
        } catch(e) {
          console.warn('No se pudo parsear scene.meta JSON', e);
        }

        // realizar la transición a la siguiente escena o reactivar (hacemos fade-in para revelar el cambio)
        if (nextSlug) {
          if (typeof window.changeToSceneBySlug === 'function') {
            // cambiar a slug; el propio changeToSceneBySlug / cambiarEscenario gestionará la entrada
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

        // opcional: fade in para suavizar la transición final (si cambiaste escena, el overlay puede persistir)
        await fadeOverlay(0, 300);
      }
    } catch (err) {
      console.error('Error durante transición de slide:', err);
    } finally {
      // asegurar que liberamos el estado de transición
      window._slideTransitioning = false;
      // si aún estamos en modo slides, mantenemos inputLocked = true; si no, ya lo liberamos arriba
      if (!window.SLIDE_MODE) window.inputLocked = false;
    }
  };


  // Conectar listener
  window.addEventListener('keydown', onKeySlide);
  // Guardar referencia por si quieres remover manualmente
  window._onKeySlideHandler = onKeySlide;
  return true;
}


// ---------------------------
// actualizarEscenario: usa server (compatibilidad)
// ---------------------------
function actualizarEscenario({ entrada = "left" } = {}) {
  const slug = 'scene_' + (indiceEscenarioActual + 1);
  return new Promise(async (resolve) => {
    try {
      const sceneData = await loadSceneFromServer({ slug });
      await applyScene(sceneData, { entrada });
    } catch (err) {
      console.error('Error cargando escena desde server:', err);
    } finally {
      resolve();
    }
  });
}