/* ==================================================================
   EL TEQUILA — AR MENU DEMO
   app.js

   Toda la lógica de la demo vive en este archivo, organizada en
   secciones claras:

     1. DATOS DE PLATILLOS
     2. ESTADO GLOBAL
     3. NAVEGACIÓN ENTRE VISTAS
     4. RENDERIZADO DEL MENÚ Y DETALLE
     5. EXPERIENCIA AR — cámara
     6. EXPERIENCIA AR — gestos e interacción
     7. EXPERIENCIA AR — cambiar platillo / cambiar foto / zoom / reset
     8. EXPERIENCIA AR — captura y compartir
     9. MANEJO DE ERRORES DE CÁMARA
     10. INICIALIZACIÓN

   NOTA SOBRE MODELOS 3D FUTUROS:
   Esta demo utiliza una fotografía 2D superpuesta sobre el video de
   la cámara para simular AR de forma convincente sin necesitar
   detección real de superficies. En una fase posterior, el elemento
   <img id="arDishImg"> podría sustituirse por un <canvas> con
   Three.js + WebXR renderizando un modelo .glb/.gltf en la misma
   posición/escala/rotación que hoy controla el objeto `arState`.
   Los puntos de integración están marcados con "INTEGRACIÓN 3D".
================================================================== */

