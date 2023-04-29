/*
	BottyMcBotFace: 2cpu channel bot

	Licensed under GPLv3
	
	Copyright 2022, Jose M Caban (asskoala@gmail.com)

    Manages the dict (dictionary) module where users can define words/phrases 
    and lookup definitions.

    Data is stored on disk in a JSON file and that data is always stored sorted.

    When new entries are added, the data is also immediately sorted.  This is done
    to make lookups O(logn) rather than devolving into O(n).
*/

import { logInfo, logError, logWarning, registerCommandModule } from '../common.js';
import dictData from './../data/dictdata.json' assert { type: 'json' }
import fs from 'fs'

import { SlashCommandBuilder } from 'discord.js';

/**
 * Sorts the dict data that's been loaded -- enforces ordering even if the
 * file has been edited outside the program
 */
function sortDictData()
{
    dictData.dict_data.sort((a,b) => a.entry_name.localeCompare(b.entry_name));
}

/**
 * Flush the dictionary data to disk in JSON format.
 * 
 * The data should flush out sorted, though it will be sorted on load just in case.
 */
async function flushDictData()
{
    try {
        const jsonString = JSON.stringify(dictData, null, 2);
        fs.writeFile('./data/dictdata.json', jsonString, err => {
            if (err) {
                logError(`Error flushing dict data file, got ${err}`);
                return false;
            } else {
                logInfo('Successfully wrote dict data');
                return true;
            }
        });
    } catch (e) {
        logError(`Failed to flush dict data to disk, got error ${e}`);
    }
}

/**
 * 
 * @param {string} author - author of the dictionary entry
 * @returns copy of a default dictionary entry, null if fails
 */
function getDefaultDictEntry(author = "")
{
    try {
        let copied = JSON.parse(JSON.stringify(dictData.primordial));
        copied.author = author;
        return copied;
    } catch (e) {
        logError(`Failed to copy primordial dictionary entry, got error ${e}`);
        return null;
    }
}

/**
 * Binary search array.  If array is unsorted, behavior is undefined
 * @param { [object] } array - array of objects
 * @param {object} target - target object to find
 * @param {function(left,right)} compareFunc - Function comparing left and right
 * @returns the index of target in the array, -1 if not found
 */
function getIndexOf(array, target, compareFunc)
{
    let start = 0;
    let end = array.length - 1;
    
    while (start <= end) {
        let middle = Math.floor((start+end)/2);

        let result = compareFunc(array[middle], target);

        if (result === 0) {
            return middle;
        } else if (result < 0) {
            start = middle + 1;
        } else {
            end = middle - 1;
        }
    }

    return -1;
}

/**
 * Find the dictionary entryName and return the author and definition associated with it.
 * @param {string} entryName - Entry we're looking for
 * @returns { [string, string] } - Array containing author, definition.  Null if not found 
 */
function findDictionaryEntry(entryName)
{
    let result = getIndexOf(dictData.dict_data, entryName, 
        (x,y) => { 
            const left = x.entry_name.toLowerCase();
            const right = y.toLowerCase();

            return left.localeCompare(right);
        });

    if (result === -1)
    {
        return null;   
    } else {
        return [ dictData.dict_data[result].author, dictData.dict_data[result].definition ];
    }
}

/**
 * Handles the /dict command
 * @param {Discord.interaction} interaction - interaction message to reply to
 */
async function handleDictCommand(interaction)
{
    try {
        if (interaction.options.data.length < 1) {
            await logError(`Invalid interaction object sent to dict, data length 0!`, interaction);
            return;
        }
        
        const dictRequested = interaction.options.data[0].value.trim();
        
        if (dictRequested == '') {
            await interaction.reply("DICT entry for what, /dict WHAT");
            return;
        }
        
        const result = findDictionaryEntry(dictRequested);

        if (result != null)
        {
            await interaction.reply(`**DICT:** **${dictRequested}** = ${result[1]} [added by: ${result[0]}]`);
        } else {
            await interaction.reply(`**DICT:** No definition for ${dictRequested}`);
        }
    } catch (e) {
        await logError(`Failed to handle DICT command, got error: ${e}`, interaction);
    }
}

/**
 * Handles the /define command
 * @param {Discord.interaction} interaction - discord interaction to reply to
 */
async function handleDefineCommand(interaction)
{
    try {
        if (interaction.options.data.length < 1) {
            await logError(`Invalid interaction object sent to dict, data length 0!`, interaction);
            return;
        }

        if (interaction.options.data.length < 2)
        {
            await interaction.reply('Missing entries for define command, need phrase and definiton plzsir');
            logWarning(`Failed to get data for define command, got ${options.data}`);
            return;
        }

        const entryName = interaction.options.data[0].value.trim();
        const definition = interaction.options.data[1].value.trim();
        let existingEntry = findDictionaryEntry(entryName);

        if (existingEntry === null) {
            let newEntry = getDefaultDictEntry(interaction.user.username);
            newEntry.entry_name = entryName;
            newEntry.definition = definition;

            dictData.dict_data.push(newEntry);
            sortDictData(); // insertion sort would be faster but screw it I'm lazy
            flushDictData();

            await interaction.reply(`**DICT:** Definition for ${entryName} added successfully.`);
        } else {
            await interaction.reply(`**DICT:** Definition for ${entryName} already exists as: ${existingEntry[1]} by ${existingEntry[0]}`);
        }
    } catch (e) {
        await logError(`Failed to set definition, got error ${e}`, interaction);
    }
}

// discord dict command
const dictCommand = new SlashCommandBuilder()
        .setName('dict')
        .setDescription('Retrieve a definition')
        .addStringOption((option) =>
            option
                .setName('phrase')
                .setDescription('Phrase to look up')
                .setRequired(true),
        )    
;

// discord define command
const defineCommand = new SlashCommandBuilder()
        .setName('define')
        .setDescription('Define a phrase')
        .addStringOption((option) =>
            option
                .setName('phrase')
                .setDescription('Phrase to define')
                .setRequired(true),
        )
        .addStringOption((option) =>
            option
                .setName('definition')
                .setDescription('Definition of the phrase')
                .setRequired(true),
        )
;

// register the dict command
function registerDictCommand(client)
{
    const dict = 
    {
        data: dictCommand,
        async execute(interaction) {
            await handleDictCommand(interaction);
        }
    }

    client.commands.set(dict.data.name, dict);
}

// retrieve the dict command as JSON
function getDictJSON()
{
    return dictCommand.toJSON();
}

// register the define command
function registerDefineCommand(client)
{
    const define = 
    {
        data: defineCommand,
        async execute(interaction) {
            await handleDefineCommand(interaction);
        }
    }

    client.commands.set(define.data.name, define);
}

// retrieve the define command as JSON
function getDefineJSON()
{
    return defineCommand.toJSON();
}

registerCommandModule(registerDictCommand, getDictJSON);
registerCommandModule(registerDefineCommand, getDefineJSON);

export { sortDictData, registerDictCommand, registerDefineCommand, getDictJSON, getDefineJSON }
