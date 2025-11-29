const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');

module.exports = {
  data: { name: 'joke', description: 'Tell a joke' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'joke')) {
      const remaining = (getCooldownRemaining(message.author.id, 'joke') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'joke');

    let style = args.join(' ') || 'random';

    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const fullPrompt = `Tell me a funny ${style} joke. Make it actually funny and clever, not a dad joke (unless that's what they asked for). Keep it to 1-2 paragraphs max.`;

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
      const jokeText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate.';

      const embed = new EmbedBuilder()
        .setTitle('😄 Joke')
        .setDescription(jokeText.slice(0, 3900))
        .setColor('#FFB6C1')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Joke] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
