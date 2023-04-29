/*
	BottyMcBotFace: 2cpu channel bot

	Licensed under GPLv3
	
	Copyright 2022, Jose M Caban (asskoala@gmail.com)

    Weather module.

    Pulls geocoding data from google maps API and uses weatherOne API for the weather.

    Weather one technically supports geocoding but its absolute shit.  Google maps API
    is consistently better and handles natural processing more good.
*/

import dotenv from "dotenv";
import fetch from 'node-fetch';
import {logInfo, logWarning, logError, getUserData, registerCommandModule} from './../common.js';
import validator from 'validator';
import { SlashCommandBuilder } from "discord.js";
dotenv.config();

/**
 * Map for type to excludes and print function
 */
const forecastTypeMap = [ 
    ["hourly", "minutely,current,daily,alerts", printHourlyForecast], 
    ["minutely", "hourly,current,daily,alerts", printMinutelyForecast],
    ["daily", "hourly,minutely,current,alerts", printDailyForecast],
    ["alerts", "hourly,minutely,current,daily", printAlertForecast]
 ];

const convertKelvinTo = [
    [ "celsius",    'C', (x) => { return Number(x) - 273.15; } ],
    [ "fahrenheit", 'F', (x) => { return ((Number(x) - 273.15) * (9/5)) + 32; } ],
    [ "rankine",    'R', (x) => { return Number(x) * 1.8; } ],
    [ "kelvin",     'K', (x) => { return Number(x); } ]
];

/**
 * Convert C to F
 * @param {string} temperatureCelsius - The temperature in Celsius
 * @returns {string} The temperature in Fahrenheit
 */
function celsiusToFahrenheit(temperatureCelsius)
{
	return (1.8 * Number(temperatureCelsius) + 32).toFixed(0);
}

/**
 * Get the temperature string formatted as expected for output (e.g. 86F/30C)
 * @param {string} temperatureKelvin - The temperature in Kelvin 
 * @returns {string} The temperature formatted for output
 */
function getTemperatureString(temperatureKelvin)
{
    let temperatureCelsius = temperatureKelvin - 273.15;
	return celsiusToFahrenheit(temperatureCelsius) + 'F/' + temperatureCelsius.toFixed(0) + 'C';
}

/**
 * Convert 0-360 degrees into compass directions
 * @param {string} degrees - value in degrees (0-360)
 * @returns {string} compass direction of degrees passed in
 */
