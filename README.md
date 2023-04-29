# BottyMcBotFace

Simple discord bot to do various stuff that was once handled by IRC bots but also does other, new things good too.

Written in a rather verbose way to make it easy for a beginner to read.  There may be better ways to do things, but this is extremely simple to follow.

## Basic instructions
- Clone repo
- Copy example env file to .env
- Fill out .env with the stuff
- npm install
- node ./deploy-commands.js prod
- node ./bot.js prod

## .env configuration details

### Discord Bot Settings

#### BOT_NAME
What the bot will refer to itself as when replying/reporting errors

#### DISCORD_TOKEN_PROD
Discord "production" token.  You only need a single token if you don't want to setup a test environment for the bot (i.e. you just wanna use this with what it comes with)

#### DISCORD_TOKEN_TEST
Discord "test" token -- if you have a test environment for bot development, you can use this so it has different tokens / instances

#### DISCORD_APP_ID_PROD
Discord app id for "production" bot, see discord docs, but you only need to fill this one out unless you're setting up a test environment

#### DISCORD_APP_ID_TEST
Discord app id for the test environment.

#### DISCORD_GUILD_ID
Comma separate list of guilds the bot will go to.  e.g.

DISCORD_GUILD_ID="12345" is a single server.  
DISCORD_GUILD_ID="12345,67891" for two servers and so on.

#### COMMAND_LIST
Comma separate list of commands to load.  All commands are expected to be in the ./commands folder.  Commands are dynamically imported so long as they register themselves in .env and the command file itself has a registerCommandModule call to generate the Discord command structures.

e.g. COMMAND_LIST="weather,settings,affirmation"

#### INFO_TAG
Logging tag for informational messages, e.g. '[INFO] '.  Tag is prepended, as-is, with no extra spacing.

#### WARN_TAG
Tag for warning level messages.

#### ERR_TAG
Tag for error level messages

#### DEBUG_ENABLE
Set to true to enable debug logging from discord in addition to normal logging messages

### Weather command settings

#### OPEN_WEATHER_KEY
Open weather API key for the weather module.  See https://openweathermap.org/appid to get yourself going.

#### GOOGLE_MAPS_API_KEY
Google maps API key.  See https://developers.google.com/maps/documentation/javascript/get-api-key

### Redit link command settings

See https://www.reddit.com/dev/api/oauth/

#### REDDIT_REFRESH_TOKEN
#### REDDIT_ACCESS_TOKEN
#### REDDIT_CLIENT_ID
#### REDDIT_CLIENT_SECRET
#### REDDIT_USER_AGENT
#### REDDIT_LINK_SUBREDDITS
Comma separated list of subreddits to use when using the link command.  e.g. REDDIT_LINK_SUBREDDITS="pics,news,worldnews"

#### PYTHON_BINARY
Name/location of python binary, e.g. python3  Needs PRAW installed to work with reddit.

### ChatGPT command settings

#### OPENAI_API_KEY
OpenAI API key to access data

#### OPENAI_MODEL
OpenAI model to use, e.g. 'text-davinci-003'

#### QUERY_PROMPT_HEADER
Lead in information before the query is sent to ChatGPT.  Use this to fill out info if you want it to know basic info about users. E.g. "Joe hates IPA beer"

## Running the bot as a systemd service in Linux
Super easy to run the bot in a VM or a raspberry pi or something.

Here's an example systemd configuration:
```
[Unit]
Description=BOOBSbot
After=multi-user.target
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/home/user/dev/BottyMcBotFace
ExecStart=/usr/bin/node /home/user/dev/BottyMcBotFace/bot.js prod
StandardOutput=append:/var/log/bottymcbotface.log
StandardError=append:/var/log/bottymcbotface.log
Type=idle
Restart=always
RestartSec=15
RestartPreventExitStatus=0
TimeoutStopSec=10

[Install]
WantedBy=multi-user.target
```

## High level program flow

### Bot

bot.js contains all the discord bot code.

On startup, the env file is loaded and the modules are read in.  These then dynamically register themselves based on what the .env file says should be loaded.

Each module is passed in the discord interaction when discord sends a matching command.  Each command implements their own functionality independent of any other, though shared functionality (e.g. user settings) can be accessed via the common.js exports.
