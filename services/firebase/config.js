import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Cargar .env si existe (desarrollo local). En Netlify no hay .env pero las
// variables están inyectadas automáticamente en process.env.
dotenv.config();

/**
 * Obtiene las credenciales del SDK de Firebase de manera dinámica.
 * Intenta cargar desde variables de entorno (ideal para producción en Netlify),
 * o desde el archivo config/firebase-service-account.json en desarrollo local.
 */
export function getFirebaseCredential() {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  console.log('[Firebase Config] PROJECT_ID present:', !!FIREBASE_PROJECT_ID);
  console.log('[Firebase Config] CLIENT_EMAIL present:', !!FIREBASE_CLIENT_EMAIL);
  console.log('[Firebase Config] PRIVATE_KEY present:', !!FIREBASE_PRIVATE_KEY);

  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    // Manejar ambos formatos: \\n literales o \n reales en la clave privada
    let privateKey = FIREBASE_PRIVATE_KEY;
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    return admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    });
  }

  // Fallback local en desarrollo
  const localKeyPath = path.resolve(process.cwd(), 'config/firebase-service-account.json');
  if (fs.existsSync(localKeyPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
      return admin.credential.cert(serviceAccount);
    } catch (err) {
      console.error('Error al parsear config/firebase-service-account.json:', err);
    }
  }

  // Diagnóstico
  const envKeys = Object.keys(process.env).filter(k => k.startsWith('FIREBASE') || k.startsWith('JWT'));
  console.error('[Firebase Config] Available env keys:', envKeys);

  throw new Error('No se configuraron las credenciales de Firebase en las variables de entorno ni se encontró config/firebase-service-account.json');
}
