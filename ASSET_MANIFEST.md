# ASSET MANIFEST - MANGI

Este archivo detalla todos los assets (imágenes, modelos 3D, sonidos) que faltan y se reemplazaron con placeholders temporales en el código. Para tener la experiencia completa, es necesario reemplazarlos.

## 1. Branding / Imágenes

### MANGI Icon
- **Ruta:** `/public/branding/mangi-icon.png`
- **Tipo:** PNG / Imagen
- **Uso:** Símbolo principal, loading spinner, empty states
- **Placeholder:** Icono generico temporal o div estilizado con texto "M"
- **Prioridad:** Required
- **Formato recomendado:** `.png` con fondo transparente, min 512x512
- **Prompt:** `A modern app icon of a normal mango, no face, slightly tilted to the side, warm red and orange colors, single green leaf on top, clean vector style, dark background context.`

### MANGI Icon Transparent
- **Ruta:** `/public/branding/mangi-icon-transparent.png`
- **Tipo:** PNG / Imagen transparente
- **Uso:** Superposiciones en UI, HUD in-game, Garage
- **Placeholder:** Texto MANGI en span
- **Prioridad:** Required

### MANGI Wordmark
- **Ruta:** `/public/branding/mangi-wordmark.png`
- **Tipo:** PNG / Imagen
- **Uso:** Navbar, Login, Landing
- **Placeholder:** Texto CSS estilizado bold
- **Prioridad:** Required
- **Prompt:** `Modern bold typography logo wordmark "MANGI", racing game style but warm, thick letters.`

### MANGI Favicon
- **Ruta:** `/public/branding/mangi-favicon.png`
- **Tipo:** PNG
- **Uso:** Icono de pestaña de navegador
- **Placeholder:** Default Next.js favicon
- **Prioridad:** Recommended

## 2. Modelos 3D

### Default Car (White)
- **Ruta:** `/public/models/car_default.glb`
- **Tipo:** Modelo 3D (GLB)
- **Uso:** Preview 3D del auto en el Garage
- **Placeholder:** Div 2D animado con CSS / Componente 3D temporal en Three.js con un cubo simple
- **Prioridad:** Required
- **Formato recomendado:** `.glb` (optimizado para web, menos de 2MB)
- **Prompt:** `Low-poly white default cartoon car for arcade game, front and side readable, game asset, no logos, clean topology.`

## 3. UI Sound Effects (SFX)

Estos sonidos son vitales para la experiencia "Premium Launcher". El sistema en `utils/sound.ts` está configurado para buscarlos en `/public/audio/ui/`.

### UI Sonidos Base
- **ui_hover.wav:** Hover suave. Prompt: `Subtle digital click, warm UI hover sound.`
- **ui_click.wav:** Click de confirmar. Prompt: `Satisfying UI click confirm sound, warm tech interface.`
- **ui_success.wav:** Éxito. Prompt: `Short warm success chime, positive feedback.`
- **ui_error.wav:** Error. Prompt: `Soft digital error buzz, UI notification.`
- **ui_notification.wav:** Notificación. Prompt: `Pop sound for social notification.`
- **ui_tab_switch.wav:** Cambio de tab. Prompt: `Smooth whoosh or click for tab switch.`

### Game & Contextual
- **mango_splash.wav:** Splash screen. Prompt: `Energetic tropical swoosh with a subtle bouncy bass hit.`
- **garage_equip.wav:** Equipar items. Prompt: `Mechanical sci-fi equip sound, brief and punchy.`
- **server_join.wav:** Entrar a server. Prompt: `Digital warp in sound, ready to play.`
- **ui_play.wav:** Click de botón Play grande. Prompt: `Heavy engine rev UI sound mixed with a digital confirm.`

---
*Para reemplazar placeholders, simplemente añade los archivos con los nombres y formatos indicados en la carpeta `/public/...` correspondiente.*
