import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// Atlas migratorio · Sterna paradisaea
// Los corredores son una generalización espacial de las nueve series de seguimiento.
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

const puntosMigracion = [
  { nombre:"ALASKA", lat:62, lon:-165, temporada:"Abril–agosto", fase:"Llegada y reproducción", detalle:"Zona de reproducción en el extremo norte. La presencia aumenta durante la primavera y el verano boreal." },
  { nombre:"PACÍFICO NORTE", lat:27, lon:-158, temporada:"Agosto–octubre", fase:"Migración hacia el sur", detalle:"Inicio del corredor oceánico hacia el hemisferio sur durante el final del verano boreal." },
  { nombre:"PACÍFICO SUR", lat:-31, lon:-110, temporada:"Octubre–noviembre", fase:"Tránsito hacia el sur", detalle:"El ave continúa desplazándose hacia latitudes australes durante la primavera austral." },
  { nombre:"OCÉANO AUSTRAL", lat:-62, lon:-50, temporada:"Noviembre–febrero", fase:"Estadía austral", detalle:"Periodo de alimentación y permanencia en el hemisferio sur antes del retorno hacia el norte." },
];

let cantidad = 9, velocidad = 1;
let rutas = [], objetosInteractivos = [], marcadores = [], tiempoAnterior = 0;

const viewport = document.querySelector("#viewport");
const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(40, viewport.clientWidth / viewport.clientHeight, .1, 100);
// Vista inicial atlántica: permite leer América, Europa y África, mientras el usuario puede rotar para Asia/Oceanía.
camara.position.set(14, 8.5, 18.5);
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);

const controles = new OrbitControls(camara, renderer.domElement);
controles.enableDamping = true;
controles.dampingFactor = .055;
controles.minDistance = 11;
controles.maxDistance = 32;
controles.enablePan = false;

escena.add(new THREE.HemisphereLight(0xbfe6ed, 0x071015, 2.1));
const luz = new THREE.DirectionalLight(0xffffff, 2.0);
luz.position.set(10, 11, 14);
escena.add(luz);

const globo = new THREE.Mesh(
  new THREE.SphereGeometry(R, 96, 64),
  new THREE.MeshPhongMaterial({ color:0x0b2530, emissive:0x041216, shininess:8, transparent:true, opacity:.98 })
);
escena.add(globo);

const reticula = new THREE.Mesh(
  new THREE.SphereGeometry(R + .012, 48, 24),
  new THREE.MeshBasicMaterial({color:0x365562, wireframe:true, transparent:true, opacity:.18})
);
escena.add(reticula);

const grupoContornos = new THREE.Group();
const grupoRutas = new THREE.Group();
const grupoMarcadores = new THREE.Group();
const grupoEtiquetas = new THREE.Group();
escena.add(grupoContornos, grupoRutas, grupoMarcadores, grupoEtiquetas);

function aEsfera(lat, lon, radio = R) {
  const phi = THREE.MathUtils.degToRad(90-lat);
  const theta = THREE.MathUtils.degToRad(lon+180);
  return new THREE.Vector3(
    -radio*Math.sin(phi)*Math.cos(theta),
    radio*Math.cos(phi),
    radio*Math.sin(phi)*Math.sin(theta)
  );
}

function curvaDePuntos(puntos, altura = .7) {
  return new THREE.CatmullRomCurve3(
    puntos.map(([lat, lon]) => aEsfera(lat, lon, R + altura)), false, "centripetal"
  );
}

function crearSiluetaAve(escala, desplazamiento, color=0xffffff) {
  const forma = new THREE.Shape();
  forma.moveTo(-1.05, 0);
  forma.quadraticCurveTo(-.55, .10, -.18, -.05);
  forma.quadraticCurveTo(0, -.28, .18, -.05);
  forma.quadraticCurveTo(.55, .10, 1.05, 0);
  forma.quadraticCurveTo(.52, .38, 0, .12);
  forma.quadraticCurveTo(-.52, .38, -1.05, 0);
  const ave = new THREE.Mesh(
    new THREE.ShapeGeometry(forma),
    new THREE.MeshBasicMaterial({color, side:THREE.DoubleSide, transparent:true, opacity:.92})
  );
  ave.scale.setScalar(escala);
  ave.position.copy(desplazamiento);
  return ave;
}

