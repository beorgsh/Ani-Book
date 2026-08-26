export const DICEBEAR_ART_STYLES = [
  "adventurer",
  "avataaars",
  "bottts",
  "croodles",
  "lorelei",
  "micah",
  "notionists",
  "open-peeps",
  "personas",
  "shapes"
];

const HEX_BG_COLORS = ["b6e3f4", "d8b4fe", "fde047", "6ee7b7", "fbcfe8", "bae6fd", "ddd6fe", "bef264"];

export function getDeterministicAvatar(studioDisplayName: string): string {
  const hash = studioDisplayName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bgIndex = hash % HEX_BG_COLORS.length;
  const bgHex = HEX_BG_COLORS[bgIndex];
  
  const styleIndex = hash % DICEBEAR_ART_STYLES.length;
  const selectedStyle = DICEBEAR_ART_STYLES[styleIndex];
  
  return `https://api.dicebear.com/7.x/${selectedStyle}/png?seed=${encodeURIComponent(studioDisplayName)}&backgroundColor=${bgHex}`;
}
