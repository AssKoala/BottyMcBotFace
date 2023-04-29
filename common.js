/*
	BottyMcBotFace: 2cpu channel bot

	Licensed under GPLv3
	
	Copyright 2022, Jose M Caban (asskoala@gmail.com)

*/

import { DiscordAPIError } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

import fs from 'fs'
import userSettings from './user_data/settings.json' assert { type: 'json' }

/**
 * Flush the user data to disk in JSON format
 */
async function flushUserData()
{
    try {
        const jsonString = JSON.stringify(userSettings, null, 2);
        fs.writeFile('./user_data/settings.json', jsonString, err => {
            if (err) {
                logError(`Error flushing user data file, got ${err}`);
                return false;
            } else {
                logInfo('Successfully wrote user data');
                return true;
            }
        });
    } catch (e) {
        logError(`Failed to flush user data to disk, got error ${e}`);
    }
}

/**
 * 
 * @returns A fresh default user data object that can be inserted in the array
 */
function getDefaultUserData(newName = "")
{
    try {
        let copied = JSON.parse(JSON.stringify(userSettings.primordial));
        copied.name = newName;
        return copied;
    } catch (e) {
        logError(`Failed to copy primordial user data object, got error: ${e}`);
        return null;
    }
    
}

/**
 * Retrieves stored user data object
 * @param {string} username - Discord username
 * @param {boolean} create - Create new data if it doesn't already exist
 * @returns user data object, null if user has no data
 */
function getUserData(username, create = false)
{
    for (let i = 0; i < userSettings.user_data.length; i++)
    {
        if (username === userSettings.user_data[i].name)
        {
            return userSettings.user_data[i];
        }
    }

    if (create) {
        return getDefaultUserData(username);
    } else {
        return null;
    }
}

/**
 * 
 * @param {string} userData - user data object to use
 * @param {boolean} flush - flush user data to disk after setting
 */
function setUserData(userData, flush = false)
{
    let copied = JSON.parse(JSON.stringify(userData));
    let pushAtEnd = true;
    for (let i = 0; i < userSettings.user_data.length; i++)
    {
        if (userSettings.user_data[i].name === userData.name)
        {
            userSettings.user_data[i] = copied;
            pushAtEnd = false;
        }
    }

    if (pushAtEnd)
    {
        userSettings.user_data.push(copied);
        userSettings.user_data.sort((a,b) => a.name.localeCompare(b.name));
    }

    flushUserData();
}

/**
 * Gets the date string used for logging
 */
function getDateString() {
    const date = new Date(Date.now());

    return date.toISOString() + " :: ";
}

/**
 * Log an [INFO] message
 * @param {string} message 
 */
function logInfo(message)
{
    console.log(getDateString() + process.env.INFO_TAG + message);
}

/**
 * Log debug information, just calls console.log with [DEBUG] prepended
 * @param {string} message
 */
function logDebug(message)
{
    console.log(getDateString() + `[DEBUG] ` + message);
}

/**
 * Log a [WARN] message
 * @param {string} message 
 */
function logWarning(message)
{
    console.log(getDateString() + process.env.WARN_TAG + message);
}

/**
 * Log an [ERR] error message
 * @param {string} message 
 * @param {Discord.interaction} or {Discord.message}
 */
async function logError(message, discordReply = null, editReply = false)
{
    console.log(getDateString() + process.env.ERR_TAG + message);
    if (discordReply)
    {
        if (editReply)
        {
            await discordReply.editReply(message);
        }
        else
        {
            await discordReply.reply(message);
        }
    }
}

/**
 * Returns the discord key string based on how the program was started
 */
function getDiscordKey()
{
    const args = process.argv.slice(2);

    if (args.length > 0 && args[0] == "prod")
    {
        return process.env.DISCORD_TOKEN_PROD;
    } else {
        return process.env.DISCORD_TOKEN_TEST;
    }
}

function getDiscordAppId()
{
    const args = process.argv.slice(2);

    if (args.length > 0 && args[0] == "prod")
    {
        return process.env.DISCORD_APP_ID_PROD;
    } else {
        return process.env.DISCORD_APP_ID_TEST;
    }
}

function getDiscordGuildId()
{
    return process.env.DISCORD_GUILD_ID;
}

var registrationList = [];

/**
 * Auto Registration functions for modules
 */
function registerCommandModule(registrationFunction, jsonDataFunction)
{
    var newEntry = {};
    newEntry['registrationFunc'] = registrationFunction;
    newEntry['jsonFunc'] = jsonDataFunction;
    registrationList.push(newEntry);
}

export { logDebug, logInfo, logWarning, logError, getDiscordKey, getUserData, setUserData, getDefaultUserData, flushUserData, getDiscordAppId, getDiscordGuildId, registerCommandModule, registrationList };
