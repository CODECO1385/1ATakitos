/* ==================================================================
   TAKITOS CON SABOR — AR MENU DEMO (v2)
   js/app.js

   Toda la lógica de la demo vive en este archivo, organizada en
   secciones numeradas:

     1.  CONFIGURACIÓN DEL NEGOCIO Y DATOS DE PRODUCTOS
     2.  ESTADO GLOBAL
     3.  REFERENCIAS AL DOM
     4.  NAVEGACIÓN ENTRE VISTAS
     5.  RENDERIZADO DEL MENÚ Y DETALLE
     6.  GALERÍA NORMAL (previa a AR)
     7.  EXPERIENCIA AR — CÁMARA
     8.  EXPERIENCIA AR — GESTOS (swipe / mover / pinch)
     9.  EXPERIENCIA AR — CAMBIAR PLATILLO
     10. EXPERIENCIA AR — CAPTURAR Y COMPARTIR
     11. MANEJO DE ERRORES DE CÁMARA
     12. INICIALIZACIÓN

   ------------------------------------------------------------------
   ARQUITECTURA PENSADA PARA CRECER (2 → 20 → 100 productos, y más
   allá de restaurantes):

   Todo el código trabaja sobre un arreglo genérico `products`, nunca
   sobre "Enchiladas" o "Takitos con Sabor" a pie de código. El objeto
   `BUSINESS` al inicio del archivo es lo único que tendrías que
   editar para reutilizar esta misma base en otro giro (por ejemplo,
   una agencia de autos o una mueblería): cambias el nombre, el
   eslogan y las etiquetas ("platillo" → "vehículo" / "mueble"), y el
   resto del código sigue funcionando igual porque no depende de esos
   textos.

   ------------------------------------------------------------------
   NOTA SOBRE MODELOS 3D FUTUROS:
   Esta demo usa una fotografía 2D superpuesta sobre el video de la
   cámara para simular AR sin necesitar detección real de superficies.
   Cuando exista un modelo real (por ejemplo `dish-01.glb`), el bloque
   <img id="arDishImg"> en index.html se sustituiría por un <canvas>
   renderizado con Three.js + GLTFLoader + WebXR, aplicando ese mismo
   modelo las transformaciones que hoy vive en `arTransform`
   (posición, escala, rotación). Los puntos exactos de integración
   están marcados con el comentario "INTEGRACIÓN 3D" a lo largo del
   archivo.
================================================================== */

