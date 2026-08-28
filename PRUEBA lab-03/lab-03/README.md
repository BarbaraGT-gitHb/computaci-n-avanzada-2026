# Atlas migratorio · Campo de Datos 01

Visualización 3D de la migración del charrán ártico (*Sterna paradisaea*) sobre un globo. El proyecto convierte datos de seguimiento animal en tres reglas visuales: una serie por ave, color para el sentido estacional y un marcador animado para el flujo.

## Ajustes visuales incorporados

- El globo conserva la paleta oscura de la propuesta original y ahora usa un relleno terrestre gris azulado más definido.
- Se refuerzan los límites entre países para que las separaciones cartográficas sean claramente visibles sobre la esfera.
- Se incorporan etiquetas sutiles para **América, Europa, África, Asia y Oceanía**.
- Los cuatro puntos migratorios principales tienen un marcador amarillo interactivo y una tarjeta **Pop Art** con imagen estilizada del charrán ártico, etapa migratoria y época aproximada del año.
- La interacción existente se conserva: rotación, zoom, selección de trayectorias y animación de las rutas.

## Preguntas resueltas por el sistema

- **¿Qué se mueve?** Nueve charranes árticos marcados en Alaska.
- **¿Entre qué sectores?** Alaska, Pacífico Norte, Pacífico tropical/sur y océano Austral.
- **¿Cómo se representa la trayectoria?** Cada línea es un corredor espacial generalizado de una serie de seguimiento; no es una posición en vivo.
- **¿Cómo se reconoce el flujo?** Rojo: viaje hacia el sur. Azul: retorno al norte. Bandadas de siluetas recorren la línea en esa dirección.
- **¿Cómo se hace visible la cantidad?** Una silueta equivale a 10 aves reales. Cada corredor lleva una bandada de 5 siluetas (50 aves) y las nueve rutas representan una muestra visual de 450 aves.

## Datos y rigor

La fuente es el estudio público **MCP Arctic Tern Alaska** del [Arctic Animal Movement Archive de Movebank](https://www.movebank.org/cms/movebank-content/arctic-animal-movement-archive): 9 individuos, 3.011 localizaciones y geolocalizadores solares, registrados entre 2017 y 2018. La fuente fue consultada en agosto de 2026.

La distancia anual de **70.900 km** (rango 59.500–81.600 km) corresponde al promedio publicado por BirdLife para charranes árticos seguidos en Islandia y Groenlandia; se exhibe como contexto de especie y no se atribuye a las nueve aves de Alaska. Ver [BirdLife DataZone](https://datazone.birdlife.org/articles/migrating-birds-know-no-boundaries).

Las coordenadas de `main.js` están simplificadas deliberadamente: muestran corredores comparables de las nueve series, sin distribuir ni inventar las 3.011 observaciones puntuales. Esto evita que la visualización parezca un rastreo actual de animales.

## Ejecución

Abrir `index.html` con Live Server. Se requiere conexión para cargar Three.js y el GeoJSON de contornos continentales.
