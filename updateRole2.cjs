const admin = require('firebase-admin');
const serviceAccount = {
  "type": "service_account",
  "project_id": "alero-webs",
  "private_key_id": "dummy",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDEq7c0yMVoLNw+\nK/MnvFFH3N8Wx2xtwgVE3pPiNU/ICjUjjjG9rqICo96JBzosWCQDW4zPq8SQ0qFk\nCC98yJr/EVJK+Ql4z0N3qIypZHwf5aR5n254uDAKa7/bByOqrr/xHJTxAAQG+0k6\nD04yVCXBisNFQjo74CkmEsHcnn4hQLpUXw/P48yGh91sZTpOYNZDHlMrxbezYJx2\nCkcRuKxAWrp479DWDz5jWU2wR4cDV+4HGOxYpM/6/2uIgLlIscJ8p39PR52zEIzT\naV7M+Yxlq7sQ5ga7OD/t6yOg9da+LYliBksMiIJ3JrTOD2vdj8uAHOjLF2BVrCqi\nI7wRSn7lAgMBAAECggEANdZ+Ahyd8a0qI3jbiPqj04TSq0UvWQJ+d8JogEmwy+WD\nc3bHBhJqtkdOsXtBgQcl4KdsriLq3exTEvOssD+oMn/246A16BTw9q40x2BDHGY8\ndrDeyHw/ZnLlo9tZ96z7zVDSMwEamSCsBJFRCjT/2vIWD30YPPDZwtrqp+7ZP1ei\nBRUP1guiWqGst2G03dqo5BdJdXgIbwEKBy6YW17Tk5DSjIk39S/OOmsDpzNPAB3H\nB69LzRSkErHkM/MiqKe+xauZfNKLLo5sNKj2jNP3l8nfkE1OZPlGKMuB6Z8GgUTa\nPLqllPrpmlr6evm6ob/S3uxn5J/wi1GeHYRTndK/dwKBgQDzvUEUD3V1eX8VXWFQ\nF9CkBEEMEgrEicCuN9dX3fS1UNbj6uf25I5t1sroTcuaEy4qkg2QjJ0H5oXjSgK2\n18LzhZD9pS74bVrIOeT8UnRVQSoSR6yO77+EafKC2z3EHoEab0y+s4rp+3fmsTuE\n10ilVrlpe2DKrfX7o+3mpOY4ywKBgQDOkFaG62WF4ur0F9s1OfkojZYHq1703DE4\nmtAMBQ1RMOfqMtpCvwr421zUjfEqyGIcejK2uSrGaa2CieMJB4peBFw7S8oXsKLf\nHj+jjqAttPaQO6jjPxgVgSLnvxd/XAKZWTWPHwdGtzh//QSuSiwdLsV7DwSoOu04\ntza5PxEhDwKBgCsp+tpomm6BY6YO8WrTrNk+/535m/qOQpcXwIUJA4sQk92s/gNV\nGnwNK8XT8RiKCQT09H4CyNRbWJ6VvsFOmHGz16dzl0vbYdZPmmOs3nkynxa5pq9x\necMjWBUgamHO3SInT7n95b3mEKfD/zxZO748C33Ioa2C/SrhLwJHdZXdAoGAdW9z\n8fKkXlDa+PkTJBiYgai1MhkIvDbvONozC5JXtuASCYDtu2K3jzHPffxQrt0Lglsq\nt91f5zuvbHaN/9UsojTiZse41m0Su7yLu6XbhQDL6MYyRzfYrmkjehOW/U5HH/2q\nyHqAfYCu+3zSi3AZ0mGD3ml0YVxW/5aR4xFq4JsCgYBvvKIV8mnVshuaprRuvagN\nPUQO61b3lXz25oQ828Jme1s4FagESCRpz7KIOpBmnc1I8Gt4aGhgyn6fF67LIiho\nBOaoen5WTT/OjkcrKphSo3dM9AxJmsxa6IBjDZOWv38wWaN1OYk9/kz+/PJZqc5T\nCvlPVjiq3fGaXSI/OySxmg==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@alero-webs.iam.gserviceaccount.com",
};
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function main() {
  const usersSnapshot = await db.collection('usuarios').get();
  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    console.log(`- ${doc.id}: ${data.username} (rol: ${data.rol})`);
    if (data.username && data.username.toLowerCase().includes('mauricio')) {
      console.log(`Updating ${data.username} to rol: lara`);
      await db.collection('usuarios').doc(doc.id).update({ rol: 'lara' });
    }
  }
  process.exit(0);
}
main().catch(console.error);
