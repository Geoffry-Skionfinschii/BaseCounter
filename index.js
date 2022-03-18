require('dotenv').config();

const symbols = "0123456789abcdefghijklmnopqrstuvwxyz";

const Client = require('discord.js').Client;
const client = new Client({intents: ["GUILDS", "DIRECT_MESSAGES", "GUILD_MESSAGES"]});

const { randomInt } = require('crypto');
const { MessageEmbed } = require('discord.js');
const fs = require('fs');

const channel = "954336994580897853";
const runningGuild = "693719703452909568";

let countDb = {
    base: -1,
    count: 0,
    prevAuthor: null
}

function loadDB() {
    let dbData = fs.readFileSync(`./count.db`);
    countDb = dbData ? JSON.parse(dbData) : countDb;
}

function saveDB() {
    fs.writeFileSync('./count.db', JSON.stringify(countDb));
}

/**
 * 
 * @param {import('discord.js').TextChannel} failChannel
 */
async function failCounter(failChannel, forcedBase = -1) {
    let failmsg = new MessageEmbed();
    failmsg.setTitle(`The count was disrupted!`);
    failmsg.setDescription(`You made it to ${countDb.count} in base${countDb.base}`);
    await failChannel.send({embeds: [failmsg]});

    let newBase = randomInt(2, 20);
    countDb.base = forcedBase == -1 ? newBase : forcedBase;
    countDb.count = 0;

    let newMsg = new MessageEmbed();
    newMsg.setTitle(`New Game - Base ${countDb.base}`)
    newMsg.setDescription(`This round is in base ${countDb.base} - this means valid numbers include the symbols \n\`${symbols.substring(0, countDb.base)}\``);
    await (await failChannel.send({embeds: [newMsg]})).pin();

    saveDB();
}

loadDB();

client.on('ready', () => {
    client.application.commands.set([{
        name: "force_base",
        "description": "Force a base to use for counting - Will cancel previous rounds",
        options: [
            {name: "base", description: "the base to use", required: true, type: "INTEGER", minValue: 2, maxValue: 36}
        ]
    }], runningGuild);
    console.log("Loaded");
});

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isCommand()) return;

    switch(interaction.commandName) {
        case "force_base": 
            let forcedBase = interaction.options.getInteger("base", true);

            await interaction.reply({ephemeral: true, content: `The base has been set to ${forcedBase}`})

            failCounter(interaction.channel, forcedBase);
        break;
    }
})

client.on('messageCreate', async (message) => {
    if(message.channelId != channel) return;
    if(message.author.bot) return;

    let cleanMessage = message.content.trim().toLowerCase();
    if(cleanMessage.includes(`/`)) return;

    let decimalValue = parseInt(cleanMessage, countDb.base);
    if(decimalValue == countDb.count + 1 && message.author.id != countDb.prevAuthor) {
        countDb.count = countDb.count + 1;
        countDb.prevAuthor = message.author.id;
        saveDB();
        await message.react(`✅`);
    } else {
        failCounter(message.channel);
    }
});


client.login();