import React from "react";

interface MindWellLogoProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
  showSlogan?: boolean;
  className?: string;
  style?: React.CSSProperties;
  variant?: "default" | "elevated";
}

export function MindWellLogo({
  size = "medium",
  showText = true,
  showSlogan = false,
  className = "",
  style = {},
  variant = "default"
}: MindWellLogoProps) {
  // Determine o tamanho com base na propriedade size
  let logoSize = 126;
  let fontSize = 20;
  let sloganSize = 12;
  
  if (size === "small") {
    logoSize = 99;
    fontSize = 16;
    sloganSize = 10;
  } else if (size === "large") {
    logoSize = 171;
    fontSize = 28;
    sloganSize = 14;
  }

  return (
    <div 
      className={`flex flex-col items-center ${className}`} 
      style={style}
    >
      {variant === "elevated" ? (
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl transform scale-75"></div>
          <div className="relative bg-white p-0 rounded-full shadow-lg overflow-hidden flex items-center justify-center" style={{ width: logoSize, height: logoSize }}>
            <img 
              src="/images/mindwell_icon_hd.png" 
              alt="MindWell Logo" 
              width={logoSize * 1.1} 
              height={logoSize * 1.1}
              className="object-contain scale-125"
            />
          </div>
        </div>
      ) : (
        <div className="rounded-full overflow-hidden flex items-center justify-center" style={{ width: logoSize, height: logoSize }}>
          <img 
            src="/images/mindwell_icon_hd.png"
            alt="MindWell Logo" 
            width={logoSize * 1.1}
            height={logoSize * 1.1}
            className="object-contain scale-125"
          />
        </div>
      )}
      
      {showText && (
        <div className="flex items-center mt-2">
          <span 
            style={{ 
              color: "var(--mindwell-primary, #6C8EFF)", 
              fontSize, 
              fontWeight: 600,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              letterSpacing: "-0.01em"
            }} 
            className="mr-1"
          >
            Mind
          </span>
          <span
            style={{ 
              color: "var(--mindwell-text, #2F2F2F)", 
              fontSize, 
              fontWeight: 600,
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              letterSpacing: "-0.01em"
            }}
          >
            Well
          </span>
        </div>
      )}
      
      {showSlogan && (
        <p 
          style={{ 
            color: "var(--mindwell-textLight, #666666)", 
            fontSize: sloganSize,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
          }}
          className="mt-1"
        >
          Cuide da mente. Viva melhor.
        </p>
      )}
    </div>
  );
}