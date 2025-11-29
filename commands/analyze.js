const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: { name: 'analyze', description: 'Analyze an image URL' },
  async execute(message, args, client) {
    if (!args[0]) {
      return message.reply('❌ Please provide an image URL. Example: `-analyze https://example.com/image.jpg`');
    }

    const imageUrl = args[0];
    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const prompt = `Analyze this image and describe what you see in detail. Include: objects, colors, composition, mood, and any text visible.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: await fetchImageAsBase64(imageUrl) } }
              ]
            }]
          })
        }
      );

      if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);

      const data = await res.json();
      const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not analyze image.';

      const embed = new EmbedBuilder()
        .setTitle('🖼️ Image Analysis')
        .setDescription(analysis.slice(0, 3900))
        .setImage(imageUrl)
        .setColor('#00CCFF')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Analyze] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  const buffer = await res.buffer();
  return buffer.toString('base64');
}
