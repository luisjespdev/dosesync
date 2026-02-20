/**
 * DoseSync - PWA Integrada con Firebase
 * Backend: Firebase Auth (Login) y Firestore (Base de datos en tiempo real)
 */

// 1. Importaciones de Firebase (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot, query, where, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCyvwbjWl1CX9cHu1jKFnvW-7KvJg2A4-A",
  authDomain: "dosesync2026.firebaseapp.com",
  projectId: "dosesync2026",
  storageBucket: "dosesync2026.firebasestorage.app",
  messagingSenderId: "816346985499",
  appId: "1:816346985499:web:708b2522469ae9130734be"
};

// 3. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables Globales
let currentUser = null;
let currentUserRole = null;
let recordatorioTimeouts = {};

// Referencias DOM
const onboarding = document.getElementById('onboarding');
const loginSection = document.getElementById('login');
const appMain = document.getElementById('app-main');
const appNurse = document.getElementById('app-nurse');
const formLogin = document.getElementById('form-login');
const btnRegistrar = document.getElementById('btn-registrar');
const navItems = document.querySelectorAll('.nav-item');
const screens = document.querySelectorAll('.screen');

// ---------- ESTADO DE AUTENTICACIÓN (EL CEREBRO DE LA APP) ----------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // Usuario logueado
    currentUser = user;
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    
    if (userDoc.exists()) {
      currentUserRole = userDoc.data().rol;
      if (currentUserRole === 'enfermero') {
        showAppNurse();
      } else {
        showApp();
      }
    }
  } else {
    // Usuario desconectado
    currentUser = null;
    currentUserRole = null;
    clearAllTimeouts();
    const onboardingDone = localStorage.getItem('dosesync_onboarding_done') === 'true';
    if (!onboardingDone) showOnboarding();
    else showLogin();
  }
});

// ---------- ONBOARDING ----------
function showOnboarding() {
  onboarding.classList.remove('hidden');
  loginSection.classList.add('hidden');
  appMain.classList.add('hidden');
  appNurse.classList.add('hidden');
  document.getElementById('btn-onboarding-next').addEventListener('click', () => {
    localStorage.setItem('dosesync_onboarding_done', 'true');
    showLogin();
  });
}

// ---------- LOGIN Y REGISTRO ----------
function showLogin() {
  onboarding.classList.add('hidden');
  loginSection.classList.remove('hidden');
  appMain.classList.add('hidden');
  appNurse.classList.add('hidden');
}

// Entrar
formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged se disparará automáticamente
  } catch (error) {
    alert("Error al entrar: Revisa tu contraseña o correo.");
  }
});

// Registrar
btnRegistrar.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rol = document.getElementById('rol').value;
  
  if (!email || password.length < 6) {
    alert("Ingresa un email válido y una contraseña de al menos 6 caracteres.");
    return;
  }

  try {
    // 1. Crea el usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // 2. Guarda su rol en la base de datos Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      email: email,
      rol: rol
    });
    alert("¡Cuenta creada con éxito!");
  } catch (error) {
    alert("Error al registrar: " + error.message);
  }
});

// Botones de Salir
document.getElementById('btn-logout-patient').addEventListener('click', () => signOut(auth));
document.getElementById('btn-logout-nurse').addEventListener('click', () => signOut(auth));

// ---------- INTERFAZ PACIENTE ----------
function showApp() {
  onboarding.classList.add('hidden');
  loginSection.classList.add('hidden');
  appNurse.classList.add('hidden');
  appMain.classList.remove('hidden');
  
  navItems.forEach(item => item.addEventListener('click', onNavClick));
  loadCuriosidades();
  
  // Activar escucha en tiempo real de Firebase para este paciente
  listenMedicamentos();
  listenHistorial();
}

function onNavClick(e) {
  const screenId = e.currentTarget.getAttribute('data-screen');
  screens.forEach(s => s.classList.toggle('active', s.id.replace('screen-', '') === screenId));
  navItems.forEach(item => {
    const isActive = item.getAttribute('data-screen') === screenId;
    item.classList.toggle('active', isActive);
  });
}

function loadCuriosidades() {
  const contenedor = document.getElementById('home-curiosidades');
  contenedor.innerHTML = '<div class="curiosidad-card"><h4>Hora de toma</h4><p>Tomar los medicamentos a la misma hora cada día ayuda a mantener niveles estables en sangre y mejora la adherencia.</p></div>';
}

// ---------- FIRESTORE: PACIENTES (GUARDAR Y LEER) ----------

// Guardar nuevo medicamento en Firestore
document.getElementById('form-medicamento').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nombre = document.getElementById('med-nombre').value.trim();
  const dosis = document.getElementById('med-dosis').value.trim();
  const hora = document.getElementById('med-hora').value;

  await addDoc(collection(db, "medicamentos"), {
    uid: currentUser.uid,
    nombre: nombre,
    dosis: dosis,
    hora: hora,
    creadoEn: new Date().toISOString()
  });

  document.getElementById('form-medicamento').reset();
});

