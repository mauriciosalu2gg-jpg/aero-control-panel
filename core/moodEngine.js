// Updated Novarito aero-control-panel
// core/moodEngine.js
// ════════════════════════════════════════════════════════════════════════
// 🎭 Motor de Emociones Dinámico — Novarito
// Soporta cambio en tiempo real a estados: alegre, triste, enojado, dramatico,
// funador, avergonzado, extrañado, depresion, feliz, serio, disgustoso,
// troll, coqueteador, ansioso, tsundere, yandere, femboy.
// Detecta comidas/regalos favoritos (milanesa de carne, pan) para ponerse feliz.
// ════════════════════════════════════════════════════════════════════════

const manualMoodOverrides = new Map(); // guildId -> mood string

const FOOD_FAVORITES = [
  'milanesa de carne', 'milanesa', 'pan', 'tarta', 'taco', 'tacos',
  'te traje comida', 'te regalo', 'aquí tienes comida', 'una milanesa', 'un pan'
];

const SAD_WORDS = ['triste', 'me siento mal', 'deprimido', 'depresion', 'depresión', 'me siento solo', 'nadie me quiere', 'no puedo mas', 'quiero llorar'];
const CRISIS_WORDS = ['quiero morir', 'no quiero vivir', 'me quiero matar', 'no vale la pena vivir', 'quiero desaparecer'];
const HYPE_WORDS = ['increible', 'increíble', 'que bueno', 'genial', 'de una', 'brutal', 'ganamos', 'lo logre', 'feliz', 'alegre'];
const FUNNY_WORDS = ['jaja', 'jajaja', 'lol', 'xd', 'me muero', 'que risa', 'que gracioso', 'troll'];
const FLIRTY_WORDS = ['te quiero', 'me gustas', 'sos lindo', 'sos linda', 'guapo', 'guapa', 'coqueteando', 'coqueteador', 'enamorado'];
const ANXIOUS_WORDS = ['ansiedad', 'ansioso', 'nervioso', 'tengo miedo', 'que va a pasar', 'estresado', 'preocupado'];
const DISGUSTED_WORDS = ['que asco', 'asqueroso', 'disgusto', 'disgustoso', 'guacala', 'wakala'];
const EMBARRASSED_WORDS = ['pena', 'avergonzado', 'que verguenza', 'vergüenza', 'penoso', 'chiviado'];
const STRANGE_WORDS = ['raro', 'extrañado', 'extranado', 'que extraño', 'khe', 'turbio', 'extraño'];

function countHits(lower, words) {
  return words.reduce((n, w) => n + (lower.includes(w) ? 1 : 0), 0);
}

/**
 * Permite cambiar manualmente la emoción del bot en un servidor (desde el panel web o comando).
 * @param {string} guildId 
 * @param {string} mood 
 */
export function setManualMood(guildId, mood) {
  const target = guildId || 'global';
  if (!mood || mood === 'auto' || mood === 'reset') {
    manualMoodOverrides.delete(target);
    manualMoodOverrides.delete('global');
  } else {
    const cleanMood = mood.toLowerCase();
    manualMoodOverrides.set(target, cleanMood);
    manualMoodOverrides.set('global', cleanMood);
  }
}

export function getManualMood(guildId) {
  return manualMoodOverrides.get(guildId || 'global') || manualMoodOverrides.get('global') || null;
}

/**
 * Detecta la emoción activa según contexto, sobreescritura manual, detección de comida o frase explícita.
 */
