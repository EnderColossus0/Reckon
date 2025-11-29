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
      ],
      'Utility': [
        { name: 'ping', desc: 'Check bot latency.' },
        { name: 'menu', desc: 'Show this help menu.' }
      ]
    };

    const embed = new EmbedBuilder()
      .setTitle('Outlaw Commands')
      .setDescription('List of all available commands.\n**Prefix** — -')
      .setColor('#00FF00');

    const categoryEmojis = {
      'Configuration': '⚙️',
      'AI': '🤖',
      'Customization': '🎨',
      'Memory & Knowledge': '🧠',
      'Utility': '🛠️'
    };

    const categoryEntries = Object.entries(categories);
    categoryEntries.forEach((entry, index) => {
      const [category, commands] = entry;
      const emoji = categoryEmojis[category] || '';
      const commandList = commands
        .map(cmd => `**${cmd.name}** — ${cmd.desc}`)
        .join('\n');
      
      embed.addFields({
        name: `${emoji} ${category}`,
        value: commandList,
        inline: false
      });

      // Add spacing between categories (but not after the last one)
      if (index < categoryEntries.length - 1) {
        embed.addFields({
          name: '\u200b',
          value: '\u200b',
          inline: false
        });
      }
    });

    await message.reply({ embeds: [embed] });
  }
};