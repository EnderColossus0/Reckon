const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');

module.exports = {
  data: { name: 'trivia', description: 'Generate a trivia question' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'trivia')) {
      const remaining = (getCooldownRemaining(message.author.id, 'trivia') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'trivia');

    // Parse category and delay from args
    let category = 'random';
    let delaySeconds = 10; // default 10 seconds
    
    if (args.length > 0) {
      // Check if last arg is a number (delay)
      const lastArg = args[args.length - 1];
      if (!isNaN(lastArg) && lastArg.trim() !== '') {
        delaySeconds = Math.max(1, Math.min(60, parseInt(lastArg))); // clamp 1-60 seconds
        category = args.slice(0, -1).join(' ') || 'random';
      } else {
        category = args.join(' ');
      }
    }
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

      // Parse out the answer section
      const answerMatch = trivia.match(/ANSWER:\s*(.+?)$/mi);
      const answer = answerMatch ? answerMatch[1].trim() : 'Could not extract answer';
      
      // Remove ANSWER line from display
      const questionOnly = trivia.replace(/ANSWER:.*?$/mi, '').trim();

      // Create question embed (without answer)
      const questionEmbed = new EmbedBuilder()
        .setTitle('🧠 Trivia Question')
        .setDescription(questionOnly.slice(0, 3900))
        .setColor('#9370DB')
        .setFooter({ text: `Answer reveals in ${delaySeconds}s` })
        .setTimestamp();

      const reply = await message.reply({ embeds: [questionEmbed] });

      // Send answer embed after delay
      setTimeout(async () => {
        try {
          const answerEmbed = new EmbedBuilder()
            .setTitle('✅ Answer')
            .setDescription(answer)
            .setColor('#32CD32')
            .setTimestamp();

          await message.reply({ embeds: [answerEmbed] });
        } catch (err) {
          console.error('[Trivia] Error sending answer:', err.message);
        }
      }, delaySeconds * 1000);
    } catch (err) {
      console.error('[Trivia] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
