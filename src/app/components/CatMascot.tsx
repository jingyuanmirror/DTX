import { memo } from "react";

type CatMascotProps = {
  /** 是否带柔和米白背景圆(用作小头像时建议开启,大图场景关闭) */
  withBackground?: boolean;
  /** 仅显示头部(用于小头像,裁掉身体) */
  headOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * 智能体 IP 形象:毛绒萌猫(智能管家)。
 * 使用抠图后的透明 PNG,静态、与背景融合。
 */
function CatMascotBase({ withBackground = false, headOnly = false, className, style }: CatMascotProps) {
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", ...style }}>
      {withBackground && (
        <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg, #FFF7EC 0%, #FCEDD8 100%)" }} />
      )}
      <img
        src={headOnly ? "/cat-head.png" : "/cat-transparent.png"}
        alt="DTX 管家"
        className="relative w-full h-full"
        style={{ objectFit: "contain", objectPosition: "center" }}
        draggable={false}
      />
    </div>
  );
}

export const CatMascot = memo(CatMascotBase);