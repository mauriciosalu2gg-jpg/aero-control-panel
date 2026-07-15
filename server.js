import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar funciones de Netlify
import { handler as adminHandler } from './netlify/functions/v1-admin.js';
import { handler as authHandler } from './netlify/functions/v1-auth.js';
import { handler as authSocialHandler } from './netlify/functions/v1-auth-social.js';
import { handler as configHandler } from './netlify/functions/v1-config.js';
import { handler as contactHandler } from './netlify/functions/v1-contact.js';
import { handler as recoveryHandler } from './netlify/functions/v1-recovery.js';
import { handler as sessionHandler } from './netlify/functions/v1-session.js';
import { handler as userHandler } from './netlify/functions/v1-user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Necesitamos leer el body como raw text/json pero que esté disponible como string 
// para que el event.body de Netlify funcione (hace JSON.parse interno).
app.use(express.text({ type: '*/*' }));
app.use(express.json()); 

/**
 * Adaptador que transforma una petición de Express (req, res) en el formato (event, context)
 * que esperan las funciones originales de Netlify.
 */
async function netlifyAdapter(req, res, netlifyHandler) {
  // Construir event
  const event = {
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters: req.query,
    // Si viene del parser json, volverlo a string, si viene text, usarlo.
    body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  };

  const context = {};

  try {
    const response = await netlifyHandler(event, context);
    
    // Headers de respuesta
    if (response.headers) {
      for (const [key, value] of Object.entries(response.headers)) {
        res.setHeader(key, value);
      }
    }
    
    // Enviar respuesta
    res.status(response.statusCode || 200).send(response.body);
  } catch (err) {
    console.error('Error en adaptador:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// ──────────────────────────────────────────────────────────
// RUTAS DE LA API (Equivalente al netlify.toml)
// ──────────────────────────────────────────────────────────

app.all('/api/v1/admin', (req, res) => netlifyAdapter(req, res, adminHandler));
app.all('/api/v1/auth', (req, res) => netlifyAdapter(req, res, authHandler));
app.all('/api/v1/auth-social', (req, res) => netlifyAdapter(req, res, authSocialHandler));
app.all('/api/v1/config', (req, res) => netlifyAdapter(req, res, configHandler));
app.all('/api/v1/contact', (req, res) => netlifyAdapter(req, res, contactHandler));
app.all('/api/v1/recovery', (req, res) => netlifyAdapter(req, res, recoveryHandler));
app.all('/api/v1/session', (req, res) => netlifyAdapter(req, res, sessionHandler));
app.all('/api/v1/user', (req, res) => netlifyAdapter(req, res, userHandler));

// ──────────────────────────────────────────────────────────
// SERVIR ARCHIVOS ESTÁTICOS (HTML, CSS, JS)
// ──────────────────────────────────────────────────────────

app.use(express.static(__dirname));

// Cualquier otra ruta que no sea API, devolver index.html para soportar navegación (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express (Panel de Control) escuchando en puerto ${PORT}`);
  console.log(`🌐 Accede localmente en: http://localhost:${PORT}`);
});
