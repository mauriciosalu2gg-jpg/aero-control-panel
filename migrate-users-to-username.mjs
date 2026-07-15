#!/usr/bin/env node
/**
 * @file migrate-users-to-username.mjs
 * @description Migración única: convierte el campo 'numeroAdministrativo' -> 'username'
 *              en todos los documentos de la colección 'usuarios' en Firestore.
 *
 * USO:
 *   # Ver qué documentos se migrarían (sin tocar nada):
 *   DRY_RUN=true node migrate-users-to-username.mjs
 *
 *   # Ejecutar migración real:
 *   node migrate-users-to-username.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.env.DRY_RUN === 'true';

if (DRY_RUN) console.log('DRY RUN: no se modificará ningún documento.\n');

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
  if (!existsSync(keyPath)) { console.error('No se encontraron credenciales.'); process.exit(1); }
  credential = admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8')));
}

if (!admin.apps.length) admin.initializeApp({ credential });
const db = admin.firestore();

async function main() {
  console.log('Iniciando migracion de "numeroAdministrativo" -> "username"...\n');
  const snapshot = await db.collection('usuarios').get();

  if (snapshot.empty) { console.log('No hay documentos. Nada que migrar.'); process.exit(0); }

  let migrated = 0, skipped = 0, errors = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.username) { console.log(`OMITIDO ${doc.id}: ya tiene username="${data.username}"`); skipped++; continue; }
    if (!data.numeroAdministrativo) { console.warn(`OMITIDO ${doc.id}: sin numeroAdministrativo ni username`); skipped++; continue; }

    const username = String(data.numeroAdministrativo).toLowerCase().trim();
    console.log(`MIGRAR ${doc.id}: "${data.numeroAdministrativo}" -> username="${username}"`);

    if (!DRY_RUN) {
      try {
        await doc.ref.update({
          username,
          _legacyNumeroAdministrativo: data.numeroAdministrativo,
          numeroAdministrativo: admin.firestore.FieldValue.delete(),
        });
        migrated++;
      } catch (err) { console.error(`ERROR ${doc.id}:`, err.message); errors++; }
    } else { migrated++; }
  }

  console.log(`\nMigrados: ${migrated} | Omitidos: ${skipped} | Errores: ${errors}`);
  if (DRY_RUN) console.log('DRY RUN completado. Ningun documento fue modificado.');
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => { console.error('Error fatal:', err); process.exit(1); });
