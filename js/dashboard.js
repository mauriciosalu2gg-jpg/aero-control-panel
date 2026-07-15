/**
 * @file dashboard.js
 * @description Lógica del panel de control V2.
 * Maneja login clásico, login social (Google/GitHub) y el dashboard del bot.
 */

import { API, apiFetch } from './api.js';

// ═══════════════════════════════════════════════════════════════
// FIREBASE CLIENT SDK (para Google/GitHub Sign-In únicamente)
// Se carga de forma diferida para que no bloquee el login clásico.
// ═══════════════════════════════════════════════════════════════
let firebaseReady = false;
let auth = null;
let googleProvider = null;
let githubProvider = null;

async function initFirebase() {
  if (firebaseReady) return true;

  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const { getAuth, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

    // TODO: Pegar tu configuración pública de Firebase aquí
    const firebaseConfig = {
      apiKey: "AIzaSyDmcDU5yqOEMRaGQg8__wM3qklJeT1cCwk",
      authDomain: "alero-webs.firebaseapp.com",
      projectId: "alero-webs",
      storageBucket: "alero-webs.firebasestorage.app",
      messagingSenderId: "1047558398308",
      appId: "1:1047558398308:web:6a21a864890cb225349a71"
    };

    // Si no hay apiKey configurado, no inicializar
    if (!firebaseConfig.apiKey) {
      console.warn('[Firebase] No hay apiKey configurada. Login social deshabilitado.');
      return false;
    }

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    githubProvider = new GithubAuthProvider();

    // Guardar signInWithPopup en el scope del módulo
    window.__firebaseSignInWithPopup = signInWithPopup;

    firebaseReady = true;
    return true;
  } catch (e) {
    console.warn('[Firebase] No se pudo inicializar:', e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// ELEMENTOS DOM
// ═══════════════════════════════════════════════════════════════
const $ = (id) => document.getElementById(id);

const authContainer    = $('auth-container');
const dashContainer    = $('dashboard-container');
const loginForm        = $('login-form');
const btnLogout        = $('btn-logout');
const btnGoogle        = $('btn-google');
const btnGithub        = $('btn-github');
const authMsg          = $('auth-message');
const dashMsg          = $('dash-message');
const botStatusEl      = $('bot-status');
const botStatusDot     = $('bot-status-indicator');
const botPingEl        = $('bot-ping');
const botUptimeEl      = $('bot-uptime');
const botMemoryEl      = $('bot-memory');
const aiProviderEl     = $('ai-provider');
const aiModelEl        = $('ai-model');
const btnSaveAi        = $('btn-save-ai');
const inputGuild       = $('guild-id-input');
const btnCheckTokens   = $('btn-check-tokens');
const tokenPromptsEl   = $('token-prompts');
const tokenCompletionEl = $('token-completion');
const btnSendMessage   = $('btn-send-message');
const msgGuildId       = $('msg-guild-id');
const msgChannelId     = $('msg-channel-id');
const msgContent       = $('msg-content');
const userWelcomeEl    = $('user-welcome');

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════
let statusInterval = null;
let consecutiveErrors = 0;
const MAX_STATUS_ERRORS = 5;

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('session_token');
  const userRaw = localStorage.getItem('user_info');

  if (token && userRaw) {
    try {
      showDashboard(JSON.parse(userRaw));
    } catch {
      // user_info corrupto
      doLogout();
    }
  } else {
    showAuth();
  }
});

// ═══════════════════════════════════════════════════════════════
// VISTAS
// ═══════════════════════════════════════════════════════════════
function showAuth() {
  authContainer.style.display = 'block';
  dashContainer.style.display = 'none';
  stopStatusPolling();
}

function showDashboard(user) {
  authContainer.style.display = 'none';
  dashContainer.style.display = 'block';
  userWelcomeEl.textContent = `Hola, ${user.username || user.email || 'Admin'}`;

  // Primera carga + polling
  fetchBotStatus();
  startStatusPolling();
}

function doLogout() {
  localStorage.removeItem('session_token');
  localStorage.removeItem('user_info');
  stopStatusPolling();
  showAuth();
}

// ═══════════════════════════════════════════════════════════════
// ENVÍO DE MENSAJES
// ═══════════════════════════════════════════════════════════════
if (btnSendMessage) {
  btnSendMessage.addEventListener('click', async () => {
    const guildId = msgGuildId.value.trim();
    const channelId = msgChannelId.value.trim();
    const content = msgContent.value.trim();

    if (!guildId || !channelId || !content) {
      showMessage(dashMsg, 'Por favor completa todos los campos del mensaje.', 'error');
      return;
    }

    const originalText = btnSendMessage.innerText;
    btnSendMessage.innerText = 'Enviando...';
    btnSendMessage.disabled = true;

    try {
      const result = await API.sendMessage(guildId, channelId, content);
      if (result.error) throw new Error(result.error);
      
      showMessage(dashMsg, 'Mensaje encolado para envío.', 'success');
      msgContent.value = '';
    } catch (err) {
      console.error(err);
      showMessage(dashMsg, 'Error al enviar el mensaje: ' + err.message, 'error');
    } finally {
      btnSendMessage.innerText = originalText;
      btnSendMessage.disabled = false;
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// CERRAR SESIÓN (toast)
// ═══════════════════════════════════════════════════════════════
function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `message-box ${type}`;
  el.style.display = 'block';  // fuerza visibilidad

  // Auto-ocultar
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => {
    el.className = 'message-box';
    el.style.display = '';
  }, 5000);
}

// ═══════════════════════════════════════════════════════════════
// LOGIN CLÁSICO
// ═══════════════════════════════════════════════════════════════
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = $('username').value.trim();
  const pass = $('password').value;

  if (!user || !pass) {
    showMessage(authMsg, 'Ingresa usuario y contraseña', 'error');
    return;
  }

  try {
    const res = await API.login(user, pass);

    // v1-auth.js devuelve: { token, sessionToken, usuario: { username, rol, discordId } }
    const token = res.token;
    const userInfo = res.usuario;

    if (!token || !userInfo) {
      throw new Error('Respuesta inesperada del servidor');
    }

    localStorage.setItem('session_token', token);
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    showDashboard(userInfo);
  } catch (err) {
    showMessage(authMsg, err.message, 'error');
  }
});

// ═══════════════════════════════════════════════════════════════
// LOGIN SOCIAL (Google / GitHub)
// ═══════════════════════════════════════════════════════════════
async function handleSocialAuth(providerType) {
  const ready = await initFirebase();
  if (!ready) {
    showMessage(authMsg, 'Login social no disponible. Configura Firebase primero.', 'error');
    return;
  }

  const provider = providerType === 'google' ? googleProvider : githubProvider;

  try {
    const result = await window.__firebaseSignInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();

    // Enviar al backend de Netlify
    const res = await apiFetch('/auth-social', {
      method: 'POST',
      body: JSON.stringify({ idToken })
    });

    // v1-auth-social.js devuelve: { token, usuario: { username, rol, email } }
    const token = res.token;
    const userInfo = res.usuario;

    if (!token || !userInfo) {
      throw new Error('Respuesta inesperada del servidor');
    }

    localStorage.setItem('session_token', token);
    localStorage.setItem('user_info', JSON.stringify(userInfo));
    showDashboard(userInfo);

  } catch (error) {
    console.error('[Social Auth]', error);
    // Mensajes amigables para errores comunes de Firebase
    let msg = error.message;
    if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Ventana de login cerrada. Inténtalo de nuevo.';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      msg = 'Ya existe una cuenta con ese email usando otro método.';
    }
    showMessage(authMsg, msg, 'error');
  }
}

