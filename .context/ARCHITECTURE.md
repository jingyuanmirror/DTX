# DTX 商场导购对话应用 — 架构说明

> 一个模拟"商场智能管家"的 React + TypeScript 对话应用。用户在手机框 UI 里和猫 IP 管家对话,完成逛吃购推荐、行程规划、品牌预约、停车、入会、打卡、领券等商场服务。

---

## 1. 项目总览

- **技术栈**:React 18 + TypeScript + Vite 6。UI 用 Tailwind + Radix/shadcn 基础件 + motion 动画。无路由库、无全局状态库(单 `App` 自包含)。
- **运行**:`npm run dev`(Vite dev,带 `/api/llm` 代理)、`npm run build`(vite build)。无 tsconfig,类型靠 vite/esbuild 转译,需手写临时 tsconfig 才能跑 `tsc --noEmit`。
- **LLM**:OpenAI 兼容 `/chat/completions`,流式强制 `stream:true`。默认模型 `Ling-2.6-flash`(`src/app/llm/config.ts`),经同源代理 `/api/llm/v1` 转发上游(开发期 Vite proxy,线上 Vercel API route)。
- **设计稿**:390×844 手机框,按视口等比缩放(`App.tsx` 的 `frameScale`,min 0.4)。

## 2. 目录结构

```
src/
├─ main.tsx                    # 极简入口:createRoot + 全局 css
├─ app/
│  ├─ App.tsx                  # 核心容器:state + send 流程 + 渲染分流
│  ├─ agent/                   # 路由层:route() 双层路由 + 类型定义
│  │  ├─ index.ts              #   route / routeBySkills / classifySkillIntent
│  │  └─ types.ts              #   SkillContext / Skill / AgentResponse / SideEffects
│  ├─ skills/                  # 16 个能力 skill(见 §4)
│  ├─ llm/                     # LLM 层:client/chat/system-prompt/tools(见 §5)
│  ├─ data/                    # 数据层:TS 结构化数据 + 4 个 markdown 知识库(见 §6)
│  ├─ components/              # chat/Bubble + 22 个卡片 + 基础件(见 §7)
│  ├─ pages/                   # 6 个截图壳页面(见 §7.3)
│  ├─ types/index.ts           # 全部领域类型(Message/UserProfile/各 Card)
│  └─ utils/                   # preference/parking/queue/salutation/time(见 §7.4)
```

## 3. 核心数据流:一次对话请求的生命周期

```
用户输入
  │
  ▼
App.send(text)                          [App.tsx:125]
  ├─ push user message + 开 streaming 占位
  ├─ 建 AbortController(30s 超时)
  │
  ├─ route(ctx, onToken)                [agent/index.ts:36]
  │    │
  │    ├─【第一层:确定性 skill 路由】routeBySkills(ctx)
  │    │    ├─ 流程态状态机(在途中断):                 [agent/index.ts:116-153]
  │    │    │    parking 收车牌 / activity-booking 选场次 / appointment 选档期
  │    │    │    / membership 入会填表 → 直接进对应 skill
  │    │    ├─ 短回复复用 lastActiveSkill             [isFollowUp]
  │    │    ├─ 极少量确定性 pattern(七夕活动/活动预约/打卡点/商品名)
  │    │    ├─ classifySkillIntent(text)  ← LLM 分类器(主意图路由)  [agent/index.ts:225]
  │    │    │    把全部 skill 的 intentDescription 喂 LLM,输出 skill 名
  │    │    └─ 命中 → skill.handle(ctx) → 返回 AgentResponse
  │    │       (ctx 含 conversationHistory,供 store-recommend 等做上下文意图解析)
  │    │
  │    └─【第二层:LLM function-call fallback】chat(text,ctx,history)  [llm/chat.ts:46]
  │         (仅当第一层全没命中)
  │         ├─ buildSystemPrompt(ctx)             [动态注入用户状态]
  │         ├─ 携带 toolDefinitions(10 工具,1:1 对应 skill)
  │         ├─ LLM 返回 tool_calls → executeTool → skill.handle()  [llm/tools/executor.ts]
  │         ├─ 最多 5 轮 tool 循环;任一 tool 返回卡片 → 短路返回
  │         └─ 无 tool → 提取正文 + QUICK_REPLIES 标记 → AgentResponse
  │
  │    每来一个 token → setMessages 追加进占位消息
  │
  ├─ 应用 sideEffects(setUserProfile/parkingInfo/queueInfo/...)  [App.tsx:157-177]
  ├─ finalize 占位消息:text + quickReplies + 19 个卡字段 + followUpMessages
  └─ catch → 占位消息换兜底文案
```

