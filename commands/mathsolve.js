const { EmbedBuilder } = require('discord.js');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');
const toolHandler = require('../ai/toolHandler');

module.exports = {
  data: { name: 'mathsolve', description: 'Solve math problems' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'mathsolve')) {
      const remaining = (getCooldownRemaining(message.author.id, 'mathsolve') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'mathsolve');

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
      const prompt = `Solve this math problem and show your work:\n\n${problem}\n\nProvide step-by-step solution.`;
      const solution = await toolHandler.generate(message.author.id, prompt);

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
