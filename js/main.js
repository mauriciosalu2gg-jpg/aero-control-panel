/**
 * @file main.js
 * @description Punto de entrada principal para el frontend de Aero Panels.
 * Gestiona el ciclo de vida de la aplicación, inicio/cierre de sesión, integración de animaciones y telemetría.
 */

import { API } from './api.js';
import { startTelemetrySync, startLogsSync, stopAllSyncs, loadRealServers } from './services.js';
import { showNotification } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Aero Panels: Inicializando frontend modular...');
  checkSession();
  setupLoginForm();
  setupRegisterForm();
  setupAiConfigForm();
});

/**
 * Valida la existencia y vigencia de la sesión en el servidor.
 */
async function checkSession() {
  const sessionToken = localStorage.getItem('session_token');
  const cachedUser = localStorage.getItem('panel_user');

  if (!sessionToken || !cachedUser) {
    abrirLogin();
    return;
  }

  try {
    const data = await API.validateSession();
    console.log('✅ Sesión válida para usuario:', data.usuario);
    revelarPanel(data.usuario, true); // true indica que es auto-login
  } catch (err) {
    console.warn('⚠️ Sesión expirada o inválida:', err.message);
    cerrarSesionLocal();
  }
}

/**
 * Muestra la pantalla de login con reset.
 */
function abrirLogin() {
  const loginScreen = document.getElementById('login-screen');
  const appWrapper = document.getElementById('app-wrapper');
  const loginAdmin = document.getElementById('login-admin');
  const loginInput = document.getElementById('login-input');
  const loginError = document.getElementById('login-error');
  const registerFormContainer = document.getElementById('register-form-container');
  const loginFormContainer = document.getElementById('login-form-container');

  if (loginScreen) {
    loginScreen.style.display = 'flex';
    loginScreen.classList.remove('fade-out');
  }
  if (appWrapper) {
    appWrapper.classList.remove('active');
  }
  if (loginAdmin) loginAdmin.value = '';
  if (loginInput) loginInput.value = '';
  if (loginError) loginError.classList.remove('show');
  
  if (registerFormContainer) registerFormContainer.style.display = 'none';
  if (loginFormContainer) loginFormContainer.style.display = 'block';

  // Intentar enfocar el primer input
  setTimeout(() => {
    if (loginAdmin) loginAdmin.focus();
  }, 100);
}

/**
 * Configura el formulario de inicio de sesión.
 */
function setupLoginForm() {
  const loginBtn = document.getElementById('login-btn');
  const loginAdmin = document.getElementById('login-admin');
  const loginInput = document.getElementById('login-input');
  const loginError = document.getElementById('login-error');

  const tryLogin = async () => {
    const username = loginAdmin?.value.trim();
    const password = loginInput?.value.trim();

    if (!username || !password) {
      if (loginError) {
        loginError.textContent = 'Usuario y contraseña requeridos';
        loginError.classList.add('show');
      }
      shakeInputs();
      return;
    }

    try {
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'Verificando...';
      }

      const data = await API.login(username, password);

      // Guardar sesión en localStorage
      localStorage.setItem('session_token', data.sessionToken);
      localStorage.setItem('jwt_token', data.token);
      localStorage.setItem('panel_user', data.usuario.username || data.usuario.nombre || username);

      const displayName = data.usuario.username || data.usuario.nombre || username;

      // Hook: cuando la animación de carga termine, revelar el panel
      window.onPanelActive = () => {
        // Iniciar telemetría y sincronización
        startTelemetrySync();
        startLogsSync();
        loadRealServers();
      };

      // Ejecutar flujo de carga visual clásico del HTML
      if (typeof window.iniciarCarga === 'function') {
        window.iniciarCarga(password, displayName);
      } else {
        revelarPanel(data.usuario, false);
      }

    } catch (err) {
      const msg = err.message || 'Usuario o contraseña incorrectos';
      if (loginError) {
        loginError.textContent = msg;
        loginError.classList.add('show');
      }
      // Activar sistema de bloqueo progresivo del inline script
      if (typeof window.Security !== 'undefined') {
        window.Security.bumpTry();
        window.Security.pushHist(loginAdmin?.value || '?', false);
        if (typeof window.refreshLock === 'function') window.refreshLock();
      }
      shakeInputs();
      if (loginInput) loginInput.value = '';
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Entrar';
      }
    }
  };

  // Exponer globalmente para que el inline script del HTML pueda delegar
  window.tryLogin_module = tryLogin;

  // main.js NO registra sus propios event listeners en los botones.
  // El inline script del HTML ya los registra y delega a window.tryLogin_module.
}

