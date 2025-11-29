const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: { name: 'trivia', description: 'Generate a trivia question' },
  async execute(message, args, client) {
    const category = args[0] ? args.join(' ') : 'random';
    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const prompt = `Generate an interesting trivia question about ${category}. Format your response as:
QUESTION: [the question]
A) [option A]
B) [option B]
C) [option C]
D) [option D]
ANSWER: [correct letter and explanation]`;

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
      const trivia = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate.';

      const embed = new EmbedBuilder()
        .setTitle('🧠 Trivia Question')
        .setDescription(trivia.slice(0, 3900))
        .setColor('#9370DB')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Trivia] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
