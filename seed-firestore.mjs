#!/usr/bin/env node
/**
 * @file seed-firestore.mjs
 * @description Script de inicialización de Firestore para Aero Panels.
 *
 * Crea los documentos base necesarios para que el panel y el bot funcionen:
 *   - bot/status        → Estado inicial del bot
 *   - config/panel      → Configuración global del panel
 *   - config/ai         → Configuración de proveedores de IA
 *   - roles/admin, roles/moderador, roles/user → Permisos por rol
 *   - El primer usuario administrador (si se provee en .env o CLI)
 *
 * USO:
 *   FIREBASE_PROJECT_ID=aero-panels \
 *   FIREBASE_CLIENT_EMAIL=xxxx@aero-panels.iam.gserviceaccount.com \
 *   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
 *   node seed-firestore.mjs
 *
 * O con archivo de credenciales:
 *   cp config/firebase-service-account.example.json config/firebase-service-account.json
 *   # Editar el JSON con tus credenciales reales
 *   node seed-firestore.mjs
 *
 * IMPORTANTE: Ejecutar solo una vez al hacer el setup inicial.
 * Este script es idempotente: no sobreescribe documentos que ya existen.
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Inicializar Firebase Admin ────────────────────────────────────────────────
const admin = (await import('firebase-admin')).default;

let credential;
const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
  credential = admin.credential.cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
  console.log('✅ Usando credenciales de variables de entorno');
} else {
  const keyPath = resolve(__dirname, 'config/firebase-service-account.json');
  if (!existsSync(keyPath)) {
    console.error('❌ No se encontraron credenciales de Firebase.');
    console.error('   Opción A: Configura FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en el .env');
    console.error('   Opción B: Copia config/firebase-service-account.example.json → config/firebase-service-account.json y rellénalo');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  credential = admin.credential.cert(serviceAccount);
  console.log('✅ Usando credenciales de config/firebase-service-account.json');
}

if (!admin.apps.length) {
  admin.initializeApp({ credential });
}

const db = admin.firestore();

// ── Utilidad: crear documento solo si no existe ───────────────────────────────
async function createIfNotExists(ref, data, label) {
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`⏭️  Ya existe: ${label}`);
    return false;
  }
  await ref.set(data);
  console.log(`✅ Creado: ${label}`);
  return true;
}

// ── SEED ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🔥 Iniciando seed de Firestore para proyecto: aero-panels\n');
  const now = new Date().toISOString();

  // ── 1. Estado inicial del bot ────────────────────────────────────────────
  await createIfNotExists(
    db.collection('bot').doc('status'),
    {
      status: 'offline',
      uptime: 0,
      latencyMs: null,
      memoryMB: null,
      modeloActivo: null,
      guildsCount: 0,
      tokensUsedToday: 0,
      apisStatus: {
        groq: 'unknown',
        openai: 'unknown',
        gemini: 'unknown',
        anthropic: 'unknown',
      },
      lastHeartbeat: null,
      lastSync: now,
      version: '1.0.0',
    },
    'bot/status'
  );

  // ── 2. Configuración del panel ───────────────────────────────────────────
  await createIfNotExists(
    db.collection('config').doc('panel'),
    {
      nombre: 'Aero Panels',
      version: '1.0.0',
      dominio: 'aero-company.com.mx',
      mantenimiento: false,
      tokenRateLimit: 500,    // tokens máximos por usuario/día
      sessionTTLhours: 8,
      maxLoginAttempts: 5,
      updateIntervalMs: 15000,
      createdAt: now,
    },
    'config/panel'
  );

  // ── 3. Configuración de proveedores de IA ────────────────────────────────
  await createIfNotExists(
    db.collection('config').doc('ai'),
    {
      proveedorPrimario: 'groq',
      modelosPorProveedor: {
        groq: 'llama-3.1-8b-instant',
        openai: 'gpt-4o-mini',
        gemini: 'gemini-1.5-flash',
        anthropic: 'claude-3-haiku-20240307',
      },
      failoverOrder: ['groq', 'openai', 'gemini', 'anthropic'],
      maxRetriesByProvider: 2,
      timeoutMs: 30000,
      updatedAt: now,
    },
    'config/ai'
  );

  // ── 4. Roles del sistema ─────────────────────────────────────────────────
  const roles = [
    {
      id: 'admin',
      data: {
        nombre: 'Administrador',
        permisos: [
          'users_manage',
          'logs_view',
          'guilds_view',
          'config_edit',
          'recoveries_manage',
          'bot_manage',
          'roles_manage',
        ],
        nivel: 100,
        color: '#f5a623',
        updatedAt: now,
      },
    },
    {
      id: 'moderador',
      data: {
        nombre: 'Moderador',
        permisos: [
          'logs_view',
          'guilds_view',
          'recoveries_manage',
        ],
        nivel: 50,
        color: '#4bd37b',
        updatedAt: now,
      },
    },
    {
      id: 'user',
      data: {
        nombre: 'Usuario',
        permisos: [],
        nivel: 1,
        color: '#8a92aa',
        updatedAt: now,
      },
    },
    {
      id: 'lara',
      data: {
        nombre: 'Lara (Propietaria)',
        permisos: [
          'users_manage',
          'logs_view',
          'guilds_view',
          'config_edit',
          'recoveries_manage',
          'bot_manage',
          'roles_manage',
          'system_owner',
        ],
        nivel: 999,
        color: '#e8891c',
        updatedAt: now,
      },
    },
    {
      id: 'gio',
      data: {
        nombre: 'Gio (Co-Propietario)',
        permisos: [
          'users_manage',
          'logs_view',
          'guilds_view',
          'config_edit',
          'recoveries_manage',
          'bot_manage',
          'roles_manage',
          'system_owner',
        ],
        nivel: 999,
        color: '#e8891c',
        updatedAt: now,
      },
    },
  ];

  for (const { id, data } of roles) {
    await createIfNotExists(db.collection('roles').doc(id), data, `roles/${id}`);
  }

  // ── 5. Log de seed ───────────────────────────────────────────────────────
  await db.collection('logs').add({
    type: 'system',
    action: 'seed_firestore',
    mensaje: 'Firestore inicializado mediante seed-firestore.mjs',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    metadata: { version: '1.0.0', by: 'seed-script' },
  });
  console.log('✅ Log de inicialización registrado en logs/');

  console.log('\n🎉 Seed completado. Firestore listo para Aero Panels.\n');
  console.log('📋 Próximos pasos:');
  console.log('   1. Ve a Firebase Console → Firestore → Revisa que se crearon las colecciones');
  console.log('   2. Crea el primer usuario admin con: node create-admin.mjs');
  console.log('   3. Añade las variables de entorno al bot en Render/Railway');
  console.log('   4. Despliega la web en Netlify con las variables de entorno configuradas\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Error en el seed:', err);
  process.exit(1);
});