function degreesToCompass(degrees)
{
	var val = (Number(degrees)/22.5 + 5).toFixed(0);
	var directions = ["N","NNE","NE","ENE","E","ESE", "SE", "SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];

	return directions[val % 16];
}

/**
 * Returns the user's preferred temperature units
 * @param {Discord.interaction} interaction - interaction sent to us from Discord API
 */
function getUserPreferredUnits(interaction) 
{
    const userData = getUserData(interaction.user.username);

    if (userData) {
        return userData.weather_settings.preferred_units;
    } else {
        return "rankine";
    }
}

/**
 * Gets the location requested by the user.  This is important since the location is optional.
 * Users can specify their location in the settings, so, if they don't specify a location, 
 * this will look it up and use it if it exists or tell them they're dumb if they haven't set it.
 * @param {*} interaction - discord interaction
 */
async function getWeatherLocation(interaction)
{
    let location = null;

    for (let i = 0; i < interaction.options.data.length; i++) {
        if (interaction.options.data[i].name == 'location') {
            location = interaction.options.data[i].value.trim();
            break;
        }
    }

    if (location === null)
    {
        const userData = getUserData(interaction.user.username);

        if (userData) { // if the user data exists, we can use that for the location if none was specified
            try {
                location = userData.weather_settings.location;
            } catch (e) {
                await logError(`This is really bad, the user data is corrupted somehow! Got: ${e}`, interaction);
                return null;
            }
        } else {
            await interaction.reply('You need to either set your location with /settings or specify the location for the weather, pal.');
            return null;
        }
    }

    return location;
}

/**
 * Retrieve Geocode using Google Maps API
 * @param {Discord.interaction} interaction - Message sent to us from Discord API
 * @returns array containing [ {string}cityName, {string}latitude, {string}longitude ]
 */
async function getWeatherLocationGoogleMapsAPI(interaction)
{
    const key = process.env.GOOGLE_MAPS_API_KEY;
    const location = await getWeatherLocation(interaction);
    if (!location) {
        return null;
    }

    const query = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${key}`;
    if (!validator.isURL(query))
    {
        logWarning(`Location passed in does not appear to be properly useable as a URL: ${location}`);
        await interaction.reply("Whatever you wrote apparently doesn't work as a URL so maybe ask differently");
        return null;
    }

    try {
        const result = await fetch(query);
        const locationData = await result.json();

        if (locationData.results.length > 0) {
            return [ locationData.results[0].formatted_address, locationData.results[0].geometry.location.lat, locationData.results[0].geometry.location.lng ];
        } else {
            await interaction.reply(`Failed to get any geocoordinate results for ${location}, try being more specific maybe?`);
            return null;
        }
    } catch (e) {
        await logError(`Failed to get geocoded data, got error: ${e}`, interaction);
        return null;
    }

}

/**
 * Get the weather data from the One API
 * @param {array} locationData - [ {string}locationName, {string}latitude, {string}longitude ] 
 * @param {Discord.interaction} interaction - Discord interaction to reply to
 * @param {string} excludes - Excludes to send to the one API to lower bandwidth usage
 * @returns the weather data in the One API v3 format or null on error.
 */
async function getWeatherUsingOneApiv3(locationData, interaction, excludes = "alerts")
{
    if (locationData.length != 3)
    {
        logError(`Trying to print API with incorrect location data: ${locationData}`);
    }

    const city = locationData[0];
    const lat = locationData[1];
    const lon = locationData[2];
    const key = process.env.OPEN_WEATHER_KEY;

    logInfo(`Getting weather for ${city} @ lat=${lat}&lon=${lon}`);

    // modify as we extend functionality
    const apiCall = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=${excludes}&appid=${key}`;
    logInfo(`WeatherAPI Call: ${apiCall}`);

    try {
        const result = await fetch(apiCall);
        const weatherData = await result.json();
        logInfo('Received JSON data: ');
        logInfo(JSON.stringify(weatherData));

        return weatherData;
    } catch (e) {
        if (e.message.includes('ETIMEDOUT')) {
            await interaction.reply('TImed out trying to get weather from One API, try again later');
        } else {
            await interaction.reply(`${process.env.BOT_NAME} breakdown trying to get the weather, check logs`);
        }
        
        logError(`Failed to print out weather, got: ${e} from call ${apiCall}`, interaction);

        return null;
    }
}

/**
 * Print the weather data as a reply to the discord message
 * @param {array} locationData - [ {string}locationName, {string}latitude, {string}longitude ] 
 * @param {Discord.interaction} interaction - Discord interaction to reply to
 */
async function printWeatherUsingOneApiv3(locationData, interaction)
{
    const excludes = "minutely,hourly,alerts";
    const weatherData = await getWeatherUsingOneApiv3(locationData, interaction, excludes);

    try {
        if (weatherData)
        {   
            const city = locationData[0];

            await interaction.reply(
                `**${city} Weather** :: ${getTemperatureString(weatherData.current.temp)} (Humidity: ${weatherData.current.humidity}%)`
                + ` | **Feels Like:** ${getTemperatureString(weatherData.current.feels_like)}`
                + ` | **Wind:** ${degreesToCompass(weatherData.current.wind_deg)}@${weatherData.current.wind_speed}km/h`
                + ` | **Today's High:** ${getTemperatureString(weatherData.daily[0].temp.max)}`
                + ` | **Today's Low:** ${getTemperatureString(weatherData.daily[0].temp.min)}`
                + ` | **Current Conditions:** ${weatherData.current.weather[0].description}`
            );
        } 
    } catch (e) {
        await logError(`Received malformed weather data, got error ${e}`, interaction);
    }
}

/**
 * Handles the /weather commands
 * @param {Discord.interaction} interaction - Discord interaction to reply to
 */
async function handleWeatherCommand(interaction) {
    try {
        let result;

        result = await getWeatherLocationGoogleMapsAPI(interaction);
        
        if (result != null)
        {
            printWeatherUsingOneApiv3(result, interaction);
        }        
    } catch (e) {
        await logError(`Failed to handle weather command, got error: ${e}`, interaction);
    }
}

/**
 * Print the hourly forecast based on weatherData
 * @param {array} locationData - [ {string}locationName, {string}latitude, {string}longitude ] 
 * @param {Discord.interaction} interaction - Discord interaction to reply to
 * @param {JSON} weatherData - OneAPI weather data that includes hourly
 */
async function printHourlyForecast(locationData, interaction, weatherData) {
    try {
        let hourlyWeatherString = `**Hourly Forecast for ${locationData[0]}:** \n`;
        for (let i = 0; i < 5 && i < weatherData.hourly.length; i++) { 
            const tempStrFeels = getTemperatureString(weatherData.hourly[i].feels_like);
            const tempStr = getTemperatureString(weatherData.hourly[i].temp);
            hourlyWeatherString += `**:: ${i} hrs:** ${tempStr}, **Feels like:** ${tempStrFeels} ::  ${weatherData.hourly[i].humidity}% humidity, ${weatherData.hourly[i].weather[0].description}\n`;
        }

        await interaction.reply(hourlyWeatherString);
    } catch (e) {
        await logError(`Failed to generate hourly weather string, got ${e}`, interaction);
    }
}

/**
 * No one uses this
 * @param {array} locationData - [ {string}locationName, {string}latitude, {string}longitude ] 
 * @param {Discord.interaction} interaction - Discord interaction to reply to
 * @param {JSON} weatherData - OneAPI weather data that includes minutely
 */
async function printMinutelyForecast(locationData, interaction, weatherData) {
    await interaction.reply(`No one ever uses this, ask someone to implement it`);
}

/**
 * Returns the shortened day string based on day index.  Automatically wraps around.
 * @param {number} day - index of day (0=Sunday, 6=Saturday)
 * @returns Shortened day string (e.g. Mon), ??? on error
 */
function getDayFromIndex(day) {
    const dayArray = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ];

    if (day > 32) {
        return "???";
    }

    while (day >= dayArray.length) {
        day -= dayArray.length;
    }

    return dayArray[day];
}

