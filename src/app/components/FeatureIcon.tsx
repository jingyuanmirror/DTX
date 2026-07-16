import { memo } from "react";

/**
 * 专属线性图标(1.2 细描边、24px viewBox),用于首页 Feature 入口。
 * 高精细度单色线条:双层结构 + 点缀细节,脱离通用素材感,贴合轻奢调性。
 */
type FeatureIconName =
  | "guide"
  | "member"
  | "activity"
  | "coupon"
  | "checkin"
  | "invite";

const PATHS: Record<FeatureIconName, React.ReactNode> = {
  // 品牌导览:罗盘(双圈 + 指针 + 刻度)
  guide: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" opacity="0.5" />
      <path d="M14.2 9.8 12 12l-2.2 2.2L12 12z" fill="url(#dtxGoldStroke)" stroke="none" />
      <path d="M12 3.2v1.4M12 19.4v1.4M3.2 12h1.4M19.4 12h1.4" />
    </>
  ),
  // 会员中心:金卡(卡身 + 芯片 + 等级条)
  member: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M3 10h18" />
      <rect x="5.5" y="12.2" width="3.2" height="2.4" rx="0.4" />
      <path d="M11 14.5h3" opacity="0.6" />
      <path d="M16 14.5h3" opacity="0.6" />
    </>
  ),
  // 活动中心:星爆(中心点 + 放射线 + 细节点)
  activity: (
    <>
      <circle cx="12" cy="12" r="1.4" fill="url(#dtxGoldStroke)" stroke="none" />
      <path d="M12 4v3.2M12 16.8V20M4 12h3.2M16.8 12H20" />
      <path d="M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M17.7 6.3l-2.1 2.1M8.4 15.6l-2.1 2.1" opacity="0.55" />
    </>
  ),
  // 领券中心:票券(双齿 + 虚线撕口 + 面额点)
  coupon: (
    <>
      <path d="M4 7.5h16v3a1.8 1.8 0 0 0 0 3.6v3H4v-3a1.8 1.8 0 0 0 0-3.6z" />
      <path d="M14 7.5v9.6" strokeDasharray="1.6 1.8" />
      <circle cx="9" cy="12" r="1" fill="url(#dtxGoldStroke)" stroke="none" opacity="0.7" />
    </>
  ),
  // 签到有礼:印章(双圈 + 对勾 + 弧线)
  checkin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 5.5v1.3" opacity="0.6" />
      <path d="M8.2 12.4l2.6 2.6 5.2-5.4" />
      <path d="M7.5 16.5a5 5 0 0 0 9 0" opacity="0.5" />
    </>
  ),
  // 邀请有礼:双卡叠加 + 加号
  invite: (
    <>
      <rect x="4" y="8" width="11" height="11" rx="2" opacity="0.45" />
      <rect x="9" y="5" width="11" height="11" rx="2" />
      <path d="M14.5 9.5v3M13 11h3" />
    </>
  ),
};

function FeatureIconBase({
  name,
  className,
  style,
  width = 17,
  height = 17,
}: {
  name: FeatureIconName;
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="url(#dtxGoldStroke)"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      width={width}
      height={height}
    >
      <defs>
        <linearGradient id="dtxGoldStroke" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E6C485" />
          <stop offset="0.5" stopColor="#B8893A" />
          <stop offset="1" stopColor="#8A6322" />
        </linearGradient>
      </defs>
      {/* fill 类点缀也跟随金属渐变 */}
      <g>{PATHS[name]}</g>
    </svg>
  );
}

export const FeatureIcon = memo(FeatureIconBase);
export type { FeatureIconName };