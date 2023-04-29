/*
	BottyMcBotFace: 2cpu channel bot

	Licensed under GPLv3
	
	Copyright 2022, Jose M Caban (asskoala@gmail.com)

    Allows ChatGPT question asking.
*/

import { logInfo, logError, logWarning, registerCommandModule } from '../common.js';
import { SlashCommandBuilder } from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';

// Setup openAI config
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/* Query */
async function handleQueryCommand(interaction)
{
    try {
        await interaction.deferReply();

        // Uncomment to get list of available models, but we hardcode later
        //const response = await openai.listModels();
        const model = process.env.OPENAI_MODEL;

        const question = interaction.options.data[0].value;

        const completion = await openai.createCompletion({
            model: `${model}`,
            prompt: `${process.env.QUERY_PROMPT_HEADER} ${question}`,
            stream: false,
            max_tokens: 4000,
          });
        logInfo(`Asked: ${question}, got: ${completion.data.choices[0].text}`);
        
        await interaction.editReply(`Reply to \"${question}\" is: ${completion.data.choices[0].text}`);
    } catch (e) {
        
        await logError(`Failed to get chat GPT reply, got error ${e}`, interaction, true);
    }
}

const queryCommand = new SlashCommandBuilder()
        .setName('query')
        .setDescription(`Ask ${process.env.BOT_NAME} a question`)
        .addStringOption((option) =>
            option
                .setName('question')
                .setDescription('Question to ask')
                .setRequired(true),
        )
;

function registerQueryCommand(client)
{
    const query = 
    {
        data: queryCommand,
        async execute(interaction) {
            await handleQueryCommand(interaction);
        }
    }

    client.commands.set(query.data.name, query);
}

function getQueryJSON()
{
    return queryCommand.toJSON();
}

/************************/
/* Chat */
async function handleChatCommand(interaction)
{
    interaction.reply("Not Yet Implemented");
}

const chatCommand = new SlashCommandBuilder()
        .setName('chat')
        .setDescription(`Chat with ${process.env.BOT_NAME}`)
        .addStringOption((option) =>
            option
                .setName('response')
                .setDescription(`Response to ${process.env.BOT_NAME}`)
                .setRequired(true),
        )
;

function registerChatCommand(client)
{
    const chat = 
    {
        data: chatCommand,
        async execute(interaction) {
            await handleChatCommand(interaction);
        }
    }

    client.commands.set(chat.data.name, chat);
}

function getChatJSON()
{
    return chatCommand.toJSON();
}

registerCommandModule(registerQueryCommand, getQueryJSON);
registerCommandModule(registerChatCommand, getChatJSON);

export { registerQueryCommand, getQueryJSON, registerChatCommand, getChatJSON }