/**
 * Pull an emoji for weather based on the icon
 * @param {JSON} weather - weather object result from Open Weather
 * @returns emoji, description string otherwise
 */
function getEmojiFromConditions(weather) {
    // See: https://openweathermap.org/weather-conditions
    const conditionToEmojiMap = [
        [ "01", "☀️" ],
        [ "02", "🌤️" ],
        [ "03", "☁️" ],
        [ "04", "🌥️" ],
        [ "09", "🌦️" ],
        [ "10", "🌧️" ],
        [ "11", "🌩️" ],
        [ "13", "❄️" ],
        [ "50", "🌫️ "]
    ];

    for (let i = 0; i < conditionToEmojiMap.length; i++)
    {
        if (weather.icon.includes(conditionToEmojiMap[i][0]))
        {
            return conditionToEmojiMap[i][1];
        }
    }

    return weather.description;
}

/**
 * Print the daily (8-day) weather forecast
 * @param {array} locationData - [ {string}locationName, {string}latitude, {string}longitude ] 
 * @param {Discord.interaction} interaction - Discord interaction to reply to
 * @param {JSON} weatherData - OneAPI weather data that includes daily
 */
async function printDailyForecast(locationData, interaction, weatherData) {
    try {
        const preferredUnits = getUserPreferredUnits(interaction);
        let conversionMap = convertKelvinTo[0];
        for (let i = 0; i < convertKelvinTo.length; i++)
        {
            if (preferredUnits == convertKelvinTo[i][0]) {
                conversionMap = convertKelvinTo[i];
            }
        }

        let dailyWeatherString = `**${locationData[0]}** :: 8-Day Forecast `;
        let date = new Date();

        for (let i = 0; i < 8 && i < weatherData.daily.length; i++)
        {
            const highTemp = `${conversionMap[2](weatherData.daily[i].temp.max).toFixed(0)}${conversionMap[1]}`;
            const lowTemp = `${conversionMap[2](weatherData.daily[i].temp.min).toFixed(0)}${conversionMap[1]}`;
            const tempStr = `:: **${getDayFromIndex(date.getDay()+i)}:** ${getEmojiFromConditions(weatherData.daily[i].weather[0])} (${highTemp}/${lowTemp})`;
            dailyWeatherString += tempStr;
        }

        await interaction.reply(dailyWeatherString);
    } catch (e) {
        await logError(`Failed to generate daily weather data, got ${e}`, interaction);
    }
}

/**
 * Print alerts for a given location based on weather data
 * @param {array} locationData - [ {string}locationName, {string}latitude, {string}longitude ] 
 * @param {Discord.interaction} interaction - Discord interaction to reply to
 * @param {JSON} weatherData - OneAPI weather data that includes alerts
 */
async function printAlertForecast(locationData, interaction, weatherData) {
    try {
        if (weatherData.alerts != null && weatherData.alerts.length > 0) {
            let alertStr = "**Active Alerts:**";

            for (let i = 0; i < weatherData.alerts.length; i++) {
                alertStr += ` :: **Event:** ${weatherData.alerts[i].event} **From:** ${weatherData.alerts[i].sender_name}`;
            }
            await interaction.reply(alertStr);
        } else {
            await interaction.reply(`No active alerts for ${locationData[0]}`);
        }
    } catch (e) {
        await logError(`Failed to process the alert forecast, got ${e}`, interaction);
    }
}

