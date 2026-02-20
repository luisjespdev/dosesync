/**
 * DoseSync - Web App Integrada con Firebase
 * Paso 2A: Edición de Medicamentos y Vinculación Privada
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, onSnapshot, query, where, orderBy, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCyvwbjWl1CX9cHu1jKFnvW-7KvJg2A4-A",
  authDomain: "dosesync2026.firebaseapp.com",
  projectId: "dosesync2026",
  storageBucket: "dosesync2026.firebasestorage.app",
  messagingSenderId: "816346985499",
  appId: "1:816346985499:web:708b2522469ae9130734be"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let userData = null; 
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
const btnOnboardingNext = document.getElementById('btn-onboarding-next');
const btnLogoutPatient = document.getElementById('btn-logout-patient');
const btnLogoutNurse = document.getElementById('btn-logout-nurse');

// Mostrar/Ocultar campo de código según el rol
document.getElementById('rol').addEventListener('change', (e) => {
  const containerCodigo = document.getElementById('container-codigo');
  containerCodigo.style.display = (e.target.value === 'paciente') ? 'block' : 'none';
});

// ---------- ESTADO DE AUTENTICACIÓN ----------
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const userDoc = await getDoc(doc(db, "usuarios", user.uid));
    
    if (userDoc.exists()) {
      userData = userDoc.data();
      if (userData.rol === 'enfermero') showAppNurse();
      else showApp();
    }
  } else {
    currentUser = null;
    userData = null;
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
  
  setOnboardingSlide(0);
  btnOnboardingNext.removeEventListener('click', onOnboardingNext); 
  btnOnboardingNext.addEventListener('click', onOnboardingNext);
}

function setOnboardingSlide(index) {
  const slides = document.querySelectorAll('.onboarding-slide');
  slides.forEach((s, i) => s.classList.toggle('active', i === index));
  const isLast = index === slides.length - 1;
  btnOnboardingNext.textContent = isLast ? 'Comenzar' : 'Siguiente';
}

function onOnboardingNext() {
  const slides = document.querySelectorAll('.onboarding-slide');
  const current = document.querySelector('.onboarding-slide.active');
  const currentIndex = parseInt(current.getAttribute('data-slide') || 0, 10);
  const nextIndex = currentIndex + 1;

  if (nextIndex >= slides.length) {
    localStorage.setItem('dosesync_onboarding_done', 'true');
    showLogin();
  } else {
    setOnboardingSlide(nextIndex);
  }
}

// ---------- LOGIN Y REGISTRO ----------
function showLogin() {
  onboarding.classList.add('hidden');
  loginSection.classList.remove('hidden');
  appMain.classList.add('hidden');
  appNurse.classList.add('hidden');
}

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert("Error: Verifica tu correo o contraseña.");
  }
});

btnRegistrar.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rol = document.getElementById('rol').value;
  const codigoInput = document.getElementById('codigo-medico').value.trim().toUpperCase();
  
  if (!email || password.length < 6) {
    alert("Ingresa un email válido y una contraseña de al menos 6 caracteres.");
    return;
  }

  if (rol === 'paciente' && !codigoInput) {
    alert("Como paciente, debes ingresar el código proporcionado por tu médico para vincular tu cuenta.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    let dataToSave = { email: email, rol: rol };
    
    if (rol === 'enfermero') {
      const uniqueCode = "MED-" + Math.random().toString(36).substring(2, 6).toUpperCase();
      dataToSave.miCodigoMedico = uniqueCode;
    } else {
      dataToSave.codigoVinculado = codigoInput;
    }

    await setDoc(doc(db, "usuarios", user.uid), dataToSave);
    alert("¡Cuenta creada y vinculada con éxito!");
  } catch (error) {
    alert("Error al registrar: " + error.message);
  }
});

btnLogoutPatient.addEventListener('click', () => signOut(auth));
btnLogoutNurse.addEventListener('click', () => signOut(auth));

// ---------- INTERFAZ PACIENTE ----------
function showApp() {
  onboarding.classList.add('hidden');
  loginSection.classList.add('hidden');
  appNurse.classList.add('hidden');
  appMain.classList.remove('hidden');
  
  navItems.forEach(item => item.addEventListener('click', onNavClick));
  loadCuriosidades();
  listenMedicamentos();
  listenHistorial();
}

function onNavClick(e) {
  const screenId = e.currentTarget.getAttribute('data-screen');
  screens.forEach(s => s.classList.toggle('active', s.id.replace('screen-', '') === screenId));
  navItems.forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-screen') === screenId);
  });
}

function loadCuriosidades() {
  const contenedor = document.getElementById('home-curiosidades');
  contenedor.innerHTML = '<div class="curiosidad-card"><h4>Hora de toma</h4><p>Tomar los medicamentos a la misma hora cada día ayuda a mantener niveles estables en sangre.</p></div>';
}

// Lógica de Guardar / Editar Medicamento
document.getElementById('form-medicamento').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('med-id').value;
  const nombre = document.getElementById('med-nombre').value.trim();
  const dosis = document.getElementById('med-dosis').value.trim();
  const hora = document.getElementById('med-hora').value;

  if (id) {
    // ACTUALIZAR
    await updateDoc(doc(db, "medicamentos", id), {
      nombre: nombre,
      dosis: dosis,
      hora: hora
    });
    document.getElementById('btn-guardar-med').textContent = "Guardar en la nube";
    document.getElementById('btn-cancelar-edicion').classList.add('hidden');
  } else {
    // CREAR
    await addDoc(collection(db, "medicamentos"), {
      uid: currentUser.uid,
      nombre: nombre,
      dosis: dosis,
      hora: hora,
      creadoEn: new Date().toISOString()
    });
  }

  document.getElementById('form-medicamento').reset();
  document.getElementById('med-id').value = "";
});

document.getElementById('btn-cancelar-edicion').addEventListener('click', () => {
  document.getElementById('form-medicamento').reset();
  document.getElementById('med-id').value = "";
  document.getElementById('btn-guardar-med').textContent = "Guardar en la nube";
  document.getElementById('btn-cancelar-edicion').classList.add('hidden');
});

function listenMedicamentos() {
  const q = query(collection(db, "medicamentos"), where("uid", "==", currentUser.uid));
  onSnapshot(q, (snapshot) => {
    const lista = document.getElementById('lista-medicamentos');
    lista.innerHTML = '';
    clearAllTimeouts();

    snapshot.forEach((docSnap) => {
      const m = docSnap.data();
      const id = docSnap.id;
      
      lista.innerHTML += `
        <li class="medicamento-item">
          <div class="medicamento-info">
            <strong>${escapeHtml(m.nombre)}</strong>
            <span>${escapeHtml(m.dosis)} · ${escapeHtml(m.hora)}</span>
          </div>
          <div class="medicamento-actions">
            <button class="btn btn-sm btn-secondary" onclick="editarMed('${id}', '${escapeHtml(m.nombre)}', '${escapeHtml(m.dosis)}', '${escapeHtml(m.hora)}')">Editar</button>
            <button class="btn btn-sm btn-danger" onclick="eliminarMed('${id}')">Borrar</button>
          </div>
        </li>`;
      
      programarAlarma(id, m.nombre, m.hora);
    });
  });
}

window.editarMed = function(id, nombre, dosis, hora) {
  document.getElementById('med-id').value = id;
  document.getElementById('med-nombre').value = nombre;
  document.getElementById('med-dosis').value = dosis;
  document.getElementById('med-hora').value = hora;
  
  document.getElementById('btn-guardar-med').textContent = "Actualizar";
  document.getElementById('btn-cancelar-edicion').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.eliminarMed = async function(docId) {
  await deleteDoc(doc(db, "medicamentos", docId));
}

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

// ---------- ALARMAS Y TOMAS ----------
function programarAlarma(id, nombre, hora) {
  const now = new Date();
  const [hh, mm] = hora.split(':').map(Number);
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = Math.max(0, next - now);

  recordatorioTimeouts[id] = setTimeout(() => mostrarAlerta(nombre, hora), delay);
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

  const nuevoBtnTomado = btnTomado.cloneNode(true);
  const nuevoBtnOmitido = btnOmitido.cloneNode(true);
  btnTomado.replaceWith(nuevoBtnTomado);
  btnOmitido.replaceWith(nuevoBtnOmitido);

  nuevoBtnTomado.addEventListener('click', () => registrarToma(nombre, hora, 'tomado', modal));
  nuevoBtnOmitido.addEventListener('click', () => registrarToma(nombre, hora, 'omitido', modal));
}

async function registrarToma(medicamento, hora, estado, modal) {
  modal.classList.add('hidden');
  await addDoc(collection(db, "historial"), {
    uid: currentUser.uid,
    pacienteEmail: currentUser.email,
    codigoMedico: userData.codigoVinculado,
    medicamento: medicamento,
    hora: hora,
    estado: estado,
    fecha: new Date().toISOString()
  });
}

// ---------- INTERFAZ ENFERMERO ----------
function showAppNurse() {
  onboarding.classList.add('hidden');
  loginSection.classList.add('hidden');
  appMain.classList.add('hidden');
  appNurse.classList.remove('hidden');

  document.getElementById('display-codigo-medico').textContent = userData.miCodigoMedico;

  const q = query(collection(db, "historial"), where("codigoMedico", "==", userData.miCodigoMedico), orderBy("fecha", "desc"));
  
  onSnapshot(q, (snapshot) => {
    const lista = document.getElementById('lista-pacientes');
    lista.innerHTML = '';
    
    if (snapshot.empty) {
      lista.innerHTML = '<li class="historial-empty">Aún no hay pacientes vinculados que hayan registrado tomas.</li>';
      return;
    }

    snapshot.forEach((docSnap) => {
      const h = docSnap.data();
      const estadoLabel = h.estado === 'tomado' ? '✅ Tomado' : '❌ Omitido';
      const date = new Date(h.fecha);
      const fechaLocal = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

      lista.innerHTML += `
        <li class="medicamento-item">
          <div class="medicamento-info">
            <strong>${escapeHtml(h.pacienteEmail)}</strong>
            <span>${escapeHtml(h.medicamento)} (${escapeHtml(h.hora)})</span>
            <div style="font-size: 0.75rem; color: #888; margin-top:4px;">Reportado a las: ${fechaLocal}</div>
          </div>
          <span class="estado ${h.estado}">${estadoLabel}</span>
        </li>`;
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
