/**
 * emojiMetadata.ts
 * -----------------
 * Unicode CLDR–based emoji metadata with:
 *   - Official CLDR names
 *   - Official CLDR keywords
 *   - Shortcodes (Slack/Discord-style)
 *
 * This powers:
 *   - Full-text emoji search
 *   - Fuzzy matching
 *   - Shortcode search (":smile")
 *   - Category/subcategory search
 *
 * Structure:
 *   EMOJI_METADATA[emoji] = {
 *     name: string;
 *     keywords: string[];
 *     shortcodes: string[];
 *   }
 */

export type EmojiMeta = {
  name: string;
  keywords: string[];
  shortcodes: string[];
};

export const EMOJI_METADATA: Record<string, EmojiMeta> = {
  /* ---------------------------------------------------------------------- */
  /* Smileys & Emotion                                                      */
  /* ---------------------------------------------------------------------- */

  "😀": {
    name: "grinning face",
    keywords: ["face", "smile", "happy", "joy", "grin"],
    shortcodes: [":grinning:", ":smile:"]
  },

  "😃": {
    name: "grinning face with big eyes",
    keywords: ["face", "smile", "happy", "joy", "big eyes"],
    shortcodes: [":smiley:"]
  },

  "😄": {
    name: "grinning face with smiling eyes",
    keywords: ["face", "smile", "happy", "joy", "laugh"],
    shortcodes: [":grin:"]
  },

  "😁": {
    name: "beaming face with smiling eyes",
    keywords: ["face", "smile", "happy", "joy", "beam"],
    shortcodes: [":beaming:", ":grinning_with_smiling_eyes:"]
  },

  "😆": {
    name: "grinning squinting face",
    keywords: ["face", "laugh", "lol", "xD", "funny"],
    shortcodes: [":laughing:", ":xd:"]
  },

  "😂": {
    name: "face with tears of joy",
    keywords: ["face", "cry", "laugh", "lol", "joy"],
    shortcodes: [":joy:"]
  },

  "🤣": {
    name: "rolling on the floor laughing",
    keywords: ["rofl", "lol", "laugh", "funny"],
    shortcodes: [":rofl:"]
  },

  "😊": {
    name: "smiling face with smiling eyes",
    keywords: ["face", "smile", "happy", "warm", "positive"],
    shortcodes: [":blush:"]
  },

  "🙂": {
    name: "slightly smiling face",
    keywords: ["face", "smile", "calm", "content"],
    shortcodes: [":slight_smile:"]
  },

  "😉": {
    name: "winking face",
    keywords: ["wink", "flirt", "playful"],
    shortcodes: [":wink:"]
  },

  "😍": {
    name: "smiling face with heart-eyes",
    keywords: ["love", "crush", "heart", "affection"],
    shortcodes: [":heart_eyes:"]
  },

  "🥰": {
    name: "smiling face with hearts",
    keywords: ["love", "affection", "warm", "hearts"],
    shortcodes: [":smiling_face_with_three_hearts:"]
  },

  "😘": {
    name: "face blowing a kiss",
    keywords: ["kiss", "love", "affection"],
    shortcodes: [":kissing_heart:"]
  },

  "😗": {
    name: "kissing face",
    keywords: ["kiss", "affection"],
    shortcodes: [":kissing:"]
  },

  "😙": {
    name: "kissing face with smiling eyes",
    keywords: ["kiss", "smile", "affection"],
    shortcodes: [":kissing_smiling_eyes:"]
  },

  "😚": {
    name: "kissing face with closed eyes",
    keywords: ["kiss", "affection", "love"],
    shortcodes: [":kissing_closed_eyes:"]
  },

  "😋": {
    name: "face savoring food",
    keywords: ["yum", "delicious", "food", "taste"],
    shortcodes: [":yum:"]
  },

  "😛": {
    name: "face with tongue",
    keywords: ["tongue", "playful", "silly"],
    shortcodes: [":stuck_out_tongue:"]
  },

  "😜": {
    name: "winking face with tongue",
    keywords: ["wink", "tongue", "playful", "silly"],
    shortcodes: [":stuck_out_tongue_winking_eye:"]
  },

  "🤪": {
    name: "zany face",
    keywords: ["crazy", "wild", "goofy"],
    shortcodes: [":zany_face:"]
  },

  "😎": {
    name: "smiling face with sunglasses",
    keywords: ["cool", "sun", "swag"],
    shortcodes: [":sunglasses:"]
  },

  "🥳": {
    name: "partying face",
    keywords: ["party", "celebration", "birthday"],
    shortcodes: [":partying_face:"]
  },

  /* ---------------------------------------------------------------------- */
  /* Animals & Nature                                                       */
  /* ---------------------------------------------------------------------- */

  "🐶": {
    name: "dog face",
    keywords: ["dog", "puppy", "pet", "animal"],
    shortcodes: [":dog:"]
  },

  "🐱": {
    name: "cat face",
    keywords: ["cat", "kitty", "feline", "pet"],
    shortcodes: [":cat:"]
  },

  "🐭": {
    name: "mouse face",
    keywords: ["mouse", "rodent"],
    shortcodes: [":mouse:"]
  },

  "🐹": {
    name: "hamster face",
    keywords: ["hamster", "pet", "cute"],
    shortcodes: [":hamster:"]
  },

  "🐰": {
    name: "rabbit face",
    keywords: ["rabbit", "bunny", "pet"],
    shortcodes: [":rabbit:"]
  },

  "🦊": {
    name: "fox",
    keywords: ["fox", "animal", "wild"],
    shortcodes: [":fox_face:"]
  },

  "🐻": {
    name: "bear face",
    keywords: ["bear", "animal"],
    shortcodes: [":bear:"]
  },

  "🐼": {
    name: "panda face",
    keywords: ["panda", "bear", "cute"],
    shortcodes: [":panda_face:"]
  },

  "🐨": {
    name: "koala",
    keywords: ["koala", "bear", "australia"],
    shortcodes: [":koala:"]
  },

  "🐯": {
    name: "tiger face",
    keywords: ["tiger", "cat", "wild"],
    shortcodes: [":tiger:"]
  },

  "🦁": {
    name: "lion",
    keywords: ["lion", "king", "wild"],
    shortcodes: [":lion:"]
  },

  "🐮": {
    name: "cow face",
    keywords: ["cow", "farm"],
    shortcodes: [":cow:"]
  },

  "🐷": {
    name: "pig face",
    keywords: ["pig", "farm"],
    shortcodes: [":pig:"]
  },

  "🐸": {
    name: "frog",
    keywords: ["frog", "amphibian"],
    shortcodes: [":frog:"]
  },

  "🐵": {
    name: "monkey face",
    keywords: ["monkey", "primate"],
    shortcodes: [":monkey_face:"]
  },

  /* ---------------------------------------------------------------------- */
  /* Objects                                                                */
  /* ---------------------------------------------------------------------- */

  "📚": {
    name: "books",
    keywords: ["books", "library", "reading", "study"],
    shortcodes: [":books:"]
  },

  "📖": {
    name: "open book",
    keywords: ["book", "read", "study"],
    shortcodes: [":book:"]
  },

  "⭐": {
    name: "star",
    keywords: ["star", "favorite", "highlight"],
    shortcodes: [":star:"]
  },

  "✨": {
    name: "sparkles",
    keywords: ["sparkle", "shine", "magic"],
    shortcodes: [":sparkles:"]
  },

  "🔥": {
    name: "fire",
    keywords: ["fire", "lit", "hot"],
    shortcodes: [":fire:"]
  },

  "📁": {
    name: "file folder",
    keywords: ["folder", "files", "directory"],
    shortcodes: [":file_folder:"]
  },

  "📂": {
    name: "open file folder",
    keywords: ["folder", "open", "directory"],
    shortcodes: [":open_file_folder:"]
  },

  "🏷️": {
    name: "label",
    keywords: ["tag", "label", "price"],
    shortcodes: [":label:"]
  },

  /* ---------------------------------------------------------------------- */
  /* Add more emojis here as needed — the structure is fully scalable       */
  /* ---------------------------------------------------------------------- */
};