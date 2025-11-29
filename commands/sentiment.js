const { EmbedBuilder } = require('discord.js');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');
const toolHandler = require('../ai/toolHandler');

module.exports = {
  data: { name: 'sentiment', description: 'Analyze sentiment of text' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'sentiment')) {
      const remaining = (getCooldownRemaining(message.author.id, 'sentiment') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'sentiment');

    let text;

    // Check if this is a reply to another message
    if (message.reference && args.length === 0) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        text = repliedTo.content;
      } catch (err) {
        console.error('[Sentiment] Error fetching replied message:', err.message);
      }
    }

    if (!text) {
      text = args.join(' ');
    }

    if (!text) {
      return message.reply('❌ Please provide text to analyze or reply to a message. Example: `-sentiment I absolutely love this amazing day`');
    }
    await message.channel.sendTyping();

    try {
      const prompt = `Analyze the sentiment of this text. Respond with:
1. Overall sentiment (Positive/Negative/Neutral)
2. Confidence level (0-100%)
3. Key emotions detected
4. Brief explanation

Text: "${text}"`;

      const { result: analysis, model } = await toolHandler.generate(message.author.id, prompt);

      const embed = new EmbedBuilder()
        .setTitle('💭 Sentiment Analysis')
        .setDescription(analysis.slice(0, 3900))
        .setColor('#FF1493')
        .setFooter({ text: `Model: ${model}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Sentiment] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
