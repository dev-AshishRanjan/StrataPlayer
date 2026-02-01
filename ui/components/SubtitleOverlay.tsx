import React from "react";
import { SubtitleSettings } from "../../core/StrataCore";

export const SubtitleOverlay = ({
  cues,
  settings,
}: {
  cues: string[];
  settings: SubtitleSettings;
}) => {
  if (settings.useNative || cues.length === 0) return null;

  const getTextShadow = () => {
    switch (settings.textStyle) {
      case "outline":
        return "0px 0px 4px black, 0px 0px 4px black"; // Simplified stroke
      case "raised":
        return "0 -1px 1px black, 0 -2px 2px black"; // Pseudo 3D raised
      case "depressed":
        return "0 1px 1px white, 0 2px 2px black"; // Pseudo 3D depressed
      case "shadow":
        return "2px 2px 2px rgba(0,0,0,0.8)";
      default:
        return "none";
    }
  };

  return (
    <div
      className="absolute inset-x-0 flex flex-col items-center justify-end text-center z-10 pointer-events-none transition-all duration-200 strata-subtitle-overlay"
      style={{
        bottom: `${settings.verticalOffset}px`,
      }}
    >
      {cues.map((text, i) => (
        <div
          key={i}
          className="mb-1 inline-block max-w-[80%]"
          style={{
            fontSize: `${settings.textSize}%`,
            color: settings.textColor,
            fontWeight: settings.isBold ? "bold" : "normal",
            textTransform: settings.fixCapitalization ? "capitalize" : "none",
            textShadow: getTextShadow(),
            lineHeight: 1.4,
            whiteSpace: "pre-line",
          }}
        >
          <span
            className="px-2 py-0.5 rounded"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${settings.backgroundOpacity / 100})`,
              backdropFilter: settings.backgroundBlur
                ? `blur(${settings.backgroundBlurAmount}px)`
                : "none",
            }}
            dangerouslySetInnerHTML={{ __html: text }} // VTT supports some HTML-like tags
          />
        </div>
      ))}
    </div>
  );
};