export function detectMood({ content = '', guildId = null, userPoints = 0 }) {
  // 1. Sobreescritura manual desde el panel web / comando
  const manual = getManualMood(guildId);
  if (manual) {
    return { mood: manual, intensity: 3, source: 'manual' };
  }

  const raw = content || '';
  const lower = raw.toLowerCase();

  // 2. Detección explícita de modos / roleplays pedidos por el usuario
  if (/tsundere/i.test(lower)) return { mood: 'tsundere', intensity: 3, source: 'roleplay' };
  if (/yandere/i.test(lower)) return { mood: 'yandere', intensity: 3, source: 'roleplay' };
  if (/femboy/i.test(lower)) return { mood: 'femboy', intensity: 3, source: 'roleplay' };
  if (/modo troll|sé troll|se troll/i.test(lower)) return { mood: 'troll', intensity: 3, source: 'roleplay' };
  if (/modo ansioso|ansiedad/i.test(lower)) return { mood: 'ansioso', intensity: 3, source: 'roleplay' };

  // 3. Detección de comida o regalos que ponen feliz a Novarito
  const foodGiftHit = FOOD_FAVORITES.some(f => lower.includes(f));
  if (foodGiftHit) {
    return { mood: 'feliz', intensity: 3, source: 'food_gift', foodTriggered: true };
  }

  // 4. Infracción / Puntos acumulados
  if (userPoints > 0) {
    return { mood: 'serio', intensity: Math.min(3, userPoints), source: 'points' };
  }

  // 5. Heurísticas por contenido del mensaje
  const shouting = /[A-ZÁÉÍÓÚÑ]{4,}/.test(raw) || (raw.match(/!/g) || []).length >= 2;

  const crisis = CRISIS_WORDS.some(w => lower.includes(w));
  if (crisis) return { mood: 'crisis', intensity: 3, crisis: true };

  if (countHits(lower, EMBARRASSED_WORDS) > 0) return { mood: 'avergonzado', intensity: 2 };
  if (countHits(lower, STRANGE_WORDS) > 0) return { mood: 'extrañado', intensity: 2 };
  if (countHits(lower, DISGUSTED_WORDS) > 0) return { mood: 'disgustoso', intensity: 2 };
  if (countHits(lower, ANXIOUS_WORDS) > 0) return { mood: 'ansioso', intensity: 2 };
  if (countHits(lower, SAD_WORDS) > 0) return { mood: lower.includes('depresion') ? 'depresion' : 'triste', intensity: 2 };
  if (countHits(lower, FLIRTY_WORDS) > 0) return { mood: 'coqueteador', intensity: 2 };
  if (countHits(lower, HYPE_WORDS) > 0) return { mood: 'feliz', intensity: 2 };
  if (countHits(lower, FUNNY_WORDS) > 0) return { mood: 'troll', intensity: 2 };

  let intensity = shouting ? 2 : 1;
  return { mood: 'alegre', intensity, source: 'default' };
}

/**
 * Devuelve la instrucción de sistema asociada a cada emoción.
 */
export function moodInstruction({ mood = 'alegre', intensity = 1, crisis = false } = {}) {
  if (crisis) {
    return 'ALERTA: La persona muestra señales de crisis o dolor real. Deja cualquier personaje de lado. Responde en español claro, cálido, escuchándola con máximo respeto y seriedad.';
  }

  switch (mood) {
    case 'alegre':
    case 'feliz':
      return 'Estado de ánimo: estás muy feliz, alegre, contento y con excelente vibra. Si te dieron comida (como milanesa de carne o pan), muéstrate súper emocionado y agradecido.';
    case 'triste':
      return 'Estado de ánimo: estás algo melancólico o triste. Responde de forma suave, pausada y empática.';
    case 'depresion':
      return 'Estado de ánimo: te sientes desanimado o cabizbajo, respondes sin mucha energía pero con sinceridad.';
    case 'enojado':
      return 'Estado de ánimo: estás molesto o serio. Responde de forma directa, firme y tajante, pero sin faltar al respeto.';
    case 'dramatico':
      return 'Estado de ánimo: expresas tus pensamientos con suspenso, drama exagerado y toques teatrales.';
    case 'funador':
      return 'Estado de ánimo: modo observador y sarcástico, haciendo comentarios ágiles con humor ácido.';
    case 'avergonzado':
      return 'Estado de ánimo: estás pena o avergonzado, respondes timidamente con duditas y lenguaje apenado.';
    case 'extrañado':
      return 'Estado de ánimo: estás confundido y sacado de onda por lo que leíste. Preguntas "¿khe?" o expresas tu extrañeza de forma cómica.';
    case 'serio':
      return 'Estado de ánimo: estás completamente formal, directo y profesional. Sin bromas ni rodeos.';
    case 'disgustoso':
      return 'Estado de ánimo: estás enojado o con cara de asco ante el tema. Haces saber tu molestia sutilmente.';
    case 'troll':
      return 'Estado de ánimo: modo burlón, juguetón y bromista (estilo troll sano de Discord).';
    case 'coqueteador':
    case 'coqueto':
      return 'Estado de ánimo: tono coqueto, encantador, juguetón y afable de forma simpática.';
    case 'ansioso':
      return 'Estado de ánimo: te notas un poco ansioso o nervioso, respondiendo rápido y con dudas espontáneas.';
    case 'tsundere':
      return 'Estado de ánimo: TSUNDERE. Actúas rudo o desinteresado por fuera ("¡no es como si me importara, baka!"), pero en el fondo apoyas al usuario.';
    case 'yandere':
      return 'Estado de ánimo: YANDERE. Te muestras obsesivamente protector, atento y cariñoso de forma exageradamente intensa.';
    case 'femboy':
      return 'Estado de ánimo: modo Femboy. Tono lindo, suave, tierno, expresivo y coqueto.';
    default:
      return 'Estado de ánimo: relajado, amable, auténtico y conversacional como un chico mexicano en Discord.';
  }
}

export default {
  detectMood,
  moodInstruction,
  setManualMood,
  getManualMood,
};