// Escuchar medicamentos del paciente en Tiempo Real
function listenMedicamentos() {
  const q = query(collection(db, "medicamentos"), where("uid", "==", currentUser.uid));
  onSnapshot(q, (snapshot) => {
    const lista = document.getElementById('lista-medicamentos');
    lista.innerHTML = '';
    clearAllTimeouts(); // Limpiar alarmas viejas

    snapshot.forEach((docSnap) => {
      const m = docSnap.data();
      const id = docSnap.id;
      
      // Mostrar en pantalla
      lista.innerHTML += `
        <li class="medicamento-item">
          <div class="medicamento-info">
            <strong>${escapeHtml(m.nombre)}</strong>
            <span>${escapeHtml(m.dosis)} · ${escapeHtml(m.hora)}</span>
          </div>
          <button class="btn btn-sm btn-danger" onclick="eliminarMed('${id}')">Borrar</button>
        </li>`;
      
      // Programar alarma
      programarAlarma(id, m.nombre, m.hora);
    });
  });
}

// Eliminar medicamento de Firestore (debe ser global para el onclick)
window.eliminarMed = async function(docId) {
  await deleteDoc(doc(db, "medicamentos", docId));
}

// Escuchar historial del paciente en Tiempo Real
function listenHistorial() {
  const q = query(collection(db, "historial"), where("uid", "==", currentUser.uid), orderBy("fecha", "desc"));
  onSnapshot(q, (snapshot) => {
    const lista = document.getElementById('lista-historial');
    lista.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const h = docSnap.data();
      const estadoLabel = h.estado === 'tomado' ? '✅ Tomado' : '❌ Omitido';
      lista.innerHTML += `
        <li class="historial-item">
          <div><strong>${escapeHtml(h.medicamento)}</strong><br><span>${escapeHtml(h.hora)}</span></div>
          <span class="estado ${h.estado}">${estadoLabel}</span>
        </li>`;
    });
  });
}

// ---------- ALARMAS Y REGISTRO DE TOMAS ----------
function programarAlarma(id, nombre, hora) {
  const now = new Date();
  const [hh, mm] = hora.split(':').map(Number);
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = Math.max(0, next - now);

  recordatorioTimeouts[id] = setTimeout(() => {
    mostrarAlerta(nombre, hora);
  }, delay);
}

function clearAllTimeouts() {
  Object.values(recordatorioTimeouts).forEach(clearTimeout);
  recordatorioTimeouts = {};
}

function mostrarAlerta(nombre, hora) {
  const modal = document.getElementById('modal-recordatorio');
  document.getElementById('modal-recordatorio-titulo').textContent = `Hora de tomar: ${nombre}`;
  modal.classList.remove('hidden');

  const btnTomado = document.getElementById('modal-btn-tomado');
  const btnOmitido = document.getElementById('modal-btn-omitido');

  // Clonamos botones para quitar event listeners anteriores
  const nuevoBtnTomado = btnTomado.cloneNode(true);
  const nuevoBtnOmitido = btnOmitido.cloneNode(true);
  btnTomado.replaceWith(nuevoBtnTomado);
  btnOmitido.replaceWith(nuevoBtnOmitido);

  nuevoBtnTomado.addEventListener('click', () => registrarToma(nombre, hora, 'tomado', modal));
  nuevoBtnOmitido.addEventListener('click', () => registrarToma(nombre, hora, 'omitido', modal));
}

async function registrarToma(medicamento, hora, estado, modal) {
  modal.classList.add('hidden');
  // Guardar en Firestore (¡El enfermero verá esto en tiempo real!)
  await addDoc(collection(db, "historial"), {
    uid: currentUser.uid,
    pacienteEmail: currentUser.email, // Ayudará al enfermero a saber de quién es
    medicamento: medicamento,
    hora: hora,
    estado: estado,
    fecha: new Date().toISOString()
  });
}

// ---------- INTERFAZ ENFERMERO (TIEMPO REAL) ----------
function showAppNurse() {
  onboarding.classList.add('hidden');
  loginSection.classList.add('hidden');
  appMain.classList.add('hidden');
  appNurse.classList.remove('hidden');

  // El enfermero escucha TODO el historial de todos los pacientes en tiempo real
  const q = query(collection(db, "historial"), orderBy("fecha", "desc"));
  onSnapshot(q, (snapshot) => {
    const lista = document.getElementById('lista-pacientes');
    lista.innerHTML = '';
    
    if (snapshot.empty) {
      lista.innerHTML = '<li class="historial-empty">Aún no hay registros de pacientes.</li>';
      return;
    }

    snapshot.forEach((docSnap) => {
      const h = docSnap.data();
      const estadoLabel = h.estado === 'tomado' ? '✅ Tomado' : '❌ Omitido';
      
      // Extraer solo la hora de la fecha para mostrar (HH:MM)
      const date = new Date(h.fecha);
      const fechaLocal = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

      lista.innerHTML += `
        <li class="medicamento-item">
          <div class="medicamento-info">
            <strong>${escapeHtml(h.pacienteEmail)}</strong>
            <span>${escapeHtml(h.medicamento)} (${escapeHtml(h.hora)})</span>
            <div style="font-size: 0.75rem; color: #888; margin-top:4px;">Reportado a las: ${fechaLocal}</div>
          </div>
          <span class="estado ${h.estado}" style="font-weight:bold; padding:0.25rem; border-radius:4px;">${estadoLabel}</span>
        </li>`;
    });
  });
}

// Utilidad de seguridad
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
