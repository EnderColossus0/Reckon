const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');

module.exports = {
  data: { name: 'translate', description: 'Translate text to another language' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'translate')) {
      const remaining = Math.ceil(getCooldownRemaining(message.author.id, 'translate') / 1000);
      return message.reply(`⏳ Please wait ${remaining}s before using this command again.`);
    }
    setCooldown(message.author.id, 'translate');

    let language = args[0];
    let text;

    // Check if this is a reply to another message
    if (message.reference && args.length === 1) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        text = repliedTo.content;
      } catch (err) {
        console.error('[Translate] Error fetching replied message:', err.message);
      }
    }

    if (!text) {
      if (args.length < 2) {
        return message.reply('❌ Usage: `-translate [language] [text]` or reply to a message\nExample: `-translate spanish hello world`');
      }
      text = args.slice(1).join(' ');
    }
    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const prompt = `Translate the following text to ${language}:\n\n${text}\n\nProvide only the translation.`;

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
      const translation = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not translate.';

      const embed = new EmbedBuilder()
        .setTitle(`🌍 Translation to ${language}`)
        .setDescription(translation.slice(0, 3900))
        .setColor('#FF00FF')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Translate] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
