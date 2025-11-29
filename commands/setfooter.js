const memory = require('../memory/memoryManager');

module.exports = {
  data: { name: 'setfooter', description: 'Set custom footer text for AI embed responses' },
  
  async execute(message, args) {
    const userId = message.author.id;
    
    if (args.length < 1) {
      return message.reply('Usage: `-setfooter Your Footer Text`\nExample: `-setfooter Powered by AI`\nTip: Use `-setfooter default` to show model name');
    }

    const footer = args.join(' ');
    
    if (footer.length > 2048) {
      return message.reply('Footer must be 2048 characters or less!');
    }

    if (footer.toLowerCase() === 'default') {
      await memory.setUserEmbedFooter(userId, null);
      return message.reply('Footer reset to default (model name will be shown)');
    }

    await memory.setUserEmbedFooter(userId, footer);

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle('Footer Set!')
      .setDescription(`Your embed footer is now: **${footer}**`)
      .setFooter({ text: footer })
      .setColor('#00FF00');

    return message.reply({ embeds: [embed] });
  }
};
