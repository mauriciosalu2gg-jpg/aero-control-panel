// Updated Novarito aero-control-panel
// core/emojiManager.js
// ════════════════════════════════════════════════════════════════════════
// 🎭 Emoji Manager — Registro inteligente de emojis por servidor.
// Catalogado por ID, nombre, URL y carga emocional para uso dinámico.
// ════════════════════════════════════════════════════════════════════════

const emojiRegistry = new Map(); // guildId -> Map(emojiId -> emojiData)

/**
 * Escanea y registra todos los emojis de un servidor con su significado emocional.
 * @param {import('discord.js').Guild} guild 
 */
export function registerGuildEmojis(guild) {
  if (!guild || !guild.emojis?.cache) return [];

  const guildMap = new Map();
  for (const [id, emoji] of guild.emojis.cache) {
    const name = emoji.name.toLowerCase();
    const emotion = classifyEmojiEmotion(name);
    const data = {
      id: emoji.id,
      name: emoji.name,
      animated: emoji.animated,
      url: emoji.imageURL({ extension: emoji.animated ? 'gif' : 'png', size: 64 }),
      mention: emoji.toString(),
      emotion,
    };
    guildMap.set(id, data);
  }
  emojiRegistry.set(guild.id, guildMap);
  return Array.from(guildMap.values());
}

/**
 * Clasifica la emoción de un emoji según su nombre.
 * @param {string} name 
 * @returns {string} - 'feliz'|'triste'|'enojado'|'troll'|'pensar'|'sorpresa'|'neutral'
 */
export function classifyEmojiEmotion(name) {
  const n = (name || '').toLowerCase();
  if (/feliz|happy|smile|lol|jaja|risas|joy|heart|corazon|amor|love|chido|good/i.test(n)) return 'feliz';
  if (/triste|sad|cry|llorar|depre|broken/i.test(n)) return 'triste';
  if (/angry|enojado|rabia|mad|fire|fuego|rage/i.test(n)) return 'enojado';
  if (/troll|clown|payaso|skull|calavera|sus|amogus|meme|xd|whip/i.test(n)) return 'troll';
  if (/pensar|think|hm|duda|idea|brain/i.test(n)) return 'pensar';
  if (/shok|wow|omg|sorpresa|pantalla|gasp/i.test(n)) return 'sorpresa';
  return 'neutral';
}

/**
 * Obtiene el emoji del servidor más adecuado para una emoción dada.
 * @param {import('discord.js').Guild|null} guild 
 * @param {string} targetEmotion 
 * @param {string} [fallbackUnicode='✨'] 
 * @returns {string} - Código de mención del emoji o fallback unicode.
 */
export function getBestEmojiForEmotion(guild, targetEmotion, fallbackUnicode = '✨') {
  if (!guild || !guild.emojis?.cache || guild.emojis.cache.size === 0) {
    return fallbackUnicode;
  }

  let guildMap = emojiRegistry.get(guild.id);
  if (!guildMap) {
    registerGuildEmojis(guild);
    guildMap = emojiRegistry.get(guild.id);
  }

  if (guildMap && guildMap.size > 0) {
    for (const [, emojiData] of guildMap) {
      if (emojiData.emotion === targetEmotion) {
        return emojiData.mention;
      }
    }
    // Si no encuentra por emoción exacta, devuelve el primer emoji del servidor
    const first = guildMap.values().next().value;
    if (first) return first.mention;
  }

  return fallbackUnicode;
}

/**
 * Obtiene una lista catalogada de todos los emojis del servidor para la web.
 * @param {import('discord.js').Guild} guild 
 */
export function getGuildEmojiCatalog(guild) {
  if (!guild) return [];
  const registered = registerGuildEmojis(guild);
  return registered;
}

export default {
  registerGuildEmojis,
  classifyEmojiEmotion,
  getBestEmojiForEmotion,
  getGuildEmojiCatalog,
};
