import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Datos: Movebank / Arctic Animal Movement Archive, estudio "MCP Arctic Tern Alaska".
// 9 individuos, 3.011 localizaciones con geolocalizadores solares (2017–2018).
// Las coordenadas siguientes son corredores generalizados para lectura comparativa,
// no una afirmación de posición en tiempo real ni una interpolación de los fixes originales.
const R = 8;
const URL_CONTORNOS = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";
const rutasBase = [
  [[62,-165],[48,-174],[24,-164],[-6,-145],[-35,-118],[-61,-62]],
  [[62,-165],[50,-157],[28,-143],[3,-128],[-29,-104],[-62,-48]],
  [[62,-165],[51,-171],[30,-176],[5,178],[-28,160],[-61,-45]],
  [[62,-165],[47,-164],[19,-151],[-12,-136],[-42,-102],[-63,-58]],
  [[62,-165],[54,-178],[35,169],[12,160],[-20,145],[-62,-40]],
  [[62,-165],[48,-151],[20,-139],[-4,-124],[-36,-95],[-64,-52]],
  [[62,-165],[51,-173],[29,177],[4,170],[-24,150],[-62,-44]],
  [[62,-165],[46,-159],[18,-147],[-10,-132],[-39,-108],[-63,-55]],
  [[62,-165],[53,179],[34,166],[10,155],[-19,142],[-61,-47]],
];
let cantidad = 9, velocidad = 1;
let rutas = [], rutasAdicionales = [], objetosInteractivos = [], tiempoAnterior = 0;

const viewport = document.querySelector("#viewport");
const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(40, viewport.clientWidth / viewport.clientHeight, .1, 100);
camara.position.set(14, 9, 17);
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; viewport.appendChild(renderer.domElement);
const controles = new OrbitControls(camara, renderer.domElement); controles.enableDamping = true; controles.minDistance = 11; controles.maxDistance = 32;
escena.add(new THREE.HemisphereLight(0xbfe6ed, 0x071015, 2.1));
const luz = new THREE.DirectionalLight(0xffffff, 2); luz.position.set(10, 11, 14); escena.add(luz);

const globo = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), new THREE.MeshPhongMaterial({ color:0x0b2530, emissive:0x041216, shininess:8, transparent:true, opacity:.96 }));
escena.add(globo);
const reticula = new THREE.Mesh(new THREE.SphereGeometry(R + .012, 48, 24), new THREE.MeshBasicMaterial({color:0x365562, wireframe:true, transparent:true, opacity:.18})); escena.add(reticula);
const grupoContornos = new THREE.Group(), grupoRutas = new THREE.Group(); escena.add(grupoContornos, grupoRutas);