**关键认知:双层路由,skill 优先,LLM 是 fallback。**
- 第一层 `routeBySkills` 里,`classifySkillIntent`(LLM 分类器)是当前的主意图判断;确定性 pattern 仅剩极少量高频无歧义的(状态机在途 + 七夕/活动预约/打卡点/商品名)。
- 第二层 `chat` 是完整 function-call 对话,只有第一层全没命中才走。
- 因此存在**两套 LLM 路径**:分类器 `classifySkillIntent`(轻量,只选 skill)和 `chat`(完整 tool-call)。`store-recommend` 等复杂 skill 进了之后还会再调自己的 LLM(如 `parsePlanningIntent`,带 `conversationHistory` 做上下文意图解析 + 证据校验)做二次意图理解。

## 4. Skills 层

16 个注册 skill(`src/app/skills/index.ts`),每个是"被路由调用的能力单元"。所有 `match: () => true`(退化为占位,路由由 `classifySkillIntent`/`chat` 决定)。

| Skill | 职责 | 关键产出 |
|---|---|---|
| **store-recommend** | 统一"逛吃购"入口:餐饮/零售/活动推荐 + **行程规划**(本应用的复杂度核心) | RestaurantCard/BrandCard/PlanCard;规划由 `parsePlanningIntent`(LLM 解析意图)→ `deriveQuotas`→ `rewritePlanning`→ `validatePlanCard` |
| store-consult | 品牌咨询(位置/新品/送礼/联系SA),基于 `brand-catalog.md` 别名匹配 | BrandCard |
| appointment | 奢品专柜档期预约(创建/查档期/查状态),基于 `brand-slots.md` | AppointmentCard |
| activity-booking | 活动预约(乐高拼搭派对),场次/人数收集状态机 | ActivityBookingCard |
| membership | 入会全流程(授权→表单提取→偏好收集)+ 会员咨询 | MemberCard/AuthorizationCard |
| parking | 停车全场景(登记/状态/车位/预约收车牌/收费),基于 `membership-benefits.md` | ParkingCard/ReservationCard |
| queue | 餐厅排队托管取号/进度 | QueueCard |
| cross-sell | 排队等待时长 + 交叉营销(等位久推下午茶券) | CouponCard |
| coupon | 优惠券查询(品牌专属/商场通用) | CouponCard |
| service-qa | 商场服务咨询(服务台/退换货/红包用法),基于 `mall-knowledge.md`,LLM 选段+改写 | 纯文本 |
| check-in | 打卡活动(成功卡片/打卡点列表) | CheckInCard/CheckInSpotsCard |
| red-packet-usage | 红包"碰一下"使用说明 | RedPacketFlowCard |
| activity-intro | 七夕主题活动介绍卡 | ActivityIntroCard |
| product-recommend | 节日/送礼多商品推荐卡 | ProductIntroCard[] |
| product-intro | 具体商品单品介绍 | ProductIntroCard |
| weather | 天气查询(Open-Meteo,免密钥) | 纯文本 |

**Skill → Card 映射**:见 §7.2。一个 skill 可返回多种卡(如 appointment 返 AppointmentCard + 顺带 CouponCard)。

**行程规划是本应用的核心复杂点**(详见 §8):经多轮迭代从"写死亲子模板"演进为"`parsePlanningIntent` LLM 解析意图 → 时间预算推导配额 → 候选筛选 → 可执行日程 prompt → 代码层校验"。

## 5. LLM 层(`src/app/llm/`)

