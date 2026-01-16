
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
  SlidersHorizontal
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

// Custom 10s Skip Icons using Lucide base
export const Replay10Icon = ({ className }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <RotateCcw className="w-full h-full" strokeWidth={2} />
    <span className="absolute text-[35%] font-bold pt-[10%] select-none">10</span>
  </div>
);

export const Forward10Icon = ({ className }: { className?: string }) => (
  <div className={`relative flex items-center justify-center ${className}`}>
    <RotateCw className="w-full h-full" strokeWidth={2} />
    <span className="absolute text-[35%] font-bold pt-[10%] select-none">10</span>
  </div>
);