/**
 * Get the forecast map data for a given type
 * @param {string} forecastType - "hourly", "daily", etc
 * @returns array from forecastTypeMap for the given type
 */
function getForecastMapData(forecastType)
{
    for (let i = 0; i < forecastTypeMap.length; i++) {
        if (forecastTypeMap[i][0] === forecastType)
        {
            return forecastTypeMap[i];
        }
    }
}

/**
 * Print the forecast data as a reply to the discord message
 * @param {array} locationData - [ {string}locationName, {string}latitude, {string}longitude ] 
 * @param {Discord.interaction} interaction - Discord interaction to reply to
 */
async function printForecastUsingOneApiv3(locationData, interaction, forecastType)
{
    try {
        const forecastMapData = getForecastMapData(forecastType);
        const weatherData = await getWeatherUsingOneApiv3(locationData, interaction, forecastMapData[1]);

        if (weatherData) {
            await forecastMapData[2](locationData, interaction, weatherData);
        } else {
            logInfo(`Failed to get forecast data`);
        }
    } catch (e) {
        await logError(`Received malformed weather data, got error ${e}`, interaction);
    }
}

/**
 * Retrieves the options as an array for the forecast
 * @param {Discord.message} interaction - Discord message to reply to
 * @returns [ forecastType, location ]
 */
async function getForecastOptions(interaction)
{
    try {
        let forecastType = null;
        let location = "";

        for (let i = 0; i < interaction.options.data.length; i++) {
            switch (interaction.options.data[i].name)
            {
                case 'forecasttype':
                    forecastType = interaction.options.data[i].value.trim();
                    break;
                case 'location':
                    location = interaction.options.data[i].value.trim();
                    break;
                default:
                    logWarning(`Got unexpected value in forecast interaction: ${interaction.options.data[i]}`);
            }
        }

        return [forecastType, location];
    } catch (e) {
        await logError(`Error getting forecast options, got: ${e}`, interaction);
    }
}

/**
 * Handles the /forecast commands
 * @param {Discord.message} interaction - Discord interaction to reply to
 */
async function handleForecastCommand(interaction)
{
    try {
        let result;

        const forecastOptions = await getForecastOptions(interaction);

        if (!forecastOptions) {
            return;
        } else if (getForecastMapData(forecastOptions[0]) == null) {
            await logError(`Unexpected forecast type received: ${forecastOptions[0]}`);
            return;
        }

        result = await getWeatherLocationGoogleMapsAPI(interaction);
        
        if (result != null)
        {
            printForecastUsingOneApiv3(result, interaction, forecastOptions[0]);
        }
    } catch (e) {
        await logError(`Failed to handle weather command, got error: ${e}`, interaction);
    }
}

const weatherCommand = new SlashCommandBuilder()
        .setName('weather')
        .setDescription('Get the current weather')
        .addStringOption((option) =>
            option
                .setName('location')
                .setDescription("Location to get the weather for")
                .setRequired(false)
        )
;

const forecastCommand = new SlashCommandBuilder()
        .setName('forecast')
        .setDescription('Get the forecast')
        .addStringOption((option) =>
            option
                .setName('forecasttype')
                .setDescription("The type of forecast")
                .addChoices(
                    { name: 'Daily', value: 'daily' },
                    { name: 'Hourly', value: 'hourly' },
                    { name: 'Minutely', value: 'minutely' },
                    { name: 'Alerts', value: 'alerts' },
                )
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('location')
                .setDescription('Location for the forecast')
                .setRequired(false),
        )
;

function registerWeatherCommand(client)
{
    const weather = 
    {
        data: weatherCommand,
        async execute(interaction) {
            await handleWeatherCommand(interaction);
        }
    }

    client.commands.set(weather.data.name, weather);
}

function getWeatherJSON()
{
    return weatherCommand.toJSON();
}

function registerForecastCommand(client)
{
    const forecast = 
    {
        data: forecastCommand,
        async execute(interaction) {
            await handleForecastCommand(interaction);
        }
    }

    client.commands.set(forecast.data.name, forecast);
}

function getForecastJSON()
{
    return forecastCommand.toJSON();
}

registerCommandModule(registerWeatherCommand, getWeatherJSON);
registerCommandModule(registerForecastCommand, getForecastJSON);

export { registerWeatherCommand, getWeatherJSON, registerForecastCommand, getForecastJSON }
