import type { ToolDefinition } from "../types";

/**
 * tools — 1:1 对应每个 skill。
 * LLM 根据用户意图选择调用哪个 tool，tool 的参数直接传给 skill.handle()。
 */
export const toolDefinitions: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "activity-booking",
      description:
        "处理商场活动预约。包括：1) 查询活动可预约场次和剩余名额；2) 说明预约/报名方法；3) 代用户选择场次、收集人数并确认预约；4) 查询已确认的活动预约。乐高体验店周末创意拼搭派对属于此工具，不属于品牌appointment。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于活动预约的原始表述，如'乐高怎么预约'、'查看乐高场次'、'帮我预约乐高'或'1大1小'",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "appointment",
      description:
        "处理品牌专柜预约。包括：1) 预约创建（如'帮我预约Chanel'、'帮我约下午2点的Hermès'）；2) 档期查询（如'周末LV有档期吗'）；3) 预约状态查询（如'我的预约几点'）；4) 用户在选档期流程中选择了时段（如'14:00'）。重要：'预约'/'约档期'关键词路由到此skill，'排队'/'排号'路由到queue。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于品牌预约的原始表述，如'帮我预约Chanel'或'周末LV有档期吗'",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "parking",
      description:
        "处理停车相关事务。包括：1) 记录停车位置（如'我停在B2-D05'）；2) 查询停车状态/时长/费用；3) 查询车位可用情况（如'有没有空位'、'车位情况'）；4) 预约车位（如'预约车位'、'预留车位'）；5) 预约流程中提供车牌号。如果用户正在预约流程中提供车牌号，也必须调用此工具。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于停车的原始表述，如'我停在B2-D05'或'停车费多少'",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "queue",
      description:
        "处理排队相关事务。当用户请求排队、等位或取号（如'帮我排新荣记3人位'、'帮我新荣记等位'、'帮我排Chanel'）或查询排队进度时调用。如果用户指定了店铺则排队取号，否则查询已有排队状态。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于排队的原始表述，如'帮我排新荣记2人位'或'排队排到哪了'",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cross_sell",
      description:
        "查询品牌专柜排队等待时间并交叉推荐。当用户询问某个品牌排队要等多久、是否拥挤、人多不多时调用，如'Chanel排队多久'、'香奈儿排队长吗'、'香奈儿人多嘛'、'人多吗'、'拥挤吗'。返回等待时长，较长时会附带推荐优惠券。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于品牌排队的原始表述，如'Chanel排队多久'或'香奈儿人多嘛'",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "coupon",
      description:
        "处理优惠券相关事务。当用户询问优惠、折扣、领券时调用。如果用户指定了品牌则返回品牌专属券，否则返回商场通用券。如'有券吗'、'Chanel有优惠吗'。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于优惠的原始表述，如'有没有券'或'Chanel有券吗'",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "membership",
      description:
        "处理会员相关事务。包括：1) 用户表达入会意愿（如'我想入会'）；2) 用户确认个人信息授权并入会；3) 询问会员信息；4) 查询会员权益；5) 入会后的偏好收集。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于会员的原始表述，如'我想入会'或'美妆护肤'",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "store-consult",
      description:
        "处理品牌/好物在线咨询。包括：1) 品牌信息查询（楼层位置、品类、风格）；2) 当季新品/到货咨询；3) 生鲜好物推荐；4) 礼品推荐与品牌推荐（如520送点什么）；5) 联系SA导购。当用户询问品牌信息、新品、好物、送礼推荐、品牌位置等来店前咨询场景时调用。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于品牌咨询的原始表述，如'Chanel有什么新款包'或'推荐送礼品牌'",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "weather",
      description:
        "查询城市天气。当用户询问某地天气（如'上海天气怎样'、'北京今天热吗'、'明天会下雨吗'、'出门需要带伞吗'）时调用。城市名尽量从用户原话中提取，填入 city 参数；用户未指定城市时 city 留空（默认商场所在地）。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于天气的原始表述，如'上海天气怎样'或'明天会下雨吗'",
          },
          city: {
            type: "string",
            description: "要查询天气的城市名（中文），如'上海'、'北京'、'杭州'。用户未指定时留空。",
          },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "store-recommend",
      description:
        "综合推荐入口：店铺/餐饮/活动/行程规划统一收口。当用户问美食推荐、想吃什么、今天吃什么、求推荐餐厅、亲子餐厅，或想逛店、想买某类好物（包/表/生鲜/美妆/亲子/家居/数码/运动）、带娃去哪逛、店铺推荐，或问有什么活动/展览/pop-up/市集，或要规划行程（吃饭前后怎么安排、今天怎么规划、帮我规划路线、逛一圈）时调用。按需求分流：餐饮走餐厅卡、零售走品牌卡、规划与「问活动」综合呈现店铺+活动；亲子用餐会分析亲子适配度、优惠与等位时长。活动推荐会结合用户画像偏好匹配，与店铺一起综合给。若用户说了想吃的菜系/口味（中餐、粤菜、火锅、西餐、日料、小吃快餐、茶饮咖啡）填 cuisine 参数，说了想逛的品类（生鲜超市、美妆个护、亲子娱乐、家居生活、时尚奢品、数码电器、运动服饰、影院娱乐）填 category 参数；用户说「随便」「都行」也调用；两者都未明确则留空。\n重要边界：查具体品牌位置/当季新品/联系SA走 store-consult，不要用此工具；挑具体商品（如七夕买什么、送什么商品）走 product-recommend；「北京有什么好玩的/推荐景点」等城市级去处不属于商场,直接自然回复不调本工具；纯查询服务台/退换货/营业时间走 service-qa；「七夕打卡活动」等活动主题介绍走 activity-intro。本工具负责「综合推荐店铺/餐厅/活动 + 行程规划」。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于推荐的原话，如'今天吃什么'、'想吃火锅'、'想买包推荐下'、'周末带娃去哪逛'、'今天有什么活动'、'帮我规划下路线'",
          },
          cuisine: {
            type: "string",
            description: "用户表达的菜系/口味，可选值：中餐、粤菜、火锅、西餐、日料、小吃快餐、茶饮咖啡、随便。仅餐饮相关时填，未明确说出口味时留空。",
          },
          category: {
            type: "string",
            description: "用户想逛的零售品类，可选值：生鲜超市、美妆个护、亲子娱乐、家居生活、时尚奢品、数码电器、运动服饰、影院娱乐。仅零售/店铺相关时填，用户未明确方向时留空。",
          },
        },
        required: ["text"],
      },
    },
  },
];
