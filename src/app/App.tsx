import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bubble } from "./components/chat/Bubble";
import { CatMascot } from "./components/CatMascot";
import { FeatureIcon } from "./components/FeatureIcon";
import { INITIAL_MESSAGES } from "./data/initial-messages";
import { FEATURE_ENTRIES } from "./data/feature-entries";
import { route } from "./agent";
import { formatTime } from "./utils/time";
import { ParkingPage } from "./pages/ParkingPage";
import { CouponPage } from "./pages/CouponPage";
import { DtxActivityPage } from "./pages/DtxActivityPage";
import { WarmServicePage } from "./pages/WarmServicePage";
import { RentalPage } from "./pages/RentalPage";
import { MembershipPage } from "./pages/MembershipPage";
import type { ActivityBookingInfo, Message, ParkingReservation, QueueInfo, UserProfile, AppointmentInfo } from "./types";
import { SIMULATED_USER_PROFILE } from "./data/user-profile";

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [parkingInfo, setParkingInfo] = useState<{ location: string; floor: string; parkedAt: number } | null>(null);
  const [parkingReservation, setParkingReservation] = useState<ParkingReservation | null>(null);
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [appointmentInfo, setAppointmentInfo] = useState<AppointmentInfo | null>(null);
  const [activityBookingInfo, setActivityBookingInfo] = useState<ActivityBookingInfo | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(SIMULATED_USER_PROFILE);
  const [currentPage, setCurrentPage] = useState<"mall-home" | "home" | "parking" | "coupon" | "activity" | "warm-service" | "rental" | "membership">("mall-home");
  const [isStreaming, setIsStreaming] = useState(false);
  const [frameScale, setFrameScale] = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  // 手机框按视口等比缩放,保证任何屏幕都能完整展示(留 32px 四周余量 + 阴影空间)
  const VIEWPORT_W = 390;
  const VIEWPORT_H = 844;
  useEffect(() => {
    const compute = () => {
      const s = Math.min(
        (window.innerWidth - 32) / VIEWPORT_W,
        (window.innerHeight - 32) / VIEWPORT_H,
        1,
      );
      setFrameScale(Math.max(0.4, Math.min(s, 1)));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const queueNotifiedRef = useRef<{ almost: boolean; ready: boolean }>({ almost: false, ready: false });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!queueInfo || queueInfo.status === "ready") return;

    const interval = setInterval(() => {
      setQueueInfo((prev) => {
        if (!prev) return null;

        const newAhead = Math.max(0, prev.ahead - 1);
        const newEstMin = Math.max(0, newAhead * 8);
        const newStatus: QueueInfo["status"] = newAhead === 0 ? "ready" : newAhead <= 2 ? "almost" : "queuing";

        if (newStatus === "almost" && !queueNotifiedRef.current.almost) {
          queueNotifiedRef.current.almost = true;
          const now = formatTime();
          setMessages((p) => [
            ...p,
            {
              id: `queue-almost-${Date.now()}`,
              role: "agent",
              text: `李先生，您在${prev.brand}的排队即将到号，前方仅剩${newAhead}组，请准备前往${prev.floor}。`,
              time: now,
              quickReplies: ["导航到店铺", "查看菜单"],
              queueCard: {
                type: "queue-card",
                brand: prev.brand,
                floor: prev.floor,
                partySize: prev.partySize,
                queueNo: prev.queueNo,
                ahead: newAhead,
                estMin: newEstMin,
                status: "almost",
              },
            },
          ]);
        } else if (newStatus === "ready" && !queueNotifiedRef.current.ready) {
          queueNotifiedRef.current.ready = true;
          const now = formatTime();
          setMessages((p) => [
            ...p,
            {
              id: `queue-ready-${Date.now()}`,
              role: "agent",
              text: `李先生，您在${prev.brand}的排队已到号！请前往${prev.floor}入座，过号需重新排队哦。`,
              time: now,
              quickReplies: ["导航到店铺", "今日专属优惠"],
              queueCard: {
                type: "queue-card",
                brand: prev.brand,
                floor: prev.floor,
                partySize: prev.partySize,
                queueNo: prev.queueNo,
                ahead: 0,
                estMin: 0,
                status: "ready",
              },
            },
          ]);
        }

        return { ...prev, ahead: newAhead, estMin: newEstMin, status: newStatus };
      });
    }, 12000);

    return () => clearInterval(interval);
  }, [queueInfo?.enrolledAt]);

  async function send(text?: string) {
    const value = (text ?? input).trim();
    if (!value || isStreaming) return;

    // 1. Append user message immediately
    setMessages((p) => [...p, { id: `u-${Date.now()}`, role: "user", text: value, time: formatTime() }]);
    setInput("");
    setIsTyping(true);
    setIsStreaming(true);

    // 2. Create streaming placeholder for agent response
    const agentMsgId = `a-${Date.now()}`;
    setMessages((p) => [...p, { id: agentMsgId, role: "agent", text: "", time: formatTime(), streaming: true }]);

    // 3. Setup abort controller for timeout
    const abortController = new AbortController();
    abortRef.current = abortController;
    const timeout = setTimeout(() => abortController.abort(), 30000);

    try {
      // 4. Call LLM with streaming
      const response = await route(
        { text: value, userProfile, parkingInfo, parkingReservation, queueInfo, appointmentInfo, activityBookingInfo },
        (token) => {
          // Stream each token into the placeholder message
          setMessages((p) =>
            p.map((m) => (m.id === agentMsgId ? { ...m, text: m.text + token } : m)),
          );
        },
      );

      // 5. Apply side effects
      if (response.sideEffects?.setUserProfile) {
        setUserProfile(response.sideEffects.setUserProfile);
      }
      if (response.sideEffects && "parkingInfo" in response.sideEffects) {
        setParkingInfo(response.sideEffects.parkingInfo ?? null);
      }
      if (response.sideEffects && "parkingReservation" in response.sideEffects) {
        setParkingReservation(response.sideEffects.parkingReservation ?? null);
      }
      if (response.sideEffects && "queueInfo" in response.sideEffects) {
        setQueueInfo(response.sideEffects.queueInfo ?? null);
      }
      if (response.sideEffects?.resetQueueNotified) {
        queueNotifiedRef.current = { almost: false, ready: false };
      }
      if (response.sideEffects && "appointmentInfo" in response.sideEffects) {
        setAppointmentInfo(response.sideEffects.appointmentInfo ?? null);
      }
      if (response.sideEffects && "activityBookingInfo" in response.sideEffects) {
        setActivityBookingInfo(response.sideEffects.activityBookingInfo ?? null);
      }

      // 6. Finalize the message with full text, cards, quickReplies
      setMessages((p) => {
        const finalized = p.map((m) =>
          m.id === agentMsgId
            ? {
                ...m,
                text: response.text,
                quickReplies: response.quickReplies,
                card: response.card,
                membershipAuthorizationCard: response.membershipAuthorizationCard,
                newMemberOfferCard: response.newMemberOfferCard,
                parkingCard: response.parkingCard,
                parkingShoppingGuideCard: response.parkingShoppingGuideCard,
                activityIntroCard: response.activityIntroCard,
                productIntroCard: response.productIntroCard,
                reservationCard: response.reservationCard,
                coupons: response.coupons,
                queueCard: response.queueCard,
                brandCards: response.brandCards,
                restaurantCards: response.restaurantCards,
                appointmentCard: response.appointmentCard,
                checkInCard: response.checkInCard,
                checkInSpotsCard: response.checkInSpotsCard,
                redPacketFlowCard: response.redPacketFlowCard,
                productRecommendCards: response.productRecommendCards,
                planCard: response.planCard,
                activityBookingCard: response.activityBookingCard,
                streaming: false,
              }
            : m,
        );
        const followUps: Message[] = (response.followUpMessages ?? []).map((message, index) => ({
          ...message,
          id: `${agentMsgId}-follow-up-${index}`,
          role: "agent",
          time: formatTime(),
          streaming: false,
        }));
        return [...finalized, ...followUps];
      });
    } catch (error) {
      console.error("Send failed:", error);
      // On error, finalize the placeholder with a fallback message (include error detail for diagnosis)
      const errDetail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      // On error, finalize the placeholder with a fallback message
      setMessages((p) =>
        p.map((m) =>
          m.id === agentMsgId
            ? {
                ...m,
                text: m.text || `抱歉，服务暂时不可用，请稍后再试。\n[诊断] ${errDetail}`,
                quickReplies: ["查询停车状态", "今日专属优惠"],
                streaming: false,
              }
            : m,
        ),
      );
    } finally {
      clearTimeout(timeout);
      setIsTyping(false);
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function navigateTo(feature: string) {
    if (feature === "领券中心") {
      setCurrentPage("coupon");
      return;
    }
    if (feature === "活动中心") {
      setCurrentPage("activity");
      return;
    }
    if (feature === "会员中心") {
      setCurrentPage("membership");
      return;
    }
    send(feature);
  }

  function handleParkingRedeem() {
    setCurrentPage("home");
    setTimeout(() => send("积分抵扣停车费"), 100);
  }

  return (
    <div className="size-full flex items-center justify-center overflow-hidden" style={{ background: "#D9D4C8" }}>
      <div
        style={{
          width: VIEWPORT_W * frameScale,
          height: VIEWPORT_H * frameScale,
          flexShrink: 0,
        }}
      >
        <div
          className="relative flex flex-col overflow-hidden"
          style={{
            width: VIEWPORT_W,
            height: VIEWPORT_H,
            background: "#FEF3EB",
            fontFamily: "'DM Sans', sans-serif",
            color: "#20201C",
            borderRadius: 44,
            boxShadow: "0 40px 120px rgba(0,0,0,0.45), 0 0 0 1px rgba(240,176,64,0.18)",
            transform: `scale(${frameScale})`,
            transformOrigin: "top left",
          }}
      >
        {currentPage === "mall-home" ? (
          <div className="relative size-full overflow-hidden bg-white">
            <img
              src="/home.jpg"
              alt="DT-X会员服务首页"
              className="size-full object-contain"
              draggable={false}
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setCurrentPage("home")}
              aria-label="打开智能管家"
              title="打开智能管家"
              className="absolute right-4 z-20 flex size-14 items-center justify-center rounded-full border-2 border-white bg-white shadow-[0_8px_24px_rgba(91,77,208,0.32)]"
              style={{ bottom: 92 }}
            >
              <CatMascot headOnly className="size-12 rounded-full" />
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#8070F0] text-[9px] text-white">✦</span>
            </motion.button>
          </div>
        ) : currentPage === "parking" ? (
          <ParkingPage
            parkingInfo={parkingInfo}
            onBack={() => setCurrentPage("home")}
            onRecordParking={(info) => setParkingInfo(info)}
            onRedeemPoints={handleParkingRedeem}
          />
        ) : currentPage === "activity" ? (
          <DtxActivityPage onBack={() => setCurrentPage("home")} />
        ) : currentPage === "warm-service" ? (
          <WarmServicePage onBack={() => setCurrentPage("home")} />
        ) : currentPage === "rental" ? (
          <RentalPage onBack={() => setCurrentPage("home")} />
        ) : currentPage === "membership" ? (
          <MembershipPage onBack={() => setCurrentPage("home")} />
        ) : currentPage === "coupon" ? (
          <CouponPage onBack={() => setCurrentPage("home")} />
        ) : (
        <>
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-4 pb-3 relative z-20">
          <button
            type="button"
            onClick={() => setCurrentPage("mall-home")}
            aria-label="返回商城首页"
            className="w-8 h-8 flex items-center justify-center text-[#A89D8A] text-lg"
          >
            ‹
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[14px] tracking-[0.18em] text-[#20201C]" style={{ fontFamily: "'Cormorant', serif", fontWeight: 500 }}>
              DTX · 专享管家
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center text-[#A89D8A] text-sm">···</button>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-center gap-1.5 pb-2 relative z-20">
          <div className="h-px w-12" style={{ background: "linear-gradient(90deg, transparent, #F0B04030)" }} />
          <p className="text-[10px] tracking-[0.12em] text-[#A89D8A]">下拉查看历史对话</p>
          <div className="h-px w-12" style={{ background: "linear-gradient(90deg, #F0B04030, transparent)" }} />
        </div>

        <div ref={chatRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div
            className="relative w-full flex items-stretch overflow-hidden"
            style={{
              height: 172,
              background: "linear-gradient(120deg, #F4E6CF 0%, #ECD8B9 48%, #E8D3B4 100%)",
            }}
          >
            {/* 丝绒质感:质感光晕 + 斜纹丝绒纹理,营造香槟金轻奢氛围 */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(120% 80% at 18% 0%, rgba(255,250,235,0.4) 0%, rgba(255,255,255,0) 50%)" }} />
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(120deg, rgba(200,150,70,0.5) 0px, rgba(200,150,70,0.5) 0.5px, transparent 0.5px, transparent 4px)", opacity: 0.18, mixBlendMode: "overlay" }} />
            <div className="relative z-10 flex flex-col justify-center pl-6 pr-2 flex-1">
              <p className="text-[10px] tracking-[0.22em] text-[#F0B040] uppercase mb-3" style={{ letterSpacing: "0.2em", fontFamily: "'DM Sans', sans-serif" }}>
                DTX · CONCIERGE
              </p>
              <p className="text-[26px] leading-[1.15] text-[#20201C] mb-4 whitespace-nowrap" style={{ fontFamily: "'Cormorant', serif", fontWeight: 500, letterSpacing: "0.04em" }}>
                早上好，李先生
              </p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF8E] animate-pulse" />
                <span className="text-[10px] tracking-widest text-[#A89D8A]">
                  喵星人在线，随时聊天
                </span>
              </div>

              <div className="mt-5 self-start flex items-center gap-1.5 px-3 h-6 rounded-full" style={{ background: "rgba(255,255,255,0.42)", border: "1px solid rgba(255,255,255,0.55)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 1px 2px rgba(120,90,40,0.06)", backdropFilter: "blur(6px)" }}>
                <span className="text-[8px] text-[#8C7A5C] tracking-wider">
                  {userProfile.isMember ? "积分余额" : "会员权益"}
                </span>
                <span className="text-[10px]" style={{ color: userProfile.isMember ? "#B8893A" : "#7C6FE0", fontFamily: userProfile.isMember ? "'DM Mono', monospace" : "'DM Sans', sans-serif", fontWeight: 500 }}>
                  {userProfile.isMember ? "128,400" : "立即激活"}
                </span>
              </div>
            </div>

            <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 168 }}>
              <CatMascot
                className="relative z-10"
                style={{ width: 150, height: 150, marginRight: 8 }}
              />
            </div>
          </div>

          <div className="px-4 pt-5 pb-6 grid grid-cols-3 gap-3">
            {FEATURE_ENTRIES.map((feature) => (
              <motion.button
                key={feature.title}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigateTo(feature.title)}
                className="relative flex items-center justify-center px-3 py-3.5 text-center w-full transition-all duration-200 rounded-[14px]"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(240,176,64,0.16)",
                  boxShadow: "0 1px 3px rgba(42,37,32,0.04)",
                }}
              >
                <div className="min-w-0">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="flex-shrink-0" style={{ color: "#B7924A" }}>
                      <FeatureIcon name={feature.iconName!} width={17} height={17} />
                    </span>
                    <p className="text-[12px] text-[#20201C]" style={{ fontWeight: 500 }}>
                      {feature.title}
                    </p>
                  </div>
                  <p className="text-[9px] text-[#A89D8A] leading-tight mt-1">{feature.sub}</p>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-3 px-5 mb-4">
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, transparent, #F0B04020)" }} />
            <span className="text-[9px] tracking-[0.22em] text-[#F0B040]/50 uppercase">对话记录</span>
            <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, #F0B04020, transparent)" }} />
          </div>

          <div className="px-4 space-y-5 pb-4">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <Bubble key={message.id} msg={message} onQuickReply={send} />
              ))}

              {isTyping && (
                <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5">
                  <CatMascot
                    withBackground
                    headOnly
                    className="flex-shrink-0 w-8 h-8 rounded-full"
                    style={{ border: "1px solid rgba(240,176,64,0.3)" }}
                  />
                  <div
                    className="px-3.5 py-3 flex items-center gap-[5px] rounded-[18px] rounded-tl-[4px]"
                    style={{ background: "#FFFFFF", border: "1px solid rgba(240,176,64,0.12)", boxShadow: "0 1px 4px rgba(42,37,32,0.06)" }}
                  >
                    {[0, 0.18, 0.36].map((delay, i) => (
                      <motion.div
                        key={i}
                        className="w-[5px] h-[5px] rounded-full"
                        style={{ background: "#8070F060" }}
                        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.15, 0.8] }}
                        transition={{ duration: 1, delay, repeat: Infinity }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          <div className="h-24" />
        </div>

        <div className="absolute bottom-0 inset-x-0 z-30" style={{ background: "linear-gradient(to top, #FEF3EB 72%, rgba(254,243,235,0) 100%)", paddingTop: 20 }}>
          <div
            className="mx-4 mb-3 flex items-center gap-2.5 px-4 py-3 rounded-[24px]"
            style={{ background: "#FFFFFF", border: "1px solid rgba(240,176,64,0.2)", boxShadow: "0 2px 12px rgba(42,37,32,0.07)" }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="有什么需要问我的吗～"
              className="flex-1 bg-transparent outline-none text-[13px] text-[#20201C] placeholder:text-[#CFC3AE]"
              style={{ fontWeight: 400 }}
            />
            {input.trim() ? (
              <button
                onClick={() => send()}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-sm transition-all duration-200 active:scale-95 rounded-full"
                style={{ background: "#F0B040", color: "#FFFFFF" }}
              >
                ↑
              </button>
            ) : (
              <button className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[#CFC3AE] transition-colors hover:text-[#F0B040]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="8" y1="22" x2="16" y2="22"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        </>
        )}
        </div>
      </div>
    </div>
  );
}
