const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xoa')
    .setDescription('Xóa tin nhắn (tối đa 100)')
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('Số lượng tin nhắn cần xóa')
        .setMinValue(1)
        .setMaxValue(100)),
  async execute(interaction) {
    try {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ content: 'Cậu không có quyền xóa tin nhắn ┐(´д｀)┌', ephemeral: true });
      }

      const amount = interaction.options.getInteger('amount') || 10;
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      const filteredMessages = messages.filter(msg => !msg.pinned && Date.now() - msg.createdTimestamp < 1209600000);
      
      if (filteredMessages.size === 0) {
        return interaction.reply({ content: 'Không có tin nhắn nào có thể xóa được (>﹏<)', ephemeral: true });
      }

      await interaction.channel.bulkDelete(filteredMessages, true);
      
      const reply = await interaction.reply({
        content: `Đã xóa ${filteredMessages.size} tin nhắn! ٩(◕‿◕｡)۶${
          filteredMessages.size < amount ? '\n(Một số tin nhắn quá cũ không thể xóa được)' : ''
        }`,
        ephemeral: true
      });

    } catch (error) {
      if (error.code === 50034) {
        return interaction.reply({ content: 'Không thể xóa tin nhắn cũ hơn 14 ngày (╥﹏╥)', ephemeral: true });
      }
      throw error;
    }
  }
};
