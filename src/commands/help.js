const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('thongtin')
    .setDescription('Hiển thị danh sách lệnh')
    .setNameLocalizations({
      vi: 'thôngtin'
    }),
  async execute(interaction) {
    const commands = interaction.client.commands;
    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('✨ Các lệnh của MoMo ✨')
      .setDescription('Sử dụng / để thực hiện lệnh')
      .addFields(
        Array.from(commands.values())
          .map(cmd => ({ name: `/${cmd.data.name}`, value: cmd.data.description }))
      )
      .setFooter({ text: 'MoMo Bot ٩(◕‿◕｡)۶' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
