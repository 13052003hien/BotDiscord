require('dotenv/config');
const { Client, IntentsBitField, Collection } = require('discord.js');
const axios = require('axios');
const logger = require('./utils/logger');
const fs = require('fs');
const path = require('path');

// Replace console.log/error with logger
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection', { error: error.message, stack: error.stack });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
});

// Add debug mode
const DEBUG = true;
function debugLog(...args) {
  if (DEBUG) {
    logger.debug('Debug Log', { args });
  }
}

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers,
  ],
});

// Single command loading system for slash commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  try {
    const command = require(filePath);
    // Verify command has required slash command properties
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.debug(`Loaded slash command: ${command.data.name}`, {
        file,
        description: command.data.description
      });
    } else {
      logger.warn(`Command file ${file} is missing required slash command properties`);
    }
  } catch (error) {
    logger.error(`Error loading command file ${file}:`, { error: error.message });
  }
}

client.on('ready', () => {
  logger.trace('Bot initialization', {
    intents: client.options.intents,
    cache: {
      guilds: client.guilds.cache.size,
      users: client.users.cache.size,
      channels: client.channels.cache.size
    }
  });
  logger.info('Bot is online!', {
    username: client.user.tag,
    guilds: client.guilds.cache.size,
    env: {
      hasToken: !!process.env.TOKEN,
      hasApiKey: !!process.env.GOOGLE_API_KEY,
      channelId: process.env.CHANNEL_ID,
      welcomeChannelId: process.env.WELCOME_CHANNEL_ID
    }
  });
});

// Add error event handler
client.on('error', error => {
  logger.error('Bot Error', { error: error.message, stack: error.stack });
});

// Add welcome message tracker
const recentWelcomes = new Set();

client.on('guildMemberAdd', async (member) => {
  // Check if we've already welcomed this user recently
  const userId = member.user.id;
  if (recentWelcomes.has(userId)) {
    logger.debug('Skipping duplicate welcome message', { userId });
    return;
  }

  // Add user to recent welcomes
  recentWelcomes.add(userId);

  // Remove from set after 10 seconds
  setTimeout(() => {
    recentWelcomes.delete(userId);
  }, 10000);

  logger.debug('Sending welcome message', {
    username: member.user.username,
    userId: member.user.id
  });

  try {
    const welcomeChannel = member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);
    
    if (!welcomeChannel) {
      logger.error('Welcome channel not found!');
      return;
    }

    const welcomeMessage = `Yahoooo~ Chào mừng ${member.user.username} đến với server của chúng mình! ٩(◕‿◕｡)۶`;
    await welcomeChannel.send(welcomeMessage);
    logger.info(`Welcome message sent to ${member.user.username}`);
  } catch (error) {
    logger.error('Welcome message failed', {
      error: error.message,
      member: {
        username: member.user.username,
        id: member.user.id
      }
    });
  }
});

// Replace messageCreate event with interactionCreate for slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
    logger.debug(`Slash command executed: ${interaction.commandName}`, {
      user: interaction.user.tag,
      guild: interaction.guild.name
    });
  } catch (error) {
    logger.error(`Command error: ${interaction.commandName}`, { error: error.message });
    const errorMessage = { content: 'Có lỗi xảy ra khi thực hiện lệnh (╥﹏╥)', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Handle normal chat messages
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.channel.id === process.env.CHANNEL_ID) {
    if (message.content.startsWith('!')) return;

    try {
      await message.channel.sendTyping();

      let prevMessages = await message.channel.messages.fetch({ limit: 15 });
      prevMessages.reverse();

      let conversationText = '';
      prevMessages.forEach((msg) => {
        if (msg.content.startsWith('!')) return;
        if (msg.author.id !== client.user.id && message.author.bot) return;
        if (msg.author.id !== message.author.id) return;
        conversationText += msg.content + '\n';
      });

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        {
          contents: [{
            parts: [{
              text: `Previous conversation:\n${conversationText}\nUser (cậu - MoMo): ${message.content}\nHãy trả lời xưng hô như một nhân vật anime ngọt ngào, gọi người kia là "cậu" và xưng là "MoMo". ٩(◕‿◕｡)۶ (Ví dụ: "Cậu ơi, MoMo đây~") :3`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const botMessage = response.data.candidates[0].content.parts[0].text;
      message.reply(botMessage);
    } catch (error) {
      logger.error('Error processing message', { error: error.message, stack: error.stack });
      message.reply('Sorry, I encountered an error while processing your request.');
    }
  }
});

// Add debug logging for permissions
client.on('channelCreate', channel => {
  if (channel.type === 'GUILD_TEXT') {
    logger.debug('Channel Permissions', {
      channel: channel.name,
      botPermissions: channel.permissionsFor(client.user).toArray()
    });
  }
});

// Add connection error handler
client.on('disconnect', (event) => {
  logger.warn('Bot disconnected', { event });
});

// Add reconnection handler
client.on('reconnecting', () => {
  logger.info('Bot is reconnecting...');
});

client.login(process.env.TOKEN).catch(error => {
  logger.error('Failed to login', {
    error: error.message,
    tokenPrefix: process.env.TOKEN?.slice(0, 10)
  });
});