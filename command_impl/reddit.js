/*
	BottyMcBotFace: 2cpu channel bot

	Licensed under GPLv3
	
	Copyright 2022, Jose M Caban (asskoala@gmail.com)

*/

import dotenv from "dotenv";
import { logInfo, logWarning, logError } from './../common.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import validator from 'validator';

dotenv.config();

import cp from 'child_process';
import os from 'os';
import { time } from "console";
import { DiscordAPIError } from "discord.js";

/**
 * Retrieve a list of links from reddit
 * @param {string} searchLimit - Max number of items to return (e.g. 10)
 * @param {string} timeFilter - Time to use (day, hour, etc)
 * @param { [string] } subredditList - Array of subreddits to view
 * @returns array of valid URL's or nothing
 */
async function getRedditLinks(searchLimit, timeFilter, subredditList) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);

        const python = process.env.PYTHON_BINARY;

        const args = [ '../reddit_reader/main.py', 
                process.env.REDDIT_CLIENT_ID, 
                process.env.REDDIT_CLIENT_SECRET,
                process.env.REDDIT_USER_AGENT,
                searchLimit, 
                timeFilter, ...subredditList ];

        logInfo(`Running ${python} with args ${args} from ${__dirname}`);

        const childprocess = cp.spawnSync(python, args, {cwd: __dirname });
        const output = `${childprocess.stdout}`;

        logInfo(`Got reddit output: ${output} and error: ${childprocess.stderr}`);

        const lines = output.split("\n").map(line => 
                            {
                                return line.trim();
                            });
        const filtered = lines.filter((line) => 
                            {
                                return validator.isURL(line)
                            });
        return filtered;
    } catch (e) {
        logError(`Failed to get reddit links, got ${e}`);
        return null;
    }
}

/**
 * Reply a random valid URL from reddit or nothing
 * @param {Discord.interaction} interaction - interaction to reply to
 * @param {string} searchLimit - Max number of items to return (e.g. 10)
 * @param { [string] } subredditList - Array of subreddits to view
 */
async function replyRandomLink(interaction, searchLimit, subredditList) {
    try {
        await interaction.deferReply();

        let timeFilter = null;

        for (let i = 0; i < interaction.options.data.length; i++) {
            if (interaction.options.data[i].name == 'filter')
            {
                timeFilter = interaction.options.data[i].value;
                break;
            }
        }

        if (timeFilter == null) {
            timeFilter = 'day';
        }

        const links = await getRedditLinks(searchLimit, timeFilter, subredditList);
        if (links) {
            const index = Math.floor(Math.random() * links.length);
            await interaction.editReply(`${links[index]}`);
        } else {
            logWarning("Failed to get reddit links");
            await interaction.editReply("Failed to get reddit links!");
        }
    } catch (e) {
        logError(`Failed to get links, got exception ${e}`, interaction);
    }
    
}

export { replyRandomLink, getRedditLinks }

