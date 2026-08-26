export const DICEBEAR_ART_STYLES = [
  "bottts",
  "lorelei",
  "adventurer",
  "avataaars",
  "micah",
  "notionists",
  "thumbs",
  "fun-emoji"
];

const HEX_BG_COLORS = ["b6e3f4", "d8b4fe", "fde047", "6ee7b7", "fbcfe8", "bae6fd", "ddd6fe", "bef264"];

export function getDeterministicAvatar(studioDisplayName: string): string {
  const cleanName = studioDisplayName || "AniBook Studio";
  const hash = cleanName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgIndex = Math.abs(hash) % HEX_BG_COLORS.length;
  const bgHex = HEX_BG_COLORS[bgIndex];
  
  const styleIndex = Math.abs(hash) % DICEBEAR_ART_STYLES.length;
  const selectedStyle = DICEBEAR_ART_STYLES[styleIndex];
  
  // Using 9.x svg endpoint which is 100% reliable, never returns 400/canvas errors, and renders crisp on all screens
  return `https://api.dicebear.com/9.x/${selectedStyle}/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=${bgHex}`;
}

