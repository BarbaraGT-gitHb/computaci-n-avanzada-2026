import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const valoresIniciales = { columnas: 96, filas: 64, separacion: 1.2, amplitud: 3, frecuencia: 0.4, rotacion: 0.3, aleatoriedad: 0, semilla: 42 };
const parametros = { ...valoresIniciales };
const audio = { contexto: null, analizador: null, datos: null, datosTiempo: null, intensidad: 0, agudos: 0, bajos: 0, graves: 0, rms: 0, aplauso: 0 };

const viewport = document.querySelector("#viewport");
const escena = new THREE.Scene();
escena.background = new THREE.Color(0x101115);
const camara = new THREE.PerspectiveCamera(42, viewport.clientWidth / viewport.clientHeight, 0.1, 200);
camara.position.set(0, 2.4, 15.5);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(viewport.clientWidth, viewport.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.appendChild(renderer.domElement);
const controlesOrbita = new OrbitControls(camara, renderer.domElement);
controlesOrbita.enableDamping = true;
controlesOrbita.minDistance = 8;
controlesOrbita.maxDistance = 28;
escena.add(new THREE.HemisphereLight(0xe9eef8, 0x18100d, 1.8));
const luz = new THREE.DirectionalLight(0xffffff, 2.4);
luz.position.set(6, 8, 10);
escena.add(luz);

const grupoEsfera = new THREE.Group();
escena.add(grupoEsfera);
let esfera, posicionesBase, normalesBase, colores;
// Paleta de alto contraste: índigo profundo, cian eléctrico, ámbar solar y rojo neón.
const colorBase = new THREE.Color(0x17102f);
const colorIntenso = new THREE.Color(0x00d9ff);
const colorBeige = new THREE.Color(0xe231ff);
const colorGrave = new THREE.Color(0xff245d);
const colorActual = new THREE.Color();
const vector = new THREE.Vector3();

function crearEsfera() {
  grupoEsfera.clear();
  const geometria = new THREE.SphereGeometry(4.4 * parametros.separacion, parametros.columnas, parametros.filas);
  posicionesBase = geometria.attributes.position.array.slice();
  normalesBase = geometria.attributes.normal.array.slice();
  colores = new Float32Array(posicionesBase.length);
  geometria.setAttribute("color", new THREE.BufferAttribute(colores, 3));
  esfera = new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.26, metalness: 0.3, emissive: 0x09031c, emissiveIntensity: 0.42, transparent: true, opacity: 0.94, side: THREE.DoubleSide }));
  grupoEsfera.add(esfera);
}

function energiaBanda(desdeHz, hastaHz) {
  if (!audio.datos || !audio.contexto) return 0;
  const anchoBin = audio.contexto.sampleRate / 2 / audio.datos.length;
  const inicio = Math.max(0, Math.floor(desdeHz / anchoBin));
  const fin = Math.min(audio.datos.length - 1, Math.ceil(hastaHz / anchoBin));
  let suma = 0;
  for (let i = inicio; i <= fin; i++) suma += audio.datos[i];
  return suma / Math.max(1, fin - inicio + 1) / 255;
}

function actualizarAudio() {
  if (!audio.analizador || !audio.datos) return;
  audio.analizador.getByteFrequencyData(audio.datos);
  audio.analizador.getByteTimeDomainData(audio.datosTiempo);
  let sumaCuadrados = 0;
  for (const muestra of audio.datosTiempo) sumaCuadrados += ((muestra - 128) / 128) ** 2;
  const rmsInstantaneo = Math.sqrt(sumaCuadrados / audio.datosTiempo.length);
  const objetivo = {
    graves: energiaBanda(20, 80),
    bajos: energiaBanda(80, 450),
    agudos: energiaBanda(3000, 9000),
    intensidad: audio.datos.reduce((suma, valor) => suma + valor, 0) / audio.datos.length / 255,
    rms: rmsInstantaneo,
  };
  const golpeRapido = rmsInstantaneo - audio.rms;
  audio.aplauso = Math.max(audio.aplauso * 0.89, golpeRapido > 0.045 && objetivo.agudos > 0.025 ? 1 : 0);
  for (const banda of Object.keys(objetivo)) audio[banda] += (objetivo[banda] - audio[banda]) * 0.16;
}

// Anillos que avanzan sobre la esfera desde cuatro focos distintos.
function ondaAnular(normal, foco, densidad, fase, grosor) {
  const distancia = Math.acos(THREE.MathUtils.clamp(normal.dot(foco), -1, 1));
  return Math.pow(Math.max(0, Math.sin(distancia * densidad - fase)), grosor);
}

