
// Re-export icons from lucide-react for consistency
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Check,
  PictureInPicture,
  Subtitles,
  Download,
  ArrowLeft,
  Upload,
  Loader2,
  RotateCcw,
  RotateCw,
  Cast,
  Users,
  Clock,
  Minus,
  Plus,
  SlidersHorizontal,
  Type,
  Palette,
  Eye,
  MoveVertical,
  RefreshCcw,
  Bold,
  CaseUpper,
  Droplet
} from 'lucide-react';

export const PlayIcon = Play;
export const PauseIcon = Pause;
export const VolumeHighIcon = Volume2;
export const VolumeLowIcon = Volume1;
export const VolumeMuteIcon = VolumeX;
export const MaximizeIcon = Maximize;
export const MinimizeIcon = Minimize;
export const SettingsIcon = Settings;
export const CheckIcon = Check;
export const PipIcon = PictureInPicture;
export const SubtitleIcon = Subtitles;
export const DownloadIcon = Download;
export const UploadIcon = Upload;
export const ArrowLeftIcon = ArrowLeft;
export const LoaderIcon = Loader2;
export const CastIcon = Cast;
export const UsersIcon = Users;
export const ClockIcon = Clock;
export const MinusIcon = Minus;
export const PlusIcon = Plus;
export const CustomizeIcon = SlidersHorizontal;
export const TypeIcon = Type;
export const PaletteIcon = Palette;
export const EyeIcon = Eye;
export const MoveVerticalIcon = MoveVertical;
export const ResetIcon = RefreshCcw;
export const BoldIcon = Bold;
export const CaseUpperIcon = CaseUpper;
export const BlurIcon = Droplet;

// Custom 10s Skip Icons using Lucide base
export const Replay10Icon = ({ className }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <RotateCcw className="w-full h-full" strokeWidth={2} />
    <span className="absolute inset-0 flex items-center justify-center text-[32%] font-bold select-none mt-[1px]">10</span>
  </div>
);

export const Forward10Icon = ({ className }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <RotateCw className="w-full h-full" strokeWidth={2} />
    <span className="absolute inset-0 flex items-center justify-center text-[32%] font-bold select-none mt-[1px]">10</span>
  </div>
);

export const StrataLogo = ({ className }: { className?: string }) => {
  // Use Vite's BASE_URL env variable to construct the path relative to the deployment root.
  // In dev, this is "/", so result is "/logo.png".
  // In prod, this is "/StrataPlayer/", so result is "/StrataPlayer/logo.png".
  const base = import.meta.env?.BASE_URL || '/';
  const src = `${base}logo.png`;

  return <img src={src} alt="StrataPlayer Logo" className={className} />;
};
