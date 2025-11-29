const { EmbedBuilder } = require('discord.js');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');
const toolHandler = require('../ai/toolHandler');

module.exports = {
  data: { name: 'explain', description: 'Explain something in simple terms' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'explain')) {
      const remaining = (getCooldownRemaining(message.author.id, 'explain') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'explain');

    let topic;

    // Check if this is a reply to another message
    if (message.reference && args.length === 0) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        topic = repliedTo.content;
      } catch (err) {
        console.error('[Explain] Error fetching replied message:', err.message);
      }
    }

    if (!topic) {
      topic = args.join(' ');
    }

    if (!topic) {
      return message.reply('❌ Please provide a topic or reply to a message. Example: `-explain quantum computing`');
    }
    await message.channel.sendTyping();

    try {
      const fullPrompt = `Explain this topic in simple, easy-to-understand terms (like explaining to a 10-year-old):\n\n${topic}\n\nKeep it concise but comprehensive.`;
      const explanation = await toolHandler.generate(message.author.id, fullPrompt);

      const embed = new EmbedBuilder()
        .setTitle('📚 Explanation')
        .setDescription(explanation.slice(0, 3900))
        .setColor('#87CEEB')
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Explain] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
