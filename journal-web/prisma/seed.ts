import { EntryType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GRATITUDE_PROMPTS: string[] = [
  "What friend checked in on you recently?",
  "Which meal satisfied you this week?",
  "Name a neighborly act you witnessed.",
  "Recall a song that instantly elevates your mood.",
  "What skill are you grateful to have learned?",
  "Describe a time nature surprised you today.",
  "Which object on your desk brings comfort?",
  "Who made you feel understood this month?",
  "What body part are you thankful is working today?",
  "Which smell sparks joyful nostalgia?",
  "What made you smile before noon today?",
  "How has technology made your life easier lately?",
  "Which book quote keeps resurfacing for you?",
  "What local business brightens your neighborhood?",
  "Name a recent moment of stillness you cherished.",
  "Which personal boundary are you thankful for protecting?",
  "What tradition are you glad to uphold?",
  "Who taught you something small yet meaningful recently?",
  "Describe light you appreciated today.",
  "What challenge secretly sharpened you this week?",
  "Which beverage felt especially soothing?",
  "What new idea are you grateful landed?",
  "Who offered you patience when you needed it?",
  "Which item of clothing makes you feel safe?",
  "Name a memory from childhood that resurfaced with warmth.",
  "What aspect of your health deserves thanks right now?",
  "Which joke or meme made you laugh lately?",
  "What errand went unexpectedly smoothly?",
  "Which mentor or elder are you thinking of gratefully?",
  "What part of your morning routine anchors you?",
  "Which sound in your home comforts you?",
  "What did you learn about yourself today?",
  "Who celebrated a win with you recently?",
  "Which stranger showed kindness this week?",
  "What fear did you face that you're proud of?",
  "Which recipe are you thankful exists?",
  "Describe a moment when time felt generous.",
  "What habit are you grateful you stuck with?",
  "Which plant or pet lifted your mood?",
  "What view out a window felt restorative?",
  "Which creative outlet are you honored to enjoy?",
  "What resource saved you time today?",
  "Who checks on you even when you're quiet?",
  "Which future plan fills you with gratitude?",
  "What piece of advice do you treasure right now?",
  "Which song lyric describes your gratitude today?",
  "What part of your body carries you through hard days?",
  "Which household tool are you weirdly thankful for?",
  "What time of day feels most sacred lately?",
  "Who inspired you to be kinder this week?",
  "What problem solved itself recently?",
  "Which scent in your home feels grounding?",
  "What conversation restored your faith?",
  "Which act of self-care are you proud of?",
  "What made you exhale in relief this week?",
  "Who gives you honest feedback with love?",
  "Which space in your home feels like a sanctuary?",
  "What technology connection let you see someone you miss?",
  "Which teacher shaped your gratitude practice?",
  "What boundary did someone else honor for you?",
  "Which podcast, show, or video filled you with joy?",
  "What dream are you grateful is still alive?",
  "Which season are you glad to experience right now?",
  "What part of your work are you surprisingly thankful for?",
  "Which public service worker deserves your gratitude today?",
  "What meal did you enjoy cooking recently?",
  "Which color keeps appearing and delighting you?",
  "What decision from last year are you now thankful for?",
  "Which compliment stayed with you?",
  "What mistake taught you a gift?",
  "Which volunteer or helper impressed you?",
  "What generosity did you witness online?",
  "Which craft or hobby calms you most?",
  "What made your home feel extra cozy this week?",
  "Which place in your city feels like an oasis?",
  "What skill are you excited to continue practicing?",
  "Which person believed in you before you did?",
  "What breath practice helped you today?",
  "Which philanthropic effort do you admire?",
  "What little luxury could you not live without?",
  "Which moment of laughter cut through the stress?",
  "What tradition are you excited to pass forward?",
  "Which sunrise or sunset stuck with you?",
  "What volunteer opportunity are you grateful exists?",
  "Which item you repaired are you proud of?",
  "What message or DM warmed your heart?",
  "Which smell of nature did you savor?",
  "What playlist is making life better lately?",
  "Which friend you haven't met yet are you already thankful for?",
  "What part of your identity are you embracing with gratitude?",
  "Which beverage shared with someone felt meaningful?",
  "What body sensation tells you that you're safe?",
  "Which financial decision eased your mind?",
  "What did you declutter that sparked relief?",
  "Which ritual helps you wind down at night?",
  "What ancestor or relative do you honor today?",
  "Which creative risk paid off recently?",
  "What hospitality did you receive or offer?",
  "Which technology glitch forced an unexpectedly nice pause?",
  "What everyday object reminds you that you're cared for?",
];

const CREATIVE_PERSONAS: { name: string; description: string }[] = [
  { name: "Mythic Sage", description: "Ancient folklore voice weaving fables from modern sparks." },
  { name: "Noir Detective", description: "Gritty, observant narrator with a soft underbelly." },
  { name: "Gentle Botanist", description: "Plant-focused diarist noticing tiny ecological dramas." },
  { name: "Solar Explorer", description: "Hopeful space traveler sending letters home." },
  { name: "Time Archivist", description: "Curator stitching timelines and parallel lives." },
  { name: "Deep Sea Listener", description: "Quiet chronicler of bioluminescent whispers." },
  { name: "Neon Cyberpoet", description: "Glitchy futuristic romantic with lyrical code." },
  { name: "Cozy Memoirist", description: "Present tense storyteller savoring domestic rituals." },
  { name: "Desert Nomad", description: "Wind-worn wanderer tracking constellations and dunes." },
  { name: "Quantum Cartographer", description: "Mapmaker charting emotions across multiverses." },
];

async function main() {
  for (const entryType of Object.values(EntryType)) {
    await prisma.entryCounter.upsert({
      where: { entryType },
      create: { entryType },
      update: {},
    });
  }

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    await prisma.user.create({ data: {} });
  }

  for (const [index, promptText] of GRATITUDE_PROMPTS.entries()) {
    await prisma.gratitudePrompt.upsert({
      where: { promptText },
      update: { isActive: true },
      create: {
        promptText,
        isActive: true,
        createdAt: new Date(),
      },
    });
    if ((index + 1) % 20 === 0) {
      console.log(`Seeded ${index + 1} gratitude prompts`);
    }
  }

  for (const [order, persona] of CREATIVE_PERSONAS.entries()) {
    await prisma.creativePersona.upsert({
      where: { name: persona.name },
      update: {
        description: persona.description,
        isActive: true,
        order,
      },
      create: {
        name: persona.name,
        description: persona.description,
        isActive: true,
        order,
      },
    });
  }

  console.log("Seed complete ✔");
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
