import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Starter lexicon: hand-curated, not bulk-imported. Covers the function
 * words and the recurring vocabulary the mini-stories below are built
 * from (the same "30-40 high-frequency words repeated across scenes"
 * pattern from docs/PRD.md §6). Bulk-importing a full open dataset
 * (FreeDict/Wiktionary) is a follow-up — see docs/TASKS.md M1.
 */
const LEXICON: { headword: string; definition: string; partOfSpeech: string }[] = [
  { headword: "le", definition: "the (masculine)", partOfSpeech: "article" },
  { headword: "la", definition: "the (feminine)", partOfSpeech: "article" },
  { headword: "les", definition: "the (plural)", partOfSpeech: "article" },
  { headword: "un", definition: "a, an (masculine)", partOfSpeech: "article" },
  { headword: "une", definition: "a, an (feminine)", partOfSpeech: "article" },
  { headword: "être", definition: "to be", partOfSpeech: "verb" },
  { headword: "avoir", definition: "to have", partOfSpeech: "verb" },
  { headword: "aller", definition: "to go", partOfSpeech: "verb" },
  { headword: "aimer", definition: "to like, to love", partOfSpeech: "verb" },
  { headword: "manger", definition: "to eat", partOfSpeech: "verb" },
  { headword: "boire", definition: "to drink", partOfSpeech: "verb" },
  { headword: "vouloir", definition: "to want", partOfSpeech: "verb" },
  { headword: "pouvoir", definition: "to be able to, can", partOfSpeech: "verb" },
  { headword: "s'appeler", definition: "to be named", partOfSpeech: "verb" },
  { headword: "se lever", definition: "to get up", partOfSpeech: "verb" },
  { headword: "parler", definition: "to talk, to speak", partOfSpeech: "verb" },
  { headword: "chat", definition: "cat", partOfSpeech: "noun" },
  { headword: "chien", definition: "dog", partOfSpeech: "noun" },
  { headword: "famille", definition: "family", partOfSpeech: "noun" },
  { headword: "mère", definition: "mother", partOfSpeech: "noun" },
  { headword: "père", definition: "father", partOfSpeech: "noun" },
  { headword: "enfant", definition: "child", partOfSpeech: "noun" },
  { headword: "ami", definition: "friend (male)", partOfSpeech: "noun" },
  { headword: "amie", definition: "friend (female)", partOfSpeech: "noun" },
  { headword: "maison", definition: "house, home", partOfSpeech: "noun" },
  { headword: "école", definition: "school", partOfSpeech: "noun" },
  { headword: "ville", definition: "town, city", partOfSpeech: "noun" },
  { headword: "rue", definition: "street", partOfSpeech: "noun" },
  { headword: "café", definition: "coffee; café", partOfSpeech: "noun" },
  { headword: "pain", definition: "bread", partOfSpeech: "noun" },
  { headword: "lait", definition: "milk", partOfSpeech: "noun" },
  { headword: "eau", definition: "water", partOfSpeech: "noun" },
  { headword: "table", definition: "table", partOfSpeech: "noun" },
  { headword: "livre", definition: "book", partOfSpeech: "noun" },
  { headword: "voiture", definition: "car", partOfSpeech: "noun" },
  { headword: "jour", definition: "day", partOfSpeech: "noun" },
  { headword: "matin", definition: "morning", partOfSpeech: "noun" },
  { headword: "soir", definition: "evening", partOfSpeech: "noun" },
  { headword: "petit", definition: "small (masculine)", partOfSpeech: "adjective" },
  { headword: "petite", definition: "small (feminine)", partOfSpeech: "adjective" },
  { headword: "grand", definition: "big, tall (masculine)", partOfSpeech: "adjective" },
  { headword: "grande", definition: "big, tall (feminine)", partOfSpeech: "adjective" },
  { headword: "noir", definition: "black (masculine)", partOfSpeech: "adjective" },
  { headword: "noire", definition: "black (feminine)", partOfSpeech: "adjective" },
  { headword: "blanc", definition: "white (masculine)", partOfSpeech: "adjective" },
  { headword: "blanche", definition: "white (feminine)", partOfSpeech: "adjective" },
  { headword: "bon", definition: "good (masculine)", partOfSpeech: "adjective" },
  { headword: "bonne", definition: "good (feminine)", partOfSpeech: "adjective" },
  { headword: "aujourd'hui", definition: "today", partOfSpeech: "adverb" },
  { headword: "maintenant", definition: "now", partOfSpeech: "adverb" },
  { headword: "ici", definition: "here", partOfSpeech: "adverb" },
  { headword: "là", definition: "there", partOfSpeech: "adverb" },
  { headword: "ensemble", definition: "together", partOfSpeech: "adverb" },
  { headword: "oui", definition: "yes", partOfSpeech: "adverb" },
  { headword: "non", definition: "no", partOfSpeech: "adverb" },
  {
    headword: "bonjour",
    definition: "hello, good morning",
    partOfSpeech: "interjection",
  },
  { headword: "merci", definition: "thank you", partOfSpeech: "interjection" },
  { headword: "au revoir", definition: "goodbye", partOfSpeech: "interjection" },
  { headword: "et", definition: "and", partOfSpeech: "conjunction" },
  { headword: "mais", definition: "but", partOfSpeech: "conjunction" },
  { headword: "dans", definition: "in", partOfSpeech: "preposition" },
  { headword: "à", definition: "to, at", partOfSpeech: "preposition" },
  { headword: "de", definition: "of, from", partOfSpeech: "preposition" },
  { headword: "avec", definition: "with", partOfSpeech: "preposition" },
  { headword: "sur", definition: "on", partOfSpeech: "preposition" },
  { headword: "il", definition: "he, it", partOfSpeech: "pronoun" },
  { headword: "elle", definition: "she, it", partOfSpeech: "pronoun" },
  { headword: "ils", definition: "they (masculine/mixed)", partOfSpeech: "pronoun" },
  { headword: "je", definition: "I", partOfSpeech: "pronoun" },
  { headword: "tu", definition: "you (informal)", partOfSpeech: "pronoun" },
  { headword: "nous", definition: "we", partOfSpeech: "pronoun" },
  { headword: "vous", definition: "you (formal/plural)", partOfSpeech: "pronoun" },
];