(function () {
  'use strict';

  /* ================================================================
     1. DATOS DE PLATILLOS
     Edita este arreglo para cambiar nombres, descripciones, precios
     o fotografías.

     NOVEDAD: cada platillo ahora usa `images` (arreglo) en vez de
     `image` (una sola foto), para poder mostrar varios ángulos del
     mismo platillo en la galería y en el zoom. Puedes agregar tantas
     fotos como quieras por platillo, simplemente añadiendo más rutas
     al arreglo. La primera foto del arreglo es la que se usa como
     portada en la tarjeta del menú y como imagen por defecto en AR.
  ================================================================ */
  const dishes = [
    {
      id: 1,
      name: 'Enchiladas',
      description: 'Tortillas de maíz rellenas de pollo deshebrado, bañadas en salsa roja de chile guajillo y queso fresco.',
      price: '$12.99',
      category: 'Platillo fuerte',
      images: [
        'assets/dishes/dish-01-1.jpg',
        'assets/dishes/dish-01-2.jpg',
        'assets/dishes/dish-01-3.jpg'
      ]
    },
    {
      id: 2,
      name: 'Tacos',
      description: 'Trío de tacos al pastor con piña asada, cebolla, cilantro y salsa verde tatemada.',
      price: '$9.99',
      category: 'Especialidad',
      images: [
        'assets/dishes/dish-02-1.jpg',
        'assets/dishes/dish-02-2.jpg',
        'assets/dishes/dish-02-3.jpg'
      ]
    },
    {
      id: 3,
      name: 'Fajitas',
      description: 'Tiras de res marinadas a la parrilla con pimientos y cebolla, servidas sobre plancha caliente.',
      price: '$15.99',
      category: 'Platillo fuerte',
      images: [
        'assets/dishes/dish-03-1.jpg',
        'assets/dishes/dish-03-2.jpg',
        'assets/dishes/dish-03-3.jpg'
      ]
    },
    {
      id: 4,
      name: 'Carne Asada',
      description: 'Corte de res a la parrilla con guacamole, frijoles charros y tortillas hechas a mano.',
      price: '$18.99',
      category: 'Especialidad de la casa',
      images: [
        'assets/dishes/dish-04-1.jpg',
        'assets/dishes/dish-04-2.jpg',
        'assets/dishes/dish-04-3.jpg'
      ]
    },
    {
      id: 5,
      name: 'Enchiladas Suizas',
      description: 'Enchiladas de pollo bañadas en salsa verde con crema y gratinadas con queso derretido.',
      price: '$13.99',
      category: 'Platillo fuerte',
      images: [
        'assets/dishes/dish-05-1.jpg',
        'assets/dishes/dish-05-2.jpg',
        'assets/dishes/dish-05-3.jpg'
      ]
    },
    {
      id: 6,
      name: 'Quesadillas',
      description: 'Tortilla de maíz doblada con queso Oaxaca fundido, flor de calabaza y salsa de la casa.',
      price: '$8.99',
      category: 'Para compartir',
      images: [
        'assets/dishes/dish-06-1.jpg',
        'assets/dishes/dish-06-2.jpg',
        'assets/dishes/dish-06-3.jpg'
      ]
    }
  ];

  /* ================================================================
     2. ESTADO GLOBAL
  ================================================================ */
  const state = {
    currentDishId: null,     // platillo abierto en la vista de detalle
    arDishId: null,          // platillo activo dentro de AR
    arPhotoIndex: 0,         // índice de la fotografía (ángulo) activa dentro de AR
    cameraStream: null       // MediaStream activo de la cámara
  };

  // Estado de transformación del platillo dentro de AR.
  const arTransform = {
    x: 0,          // desplazamiento horizontal (px) respecto al centro
    y: 0,          // desplazamiento vertical (px) respecto al centro
    scale: 1,       // escala relativa
    rotation: 0     // grados
  };

  const MIN_SCALE = 0.4;
  const MAX_SCALE = 2.6;

  /* ================================================================
     Referencias al DOM
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

    els.arOverlay = document.getElementById('arOverlay');
    els.arVideo = document.getElementById('arVideo');
    els.arCanvas = document.getElementById('arCanvas');
    els.arSurface = document.getElementById('arSurface');
    els.arDish = document.getElementById('arDish');
    els.arDishImg = document.getElementById('arDishImg');
    els.arDishName = document.getElementById('arDishName');
    els.arDishHint = document.getElementById('arDishHint');

    els.arPhotoToolbar = document.getElementById('arPhotoToolbar');
    els.arPhotoPrev = document.getElementById('arPhotoPrev');
    els.arPhotoNext = document.getElementById('arPhotoNext');
    els.arPhotoCounter = document.getElementById('arPhotoCounter');
    els.arPhotoZoom = document.getElementById('arPhotoZoom');

    els.btnCloseAR = document.getElementById('btnCloseAR');
    els.btnScaleUp = document.getElementById('btnScaleUp');
    els.btnScaleDown = document.getElementById('btnScaleDown');
    els.btnRotateLeft = document.getElementById('btnRotateLeft');
    els.btnRotateRight = document.getElementById('btnRotateRight');
    els.btnReset = document.getElementById('btnReset');
    els.btnSwitchDish = document.getElementById('btnSwitchDish');
    els.btnCapture = document.getElementById('btnCapture');
    els.btnShare = document.getElementById('btnShare');

    els.arDishSwitcher = document.getElementById('arDishSwitcher');
    els.arDishSwitcherInner = document.getElementById('arDishSwitcherInner');

    els.arCapturePreview = document.getElementById('arCapturePreview');
    els.arCaptureImg = document.getElementById('arCaptureImg');
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

  /* ================================================================
     3. NAVEGACIÓN ENTRE VISTAS
  ================================================================ */
  function goto(viewName) {
    if (viewName === 'qr') {
      const qr = document.getElementById('qr');
      if (qr) qr.scrollIntoView({ behavior: 'smooth' });
      return;
    }
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
     4. RENDERIZADO DEL MENÚ Y DETALLE

     NOVEDAD: la fotografía única de cada platillo fue reemplazada por
     una GALERÍA (ver js/gallery.js) que soporta varias fotos por
     platillo, flechas "‹ / ›" para pasar de una foto a otra, puntos
     indicadores y un botón de zoom que abre un visor de pantalla
     completa. Aquí solo se reserva el contenedor (`data-card-gallery`
     / `data-detail-gallery`); `ElTequilaGallery.mountGallery()` es
     quien dibuja el contenido real dentro de ese contenedor.
  ================================================================ */

  // Expuesto en window: usado tanto aquí como en js/gallery.js para
  // mostrar un aviso elegante cuando una fotografía aún no existe,
  // sin romper la aplicación.
  window.__elTequilaPlaceholder = function (path) {
    const wrap = document.createElement('div');
    wrap.className = 'dish-placeholder';
    wrap.innerHTML = `
      <span class="ph-icon">🌮</span>
      <span>Agrega la fotografía en<br><strong>${path}</strong></span>
    `;
    return wrap;
  };

  function renderMenu() {
    els.menuGrid.innerHTML = dishes.map((dish) => `
      <article class="dish-card" data-dish-id="${dish.id}">
        <div class="dish-card-media" data-card-gallery="${dish.id}"></div>
        <div class="dish-card-body">
          <span class="dish-category">${dish.category}</span>
          <h3 class="dish-name">${dish.name}</h3>
          <p class="dish-desc">${dish.description}</p>
          <div class="dish-footer">
            <span class="dish-price">${dish.price}</span>
            <button class="dish-view-btn" data-open-dish="${dish.id}">Ver platillo</button>
          </div>
        </div>
      </article>
    `).join('');

    els.menuGrid.querySelectorAll('[data-open-dish]').forEach((btn) => {
      btn.addEventListener('click', () => openDish(Number(btn.getAttribute('data-open-dish'))));
    });

    // Montar la galería (con sus flechas, puntos y botón de zoom)
    // dentro de cada tarjeta del menú.
    els.menuGrid.querySelectorAll('[data-card-gallery]').forEach((container) => {
      const dish = dishes.find((d) => d.id === Number(container.getAttribute('data-card-gallery')));
      if (dish) window.ElTequilaGallery.mountGallery(container, dish, { size: 'card' });
    });
  }

  function openDish(dishId) {
    const dish = dishes.find((d) => d.id === dishId);
    if (!dish) return;

    state.currentDishId = dishId;

    els.dishDetail.innerHTML = `
      <button class="btn-back dd-back" data-goto="menu" aria-label="Volver al menú">←</button>
      <div class="dd-media" data-detail-gallery></div>
      <span class="dd-category">${dish.category}</span>
      <h2 class="dd-name">${dish.name}</h2>
      <p class="dd-desc">${dish.description}</p>
      <div class="dd-price">${dish.price}</div>
      <div class="dd-ar-block">
        <button class="btn btn-primary btn-ar" id="btnStartAR">VER EN AR</button>
        <p>Explora este platillo directamente desde la cámara de tu celular.</p>
      </div>
    `;

    els.dishDetail.querySelector('[data-goto="menu"]').addEventListener('click', () => goto('menu'));
    els.dishDetail.querySelector('#btnStartAR').addEventListener('click', () => startAR(dishId));

    // Galería grande del detalle: varias fotos, flechas, puntos y zoom.
    const galleryContainer = els.dishDetail.querySelector('[data-detail-gallery]');
    window.ElTequilaGallery.mountGallery(galleryContainer, dish, { size: 'detail' });

    goto('dish');
  }

  /* ================================================================
     5. EXPERIENCIA AR — CÁMARA
  ================================================================ */
  async function startAR(dishId) {
    state.arDishId = dishId;
    setArDish(dishId, { animate: false });
    renderDishSwitcher(dishId);

    els.arOverlay.classList.add('is-active');
    els.arOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    hideArError();
    els.arDish.classList.remove('is-ready');
    els.arDesktopDemo.classList.remove('is-active');

    await setupCamera();
  }

  async function setupCamera() {
    // Si el navegador no soporta la API de cámara, mostrar mensaje claro.
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Sin soporte de cámara: en desktop activamos el modo demo,
      // en móvil mostramos el error de compatibilidad.
      if (isLikelyMobile()) {
        showCameraError({
          icon: '📷',
          title: 'Tu navegador no soporta cámara',
          message: 'Este dispositivo o navegador no permite acceder a la cámara. Prueba con Chrome o Safari actualizados.'
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

      // En cuanto el video esté listo, mostramos el platillo con animación.
      els.arVideo.onloadedmetadata = () => {
        els.arVideo.play().catch(() => { /* algunos navegadores requieren gesto extra */ });
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
        message: 'Necesitamos acceso a tu cámara para mostrar el platillo en realidad aumentada.'
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
        message: 'Abrir index.html directamente (file://) no permite usar la cámara. Ejecuta un servidor local (ver README.md) y abre el sitio en http://localhost.'
      });
      return;
    }

    if (location.protocol === 'http:' && !isLocalhost(location.hostname)) {
      showCameraError({
        icon: '🔒',
        title: 'Se requiere una conexión segura',
        message: 'Los navegadores solo permiten el acceso a la cámara mediante HTTPS o en localhost. Consulta el README.md para habilitar HTTPS local.'
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
    // Modo demostración de escritorio: sin cámara real, el usuario
    // puede seguir moviendo/escalando/rotando el platillo sobre un
    // fondo simulado para ver el concepto de interacción.
    els.arDesktopDemo.classList.add('is-active');
    els.arVideo.style.background = 'linear-gradient(135deg, #241b12, #15100b)';
    revealDish();
  }

  function revealDish() {
    els.arDish.classList.add('is-ready');
    applyArTransform();
    // El hint desaparece después de unos segundos para no estorbar.
    els.arDishHint.style.opacity = '1';
    clearTimeout(revealDish._t);
    revealDish._t = setTimeout(() => {
      els.arDishHint.style.opacity = '0';
    }, 4000);
  }

  function stopAR() {
    // Detener completamente el stream de cámara y limpiar los tracks.
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach((track) => track.stop());
      state.cameraStream = null;
    }
    els.arVideo.srcObject = null;
    els.arVideo.style.background = '';

    els.arOverlay.classList.remove('is-active');
    els.arOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    closeDishSwitcher();
    hideCapturePreview();
    hideArError();
    els.arDesktopDemo.classList.remove('is-active');

    resetDish(false);

    // Regresar a la vista del platillo que se estaba viendo.
    if (state.currentDishId) {
      goto('dish');
    }
  }

  /* ================================================================
     6. EXPERIENCIA AR — GESTOS E INTERACCIÓN
  ================================================================ */
  function setupTouchControls() {
    const target = els.arDish;
    let pointers = new Map();
    let dragging = false;
    let dragStart = { x: 0, y: 0, tx: 0, ty: 0 };
    let pinchStart = { dist: 0, angle: 0, scale: 1, rotation: 0 };

    target.addEventListener('pointerdown', (e) => {
      target.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        dragging = true;
        dragStart = { x: e.clientX, y: e.clientY, tx: arTransform.x, ty: arTransform.y };
        target.style.cursor = 'grabbing';
      }

      if (pointers.size === 2) {
        dragging = false;
        const pts = Array.from(pointers.values());
        pinchStart.dist = distance(pts[0], pts[1]);
        pinchStart.angle = angleBetween(pts[0], pts[1]);
        pinchStart.scale = arTransform.scale;
        pinchStart.rotation = arTransform.rotation;
      }
    });

    target.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1 && dragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        moveDish(dragStart.tx + dx, dragStart.ty + dy);
      }

      if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        const newDist = distance(pts[0], pts[1]);
        const newAngle = angleBetween(pts[0], pts[1]);

        const scaleFactor = newDist / (pinchStart.dist || 1);
        scaleDish(pinchStart.scale * scaleFactor);

        const rotationDelta = newAngle - pinchStart.angle;
        rotateDish(pinchStart.rotation + rotationDelta);
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) {
        dragging = false;
        target.style.cursor = 'grab';
      }
      if (pointers.size === 1) {
        // Si queda un dedo tras soltar el segundo, reiniciamos el drag.
        const [remaining] = Array.from(pointers.entries());
        dragStart = { x: remaining[1].x, y: remaining[1].y, tx: arTransform.x, ty: arTransform.y };
        dragging = true;
      }
    }

    target.addEventListener('pointerup', endPointer);
    target.addEventListener('pointercancel', endPointer);
    target.addEventListener('pointerleave', (e) => {
      if (e.buttons === 0) endPointer(e);
    });

    // Rueda del mouse en desktop = escalar (comodidad adicional).
    target.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      scaleDish(arTransform.scale + delta);
    }, { passive: false });
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function angleBetween(a, b) {
    return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  }

  function moveDish(x, y) {
    arTransform.x = x;
    arTransform.y = y;
    applyArTransform();
  }

  function scaleDish(scale) {
    arTransform.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
    applyArTransform();
  }

  function rotateDish(deg) {
    arTransform.rotation = deg % 360;
    applyArTransform();
  }

  function applyArTransform() {
    // INTEGRACIÓN 3D: aquí es donde, en una versión futura con
    // Three.js/WebXR, se aplicarían estas mismas x/y/scale/rotation
    // a la posición y orientación de un modelo .glb en la escena.
    els.arDish.style.transform =
      `translate(-50%, -50%) translate(${arTransform.x}px, ${arTransform.y}px) ` +
      `scale(${arTransform.scale}) rotate(${arTransform.rotation}deg)`;
  }

  function resetDish(animate = true) {
    arTransform.x = 0;
    arTransform.y = 0;
    arTransform.scale = 1;
    arTransform.rotation = 0;

    if (animate) {
      els.arDish.style.transition = 'transform 0.35s cubic-bezier(0.2,0.8,0.2,1)';
      applyArTransform();
      setTimeout(() => { els.arDish.style.transition = ''; }, 380);
    } else {
      els.arDish.style.transition = '';
      applyArTransform();
    }
  }

  function setupArButtons() {
    els.btnCloseAR.addEventListener('click', stopAR);
    els.btnCancelAR.addEventListener('click', stopAR);

    els.btnScaleUp.addEventListener('click', () => scaleDish(arTransform.scale + 0.15));
    els.btnScaleDown.addEventListener('click', () => scaleDish(arTransform.scale - 0.15));
    els.btnRotateLeft.addEventListener('click', () => rotateDish(arTransform.rotation - 15));
    els.btnRotateRight.addEventListener('click', () => rotateDish(arTransform.rotation + 15));
    els.btnReset.addEventListener('click', () => resetDish(true));

    els.btnSwitchDish.addEventListener('click', toggleDishSwitcher);
    els.btnCapture.addEventListener('click', captureAR);
    els.btnShare.addEventListener('click', shareAR);

    // Cambiar de fotografía (ángulo) del mismo platillo dentro de AR,
    // y abrir el zoom con gestos sobre la foto que se está viendo.
    els.arPhotoPrev.addEventListener('click', arPhotoPrev);
    els.arPhotoNext.addEventListener('click', arPhotoNext);
    els.arPhotoZoom.addEventListener('click', openArPhotoZoom);

    els.btnRetryCamera.addEventListener('click', () => {
      hideArError();
      setupCamera();
    });

    els.btnCaptureClose.addEventListener('click', hideCapturePreview);
  }

  /* ================================================================
     7. EXPERIENCIA AR — CAMBIAR PLATILLO / CAMBIAR FOTO / ZOOM / RESET
  ================================================================ */
  function setArDish(dishId, opts = {}) {
    const dish = dishes.find((d) => d.id === dishId);
    if (!dish) return;

    state.arDishId = dishId;
    // Al entrar a un platillo (o cambiar a otro) siempre arrancamos
    // mostrando su primera fotografía (el ángulo principal).
    state.arPhotoIndex = Number.isInteger(opts.photoIndex) ? opts.photoIndex : 0;

    els.arDishName.textContent = dish.name;
    renderArPhoto();

    if (opts.animate !== false) {
      resetDish(true);
    } else {
      resetDish(false);
    }

    renderDishSwitcher(dishId);
  }

  /**
   * Obtiene el arreglo de fotografías del platillo actualmente activo
   * dentro de AR (con compatibilidad hacia atrás por si algún platillo
   * todavía solo define `image` en vez de `images`).
   */
  function getArDishImages() {
    const dish = dishes.find((d) => d.id === state.arDishId);
    if (!dish) return [];
    return (dish.images && dish.images.length ? dish.images : [dish.image]).filter(Boolean);
  }

  /**
   * Dibuja sobre la cámara la fotografía que corresponde al índice
   * actual (`state.arPhotoIndex`) del platillo activo en AR, y
   * actualiza el contador "1 / 3" y el estado de las flechas.
   */
  function renderArPhoto() {
    const images = getArDishImages();
    if (!images.length) return;

    const src = images[state.arPhotoIndex];
    els.arDishImg.alt = els.arDishName.textContent;
    els.arDishImg.onerror = () => {
      // Si la imagen todavía no existe, usamos un fondo de textura
      // suave en lugar de romper la experiencia AR.
      els.arDishImg.onerror = null;
      els.arDishImg.src =
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240">
             <rect width="100%" height="100%" rx="18" fill="#2b2115"/>
             <text x="50%" y="46%" fill="#c9a227" font-family="monospace" font-size="13" text-anchor="middle">Agrega la foto en</text>
             <text x="50%" y="60%" fill="#f3ead9" font-family="monospace" font-size="12" text-anchor="middle">${src}</text>
           </svg>`
        );
    };
    els.arDishImg.src = src;

    // Barra "‹ 1/3 ›" — se oculta si el platillo solo tiene una foto.
    els.arPhotoCounter.textContent = `${state.arPhotoIndex + 1} / ${images.length}`;
    els.arPhotoToolbar.classList.toggle('is-single-photo', images.length <= 1);
  }

  /** Pasa a la siguiente fotografía (ángulo) del platillo activo en AR. */
  function arPhotoNext() {
    const images = getArDishImages();
    if (images.length <= 1) return;
    state.arPhotoIndex = (state.arPhotoIndex + 1) % images.length;
    renderArPhoto();
  }

  /** Regresa a la fotografía (ángulo) anterior del platillo activo en AR. */
  function arPhotoPrev() {
    const images = getArDishImages();
    if (images.length <= 1) return;
    state.arPhotoIndex = (state.arPhotoIndex - 1 + images.length) % images.length;
    renderArPhoto();
  }

  /**
   * Abre el mismo visor de zoom con gestos (pellizcar, doble toque,
   * arrastrar) que ya usa la galería del menú/detalle, mostrando la
   * fotografía que se está viendo en AR en ese momento. La cámara
   * sigue funcionando detrás; al cerrar el zoom, la experiencia AR
   * continúa exactamente donde se dejó.
   */
  function openArPhotoZoom() {
    const dish = dishes.find((d) => d.id === state.arDishId);
    if (!dish || !window.ElTequilaGallery) return;
    window.ElTequilaGallery.openLightbox(dish, state.arPhotoIndex);
  }

  function switchDish(dishId) {
    setArDish(dishId, { animate: true });
    closeDishSwitcher();
  }

  function renderDishSwitcher(activeDishId) {
    els.arDishSwitcherInner.innerHTML = dishes.map((dish) => {
      const coverImage = (dish.images && dish.images[0]) || dish.image;
      return `
      <button class="ar-switch-item ${dish.id === activeDishId ? 'is-selected' : ''}" data-switch-dish="${dish.id}">
        <span class="ar-switch-thumb">
          <img src="${coverImage}" alt="" onerror="this.parentElement.textContent='sin foto'" />
        </span>
        <span class="ar-switch-label">${dish.name}</span>
      </button>
    `;
    }).join('');

    els.arDishSwitcherInner.querySelectorAll('[data-switch-dish]').forEach((btn) => {
      btn.addEventListener('click', () => switchDish(Number(btn.getAttribute('data-switch-dish'))));
    });
  }

  function toggleDishSwitcher() {
    const isOpen = els.arDishSwitcher.classList.toggle('is-open');
    els.arDishSwitcher.setAttribute('aria-hidden', String(!isOpen));
  }

  function closeDishSwitcher() {
    els.arDishSwitcher.classList.remove('is-open');
    els.arDishSwitcher.setAttribute('aria-hidden', 'true');
  }

  /* ================================================================
     8. EXPERIENCIA AR — CAPTURA Y COMPARTIR
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

      // 1. Dibujar el fondo: el frame actual de la cámara (o un
      //    fondo sólido si estamos en modo demo de escritorio).
      if (video.srcObject) {
        ctx.drawImage(video, 0, 0, vw, vh);
      } else {
        ctx.fillStyle = '#1a140d';
        ctx.fillRect(0, 0, vw, vh);
      }

      // 2. Calcular la posición del platillo en coordenadas del canvas,
      //    a partir de su posición/tamaño real en pantalla.
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

      // Sombra suave para reforzar la sensación de profundidad.
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
    els.arCaptureImg.src = dataUrl;
    els.btnCaptureDownload.href = dataUrl;
    els.arCapturePreview.classList.add('is-active');
    els.arCapturePreview.setAttribute('aria-hidden', 'false');
  }

  function hideCapturePreview() {
    els.arCapturePreview.classList.remove('is-active');
    els.arCapturePreview.setAttribute('aria-hidden', 'true');
  }

  async function shareAR() {
    const dataUrl = els.arCaptureImg.src;

    // Si aún no se ha tomado una foto, la generamos primero.
    if (!dataUrl) {
      captureAR();
    }

    const finalUrl = els.arCaptureImg.src;
    if (!finalUrl) return;

    if (navigator.share) {
      try {
        const blob = await (await fetch(finalUrl)).blob();
        const file = new File([blob], 'el-tequila-ar.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'El Tequila — Menú en AR',
            text: '¡Mira este platillo de El Tequila en realidad aumentada!'
          });
          return;
        }

        await navigator.share({
          title: 'El Tequila — Menú en AR',
          text: '¡Mira este platillo de El Tequila en realidad aumentada!'
        });
        return;
      } catch (err) {
        // El usuario canceló el share o el navegador lo rechazó;
        // no es un error crítico, simplemente no hacemos nada más.
        return;
      }
    }

    // Alternativa cuando Web Share API no está disponible (p. ej. desktop):
    // mostramos la vista previa con el botón de descarga ya visible.
    showCapturePreview(finalUrl);
  }

  /* ================================================================
     9. MANEJO DE ERRORES DE CÁMARA
  ================================================================ */
  function showCameraError({ icon, title, message }) {
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
     10. INICIALIZACIÓN
  ================================================================ */
  function initializeApp() {
    cacheDom();
    setupNavigation();
    setupArButtons();
    setupTouchControls();
    renderMenu();

    // Cerrar el selector de platillos si se toca fuera de él.
    els.arSurface.addEventListener('pointerdown', (e) => {
      if (els.arDishSwitcher.classList.contains('is-open') && !els.arDishSwitcher.contains(e.target)) {
        closeDishSwitcher();
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
