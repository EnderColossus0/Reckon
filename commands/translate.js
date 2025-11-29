const { EmbedBuilder } = require('discord.js');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');
const toolHandler = require('../ai/toolHandler');

module.exports = {
  data: { name: 'translate', description: 'Translate text to another language' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'translate')) {
      const remaining = (getCooldownRemaining(message.author.id, 'translate') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'translate');

    let language = args[0];
    let text;

    // Check if this is a reply to another message
    if (message.reference && args.length === 1) {
      try {
        const repliedTo = await message.channel.messages.fetch(message.reference.messageId);
        text = repliedTo.content;
      } catch (err) {
        console.error('[Translate] Error fetching replied message:', err.message);
      }
    }

    if (!text) {
      if (args.length < 2) {
        return message.reply('❌ Usage: `-translate [language] [text]` or reply to a message\nExample: `-translate spanish hello world`');
      }
      text = args.slice(1).join(' ');
    }
    await message.channel.sendTyping();

    try {
      const prompt = `Translate the following text to ${language}:\n\n${text}\n\nProvide only the translation.`;
      const { result: translation, model } = await toolHandler.generate(message.author.id, prompt);

      const embed = new EmbedBuilder()
        .setTitle(`🌍 Translation to ${language}`)
        .setDescription(translation.slice(0, 3900))
        .setColor('#FF00FF')
        .setFooter({ text: `Model: ${model}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Translate] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
