const memory = require('../memory/memoryManager');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: { name: 'setfooter', description: 'Set custom footer text for AI embed responses' },
  
  async execute(message, args) {
    const userId = message.author.id;
    
    if (args.length < 1) {
      await message.reply('Usage: `-setfooter Your Footer Text`\nExample: `-setfooter Powered by AI`\nTip: Use `-setfooter default` to show model name');
      return;
    }

    const footer = args.join(' ');
    
    if (footer.length > 2048) {
      await message.reply('Footer must be 2048 characters or less!');
      return;
    }

    if (footer.toLowerCase() === 'default') {
      await memory.setUserEmbedFooter(userId, null);
      await message.reply('Footer reset to default (model name will be shown)');
      return;
    }

    await memory.setUserEmbedFooter(userId, footer);

    const embed = new EmbedBuilder()
      .setTitle('Footer Set!')
      .setDescription(`Your embed footer is now: **${footer}**`)
      .setFooter({ text: footer })
      .setColor('#00FF00');

    await message.reply({ embeds: [embed] });
  }
};
