import { memo } from "react";

type CatMascotProps = {
  /** 是否带柔和米白背景圆(用作小头像时建议开启,大图场景关闭) */
  withBackground?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * 智能体 IP 形象:可爱卡通橘猫(智能管家)。
 * 矢量自包含,尾巴会摆动,适配米白+金的轻奢设计风格。
 */
function CatMascotBase({ withBackground = false, className, style }: CatMascotProps) {
  return (
    <div className={className} style={{ position: "relative", ...style }}>
      {withBackground && (
        <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg, #FFF7EC 0%, #FCEDD8 100%)" }} />
      )}
      <svg
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative w-full h-full"
      >
        <style>{`
          @keyframes catFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-4px); }
          }
          @keyframes tailWag {
            0%, 100% { transform-origin: 60px 60px; transform: rotate(0deg); }
            25% { transform-origin: 60px 60px; transform: rotate(12deg); }
            75% { transform-origin: 60px 60px; transform: rotate(-8deg); }
          }
          @keyframes earTwitch {
            0%, 85%, 100% { transform: rotate(0deg); }
            90% { transform-origin: 22px 18px; transform: rotate(-6deg); }
            95% { transform-origin: 22px 18px; transform: rotate(3deg); }
          }
          @keyframes blink {
            0%, 90%, 100% { transform: scaleY(1); }
            95% { transform: scaleY(0.1); }
          }
        `}</style>
        {/* Body */}
        <ellipse cx="40" cy="56" rx="22" ry="18" fill="#ffb347" />
        {/* Head */}
        <circle cx="40" cy="34" r="20" fill="#ffb347" />
        {/* Left ear */}
        <polygon points="22,18 16,4 30,14" fill="#ffb347" style={{ animation: "earTwitch 4s ease-in-out infinite" }} />
        <polygon points="23,17 18,7 29,15" fill="#ffcba4" style={{ animation: "earTwitch 4s ease-in-out infinite" }} />
        {/* Right ear */}
        <polygon points="58,18 64,4 50,14" fill="#ffb347" />
        <polygon points="57,17 62,7 51,15" fill="#ffcba4" />
        {/* Face: muzzle */}
        <ellipse cx="40" cy="38" rx="10" ry="7" fill="#ffcba4" />
        {/* Eyes */}
        <ellipse cx="32" cy="31" rx="4" ry="4.5" fill="white" />
        <ellipse cx="48" cy="31" rx="4" ry="4.5" fill="white" />
        <circle cx="33" cy="32" r="2.5" fill="#3d2c2c" />
        <circle cx="49" cy="32" r="2.5" fill="#3d2c2c" />
        <circle cx="33.8" cy="31.2" r="0.8" fill="white" />
        <circle cx="49.8" cy="31.2" r="0.8" fill="white" />
        {/* Nose */}
        <ellipse cx="40" cy="36.5" rx="2" ry="1.3" fill="#ff7f9e" />
        {/* Mouth */}
        <path d="M37 38.5 Q40 41 43 38.5" stroke="#3d2c2c" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* Whiskers left */}
        <line x1="20" y1="36" x2="33" y2="37.5" stroke="#3d2c2c" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="20" y1="39" x2="33" y2="38.5" stroke="#3d2c2c" strokeWidth="0.8" strokeLinecap="round" />
        {/* Whiskers right */}
        <line x1="60" y1="36" x2="47" y2="37.5" stroke="#3d2c2c" strokeWidth="0.8" strokeLinecap="round" />
        <line x1="60" y1="39" x2="47" y2="38.5" stroke="#3d2c2c" strokeWidth="0.8" strokeLinecap="round" />
        {/* Blush */}
        <ellipse cx="27" cy="37" rx="4" ry="2.5" fill="#ffb3c1" opacity="0.6" />
        <ellipse cx="53" cy="37" rx="4" ry="2.5" fill="#ffb3c1" opacity="0.6" />
        {/* Paws */}
        <ellipse cx="26" cy="66" rx="8" ry="6" fill="#ffb347" />
        <ellipse cx="54" cy="66" rx="8" ry="6" fill="#ffb347" />
        {/* Paw toes */}
        <ellipse cx="22" cy="69" rx="2.5" ry="1.8" fill="#ffcba4" />
        <ellipse cx="26" cy="70.5" rx="2.5" ry="1.8" fill="#ffcba4" />
        <ellipse cx="30" cy="69" rx="2.5" ry="1.8" fill="#ffcba4" />
        <ellipse cx="50" cy="69" rx="2.5" ry="1.8" fill="#ffcba4" />
        <ellipse cx="54" cy="70.5" rx="2.5" ry="1.8" fill="#ffcba4" />
        <ellipse cx="58" cy="69" rx="2.5" ry="1.8" fill="#ffcba4" />
        {/* Tail */}
        <path
          d="M62 58 Q78 48 74 62 Q70 72 60 68"
          stroke="#ffb347"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          style={{ animation: "tailWag 1.6s ease-in-out infinite" }}
        />
        {/* Belly stripe */}
        <ellipse cx="40" cy="54" rx="10" ry="10" fill="#ffcba4" opacity="0.5" />
        {/* Tiny bow */}
        <path d="M35 22 Q40 18 45 22 Q40 26 35 22Z" fill="#ff7f9e" />
        <circle cx="40" cy="22" r="2" fill="#ff4d79" />
      </svg>
    </div>
  );
}

export const CatMascot = memo(CatMascotBase);
