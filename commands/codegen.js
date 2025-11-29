const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');

module.exports = {
  data: { name: 'codegen', description: 'Generate code for a task' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'codegen')) {
      const remaining = Math.ceil(getCooldownRemaining(message.author.id, 'codegen') / 1000);
      return message.reply(`⏳ Please wait ${remaining}s before using this command again.`);
    }
    setCooldown(message.author.id, 'codegen');

    let request;

    // Check if this is a reply to another message
    if (message.reference && args.length === 0) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        request = repliedTo.content;
      } catch (err) {
        console.error('[Codegen] Error fetching replied message:', err.message);
      }
    }

    if (!request) {
      request = args.join(' ');
    }

    if (!request) {
      return message.reply('❌ Please describe what code you need or reply to a message. Example: `-codegen fibonacci function in javascript`');
    }
    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const prompt = `Generate clean, well-commented code for: ${request}\n\nProvide only the code with brief comments. Include an example usage if applicable.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
          })
        }
      );

      if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

      const data = await res.json();
      const code = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate code.';

      const embed = new EmbedBuilder()
        .setTitle('💻 Code Generation')
        .setDescription('```' + code.slice(0, 3900) + '```')
        .setColor('#00FF00')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Codegen] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
