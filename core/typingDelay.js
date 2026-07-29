// Updated Novarito aero-control-panel
// core/typingDelay.js
// Calcula cuanto "tarda en escribir/responder" el bot antes de mandar el
// mensaje, de forma dinamica segun el peso del contexto: un mensaje corto y
// liviano se responde rapido, uno serio/triste/largo tarda mas. Ademas, de
// forma aleatoria, el bot a veces se "desconecta" un rato largo (como una
// persona real que no esta pegada al celular) y tarda varios minutos en
// contestar, hasta un maximo de 12 minutos. Nunca es fijo ni predecible.

const MAX_DELAY_MS = 3 * 60 * 1000; // 3 minutos, techo absoluto real

/**
 * @param {object} params
 * @param {string} params.responseText - texto que el bot va a mandar
 * @param {{mood:string, intensity:number, serious?:boolean, crisis?:boolean}} params.moodInfo
 * @param {number} params.incomingLength - largo del mensaje del usuario
 * @returns {number} milisegundos a esperar antes de mandar la respuesta
 */
export function computeThinkingDelay({ responseText = '', moodInfo = {}, incomingLength = 0, isShortInput = false } = {}) {
  const { mood, intensity = 1, serious = false, crisis = false } = moodInfo;

  // Crisis: siempre rápido, nada de drama de espera.
  if (crisis) {
    return 300 + Math.random() * 600;
  }

  // Saludos y entradas muy cortas → respuesta casi inmediata
  if (isShortInput) {
    return 500 + Math.random() * 1000;
  }

  const textWeight = Math.max(incomingLength, responseText.length);

  // Mensajes muy largos (ensayos, debates): 10s – 20s
  if (textWeight >= 900) {
    return 10_000 + Math.random() * 10_000;
  }

  // Mensajes medianos (contexto, preguntas): 2s – 5s
  if (textWeight >= 250) {
    return 2000 + Math.random() * 3000;
  }

  // ── Rango corto/normal ──
  let baseMs = 800 + Math.random() * 2000;

  const lengthFactor = Math.min(responseText.length, 600) * 2;
  baseMs += lengthFactor;

  if (incomingLength > 120) baseMs += 600 + Math.random() * 1200;

  // Temas serios o tristes: pausa un poco más larga para sentirse pensativo
  if (serious) baseMs += 1500 + Math.random() * 2000;
  else if (mood === 'triste') baseMs += 1000 + Math.random() * 1500;

  // Modo hype/divertido: más rápido y espontáneo
  if ((mood === 'hype' || mood === 'divertido') && intensity >= 2) {
    baseMs *= 0.55;
  }

  const jitter = (Math.random() - 0.5) * 600;
  baseMs += jitter;
  return Math.max(600, Math.min(baseMs, 8000));
}

/**
 * Espera el delay antes de responder. Si el delay es corto (charla normal),
 * mantiene el indicador de "escribiendo..." de Discord activo todo el rato
 * (se refresca cada ~8s porque Discord lo oculta solo despues de 10s). Si
 * el delay es largo (minutos), NO dejamos el typing prendido todo ese
 * tiempo -- se veria falso -- sino que lo activamos recien cerca del final,
 * como si el bot recien ahora se hubiera puesto a escribir.
 */
export async function humanizedTyping(channel, delayMs) {
  const TYPING_WINDOW_MS = 9000; // cuanto antes del envio se activa el "escribiendo..."

  if (delayMs <= TYPING_WINDOW_MS + 500) {
    // Delay corto: comportamiento de siempre, typing indicator todo el tiempo.
    const start = Date.now();
    await channel.sendTyping().catch(() => {});
    while (Date.now() - start < delayMs) {
      const remaining = delayMs - (Date.now() - start);
      const step = Math.min(remaining, 8000);
      await new Promise(r => setTimeout(r, step));
      if (Date.now() - start < delayMs) {
        await channel.sendTyping().catch(() => {});
      }
    }
    return;
  }

  // Delay largo: esperamos en silencio la mayor parte del tiempo, y recien
  // en los ultimos segundos prendemos el indicador de "escribiendo...".
  const silentPart = delayMs - TYPING_WINDOW_MS;
  await new Promise(r => setTimeout(r, silentPart));

  const start = Date.now();
  await channel.sendTyping().catch(() => {});
  while (Date.now() - start < TYPING_WINDOW_MS) {
    const remaining = TYPING_WINDOW_MS - (Date.now() - start);
    const step = Math.min(remaining, 8000);
    await new Promise(r => setTimeout(r, step));
    if (Date.now() - start < TYPING_WINDOW_MS) {
      await channel.sendTyping().catch(() => {});
    }
  }
}

export default { computeThinkingDelay, humanizedTyping };
