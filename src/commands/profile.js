const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hoso')
        .setDescription('Xem thông tin hồ sơ của thành viên')
        .addUserOption(option =>
            option.setName('thanhvien')
                .setDescription('Chọn thành viên cần xem thông tin')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Sửa từ 'user' thành 'thanhvien' để khớp với tên option
            const targetUser = interaction.options.getUser('thanhvien') || interaction.user;
            const member = await interaction.guild.members.fetch(targetUser.id);

            const embed = new EmbedBuilder()
                .setColor(0xFF69B4)
                .setTitle(`Hồ sơ của ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '🏷️ Tên người dùng', value: targetUser.tag, inline: true },
                    { name: '🆔 ID', value: targetUser.id, inline: true },
                    { name: '📅 Ngày tham gia', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                    { name: '📆 Ngày tạo tài khoản', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: '🎭 Vai trò', value: member.roles.cache.map(role => `${role}`).join(', ') || 'Không có vai trò' }
                )
                .setFooter({ text: 'MoMo Bot ٩(◕‿◕｡)۶' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            logger.info(`Profile command executed for ${targetUser.tag}`, {
                executor: interaction.user.tag,
                target: targetUser.tag
            });
        } catch (error) {
            logger.error('Error executing profile command', { error: error.message });
            await interaction.reply({
                content: 'Có lỗi xảy ra khi hiển thị thông tin người dùng (╥﹏╥)',
                ephemeral: true
            });
        }
    },
};
