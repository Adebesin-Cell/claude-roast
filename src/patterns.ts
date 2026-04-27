export const PATTERNS = {
  correction: /^(no\b|nope\b|wrong\b|stop\b|actually\b|nvm\b|that'?s not|don'?t do|you'?re wrong|that'?s wrong|no no)/i,
  fixItLazy: /^(fix it|fix this|fix\.|make it work|do it\b|just do it|just fix|continue\b|go\b|yes\b|ok\b|k\b|y\b)$/i,
  ultrathink: /\b(ultrathink|think hard(?:er)?|think more|think deeper|think step by step|use your brain|really think|think carefully)\b/i,
  profanity: /\b(fuck|fucking|shit|damn|wtf|stfu|bullshit|crap|hell\b|bloody)\b/i,
  pleading: /\b(please|pls|plz|i beg|c'?mon|come on)\b/i,
  apology: /\b(sorry|my bad|i apologize|apologies)\b/i,
  noVerify: /--no-verify\b/,
  forcePush: /\bgit\s+push.*--force|--force-with-lease/,
  gitResetHard: /\bgit\s+reset\s+--hard\b/,
  rmRf: /\brm\s+-rf?\b/,
  pasted: /\[Pasted text(?:\s*#\d+)?\s*\+(\d+)\s+lines?\]/g,
  slashCommand: /^\/([a-zA-Z][\w:-]*)/,
  thanksReply: /^(thx|ty|thanks|thank you|gg|nice|cool|perfect|love it|great|awesome)[\s!.?]*$/i,
  shouted: /\b(IMPORTANT|CRITICAL|MUST|DO NOT)\b/,
  veryVery: /\bvery\s+very\b/gi,
} as const;

export const STOPWORDS = new Set([
  "this", "that", "with", "from", "have", "your", "into", "what", "when",
  "where", "which", "their", "them", "they", "then", "than", "also", "just",
  "like", "want", "need", "make", "made", "does", "doing", "about", "some",
  "there", "here", "would", "could", "should", "will", "shall", "been",
  "being", "more", "most", "such", "only", "very", "much", "many", "still",
  "even", "back", "over", "down", "away", "really", "thing", "things",
  "claude", "code", "file", "files", "function", "please", "thanks",
  "ensure", "going", "doesn", "didn", "wasn", "won", "isn",
]);

export const LATE_NIGHT_HOURS = { start: 0, end: 5 };
export const EARLY_MORNING_HOURS = { start: 5, end: 8 };
