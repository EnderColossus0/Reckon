const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: { name: 'summarize', description: 'Summarize text' },
  async execute(message, args, client) {
    if (args.length === 0) {
      return message.reply('❌ Please provide text to summarize. Example: `-summarize your long text here`');
    }

    const text = args.join(' ');
    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const prompt = `Summarize the following text in 2-3 sentences, keeping the key points:\n\n${text}`;

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
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not summarize.';

      const embed = new EmbedBuilder()
        .setTitle('📝 Summary')
        .setDescription(summary.slice(0, 3900))
        .setColor('#FF9500')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Summarize] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
