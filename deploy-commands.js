import { Client, REST, Routes, GatewayIntentBits } from 'discord.js';

// Pull in clientId, guildId, and token
import dotenv from "dotenv"
import { getDiscordKey, getDiscordAppId, getDiscordGuildId } from "./common.js";
dotenv.config();

const clientId = getDiscordAppId();
/*
	Usage:
		Comment out the getDiscordGuildId() line and uncomment the 2cpu one to swap servers
		Use prod or test in the command line for APP_ID swaps


		Register commands:
		node .\deploy-commands.js [prod?]

		Register global:
		node .\deploy-commands.js [prod?] global

		Clear:
		node .\deploy-commands.js [prod?] [global|guild] clear

*/
const guildIdList = getDiscordGuildId().split(",");
const token = getDiscordKey();

const commands = [];

// Store all the JSON commands into the list
import { importCommands, deployCommandsJSON } from './register-commands.js';
await importCommands();
deployCommandsJSON(commands);

// Global or Guild commands?
let writeGlobal = false;
if (process.argv.length > 3 && process.argv[3] == "global")
{
	console.log('using global command switch');
	writeGlobal = true;
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(token);

// Clear or register?
if (process.argv.length > 4 && process.argv[4] == "clear")	// arg3 should be guild, but well ignore it regardless
{
	console.log('clearing commands');

	if (writeGlobal) {
		rest.put(Routes.applicationCommands(clientId), { body: [] })
			.then(() => console.log('Successfully deleted all application commands.'))
			.catch(console.error);
	} else {
		guildIdList.forEach(guildId => {
			rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
				.then(() => console.log('Successfully deleted all guild commands.'))
				.catch(console.error);
		});
	}
} else {
	// and deploy your commands!
	(async () => {
		try {
			console.log(`Started refreshing ${commands.length} application (/) commands.`);

			// The put method is used to fully refresh all commands in the guild with the current set
			if (writeGlobal) {
				const data = await rest.put(
					Routes.applicationCommands(clientId),
					{ body: commands },
				);
		
				console.log(`Successfully reloaded ${data.length} GLOBAL application (/) commands.`);
			} else {
				for (const guildId of guildIdList) {
					const data = await rest.put(
						Routes.applicationGuildCommands(clientId, guildId),
						{ body: commands },
					);

					console.log(`Successfully reloaded ${data.length} application (/) commands.`);
				}				
			}
		} catch (error) {
			// And of course, make sure you catch and log any errors!
			console.error(error);
		}
	})();
}