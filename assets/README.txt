EL TEQUILA — FOTOGRAFÍAS DE LOS PLATILLOS
===========================================

Coloca aquí las fotografías de los platillos.

Cada platillo necesita EXACTAMENTE 3 fotografías, tomadas desde
diferentes ángulos del mismo platillo (por ejemplo: de frente, desde
arriba, y un acercamiento). El código espera estos nombres de
archivo exactos, dentro de assets/images/:

Platillo 1 — Enchiladas:
  dish-01-1.jpg
  dish-01-2.jpg
  dish-01-3.jpg

Platillo 2 — Carne Asada:
  dish-02-1.jpg
  dish-02-2.jpg
  dish-02-3.jpg

Las fotografías deben mostrar el MISMO platillo desde diferentes
ángulos — así, al deslizar el dedo sobre el platillo dentro de la
cámara (o en la galería normal antes de entrar a AR), el efecto se
siente como girar el plato para verlo desde otro lado.

Recomendaciones:
  - Formato: JPG (si usas PNG, cambia la extensión en el arreglo
    `images` de cada producto dentro de js/app.js).
  - Orientación: preferiblemente horizontal o cuadrada.
  - Resolución sugerida: al menos 1600×1200 px, ya que las fotos
    también se ven ampliadas en la galería y en AR.
  - `dish-XX-1.jpg` es la que se usa como portada en la tarjeta del
    menú y como primera fotografía al abrir el platillo — elige ahí
    tu mejor ángulo.

Si las fotografías todavía no existen, la aplicación NO se rompe:
mostrará automáticamente un aviso elegante ("Agrega las fotografías
del platillo en /assets/images/") tanto en el menú como en el
detalle, la galería y la experiencia AR.

En cuanto agregues los archivos con estos nombres exactos, la
aplicación los detectará automáticamente — no necesitas modificar
el resto del código.

¿Quieres agregar un tercer platillo? Ve a js/app.js, sección 1
("CONFIGURACIÓN DEL NEGOCIO Y DATOS DE PRODUCTOS"), copia uno de los
objetos del arreglo `products`, cámbiale el `id` (por ejemplo
"dish-03") y usa 3 fotografías nuevas con ese mismo prefijo, por
ejemplo:
  dish-03-1.jpg
  dish-03-2.jpg
  dish-03-3.jpg