/**
 * Configura los botones e inputs de registro.
 */
function setupRegisterForm() {
  const toggleRegister = document.getElementById('toggle-register');
  const toggleLogin = document.getElementById('toggle-login');
  const registerFormContainer = document.getElementById('register-form-container');
  const loginFormContainer = document.getElementById('login-form-container');

  const registerBtn = document.getElementById('register-btn');
  const registerAdmin = document.getElementById('register-admin');
  const registerPass = document.getElementById('register-pass');
  const registerPass2 = document.getElementById('register-pass2');
  const registerDiscord = document.getElementById('register-discord');
  const registerError = document.getElementById('register-error');
  const registerSuccess = document.getElementById('register-success');

  if (toggleRegister && registerFormContainer && loginFormContainer) {
    toggleRegister.addEventListener('click', (e) => {
      e.preventDefault();
      loginFormContainer.style.display = 'none';
      registerFormContainer.style.display = 'block';
      if (registerError) registerError.style.display = 'none';
      if (registerSuccess) registerSuccess.style.display = 'none';
    });
  }

  if (toggleLogin && registerFormContainer && loginFormContainer) {
    toggleLogin.addEventListener('click', (e) => {
      e.preventDefault();
      registerFormContainer.style.display = 'none';
      loginFormContainer.style.display = 'block';
    });
  }

  const tryRegister = async () => {
    const adminNum = registerAdmin?.value.trim();
    const pass = registerPass?.value.trim();
    const pass2 = registerPass2?.value.trim();
    const discordId = registerDiscord?.value.trim();

    if (!adminNum || !pass || !pass2) {
      showNotification('Todos los campos obligatorios deben completarse', 'warning');
      if (registerError) {
        registerError.textContent = 'Por favor completa todos los campos.';
        registerError.style.display = 'block';
      }
      return;
    }

    if (pass !== pass2) {
      showNotification('Las contraseñas no coinciden', 'error');
      if (registerError) {
        registerError.textContent = 'Las contraseñas no coinciden.';
        registerError.style.display = 'block';
      }
      return;
    }

    if (pass.length < 6) {
      showNotification('La contraseña debe tener al menos 6 caracteres', 'warning');
      if (registerError) {
        registerError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        registerError.style.display = 'block';
      }
      return;
    }

    try {
      if (registerBtn) {
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creando cuenta...';
      }
      if (registerError) registerError.style.display = 'none';
      if (registerSuccess) registerSuccess.style.display = 'none';

      await API.register(adminNum, pass, discordId);

      showNotification('Cuenta creada con éxito. Ya puedes iniciar sesión.', 'success');
      if (registerSuccess) {
        registerSuccess.textContent = '¡Cuenta creada con éxito! Redirigiendo...';
        registerSuccess.style.display = 'block';
      }

      if (registerAdmin) registerAdmin.value = '';
      if (registerPass) registerPass.value = '';
      if (registerPass2) registerPass2.value = '';
      if (registerDiscord) registerDiscord.value = '';

      setTimeout(() => {
        registerFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
      }, 2000);

    } catch (err) {
      showNotification(err.message || 'Error al registrar usuario', 'error');
      if (registerError) {
        registerError.textContent = err.message || 'Error al registrar usuario';
        registerError.style.display = 'block';
      }
    } finally {
      if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.textContent = 'Crear cuenta';
      }
    }
  };

  if (registerBtn) registerBtn.addEventListener('click', tryRegister);

  [registerAdmin, registerPass, registerPass2, registerDiscord].forEach(input => {
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryRegister();
    });
  });
}

function shakeInputs() {
  const loginAdmin = document.getElementById('login-admin');
  const loginInput = document.getElementById('login-input');
  [loginAdmin, loginInput].forEach(el => {
    if (el) {
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 500);
    }
  });
}

