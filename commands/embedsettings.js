const memory = require('../memory/memoryManager');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: { name: 'embedsettings', description: 'View all your embed customization settings' },
  
  async execute(message, args) {
    const userId = message.author.id;
    
    const userColor = await memory.getUserColor(userId);
    const userTitle = await memory.getUserEmbedTitle(userId);
    const userFooter = await memory.getUserEmbedFooter(userId);

    const settings = new EmbedBuilder()
      .setTitle('Your Embed Settings')
      .setDescription('Customize how Outlaw\'s responses look')
      .addFields(
        {
          name: '📝 Title',
          value: userTitle || 'Default: **Outlaw**\nCustomize: `-settitle Your Title`',
          inline: false
        },
        {
          name: '🎨 Color',
          value: userColor || 'Default: **White (#FFFFFF)**\nCustomize: `-setcolor #RRGGBB`',
          inline: false
        },
        {
          name: '📌 Footer',
          value: userFooter || 'Default: **Model name**\nCustomize: `-setfooter Your Text`\nReset: `-setfooter default`',
          inline: false
        }
      )
      .setColor(userColor || '#ffffff')
      .setFooter({ text: 'Use the commands above to customize your settings' });

    return message.reply({ embeds: [settings] });
  }
};