btnGoogle.addEventListener('click', () => handleSocialAuth('google'));
btnGithub.addEventListener('click', () => handleSocialAuth('github'));
btnLogout.addEventListener('click', doLogout);

// ═══════════════════════════════════════════════════════════════
// STATUS POLLING
// ═══════════════════════════════════════════════════════════════
function startStatusPolling() {
  stopStatusPolling();
  consecutiveErrors = 0;
  statusInterval = setInterval(fetchBotStatus, 5000);
}

function stopStatusPolling() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

async function fetchBotStatus() {
  try {
    const res = await apiFetch('/admin?action=status', { method: 'GET' });

    consecutiveErrors = 0;

    // La respuesta directa del servidor (successResponse envuelve el dato tal cual)
    const status = res;

    if (status.status === 'online') {
      botStatusEl.textContent = 'En Línea';
      botStatusDot.className = 'status-indicator online';
    } else {
      botStatusEl.textContent = 'Desconectado';
      botStatusDot.className = 'status-indicator';
    }

    botPingEl.textContent  = status.latencyMs ? `${status.latencyMs} ms` : '-- ms';
    
    let uptimeText = '--';
    if (status.uptimeSeconds) {
      const d = Math.floor(status.uptimeSeconds / 86400);
      const h = Math.floor((status.uptimeSeconds % 86400) / 3600);
      const m = Math.floor((status.uptimeSeconds % 3600) / 60);
      uptimeText = `${d}d ${h}h ${m}m`;
    }
    botUptimeEl.textContent = uptimeText;

    botMemoryEl.textContent = status.memoryUsageMb
      ? `${status.memoryUsageMb} MB`
      : '-- MB';

  } catch (err) {
    consecutiveErrors++;
    console.warn(`[Status] Error #${consecutiveErrors}:`, err.message);

    // Si el token expiró o sin permisos, logout automático
    if (err.message.includes('401') || err.message.includes('Token')) {
      doLogout();
      return;
    }

    // Demasiados fallos seguidos → dejar de hacer polling
    if (consecutiveErrors >= MAX_STATUS_ERRORS) {
      stopStatusPolling();
      botStatusEl.textContent = 'Error de conexión';
      botStatusDot.className = 'status-indicator';
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// GUARDAR CONFIG DE IA
// ═══════════════════════════════════════════════════════════════
btnSaveAi.addEventListener('click', async () => {
  const proveedorPrimario = aiProviderEl.value;
  const modeloActivo = aiModelEl.value;

  try {
    await apiFetch('/admin?action=update-ai-config', {
      method: 'POST',
      body: JSON.stringify({ proveedorPrimario, modeloActivo })
    });

    showMessage(dashMsg, 'Configuración guardada. El bot aplicará los cambios.', 'success');
  } catch (error) {
    showMessage(dashMsg, error.message, 'error');
  }
});

// ═══════════════════════════════════════════════════════════════
// CONSULTAR TOKENS
// ═══════════════════════════════════════════════════════════════
btnCheckTokens.addEventListener('click', async () => {
  const guildId = inputGuild.value.trim();
  if (!guildId) {
    showMessage(dashMsg, 'Ingresa un ID de servidor', 'error');
    return;
  }

  try {
    const stats = await apiFetch(`/admin?action=guild-tokens&guildId=${encodeURIComponent(guildId)}`, {
      method: 'GET'
    });

    tokenPromptsEl.textContent   = stats.promptTokens  || stats.total || 0;
    tokenCompletionEl.textContent = stats.completionTokens || 0;

  } catch (error) {
    showMessage(dashMsg, error.message, 'error');
    tokenPromptsEl.textContent = '0';
    tokenCompletionEl.textContent = '0';
  }
});
