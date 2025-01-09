const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Thông tin về MoMo Bot'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('✨ MoMo Bot ✨')
      .setDescription('Một bot Discord dễ thương với tính cách anime!')
      .addFields(
        { name: '🤖 Lệnh có sẵn', value: 'Dùng / để xem danh sách lệnh' },
        { name: '💬 Chat', value: 'Dùng /chat để trò chuyện với MoMo' },
        { name: '🗑️ Xóa tin nhắn', value: 'Dùng /xoa số_lượng để xóa tin nhắn' }
      )
      .setFooter({ text: 'MoMo Bot v2.0 ٩(◕‿◕｡)۶' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
