/*
	BottyMcBotFace: 2cpu channel bot

	Licensed under GPLv3
	
	Copyright 2022, Jose M Caban (asskoala@gmail.com)

    Reddit link posting module.

    Links are pulled from reddit using the python program reddit_reader that uses
    the reddit scan API then returns a list of links to the bot.  The bot then
    chooses one at random to post, but only into #science channels.

    The heavy lifting is actually done in reddit.js, this file mostly just handles
    the Discord API massaging.
*/

import { logInfo, logError, logWarning, registerCommandModule } from '../common.js';
import { SlashCommandBuilder } from 'discord.js';
import { replyRandomLink } from '../command_impl/reddit.js'
import dotenv from "dotenv"
dotenv.config();

const redditLinkCommand = new SlashCommandBuilder()
        .setName('redditlink')
        .setDescription("Retrieve a random top reddit link")
        .addStringOption((option) =>
            option
                .setName('filter')
                .setDescription('Time filter to use in search')
                .addChoices(
                    { name: 'All time', value: 'all' },
                    { name: 'Past 24 hours', value: 'day' },
                    { name: 'Last hour', value: 'hour' },
                    { name: 'Last week', value: 'week' },
                    { name: 'Last Year', value: 'year' },
                )
                .setRequired(false),
        )
;

function getRedditLinkJSON() {
    return redditLinkCommand.toJSON();
}

function registerRedditLinkCommand(client) {
    const redditLink = 
    {
        data: redditLinkCommand,
        async execute(interaction) {
            const subreddits = process.env.REDDIT_LINK_SUBREDDITS.split(",");

            await replyRandomLink(interaction, '75', subreddits);
        }
    }

    client.commands.set(redditLink.data.name, redditLink);
}

registerCommandModule(registerRedditLinkCommand, getRedditLinkJSON);