- **client.ts**:`chatCompletion(messages, tools, {onToken, signal})`,强制流式 SSE 解析,聚合 `tool_calls` delta,返回完整 `ChatCompletionResponse`。max_tokens=1024、temperature=0.7。
- **config.ts**:baseUrl `/api/llm/v1`、默认模型 `Ling-2.6-flash`(可 `VITE_LLM_MODEL` 覆盖)。
- **chat.ts**:`chat()` 是 fallback 路径的完整 function-call 循环。
  - 携带 `toolDefinitions`(10 工具),`MAX_TOOL_ROUNDS=5`。
  - **短路机制**:任一 tool 返回了任何卡片 → 直接用 tool 的 reply,不让 LLM 再改写(避免把卡片场景改写成"请核实")。
  - 收尾:抽取正文末尾的 `QUICK_REPLIES: [a] [b]` 标记,组装 AgentResponse。
- **system-prompt.ts**:角色=DTX 智能管家;极强约束"用户提到任何业务意图都必须调对应工具,绝不自己编造";动态注入用户状态(parking/queue/appointment/会员/入会进度)但标注"仅供参考,不替代工具";固定输出 `QUICK_REPLIES:` 行。
- **tools/**:
  - `definitions.ts`:10 个 tool,每个 1:1 对应一个 skill,参数统一 `text`(store-recommend 加 `cuisine`/`category`,weather 加 `city`)。
  - `executor.ts`:`executeTool` 按 `skill.name===toolName` 查 `skills` 数组,**完全复用 `skill.handle()`**,零重复逻辑;把 `args` 注入 `ctx.toolArgs`。

## 6. Data 层(`src/app/data/`)

| 文件 | 内容 | 格式 | 被谁用 |
|---|---|---|---|
| `activities.ts` | 20 条活动(带 categories/brands/items 标签) | TS | store-recommend |
| `activity-bookings.ts` | 可预约活动模板(乐高拼搭,周六日 slots+余位) | TS | activity-booking |
| `restaurants.ts` | 11 家餐厅 + 菜系大类(scenes/priceLevel/tags/highlight) | TS | store-recommend |
| `stores.ts` | 22 家零售/服务店(含奢品,audience/scenes/priceLevel)+ 关键词表 | TS | store-recommend |
| `user-profile.ts` | `SIMULATED_USER_PROFILE`(模拟画像,会员态默认 false) | TS | 全局 ctx.userProfile |
| `feature-entries.ts` / `initial-messages.ts` | 首页入口卡 / 初始欢迎消息 | TS | UI |
| `mall-knowledge.md` | 商场服务规则 + 餐厅总表 | md(`?raw`) | service-qa |
| `brand-catalog.md` | 品牌目录(楼层/品类/亮点/SA/权益)+ 给礼推荐 | md(`?raw`) | store-consult |
| `brand-slots.md` | 品牌预约档期规则 | md(`?raw`) | appointment |
| `membership-benefits.md` | 会员等级/停车权益 | md(`?raw`) | parking |

**知识库 md 检索方式**(不走向量/全文搜索):
- service-qa:`## ` 切段 → **LLM 选段** → 关键词打分兜底 → LLM 改写。
- store-consult / appointment:`?raw` 导入 → 正则解析成结构化条目 → `brandKeywords` 别名 includes 匹配。
- parking:按会员等级取对应行。
- 主推荐数据(stores/restaurants/activities)是 TS 结构化对象;md 在它们覆盖不到的角落(服务规则/品牌目录/档期/权益)做补充。

**UserProfile**(`types/index.ts:346`):name/gender、categories[]、brands[]、items[]、isMember/memberTier、preferenceNotes[]、入会流程态(`_justOnboarded`/`_enrollmentForm`/`_membershipAuthorizationPending`)。初始画像偏好美妆护肤/皮具/生鲜,Gucci/Hermès/Dior/Chanel。

## 7. UI 层

### 7.1 App.tsx(核心容器)
- 11 个 useState + 3 个 useRef。5 块业务态(parkingInfo/parkingReservation/queueInfo/appointmentInfo/activityBookingInfo)+ userProfile 由 sideEffects 反向填入。
- `currentPage` 字符串切页面(非路由库):`mall-home` 首屏 → `home` 聊天 → 各 Page。
- 排队进度有 `setInterval`(12s)自动推进,到 `almost`/`ready` 注入提醒消息。

### 7.2 卡片与 AgentResponse 1:1 映射(`components/chat/Bubble.tsx`)
Bubble 是单条消息统一渲染器:算 `hasRichCard`(扩宽容器)→ 文字气泡 → 按字段顺序逐条渲染卡片。

| AgentResponse 字段 | 卡片组件 |
|---|---|
| card | MemberCardBubble |
| membershipAuthorizationCard | MembershipAuthorizationCardBubble |
| newMemberOfferCard | NewMemberOfferCardBubble |
| parkingCard | ParkingCardBubble |
| parkingShoppingGuideCard | ParkingShoppingGuideCardBubble |
| activityIntroCard | ActivityIntroCardBubble |
| productIntroCard / productRecommendCards[] | ProductIntroCardBubble(复用) |
| planCard | PlanCardBubble |
| activityBookingCard | ActivityBookingCardBubble |
| reservationCard | ReservationCardBubble(内嵌伪二维码 SVG) |
| queueCard | QueueCardBubble(三态语义色) |
| brandCards[] | BrandCardCarousel |
| coupons[] | CouponCardBubble(与 checkInCard 互斥) |
| restaurantCards[] | RestaurantCardCarousel |
| appointmentCard | AppointmentCardBubble |
| checkInCard | CheckInCardBubble |
| checkInSpotsCard | CheckInSpotsCardBubble |
| redPacketFlowCard | RedPacketFlowCardBubble |
| followUpMessages[] | 追加成多条独立 agent Message |

基础件:`CatMascot`(猫 IP 头像,memo)、`FeatureIcon`(6 金色线性图标)、`components/ui/`(61 个 shadcn/Radix 原子件)。

### 7.3 Pages 层(`pages/`)
6 个页面,**基本都是截图承载壳**(渲染固定 img + 标题 + onBack):ParkingPage/CouponPage/DtxActivityPage/WarmServicePage/RentalPage/MembershipPage。`navigateTo` 中"领券/活动/会员中心"直接切页,其余 feature 走 `send(feature)` 进对话。

### 7.4 Utils(`utils/`)
- `preference.ts`:`categoryMap`(10 类)/`brandKeywords`(中英别名)/`itemKeywords`/`detectPreference`/`buildPreferenceSummary`。
- `parking.ts`:`parseParkingLocation`(多重正则 fallback 解析车位)。
- `queue.ts`:`QUEUE_VENUES`(17 店)/`parseQueueRequest`(区分取号 vs 查进度)。
- `salutation.ts`:`getUserSalutation`(×先生/×女士/您好)。
- `time.ts`:`formatTime`(消息时间戳)。

## 8. 行程规划子系统的演进与现状(核心复杂点)

`store-recommend` 的规划分支是本应用最复杂、迭代最多的部分。设计原则:**意图理解以 LLM 为主、正则做可靠性兜底,纯逻辑(配额/筛选/校验)留代码。**

```
store-recommend.handle(ctx)
  │  ctx 含 conversationHistory(近期对话,供解析上下文)
  │
  ├─ parsePlanningIntent(text, history)   ← 一次独立 LLM 调用,语义理解(主)
  │    带 history:recentPlanningMessages 取近期消息
  │    previousAssistantAskedForTime:上一轮管家在问时长 → 本轮只回时间也算规划(闭环反问)
  │    companionEvidence:要求 LLM 给同伴证据原文,hasVerifiedCompanionEvidence 代码校验
  │      (防 LLM 凭空编"带娃"等同伴信息)
  │    返回 { isPlanning, timeBudget{span,arrive,leave,noMeal},
  │           companions(+evidence), statedVisits[], needMeal, coreAsk }
  │
  ├─ inferTimeBudget(text)                ← 正则兜底(命名推断,补 LLM 漏掉的时长信号)
  │   resolvedBudget = parsed.span ?? inferred.span(两者取并)
  │
  ├─ shouldPlan = parsed.isPlanning || isPlanningIntent(text)   ← 正则二次兜底
  │
  ├─若 shouldPlan:
  │   ├─ buildItinerary(结构化预约) + statedVisits(matchCatalogName 补楼层) → 行程锚点
  │   ├─ resolvedBudget.span == null → askTimeBudget(反问待多久,用户硬性前置)
  │   ├─ deriveQuotas(budget)          ← 纯逻辑:正餐数/茶歇/逛购段/段总数/品类上限
  │   │    fullday→2餐 / halfday→1餐 / evening→1餐 / noMeal→0餐(不写死,由时长推导)
  │   ├─ buildPlanningCandidates(profile, itinerary, companions)
  │   │    rankStores(画像+人群打分) + applyDiversityCap(每品类≤2) + 已锁定项兜底
  │   ├─ rewritePlanning(...)          ← 配额驱动 prompt,产出"可执行日程"(带具体时段)
  │   │    buildTimeSkeleton(时段骨架) + 餐间隔≥3h + 正餐后不接茶歇
  │   └─ validatePlanCard(...)         ← 纯逻辑校验:超餐/堆砌/品类集中/时段空洞/人群不符
  │        不通过 → 带原因重生成(≤2 次)→ 回退纯文本
  │
  └─若 !shouldPlan:走单点餐饮/零售/活动推荐(classifyRecommendIntent 分流 → handleDining/handleRetail)
```

**关键约束(对照历史问题)**:
- 正餐数等全部由时长推导,不写死(历史:"一日最多1正餐"写死被纠正)。
- 意图理解以 `parsePlanningIntent`(LLM)为主,`inferTimeBudget`/`isPlanningIntent` 正则做兜底,两者取并集(历史:纯正则漏判导致路由错,改为 LLM 主 + 正则保底)。
- 同伴信息要求 LLM 提供原话证据,代码 `hasVerifiedCompanionEvidence` 校验,防编造(历史:LLM 凭空加"带娃")。
- 反问闭环:上一轮问时长、本轮只回时间,`previousAssistantAskedForTime` 让其仍判为规划。
- 规划给"可执行日程"而非候选堆砌(历史:LLM 把候选全塞进卡)。
- 候选筛选层做人群适配 + 品类多样性裁剪(历史:一天都是美妆、人群没体现)。
- 代码层 `validatePlanCard` 兜 LLM 不确定性(历史:连吃/时段矛盾)。

**注**:`classifyRecommendIntent`/`isStoreRecommendIntent` 等正则仍保留,服务于①非规划时的单点餐饮/零售分流,②路由层 `routeBySkills` 的兜底。规划意图本身以 `parsePlanningIntent` 为主。

## 9. 类型系统

- `src/app/types/index.ts`:领域类型(Message、UserProfile、EnrollmentForm、全部 Card 接口共 19 + 基础)。
- `src/app/agent/types.ts`:路由层类型(SkillContext、Skill、AgentResponse、AgentSideEffects、AgentFollowUpMessage)。
- AgentResponse 与 Message 的卡字段同名透传,扁平穷举(无多态分发)。

## 10. 已知技术债 / 注意点

- **无 tsconfig**:根目录无 `tsconfig.json`,CI/IDE 类型检查需自建;`vite build` 不做类型校验(esbuild 转译)。存在一处预存类型错(`agent/index.ts:46` ChatMessage 联合类型)。
- **两套 LLM 路由**:`classifySkillIntent`(分类器)与 `chat`(function-call)并存,职责有重叠,新意图易在两层间漂移。
- **`dist/` 入库**:构建产物在仓库里(根目录可见)。
- **模拟数据**:`SIMULATED_USER_PROFILE` 固定画像;多 skill 有 demo 兜底数据(如 queue 的 DEMO_QUEUE_INFO)。
- **截图壳页面**:WarmServicePage/RentalPage 无入口,实际不可达(仅 currentPage 状态保留)。
```