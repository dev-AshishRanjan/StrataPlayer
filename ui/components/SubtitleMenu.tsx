import React, { useState, useRef, useMemo } from "react";
import { SubtitleSettings, SubtitleTrackState } from "../../core/StrataCore";
import { Menu, MenuItem, MenuHeader } from "./Menu";
import { SettingsGroup, Toggle, Slider, Select } from "./SettingsPrimitives";
import {
  UploadIcon,
  CustomizeIcon,
  ResetIcon,
  ClockIcon,
  MinusIcon,
  PlusIcon,
  MoveVerticalIcon,
  TypeIcon,
  PaletteIcon,
  BoldIcon,
  CaseUpperIcon,
  EyeIcon,
  BlurIcon,
  SearchIcon,
  LoaderIcon,
  FileCheckIcon,
  FileWarningIcon,
} from "../Icons";

export const SubtitleMenu = ({
  tracks,
  current,
  onSelect,
  onUpload,
  onClose,
  settings,
  onSettingsChange,
  onReset,
  offset,
  onOffsetChange,
  maxHeight,
  animationClass,
}: {
  tracks: SubtitleTrackState[];
  current: number;
  onSelect: (index: number) => void;
  onUpload: (file: File) => void;
  onClose: () => void;
  settings: SubtitleSettings;
  onSettingsChange: (settings: Partial<SubtitleSettings>) => void;
  onReset: () => void;
  offset: number;
  onOffsetChange: (val: number) => void;
  maxHeight: number;
  animationClass: string;
}) => {
  const [view, setView] = useState<"main" | "customize">("main");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTracks = useMemo(() => {
    if (!search) return tracks;
    return tracks.filter(
      (t) =>
        t.label.toLowerCase().includes(search.toLowerCase()) ||
        (t.srcLang && t.srcLang.toLowerCase().includes(search.toLowerCase())),
    );
  }, [tracks, search]);

  return (
    <Menu
      onClose={onClose}
      align="right"
      maxHeight={maxHeight}
      className={animationClass}
    >
      {view === "main" && (
        <div className="animate-in slide-in-from-left-4 fade-in duration-200 flex flex-col h-full">
          <div
            className="px-3 py-2 mb-1 border-b border-white/5 font-bold text-zinc-400 uppercase text-[11px] tracking-wider flex justify-between items-center bg-white/5 sticky top-0 z-10 backdrop-blur-md shrink-0"
            style={{ borderRadius: "var(--radius)" }}
          >
            <span>Subtitles</span>
          </div>

          <div className="px-1.5 pb-2 shrink-0">
            <MenuItem
              label="Upload Subtitle"
              icon={<UploadIcon className="w-4 h-4" />}
              onClick={() => fileInputRef.current?.click()}
            />
            <input
              type="file"
              accept=".vtt,.srt"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onUpload(e.target.files[0]);
              }}
            />
            <MenuItem
              label="Customize"
              icon={<CustomizeIcon className="w-4 h-4" />}
              onClick={() => setView("customize")}
              hasSubmenu
            />
            <div className="h-px bg-white/5 mx-2 my-1"></div>
            <MenuItem
              label="Off"
              active={current === -1}
              onClick={() => {
                onSelect(-1);
                onClose();
              }}
            />

            <div className="relative mt-2">
              <input
                type="text"
                placeholder="Search subtitles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-800/50 border border-white/10 rounded-md py-1.5 pl-8 pr-3 text-xs text-zinc-200 focus:outline-none focus:border-white/20 transition-colors"
              />
              <SearchIcon className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="overflow-y-auto hide-scrollbar flex-1">
            {filteredTracks.map((track) => {
              let rightIcon = null;
              if (track.status === "loading") {
                rightIcon = (
                  <LoaderIcon className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                );
              } else if (track.status === "error") {
                rightIcon = (
                  <FileWarningIcon className="w-3.5 h-3.5 text-red-500" />
                );
              } else if (track.status === "success") {
                rightIcon = (
                  <FileCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                );
              }

              return (
                <MenuItem
                  key={track.index}
                  label={track.label}
                  value={track.srcLang}
                  active={current === track.index}
                  rightIcon={rightIcon}
                  onClick={() => {
                    onSelect(track.index);
                    onClose();
                  }}
                />
              );
            })}
            {filteredTracks.length === 0 && search && (
              <div className="px-4 py-3 text-center text-xs text-zinc-500">
                No results found
              </div>
            )}
          </div>
        </div>
      )}

      {view === "customize" && (
        <div className="animate-in slide-in-from-right-4 fade-in duration-200">
          <MenuHeader
            label="Customize"
            onBack={() => setView("main")}
            rightAction={
              <button
                onClick={onReset}
                className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-md hover:bg-white/10"
                title="Reset All"
              >
                <ResetIcon className="w-4 h-4" />
              </button>
            }
          />

          <div className="pb-1">
            <SettingsGroup>
              <Toggle
                label="Native Video Subtitle"
                checked={settings.useNative}
                onChange={(val: boolean) =>
                  onSettingsChange({ useNative: val })
                }
              />
            </SettingsGroup>

            {!settings.useNative && (
              <>
                <SettingsGroup title="Sync & Position">
                  <div className="py-2.5 px-3 rounded-lg hover:bg-white/5 group transition-colors">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                        <ClockIcon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
                          Sync Offset
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onOffsetChange(Math.round((offset - 0.1) * 10) / 10)
                        }
                        className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-300 transition-colors active:scale-95"
                      >
                        <MinusIcon className="w-4 h-4" />
                      </button>
                      <div className="flex-1 bg-zinc-900 border border-white/5 rounded-lg h-8 flex items-center justify-center text-xs font-mono font-medium text-[var(--accent)]">
                        {offset > 0 ? "+" : ""}
                        {offset?.toFixed(1) || "0.0"}s
                      </div>
                      <button
                        onClick={() =>
                          onOffsetChange(Math.round((offset + 0.1) * 10) / 10)
                        }
                        className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 text-zinc-300 transition-colors active:scale-95"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Slider
                    label="Vertical Position"
                    icon={<MoveVerticalIcon className="w-4 h-4" />}
                    value={settings.verticalOffset}
                    min={0}
                    max={200}
                    step={5}
                    onChange={(val: number) =>
                      onSettingsChange({ verticalOffset: val })
                    }
                    formatValue={(v: number) => `${v}px`}
                  />
                </SettingsGroup>

                <SettingsGroup title="Appearance">
                  <Slider
                    label="Text Size"
                    icon={<TypeIcon className="w-4 h-4" />}
                    value={settings.textSize}
                    min={50}
                    max={200}
                    step={10}
                    onChange={(val: number) =>
                      onSettingsChange({ textSize: val })
                    }
                    formatValue={(v: number) => `${v}%`}
                  />

                  <div className="py-2.5 px-3 rounded-lg hover:bg-white/5 group transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <PaletteIcon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-400 transition-colors" />
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider group-hover:text-zinc-300 transition-colors">
                        Text Color
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-1 bg-zinc-800/50 rounded-lg">
                      {[
                        "#ffffff",
                        "#ffff00",
                        "#00ffff",
                        "#ff00ff",
                        "#ff0000",
                        "#00ff00",
                      ].map((c) => (
                        <button
                          key={c}
                          onClick={() => onSettingsChange({ textColor: c })}
                          className={`w-6 h-6 rounded-full border border-white/10 transition-transform hover:scale-110 ${settings.textColor === c ? "ring-2 scale-110" : ""}`}
                          style={
                            {
                              backgroundColor: c,
                              "--tw-ring-color": "var(--accent)",
                            } as any
                          }
                        />
                      ))}
                      <div className="w-px h-6 bg-white/10 mx-1"></div>
                      <div className="relative w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/20 cursor-pointer">
                        <input
                          type="color"
                          value={settings.textColor}
                          onChange={(e) =>
                            onSettingsChange({ textColor: e.target.value })
                          }
                          className="absolute inset-[-4px] w-[150%] h-[150%] cursor-pointer p-0 border-0"
                        />
                      </div>
                    </div>
                  </div>

                  <Select
                    label="Text Style"
                    value={settings.textStyle}
                    options={[
                      { label: "None", value: "none" },
                      { label: "Outline", value: "outline" },
                      { label: "Raised", value: "raised" },
                      { label: "Depressed", value: "depressed" },
                      { label: "Drop Shadow", value: "shadow" },
                    ]}
                    onChange={(val: string) =>
                      onSettingsChange({
                        textStyle: val as SubtitleSettings["textStyle"],
                      })
                    }
                  />

                  <div className="grid grid-cols-2 gap-2 mt-1 px-1">
                    <Toggle
                      label="Bold"
                      icon={<BoldIcon className="w-4 h-4" />}
                      checked={settings.isBold}
                      onChange={(v: boolean) => onSettingsChange({ isBold: v })}
                    />
                    <Toggle
                      label="Fix Caps"
                      icon={<CaseUpperIcon className="w-4 h-4" />}
                      checked={settings.fixCapitalization}
                      onChange={(v: boolean) =>
                        onSettingsChange({ fixCapitalization: v })
                      }
                    />
                  </div>
                </SettingsGroup>

                <SettingsGroup title="Background">
                  <Slider
                    label="Opacity"
                    icon={<EyeIcon className="w-4 h-4" />}
                    value={settings.backgroundOpacity}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(val: number) =>
                      onSettingsChange({ backgroundOpacity: val })
                    }
                    formatValue={(v: number) => `${v}%`}
                  />

                  <Toggle
                    label="Blur Background"
                    icon={<BlurIcon className="w-4 h-4" />}
                    checked={settings.backgroundBlur}
                    onChange={(v: boolean) =>
                      onSettingsChange({ backgroundBlur: v })
                    }
                  />

                  {settings.backgroundBlur && (
                    <Slider
                      label="Blur Intensity"
                      value={settings.backgroundBlurAmount}
                      min={0}
                      max={20}
                      step={1}
                      onChange={(val: number) =>
                        onSettingsChange({ backgroundBlurAmount: val })
                      }
                      formatValue={(v: number) => `${v}px`}
                    />
                  )}
                </SettingsGroup>
              </>
            )}
          </div>
        </div>
      )}
    </Menu>
  );
};
