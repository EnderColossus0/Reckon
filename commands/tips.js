const { EmbedBuilder } = require('discord.js');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');
const toolHandler = require('../ai/toolHandler');

module.exports = {
  data: { name: 'tips', description: 'Get tips and advice' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'tips')) {
      const remaining = (getCooldownRemaining(message.author.id, 'tips') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'tips');

    let topic;

    // Check if this is a reply to another message
    if (message.reference && args.length === 0) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        topic = repliedTo.content;
      } catch (err) {
        console.error('[Tips] Error fetching replied message:', err.message);
      }
    }

    if (!topic) {
      topic = args.join(' ');
    }

    if (!topic) {
      return message.reply('❌ Please provide a topic or reply to a message. Example: `-tips productivity`, `-tips learning faster`, `-tips staying healthy`');
    }
    await message.channel.sendTyping();

    try {
      const fullPrompt = `Provide 5 practical, actionable tips for ${topic}. Format them as:
1. [Tip title] - [Brief explanation]
2. [Tip title] - [Brief explanation]
...and so on

Make them specific and useful, not generic.`;

      const { result: tipsText, model } = await toolHandler.generate(message.author.id, fullPrompt);

      const embed = new EmbedBuilder()
        .setTitle('💡 Tips & Advice')
        .setDescription(tipsText.slice(0, 3900))
        .setColor('#32CD32')
        .setFooter({ text: `Topic: ${topic} • Model: ${model}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Tips] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
