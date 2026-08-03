export interface BookableActivitySlotTemplate {
  id: string;
  day: "saturday" | "sunday";
  startTime: string;
  endTime: string;
  remaining: number;
}

export interface BookableActivity {
  id: string;
  name: string;
  shortName: string;
  venue: string;
  floor: string;
  ageRange: string;
  duration: string;
  priceLabel: string;
  bookingMethod: string;
  checkInNote: string;
  cancelNote: string;
  keywords: string[];
  slots: BookableActivitySlotTemplate[];
}

export const BOOKABLE_ACTIVITIES: BookableActivity[] = [
  {
    id: "lego-weekend-build",
    name: "乐高周末创意拼搭派对",
    shortName: "乐高拼搭派对",
    venue: "乐高体验店",
    floor: "4F-B02",
    ageRange: "适合 4-12 岁儿童",
    duration: "约 60 分钟",
    priceLabel: "DTX 会员家庭免费",
    bookingMethod: "告诉我想参加的场次和人数，即可在线锁定名额；每组儿童需至少 1 位成人陪同。",
    checkInNote: "请提前 10 分钟到乐高体验店前台，出示预约码签到。",
    cancelNote: "如需取消，请在活动开始前 2 小时告知。",
    keywords: ["乐高", "lego", "拼搭", "积木", "创意拼搭", "周末派对"],
    slots: [
      { id: "sat-1030", day: "saturday", startTime: "10:30", endTime: "11:30", remaining: 6 },
      { id: "sat-1430", day: "saturday", startTime: "14:30", endTime: "15:30", remaining: 3 },
      { id: "sun-1030", day: "sunday", startTime: "10:30", endTime: "11:30", remaining: 5 },
      { id: "sun-1530", day: "sunday", startTime: "15:30", endTime: "16:30", remaining: 2 },
    ],
  },
];
