const { EmbedBuilder } = require('discord.js');

module.exports = {
  data: { name: 'menu', description: 'Show all commands' },
  async execute(message, args, client) {
    const categories = {
      'Configuration': [
        { name: 'aichat', desc: 'Set a channel for AI responses.' }
      ],
      'AI': [
        { name: 'setaimodel', desc: 'Switch between Gemini or Groq AI.' }
      ],
      'Customization': [
        { name: 'setcolor', desc: 'Set custom embed color for AI embed responses.' },
        { name: 'settitle', desc: 'Set custom title for AI embed responses.' },
        { name: 'setfooter', desc: 'Set custom footer text for AI embed responses.' },
        { name: 'embedsettings', desc: 'View your embed customization settings.' }
      ],
      'Memory & Knowledge': [
        { name: 'memory', desc: 'View or clear your personal memory.' }
      ]
    };

    const embed = new EmbedBuilder()
      .setTitle('Outlaw Commands')
      .setDescription('List of all available commands.\n**Prefix** — -')
      .setColor('#00FF00');

    for (const [category, commands] of Object.entries(categories)) {
      const commandList = commands
        .map(cmd => `**${cmd.name}** — ${cmd.desc}`)
        .join('\n');
      
      embed.addFields({
        name: category,
        value: commandList,
        inline: false
      });
    }

    await message.reply({ embeds: [embed] });
  }
};