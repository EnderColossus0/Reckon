const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: { name: 'creative', description: 'Generate creative writing' },
  async execute(message, args, client) {
    if (args.length === 0) {
      return message.reply('❌ Please provide a prompt. Example: `-creative write a short sci-fi story about time travel`');
    }

    const prompt = args.join(' ');
    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const fullPrompt = `Create creative writing based on this prompt:\n\n${prompt}\n\nMake it engaging and vivid.`;

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
      const story = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate.';

      const embed = new EmbedBuilder()
        .setTitle('✨ Creative Writing')
        .setDescription(story.slice(0, 3900))
        .setColor('#FFD700')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Creative] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
