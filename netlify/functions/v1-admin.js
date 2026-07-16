import { withMiddlewares, rateLimitMiddleware, authMiddleware } from '../../middleware/index.js';
import { successResponse, errorResponse } from '../../utils/responses.js';
import { db } from '../../services/firebase/firestore.js';
import { obtenerLogs } from '../../services/firebase/logs.js';
import { obtenerSolicitudes, resolverSolicitud } from '../../services/firebase/recuperaciones.js';
import { rolTienePermiso } from '../../services/firebase/roles.js';

async function adminHandler(event, context) {
  const { rol, username } = event.user;

  const queryParams = event.queryStringParameters || {};
  const action = queryParams.action || '';

  // Mapeo de acciones a sus permisos correspondientes
  const permisosRequeridos = {
    'logs': 'logs_view',
    'status': 'dashboard',
    'guilds': 'dashboard',
    'recoveries': 'users_manage',
    'guild-tokens': 'dashboard',
    'update-ai-config': 'ai_settings',
    'resolve-recovery': 'users_manage',
    'send-message': 'discord_send',
    'save-ai-config': 'users_manage', // Modificar requiere ser admin
    'get-ai-config': 'dashboard',
    'get-ai-health': 'dashboard'
  };

  const permisoNecesario = permisosRequeridos[action];
  if (permisoNecesario) {
    const autorizado = await rolTienePermiso(rol, permisoNecesario);
    if (!autorizado) {
      return errorResponse(`Acceso denegado. Permisos insuficientes para esta accion (${permisoNecesario}).`, 403);
    }
  }

  // ── GET: Obtener logs de auditoría ────────────────────
  if (event.httpMethod === 'GET' && action === 'logs') {
    const limite = Number(queryParams.limite) || 50;
    try {
      const logs = await obtenerLogs(limite);
      return successResponse(logs);
    } catch (err) {
      return errorResponse('Error al obtener los logs de auditoría', 500);
    }
  }

  // ── GET: Obtener estado del bot ────────────────────────
  if (event.httpMethod === 'GET' && action === 'status') {
    try {
      const doc = await db.collection('bot').doc('status').get();
      if (!doc.exists) {
        return successResponse({ status: 'offline', lastSync: new Date().toISOString() });
      }
      return successResponse(doc.data());
    } catch (err) {
      return errorResponse(`Error al obtener el estado del bot: ${err.message}`, 500);
    }
  }

  // ── GET: Obtener lista de servidores ───────────────────
  if (event.httpMethod === 'GET' && action === 'guilds') {
    try {
      const snapshot = await db.collection('guilds').get();
      const list = await Promise.all(snapshot.docs.map(async (d) => {
        const guildData = { id: d.id, ...d.data() };
        
        // Cargar subcolección de canales
        try {
          const channelsSnap = await db.collection('guilds').doc(d.id).collection('channels').orderBy('position', 'asc').get();
          guildData.channels = channelsSnap.docs.map(c => ({ id: c.id, ...c.data() }));
        } catch (e) {
          guildData.channels = [];
        }
        
        return guildData;
      }));
      return successResponse(list);
    } catch (err) {
      console.error(err);
      return errorResponse(`Error al obtener la lista de servidores: ${err.message}`, 500);
    }
  }

  // ── GET: Obtener solicitudes de recuperación ─────────
  if (event.httpMethod === 'GET' && action === 'recoveries') {
    const estado = queryParams.estado || 'pendiente';
    try {
      const solicitudes = await obtenerSolicitudes(estado);
      return successResponse(solicitudes);
    } catch (err) {
      return errorResponse('Error al obtener solicitudes de recuperación', 500);
    }
  }

  // ── GET: Obtener uso de tokens de un servidor ─────────
  if (event.httpMethod === 'GET' && action === 'guild-tokens') {
    const guildId = queryParams.guildId;
    if (!guildId) return errorResponse('ID de servidor requerido', 400);
    try {
      const doc = await db.collection('guilds').doc(guildId).collection('stats').doc('tokens').get();
      return successResponse(doc.exists ? doc.data() : { total: 0 });
    } catch (err) {
      return errorResponse('Error al obtener los tokens del servidor', 500);
    }
  }

  // ── POST: Actualizar configuración de IA (Modelo Activo) ─────────
  if (event.httpMethod === 'POST' && action === 'update-ai-config') {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return errorResponse('Body no válido', 400);
    }

    const { proveedorPrimario, modeloActivo, botPersonality } = body;
    if (!proveedorPrimario) {
      return errorResponse('Se requiere proveedorPrimario', 400);
    }

    try {
      await db.collection('config').doc('ai').set({
        proveedorPrimario,
        modeloActivo: modeloActivo || '',
        botPersonality: botPersonality || 'asistente',
        updatedAt: new Date().toISOString(),
        updatedBy: username
      }, { merge: true });
      return successResponse({ message: 'Configuración de IA actualizada' });
    } catch (err) {
      return errorResponse('Error al actualizar la configuración de IA', 500);
    }
  }

  // ── POST: Resolver solicitud de recuperación ─────────
  if (event.httpMethod === 'POST' && action === 'resolve-recovery') {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return errorResponse('Body no válido', 400);
    }

    const { recoveryId, decision, comentarios } = body;
    if (!recoveryId || !decision) {
      return errorResponse('ID de solicitud y decisión (aprobado/rechazado) requeridos', 400);
    }

    try {
      const ok = await resolverSolicitud(recoveryId, username, decision, comentarios);
      if (!ok) {
        return errorResponse('Solicitud de recuperación no encontrada', 404);
      }
      return successResponse({ message: `Solicitud de recuperación resuelta con éxito como: ${decision}` });
    } catch (err) {
      return errorResponse('Error al resolver la solicitud de recuperación', 500);
    }
  }
  // ── POST: Enviar Mensaje a Bot ────────────────────────
  if (event.httpMethod === 'POST' && action === 'send-message') {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return errorResponse('Body no válido', 400);
    }

    const { guildId, channelId, content } = body;
    if (!guildId || !channelId || !content) {
      return errorResponse('Faltan campos (guildId, channelId, content)', 400);
    }
    
    if (typeof content !== 'string' || content.length > 2000) {
      return errorResponse('Mensaje excede la longitud permitida (2000 caracteres)', 400);
    }
    if (typeof guildId !== 'string' || typeof channelId !== 'string' || guildId.length < 17 || channelId.length < 17) {
      return errorResponse('ID de servidor o canal inválido', 400);
    }

    try {
      await db.collection('bot_actions').add({
        action: 'send_message',
        guildId,
        channelId,
        content,
        status: 'pending',
        createdAt: new Date().toISOString(),
        sender: event.user.id || event.user.uid || 'unknown'
      });
      return successResponse({ message: 'Mensaje encolado' });
    } catch (err) {
      console.error(err);
      return errorResponse('Error al encolar el mensaje', 500);
    }
  }

  // ── POST: Guardar configuración de IA ─────────────────
  if (event.httpMethod === 'POST' && action === 'save-ai-config') {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return errorResponse('Body no válido', 400);
    }

    const { provider, apiKey, model } = body;
    if (!provider) {
      return errorResponse('El proveedor de IA es obligatorio', 400);
    }

    // Auto-detectar compañía según el patrón de la API key
    let detectedProvider = provider;
    if (apiKey) {
      const trimmedKey = apiKey.trim();
      if (trimmedKey.startsWith('gsk_')) {
        detectedProvider = 'groq';
      } else if (trimmedKey.startsWith('sk-proj-') || (trimmedKey.startsWith('sk-') && trimmedKey.length > 30)) {
        detectedProvider = 'openai';
      } else if (trimmedKey.startsWith('AIzaSy')) {
        detectedProvider = 'gemini';
      } else if (trimmedKey.startsWith('sk-ant-')) {
        detectedProvider = 'anthropic';
      }
    }

    try {
      const updateData = {
        proveedorPrimario: detectedProvider,
        updatedAt: new Date().toISOString(),
      };

      if (apiKey) {
        updateData.apiKey = apiKey.trim();
      }
      if (model) {
        updateData.modeloActivo = model;
      }

      await db.collection('config').doc('ai').set(updateData, { merge: true });

      // Registrar log del cambio
      await db.collection('logs').add({
        type: 'admin',
        action: 'save_ai_config',
        mensaje: `Configuración de IA actualizada. Proveedor detectado/usado: ${detectedProvider}`,
        timestamp: new Date().toISOString(),
        metadata: {
          usuario: username,
          proveedor: detectedProvider,
          modelo: model || 'no-change'
        }
      });

      return successResponse({ 
        message: 'Configuración de IA guardada con éxito',
        detectedProvider 
      });
    } catch (err) {
      return errorResponse('Error al guardar la configuración de IA: ' + err.message, 500);
    }
  }

  // ── GET: Obtener configuración de IA actual ───────────
  if (event.httpMethod === 'GET' && action === 'get-ai-config') {
    try {
      const doc = await db.collection('config').doc('ai').get();
      if (!doc.exists) {
        return successResponse({ proveedorPrimario: 'ollama', modeloActivo: 'llama-3.1-8b-instant' });
      }
      const data = doc.data();
      // Ofuscar la API Key para que no se filtre en texto plano
      if (data.apiKey) {
        const key = data.apiKey;
        data.apiKey = key.substring(0, 6) + '...' + key.substring(key.length - 4);
      }
      return successResponse(data);
    } catch (err) {
      return errorResponse('Error al obtener la configuración de IA', 500);
    }
  }

  // ── GET: Obtener estado de salud de IA (Tiempo Real) ──
  if (event.httpMethod === 'GET' && action === 'get-ai-health') {
    try {
      const doc = await db.collection('bot').doc('ai_health').get();
      if (!doc.exists) {
        return successResponse({ providers: [] });
      }
      return successResponse(doc.data());
    } catch (err) {
      return errorResponse('Error al obtener la salud de IA', 500);
    }
  }

  return errorResponse('Acción o método no soportado', 400);
}

export const handler = withMiddlewares(rateLimitMiddleware, authMiddleware)(adminHandler);
