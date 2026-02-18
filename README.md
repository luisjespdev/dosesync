# DoseSync

PWA (Progressive Web App) de prototipo para control de medicación: recordatorios, historial de tomas e información de prevención (hipertensión, diabetes). Desarrollada con HTML, CSS y JavaScript puro, sin frameworks ni backend.

## Cómo usar

1. **Logo (opcional)**  
   Copia tu archivo del logo DoseSync (por ejemplo el que compartiste) como **img/logo.png** en esta carpeta. Así aparecerá junto a "DoseSync" en la bienvenida, el login y la cabecera.

2. **Servidor local**  
   Para que el service worker y la instalación PWA funcionen, sirve la carpeta con un servidor local. Por ejemplo:
   - `npx serve .` (puerto 3000 por defecto)
   - O la extensión "Live Server" en VS Code / Cursor, abriendo la carpeta del proyecto

3. **Primera vez**  
   - Verás 3 pantallas de bienvenida (onboarding). Pulsa "Siguiente" y en la última "Comenzar".
   - Se guarda en el navegador que ya viste el onboarding (no se repetirá).
   - Inicia sesión con cualquier email y contraseña (solo se guarda el email en tu dispositivo).

4. **Dentro de la app**  
   - **Home**: datos curiosos de medicina.  
   - **Recordatorios**: agrega medicamento (nombre, dosis, hora) y pulsa Guardar. A la hora indicada aparecerá un aviso con "✅ Tomado" y "❌ Omitido"; la elección se guarda en Historial.  
   - **Prevención**: información estática sobre hipertensión y diabetes (descripción, síntomas, señales de alerta, recomendaciones).  
   - **Historial**: lista de tomas con estado (Tomado / Omitido / Pendiente).

5. **Instalar como PWA**  
   En Chrome o Edge, abre la app desde el servidor local y usa "Instalar aplicación" (icono en la barra de direcciones o menú).  
   Si quieres iconos PNG para una mejor instalación, abre `icons/generate-icons.html` en el navegador, descarga `icon-192.png` e `icon-512.png` y guárdalos en la carpeta `icons`.

## Estructura del proyecto

- `index.html` – SPA: onboarding, login y las 4 pantallas (Home, Recordatorios, Prevención, Historial).
- `styles.css` – Estilos (azul y blanco), responsive, bottom navigation, tarjetas, formularios.
- `app.js` – Lógica: flujo de pantallas, localStorage, recordatorios con `setTimeout`, modal Tomado/Omitido.
- `manifest.json` – Configuración PWA (nombre, iconos, theme_color, display standalone).
- `service-worker.js` – Precaché y estrategia cache-first para uso offline.
- `icons/` – `icon.svg` (logo/favicon) y opcionalmente `icon-192.png` e `icon-512.png` generados con `icons/generate-icons.html`.
- `img/` – Coloca aquí **logo.png** (logo de la marca DoseSync) para que aparezca junto al nombre en onboarding, login y cabecera.

## Requisitos

- Navegador moderno (Chrome, Edge, Firefox, Safari).
- Servidor local para service worker e instalación PWA (no abrir solo con `file://`).
- Sin frameworks; datos en `localStorage` (prototipo, sin backend).
