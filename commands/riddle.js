const { EmbedBuilder } = require('discord.js');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');
const toolHandler = require('../ai/toolHandler');

module.exports = {
  data: { name: 'riddle', description: 'Get a riddle to solve' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'riddle')) {
      const remaining = (getCooldownRemaining(message.author.id, 'riddle') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'riddle');

    let difficulty = args[0]?.toLowerCase() || 'medium';
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      difficulty = 'medium';
    }

    await message.channel.sendTyping();

    try {
      const fullPrompt = `Create a ${difficulty} riddle. Format it as:
RIDDLE: [The riddle here]
HINT: [A helpful hint]
ANSWER: [The answer]

Make it clever and fun to solve!`;

      const riddleText = await toolHandler.generate(message.author.id, fullPrompt);

      // Parse out the answer and put it in spoiler format
      const answerMatch = riddleText.match(/ANSWER:\s*(.+?)(?:\n|$)/i);
      const answer = answerMatch ? answerMatch[1].trim() : 'Could not extract answer';
      
      // Remove ANSWER line from display, add spoiler version at end
      const displayText = riddleText.replace(/ANSWER:.*?(?:\n|$)/i, '').trim();
      const riddleWithSpoiler = displayText + `\n\n**Answer:** ||${answer}||`;

      const embed = new EmbedBuilder()
        .setTitle('🧩 Riddle')
        .setDescription(riddleWithSpoiler.slice(0, 3900))
        .setColor('#9370DB')
        .setFooter({ text: `Difficulty: ${difficulty}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Riddle] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
