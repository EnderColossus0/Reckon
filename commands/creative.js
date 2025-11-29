const { EmbedBuilder } = require('discord.js');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');
const toolHandler = require('../ai/toolHandler');

module.exports = {
  data: { name: 'creative', description: 'Generate creative writing' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'creative')) {
      const remaining = (getCooldownRemaining(message.author.id, 'creative') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'creative');

    let prompt;

    // Check if this is a reply to another message
    if (message.reference && args.length === 0) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        prompt = repliedTo.content;
      } catch (err) {
        console.error('[Creative] Error fetching replied message:', err.message);
      }
    }

    if (!prompt) {
      prompt = args.join(' ');
    }

    if (!prompt) {
      return message.reply('❌ Please provide a prompt or reply to a message. Example: `-creative write a short sci-fi story about time travel`');
    }
    await message.channel.sendTyping();

    try {
      const fullPrompt = `Create creative writing based on this prompt:\n\n${prompt}\n\nMake it engaging and vivid.`;
      const story = await toolHandler.generate(message.author.id, fullPrompt);

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