function crearBandada() {
  const bandada = new THREE.Group();
  const distribucion = [[.16,0,0],[.11,.27,.10],[.12,-.22,.05],[.095,.42,-.04],[.085,-.39,-.08]];
  distribucion.forEach(([escala,x,y],i) => bandada.add(crearSiluetaAve(escala,new THREE.Vector3(x,y,(i%2)*.04))));
  return bandada;
}

function crearRutas() {
  rutas.forEach(r => grupoRutas.remove(r.grupo));
  rutas=[];
  objetosInteractivos=[];
  rutasBase.slice(0,cantidad).forEach((puntos, i) => {
    const curvaSur = curvaDePuntos(puntos, .60 + (i%3)*.07);
    const curvaNorte = curvaDePuntos([...puntos].reverse(), .76 + (i%3)*.07);
    const grupo = new THREE.Group();
    const ida = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curvaSur.getPoints(180)),
      new THREE.LineBasicMaterial({color:0xf36f5e,transparent:true,opacity:.66})
    );
    const vuelta = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curvaNorte.getPoints(180)),
      new THREE.LineBasicMaterial({color:0x55c7d6,transparent:true,opacity:.50})
    );
    ida.userData = {id:i+1,direccion:"Ida al sur",origen:"Alaska (62° N)",destino:"Océano Austral (61° S)"};
    vuelta.userData = {id:i+1,direccion:"Retorno al norte",origen:"Océano Austral (61° S)",destino:"Alaska (62° N)"};
    const bandada = crearBandada();
    grupo.add(ida,vuelta,bandada);
    grupoRutas.add(grupo);
    rutas.push({grupo,ida,vuelta,bandada,curvaSur,curvaNorte,progreso:(i/rutasBase.length)%1});
    objetosInteractivos.push(ida,vuelta);
  });
}

function dibujarContornos(geojson) {
  grupoContornos.clear();
  const geometries = geojson.features.flatMap(f => {
    const g=f.geometry;
    return g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
  });
  geometries.forEach(poligono => poligono.forEach(anillos => anillos.forEach(anillo => {
    const pts = anillo.map(([lon,lat]) => aEsfera(lat,lon,R+.045));
    if (pts.length > 1) {
      grupoContornos.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({color:0xc9d7d9,transparent:true,opacity:.48})
      ));
    }
  })));
}

