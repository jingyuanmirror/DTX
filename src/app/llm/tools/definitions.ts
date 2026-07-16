import type { ToolDefinition } from "../types";

/**
 * tools — 1:1 对应每个 skill。
 * LLM 根据用户意图选择调用哪个 tool，tool 的参数直接传给 skill.handle()。
 */
export const toolDefinitions: ToolDefinition[] = [
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
        "处理排队相关事务。当用户请求排队取号（如'帮我排新荣记3人位'、'帮我排Chanel'）或查询排队进度时调用。如果用户指定了店铺则排队取号，否则查询已有排队状态。",
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
      name: "activity-recommend",
      description:
        "根据用户画像（品牌/品类/商品偏好）个性化推荐商场活动。仅当用户询问**商场内**活动、pop-up、展览、鉴赏会、联名活动等（如'今天有什么活动'、'推荐活动'）时调用。注意：'北京有什么好玩的'、'推荐景点'、'周末去哪玩'等城市级去处不属于商场活动，不要调用此工具，由模型直接自然回复即可。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于活动推荐的原始表述，如'今天有什么活动'或'推荐活动'",
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
      name: "restaurant-recommend",
      description:
        "餐饮/餐厅推荐专属。当用户问美食推荐、想吃什么、今天吃什么、求推荐餐厅（如'有什么美食推荐'、'今天吃什么'、'推荐个餐厅'、'有什么好吃的'）时调用。若用户已说出想吃的菜系/口味（中餐、粤菜、火锅、西餐、日料、小吃快餐、茶饮咖啡），填入 cuisine 参数；用户说'随便''都行'也调用（cuisine 填'随便'）；用户未表达口味时 cuisine 留空，skill 会先引导用户说出类型。\n重要：纯查询餐厅楼层位置、服务台、退换货、营业时间等非「推荐」场景，走 service-qa，不要用此工具。",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "用户关于美食推荐的原话，如'有什么美食推荐'或'想吃火锅'",
          },
          cuisine: {
            type: "string",
            description: "用户表达的菜系/口味，可选值：中餐、粤菜、火锅、西餐、日料、小吃快餐、茶饮咖啡、随便。用户未明确说出口味时留空。",
          },
        },
        required: ["text"],
      },
    },
  },
];
