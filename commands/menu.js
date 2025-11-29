const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: { name: 'menu', description: 'Show all commands' },
  async execute(message, args, client) {
    const categories = {
      'AI & Model': [
        { name: 'setaimodel', desc: 'Switch between Gemini or Groq AI models' }
      ],
      'Customization': [
        { name: 'setcolor', desc: 'Set your custom embed color (hex format)' },
        { name: 'settitle', desc: 'Set custom title for AI embed responses' },
        { name: 'setfooter', desc: 'Set custom footer text for AI embed responses' },
        { name: 'embedsettings', desc: 'View all your embed customization settings' }
      ],
      'Memory & Knowledge': [
        { name: 'memory', desc: 'View or clear your personal memory' }
      ],
      'Configuration': [
        { name: 'aichat', desc: 'Set a channel for AI responses (admin only)' }
      ],
      'Utility': [
        { name: 'ping', desc: 'Check bot latency' },
        { name: 'menu', desc: 'Show this help menu' }
      ]
    };

    const embed = new EmbedBuilder()
      .setTitle('📜 Outlaw Commands')
      .setDescription('Here are all available commands. Use `-command` to run them.')
      .setColor('#00FF00');

    for (const [category, commands] of Object.entries(categories)) {
      const commandList = commands
        .map(cmd => `**-${cmd.name}**\n${cmd.desc}`)
        .join('\n\n');
      
      embed.addFields({
        name: `${category}`,
        value: commandList,
        inline: false
      });
    }

    embed.setFooter({ text: 'Need help? Use -command to run any of these!' });
    embed.setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};