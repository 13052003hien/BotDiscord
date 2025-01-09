const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv/config');
const logger = require('./utils/logger');

const commands = [];
const commandNames = new Set();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  try {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Log the command being loaded
    logger.debug(`Loading command from ${file}...`);
    
    if ('data' in command && 'execute' in command) {
      // Check for duplicate command names
      if (commandNames.has(command.data.name)) {
        logger.warn(`Duplicate command name found: ${command.data.name} in ${file}`);
        continue;
      }
      
      commandNames.add(command.data.name);
      commands.push(command.data.toJSON());
      logger.debug(`Successfully loaded command: ${command.data.name}`);
    } else {
      logger.warn(`Command at ${file} missing required "data" or "execute" property`);
    }
  } catch (error) {
    logger.error(`Error loading command ${file}:`, error);
  }
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    // Log the commands being registered
    logger.debug('Registering commands:', commands);

    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error('Error deploying commands:', error);
  }
})();
