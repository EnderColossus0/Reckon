const memory = require('../memory/memoryManager');

function rgbToHex(r, g, b) {
  const toHex = (n) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

module.exports = {
  data: { name: 'setcolor', description: 'Set your custom embed color (RGB: 0-255 each)' },
  
  async execute(message, args) {
    const userId = message.author.id;
    
    if (args.length < 3) {
      return message.reply('Usage: `-setcolor <red> <green> <blue>` (values 0-255)\nExample: `-setcolor 255 100 50`');
    }

    const r = parseInt(args[0]);
    const g = parseInt(args[1]);
    const b = parseInt(args[2]);

    if (isNaN(r) || isNaN(g) || isNaN(b) || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      return message.reply('Each RGB value must be between 0 and 255!');
    }

    const hex = rgbToHex(r, g, b);
    await memory.setUserColor(userId, hex);

    const embed = require('discord.js').EmbedBuilder;
    const colorEmbed = new embed()
      .setTitle('Color Set!')
      .setDescription(`Your embed color is now set to RGB(${r}, ${g}, ${b})`)
      .setColor(hex);

    return message.reply({ embeds: [colorEmbed] });
  }
};