function aEsfera(lat, lon, radio = R) {
  const phi = THREE.MathUtils.degToRad(90-lat), theta = THREE.MathUtils.degToRad(lon+180);
  return new THREE.Vector3(-radio*Math.sin(phi)*Math.cos(theta), radio*Math.cos(phi), radio*Math.sin(phi)*Math.sin(theta));
}
function curvaDePuntos(puntos, altura = .7) {
  return new THREE.CatmullRomCurve3(puntos.map(([lat, lon]) => aEsfera(lat, lon, R + altura)), false, "centripetal");
}
function crearSiluetaAve(escala, desplazamiento, color = 0xffffff) {
  const forma = new THREE.Shape();
  forma.moveTo(-1.05, 0); forma.quadraticCurveTo(-.55, .10, -.18, -.05);
  forma.quadraticCurveTo(0, -.28, .18, -.05); forma.quadraticCurveTo(.55, .10, 1.05, 0);
  forma.quadraticCurveTo(.52, .38, 0, .12); forma.quadraticCurveTo(-.52, .38, -1.05, 0);
  const ave = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({color: color, side:THREE.DoubleSide, transparent:true, opacity:.92}));
  ave.scale.setScalar(escala); ave.position.copy(desplazamiento); return ave;
}
function crearSiluetaAveGBIF(escala, desplazamiento) {
  const forma = new THREE.Shape();
  // Silueta diferente: triangular puntiaguda
  forma.moveTo(-0.8, -0.3); forma.lineTo(0, 0.5); forma.lineTo(0.8, -0.3);
  forma.lineTo(0.3, -0.1); forma.lineTo(0, -0.4); forma.lineTo(-0.3, -0.1);
  forma.closePath();
  const ave = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshBasicMaterial({color: 0x000000, side:THREE.DoubleSide, transparent:true, opacity:.92}));
  ave.scale.setScalar(escala); ave.position.copy(desplazamiento); return ave;
}
function crearBandada(color = 0xffffff) {
  const bandada = new THREE.Group();
  const distribucion = [[.16,0,0],[.11,.27,.10],[.12,-.22,.05],[.095,.42,-.04],[.085,-.39,-.08]];
  distribucion.forEach(([escala,x,y],i) => bandada.add(crearSiluetaAve(escala,new THREE.Vector3(x,y,(i%2)*.04), color)));
  return bandada;
}
function crearRutas() {
  rutas.forEach(r => grupoRutas.remove(r.grupo)); rutas=[]; objetosInteractivos=[];
  rutasBase.slice(0,cantidad).forEach((puntos, i) => {
    const curvaSur = curvaDePuntos(puntos, .60 + (i%3)*.07);
    const curvaNorte = curvaDePuntos([...puntos].reverse(), .76 + (i%3)*.07);
    const grupo = new THREE.Group();
    const ida = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curvaSur.getPoints(180)), new THREE.LineBasicMaterial({color:0xf36f5e,transparent:true,opacity:.62}));
    const vuelta = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curvaNorte.getPoints(180)), new THREE.LineBasicMaterial({color:0x55c7d6,transparent:true,opacity:.46}));
    ida.userData = {id:i+1,direccion:"Ida al sur",origen:"Alaska (62° N)",destino:"Océano Austral (61° S)"};
    vuelta.userData = {id:i+1,direccion:"Retorno al norte",origen:"Océano Austral (61° S)",destino:"Alaska (62° N)"};
    const bandada = crearBandada(); grupo.add(ida,vuelta,bandada); grupoRutas.add(grupo);
    rutas.push({grupo,ida,vuelta,bandada,curvaSur,curvaNorte,progreso:(i/rutasBase.length)%1}); objetosInteractivos.push(ida,vuelta);
  });
}
async function cargarYCrearRutasMigracion() {
  try {
    const respuesta = await fetch('./migracion.json');
    if (!respuesta.ok) throw new Error('No se pudo cargar migracion.json');
    const datos = await respuesta.json();
    const coordenadas = datos.results.slice(0, 20).map(r => [r.decimalLatitude, r.decimalLongitude]);
    for (let i = 0; i < coordenadas.length; i += 4) {
      const puntos = coordenadas.slice(i, i + 4);
      if (puntos.length < 2) continue;
      const curvaSur = curvaDePuntos(puntos, .55 + (i%3)*.06);
      const curvaNorte = curvaDePuntos([...puntos].reverse(), .71 + (i%3)*.06);
      const grupo = new THREE.Group();
      const ida = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curvaSur.getPoints(120)), new THREE.LineBasicMaterial({color:0xffd700,transparent:true,opacity:.55}));
      const vuelta = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curvaNorte.getPoints(120)), new THREE.LineBasicMaterial({color:0xffed4e,transparent:true,opacity:.40}));
      ida.userData = {id:'M'+(Math.floor(i/4)+1),direccion:"Ruta de datos GBIF",origen:"Coordenadas de observación",destino:"Especie migradora"};
      vuelta.userData = {id:'M'+(Math.floor(i/4)+1),direccion:"Retorno",origen:"Especie migradora",destino:"Coordenadas de observación"};
      const bandada = crearBandada(0xffd700); grupo.add(ida,vuelta,bandada); grupoRutas.add(grupo);
      rutasAdicionales.push({grupo,ida,vuelta,bandada,curvaSur,curvaNorte,progreso:(i/coordenadas.length)%1}); objetosInteractivos.push(ida,vuelta);
    }
  } catch(e) { console.warn("No se pudo cargar datos de migración:",e); }
}
function dibujarContornos(geojson) {
  const geometries = geojson.features.flatMap(f => f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates.flat() : []);
  geometries.forEach(anillo => {
    const pts = anillo.map(([lon,lat]) => aEsfera(lat,lon,R+.035));
    if (pts.length > 1) grupoContornos.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.25})));
  });
}
function crearRellenoContinentes(geojson) {
  const canvas = document.createElement("canvas");
  canvas.width = 4096; canvas.height = 2048;
  const contexto = canvas.getContext("2d");
  contexto.fillStyle = "rgba(255,255,255,.15)";
  const x = lon => (lon + 180) / 360 * canvas.width;
  const y = lat => (90 - lat) / 180 * canvas.height;
  const dibujarPoligono = anillos => {
    contexto.beginPath();
    anillos.forEach(anillo => {
      anillo.forEach(([lon, lat], indice) => {
        if (indice === 0) contexto.moveTo(x(lon), y(lat));
        else contexto.lineTo(x(lon), y(lat));
      });
      contexto.closePath();
    });
    contexto.fill("evenodd");
  };
  geojson.features.forEach(({ geometry }) => {
    if (geometry.type === "Polygon") dibujarPoligono(geometry.coordinates);
    if (geometry.type === "MultiPolygon") geometry.coordinates.forEach(dibujarPoligono);
  });
  const textura = new THREE.CanvasTexture(canvas);
  // El shader usa las coordenadas geográficas directamente; así no depende de
  // la orientación UV interna de SphereGeometry.
  const materialRelleno = new THREE.ShaderMaterial({
    uniforms: { mapa: { value: textura } },
    transparent: true,
    depthWrite: false,
    vertexShader: `
      varying vec3 direccion;
      void main() {
        direccion = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D mapa;
      varying vec3 direccion;
      const float PI = 3.141592653589793;
      void main() {
        float angulo = atan(direccion.z, -direccion.x);
        float longitud = fract(angulo / (2.0 * PI));
        float latitud = (asin(direccion.y) + PI * .5) / PI;
        gl_FragColor = texture2D(mapa, vec2(longitud, latitud));
      }
    `
  });
  const relleno = new THREE.Mesh(
    new THREE.SphereGeometry(R + .022, 128, 96),
    materialRelleno
  );
  escena.add(relleno);
}
async function cargarContornos() {
  try { const r=await fetch(URL_CONTORNOS); if(!r.ok) throw Error(); const geojson=await r.json(); crearRellenoContinentes(geojson); dibujarContornos(geojson); }
  catch { console.warn("No fue posible cargar el contorno cartográfico."); }
}
function crearEtiquetaHito(nombre, lat, lon) {
  const canvas = document.createElement("canvas");
  canvas.width = 320; canvas.height = 180;
  const contexto = canvas.getContext("2d");
  // Pin cartográfico mínimo: círculo coral, borde negro, vástago y punta.
  contexto.fillStyle = "#df4a43"; contexto.strokeStyle = "#071015"; contexto.lineWidth = 7;
  contexto.beginPath(); contexto.arc(160, 48, 35, 0, Math.PI * 2); contexto.fill(); contexto.stroke();
  contexto.fillStyle = "#ecf3f2";
  contexto.beginPath(); contexto.moveTo(151, 80); contexto.lineTo(169, 80); contexto.lineTo(169, 134); contexto.lineTo(160, 153); contexto.lineTo(151, 134); contexto.closePath(); contexto.fill(); contexto.stroke();
  contexto.fillStyle = "rgba(244, 249, 247, .9)";
  contexto.font = "500 17px Arial, sans-serif";
  contexto.textAlign = "center"; contexto.fillText(nombre, 160, 174);
  const etiqueta = new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));
  etiqueta.position.copy(aEsfera(lat, lon, R + .34)); etiqueta.scale.set(.92, .52, 1);
  escena.add(etiqueta);
}
function crearMarcadoresSector() {
  [["Alaska",62,-165],["Pacífico Norte",27,-158],["Pacífico Sur",-31,-110],["Océano Austral",-62,-50]].forEach(([nombre,lat,lon]) => crearEtiquetaHito(nombre,lat,lon));
}
const raycaster = new THREE.Raycaster(), puntero = new THREE.Vector2();
renderer.domElement.addEventListener("pointerdown", e => { const rect=renderer.domElement.getBoundingClientRect(); puntero.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1); raycaster.setFromCamera(puntero,camara); const hit=raycaster.intersectObjects(objetosInteractivos,false)[0]; if(hit) mostrarRuta(hit.object.userData); });
function mostrarRuta(d) { document.querySelector("#ruta-nombre").textContent=`Corredor generalizado de la serie ${d.id} del archivo.`; document.querySelector("#m-direccion").textContent=d.direccion; document.querySelector("#m-individuo").textContent=`Ave ${d.id} de 9`; document.querySelector("#m-origen").textContent=d.origen; document.querySelector("#m-destino").textContent=d.destino; }
document.querySelector("#cantidad").addEventListener("input",e=>{cantidad=+e.target.value;document.querySelector("#cantidad-valor").value=cantidad;document.querySelector("#aves-representadas").textContent=(cantidad*50).toLocaleString("es-CL");crearRutas();});
document.querySelector("#velocidad").addEventListener("input",e=>{velocidad=+e.target.value;document.querySelector("#velocidad-valor").value=`${velocidad.toFixed(1)}×`;});
function animar(t=0) { requestAnimationFrame(animar); const dt=Math.min(.05,(t-tiempoAnterior)/1000||0); tiempoAnterior=t; rutas.forEach((r,i)=>{r.progreso=(r.progreso+dt*.035*velocidad)%1; const curva=i%2?r.curvaNorte:r.curvaSur; const posicion=curva.getPointAt(r.progreso); r.bandada.position.copy(posicion); r.bandada.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),posicion.clone().normalize()); r.bandada.rotateZ(Math.sin(t*.003+i)*.16);}); rutasAdicionales.forEach((r,i)=>{r.progreso=(r.progreso+dt*.035*velocidad)%1; const curva=i%2?r.curvaNorte:r.curvaSur; const posicion=curva.getPointAt(r.progreso); r.bandada.position.copy(posicion); r.bandada.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),posicion.clone().normalize()); r.bandada.rotateZ(Math.sin(t*.003+i)*.16);}); controles.update(); renderer.render(escena,camara); }
function ajustar(){camara.aspect=viewport.clientWidth/viewport.clientHeight;camara.updateProjectionMatrix();renderer.setSize(viewport.clientWidth,viewport.clientHeight);} window.addEventListener("resize",ajustar);
document.querySelector("#actualizacion-label").textContent=new Intl.DateTimeFormat("es-CL",{dateStyle:"medium"}).format(new Date());
crearRutas(); crearMarcadoresSector(); cargarContornos(); cargarYCrearRutasMigracion(); animar();
