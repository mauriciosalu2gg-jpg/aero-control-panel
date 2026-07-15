/**
 * @file uiController.js
 */
import { eventBus } from './eventBus.js';
import { API } from '../api.js';

class UIController {
  constructor() {
    this.loginScreen = document.getElementById('login-screen');
    this.appWrapper = document.getElementById('app-wrapper');
    this.isMobile = /Mobi|Android/i.test(navigator.userAgent);
  }

  init() {
    this.bindEvents();
    this.bindLogin();
  }

  bindEvents() {
    eventBus.on('quality-changed', (quality) => {
      if (quality === 'low' || this.isMobile) document.body.classList.add('low-quality');
      else document.body.classList.remove('low-quality');
    });
  }

  bindLogin() {
    const loginBtn = document.getElementById('login-btn');
    const loginInput = document.getElementById('login-input');
    const loginAdmin = document.getElementById('login-admin');

    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleLogin(loginAdmin.value, loginInput.value));
    }
    if (loginInput) {
      loginInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleLogin(loginAdmin.value, loginInput.value);
      });
    }
  }

  async handleLogin(user, pass) {
    const btn = document.getElementById('login-btn');
    const errorMsg = document.getElementById('login-error');
    if (!user || !pass) {
      errorMsg.textContent = 'Rellena ambos campos';
      errorMsg.classList.add('show');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    try {
      const data = await API.login(user, pass);
      localStorage.setItem('session_token', data.token);
      localStorage.setItem('panel_user', JSON.stringify(data.usuario));
      this.runUnlockOutro(() => {
        this.showDashboard(data.usuario);
        if (window.AeroApp) window.AeroApp.startServices();
      });
    } catch (err) {
      errorMsg.textContent = err.message || 'Código inválido';
      errorMsg.classList.add('show');
      btn.disabled = false;
      btn.textContent = 'Entrar';
    }
  }

  showLogin() {
    if (this.appWrapper) this.appWrapper.classList.remove('active');
    if (this.loginScreen) {
      this.loginScreen.style.display = 'flex';
      this.loginScreen.classList.add('active');
    }
  }

  showDashboard(usuario) {
    const displayName = usuario.username || usuario.nombre || usuario.name || 'Usuario';
    const userName = document.getElementById('user-name');
    const userAvatar = document.getElementById('user-avatar');
    if (userName) userName.textContent = displayName;
    if (userAvatar) userAvatar.textContent = displayName.charAt(0).toUpperCase();

    if (this.loginScreen) {
      this.loginScreen.style.opacity = '0';
      this.loginScreen.style.pointerEvents = 'none';
      setTimeout(() => {
        this.loginScreen.style.display = 'none';
        this.loginScreen.classList.remove('active');
      }, 500);
    }
    
    if (this.appWrapper) {
      this.appWrapper.classList.add('active');
      // Forzar reflow para evitar saltos (el shift problem)
      void this.appWrapper.offsetWidth; 
    }
  }

  runUnlockOutro(done) {
    const overlay = document.getElementById('lock-intro');
    const badge = document.getElementById('lock-badge');
    if (!overlay || !badge) { if (done) done(); return; }
    
    badge.classList.remove('open','snap');
    overlay.classList.add('show','unlock-mode');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add('vis');
    }));
    
    setTimeout(() => {
      badge.classList.add('open');
      IntroAudio.unlockClick();
    }, 220);
    
    setTimeout(() => {
      overlay.classList.add('leaving');
      setTimeout(() => {
        overlay.classList.remove('show','vis','leaving','unlock-mode');
        badge.classList.remove('open');
        if (done) done();
      }, 280);
    }, 620);
  }

  runInitSequence(done) {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('active');
      loadingScreen.classList.remove('fade-out');
    }

    setTimeout(() => {
      if (loadingScreen) {
        loadingScreen.classList.add('fade-out');
        setTimeout(() => loadingScreen.classList.remove('active'), 500);
      }

      const overlay = document.getElementById('lock-intro');
      const badge = document.getElementById('lock-badge');
      if (overlay && badge) {
        overlay.classList.add('show');
        badge.classList.add('open'); 
        requestAnimationFrame(() => requestAnimationFrame(() => {
          overlay.classList.add('vis');
        }));
        
        const triggerIntro = () => {
          overlay.removeEventListener('click', triggerIntro);
          const clickHint = document.getElementById('click-to-enter');
          if (clickHint) clickHint.remove();

          IntroAudio.resume();
          IntroAudio.entrada();

          const welcomeText = document.getElementById('lock-welcome');
          if (welcomeText) welcomeText.classList.add('show-welcome');

          setTimeout(() => {
            badge.classList.remove('open');
            badge.classList.add('snap');
            IntroAudio.click();
          }, 120);

          setTimeout(() => {
            overlay.classList.add('leaving');
            setTimeout(() => {
              overlay.classList.remove('show', 'vis', 'leaving');
              if (done) done();
            }, 460);
          }, 950);
        };

        overlay.addEventListener('click', triggerIntro);
      } else {
        if (done) done();
      }
    }, 900);
  }
}

// --- Audio & Lock Intro Logic ---
export const IntroAudio = (() => {
  let ctx = null;
  function ensure() {
    if (!ctx) { try { ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){ ctx=null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(()=>{});
    return ctx;
  }

  const LOCK_CANDIDATES = { close: [], open: [] };
  const real = { close: null, open: null };

  function playReal(kind) { return false; }

  function entrada() {
    if (!ensure()) return;
    const now = ctx.currentTime;
    const master = ctx.createGain(); master.gain.value = 0.0001;
    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.5;
    master.connect(lp).connect(ctx.destination);
    master.gain.exponentialRampToValueAtTime(0.12, now + 0.25);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0;
      const st = now + i*0.12;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.9/(i+1), st + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.9);
      o.connect(g).connect(master);
      o.start(st); o.stop(st + 1.0);
    });
  }

  function click() {
    if (!ensure()) return;
    const now = ctx.currentTime;
    const thump = ctx.createOscillator(); thump.type = 'sine';
    thump.frequency.setValueAtTime(180, now);
    thump.frequency.exponentialRampToValueAtTime(70, now + 0.09);
    const gThump = ctx.createGain(); gThump.gain.setValueAtTime(0.0001, now);
    gThump.gain.exponentialRampToValueAtTime(0.35, now + 0.006);
    gThump.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    thump.connect(gThump).connect(ctx.destination);
    thump.start(now); thump.stop(now + 0.18);
  }

  function unlockClick() {
    if (!ensure()) return;
    const now = ctx.currentTime;
    const thump = ctx.createOscillator(); thump.type = 'sine';
    thump.frequency.setValueAtTime(160, now);
    thump.frequency.exponentialRampToValueAtTime(65, now + 0.08);
    const gThump = ctx.createGain(); gThump.gain.setValueAtTime(0.0001, now);
    gThump.gain.exponentialRampToValueAtTime(0.28, now + 0.005);
    gThump.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    thump.connect(gThump).connect(ctx.destination);
    thump.start(now); thump.stop(now + 0.16);
  }

  function resume(){ ensure(); }
  return { entrada, click, unlockClick, resume };
})();

export const uiController = new UIController();
