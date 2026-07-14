import { memo } from "react";

/**
 * 统一线性图标(1.5 描边、24px viewBox),用于首页 Feature 入口。
 * 与 DTX 轻奢编辑感对齐:线条一致、克制留白。
 */
type FeatureIconName =
  | "guide"
  | "member"
  | "activity"
  | "coupon"
  | "checkin"
  | "invite";

const PATHS: Record<FeatureIconName, React.ReactNode> = {
  // 品牌导览:指南针/定位
  guide: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" />
    </>
  ),
  // 会员中心:会员卡
  member: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M7 14.5h4" />
    </>
  ),
  // 活动中心:礼花/星
  activity: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 12l5-5M12 12l-5 5M12 12l5 5M12 12l-5-5" />
    </>
  ),
  // 领券中心:票券
  coupon: (
    <>
      <path d="M4 7h16v4a2 2 0 0 0 0 4v2H4v-2a2 2 0 0 0 0-4V7z" />
      <path d="M14 7v12" strokeDasharray="2 2" />
    </>
  ),
  // 签到有礼:对勾环
  checkin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  // 邀请有礼:双人
  invite: (
    <>
      <circle cx="9" cy="10" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 7.2a3 3 0 0 1 0 5.6M14.5 19a5.5 5.5 0 0 1 4 2" />
    </>
  ),
};

function FeatureIconBase({
  name,
  className,
  style,
  width = 22,
  height = 22,
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
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      width={width}
      height={height}
    >
      {PATHS[name]}
    </svg>
  );
}

export const FeatureIcon = memo(FeatureIconBase);
export type { FeatureIconName };