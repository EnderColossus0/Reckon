const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: { name: 'mathsolve', description: 'Solve math problems' },
  async execute(message, args, client) {
    let problem;

    // Check if this is a reply to another message
    if (message.reference && args.length === 0) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        problem = repliedTo.content;
      } catch (err) {
        console.error('[Mathsolve] Error fetching replied message:', err.message);
      }
    }

    if (!problem) {
      problem = args.join(' ');
    }

    if (!problem) {
      return message.reply('❌ Please provide a math problem or reply to a message. Example: `-mathsolve solve 2x + 5 = 13`');
    }
    await message.channel.sendTyping();

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

      const prompt = `Solve this math problem and show your work:\n\n${problem}\n\nProvide step-by-step solution.`;

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
      const solution = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not solve.';

      const embed = new EmbedBuilder()
        .setTitle('🧮 Math Solution')
        .setDescription(solution.slice(0, 3900))
        .setColor('#00AA00')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Mathsolve] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
