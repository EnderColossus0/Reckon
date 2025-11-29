const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');

module.exports = {
  data: { name: 'explain', description: 'Explain something in simple terms' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'explain')) {
      const remaining = (getCooldownRemaining(message.author.id, 'explain') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'explain');

    let topic;

    // Check if this is a reply to another message
    if (message.reference && args.length === 0) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        topic = repliedTo.content;
      } catch (err) {
        console.error('[Explain] Error fetching replied message:', err.message);
      }
    }

    if (!topic) {
      topic = args.join(' ');
    }

    if (!topic) {
      return message.reply('❌ Please provide a topic or reply to a message. Example: `-explain quantum computing`');
    }
    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const fullPrompt = `Explain this topic in simple, easy-to-understand terms (like explaining to a 10-year-old):\n\n${topic}\n\nKeep it concise but comprehensive.`;

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
      const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate.';

      const embed = new EmbedBuilder()
        .setTitle('📚 Explanation')
        .setDescription(explanation.slice(0, 3900))
        .setColor('#87CEEB')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Explain] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
