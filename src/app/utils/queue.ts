export const QUEUE_VENUES: Record<string, { name: string; floor: string; type: "dining" | "brand" | "cafe" }> = {
  "新荣记": { name: "新荣记", floor: "5F", type: "dining" },
  "大董": { name: "大董烤鸭", floor: "4F", type: "dining" },
  "海底捞": { name: "海底捞", floor: "5F-C01", type: "dining" },
  "鼎泰丰": { name: "鼎泰丰", floor: "B1-A01", type: "dining" },
  "超市": { name: "DTX精品超市", floor: "B1-01", type: "dining" },
  flair: { name: "FLAIR 高端茶饮", floor: "4F", type: "cafe" },
  chanel: { name: "Chanel 精品店", floor: "1F-A12", type: "brand" },
  "香奈儿": { name: "Chanel 精品店", floor: "1F-A12", type: "brand" },
  hermes: { name: "Hermès", floor: "1F-B03", type: "brand" },
  "爱马仕": { name: "Hermès", floor: "1F-B03", type: "brand" },
  "hermès": { name: "Hermès", floor: "1F-B03", type: "brand" },
  lv: { name: "Louis Vuitton", floor: "1F-C01", type: "brand" },
  "路易威登": { name: "Louis Vuitton", floor: "1F-C01", type: "brand" },
  dior: { name: "Dior", floor: "1F-D05", type: "brand" },
  "迪奥": { name: "Dior", floor: "1F-D05", type: "brand" },
  gucci: { name: "Gucci", floor: "1F-E08", type: "brand" },
  "古驰": { name: "Gucci", floor: "1F-E08", type: "brand" },
};

export function parseQueueRequest(text: string): { venueKey: string; partySize: number } | null {
  const match = text.match(/(?:帮我排|排一个|帮我排队|排号|取号)[\s]?(.{1,10}?)[\s]?(\d)\s*人位?/);
  if (match) {
    const venue = match[1].trim().toLowerCase();
    const partySize = Number.parseInt(match[2], 10);
    const venueKey = Object.keys(QUEUE_VENUES).find((k) => venue.includes(k) || k.includes(venue));
    if (venueKey) return { venueKey, partySize };
  }

  const simpleMatch = text.match(/(?:帮我排|排一个|帮我排队|排号|取号)[\s]?(.{1,10}?)(?:的|$)/);
  if (simpleMatch) {
    const venue = simpleMatch[1].trim().toLowerCase();
    const venueKey = Object.keys(QUEUE_VENUES).find((k) => venue.includes(k) || k.includes(venue));
    if (venueKey) return { venueKey, partySize: 2 };
  }

  return null;
}
