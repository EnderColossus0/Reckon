const memory = require('../memory/memoryManager');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: { name: 'settitle', description: 'Set custom title for AI embed responses' },
  
  async execute(message, args) {
    const userId = message.author.id;
    
    if (args.length < 1) {
      await message.reply('Usage: `-settitle Your Title Here`\nExample: `-settitle My AI Assistant`');
      return;
    }

    const title = args.join(' ');
    
    if (title.length > 256) {
      await message.reply('Title must be 256 characters or less!');
      return;
    }

    await memory.setUserEmbedTitle(userId, title);

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`Your embed title is now set to: **${title}**`)
      .setColor('#00FF00');

    await message.reply({ embeds: [embed] });
  }
};
