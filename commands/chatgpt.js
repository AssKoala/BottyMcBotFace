/*
	BottyMcBotFace: 2cpu channel bot

	Licensed under GPLv3
	
	Copyright 2022, Jose M Caban (asskoala@gmail.com)

    Allows ChatGPT question asking.
*/

import { logInfo, logError, logWarning, registerCommandModule } from '../common.js';
import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { Configuration, OpenAIApi } from 'openai';
import { DownloaderHelper } from 'node-downloader-helper';
import { mkdir, rm } from 'node:fs/promises'

// Setup openAI config
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/************************/
/* Image */
async function handleImageCommand(interaction) {
    try {
        await interaction.deferReply();

        let description;
        let size = '512x512';

        for (let i = 0; i < interaction.options.data.length; i++)
        {
            const name = interaction.options.data[i].name;

            if (name == 'image_details')
            {
                description = interaction.options.data[i].value;
            }
            else if (name == 'image_size')
            {
                size = interaction.options.data[i].value;
            }
        }

        // Create the image with OpenAI
        const response = await openai.createImage({
            prompt: `${description}`,
            n: 1,
            size: `${size}`,
          });
        const image_url = response.data.data[0].url;
        
        logInfo(`Asked: ${description}, got ${image_url}`);

        // Download the image temporarily
        const download_dir = "./temp-images/";
        await mkdir(download_dir, { recursive: true });

        const dl = new DownloaderHelper(image_url, download_dir);
        dl.on('error', (err) => logError(`Failed to download image, got error ${err}`));
        await dl.start();
        
        const downloaded_fullpath = dl.getDownloadPath();
        const downloaded_filename = downloaded_fullpath.split("/").at(-1).split(`\\`).at(-1);

        // Create the attachment
        const file = new AttachmentBuilder(downloaded_fullpath);
        const embed = {
            title: description,
            image: {
                url: `attachment://${downloaded_filename}`,
            }
        }

        await interaction.editReply({ embeds: [embed], files: [file]});

        // Delete the file
        await rm(downloaded_fullpath);

    } catch (e) {
        
        await logError(`Failed to get chat GPT reply, got error ${e}`, interaction, true);
    }
}

const imageCommand = new SlashCommandBuilder()
        .setName('image')
        .setDescription(`Ask ${process.env.BOT_NAME} to generate an image`)
        .addStringOption((option) =>
            option
                .setName('image_details')
                .setDescription('Details of what to generate')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('image_size')
                .setDescription('Image size to generate')
                .addChoices(
                    { name: 'small', value: '256x256' },
                    { name: 'medium', value: '512x512' },
                    { name: 'large', value: '1024x1024' },
                )
                .setRequired(false),
        )
;

function registerImageCommand(client)
{
    const image = 
    {
        data: imageCommand,
        async execute(interaction) {
            await handleImageCommand(interaction);
        }
    }

    client.commands.set(image.data.name, image);
}

function getImageJSON()
{
    return imageCommand.toJSON();
}

/************************/
/* Query */
async function handleQueryCommand(interaction)
{
    try {
        await interaction.deferReply();

        var question = "";
        var model = "gpt-3.5-turbo";

        for (let i = 0; i < interaction.options.data.length; i++) {
            if (interaction.options.data[i].name === "question") {
                question = interaction.options.data[i].value;
            } else if (interaction.options.data[i].name === "ai_model") {
                model = interaction.options.data[i].value;
            }
        }

        if (model == "text-davinci-003") {
            await handleDavinciQuery(interaction, question);
        }
        else if (model == 'gpt-4') {
            await interaction.editReply("I'm currently on the waitlist for GPT-4 support :(");
        }
        else {
            await handleChatModelQuery(interaction, question, model);
        }
    } catch (e) {
        
        await logError(`Failed to get chat GPT reply, got error ${e}`, interaction, true);
    }
}

async function handleChatModelQuery(interaction, question, ai_model)
{
    try {
        const completion = await openai.createChatCompletion({
            model: ai_model,
            messages: [
                {"role": "user", "content": question}
            ]
        });
        const responseText = completion.data.choices[0].message.content;
        logInfo(`Asked: ${question}, got: ${responseText}`);
        await interaction.editReply(`Query \"${question}\": ${responseText}`);
    }
    catch (e)
    {
        await logError(`Failed to get chat GPT reply, got error ${e}`, interaction, true);
    }
    
}

async function handleDavinciQuery(interaction, question)
{
    try {
        const model = `text-davinci-003`;

        const completion = await openai.createCompletion({
            model: `${model}`,
            prompt: `${process.env.QUERY_PROMPT_HEADER} ${question}`,
            stream: false,
            max_tokens: 4000,
        });

        const responseText = completion.data.choices[0].text;

        logInfo(`Asked: ${question}, got: ${responseText}`);
        await interaction.editReply(`Query \"${question}\": ${responseText}`);
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
        .addStringOption((option) =>
            option
                .setName('ai_model')
                .setDescription('AI Model to use')
                .addChoices(
                    { name: 'gpt-3.5-turbo', value: 'gpt-3.5-turbo' },
                    { name: 'gpt-4', value: 'gpt-4' },
                    { name: 'davinci', value: 'text-davinci-003' },
                )
                .setRequired(false),
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
registerCommandModule(registerImageCommand, getImageJSON);

export { registerQueryCommand, getQueryJSON, registerChatCommand, getChatJSON }