/**
 * A1 mini-stories: short, built from the lexicon above, repeated across
 * scenes (docs/PRD.md §6). Text and comprehension questions are real
 * content; audio is intentionally left null — recording needs a human
 * narrator, which is a follow-up, not something this seed can produce
 * (see docs/TASKS.md M1).
 */
const MINI_STORIES = [
  {
    title: "Le chat noir",
    topicTags: ["animals", "daily-life"],
    sentences: [
      "Il y a un chat noir.",
      "Le chat s'appelle Minou.",
      "Minou est petit.",
      "Minou aime manger.",
      "Le matin, Minou boit du lait.",
    ],
    translation:
      "There is a black cat. The cat is named Minou. Minou is small. Minou likes to eat. In the morning, Minou drinks milk.",
    questions: [
      {
        prompt: "Comment s'appelle le chat ?",
        choices: ["Minou", "Paul", "Marie"],
        correctIndex: 0,
      },
      {
        prompt: "Que boit Minou le matin ?",
        choices: ["Du café", "Du lait", "De l'eau"],
        correctIndex: 1,
      },
    ],
  },
  {
    title: "La famille de Marie",
    topicTags: ["family", "daily-life"],
    sentences: [
      "Marie a une petite famille.",
      "Elle a une mère et un père.",
      "Marie aime sa famille.",
      "Le soir, la famille mange à la maison.",
    ],
    translation:
      "Marie has a small family. She has a mother and a father. Marie loves her family. In the evening, the family eats at home.",
    questions: [
      {
        prompt: "Quand la famille mange-t-elle ensemble ?",
        choices: ["Le matin", "Le soir", "À l'école"],
        correctIndex: 1,
      },
    ],
  },
  {
    title: "Le matin de Paul",
    topicTags: ["daily-life", "school"],
    sentences: [
      "Paul se lève le matin.",
      "Il va à l'école.",
      "L'école est dans la ville.",
      "Paul aime son école.",
    ],
    translation:
      "Paul gets up in the morning. He goes to school. The school is in the town. Paul likes his school.",
    questions: [
      {
        prompt: "Où va Paul le matin ?",
        choices: ["À la maison", "Au café", "À l'école"],
        correctIndex: 2,
      },
    ],
  },
  {
    title: "Au café",
    topicTags: ["food", "friends"],
    sentences: [
      "Il y a un café dans la rue.",
      "Le café a du bon pain.",
      "Les amis aiment aller au café.",
      "Ils boivent du café et ils parlent.",
    ],
    translation:
      "There's a café on the street. The café has good bread. Friends like to go to the café. They drink coffee and they talk.",
    questions: [
      {
        prompt: "Qu'est-ce que les amis boivent au café ?",
        choices: ["Du lait", "De l'eau", "Du café"],
        correctIndex: 2,
      },
    ],
  },
];

async function main() {
  console.log("Seeding lexicon…");
  for (const entry of LEXICON) {
    await prisma.lexiconEntry.upsert({
      where: { headword_language: { headword: entry.headword, language: "fr" } },
      update: { definition: entry.definition, partOfSpeech: entry.partOfSpeech },
      create: { ...entry, language: "fr", sourceDataset: "hand-curated" },
    });
  }
  console.log(`  ${LEXICON.length} entries upserted.`);

  console.log("Seeding A1 mini-stories…");
  // Re-run safe: clear only the lessons this seed owns (matched by title),
  // rather than every lesson, so a future admin-created lesson isn't wiped.
  await prisma.lesson.deleteMany({
    where: { title: { in: MINI_STORIES.map((s) => s.title) } },
  });

  for (const story of MINI_STORIES) {
    const lesson = await prisma.lesson.create({
      data: {
        title: story.title,
        level: "A1",
        type: "MINI_STORY",
        sourceType: "IN_HOUSE",
        topicTags: story.topicTags,
        bodyText: story.sentences.join(" "),
        translation: story.translation,
        segments: {
          create: story.sentences.map((text, order) => ({ order, text })),
        },
        questions: {
          create: story.questions.map((q, order) => ({ ...q, order })),
        },
      },
    });
    console.log(`  Created "${lesson.title}" (${lesson.id})`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
