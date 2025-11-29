const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');

module.exports = {
  data: { name: 'riddle', description: 'Get a riddle to solve' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'riddle')) {
      const remaining = (getCooldownRemaining(message.author.id, 'riddle') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'riddle');

    let difficulty = args[0]?.toLowerCase() || 'medium';
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      difficulty = 'medium';
    }

    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const fullPrompt = `Create a ${difficulty} riddle. Format it as:
RIDDLE: [The riddle here]
HINT: [A helpful hint]
ANSWER: [The answer]

Make it clever and fun to solve!`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
          })
        }
      );

      if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

      const data = await res.json();
      const riddleText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate.';

      const embed = new EmbedBuilder()
        .setTitle('🧩 Riddle')
        .setDescription(riddleText.slice(0, 3900))
        .setColor('#9370DB')
        .setFooter({ text: `Difficulty: ${difficulty}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Riddle] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
