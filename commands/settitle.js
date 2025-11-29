const memory = require('../memory/memoryManager');

module.exports = {
  data: { name: 'settitle', description: 'Set custom title for AI embed responses' },
  
  async execute(message, args) {
    const userId = message.author.id;
    
    if (args.length < 1) {
      return message.reply('Usage: `-settitle Your Title Here`\nExample: `-settitle My AI Assistant`');
    }

    const title = args.join(' ');
    
    if (title.length > 256) {
      return message.reply('Title must be 256 characters or less!');
    }

    await memory.setUserEmbedTitle(userId, title);

    const { EmbedBuilder } = require('discord.js');
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(`Your embed title is now set to: **${title}**`)
      .setColor('#00FF00');

    return message.reply({ embeds: [embed] });
  }
};
