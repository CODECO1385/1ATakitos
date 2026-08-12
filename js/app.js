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
     6. EXPERIENCIA AR — gestos (deslizar = cambiar foto, pellizcar = zoom)
     7. EXPERIENCIA AR — cambiar platillo / cambiar foto
     8. MANEJO DE ERRORES DE CÁMARA
     9. INICIALIZACIÓN

   NOTA SOBRE LA EXPERIENCIA AR (rediseño):
   Dentro de la cámara, la ÚNICA interacción es la fotografía del
   platillo. No hay botones de mover / escalar / rotar / capturar /
   compartir — solo un botón "✕" para cerrar y el menú inferior para
   saltar a otro platillo. Sobre la fotografía:
     - Deslizar (swipe) horizontal → cambia a la siguiente/anterior
       fotografía (ángulo) de ESE MISMO platillo.
     - Pellizcar con dos dedos (pinch) → acerca/aleja (zoom) esa
       misma fotografía, directamente donde se está mostrando.
     - Doble toque → restablece el zoom a su tamaño original.

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

  // Estado de zoom del platillo dentro de AR. Ya no existe posición
  // (x/y) ni rotación: el platillo siempre está centrado, y la única
  // transformación que el usuario controla es el zoom (pellizcar).
  const arZoom = {
    scale: 1
  };

  const MIN_ZOOM = 0.6;
  const MAX_ZOOM = 3;

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
    els.arSurface = document.getElementById('arSurface');
    els.arDish = document.getElementById('arDish');
    els.arDishImg = document.getElementById('arDishImg');
    els.arDishName = document.getElementById('arDishName');
    els.arDishHint = document.getElementById('arDishHint');
    els.arPhotoDots = document.getElementById('arPhotoDots');

    els.btnCloseAR = document.getElementById('btnCloseAR');

    els.arDishSwitcher = document.getElementById('arDishSwitcher');
    els.arDishSwitcherInner = document.getElementById('arDishSwitcherInner');

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
    // puede seguir deslizando (cambiar de foto) y haciendo zoom con
    // el mouse sobre un fondo simulado para ver el concepto.
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

    hideArError();
    els.arDesktopDemo.classList.remove('is-active');

    resetArZoom(false);

    // Regresar a la vista del platillo que se estaba viendo.
    if (state.currentDishId) {
      goto('dish');
    }
  }

  /* ================================================================
     6. EXPERIENCIA AR — GESTOS
     (deslizar = cambiar de foto · pellizcar = zoom · doble toque =
     restablecer zoom · rueda del mouse = zoom en desktop)
  ================================================================ */
  function setupTouchControls() {
    // La interacción vive sobre el contenedor del platillo (imagen +
    // sombra), que es visualmente "la fotografía" para el usuario.
    const target = els.arDish;
    const pointers = new Map();

    let gestureType = null;   // 'pan' (1 dedo) | 'pinch' (2 dedos)
    let singleStart = null;   // { x, y } al iniciar un toque con 1 dedo
    let pinchStart = null;    // { dist, scale } al iniciar el pellizco
    let lastTapTime = 0;

    const SWIPE_MIN_PX = 46;

    target.addEventListener('pointerdown', (e) => {
      target.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        gestureType = 'pan';
        singleStart = { x: e.clientX, y: e.clientY };
      }

      if (pointers.size === 2) {
        gestureType = 'pinch';
        const pts = Array.from(pointers.values());
        pinchStart = { dist: distance(pts[0], pts[1]), scale: arZoom.scale };
      }
    });

    target.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (gestureType === 'pinch' && pointers.size === 2) {
        const pts = Array.from(pointers.values());
        const newDist = distance(pts[0], pts[1]);
        const factor = newDist / (pinchStart.dist || 1);
        setArZoom(pinchStart.scale * factor);
      }
    });

    function endPointer(e) {
      const wasPan = gestureType === 'pan';
      pointers.delete(e.pointerId);

      if (wasPan && pointers.size === 0 && singleStart) {
        const dx = e.clientX - singleStart.x;
        const dy = e.clientY - singleStart.y;
        const isHorizontalSwipe = Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * 1.3;

        if (isHorizontalSwipe) {
          // Deslizar la fotografía: izquierda → siguiente ángulo,
          // derecha → ángulo anterior del MISMO platillo.
          if (dx < 0) arPhotoNext(); else arPhotoPrev();
        } else {
          // No fue un deslizamiento: si llega justo después de otro
          // toque, lo tratamos como doble toque → restablecer el zoom.
          const now = Date.now();
          if (now - lastTapTime < 320) {
            resetArZoom(true);
          }
          lastTapTime = now;
        }
      }

      if (pointers.size === 0) {
        gestureType = null;
        singleStart = null;
        pinchStart = null;
      }
    }

    target.addEventListener('pointerup', endPointer);
    target.addEventListener('pointercancel', endPointer);
    target.addEventListener('pointerleave', (e) => {
      if (e.buttons === 0) endPointer(e);
    });

    // Rueda del mouse en desktop = zoom (comodidad adicional).
    target.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.12 : 0.12;
      setArZoom(arZoom.scale + delta);
    }, { passive: false });
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function setArZoom(scale) {
    arZoom.scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
    applyArTransform();
  }

  function applyArTransform() {
    // INTEGRACIÓN 3D: aquí es donde, en una versión futura con
    // Three.js/WebXR, se aplicaría este mismo nivel de zoom a un
    // modelo .glb en la escena.
    els.arDish.style.transform = `translate(-50%, -50%) scale(${arZoom.scale})`;
  }

  function resetArZoom(animate = true) {
    arZoom.scale = 1;

    if (animate) {
      els.arDish.style.transition = 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1)';
      applyArTransform();
      setTimeout(() => { els.arDish.style.transition = ''; }, 320);
    } else {
      els.arDish.style.transition = '';
      applyArTransform();
    }
  }

  function setupArButtons() {
    els.btnCloseAR.addEventListener('click', stopAR);
    els.btnCancelAR.addEventListener('click', stopAR);

    els.btnRetryCamera.addEventListener('click', () => {
      hideArError();
      setupCamera();
    });
  }

  /* ================================================================
     7. EXPERIENCIA AR — CAMBIAR PLATILLO / CAMBIAR FOTO
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
    resetArZoom(opts.animate !== false);
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
   * actualiza los puntos indicadores (solo informativos, no son
   * botones).
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

    els.arPhotoDots.innerHTML = images.length > 1
      ? images.map((_, i) => `<span class="ar-photo-dot ${i === state.arPhotoIndex ? 'is-active' : ''}"></span>`).join('')
      : '';
  }

  /**
   * Cambia la fotografía activa del platillo en AR (deslizando la
   * imagen hacia un lado, como cualquier carrusel de fotos), y
   * restablece el zoom para la nueva foto.
   */
  function switchArPhoto(direction) {
    const images = getArDishImages();
    if (images.length <= 1) return;

    const nextIndex = (state.arPhotoIndex + direction + images.length) % images.length;
    const img = els.arDishImg;
    const outOffset = direction > 0 ? '-26px' : '26px';
    const inOffset = direction > 0 ? '26px' : '-26px';

    img.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
    img.style.transform = `translateX(${outOffset})`;
    img.style.opacity = '0';

    setTimeout(() => {
      state.arPhotoIndex = nextIndex;
      renderArPhoto();
      resetArZoom(false);

      img.style.transition = 'none';
      img.style.transform = `translateX(${inOffset})`;

      requestAnimationFrame(() => {
        img.style.transition = 'transform 0.22s cubic-bezier(0.2,0.8,0.2,1), opacity 0.22s ease';
        img.style.transform = 'translateX(0)';
        img.style.opacity = '1';
      });
    }, 200);
  }

  /** Pasa a la siguiente fotografía (ángulo) del platillo activo en AR. */
  function arPhotoNext() {
    switchArPhoto(1);
  }

  /** Regresa a la fotografía (ángulo) anterior del platillo activo en AR. */
  function arPhotoPrev() {
    switchArPhoto(-1);
  }

  /** Cambia a otro platillo del menú (elegido en el menú inferior). */
  function switchDish(dishId) {
    setArDish(dishId, { animate: true });
  }

  /**
   * Dibuja el menú inferior con miniaturas de los 6 platillos. Este
   * menú siempre está visible dentro de AR (no se abre ni se cierra
   * con un botón) para poder saltar a otro platillo con un toque.
   */
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

  /* ================================================================
     8. MANEJO DE ERRORES DE CÁMARA
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
     9. INICIALIZACIÓN
  ================================================================ */
  function initializeApp() {
    cacheDom();
    setupNavigation();
    setupArButtons();
    setupTouchControls();
    renderMenu();

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
