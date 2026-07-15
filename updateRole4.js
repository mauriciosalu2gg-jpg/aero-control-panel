import dotenv from 'dotenv';
dotenv.config();

import { db } from './services/firebase/firestore.js';

async function main() {
  const usersSnapshot = await db.collection('users').get();
  console.log('Total users in users collection:', usersSnapshot.size);
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    console.log(`- ${doc.id}: ${data.username} (rol: ${data.rol})`);
    if (data.username && (data.username.toLowerCase().includes('mauricio') || data.username.toLowerCase().includes('lara'))) {
      console.log(`Updating ${data.username} to rol: lara`);
      await db.collection('users').doc(doc.id).update({ rol: 'lara' });
    }
  }
  process.exit(0);
}
main().catch(console.error);
