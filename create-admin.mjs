#!/usr/bin/env node
/**
 * @file create-admin.mjs
 * @description Script para crear el primer usuario administrador en Firestore.
 *
 * USO:
 *   ADMIN_NUMERO=1234 ADMIN_PASSWORD=TuPassword123 node create-admin.mjs
 *
 * También puedes editar las constantes de abajo directamente.
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createHash } from 'crypto';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuración del admin a crear ────────────────────────────────────────────
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || process.env.ADMIN_NUMERO || 'lara').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ADMIN_DISCORD_ID = process.env.ADMIN_DISCORD_ID || null;
const ADMIN_ROL = process.env.ADMIN_ROL || 'lara'; // 'admin', 'lara', 'gio'

if (!ADMIN_PASSWORD) {
  console.error('❌ Debes proporcionar ADMIN_PASSWORD como variable de entorno.');
  console.error('   Ejemplo: ADMIN_USERNAME=lara ADMIN_PASSWORD=MiPassword node create-admin.mjs');
  process.exit(1);
}

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
} else {
  const keyPath = resolve(__dirname, 'config/firebase-service-account.json');
  if (!existsSync(keyPath)) {
    console.error('❌ No se encontraron credenciales de Firebase. Configura las variables de entorno o el archivo de servicio.');
    process.exit(1);
  }
  const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
  credential = admin.credential.cert(serviceAccount);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential });
}

const db = admin.firestore();

// ── Función de hash de contraseña usando bcryptjs ─────────────────────────────
async function hashSimple(password) {
  try {
    const bcrypt = (await import('bcryptjs')).default;
    return await bcrypt.hash(password, 10);
  } catch (err) {
    console.error('Error al importar/usar bcryptjs:', err);
    // Fallback: hash SHA-256 con prefijo para indicar que no es bcryptjs
    const hash = createHash('sha256').update(password + 'aero-salt-2024').digest('hex');
    console.warn('⚠️  bcryptjs no disponible. Usando hash temporal.');
    return `sha256:${hash}`;
  }
}

// ── Crear usuario ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n👤 Creando usuario administrador "${ADMIN_USERNAME}"...\n`);
  // Verificar si ya existe
  const snapshot = await db.collection('usuarios')
    .where('username', '==', ADMIN_USERNAME)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    console.log(`⏭️  Ya existe un usuario con el username "${ADMIN_USERNAME}".`);
    console.log('   Usa el panel de administración para modificarlo.');
    process.exit(0);
  }

  const passwordHash = await hashSimple(ADMIN_PASSWORD);
  const now = new Date().toISOString();

  const nuevoUsuario = {
    username: ADMIN_USERNAME,
    password: passwordHash,
    discordId: ADMIN_DISCORD_ID ? String(ADMIN_DISCORD_ID) : null,
    rol: ADMIN_ROL,
    estado: 'activo',
    nombre: ADMIN_USERNAME,
    fechaCreacion: now,
    ultimoAcceso: null,
  };

  const docRef = await db.collection('usuarios').add(nuevoUsuario);

  // Log del evento
  await db.collection('logs').add({
    type: 'admin',
    action: 'create_admin_user',
    mensaje: `Usuario admin "${ADMIN_USERNAME}" creado mediante create-admin.mjs`,
    timestamp: new Date().toISOString(),
    metadata: {
      username: ADMIN_USERNAME,
      rol: ADMIN_ROL,
      docId: docRef.id,
      by: 'seed-script',
    },
  });

  console.log(`✅ Usuario creado exitosamente.`);
  console.log(`   ID en Firestore: ${docRef.id}`);
  console.log(`   Username: ${ADMIN_USERNAME}`);
  console.log(`   Rol: ${ADMIN_ROL}`);
  console.log(`\n⚠️  IMPORTANTE: Si el hash fue SHA-256 (bcryptjs no disponible),`);
  console.log(`   el login no funcionará hasta que instales las dependencias del proyecto (npm install)`);
  console.log(`   y vuelvas a correr este script.\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
