import { withMiddlewares, rateLimitMiddleware, authMiddleware } from '../../middleware/index.js';
import { successResponse, errorResponse } from '../../utils/responses.js';
import { db } from '../../services/firebase/firestore.js';
import { obtenerLogs } from '../../services/firebase/logs.js';
import { obtenerSolicitudes, resolverSolicitud } from '../../services/firebase/recuperaciones.js';
import { rolTienePermiso } from '../../services/firebase/roles.js';

async function adminHandler(event, context) {
  const { rol, username } = event.user;

  // Validar permisos usando el sistema de roles de Firestore (fuente única de verdad)
  const esAdmin = await rolTienePermiso(rol, 'users_manage');
  if (!esAdmin) {
    return errorResponse('Acceso denegado. Permisos insuficientes.', 403);
  }

  const queryParams = event.queryStringParameters || {};
  const action = queryParams.action || '';

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
      return errorResponse('Error al obtener el estado del bot', 500);
    }
  }

  // ── GET: Obtener lista de servidores ───────────────────
  if (event.httpMethod === 'GET' && action === 'guilds') {
    try {
      const snapshot = await db.collection('guilds').get();
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      return successResponse(list);
    } catch (err) {
      return errorResponse('Error al obtener la lista de servidores', 500);
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

    const { proveedorPrimario, modeloActivo } = body;
    if (!proveedorPrimario) {
      return errorResponse('Se requiere proveedorPrimario', 400);
    }

    try {
      await db.collection('config').doc('ai').set({
        proveedorPrimario,
        modeloActivo: modeloActivo || '',
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

  return errorResponse('Acción o método no soportado', 400);
}

export const handler = withMiddlewares(rateLimitMiddleware, authMiddleware)(adminHandler);
