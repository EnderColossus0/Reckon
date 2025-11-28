module.exports = {
  data: { name: 'menu', description: 'Show all commands' },
  async execute(message, args, client) {
    const commands = Array.from(client.commands.values())
      .map(cmd => `**-${cmd.data.name}**: ${cmd.data.description || 'No description'}`)
      .join('\n');

    message.reply({ content: `📜 **Available Commands:**\n${commands}` });
  }
};