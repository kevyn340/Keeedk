const { Client, GatewayIntentBits, Partials, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const token = process.env.DISCORD_TOKEN;
const canalAnalise = process.env.CANAL_ANALISE_ID;
const cargoStaff = process.env.CARGO_STAFF_ID;

if (!token || !canalAnalise || !cargoStaff) {
  console.error("❌ Variáveis de ambiente ausentes. Configure DISCORD_TOKEN, CANAL_ANALISE_ID e CARGO_STAFF_ID nos Secrets.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

let aprovados = 0;
const LIMITE_APROVADOS = 3;

const perguntas = [
  "Qual é o seu nome completo?",
  "Qual é a sua idade?",
  "Em qual cidade você mora?",
  "Há quanto tempo utiliza o Discord?",
  "Por que deseja entrar para a CyberCore?",
  "O que é cibersegurança?",
  "O que é autenticação em dois fatores (2FA)?",
  "Como identificar uma tentativa de phishing?",
  "O que você faria ao encontrar uma vulnerabilidade em um sistema?",
  "Por que devemos aprovar você para a equipe?"
];

client.once(Events.ClientReady, () => {
  console.log(`✅ ${client.user.tag} online!`);
  client.channels.fetch(canalAnalise)
    .then(c => console.log(`✅ Canal de análise encontrado: #${c.name}`))
    .catch(() => console.error(`❌ ERRO: Canal de análise não encontrado! Verifique o CANAL_ANALISE_ID (${canalAnalise}) e se o bot está no servidor correto.`));
});

client.on("error", (err) => {
  console.error("Erro no cliente Discord:", err.message);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "formulario") {
      const embed = new EmbedBuilder()
        .setTitle("📋 Formulário CyberCore")
        .setDescription("Clique no botão abaixo para abrir o formulário.\n\nAs perguntas serão enviadas na sua DM.")
        .setColor(0x5865F2);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("abrir_formulario")
          .setLabel("Abrir Formulário")
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  if (interaction.isButton()) {

    if (interaction.customId === "abrir_formulario") {
      await interaction.reply({ content: "📩 Verifique sua DM.", ephemeral: true });

      let dm;
      try {
        dm = await interaction.user.createDM();
      } catch {
        return;
      }

      try {
        await dm.send("📋 **Bem-vindo ao formulário da CyberCore!**\nResponda todas as perguntas com atenção. Você tem **5 minutos** por resposta.");

        const respostas = [];

        for (let i = 0; i < perguntas.length; i++) {
          await dm.send(`> **Pergunta ${i + 1}/${perguntas.length}**\n> ${perguntas[i]}`);

          try {
            const collected = await dm.awaitMessages({
              filter: m => m.author.id === interaction.user.id,
              max: 1,
              time: 300000,
              errors: ["time"]
            });
            respostas.push(collected.first().content);
          } catch {
            await dm.send("⏰ Tempo esgotado! O formulário foi cancelado. Use o botão novamente para recomeçar.");
            return;
          }
        }

        let canal;
        try {
          canal = await client.channels.fetch(canalAnalise);
        } catch {
          console.error(`❌ Não foi possível buscar o canal de análise (ID: ${canalAnalise}). Verifique se o bot está no servidor e tem acesso ao canal.`);
          await dm.send("⚠️ Ocorreu um erro interno ao enviar suas respostas. Contate um administrador.");
          return;
        }

        const embedAnalise = new EmbedBuilder()
          .setTitle("📥 Nova Candidatura — CyberCore")
          .setDescription(
            `> 👤 **Usuário:** ${interaction.user.tag}\n> 🆔 **ID:** \`${interaction.user.id}\`\n> 📅 **Data:** <t:${Math.floor(Date.now() / 1000)}:F>`
          )
          .setColor(0x00b4d8)
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: "CyberCore • Sistema de Recrutamento" })
          .setTimestamp();

        for (let i = 0; i < perguntas.length; i++) {
          embedAnalise.addFields({
            name: `${i + 1}. ${perguntas[i]}`,
            value: `\`\`\`${respostas[i].substring(0, 1000)}\`\`\``,
            inline: false
          });
        }

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`aprovar_${interaction.user.id}`)
            .setLabel("✅  Aprovar")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`reprovar_${interaction.user.id}`)
            .setLabel("❌  Reprovar")
            .setStyle(ButtonStyle.Danger)
        );

        await canal.send({ embeds: [embedAnalise], components: [row] });

        const embedFim = new EmbedBuilder()
          .setTitle("✅ Formulário enviado!")
          .setDescription("Suas respostas foram enviadas para a staff da **CyberCore**.\n\n🎯 Aguarde a análise da nossa equipe. Você será notificado aqui na DM assim que houver uma decisão.\n\n⏳ O prazo de resposta pode levar até **48 horas**.")
          .setColor(0x57f287)
          .setFooter({ text: "CyberCore • Sistema de Recrutamento" })
          .setTimestamp();

        await dm.send({ embeds: [embedFim] });

      } catch (err) {
        console.error("Erro durante o formulário:", err.message);
      }
    }

    if (interaction.customId.startsWith("aprovar_")) {
      try {
        if (aprovados >= LIMITE_APROVADOS) {
          return interaction.update({
            content: "❌ O limite de 3 aprovados já foi atingido.",
            embeds: [],
            components: []
          });
        }

        const userId = interaction.customId.split("_")[1];

        let membro;
        try {
          membro = await interaction.guild.members.fetch(userId);
        } catch {
          return interaction.update({
            content: "❌ Não foi possível encontrar o membro no servidor.",
            embeds: [],
            components: []
          });
        }

        try {
          await membro.roles.add(cargoStaff);
        } catch (err) {
          console.error(`❌ Erro ao adicionar cargo (ID: ${cargoStaff}):`, err.message);
          return interaction.update({
            content: `❌ Erro ao adicionar cargo. Verifique se:\n• O ID do cargo \`CARGO_STAFF_ID\` está correto\n• O bot tem permissão de **Gerenciar Cargos**\n• O cargo do bot está **acima** do cargo a ser dado`,
            embeds: [],
            components: []
          });
        }

        aprovados++;

        await interaction.update({
          content: `✅ **Aprovado** por ${interaction.user.tag} — (${aprovados}/3 vagas preenchidas)`,
          embeds: [],
          components: []
        });

        const embedAprovado = new EmbedBuilder()
          .setTitle("🎉 Parabéns, você foi aprovado!")
          .setDescription("Você foi aprovado na **CyberCore** e já recebeu seu cargo na equipe.\n\nBem-vindo(a) ao time! 🚀")
          .setColor(0x57f287)
          .setFooter({ text: "CyberCore • Sistema de Recrutamento" })
          .setTimestamp();

        membro.send({ embeds: [embedAprovado] }).catch(() => {});
      } catch (err) {
        console.error("Erro no botão aprovar:", err.message);
        interaction.update({ content: "❌ Erro interno ao processar aprovação.", embeds: [], components: [] }).catch(() => {});
      }
    }

    if (interaction.customId.startsWith("reprovar_")) {
      try {
        const userId = interaction.customId.split("_")[1];
        const usuario = await client.users.fetch(userId).catch(() => null);

        await interaction.update({
          content: `❌ **Reprovado** por ${interaction.user.tag}`,
          embeds: [],
          components: []
        });

        if (usuario) {
          const embedReprovado = new EmbedBuilder()
            .setTitle("❌ Formulário não aprovado")
            .setDescription("Infelizmente sua candidatura na **CyberCore** não foi aprovada desta vez.\n\nNão desanime! Você pode tentar novamente no futuro. 💪")
            .setColor(0xed4245)
            .setFooter({ text: "CyberCore • Sistema de Recrutamento" })
            .setTimestamp();

          usuario.send({ embeds: [embedReprovado] }).catch(() => {});
        }
      } catch (err) {
        console.error("Erro no botão reprovar:", err.message);
        interaction.update({ content: "❌ Erro interno ao processar reprovação.", embeds: [], components: [] }).catch(() => {});
      }
    }
  }
});

client.login(token);
