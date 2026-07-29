export const QUEUE_VENUES: Record<string, { name: string; floor: string; type: "dining" | "brand" | "cafe" }> = {
  "新荣记": { name: "新荣记", floor: "7F-D01", type: "dining" },
  "大董": { name: "大董烤鸭", floor: "4F", type: "dining" },
  "海底捞": { name: "海底捞", floor: "5F-C01", type: "dining" },
  "鼎泰丰": { name: "鼎泰丰", floor: "B1-A01", type: "dining" },
  "超市": { name: "DTX精品超市", floor: "B1-01", type: "dining" },
  flair: { name: "FLAIR 高端茶饮", floor: "4F", type: "cafe" },
  chanel: { name: "CHANEL", floor: "1F-A12", type: "brand" },
  "香奈儿": { name: "CHANEL", floor: "1F-A12", type: "brand" },
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
  const normalized = text.trim().toLowerCase();
  const venueKey = Object.keys(QUEUE_VENUES).find((key) => normalized.includes(key));
  const partySizeMatch = normalized.match(/(\d{1,2})\s*(?:人|位)/);
  const partySize = partySizeMatch ? Number.parseInt(partySizeMatch[1], 10) : 2;

  // 支持“帮我新荣记等位”“新荣记等位”“给我在新荣记取个号”等自然语序。
  const queueAction = /等位|排队|排号|取号|拿号|叫号/;
  const queueProgressQuery = /(?:查询|查看|看看|查下|查一下)?(?:排队|等位)(?:进度|状态|到哪|多久)|还有几组|到号(?:了|没)/;
  if (venueKey && queueAction.test(normalized) && !queueProgressQuery.test(normalized)) {
    return { venueKey, partySize };
  }

  const match = normalized.match(/(?:帮我排|排一个|帮我排队|排号|取号)[\s]?(.{1,10}?)[\s]?(\d)\s*人位?/);
  if (match) {
    const venue = match[1].trim().toLowerCase();
    const parsedPartySize = Number.parseInt(match[2], 10);
    const matchedVenueKey = Object.keys(QUEUE_VENUES).find((k) => venue.includes(k) || k.includes(venue));
    if (matchedVenueKey) return { venueKey: matchedVenueKey, partySize: parsedPartySize };
  }

  const simpleMatch = normalized.match(/(?:帮我排|排一个|帮我排队|排号|取号)[\s]?(.{1,10}?)(?:的|$)/);
  if (simpleMatch) {
    const venue = simpleMatch[1].trim().toLowerCase();
    const matchedVenueKey = Object.keys(QUEUE_VENUES).find((k) => venue.includes(k) || k.includes(venue));
    if (matchedVenueKey) return { venueKey: matchedVenueKey, partySize };
  }

  return null;
}
