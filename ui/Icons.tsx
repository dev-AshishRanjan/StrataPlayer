
// Re-export icons from lucide-react for consistency
// This assumes lucide-react is available in the import map as configured in index.html
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
  RotateCcw,
  RotateCw,
  ArrowLeft,
  Upload,
  Loader2
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
export const ReplayIcon = RotateCcw; // 10s replay usually implies CCW
export const ForwardIcon = RotateCw;
export const ArrowLeftIcon = ArrowLeft;
export const LoaderIcon = Loader2;
