EL TEQUILA — FOTOGRAFÍAS DE PLATILLOS
======================================

NOVEDAD: cada platillo ahora admite VARIAS fotografías (distintos
ángulos del mismo plato), no solo una. La galería del sitio muestra
esas fotos con flechas "‹ / ›", puntos indicadores y zoom.

Coloca aquí las fotografías reales de los 6 platillos. La aplicación
espera EXACTAMENTE estos nombres de archivo (3 fotos por platillo):

  Enchiladas
    dish-01-1.jpg   -> ángulo 1 (foto de portada / menú)
    dish-01-2.jpg   -> ángulo 2
    dish-01-3.jpg   -> ángulo 3

  Tacos
    dish-02-1.jpg
    dish-02-2.jpg
    dish-02-3.jpg

  Fajitas
    dish-03-1.jpg
    dish-03-2.jpg
    dish-03-3.jpg

  Carne Asada
    dish-04-1.jpg
    dish-04-2.jpg
    dish-04-3.jpg

  Enchiladas Suizas
    dish-05-1.jpg
    dish-05-2.jpg
    dish-05-3.jpg

  Quesadillas
    dish-06-1.jpg
    dish-06-2.jpg
    dish-06-3.jpg

Recomendaciones:
  - Formato: JPG (también funciona PNG si cambias la extensión en
    js/app.js, dentro del arreglo "dishes" -> propiedad "images").
  - Orientación: preferiblemente formato horizontal o cuadrado.
  - Resolución sugerida: al menos 1600x1200 px, ya que ahora las
    fotos también se ven ampliadas en el visor de zoom.
  - La primera foto de cada platillo (sufijo "-1") es la que se usa
    como portada en la tarjeta del menú y en la experiencia AR — elige
    ahí tu mejor ángulo.

Si quieres agregar MÁS de 3 fotos a un platillo (o menos), no
necesitas tocar el HTML ni el CSS: solo edita el arreglo "images"
de ese platillo dentro de js/app.js y agrega/quita rutas. La galería,
las flechas, los puntos y el zoom se ajustan automáticamente a la
cantidad de fotos que definas.

Si una imagen todavía no existe, la aplicación NO se rompe: mostrará
automáticamente un aviso elegante indicando la ruta esperada, tanto
en el menú como en el detalle y dentro del visor de zoom.

En cuanto agregues los archivos con estos nombres, la aplicación los
detectará automáticamente — no necesitas modificar el resto del código.
