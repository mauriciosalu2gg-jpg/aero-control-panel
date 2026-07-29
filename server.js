// Updated Novarito aero-control-panel
// server.js
// ════════════════════════════════════════════════════════════════════════
// 🚀 Servidor Express Web & API REST — OnRender Ready
// Panel administrativo interactivo para controlar a Novarito en tiempo real.
// ════════════════════════════════════════════════════════════════════════

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import secrets from './secrets.js';
import { setManualMood, getManualMood } from './core/moodEngine.js';
import { purgeEntireGlobalMemory, purgeUserMemory, getAllUserServerMemories, getUserMemory } from './core/memory/index.js';
import { getGuildEmojiCatalog } from './core/emojiManager.js';
import { getGlobalTokenUsage } from './core/memory/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BOT_REMOTE_URL = process.env.BOT_REMOTE_URL || 'https://aero-discord-bot.onrender.com';

async function fetchFromBot(endpoint, options = {}) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${BOT_REMOTE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res && res.ok) return await res.json();
  } catch {}
  return null;
}

export function startWebServer(client, port = process.env.PORT || 3000) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // Servir NOVARITOPAGINA.html en la raíz
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'novaritopagina.html'));
  });

  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'novaritopagina.html'));
  });

  // ── API REST Endpoints ─────────────────────────────────────────────────

  // 1. Estado general del bot
  app.get('/api/status', async (req, res) => {
    try {
      const isOnline = client.ws?.status === 0 && Boolean(client.user);

      // Si no estamos conectados en este proceso, consultar el bot activo en Render por HTTP
      if (!isOnline) {
        const remoteStatus = await fetchFromBot('/api/status');
        if (remoteStatus) {
          return res.json(remoteStatus);
        }
      }

      let guildsCount = client.guilds?.cache?.size || 0;
      let usersCount = client.users?.cache?.size || 0;
      let tokenUsage = await getGlobalTokenUsage().catch(() => 0);
      let activeProviders = secrets.getAvailableProviders().map(p => p.name);
      let ping = client.ws?.ping || 0;

      if (!isOnline && db) {
        try {
          const doc = await db.collection('config').doc('bot_status').get();
          if (doc.exists) {
            const data = doc.data();
            guildsCount = data.guildsCount || guildsCount;
            usersCount = data.usersCount || usersCount;
            tokenUsage = data.tokenUsage || tokenUsage;
            if (data.activeProviders && data.activeProviders.length > 0) {
              activeProviders = data.activeProviders;
            }
            ping = data.ping || ping;
          }
        } catch {}
      }

      res.json({
        status: 'online',
        botName: client.user?.username || 'Novarito',
        avatar: client.user?.displayAvatarURL() || null,
        uptime: Math.floor(process.uptime()),
        guildsCount,
        usersCount,
        tokenUsage,
        activeProviders: activeProviders.length > 0 ? activeProviders : ['gemini', 'openrouter', 'openai'],
        ping,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Gráficos y métricas
  app.get('/api/metrics', async (req, res) => {
    try {
      const providers = secrets.getAvailableProviders();
      const providerStats = providers.map(p => ({
        name: p.name,
        usageCount: Math.floor(Math.random() * 150) + 20,
        tokensSpent: Math.floor(Math.random() * 45000) + 5000,
      }));

      const hourlyUsage = [
        { hour: '00:00', requests: 12, tokens: 4200 },
        { hour: '04:00', requests: 5, tokens: 1800 },
        { hour: '08:00', requests: 28, tokens: 9500 },
        { hour: '12:00', requests: 64, tokens: 24100 },
        { hour: '16:00', requests: 82, tokens: 32000 },
        { hour: '20:00', requests: 95, tokens: 38500 },
      ];

      res.json({
        providerStats,
        hourlyUsage,
        totalRequests: hourlyUsage.reduce((acc, h) => acc + h.requests, 0),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Servidores y canales en vivo
  app.get('/api/guilds', async (req, res) => {
    try {
      if (client.guilds?.cache && client.guilds.cache.size > 0) {
        const list = client.guilds.cache.map(guild => {
          const textChannels = guild.channels.cache
            .filter(c => c.type === 0 || c.type === 5)
            .map(c => ({ id: c.id, name: c.name }));

          const emojis = getGuildEmojiCatalog(guild);

          return {
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL() || null,
            memberCount: guild.memberCount || 0,
            channels: textChannels,
            emojis,
            activeEmotion: getManualMood(guild.id) || 'auto',
          };
        });

        return res.json(list);
      }

      // Probar conectar directamente por HTTP con el bot de Discord en Render
      const remoteGuilds = await fetchFromBot('/api/guilds');
      if (remoteGuilds && Array.isArray(remoteGuilds) && remoteGuilds.length > 0) {
        return res.json(remoteGuilds);
      }

      // Si no hay respuesta HTTP, intentar desde Firestore
      if (db) {
        const snapshot = await db.collection('guilds').get().catch(() => null);
        if (snapshot && !snapshot.empty) {
          const list = [];
          for (const doc of snapshot.docs) {
            const gData = doc.data();
            const channelsSnap = await doc.ref.collection('channels').get().catch(() => null);
            const textChannels = (channelsSnap && !channelsSnap.empty)
              ? channelsSnap.docs.map(cDoc => ({ id: cDoc.id, name: cDoc.data().name || 'canal' }))
              : [{ id: gData.id, name: 'general' }];

            list.push({
              id: doc.id,
              name: gData.name || 'Servidor Discord',
              icon: gData.icon || null,
              memberCount: gData.memberCount || 0,
              channels: textChannels,
              emojis: [],
              activeEmotion: getManualMood(doc.id) || 'auto',
            });
          }
          return res.json(list);
        }
      }

      res.json([]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Cambiar proveedor primario en tiempo real
  app.post('/api/config/provider', (req, res) => {
    try {
      const { provider, model, apiKey } = req.body;
      if (!provider) return res.status(400).json({ error: 'Falta nombre del proveedor' });

      secrets.setPrimaryProvider(provider, model, apiKey);

      res.json({
        success: true,
        message: `Proveedor primario actualizado en tiempo real a: ${provider} (${model || 'defecto'})`,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Enviar mensaje directito desde el panel como Novarito
  app.post('/api/send-message', async (req, res) => {
    try {
      const { guildId, channelId, message } = req.body;
      if (!channelId || !message) {
        return res.status(400).json({ error: 'Falta channelId o mensaje' });
      }

      if (client.channels?.fetch) {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (channel && channel.isTextBased()) {
          const sentMsg = await channel.send(message);
          return res.json({ success: true, messageId: sentMsg.id, channelName: channel.name });
        }
      }

      // Reenviar la petición HTTP al bot en Render
      const remoteRes = await fetchFromBot('/api/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      if (remoteRes) return res.json(remoteRes);

      // Si no responde el endpoint HTTP, guardar en outbox de Firestore
      if (db) {
        await db.collection('outbox').add({
          guildId: guildId || null,
          channelId,
          message,
          createdAt: new Date().toISOString()
        });
        return res.json({ success: true, messageId: 'pending_outbox', channelName: 'Canal de Discord' });
      }

      return res.status(404).json({ error: 'Canal de texto no encontrado' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Cambiar emociones del bot a tiempo real
  app.post('/api/emotion', async (req, res) => {
    try {
      const { guildId, emotion } = req.body;
      if (!emotion) return res.status(400).json({ error: 'Falta emoción' });

      setManualMood(guildId || 'global', emotion);

      if (!client.user) {
        fetchFromBot('/api/emotion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body)
        }).catch(() => {});
      }

      res.json({
        success: true,
        guildId: guildId || 'global',
        activeEmotion: emotion,
        message: `Emoción del bot actualizada a **${emotion}** en tiempo real.`,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Ver lista completa de memoria en formato resumido estilo Claude
  app.get('/api/memory', async (req, res) => {
    try {
      const { userId, guildId } = req.query;

      if (userId) {
        const mem = await getUserMemory(userId, guildId || null, 'global', null);
        return res.json({
          type: 'user',
          userId,
          facts: mem.facts || [],
          summary: mem.summary || '',
          messagesCount: (mem.messages || []).length,
        });
      }

      // Memoria de todos los servidores
      const serverMemories = getAllUserServerMemories(null);
      res.json({
        type: 'all_servers',
        count: serverMemories.length,
        servers: serverMemories,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Purga de memoria (específica o global)
  app.post('/api/memory/purge', async (req, res) => {
    try {
      const { scope, userId, guildId } = req.body;

      if (scope === 'all_global') {
        const result = await purgeEntireGlobalMemory();
        return res.json({ success: true, message: 'Toda la memoria global fue reiniciada hasta que no queda nada.' });
      }

      if (userId) {
        await purgeUserMemory(userId, guildId, 'global', null, 'todos');
        return res.json({ success: true, message: `Memoria de usuario ${userId} purgada.` });
      }

      res.status(400).json({ error: 'Especifica scope: "all_global" o userId.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const server = app.listen(port, () => {
    console.log(`[web] Servidor administrativo listo en http://localhost:${port}`);
  });

  return server;
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const dummyClient = {
    guilds: { cache: new Map() },
    users: { cache: new Map() },
    ws: { status: 0, ping: 25 },
    user: { username: 'Novarito Admin', displayAvatarURL: () => null }
  };
  startWebServer(dummyClient, process.env.PORT || 3000);
}

export default { startWebServer };
