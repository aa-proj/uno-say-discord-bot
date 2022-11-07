import { Client, GatewayIntentBits, REST, Routes } from "discord.js"
import puppeteer from "puppeteer"
import { v4 as uuidv4 } from 'uuid';
import express from "express"
const app = express()
app.use("/internal", express.static('static'));
app.use("/image", express.static('img'));

app.listen(3000, () => console.log("express ok"))

const commands = [
    {
        name: 'unosay',
        description: 'Unoがしゃべります',
        options: [
            {
                name: "text",
                required: true,
                description: "テキスト",
                type: 3
            }
        ]
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const setupCommand = async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

await setupCommand()

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

client.on('guildCreate', async (guild) => {
    guild.commands.set(commands).then(() =>
        console.log(`Commands deployed in guild ${guild.name}!`));
})

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'unosay') {
        const text = interaction.options.get("text")?.value
        const reply = await interaction.reply("generating...")
        const uuid = await generateJELLYImage(text)
        await interaction.channel.send(`https://${process.env.HOST}/image/${uuid}.png`)
        await interaction.deleteReply()
    }
});

client.login(process.env.DISCORD_TOKEN);

const generateJELLYImage = async (text) => {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36");
    await page.goto("http://localhost:3000/internal/index.html?text=" + text, { waitUntil: 'load' });
    await page.waitForTimeout(2600);
    const uuid = uuidv4()
    await page.screenshot({ path: `./img/${uuid}.png` });
    await browser.close();
    return uuid
}
