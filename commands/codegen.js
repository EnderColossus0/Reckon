const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: { name: 'codegen', description: 'Generate code for a task' },
  async execute(message, args, client) {
    if (args.length === 0) {
      return message.reply('❌ Please describe what code you need. Example: `-codegen fibonacci function in javascript`');
    }

    const request = args.join(' ');
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
