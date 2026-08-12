/* ==================================================================
   EL TEQUILA — AR MENU DEMO
   js/gallery.js

   Módulo independiente para la GALERÍA DE FOTOS de cada platillo.
   Se encarga de:

     1. Renderizar el visor de galería (foto actual + flechas + puntos)
        tanto en las tarjetas del menú como en el detalle del platillo.
     2. Cambiar de foto con los botones "‹" / "›" (o deslizando con
        el dedo / arrastrando con el mouse).
     3. Abrir un visor de pantalla completa ("lightbox") con ZOOM:
          - pellizcar con dos dedos (pinch) en celular
          - rueda del mouse en desktop
          - doble toque / doble clic para alternar zoom
          - arrastrar la imagen ampliada para recorrerla (pan)
          - los mismos botones "‹" / "›" siguen funcionando ahí dentro
            para pasar a la siguiente fotografía del platillo.

   Este archivo NO depende de app.js. Expone una única API pública en:

       window.ElTequilaGallery = { mountGallery, openLightbox }

   app.js solo necesita llamar a `mountGallery(contenedor, platillo)`
   para dibujar una galería, y el resto ocurre aquí.
================================================================== */

(function () {
  'use strict';

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;
  const DOUBLE_TAP_ZOOM = 2.4;
  const DOUBLE_TAP_MS = 320;

  /* ================================================================
     UTILIDAD: placeholder cuando una fotografía todavía no existe
     (reutiliza el mismo helper global definido en app.js si está
     disponible; si no, define uno propio para que este archivo
     funcione de forma independiente).
  ================================================================ */
  function placeholderNode(path) {
    if (typeof window.__elTequilaPlaceholder === 'function') {
      return window.__elTequilaPlaceholder(path);
    }
    const wrap = document.createElement('div');
    wrap.className = 'dish-placeholder';
    wrap.innerHTML = `<span class="ph-icon">🌮</span><span>Agrega la fotografía en<br><strong>${path}</strong></span>`;
    return wrap;
  }

  /* ================================================================
     1. RENDERIZADO DE LA GALERÍA (miniatura con flechas + puntos)
  ================================================================ */

  // Guarda el índice de foto actual de cada galería montada, usando
  // el propio elemento contenedor como llave.
  const galleryState = new WeakMap();

  function buildGalleryMarkup(dish, opts) {
    const options = Object.assign({ size: 'card' }, opts || {});
    const images = (dish.images && dish.images.length ? dish.images : [dish.image]).filter(Boolean);
    const showArrows = images.length > 1;
    const showDots = images.length > 1;

    const dotsMarkup = showDots
      ? `<div class="gallery-dots" role="tablist" aria-label="Fotografías de ${dish.name}">
           ${images.map((_, i) => `<button class="gallery-dot ${i === 0 ? 'is-active' : ''}" data-dot-index="${i}" aria-label="Ver fotografía ${i + 1}"></button>`).join('')}
         </div>`
      : '';

    const badgeMarkup = images.length > 1
      ? `<span class="gallery-count-badge">1 / ${images.length}</span>`
      : '';

    return `
      <div class="gallery gallery--${options.size}" data-gallery data-dish-id="${dish.id}">
        <div class="gallery-viewport" data-gallery-viewport>
          <div class="gallery-track" data-gallery-track style="transform: translateX(0%)">
            ${images.map((src) => `
              <div class="gallery-slide">
                <img src="${src}" alt="${dish.name}" loading="lazy" draggable="false" data-gallery-img />
              </div>
            `).join('')}
          </div>

          ${badgeMarkup}

          <button class="gallery-zoom-btn" data-gallery-zoom aria-label="Ampliar fotografía">
            <span aria-hidden="true">⤢</span>
          </button>

          ${showArrows ? `
            <button class="gallery-arrow gallery-arrow--prev" data-gallery-prev aria-label="Fotografía anterior">‹</button>
            <button class="gallery-arrow gallery-arrow--next" data-gallery-next aria-label="Siguiente fotografía">›</button>
          ` : ''}
        </div>
        ${dotsMarkup}
      </div>
    `;
  }

  function replaceBrokenImages(root, dish) {
    const images = (dish.images && dish.images.length ? dish.images : [dish.image]).filter(Boolean);
    root.querySelectorAll('[data-gallery-img]').forEach((img, i) => {
      img.addEventListener('error', () => {
        const node = placeholderNode(images[i]);
        node.classList.add('gallery-slide-placeholder');
        img.replaceWith(node);
      }, { once: true });
    });
  }

  /**
   * Dibuja una galería dentro de `containerEl` para el `dish` dado,
   * y conecta los botones de navegación (‹ / ›), los puntos y el
   * botón de zoom. Se puede llamar varias veces (por ejemplo una vez
   * por cada tarjeta del menú).
   */
  function mountGallery(containerEl, dish, opts) {
    containerEl.innerHTML = buildGalleryMarkup(dish, opts);
    const root = containerEl.querySelector('[data-gallery]');
    replaceBrokenImages(root, dish);

    const images = (dish.images && dish.images.length ? dish.images : [dish.image]).filter(Boolean);
    galleryState.set(root, { index: 0, total: images.length });

    const track = root.querySelector('[data-gallery-track]');
    const dots = root.querySelectorAll('[data-dot-index]');
    const badge = root.querySelector('.gallery-count-badge');
    const prevBtn = root.querySelector('[data-gallery-prev]');
    const nextBtn = root.querySelector('[data-gallery-next]');
    const zoomBtn = root.querySelector('[data-gallery-zoom]');
    const viewport = root.querySelector('[data-gallery-viewport]');

    function renderIndex() {
      const st = galleryState.get(root);
      track.style.transform = `translateX(-${st.index * 100}%)`;
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === st.index));
      if (badge) badge.textContent = `${st.index + 1} / ${st.total}`;
    }

    function goTo(index) {
      const st = galleryState.get(root);
      st.index = ((index % st.total) + st.total) % st.total; // wrap-around
      renderIndex();
    }

    if (prevBtn) prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const st = galleryState.get(root);
      goTo(st.index - 1);
    });

    if (nextBtn) nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const st = galleryState.get(root);
      goTo(st.index + 1);
    });

    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        goTo(Number(dot.getAttribute('data-dot-index')));
      });
    });

    zoomBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const st = galleryState.get(root);
      openLightbox(dish, st.index);
    });

    // Tocar/hacer clic directamente sobre la fotografía también abre el zoom.
    track.querySelectorAll('[data-gallery-img]').forEach((img) => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        const st = galleryState.get(root);
        openLightbox(dish, st.index);
      });
    });

    // Deslizar con el dedo (o arrastrar con el mouse) para cambiar de foto,
    // igual que en cualquier carrusel de fotos de producto.
    setupSwipe(viewport, {
      onSwipeLeft: () => { const st = galleryState.get(root); goTo(st.index + 1); },
      onSwipeRight: () => { const st = galleryState.get(root); goTo(st.index - 1); }
    });
  }

  /**
   * Gestos de arrastre horizontal simples (sin zoom) para la galería
   * en miniatura — separado del zoom con pellizco del lightbox.
   */
  function setupSwipe(el, { onSwipeLeft, onSwipeRight }) {
    let startX = null;
    let startY = null;
    let dragging = false;

    el.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
      dragging = true;
    });

    el.addEventListener('pointerup', (e) => {
      if (!dragging || startX === null) return;
      dragging = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Solo lo tratamos como swipe si el movimiento fue mayormente horizontal.
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) onSwipeLeft(); else onSwipeRight();
      }
      startX = null;
      startY = null;
    });

    el.addEventListener('pointercancel', () => { dragging = false; startX = null; });
  }

  /* ================================================================
     2. LIGHTBOX DE PANTALLA COMPLETA CON ZOOM
  ================================================================ */

  let lightboxEl = null;
  let lightboxState = {
    dish: null,
    index: 0,
    scale: 1,
    x: 0,
    y: 0
  };

  function ensureLightboxDom() {
    if (lightboxEl) return lightboxEl;

    const el = document.createElement('div');
    el.className = 'lightbox-overlay';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="lightbox-top-bar">
        <button class="lightbox-icon-btn" data-lightbox-close aria-label="Cerrar galería">✕</button>
        <span class="lightbox-counter" data-lightbox-counter>1 / 1</span>
        <span class="lightbox-dish-name" data-lightbox-name></span>
      </div>

      <div class="lightbox-stage" data-lightbox-stage>
        <img class="lightbox-img" data-lightbox-img alt="" draggable="false" />
      </div>

      <button class="lightbox-nav lightbox-nav--prev" data-lightbox-prev aria-label="Fotografía anterior">‹</button>
      <button class="lightbox-nav lightbox-nav--next" data-lightbox-next aria-label="Siguiente fotografía">›</button>

      <p class="lightbox-hint" data-lightbox-hint>Pellizca o usa la rueda del mouse para hacer zoom · doble toque para acercar</p>

      <div class="lightbox-zoom-controls">
        <button class="lightbox-icon-btn" data-lightbox-zoom-out aria-label="Alejar">−</button>
        <button class="lightbox-icon-btn" data-lightbox-zoom-reset aria-label="Restablecer zoom">1×</button>
        <button class="lightbox-icon-btn" data-lightbox-zoom-in aria-label="Acercar">+</button>
      </div>
    `;
    document.body.appendChild(el);
    lightboxEl = el;
    wireLightboxEvents();
    return el;
  }

  function openLightbox(dish, startIndex) {
    ensureLightboxDom();
    const images = (dish.images && dish.images.length ? dish.images : [dish.image]).filter(Boolean);

    lightboxState.dish = dish;
    lightboxState.images = images;
    lightboxState.index = Math.min(Math.max(startIndex || 0, 0), images.length - 1);

    lightboxEl.querySelector('[data-lightbox-name]').textContent = dish.name;
    const showNav = images.length > 1;
    lightboxEl.querySelector('[data-lightbox-prev]').style.display = showNav ? '' : 'none';
    lightboxEl.querySelector('[data-lightbox-next]').style.display = showNav ? '' : 'none';

    renderLightboxImage();
    resetZoom();

    lightboxEl.classList.add('is-active');
    lightboxEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // El hint de zoom se desvanece solo tras unos segundos.
    const hint = lightboxEl.querySelector('[data-lightbox-hint]');
    hint.style.opacity = '1';
    clearTimeout(openLightbox._t);
    openLightbox._t = setTimeout(() => { hint.style.opacity = '0'; }, 3200);
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove('is-active');
    lightboxEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function renderLightboxImage() {
    const img = lightboxEl.querySelector('[data-lightbox-img]');
    const src = lightboxState.images[lightboxState.index];

    img.onerror = () => {
      img.onerror = null;
      img.src =
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
             <rect width="100%" height="100%" fill="#2b2115"/>
             <text x="50%" y="46%" fill="#c9a227" font-family="monospace" font-size="22" text-anchor="middle">Agrega la foto en</text>
             <text x="50%" y="56%" fill="#f3ead9" font-family="monospace" font-size="18" text-anchor="middle">${src}</text>
           </svg>`
        );
    };
    img.src = src;

    lightboxEl.querySelector('[data-lightbox-counter]').textContent =
      `${lightboxState.index + 1} / ${lightboxState.images.length}`;
  }

  function lightboxGoTo(index) {
    const total = lightboxState.images.length;
    lightboxState.index = ((index % total) + total) % total;
    resetZoom();
    renderLightboxImage();
  }

  /* ---------------- Zoom y desplazamiento (pan) ---------------- */

  function applyZoomTransform() {
    const img = lightboxEl.querySelector('[data-lightbox-img]');
    img.style.transform = `translate(${lightboxState.x}px, ${lightboxState.y}px) scale(${lightboxState.scale})`;
    img.style.cursor = lightboxState.scale > 1 ? 'grab' : 'zoom-in';
    lightboxEl.querySelector('[data-lightbox-zoom-reset]').textContent = `${lightboxState.scale.toFixed(1)}×`;
  }

  function resetZoom() {
    lightboxState.scale = 1;
    lightboxState.x = 0;
    lightboxState.y = 0;
    applyZoomTransform();
  }

  function setZoom(scale, originX, originY) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
    lightboxState.scale = clamped;
    if (clamped === MIN_ZOOM) {
      lightboxState.x = 0;
      lightboxState.y = 0;
    }
    applyZoomTransform();
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function wireLightboxEvents() {
    const stage = lightboxEl.querySelector('[data-lightbox-stage]');
    const img = lightboxEl.querySelector('[data-lightbox-img]');

    lightboxEl.querySelector('[data-lightbox-close]').addEventListener('click', closeLightbox);
    lightboxEl.querySelector('[data-lightbox-prev]').addEventListener('click', () => lightboxGoTo(lightboxState.index - 1));
    lightboxEl.querySelector('[data-lightbox-next]').addEventListener('click', () => lightboxGoTo(lightboxState.index + 1));
    lightboxEl.querySelector('[data-lightbox-zoom-in]').addEventListener('click', () => setZoom(lightboxState.scale + 0.5));
    lightboxEl.querySelector('[data-lightbox-zoom-out]').addEventListener('click', () => setZoom(lightboxState.scale - 0.5));
    lightboxEl.querySelector('[data-lightbox-zoom-reset]').addEventListener('click', resetZoom);

    // Cerrar tocando el fondo (solo si no está haciendo zoom).
    stage.addEventListener('click', (e) => {
      if (e.target === stage && lightboxState.scale === 1) closeLightbox();
    });

    // Cerrar con la tecla Escape; navegar con flechas del teclado.
    document.addEventListener('keydown', (e) => {
      if (!lightboxEl.classList.contains('is-active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') lightboxGoTo(lightboxState.index + 1);
      if (e.key === 'ArrowLeft') lightboxGoTo(lightboxState.index - 1);
    });

    // Rueda del mouse = zoom (desktop).
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      setZoom(lightboxState.scale + delta);
    }, { passive: false });

    // Pellizcar (pinch) para zoom y arrastrar para desplazar (pan),
    // con la misma técnica de Pointer Events usada en la experiencia AR.
    const pointers = new Map();
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let panStart = { x: 0, y: 0, ix: 0, iy: 0 };
    let lastTapTime = 0;

    img.addEventListener('pointerdown', (e) => {
      img.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        panStart = { x: e.clientX, y: e.clientY, ix: lightboxState.x, iy: lightboxState.y };
      }

      if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        pinchStartDist = distance(pts[0], pts[1]);
        pinchStartScale = lightboxState.scale;
      }
    });

    img.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1 && lightboxState.scale > 1) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        lightboxState.x = panStart.ix + dx;
        lightboxState.y = panStart.iy + dy;
        applyZoomTransform();
      }

      if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        const newDist = distance(pts[0], pts[1]);
        const factor = newDist / (pinchStartDist || 1);
        setZoom(pinchStartScale * factor);
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);

      // Doble toque / doble clic para alternar zoom rápidamente.
      if (pointers.size === 0) {
        const now = Date.now();
        if (now - lastTapTime < DOUBLE_TAP_MS) {
          if (lightboxState.scale > 1) {
            resetZoom();
          } else {
            setZoom(DOUBLE_TAP_ZOOM);
          }
        }
        lastTapTime = now;
      }
    }

    img.addEventListener('pointerup', endPointer);
    img.addEventListener('pointercancel', endPointer);
  }

  /* ================================================================
     API PÚBLICA
  ================================================================ */
  window.ElTequilaGallery = {
    mountGallery,
    openLightbox
  };
})();
