MODELO 3D DEL PLATILLO (assets/dishes/3D.glb)
================================================

Coloca aquí el modelo 3D que se mostrará DENTRO DE LA EXPERIENCIA AR
(cuando el usuario presiona "Ver en AR"), en reemplazo de la
fotografía 2D que se usaba antes ahí.

El nombre del archivo debe ser EXACTAMENTE:

  3D.glb

Ruta completa esperada por el código:

  assets/dishes/3D.glb

NO uses otros nombres como:
  3d.glb
  dish-01.glb
  dish-01-3d.glb
  model.glb

IMPORTANTE — esta carpeta es independiente de assets/images/:

  assets/images/   → fotografías 2D (menú, tarjetas, vista del
                      platillo). NO se tocaron ni se reemplazan.

  assets/dishes/    → modelo 3D (solamente se usa dentro de AR).

Por ahora existe un único modelo (3D.glb) compartido por todos los
platillos del menú — no hace falta un archivo distinto por platillo
todavía.

Recomendaciones para el archivo .glb:
  - Formato binario glTF (.glb), no .gltf + texturas sueltas.
  - Peso recomendado: bajo 10-15 MB para que cargue rápido en datos
    móviles.
  - El modelo debe venir centrado en su propio origen y con una
    escala razonable — <model-viewer> (la librería usada) encuadra
    y escala automáticamente el modelo para que se vea bien sin
    quedar gigante ni diminuto, pero un modelo ya bien centrado en su
    archivo de origen siempre se ve mejor.

Si este archivo todavía no existe, la experiencia AR NO se rompe:
al presionar "Ver en AR" se abre la cámara con normalidad, y en
lugar del platillo aparece un aviso:

  "Agrega el modelo 3D en assets/dishes/3D.glb"

con un botón "Intentar nuevamente" que vuelve a intentar cargarlo
sin necesidad de recargar toda la página — solo coloca el archivo
aquí y presiona ese botón.
