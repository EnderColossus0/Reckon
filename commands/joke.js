const { EmbedBuilder } = require('discord.js');
const { hasCooldown, getCooldownRemaining, setCooldown } = require('../utils/cooldown');
const toolHandler = require('../ai/toolHandler');

module.exports = {
  data: { name: 'joke', description: 'Tell a joke' },
  async execute(message, args, client) {
    // Check cooldown
    if (hasCooldown(message.author.id, 'joke')) {
      const remaining = (getCooldownRemaining(message.author.id, 'joke') / 1000).toFixed(2);
      return message.reply(`Wait ${remaining}s.`);
    }
    setCooldown(message.author.id, 'joke');

    let style = args.join(' ') || 'random';

    await message.channel.sendTyping();

    try {
      const fullPrompt = `Tell me a funny ${style} joke. Make it actually funny and clever, not a dad joke (unless that's what they asked for). Keep it to 1-2 paragraphs max.`;
      const { result: jokeText, model } = await toolHandler.generate(message.author.id, fullPrompt);

      const embed = new EmbedBuilder()
        .setTitle('😄 Joke')
        .setDescription(jokeText.slice(0, 3900))
        .setColor('#FFB6C1')
        .setFooter({ text: `Model: ${model}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[Joke] Error:', err.message);
      message.reply(`❌ Error: ${err.message}`);
    }
  }
};
