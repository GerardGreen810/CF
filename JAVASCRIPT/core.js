// core.js
// Código núcleo: referencias DOM globales, estados globales, helpers básicos.

(function () {
  // --- Referencias DOM (guardadas si existen) ---
  const query = id => document.getElementById(id) || null;

  const videoFondo = query("backgroundVideoInicio1");
  const transicion = query("transicionInicio");
  const cinematica = query("cinematica1");
  const menu = query("menuInicio1");

  const menuInicio2 = query("menuInicio2");
  const btnContinuar = query("btnContinuar");
  const btnNueva = query("btnNueva");
  const btnEpisodios = query("btnEpisodios");
  const btnSalirEsquina = query("btnSalirEsquina");

  const escenario = query("escenario");
  const personaje = query("personaje");
  const personajeCamina = query("personajeCamina");
  const personajeContenedor = query("personaje-contenedor");

  const mensajeE = query("mensajeE");
  const pasosSFX = query("pasosSFX");
  const musicaInicio = query("musicaInicio");

  // --- Estados globales (expuestos en window para otros módulos) ---
  window.SLIDE_MODE = !!window.SLIDE_MODE; // false por defecto
  window.CURRENT_SCENE_ASSETS_RAW = window.CURRENT_SCENE_ASSETS_RAW || {};
  window.CURRENT_SCENE_SLUG = window.CURRENT_SCENE_SLUG || null;
  window.COMPLETED_SCENES = window.COMPLETED_SCENES || {};

  // estado de la partida / UI global
  window.partidaEstado = window.partidaEstado || "no_iniciada"; // 'iniciada'|'no_iniciada'
  window.estado = window.estado || "on"; // "on" | "transition" | "off"

  // bloqueo global de inputs
  window.inputLocked = !!window.inputLocked;
  window.canPressE = (typeof window.canPressE === "boolean") ? window.canPressE : true;

  // escena / personaje
  window.indiceEscenarioActual = (typeof window.indiceEscenarioActual === "number") ? window.indiceEscenarioActual : 0;
  window.posPersonaje = (typeof window.posPersonaje === "number") ? window.posPersonaje : 50;

  // porcentajes límite (configurables)
  window.minPercent = 5;
  window.maxPercent = 95;
  window.centerPercent = 50;

  // límites de scroll del fondo en px
  window.fondoX = 0;
  window.limiteIzq = 0;
  window.limiteDer = -1000;

  // speed / animation
  window.baseSpeedPxPerSec = 350;
  let lastTimestamp = performance.now();

  // fondo imagen (preload básico)
  let fondoImagen = new Image();
  fondoImagen.src = fondoImagen.src || "../img/escena1.png";
  fondoImagen.onload = () => calcularLimites();

  // --- Helpers expuestos --- //
  function isElemVisibleInViewport(el) {
    if (!el) return false;
    if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
    const rect = el.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > (window.innerHeight || document.documentElement.clientHeight)) return false;
    if (rect.right < 0 || rect.left > (window.innerWidth || document.documentElement.clientWidth)) return false;
    return true;
  }

  // calcula limiteDer/Izq basados en el fondo actual
  function calcularLimites() {
    try {
      const ventanaAncho = window.innerWidth;
      const ventanaAlto = window.innerHeight;

      // si fondoImagen no tiene dimensiones aún -> fallback
      if (!fondoImagen || !fondoImagen.width || !fondoImagen.height) {
        window.limiteIzq = 0;
        window.limiteDer = 0;
        return;
      }

      const escala = ventanaAlto / fondoImagen.height;
      const anchoRenderizado = fondoImagen.width * escala;

      window.limiteIzq = 0;
      // limiteDer <= 0 (si la imagen es más ancha que la ventana)
      window.limiteDer = Math.min(0, -(anchoRenderizado - ventanaAncho));

      // asegurar que fondoX esté dentro de límites
      window.fondoX = Math.max(window.limiteDer, Math.min(window.limiteIzq, window.fondoX));

      // aplicar al DOM si existe
      if (escenario) escenario.style.backgroundPosition = `${Math.round(window.fondoX)}px 0`;
    } catch (e) {
      // no romper si algún dato es inválido
      console.warn("calcularLimites error:", e);
    }
  }

  // devuelve true si el personaje está en extremo de escena (usado por movimiento)
  function enExtremo() {
    return (
      (window.posPersonaje <= window.minPercent && window.fondoX === window.limiteIzq) ||
      (window.posPersonaje >= window.maxPercent && window.fondoX === window.limiteDer)
    );
  }

  // función mínima para iniciar el juego desde el menú (no depende de otros módulos)
  function iniciarJuego() {
    // ocultar overlays de inicio si existieran
    try { if (document.getElementById("authContainer")) document.getElementById("authContainer").style.display = "none"; } catch(e){}
    try { if (musicaInicio && !musicaInicio.paused) { musicaInicio.pause(); musicaInicio.currentTime = 0; } } catch(e){}
    try { if (cinematica) { cinematica.pause(); cinematica.currentTime = 0; cinematica.style.display = "none"; } } catch(e){}
    try { if (videoFondo) { videoFondo.pause(); videoFondo.currentTime = 0; videoFondo.style.display = "none"; } } catch(e){}
    try { if (transicion) transicion.style.display = "none"; } catch(e){}

    // mostrar escenario
    try {
      if (escenario) {
        escenario.style.display = "block";
        window.fondoX = 0;
        escenario.style.backgroundPosition = "0px 0";
      }
    } catch(e) {}

    console.log("Juego iniciado (core.js) — listo.");
  }

  // --- Listeners mínimos --- //
  window.addEventListener("resize", calcularLimites);

  // Intento de autoplay de la música de inicio (suave, sin bloquear)
  window.addEventListener("load", () => {
    if (musicaInicio) {
      try { musicaInicio.play().catch(()=>{}); } catch(e){}
    }
  });

  // --- Exponer en window (API mínima) --- //
  window.isElemVisibleInViewport = isElemVisibleInViewport;
  window.calcularLimites = calcularLimites;
  window.enExtremo = enExtremo;
  window.iniciarJuego = iniciarJuego;

  // También exponer referencias DOM útiles si alguien las necesita
  window._CORE = {
    elements: {
      videoFondo, transicion, cinematica, menu, menuInicio2, btnContinuar, btnNueva, btnEpisodios, btnSalirEsquina,
      escenario, personaje, personajeCamina, personajeContenedor, mensajeE, pasosSFX, musicaInicio
    },
    state: {
      get indiceEscenarioActual() { return window.indiceEscenarioActual; },
      set indiceEscenarioActual(v) { window.indiceEscenarioActual = v; },
      get posPersonaje() { return window.posPersonaje; },
      set posPersonaje(v) { window.posPersonaje = v; },
      get inputLocked() { return window.inputLocked; },
      set inputLocked(v) { window.inputLocked = !!v; }
    }
  };

  // mensaje de arranque en consola para comprobar que se cargó core
  console.log("core.js cargado — variables globales inicializadas.");
})();