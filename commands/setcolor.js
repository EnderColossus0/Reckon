const memory = require('../memory/memoryManager');

module.exports = {
  data: { name: 'setcolor', description: 'Set your custom embed color (hex format)' },
  
  async execute(message, args) {
    const userId = message.author.id;
    
    if (args.length < 1) {
      return message.reply('Usage: `-setcolor #RRGGBB`\nExample: `-setcolor #FF6432`');
    }

    let hex = args[0];
    if (!hex.startsWith('#')) hex = '#' + hex;

    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(hex)) {
      return message.reply('Invalid hex color! Use format #RRGGBB (e.g., #FF6432)');
    }

    await memory.setUserColor(userId, hex);

    const embed = require('discord.js').EmbedBuilder;
    const colorEmbed = new embed()
      .setTitle('Color Set!')
      .setDescription(`Your embed color is now set to ${hex}`)
      .setColor(hex);

    return message.reply({ embeds: [colorEmbed] });
  }
};