function actualizarEsfera(tiempo) {
  if (!esfera) return;
  const t = tiempo * 0.001;
  const focoIntenso = new THREE.Vector3(Math.cos(t * 0.31), Math.sin(t * 0.47) * 0.55, Math.sin(t * 0.31)).normalize();
  const focoAgudo = new THREE.Vector3(Math.cos(-t * 0.7 + 1.8), Math.sin(t * 0.9) * 0.8, Math.sin(-t * 0.7 + 1.8)).normalize();
  const focoBajo = new THREE.Vector3(Math.cos(t * 0.18 + 3.4), Math.sin(t * 0.36) * 0.35, Math.sin(t * 0.18 + 3.4)).normalize();
  const focoGrave = new THREE.Vector3(0, -0.7, 0.7).normalize();
  const posicion = esfera.geometry.attributes.position;
  const atributoColor = esfera.geometry.attributes.color;
  // Escala generosa para que los picos sean legibles incluso a distancia.
  const amplitud = parametros.amplitud * 0.78;
  const abstraccion = Math.pow(audio.intensidad, 0.72);
  for (let i = 0; i < posicion.count; i++) {
    const n = i * 3;
    const normal = vector.set(normalesBase[n], normalesBase[n + 1], normalesBase[n + 2]);
    const intensa = ondaAnular(normal, focoIntenso, 5.2 + parametros.frecuencia * 4, t * 4.8, 5.2) * audio.intensidad;
    // Agudos: más anillos y un perfil cerrado, por lo que la onda es delgada.
    const aguda = ondaAnular(normal, focoAgudo, 12 + parametros.frecuencia * 7, t * 8.2, 12) * audio.agudos;
    const baja = ondaAnular(normal, focoBajo, 4.1, t * 2.6, 5) * audio.bajos;
    const grave = ondaAnular(normal, focoGrave, 2.7, t * 1.7, 5.5) * audio.graves;
    const variacion = parametros.aleatoriedad * 0.035 * Math.sin(i * 0.13 + parametros.semilla * 0.7 + t * 0.7);
    const pliegue = Math.sin(normal.x * 9 + normal.y * 5 + t * 2.3) * Math.cos(normal.z * 7 - t * 1.4);
    const elevacion = variacion + amplitud * (intensa * 2.7 + aguda * 2 + baja * 1.05 + grave * 0.68 + abstraccion * (0.5 + pliegue * 0.75));
    posicion.array[n] = posicionesBase[n] + normal.x * elevacion;
    posicion.array[n + 1] = posicionesBase[n + 1] + normal.y * elevacion;
    posicion.array[n + 2] = posicionesBase[n + 2] + normal.z * elevacion;
    colorActual.copy(colorBase).lerp(colorIntenso, Math.min(1, intensa * 2.4 + aguda * 2));
    if (baja > intensa + aguda) colorActual.lerp(colorBeige, Math.min(1, baja * 2.1));
    if (grave > intensa + aguda + baja) colorActual.lerp(colorGrave, Math.min(0.82, grave * 1.85));
    colores[n] = colorActual.r; colores[n + 1] = colorActual.g; colores[n + 2] = colorActual.b;
  }
  grupoEsfera.rotation.y = t * parametros.rotacion * 0.14;
  // El aplauso convierte la esfera en una mancha: casi sin altura y expandida de forma desigual.
  grupoEsfera.scale.set(
    1 + audio.aplauso * 1.1,
    Math.max(0.012, 1 - audio.aplauso * 0.988),
    1 + audio.aplauso * 1.65
  );
  posicion.needsUpdate = true;
  atributoColor.needsUpdate = true;
  esfera.geometry.computeVertexNormals();
}

async function activarMicrofono() {
  const boton = document.querySelector("#audio");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audio.contexto = new AudioContext();
    audio.analizador = audio.contexto.createAnalyser();
    audio.analizador.fftSize = 1024;
    audio.analizador.smoothingTimeConstant = 0.72;
    audio.datos = new Uint8Array(audio.analizador.frequencyBinCount);
    audio.datosTiempo = new Uint8Array(audio.analizador.fftSize);
    audio.contexto.createMediaStreamSource(stream).connect(audio.analizador);
    boton.textContent = "Micrófono activo";
  } catch (error) { boton.textContent = "Activar micrófono"; console.error("No se pudo acceder al micrófono:", error); }
}

const controles = Object.fromEntries(["columnas", "filas", "separacion", "amplitud", "frecuencia", "rotacion", "aleatoriedad", "semilla"].map((nombre) => [nombre, document.querySelector(`#${nombre}`)]));
const valoresVisibles = Object.fromEntries(Object.keys(controles).map((nombre) => [nombre, document.querySelector(`#${nombre}-valor`)]));
function actualizarParametro(nombre, valor) {
  const entero = ["columnas", "filas", "semilla"].includes(nombre);
  parametros[nombre] = entero ? Number.parseInt(valor, 10) : Number.parseFloat(valor);
  valoresVisibles[nombre].value = entero ? parametros[nombre] : parametros[nombre].toFixed(2);
  crearEsfera();
}
Object.entries(controles).forEach(([nombre, control]) => control.addEventListener("input", (evento) => actualizarParametro(nombre, evento.target.value)));
const botonAudio = document.createElement("button");
botonAudio.id = "audio"; botonAudio.type = "button"; botonAudio.textContent = "Activar micrófono";
botonAudio.addEventListener("click", activarMicrofono);
document.querySelector(".actions").prepend(botonAudio);
document.querySelector("#regenerar").addEventListener("click", () => { parametros.semilla = Math.floor(Math.random() * 100) + 1; controles.semilla.value = parametros.semilla; valoresVisibles.semilla.value = parametros.semilla; crearEsfera(); });
document.querySelector("#restablecer").addEventListener("click", () => { Object.assign(parametros, valoresIniciales); Object.entries(controles).forEach(([nombre, control]) => { control.value = parametros[nombre]; valoresVisibles[nombre].value = ["columnas", "filas", "semilla"].includes(nombre) ? parametros[nombre] : parametros[nombre].toFixed(2); }); crearEsfera(); });
function animar(tiempo) { requestAnimationFrame(animar); actualizarAudio(); actualizarEsfera(tiempo); controlesOrbita.update(); renderer.render(escena, camara); }
window.addEventListener("resize", () => { camara.aspect = viewport.clientWidth / viewport.clientHeight; camara.updateProjectionMatrix(); renderer.setSize(viewport.clientWidth, viewport.clientHeight); });
crearEsfera();
animar(0);