/**
 * Revela la interfaz del panel.
 * @param {object} usuario 
 * @param {boolean} autoLogin 
 */
function revelarPanel(usuario, autoLogin = false) {
  const loginScreen = document.getElementById('login-screen');
  const appWrapper = document.getElementById('app-wrapper');
  
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  const welcomeAvatar = document.getElementById('welcome-avatar');

  const displayName = usuario.username || usuario.nombre || usuario.name || 'Usuario';
  
  if (userName) userName.textContent = displayName;
  if (userAvatar) userAvatar.textContent = displayName.charAt(0).toUpperCase();
  if (welcomeAvatar) welcomeAvatar.textContent = displayName.charAt(0).toUpperCase();

  // Asignar roles visuales para modificar colores/tema del panel
  document.body.classList.remove('role-lara', 'role-gio', 'role-admin', 'role-user');
  document.body.classList.add(`role-${usuario.rol || 'user'}`);

  if (loginScreen) loginScreen.style.display = 'none';
  if (appWrapper) appWrapper.classList.add('active');

  // Iniciar telemetría y sincronización real
  startTelemetrySync();
  startLogsSync();
  loadRealServers();

  // Si es autoLogin o reingreso directo, reproducir la bienvenida corta
  if (autoLogin) {
    if (typeof window.mostrarBienvenidaCorta === 'function') {
      setTimeout(() => {
        window.mostrarBienvenidaCorta(displayName);
      }, 1300);
    }
  }
}

/**
 * Cierre de sesión seguro.
 */
export function logout() {
  const appWrapper = document.getElementById('app-wrapper');
  
  // Agregar capa visual de cierre de sesión
  if (appWrapper) appWrapper.classList.add('logging-out');
  
  showNotification('Cerrando sesión...', 'info');

  setTimeout(() => {
    cerrarSesionLocal();
    if (appWrapper) appWrapper.classList.remove('logging-out');
  }, 1000);
}

function cerrarSesionLocal() {
  localStorage.removeItem('session_token');
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('panel_user');
  stopAllSyncs();
  abrirLogin();
}

let _aiHealthInterval = null;

/**
 * Carga la configuración de IA activa desde Firestore y la pinta en la UI.
 */
async function loadAiConfig() {
  try {
    const config = await API.getAiConfig();
    const providerGrid = document.getElementById('ai-provider-grid');
    const modelSelect = document.getElementById('ai-model-select');
    const apiKeyInput = document.getElementById('ai-api-key');

    // Marcar el proveedor activo
    if (providerGrid && config.proveedorPrimario) {
      providerGrid.querySelectorAll('.ai-provider').forEach(el => {
        el.classList.toggle('selected', el.dataset.provider === config.proveedorPrimario);
      });
    }

    // Seleccionar el modelo activo
    if (modelSelect && config.modeloActivo) {
      const option = modelSelect.querySelector(`option[value="${config.modeloActivo}"]`);
      if (option) option.selected = true;
    }

    // Mostrar la key ofuscada si existe
    if (apiKeyInput && config.apiKey) {
      apiKeyInput.placeholder = `Clave guardada: ${config.apiKey}`;
    }

    // Arrancar el polling de salud de la IA
    if (!_aiHealthInterval) {
      updateAiHealth(); // primera llamada inmediata
      _aiHealthInterval = setInterval(updateAiHealth, 30000); // cada 30s
    }
  } catch (err) {
    console.warn('No se pudo cargar la configuración de IA:', err.message);
  }
}

async function updateAiHealth() {
  try {
    const health = await API.getAiHealth();
    if (!health || !health.providers) return;
    
    health.providers.forEach(p => {
      const el = document.querySelector(`.ai-provider[data-provider="${p.name}"]`);
      if (!el) return;
      const statusDiv = el.querySelector('.status');
      if (!statusDiv) return;

      let dotClass = 'off';
      let text = 'Offline';

      if (p.status === 'Healthy') {
        dotClass = 'on';
        text = `${p.averageLatencyMs || 0}ms`;
      } else if (p.status === 'Slow') {
        dotClass = 'warn';
        text = `${p.averageLatencyMs || 0}ms (Lento)`;
      } else if (p.status === 'Rate Limited' || p.status === 'Quota Exceeded') {
        dotClass = 'warn';
        text = 'Límite alcanzado';
      } else if (p.status === 'Unavailable' || p.status === 'Offline') {
        dotClass = 'off';
        text = p.lastError ? p.lastError.substring(0, 15) + '...' : 'Offline';
      }

      statusDiv.innerHTML = `<span class="dot ${dotClass}"></span>${text}`;
      statusDiv.title = `Errores: ${p.errors} | Usado: ${p.timesUsed}\nÚltimo error: ${p.lastError || 'Ninguno'}`;
    });
  } catch (err) {
    console.warn('Error al actualizar salud IA:', err.message);
  }
}

