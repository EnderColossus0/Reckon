const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: { name: 'sentiment', description: 'Analyze sentiment of text' },
  async execute(message, args, client) {
    if (args.length === 0) {
      return message.reply('❌ Please provide text to analyze. Example: `-sentiment I absolutely love this amazing day`');
    }

    const text = args.join(' ');
    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const prompt = `Analyze the sentiment of this text. Respond with:
1. Overall sentiment (Positive/Negative/Neutral)
2. Confidence level (0-100%)
3. Key emotions detected
4. Brief explanation

Text: "${text}"`;

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
      const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not analyze.';

      const embed = new EmbedBuilder()
        .setTitle('💭 Sentiment Analysis')
        .setDescription(analysis.slice(0, 3900))
        .setColor('#FF1493')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Sentiment] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
