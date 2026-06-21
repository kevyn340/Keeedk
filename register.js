const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error("❌ Configure DISCORD_TOKEN e DISCORD_CLIENT_ID nos Secrets antes de executar.");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("formulario")
    .setDescription("Envia o painel do formulário")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    );
    console.log("✅ Comando /formulario registrado com sucesso!");
  } catch (err) {
    console.error(err);
  }
})();
