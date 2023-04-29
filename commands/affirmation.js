/*
	BottyMcBotFace: 2cpu channel bot

	Licensed under GPLv3
	
	Copyright 2022, Jose M Caban (asskoala@gmail.com)

    Daily affirmations module
*/

import { logInfo, logError, logWarning, registerCommandModule } from '../common.js';
import affirmationData from './../data/affirmations.json' assert { type: 'json' }
import { SlashCommandBuilder } from 'discord.js';

/**
 * Retrieves a random affirmation from the affirmations.json file and replies it to the interaction
 * @param {*} interaction - Discord interaction
 */
async function handleAffirmationCommand(interaction) {
    try {
        const index = Math.floor(Math.random() * affirmationData.affirmations.length);
        await interaction.reply(`${affirmationData.affirmations[index].entry} by **${affirmationData.affirmations[index].author}**`);
    } catch (e) {
        logError(`Failed to get affirmation, got exception ${e}`, interaction);
    }
}

// discord affirmation command
const affirmationCommand = new SlashCommandBuilder()
        .setName('affirmation')
        .setDescription('Affirmations to get you through the day')
;

function registerAffirmationCommand(client)
{
    const affirmation = 
    {
        data: affirmationCommand,
        async execute(interaction) {
            await handleAffirmationCommand(interaction);
        }
    }

    client.commands.set(affirmation.data.name, affirmation);
}

function getAffirmationJSON()
{
    return affirmationCommand.toJSON();
}

registerCommandModule(registerAffirmationCommand, getAffirmationJSON);

export { getAffirmationJSON, registerAffirmationCommand };
