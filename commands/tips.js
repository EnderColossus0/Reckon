const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');

module.exports = {
  data: { name: 'tips', description: 'Get tips and advice' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'tips')) {
      const remaining = (getCooldownRemaining(message.author.id, 'tips') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'tips');

    let topic;

    // Check if this is a reply to another message
    if (message.reference && args.length === 0) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        topic = repliedTo.content;
      } catch (err) {
        console.error('[Tips] Error fetching replied message:', err.message);
      }
    }

    if (!topic) {
      topic = args.join(' ');
    }

    if (!topic) {
      return message.reply('❌ Please provide a topic or reply to a message. Example: `-tips productivity`, `-tips learning faster`, `-tips staying healthy`');
    }
    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const fullPrompt = `Provide 5 practical, actionable tips for ${topic}. Format them as:
1. [Tip title] - [Brief explanation]
2. [Tip title] - [Brief explanation]
...and so on

Make them specific and useful, not generic.`;

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
      const tipsText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate.';

      const embed = new EmbedBuilder()
        .setTitle('💡 Tips & Advice')
        .setDescription(tipsText.slice(0, 3900))
        .setColor('#32CD32')
        .setFooter({ text: `Topic: ${topic}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Tips] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