/**
 * Configura el formulario de configuración de IA del panel.
 */
function setupAiConfigForm() {
  const saveBtn = document.getElementById('btn-save-ai-config');
  const providerGrid = document.getElementById('ai-provider-grid');

  // Selección de proveedor al hacer clic en la grid
  if (providerGrid) {
    providerGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.ai-provider');
      if (!card) return;
      providerGrid.querySelectorAll('.ai-provider').forEach(el => el.classList.remove('selected'));
      card.classList.add('selected');

      // Adaptar el selector de modelos según el proveedor elegido
      updateModelOptions(card.dataset.provider);
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const providerEl = document.querySelector('.ai-provider.selected');
      const apiKeyInput = document.getElementById('ai-api-key');
      const modelSelect = document.getElementById('ai-model-select');

      const provider = providerEl?.dataset.provider || 'ollama';
      const apiKey = apiKeyInput?.value.trim() || '';
      const model = modelSelect?.value || '';

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        const result = await API.saveAiConfig(provider, apiKey, model);
        const detected = result.detectedProvider || provider;

        showNotification(`✅ Configuración guardada. Proveedor activo: ${detected.toUpperCase()}`, 'success');

        // Limpiar el input de la API Key por seguridad
        if (apiKeyInput) {
          apiKeyInput.value = '';
          apiKeyInput.placeholder = `Clave actualizada (${detected})`;
        }

        // Actualizar la selección visual del proveedor detectado
        if (providerGrid) {
          providerGrid.querySelectorAll('.ai-provider').forEach(el => {
            el.classList.toggle('selected', el.dataset.provider === detected);
          });
        }
      } catch (err) {
        showNotification('Error al guardar la configuración: ' + err.message, 'error');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Guardar Configuración de IA';
      }
    });
  }
}

/**
 * Actualiza las opciones del selector de modelos según el proveedor elegido.
 * @param {string} provider
 */
function updateModelOptions(provider) {
  const modelSelect = document.getElementById('ai-model-select');
  if (!modelSelect) return;

  const models = {
    groq: [
      { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant (Rápido, Gratis)' },
      { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile (Potente, Gratis)' },
      { value: 'gemma2-9b-it', label: 'gemma2-9b-it (Google, Gratis)' },
      { value: 'mixtral-8x7b-32768', label: 'mixtral-8x7b-32768 (Gratis)' },
    ],
    ollama: [
      { value: 'llama3.2', label: 'llama3.2 (Local)' },
      { value: 'llama3.1', label: 'llama3.1 (Local)' },
      { value: 'mistral', label: 'mistral (Local)' },
      { value: 'phi3', label: 'phi3 (Local, Ligero)' },
      { value: 'qwen2.5', label: 'qwen2.5 (Local)' },
    ],
    lmstudio: [
      { value: 'local', label: 'Modelo cargado en LM Studio (Puerto 1234)' },
    ],
    openai: [
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini (Económico)' },
      { value: 'gpt-4o', label: 'gpt-4o (Potente)' },
      { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
    ],
    gemini: [
      { value: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite (Gratis)' },
      { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
      { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
    ],
    anthropic: [
      { value: 'claude-3-haiku-20240307', label: 'claude-3-haiku (Rápido)' },
      { value: 'claude-3-5-sonnet-20241022', label: 'claude-3.5-sonnet' },
    ],
  };

  const options = models[provider] || models.groq;
  modelSelect.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
}

// Hacer disponible la función logout y abrirLogin globalmente para botones inline y animaciones
window.logout = logout;
window.abrirLogin = abrirLogin;
