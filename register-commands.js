import dotenv from "dotenv";
import { logInfo, logWarning, logError, getDiscordKey, registrationList } from './common.js';
dotenv.config();

async function importCommands()
{
    try {
        // Load the dynamically defined commands from the .env file
        var autoCommands = process.env.COMMAND_LIST.split(",");

        for (const command of autoCommands) 
        {
            const modulePath = `./commands/${command}.js`;

            try {
                await import(modulePath);
                logInfo(`Successfully Loaded ${modulePath}`);
            }
            catch (e) {
                logError(`Failed to load module ${modulePath}, got error ${e}`);
            }
            
        }
    } catch (e) {
        logError(`Failed to import all commands, got error ${e}`);
    }
}

/**
 * 
 * @param {*} client 
 */
async function registerCommands(client) {
    if (!client) {
        logError("Trying to register without a valid client");
    }

    try {
        await importCommands();

        // Register all the dynamic commands
        registrationList.forEach(entry => entry['registrationFunc'](client));

    } catch (e) {
        logError("Error registering commands, got: " + e);
    }
    
}

/**
 * 
 * @param {*} commands 
 */
function deployCommandsJSON(commands) {
    registrationList.forEach(entry => commands.push(entry['jsonFunc']()));
}

export { registerCommands, deployCommandsJSON, importCommands }