function crearRellenoContinentes(geojson) {
  // Mapa equirectangular usado como máscara sobre la esfera: tierra gris azulada,
  // océano intacto y una lectura cartográfica más cercana a la referencia.
  const canvas = document.createElement("canvas");
  canvas.width = 4096; canvas.height = 2048;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const x = lon => (lon + 180) / 360 * canvas.width;
  const y = lat => (90 - lat) / 180 * canvas.height;
  const dibujarPoligono = anillos => {
    ctx.beginPath();
    anillos.forEach(anillo => {
      anillo.forEach(([lon,lat],i) => i===0 ? ctx.moveTo(x(lon),y(lat)) : ctx.lineTo(x(lon),y(lat)));
      ctx.closePath();
    });
    ctx.fillStyle = "rgba(123, 142, 147, .72)";
    ctx.fill("evenodd");
  };
  geojson.features.forEach(({geometry}) => {
    if (geometry.type === "Polygon") dibujarPoligono(geometry.coordinates);
    if (geometry.type === "MultiPolygon") geometry.coordinates.forEach(dibujarPoligono);
  });
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  const materialRelleno = new THREE.ShaderMaterial({
    uniforms:{mapa:{value:textura}}, transparent:true, depthWrite:false,
    vertexShader:`varying vec3 direccion; void main(){ direccion=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`
      uniform sampler2D mapa; varying vec3 direccion; const float PI=3.141592653589793;
      void main(){
        float angulo=atan(direccion.z,-direccion.x);
        float longitud=fract(angulo/(2.0*PI)+.5);
        float latitud=(asin(clamp(direccion.y,-1.0,1.0))+PI*.5)/PI;
        vec4 c=texture2D(mapa,vec2(longitud,1.0-latitud));
        if(c.a<0.01) discard;
        gl_FragColor=c;
      }`
  });
  const relleno = new THREE.Mesh(new THREE.SphereGeometry(R+.022,128,96),materialRelleno);
  escena.add(relleno);
}

function crearTextoSprite(texto, opciones={}) {
  const canvas=document.createElement("canvas");
  canvas.width=900; canvas.height=180;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font=`700 ${opciones.size||42}px Arial, sans-serif`;
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillStyle=opciones.color||"rgba(236,243,242,.75)";
  ctx.shadowColor="rgba(0,0,0,.8)"; ctx.shadowBlur=12;
  ctx.fillText(texto,450,90);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false,opacity:opciones.opacity||.78}));
  sprite.scale.set(opciones.scale||2.25, .45, 1);
  return sprite;
}

function crearEtiquetasContinentes() {
  const continentes=[
    ["AMÉRICA",18,-90,2.7],
    ["EUROPA",51,18,2.05],
    ["ÁFRICA",4,22,2.35],
    ["ASIA",35,96,2.35],
    ["OCEANÍA",-23,135,2.0],
  ];
  continentes.forEach(([nombre,lat,lon,scale])=>{
    const s=crearTextoSprite(nombre,{scale,opacity:.58,size:46});
    s.position.copy(aEsfera(lat,lon,R+.13));
    grupoEtiquetas.add(s);
  });
}

function crearPopArtAveCanvas() {
  const canvas=document.createElement("canvas");
  canvas.width=520; canvas.height=360;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#f4b942"; ctx.fillRect(0,0,520,360);
  // Trama Pop Art.
  for(let y=20;y<360;y+=34) for(let x=18;x<520;x+=34){
    ctx.fillStyle=(x+y)%68===0?"rgba(243,111,94,.72)":"rgba(7,16,21,.12)";
    ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
  }
  // Ala y cuerpo estilizados del charrán ártico.
  ctx.save(); ctx.translate(260,180); ctx.rotate(-.08);
  ctx.fillStyle="#ecf3f2"; ctx.strokeStyle="#071015"; ctx.lineWidth=10;
  ctx.beginPath(); ctx.ellipse(0,35,82,42,-.08,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-45,18); ctx.lineTo(-185,-52); ctx.lineTo(-80,58); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28,10); ctx.lineTo(175,-82); ctx.lineTo(78,66); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle="#071015"; ctx.beginPath(); ctx.arc(70,5,26,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#f36f5e"; ctx.beginPath(); ctx.moveTo(94,3); ctx.lineTo(154,18); ctx.lineTo(94,27); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle="#071015"; ctx.beginPath(); ctx.arc(79,-3,4,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.fillStyle="#071015"; ctx.font="900 28px Arial"; ctx.fillText("STERNA PARADISAEA",24,335);
  return canvas;
}

const popArtTexture=new THREE.CanvasTexture(crearPopArtAveCanvas());
popArtTexture.colorSpace=THREE.SRGBColorSpace;

function crearMarcadorMigracion(punto,index) {
  const grupo=new THREE.Group();
  const pos=aEsfera(punto.lat,punto.lon,R+.30);
  grupo.position.copy(pos);
  const halo=new THREE.Mesh(new THREE.RingGeometry(.14,.25,32),new THREE.MeshBasicMaterial({color:0xf4b942,transparent:true,opacity:.78,side:THREE.DoubleSide}));
  const centro=new THREE.Mesh(new THREE.CircleGeometry(.13,32),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.96}));
  grupo.add(halo,centro);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:popArtTexture,transparent:true,depthWrite:false}));
  sprite.scale.set(1.55,1.08,1); sprite.position.set(0,.72,.05); sprite.userData={tipo:"migracion",index};
  grupo.add(sprite);
  grupo.userData={...punto,index};
  grupoMarcadores.add(grupo);
  marcadores.push(grupo);
}

function crearMarcadoresSector(){
  grupoMarcadores.clear(); marcadores=[];
  puntosMigracion.forEach((p,i)=>crearMarcadorMigracion(p,i));
}

async function cargarContornos(){
  try{
    const r=await fetch(URL_CONTORNOS);
    if(!r.ok) throw Error();
    const geojson=await r.json();
    crearRellenoContinentes(geojson);
    dibujarContornos(geojson);
    crearEtiquetasContinentes();
  }catch(e){
    console.warn("No fue posible cargar el contorno cartográfico.",e);
  }
}

function mostrarRuta(d){
  document.querySelector("#ruta-nombre").textContent=`Corredor generalizado de la serie ${d.id} del archivo.`;
  document.querySelector("#m-direccion").textContent=d.direccion;
  document.querySelector("#m-individuo").textContent=`Ave ${d.id} de 9`;
  document.querySelector("#m-origen").textContent=d.origen;
  document.querySelector("#m-destino").textContent=d.destino;
}

function mostrarMigracion(index){
  const p=puntosMigracion[index];
  document.querySelector("#popart-titulo").textContent=p.nombre;
  document.querySelector("#popart-temporada").textContent=p.temporada;
  document.querySelector("#popart-fase").textContent=p.fase;
  document.querySelector("#popart-detalle").textContent=p.detalle;
  document.querySelector("#popart-card").classList.add("visible");
}

const raycaster=new THREE.Raycaster();
const puntero=new THREE.Vector2();
renderer.domElement.addEventListener("pointerdown",e=>{
  const rect=renderer.domElement.getBoundingClientRect();
  puntero.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(puntero,camara);
  const hitsMarcadores=raycaster.intersectObjects(marcadores.flatMap(g=>g.children),true);
  if(hitsMarcadores.length){
    let o=hitsMarcadores[0].object;
    while(o.parent && !o.userData.tipo && o.parent!==escena) o=o.parent;
    if(o.userData.index!==undefined) mostrarMigracion(o.userData.index);
    return;
  }
  const hit=raycaster.intersectObjects(objetosInteractivos,false)[0];
  if(hit) mostrarRuta(hit.object.userData);
});

document.querySelector("#popart-close").addEventListener("click",()=>document.querySelector("#popart-card").classList.remove("visible"));
document.querySelector("#cantidad").addEventListener("input",e=>{
  cantidad=+e.target.value;
  document.querySelector("#cantidad-valor").value=cantidad;
  document.querySelector("#aves-representadas").textContent=(cantidad*50).toLocaleString("es-CL");
  crearRutas();
});
document.querySelector("#velocidad").addEventListener("input",e=>{
  velocidad=+e.target.value;
  document.querySelector("#velocidad-valor").value=`${velocidad.toFixed(1)}×`;
});

function animar(t=0){
  requestAnimationFrame(animar);
  const dt=Math.min(.05,(t-tiempoAnterior)/1000||0); tiempoAnterior=t;
  rutas.forEach((r,i)=>{
    r.progreso=(r.progreso+dt*.035*velocidad)%1;
    const curva=i%2?r.curvaNorte:r.curvaSur;
    const posicion=curva.getPointAt(r.progreso);
    r.bandada.position.copy(posicion);
    r.bandada.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),posicion.clone().normalize());
    r.bandada.rotateZ(Math.sin(t*.003+i)*.16);
  });
  controles.update();
  renderer.render(escena,camara);
}

function ajustar(){
  camara.aspect=viewport.clientWidth/viewport.clientHeight;
  camara.updateProjectionMatrix();
  renderer.setSize(viewport.clientWidth,viewport.clientHeight);
}
window.addEventListener("resize",ajustar);
document.querySelector("#actualizacion-label").textContent=new Intl.DateTimeFormat("es-CL",{dateStyle:"medium"}).format(new Date());

crearRutas();
crearMarcadoresSector();
cargarContornos();
animar();
