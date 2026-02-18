/**
 * DoseSync - PWA de control de medicación
 * Lógica: onboarding, login local, navegación, recordatorios e historial.
 * Sin frameworks; uso de localStorage.
 */

(function () {
    'use strict';
  
    // ---------- Claves localStorage ----------
    const STORAGE_ONBOARDING = 'dosesync_onboarding_done';
    const STORAGE_USER = 'dosesync_user';
    const STORAGE_MEDICAMENTOS = 'dosesync_medicamentos';
    const STORAGE_HISTORIAL = 'dosesync_historial';
  
    // ---------- Referencias DOM ----------
    const onboarding = document.getElementById('onboarding');
    const loginSection = document.getElementById('login');
    const appMain = document.getElementById('app-main');
    const btnOnboardingNext = document.getElementById('btn-onboarding-next');
    const formLogin = document.getElementById('form-login');
    const formMedicamento = document.getElementById('form-medicamento');
    const navItems = document.querySelectorAll('.nav-item');
    const screens = document.querySelectorAll('.screen');
    const listaMedicamentos = document.getElementById('lista-medicamentos');
    const listaHistorial = document.getElementById('lista-historial');
    const homeCuriosidades = document.getElementById('home-curiosidades');
  
    // Timeouts de recordatorios (para poder cancelar si se elimina medicamento)
    let recordatorioTimeouts = {};
  
    // ---------- Datos curiosos (Home) ----------
    const CURIOSIDADES = [
      { titulo: 'Origen de la aspirina', texto: 'El ácido acetilsalicílico se obtuvo por primera vez de la corteza del sauce blanco. Los antiguos ya usaban la corteza para el dolor.' },
      { titulo: 'Penicilina por casualidad', texto: 'Alexander Fleming descubrió la penicilina en 1928 al observar que un hongo en una placa de cultivo inhibía el crecimiento de bacterias.' },
      { titulo: 'Placebo', texto: 'El efecto placebo puede producir mejoras reales en algunos pacientes, incluso cuando saben que están tomando un placebo en ciertos estudios.' },
      { titulo: 'Medicamentos y sol', texto: 'Algunos medicamentos aumentan la sensibilidad al sol. Conviene leer el prospecto y usar protección solar si se indica.' },
      { titulo: 'Hora de toma', texto: 'Tomar los medicamentos a la misma hora cada día ayuda a mantener niveles estables en sangre y mejora la adherencia al tratamiento.' },
    ];
  
    // ---------- Inicialización al cargar ----------
    function init() {
      // Registrar Service Worker para PWA
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch(function () {});
      }
  
      // Decidir qué mostrar según localStorage
      const onboardingDone = localStorage.getItem(STORAGE_ONBOARDING) === 'true';
      const user = getStoredUser();
  
      if (!onboardingDone) {
        showOnboarding();
        return;
      }
      if (!user) {
        showLogin();
        return;
      }
      showApp();
      // Cargar datos de cada pantalla
      renderHome();
      renderMedicamentos();
      programarRecordatorios();
      renderHistorial();
      initPrevencionToggles();
    }
  
    // ---------- Onboarding ----------
    function showOnboarding() {
      onboarding.classList.remove('hidden');
      loginSection.classList.add('hidden');
      appMain.classList.add('hidden');
      setOnboardingSlide(0);
      btnOnboardingNext.textContent = 'Siguiente';
      btnOnboardingNext.addEventListener('click', onOnboardingNext);
    }
  
    function setOnboardingSlide(index) {
      const slides = document.querySelectorAll('.onboarding-slide');
      slides.forEach(function (s, i) {
        s.classList.toggle('active', i === index);
      });
      const isLast = index === slides.length - 1;
      btnOnboardingNext.textContent = isLast ? 'Comenzar' : 'Siguiente';
    }
  
    function onOnboardingNext() {
      const slides = document.querySelectorAll('.onboarding-slide');
      const current = document.querySelector('.onboarding-slide.active');
      const currentIndex = parseInt(current.getAttribute('data-slide'), 10);
      const nextIndex = currentIndex + 1;
  
      if (nextIndex >= slides.length) {
        localStorage.setItem(STORAGE_ONBOARDING, 'true');
        btnOnboardingNext.removeEventListener('click', onOnboardingNext);
        showLogin();
        return;
      }
      setOnboardingSlide(nextIndex);
    }
  
    // ---------- Login ----------
    function showLogin() {
      onboarding.classList.add('hidden');
      loginSection.classList.remove('hidden');
      appMain.classList.add('hidden');
      formLogin.addEventListener('submit', onLoginSubmit);
    }
  
    function getStoredUser() {
      try {
        const raw = localStorage.getItem(STORAGE_USER);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    }
  
    function onLoginSubmit(e) {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      if (!email) return;
      // Login local: no guardamos contraseña (prototipo)
      localStorage.setItem(STORAGE_USER, JSON.stringify({ email: email }));
      formLogin.removeEventListener('submit', onLoginSubmit);
      showApp();
      renderHome();
      renderMedicamentos();
      programarRecordatorios();
      renderHistorial();
      initPrevencionToggles();
    }
  
    // ---------- App principal ----------
    function showApp() {
      onboarding.classList.add('hidden');
      loginSection.classList.add('hidden');
      appMain.classList.remove('hidden');
      showScreen('home');
      navItems.forEach(function (item) {
        item.addEventListener('click', onNavClick);
      });
    }
  
    function onNavClick(e) {
      const screen = e.currentTarget.getAttribute('data-screen');
      if (screen) showScreen(screen);
    }
  
    function showScreen(screenId) {
      screens.forEach(function (s) {
        const id = s.id.replace('screen-', '');
        s.classList.toggle('active', id === screenId);
      });
      navItems.forEach(function (item) {
        const isActive = item.getAttribute('data-screen') === screenId;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-current', isActive ? 'page' : null);
      });
      if (screenId === 'recordatorios') renderMedicamentos();
      if (screenId === 'historial') renderHistorial();
    }
  
    // ---------- Home: datos curiosos ----------
    function renderHome() {
      if (!homeCuriosidades) return;
      homeCuriosidades.innerHTML = CURIOSIDADES.map(function (c) {
        return (
          '<div class="curiosidad-card">' +
          '<h4>' + escapeHtml(c.titulo) + '</h4>' +
          '<p>' + escapeHtml(c.texto) + '</p>' +
          '</div>'
        );
      }).join('');
    }
  
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  
    // ---------- Recordatorios: medicamentos ----------
    function getMedicamentos() {
      try {
        const raw = localStorage.getItem(STORAGE_MEDICAMENTOS);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        return [];
      }
    }
  
    function setMedicamentos(arr) {
      localStorage.setItem(STORAGE_MEDICAMENTOS, JSON.stringify(arr));
    }
  
    function renderMedicamentos() {
      if (!listaMedicamentos) return;
      const list = getMedicamentos();
      listaMedicamentos.innerHTML = list.map(function (m) {
        return (
          '<li class="medicamento-item" data-id="' + escapeHtml(m.id) + '">' +
          '<div class="medicamento-info">' +
          '<strong>' + escapeHtml(m.nombre) + '</strong>' +
          '<span>' + escapeHtml(m.dosis) + ' · ' + escapeHtml(m.hora) + '</span>' +
          '</div>' +
          '<div class="medicamento-actions">' +
          '<button type="button" class="btn btn-sm btn-danger btn-eliminar-med" aria-label="Eliminar">Eliminar</button>' +
          '</div>' +
          '</li>'
        );
      }).join('');
  
      listaMedicamentos.querySelectorAll('.btn-eliminar-med').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const li = btn.closest('.medicamento-item');
          const id = li.getAttribute('data-id');
          cancelarRecordatorio(id);
          const list = getMedicamentos().filter(function (m) { return m.id !== id; });
          setMedicamentos(list);
          renderMedicamentos();
        });
      });
    }
  
    formMedicamento.addEventListener('submit', function (e) {
      e.preventDefault();
      const nombre = document.getElementById('med-nombre').value.trim();
      const dosis = document.getElementById('med-dosis').value.trim();
      const hora = document.getElementById('med-hora').value;
      if (!nombre || !dosis || !hora) return;
  
      const list = getMedicamentos();
      const id = 'med_' + Date.now();
      list.push({ id: id, nombre: nombre, dosis: dosis, hora: hora, creadoEn: new Date().toISOString() });
      setMedicamentos(list);
  
      formMedicamento.reset();
      renderMedicamentos();
      programarUnRecordatorio(id, nombre, hora);
    });
  
    // ---------- Recordatorios: setTimeout y alerta ----------
    function programarRecordatorios() {
      const list = getMedicamentos();
      list.forEach(function (m) {
        programarUnRecordatorio(m.id, m.nombre, m.hora);
      });
    }
  
    function programarUnRecordatorio(id, nombre, hora) {
      cancelarRecordatorio(id);
      const now = new Date();
      const [hh, mm] = hora.split(':').map(Number);
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const delay = Math.max(0, next - now);
  
      const timeoutId = setTimeout(function () {
        delete recordatorioTimeouts[id];
        mostrarAlertaRecordatorio(id, nombre, hora);
      }, delay);
      recordatorioTimeouts[id] = timeoutId;
    }
  
    function cancelarRecordatorio(id) {
      if (recordatorioTimeouts[id]) {
        clearTimeout(recordatorioTimeouts[id]);
        delete recordatorioTimeouts[id];
      }
    }
  
    function mostrarAlertaRecordatorio(id, nombre, hora) {
      var modal = document.getElementById('modal-recordatorio');
      var titulo = document.getElementById('modal-recordatorio-titulo');
      var btnTomado = document.getElementById('modal-btn-tomado');
      var btnOmitido = document.getElementById('modal-btn-omitido');
      if (!modal || !titulo) return;
      titulo.textContent = 'Hora de tomar ' + nombre;
      modal.classList.remove('hidden');
      function cerrar(estado) {
        modal.classList.add('hidden');
        agregarAlHistorial(nombre, hora, estado);
        renderHistorial();
        btnTomado.removeEventListener('click', onTomado);
        btnOmitido.removeEventListener('click', onOmitido);
      }
      function onTomado() { cerrar('tomado'); }
      function onOmitido() { cerrar('omitido'); }
      btnTomado.addEventListener('click', onTomado);
      btnOmitido.addEventListener('click', onOmitido);
    }
  
    // ---------- Historial ----------
    function getHistorial() {
      try {
        const raw = localStorage.getItem(STORAGE_HISTORIAL);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        return [];
      }
    }
  
    function setHistorial(arr) {
      localStorage.setItem(STORAGE_HISTORIAL, JSON.stringify(arr));
    }
  
    function agregarAlHistorial(medicamento, hora, estado) {
      const list = getHistorial();
      list.unshift({
        medicamento: medicamento,
        hora: hora,
        estado: estado,
        fecha: new Date().toISOString(),
      });
      setHistorial(list);
    }
  
    function renderHistorial() {
      if (!listaHistorial) return;
      const list = getHistorial();
      if (list.length === 0) {
        listaHistorial.innerHTML = '<li class="historial-empty">Aún no hay registros en el historial.</li>';
        return;
      }
      listaHistorial.innerHTML = list.map(function (h) {
        var fechaLabel = formatFechaHistorial(h.fecha);
        var estadoClass = h.estado;
        var estadoLabel = h.estado === 'tomado' ? 'Tomado' : h.estado === 'omitido' ? 'Omitido' : 'Pendiente';
        return (
          '<li class="historial-item">' +
          '<div><strong>' + escapeHtml(h.medicamento) + '</strong><br><span>' + escapeHtml(h.hora) + ' · ' + escapeHtml(fechaLabel) + '</span></div>' +
          '<span class="estado ' + estadoClass + '">' + escapeHtml(estadoLabel) + '</span>' +
          '</li>'
        );
      }).join('');
    }
  
    function formatFechaHistorial(iso) {
      try {
        var d = new Date(iso);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (e) {
        return '';
      }
    }
  
    // ---------- Prevención: acordeón ----------
    function initPrevencionToggles() {
      var blocks = document.querySelectorAll('.prevencion-block');
      function toggle(button, content, block) {
        if (!button || !content || !block) return;
        button.addEventListener('click', function () {
          var isOpen = !content.hidden;
          content.hidden = isOpen;
          var expanded = !isOpen;
          button.setAttribute('aria-expanded', expanded);
          block.setAttribute('aria-expanded', expanded);
        });
      }
      blocks.forEach(function (block) {
        var button = block.querySelector('.prevencion-titulo');
        var content = block.querySelector('.prevencion-contenido');
        toggle(button, content, block);
      });
    }
  
    // Arranque
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();
  