(function () {
  'use strict';

  /* ================================================================
     1. CONFIGURACIÓN DEL NEGOCIO Y DATOS DE PRODUCTOS

     `BUSINESS` centraliza los textos de marca — es lo único ligado
     al giro "restaurante". `products` es un arreglo genérico: cada
     elemento representa "un producto que se puede ver en AR", sin
     importar si mañana son platillos, muebles o autos.
  ================================================================ */
  const BUSINESS = {
    name: 'Takitos con Sabor',
    tagline: 'Con sabor auténtico',
    itemLabelSingular: 'platillo',
    itemLabelPlural: 'platillos'
  };

  const products = [
    {
      id: 'dish-01',
      name: 'Enchiladas',
      description: 'Tortillas de maíz rellenas de pollo deshebrado, bañadas en salsa roja de chile guajillo y queso fresco.',
      price: '$14.99',
      category: 'Platillo fuerte',
      images: [
        'assets/images/dish-01-1.jpg',
        'assets/images/dish-01-2.jpg',
        'assets/images/dish-01-3.jpg'
      ],
      model: 'assets/dishes/3D.glb'
    },
    {
      id: 'dish-02',
      name: 'Carne Asada',
      description: 'Corte de res a la parrilla con guacamole, frijoles charros y tortillas hechas a mano.',
      price: '$19.99',
      category: 'Especialidad de la casa',
      images: [
        'assets/images/dish-02-1.jpg',
        'assets/images/dish-02-2.jpg',
        'assets/images/dish-02-3.jpg'
      ],
      model: 'assets/dishes/3D-01.glb'
    }
  ];

  function findProduct(id) {
    return products.find((p) => p.id === id) || null;
  }

  /* ================================================================
     2. ESTADO GLOBAL
  ================================================================ */
  const state = {
    currentDishId: null,   // producto abierto en la vista de detalle
    arDishId: null,        // producto activo dentro de AR
    arPhotoIndex: 0,       // fotografía activa dentro de AR
    galleryDishId: null,   // producto abierto en la galería normal
    galleryPhotoIndex: 0,  // fotografía activa en la galería normal
    cameraStream: null,    // MediaStream activo de la cámara
    lastErrorContext: null // 'camera' | 'model' — qué reintentar con el botón "Intentar nuevamente"
  };

  // Transformación del platillo dentro de AR (posición, escala, rotación).
  const arTransform = { x: 0, y: 0, scale: 1, rotation: 0 };

  const MIN_SCALE = 0.4;
  const MAX_SCALE = 3.0;

  /* ================================================================
     3. REFERENCIAS AL DOM
  ================================================================ */
  const els = {};

  function cacheDom() {
    els.views = {
      home: document.getElementById('view-home'),
      menu: document.getElementById('view-menu'),
      dish: document.getElementById('view-dish')
    };
    els.menuGrid = document.getElementById('menuGrid');
    els.dishDetail = document.getElementById('dishDetail');
    els.btnVerMenu = document.getElementById('btnVerMenu');
    els.brandName = document.getElementById('brandName');
    els.brandNameHero = document.getElementById('brandNameHero');
    els.brandTagline = document.getElementById('brandTagline');

    // Galería normal
    els.galleryOverlay = document.getElementById('galleryOverlay');
    els.galleryTrack = document.getElementById('galleryTrack');
    els.galleryDots = document.getElementById('galleryDots');
    els.galleryProductName = document.getElementById('galleryProductName');
    els.btnCloseGallery = document.getElementById('btnCloseGallery');
    els.btnGalleryPrev = document.getElementById('btnGalleryPrev');
    els.btnGalleryNext = document.getElementById('btnGalleryNext');

    // AR
    els.arOverlay = document.getElementById('arOverlay');
    els.arVideo = document.getElementById('arVideo');
    els.arCanvas = document.getElementById('arCanvas');
    els.arSurface = document.getElementById('arSurface');
    els.arDish = document.getElementById('arDish');
    els.arDishImg = document.getElementById('arDishImg');
    els.arDishModel = document.getElementById('arDishModel');
    els.arPhotoDots = document.getElementById('arPhotoDots');
    els.arGestureHints = document.getElementById('arGestureHints');
    els.arProductName = document.getElementById('arProductName');

    els.btnCloseAR = document.getElementById('btnCloseAR');
    els.btnResetDish = document.getElementById('btnResetDish');
    els.btnSwitchDish = document.getElementById('btnSwitchDish');
    els.btnCapture = document.getElementById('btnCapture');
    els.btnShare = document.getElementById('btnShare');

    els.dishTray = document.getElementById('dishTray');
    els.dishTrayInner = document.getElementById('dishTrayInner');

    els.capturePreview = document.getElementById('capturePreview');
    els.captureImg = document.getElementById('captureImg');
    els.btnCaptureClose = document.getElementById('btnCaptureClose');
    els.btnCaptureDownload = document.getElementById('btnCaptureDownload');

    els.arErrorScreen = document.getElementById('arErrorScreen');
    els.arErrorIcon = document.getElementById('arErrorIcon');
    els.arErrorTitle = document.getElementById('arErrorTitle');
    els.arErrorMessage = document.getElementById('arErrorMessage');
    els.btnRetryCamera = document.getElementById('btnRetryCamera');
    els.btnCancelAR = document.getElementById('btnCancelAR');

    els.arDesktopDemo = document.getElementById('arDesktopDemo');
  }

  function applyBranding() {
    els.brandName.textContent = BUSINESS.name;
    els.brandNameHero.textContent = BUSINESS.name;
    els.brandTagline.textContent = BUSINESS.tagline;
  }

  /* ================================================================
     4. NAVEGACIÓN ENTRE VISTAS
  ================================================================ */
  function goto(viewName) {
    Object.entries(els.views).forEach(([name, el]) => {
      el.classList.toggle('is-active', name === viewName);
    });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function setupNavigation() {
    document.querySelectorAll('[data-goto]').forEach((btn) => {
      btn.addEventListener('click', () => goto(btn.getAttribute('data-goto')));
    });
    els.btnVerMenu.addEventListener('click', () => goto('menu'));
  }

  /* ================================================================
     5. RENDERIZADO DEL MENÚ Y DETALLE
  ================================================================ */

  // Placeholder elegante reutilizado en tarjetas, detalle, galería y AR
  // cuando una fotografía todavía no existe en /assets/images/.
  window.__elTequilaPlaceholder = function (path) {
    const wrap = document.createElement('div');
    wrap.className = 'dish-placeholder';
    wrap.innerHTML = `
      <span class="ph-icon">🌮</span>
      <span>Agrega las fotografías del platillo en<br><strong>/assets/images/</strong></span>
    `;
    return wrap;
  };

  function productMediaMarkup(product) {
    const cover = product.images && product.images[0];
    if (!cover) return window.__elTequilaPlaceholder('/assets/images/').outerHTML;
    return `
      <img
        src="${cover}"
        alt="${product.name}"
        loading="lazy"
        onerror="this.replaceWith(window.__elTequilaPlaceholder('/assets/images/'))"
      />
    `;
  }

  function renderMenu() {
    els.menuGrid.innerHTML = products.map((product) => `
      <article class="dish-card" data-product-id="${product.id}">
        <div class="dish-card-media">
          ${productMediaMarkup(product)}
        </div>
        <div class="dish-card-body">
          <span class="dish-category">${product.category}</span>
          <h3 class="dish-name">${product.name}</h3>
          <p class="dish-desc">${product.description}</p>
          <div class="dish-footer">
            <span class="dish-price">${product.price}</span>
            <button class="dish-view-btn" data-open-dish="${product.id}">Ver platillo</button>
          </div>
        </div>
      </article>
    `).join('');

    els.menuGrid.querySelectorAll('[data-open-dish]').forEach((btn) => {
      btn.addEventListener('click', () => openDish(btn.getAttribute('data-open-dish')));
    });
  }

  function openDish(productId) {
    const product = findProduct(productId);
    if (!product) return;

    state.currentDishId = productId;
    const viewsCount = (product.images || []).length;

    els.dishDetail.innerHTML = `
      <button class="btn-back dd-back" data-goto="menu" aria-label="Volver al menú">←</button>
      <div class="dd-media">
        ${productMediaMarkup(product)}
      </div>
      <p class="dd-views-badge">${viewsCount} vistas disponibles</p>
      <span class="dd-category">${product.category}</span>
      <h2 class="dd-name">${product.name}</h2>
      <p class="dd-desc">${product.description}</p>
      <div class="dd-price">${product.price}</div>
      <div class="dd-actions">
        <button class="btn btn-secondary" id="btnVerFotos">Ver fotografías</button>
        <button class="btn btn-primary" id="btnVerAR">Ver en AR</button>
      </div>
    `;

    els.dishDetail.querySelector('[data-goto="menu"]').addEventListener('click', () => goto('menu'));
    els.dishDetail.querySelector('#btnVerFotos').addEventListener('click', () => openGallery(productId));
    els.dishDetail.querySelector('#btnVerAR').addEventListener('click', () => startAR(productId));

    goto('dish');
  }

  /* ================================================================
     6. GALERÍA NORMAL (previa a AR)

     Visor de pantalla completa con las 3 fotografías del producto.
     Soporta deslizar con el dedo (setupSwipe, genérico y reutilizable),
     botones "‹ / ›" y puntos indicadores.
  ================================================================ */
  function openGallery(productId) {
    const product = findProduct(productId);
    if (!product) return;

    state.galleryDishId = productId;
    state.galleryPhotoIndex = 0;

    const images = product.images && product.images.length ? product.images : [];

    els.galleryProductName.textContent = product.name;
    els.galleryTrack.innerHTML = images.length
      ? images.map((src) => `
          <div class="gallery-slide">
            <img src="${src}" alt="${product.name}" draggable="false"
                 onerror="this.replaceWith(window.__elTequilaPlaceholder('/assets/images/'))" />
          </div>
        `).join('')
      : `<div class="gallery-slide">${window.__elTequilaPlaceholder('/assets/images/').outerHTML}</div>`;

    renderGalleryDots(images.length || 1);
    updateGalleryPosition(false);

    els.galleryOverlay.classList.add('is-active');
    els.galleryOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeGallery() {
    els.galleryOverlay.classList.remove('is-active');
    els.galleryOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function renderGalleryDots(count) {
    els.galleryDots.innerHTML = Array.from({ length: count }, (_, i) =>
      `<span class="dot ${i === 0 ? 'is-active' : ''}"></span>`
    ).join('');
  }

  function updateGalleryPosition(animate) {
    els.galleryTrack.style.transition = animate ? '' : 'none';
    els.galleryTrack.style.transform = `translateX(-${state.galleryPhotoIndex * 100}%)`;
    els.galleryDots.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === state.galleryPhotoIndex);
    });
    if (!animate) {
      // Forzar reflow para que la próxima transición sí anime.
      void els.galleryTrack.offsetHeight;
      els.galleryTrack.style.transition = '';
    }
  }

  function galleryImageCount() {
    const product = findProduct(state.galleryDishId);
    return product && product.images ? product.images.length : 1;
  }

  function galleryNextImage() {
    const total = galleryImageCount();
    state.galleryPhotoIndex = (state.galleryPhotoIndex + 1) % total;
    updateGalleryPosition(true);
  }

  function galleryPreviousImage() {
    const total = galleryImageCount();
    state.galleryPhotoIndex = (state.galleryPhotoIndex - 1 + total) % total;
    updateGalleryPosition(true);
  }

  function setupGallery() {
    els.btnCloseGallery.addEventListener('click', closeGallery);
    els.btnGalleryNext.addEventListener('click', galleryNextImage);
    els.btnGalleryPrev.addEventListener('click', galleryPreviousImage);

    // Deslizar con el dedo (o arrastrar con el mouse) sobre el track,
    // reutilizando el helper genérico setupSwipe().
    setupSwipe(els.galleryTrack, {
      onSwipeLeft: galleryNextImage,
      onSwipeRight: galleryPreviousImage
    });
  }

  /**
   * Helper GENÉRICO de deslizamiento (swipe) — no depende de AR ni de
   * la galería en particular, por eso puede reutilizarse en cualquier
   * carrusel futuro. Usa Pointer Events (touch, mouse y stylus).
   */
  function setupSwipe(target, { onSwipeLeft, onSwipeRight, threshold = 40 }) {
    let startX = null;
    let startY = null;
    let dragging = false;

    target.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      dragging = true;
    });

    target.addEventListener('pointerup', (e) => {
      if (!dragging || startX === null) return;
      dragging = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) onSwipeLeft(); else onSwipeRight();
      }
      startX = null;
      startY = null;
    });

    target.addEventListener('pointercancel', () => { dragging = false; startX = null; });
  }

  /**
   * nextImage() / previousImage(): funciones "públicas" genéricas que
   * el resto del código (o una tecla de teclado, un botón externo,
   * etc.) puede llamar sin preocuparse de si el contexto activo es la
   * galería normal o la experiencia AR — despachan al contexto que
   * esté abierto en ese momento.
   */
  function nextImage() {
    if (els.arOverlay.classList.contains('is-active')) {
      arNextImage();
    } else if (els.galleryOverlay.classList.contains('is-active')) {
      galleryNextImage();
    }
  }

  function previousImage() {
    if (els.arOverlay.classList.contains('is-active')) {
      arPreviousImage();
    } else if (els.galleryOverlay.classList.contains('is-active')) {
      galleryPreviousImage();
    }
  }

  /* ================================================================
     7. EXPERIENCIA AR — CÁMARA
  ================================================================ */
  async function startAR(productId) {
    state.arDishId = productId;
    state.arPhotoIndex = 0;
    resetDishTransform(false);
    hintsDismissed = false;

    els.arOverlay.classList.add('is-active');
    els.arOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    hideArError();
    els.arDish.classList.remove('is-ready');
    els.arDesktopDemo.classList.remove('is-active');
    closeDishTray();

    renderArProduct();
    renderDishTray();

    await requestCamera();
  }

  async function requestCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (isLikelyMobile()) {
        showCameraError({
          icon: '📷',
          title: 'Tu navegador no permite utilizar la cámara para esta experiencia.',
          message: 'Prueba con Chrome o Safari actualizados.'
        });
      } else {
        enableDesktopDemoMode();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });

      state.cameraStream = stream;
      els.arVideo.srcObject = stream;

      els.arVideo.onloadedmetadata = () => {
        els.arVideo.play().catch(() => { /* algunos navegadores requieren un gesto extra */ });
        revealDish();
      };
    } catch (err) {
      handleCameraException(err);
    }
  }

  function handleCameraException(err) {
    const name = err && err.name ? err.name : '';

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      showCameraError({
        icon: '🚫',
        title: 'Permiso de cámara denegado',
        message: 'Necesitamos acceso a la cámara para mostrar el platillo.'
      });
      return;
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      if (!isLikelyMobile()) {
        enableDesktopDemoMode();
        return;
      }
      showCameraError({
        icon: '📷',
        title: 'No encontramos una cámara',
        message: 'No detectamos ninguna cámara disponible en este dispositivo.'
      });
      return;
    }

    if (location.protocol === 'file:') {
      showCameraError({
        icon: '⚠️',
        title: 'Esta demo necesita un servidor local',
        message: 'La cámara normalmente requiere HTTPS o localhost. Abrir index.html directamente (file://) no la habilita. Ejecuta un servidor local (ver README.md) y abre el sitio en http://localhost.'
      });
      return;
    }

    if (location.protocol === 'http:' && !isLocalhost(location.hostname)) {
      showCameraError({
        icon: '🔒',
        title: 'Se requiere una conexión segura',
        message: 'Los navegadores solo permiten el acceso a la cámara mediante HTTPS o en localhost. Consulta el README.md para más detalles.'
      });
      return;
    }

    showCameraError({
      icon: '📷',
      title: 'No pudimos acceder a tu cámara',
      message: 'Ocurrió un problema al intentar abrir la cámara. Puedes intentarlo nuevamente.'
    });
  }

  function isLocalhost(hostname) {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  }

  function isLikelyMobile() {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function enableDesktopDemoMode() {
    // Modo demostración de escritorio: sin cámara real, pero el
    // usuario puede seguir cambiando de fotografía, moviendo,
    // escalando y rotando el platillo sobre un fondo simulado.
    els.arDesktopDemo.classList.add('is-active');
    els.arVideo.style.background = 'linear-gradient(135deg, #241b12, #15100b)';
    revealDish();
  }

  function revealDish() {
    els.arDish.classList.add('is-ready');
    applyArTransform();
    showGestureHints();
  }

  function stopAR() {
    // 1) Detener todos los tracks del video y apagar la cámara.
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((track) => track.stop());
      state.cameraStream = null;
    }
    // 2) Limpiar el elemento <video>.
    els.arVideo.srcObject = null;
    els.arVideo.style.background = '';

    // 3) Quitar la capa AR.
    els.arOverlay.classList.remove('is-active');
    els.arOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    closeDishTray();
    hideCapturePreview();
    hideArError();
    els.arDesktopDemo.classList.remove('is-active');
    resetDishTransform(false);

    // 4) Regresar a la página del platillo.
    if (state.currentDishId) {
      goto('dish');
    }
  }

  /* ================================================================
     8. EXPERIENCIA AR — GESTOS MULTITÁCTILES
        (mover · zoom · rotación · doble toque · reset)

     El platillo se controla directamente con los dedos, como un
     objeto físico sobre la mesa:

       UN DEDO
         - Arrastre lento/controlado → MUEVE el platillo (sigue al
           dedo en tiempo real, relativo a la posición inicial del
           dedo, para que la imagen nunca "salte").
         - Deslizamiento (swipe) rápido y horizontal → CAMBIA de
           fotografía (mismo comportamiento que ya existía) y el
           platillo regresa suavemente a su posición original.
         - Toque corto y sin movimiento, dos veces seguidas
           (doble toque) → RESTABLECE escala y rotación (ver
           resetDishTransform), con una pequeña animación.

       DOS DEDOS (pinch)
         - Separar los dedos → aumenta el tamaño (zoom in).
         - Juntar los dedos → disminuye el tamaño (zoom out),
           limitado entre MIN_SCALE y MAX_SCALE.
         - Girar los dedos → rota el platillo; el ángulo se calcula
           con el ángulo entre los dos puntos táctiles
           (calculateAngle), no con botones.
         - Zoom, rotación y el leve desplazamiento del punto medio
           entre los dedos se aplican EN LA MISMA actualización, para
           que puedan combinarse libremente sin que un gesto
           interrumpa a otro.

       ESCRITORIO (sin touch)
         - Clic + arrastrar → mueve (mismo código que "un dedo",
           gracias a que todo está construido sobre Pointer Events,
           que unifican touch/mouse/stylus).
         - Rueda del mouse → zoom.
         - Shift + arrastrar horizontal → rota.

     RENDIMIENTO: todas las actualizaciones continuas (mover/zoom/
     rotar mientras el dedo se mueve) se acumulan en `arTransform` y
     se pintan una sola vez por frame con requestAnimationFrame
     (scheduleTransformRender), para evitar parpadeos o pérdida de
     FPS por escribir el estilo en cada evento pointermove.
  ================================================================ */

  // Estado de "instrucciones visibles" — se ocultan solas a los pocos
  // segundos o en cuanto el usuario hace su primer gesto real.
  let hintsDismissed = false;

  function showGestureHints() {
    hintsDismissed = false;
    els.arGestureHints.classList.remove('is-hidden');
    clearTimeout(showGestureHints._t);
    showGestureHints._t = setTimeout(dismissGestureHints, 4500);
  }

  function dismissGestureHints() {
    if (hintsDismissed) return;
    hintsDismissed = true;
    els.arGestureHints.classList.add('is-hidden');
  }

  // Agrupa todas las escrituras de estilo continuas en un único
  // requestAnimationFrame por cuadro, para gestos fluidos sin jank.
  let rafPending = false;
  function scheduleTransformRender() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      applyArTransform(false);
    });
  }

  function setupTouchControls() {
    const target = els.arDish;
    const pointers = new Map();

    let gestureType = null;   // 'pan' | 'pinch' | 'mouse-rotate'
    let panStart = null;      // { x, y, tx, ty, time }
    let pinchStart = null;    // { dist, angle, scale, rotation, midX, midY, tx, ty }

    const SWIPE_MIN_DISTANCE = 55;   // px
    const SWIPE_MAX_DURATION = 550;  // ms
    const SWIPE_MIN_VELOCITY = 0.35; // px/ms

    const TAP_MAX_MOVE = 10;      // px — por debajo de esto, se considera un "toque", no un arrastre
    const TAP_MAX_DURATION = 250; // ms
    const DOUBLE_TAP_WINDOW = 320; // ms entre dos toques para contar como doble toque
    const DOUBLE_TAP_MAX_DIST = 40; // px de tolerancia entre el 1er y 2do toque

    const MOUSE_ROTATE_SENSITIVITY = 0.45; // grados por pixel arrastrado (Shift + mouse)

    let lastTapTime = 0;
    let lastTapPos = null;

    // Evita que el navegador haga scroll o su propio pinch-to-zoom
    // sobre el platillo (además de `touch-action: none` en CSS).
    target.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    target.addEventListener('pointerdown', handlePointerDown);
    target.addEventListener('pointermove', handlePointerMove);
    target.addEventListener('pointerup', handlePointerUp);
    target.addEventListener('pointercancel', handlePointerUp);
    target.addEventListener('pointerleave', (e) => { if (e.buttons === 0) handlePointerUp(e); });

    function handlePointerDown(e) {
      target.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        // Atajo de escritorio: Shift + clic-arrastrar = rotar.
        if (e.pointerType === 'mouse' && e.shiftKey) {
          gestureType = 'mouse-rotate';
          panStart = { x: e.clientX, y: e.clientY, startRotation: arTransform.rotation, time: Date.now() };
          return;
        }
        gestureType = 'pan';
        panStart = { x: e.clientX, y: e.clientY, tx: arTransform.x, ty: arTransform.y, time: Date.now() };
      }

      if (pointers.size === 2) {
        gestureType = 'pinch';
        const pts = Array.from(pointers.values());
        pinchStart = {
          dist: calculateDistance(pts[0], pts[1]),
          angle: calculateAngle(pts[0], pts[1]),
          scale: arTransform.scale,
          rotation: arTransform.rotation,
          midX: (pts[0].x + pts[1].x) / 2,
          midY: (pts[0].y + pts[1].y) / 2,
          tx: arTransform.x,
          ty: arTransform.y
        };
      }
    }

    function handlePointerMove(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Un dedo (o mouse): seguir el arrastre en tiempo real. El
      // desplazamiento es siempre RELATIVO a la posición inicial del
      // dedo (panStart), nunca absoluto, para que la imagen no salte.
      if (gestureType === 'pan' && pointers.size === 1 && panStart) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dismissGestureHints();
        moveDish(panStart.tx + dx, panStart.ty + dy);
      }

      // Shift + mouse: rotar en vez de mover.
      if (gestureType === 'mouse-rotate' && panStart) {
        const dx = e.clientX - panStart.x;
        dismissGestureHints();
        arTransform.rotation = panStart.startRotation + dx * MOUSE_ROTATE_SENSITIVITY;
        scheduleTransformRender();
      }

      // Dos dedos: zoom + rotación + seguimiento del punto medio, TODO
      // en la misma actualización, para poder combinarse libremente.
      if (gestureType === 'pinch' && pointers.size === 2) {
        dismissGestureHints();
        const pts = Array.from(pointers.values());
        const newDist = calculateDistance(pts[0], pts[1]);
        const newAngle = calculateAngle(pts[0], pts[1]);
        const newMidX = (pts[0].x + pts[1].x) / 2;
        const newMidY = (pts[0].y + pts[1].y) / 2;

        const scaleFactor = newDist / (pinchStart.dist || 1);
        arTransform.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStart.scale * scaleFactor));
        arTransform.rotation = pinchStart.rotation + (newAngle - pinchStart.angle);

        // La escala se mantiene aproximadamente centrada en el punto
        // medio entre los dos dedos: el platillo "sigue" ese punto
        // medio a medida que se desplaza, en vez de quedarse anclado
        // a su propio centro (con el mismo límite de posición que el
        // arrastre de un dedo, para que nunca se salga de pantalla).
        const clamped = clampPosition(
          pinchStart.tx + (newMidX - pinchStart.midX),
          pinchStart.ty + (newMidY - pinchStart.midY)
        );
        arTransform.x = clamped.x;
        arTransform.y = clamped.y;

        scheduleTransformRender();
      }
    }

    function handlePointerUp(e) {
      const wasPan = gestureType === 'pan';
      const wasMouseRotate = gestureType === 'mouse-rotate';
      pointers.delete(e.pointerId);

      if (wasMouseRotate) {
        gestureType = null;
        panStart = null;
      }

      if (wasPan && pointers.size === 0 && panStart) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        const elapsed = Math.max(1, Date.now() - panStart.time);
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        const wasTap = absDx < TAP_MAX_MOVE && absDy < TAP_MAX_MOVE && elapsed < TAP_MAX_DURATION;

        if (wasTap) {
          const now = Date.now();
          const isDoubleTap =
            lastTapPos &&
            (now - lastTapTime) < DOUBLE_TAP_WINDOW &&
            calculateDistance(lastTapPos, { x: e.clientX, y: e.clientY }) < DOUBLE_TAP_MAX_DIST;

          if (isDoubleTap) {
            resetDishTransform(true);
            dismissGestureHints();
            lastTapTime = 0;
            lastTapPos = null;
          } else {
            lastTapTime = now;
            lastTapPos = { x: e.clientX, y: e.clientY };
          }
        } else {
          const velocity = absDx / elapsed;
          const isSwipe =
            absDx > SWIPE_MIN_DISTANCE &&
            absDx > absDy * 1.3 &&
            elapsed < SWIPE_MAX_DURATION &&
            velocity > SWIPE_MIN_VELOCITY;

          if (isSwipe) {
            // Fue un swipe rápido y horizontal: cambiar de fotografía
            // y devolver el platillo a su posición original.
            if (dx < 0) arNextImage(); else arPreviousImage();
            moveDish(panStart.tx, panStart.ty, true);
          }
          // Si no fue swipe, el platillo se queda donde el usuario lo
          // arrastró (gesto de "mover" confirmado).
        }
      }

      if (pointers.size === 0) {
        gestureType = null;
        panStart = null;
        pinchStart = null;
      }
      if (pointers.size === 1) {
        // Si queda un dedo tras soltar el segundo (fin de un pinch),
        // reiniciamos el seguimiento de arrastre con ese dedo, sin
        // saltos, partiendo de la transformación actual.
        const [remaining] = Array.from(pointers.entries());
        gestureType = 'pan';
        panStart = { x: remaining[1].x, y: remaining[1].y, tx: arTransform.x, ty: arTransform.y, time: Date.now() };
      }
    }

    // Rueda del mouse en desktop = zoom (alternativa sin touch).
    target.addEventListener('wheel', (e) => {
      e.preventDefault();
      dismissGestureHints();
      const delta = e.deltaY > 0 ? -0.12 : 0.12;
      arTransform.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, arTransform.scale + delta));
      scheduleTransformRender();
    }, { passive: false });
  }

  /** Distancia en píxeles entre dos puntos táctiles — usada para pinch/zoom. */
  function calculateDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  /** Ángulo (en grados) entre dos puntos táctiles — usado para la rotación. */
  function calculateAngle(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  }

  /**
   * Limita el desplazamiento del platillo para que, sin importar
   * cuánto arrastre el usuario, una parte siempre quede visible en
   * pantalla (nunca debe poder "perderse" fuera del encuadre).
   */
  function clampPosition(x, y) {
    const maxX = window.innerWidth * 0.42;
    const maxY = window.innerHeight * 0.38;
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y))
    };
  }

  function moveDish(x, y, animate = false) {
    const clamped = clampPosition(x, y);
    arTransform.x = clamped.x;
    arTransform.y = clamped.y;
    if (animate) { applyArTransform(true); } else { scheduleTransformRender(); }
  }

  function scaleDish(scale) {
    arTransform.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    scheduleTransformRender();
  }

  function rotateDish(deltaDeg) {
    arTransform.rotation = (arTransform.rotation + deltaDeg) % 360;
    scheduleTransformRender();
  }

  function applyArTransform(animate) {
    // INTEGRACIÓN 3D: aquí es donde, en una versión futura con
    // Three.js/WebXR, se aplicarían estas mismas x/y/scale/rotation
    // a la posición y orientación de un modelo .glb en la escena.
    els.arDish.style.transition = animate ? 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1)' : '';
    els.arDish.style.transform =
      `translate(-50%, -50%) translate(${arTransform.x}px, ${arTransform.y}px) ` +
      `scale(${arTransform.scale}) rotate(${arTransform.rotation}deg)`;
    if (animate) {
      clearTimeout(applyArTransform._t);
      applyArTransform._t = setTimeout(() => { els.arDish.style.transition = ''; }, 320);
    }
  }

  /**
   * Restablece posición, escala y rotación del platillo a sus valores
   * iniciales, con una animación suave — usada tanto por el botón
   * "Reset" como por el doble toque sobre el platillo.
   */
  function resetDishTransform(animate) {
    arTransform.x = 0;
    arTransform.y = 0;
    arTransform.scale = 1;
    arTransform.rotation = 0;
    applyArTransform(animate);

    // Pequeño "pulso" visual para que el usuario note que se restableció.
    els.arDish.classList.remove('is-resetting');
    void els.arDish.offsetWidth; // fuerza reflow para poder repetir la animación
    els.arDish.classList.add('is-resetting');
  }

  function setupArControls() {
    els.btnCloseAR.addEventListener('click', stopAR);
    els.btnCancelAR.addEventListener('click', stopAR);

    els.btnResetDish.addEventListener('click', () => resetDishTransform(true));

    els.btnSwitchDish.addEventListener('click', toggleDishTray);
    els.btnCapture.addEventListener('click', captureAR);
    els.btnShare.addEventListener('click', shareAR);

    els.btnRetryCamera.addEventListener('click', () => {
      hideArError();
      if (state.lastErrorContext === 'model') {
        retryArModel();
      } else {
        requestCamera();
      }
    });

    els.btnCaptureClose.addEventListener('click', hideCapturePreview);
  }

  /* ================================================================
     9. EXPERIENCIA AR — CAMBIAR PLATILLO
  ================================================================ */
  function renderArProduct() {
    const product = findProduct(state.arDishId);
    if (!product) return;

    els.arProductName.textContent = product.name;
    renderArModel();
  }

  /**
   * ÚNICA MODIFICACIÓN DE ESTA TAREA.
   *
   * Antes, aquí se llamaba a renderArPhoto() para poner la fotografía
   * 2D del platillo sobre la cámara. Ahora, en su lugar, se muestra el
   * modelo 3D (`assets/dishes/3D.glb`) dentro de <model-viewer>, que
   * ya trae de fábrica: rotación 360° continua con un dedo, zoom con
   * pellizco, movimiento con dos dedos, encuadre/escala inicial
   * automática (sin deformar el modelo) y sombra de contacto.
   *
   * renderArPhoto()/arNextImage()/arPreviousImage() (arriba) se dejan
   * intactos y sin usar dentro de AR, tal como se pidió.
   */
  function renderArModel() {
    // Oculta la foto 2D (queda fuera del hit-testing táctil, así sus
    // gestos no compiten con los del modelo 3D — ver CSS .is-3d-mode).
    els.arDish.classList.add('is-3d-mode');

    // Cada platillo trae su propio modelo 3D (product.model). Si ya
    // está cargado ese mismo modelo en esta sesión no hace falta
    // pedirlo de nuevo (evita parpadeos innecesarios), pero si el
    // platillo cambió, se debe pedir el modelo correspondiente al
    // nuevo platillo.
    const product = findProduct(state.arDishId);
    if (!product || !product.model) return;

    const modelPath = product.model;

    if (els.arDishModel.getAttribute('src') !== modelPath) {
      els.arDishModel.classList.remove('is-ready');
      els.arDishModel.setAttribute('src', modelPath);
    }
  }

  /**
   * Listeners del modelo 3D — se conectan una sola vez (ver
   * initializeApp). 'load' revela el modelo con su fundido de entrada;
   * 'error' cubre el caso de que assets/dishes/3D.glb todavía no
   * exista, mostrando el mismo aviso de error ya usado para la cámara,
   * sin romper el resto de la aplicación.
   */
  function setupArModelViewer() {
    els.arDishModel.addEventListener('load', () => {
      state.lastErrorContext = null;
      els.arDishModel.classList.add('is-ready');
    });

    els.arDishModel.addEventListener('error', () => {
      showCameraError({
        icon: '🍽️',
        title: 'No encontramos el modelo 3D',
        message: 'Agrega el modelo 3D en assets/dishes/3D.glb',
        context: 'model'
      });
    });
  }

  /**
   * Fuerza un nuevo intento de carga del modelo 3D tras un error (el
   * botón "Intentar nuevamente" de la pantalla de error). Es necesario
   * quitar y volver a poner el atributo `src`, porque si ya vale
   * "assets/dishes/3D.glb" (aunque haya fallado), <model-viewer> no
   * vuelve a intentar cargarlo solo por pedírselo de nuevo.
   */
  function retryArModel() {
    const product = findProduct(state.arDishId);
    if (!product || !product.model) return;

    els.arDishModel.classList.remove('is-ready');
    els.arDishModel.removeAttribute('src');
    els.arDishModel.setAttribute('src', product.model);
  }

  function arImages() {
    const product = findProduct(state.arDishId);
    return product && product.images ? product.images : [];
  }

  function renderArPhoto() {
    const images = arImages();
    if (!images.length) return;

    const src = images[state.arPhotoIndex];
    els.arDishImg.alt = els.arProductName.textContent;
    els.arDishImg.onerror = () => {
      els.arDishImg.onerror = null;
      els.arDishImg.src =
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="255">
             <rect width="100%" height="100%" rx="18" fill="#2b2115"/>
             <text x="50%" y="44%" fill="#c9a227" font-family="monospace" font-size="12" text-anchor="middle">Agrega las fotografías en</text>
             <text x="50%" y="58%" fill="#f3ead9" font-family="monospace" font-size="11" text-anchor="middle">/assets/images/</text>
           </svg>`
        );
    };
    els.arDishImg.src = src;

    els.arPhotoDots.innerHTML = images.length > 1
      ? images.map((_, i) => `<span class="dot ${i === state.arPhotoIndex ? 'is-active' : ''}"></span>`).join('')
      : '';
  }

  function arNextImage() {
    const images = arImages();
    if (images.length <= 1) return;
    state.arPhotoIndex = (state.arPhotoIndex + 1) % images.length;
    renderArPhoto();
  }

  function arPreviousImage() {
    const images = arImages();
    if (images.length <= 1) return;
    state.arPhotoIndex = (state.arPhotoIndex - 1 + images.length) % images.length;
    renderArPhoto();
  }

  function switchDish(productId) {
    state.arDishId = productId;
    state.arPhotoIndex = 0;
    resetDishTransform(false);
    renderArProduct();
    renderDishTray();
    closeDishTray();
  }

  function renderDishTray() {
    els.dishTrayInner.innerHTML = products.map((product) => {
      const cover = product.images && product.images[0];
      return `
        <button class="tray-item ${product.id === state.arDishId ? 'is-selected' : ''}" data-tray-dish="${product.id}">
          <span class="tray-thumb">
            ${cover ? `<img src="${cover}" alt="" onerror="this.parentElement.textContent='sin foto'" />` : 'sin foto'}
          </span>
          <span class="tray-label">${product.name}</span>
        </button>
      `;
    }).join('');

    els.dishTrayInner.querySelectorAll('[data-tray-dish]').forEach((btn) => {
      btn.addEventListener('click', () => switchDish(btn.getAttribute('data-tray-dish')));
    });
  }

  function toggleDishTray() {
    const isOpen = els.dishTray.classList.toggle('is-open');
    els.dishTray.setAttribute('aria-hidden', String(!isOpen));
  }

  function closeDishTray() {
    els.dishTray.classList.remove('is-open');
    els.dishTray.setAttribute('aria-hidden', 'true');
  }

  /* ================================================================
     10. EXPERIENCIA AR — CAPTURAR Y COMPARTIR
  ================================================================ */
  function captureAR() {
    try {
      const video = els.arVideo;
      const canvas = els.arCanvas;
      const vw = video.videoWidth || window.innerWidth;
      const vh = video.videoHeight || window.innerHeight;

      canvas.width = vw;
      canvas.height = vh;
      const ctx = canvas.getContext('2d');

      // Fondo: el frame actual de la cámara (o un color sólido en
      // modo demo de escritorio, donde no hay video real).
      if (video.srcObject) {
        ctx.drawImage(video, 0, 0, vw, vh);
      } else {
        ctx.fillStyle = '#1a140d';
        ctx.fillRect(0, 0, vw, vh);
      }

      // Posición del platillo en coordenadas del canvas, a partir de
      // su posición/tamaño real en pantalla (incluye escala y rotación).
      const surfaceRect = els.arSurface.getBoundingClientRect();
      const imgRect = els.arDishImg.getBoundingClientRect();

      const scaleX = vw / surfaceRect.width;
      const scaleY = vh / surfaceRect.height;

      const cx = (imgRect.left + imgRect.width / 2 - surfaceRect.left) * scaleX;
      const cy = (imgRect.top + imgRect.height / 2 - surfaceRect.top) * scaleY;
      const drawW = imgRect.width * scaleX;
      const drawH = imgRect.height * scaleY;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((arTransform.rotation * Math.PI) / 180);

      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 30 * scaleX;
      ctx.shadowOffsetY = 18 * scaleY;

      roundRectPath(ctx, -drawW / 2, -drawH / 2, drawW, drawH, 18 * scaleX);
      ctx.clip();
      ctx.drawImage(els.arDishImg, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/png');
      showCapturePreview(dataUrl);
    } catch (err) {
      // Algunos navegadores bloquean la lectura del canvas por
      // restricciones de seguridad (por ejemplo, video "tainted").
      showCameraError({
        icon: '⚠️',
        title: 'No se pudo generar la captura',
        message: 'Tu navegador está restringiendo la captura de la cámara en este contexto. Esta función puede depender del navegador y del protocolo (HTTPS/localhost).'
      });
    }
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function showCapturePreview(dataUrl) {
    els.captureImg.src = dataUrl;
    els.btnCaptureDownload.href = dataUrl;
    els.capturePreview.classList.add('is-active');
    els.capturePreview.setAttribute('aria-hidden', 'false');
  }

  function hideCapturePreview() {
    els.capturePreview.classList.remove('is-active');
    els.capturePreview.setAttribute('aria-hidden', 'true');
  }

  async function shareAR() {
    let dataUrl = els.captureImg.src;

    // Si aún no se ha capturado nada en esta sesión de AR, generamos
    // la composición primero.
    if (!dataUrl) {
      captureAR();
      dataUrl = els.captureImg.src;
    }
    if (!dataUrl) return;

    if (navigator.share) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], 'takitos-ar.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${BUSINESS.name} — Menú en AR`,
            text: `¡Mira este platillo de ${BUSINESS.name} en realidad aumentada!`
          });
          return;
        }

        await navigator.share({
          title: `${BUSINESS.name} — Menú en AR`,
          text: `¡Mira este platillo de ${BUSINESS.name} en realidad aumentada!`
        });
        return;
      } catch (err) {
        // El usuario canceló el share o el navegador lo rechazó; no
        // es un error crítico.
        return;
      }
    }

    // navigator.share() no disponible (por ejemplo, en muchos
    // navegadores de escritorio): mostramos la vista previa con el
    // botón de descarga como alternativa, sin generar errores.
    showCapturePreview(dataUrl);
  }

  /* ================================================================
     11. MANEJO DE ERRORES DE CÁMARA
  ================================================================ */
  function showCameraError({ icon, title, message, context = 'camera' }) {
    state.lastErrorContext = context;
    els.arErrorIcon.textContent = icon || '📷';
    els.arErrorTitle.textContent = title || 'No pudimos acceder a tu cámara';
    els.arErrorMessage.textContent = message || 'Intenta nuevamente en unos segundos.';
    els.arErrorScreen.classList.add('is-active');
    els.arErrorScreen.setAttribute('aria-hidden', 'false');
  }

  function hideArError() {
    els.arErrorScreen.classList.remove('is-active');
    els.arErrorScreen.setAttribute('aria-hidden', 'true');
  }

  /* ================================================================
     12. INICIALIZACIÓN
  ================================================================ */
  function initializeApp() {
    cacheDom();
    applyBranding();
    setupNavigation();
    renderMenu();
    setupGallery();
    setupTouchControls();
    setupArControls();
    setupArModelViewer();

    // Cerrar la bandeja de platillos si se toca fuera de ella.
    els.arSurface.addEventListener('pointerdown', (e) => {
      if (els.dishTray.classList.contains('is-open') && !els.dishTray.contains(e.target)) {
        closeDishTray();
      }
    });

    // Seguridad extra: si el usuario cierra o recarga la pestaña con
    // la cámara activa, detener los tracks para no dejarla encendida.
    window.addEventListener('beforeunload', () => {
      if (state.cameraStream) {
        state.cameraStream.getTracks().forEach((track) => track.stop());
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initializeApp);
})();
