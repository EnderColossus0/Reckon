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
      'AI Tools': [
        { name: 'analyze', desc: 'Analyze an image URL.' },
        { name: 'codegen', desc: 'Generate code for a task.' },
        { name: 'creative', desc: 'Generate creative writing.' },
        { name: 'explain', desc: 'Explain something in simple terms.' },
        { name: 'joke', desc: 'Tell a funny joke.' },
        { name: 'mathsolve', desc: 'Solve math problems with steps.' },
        { name: 'riddle', desc: 'Get a riddle to solve.' },
        { name: 'sentiment', desc: 'Analyze sentiment of text.' },
        { name: 'summarize', desc: 'Summarize text.' },
        { name: 'tips', desc: 'Get practical tips and advice.' },
        { name: 'translate', desc: 'Translate text to another language.' },
        { name: 'trivia', desc: 'Generate a trivia question.' }
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
        { name: 'menu', desc: 'Show this help menu.' },
        { name: 'help', desc: 'Get detailed help for a specific command.' }
      ]
    };

    const embed = new EmbedBuilder()
      .setTitle('Outlaw Commands')
      .setDescription('List of all available commands.\n**Prefix** — -')
      .setColor('#FFFFFF');

    const categoryEmojis = {
      'Configuration': '⚙️',
      'AI': '🤖',
      'AI Tools': '🔧',
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