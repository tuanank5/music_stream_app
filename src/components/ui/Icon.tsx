import {
  AudioLines,
  Bell,
  ChevronLeft,
  Heart,
  House,
  Library,
  Music2,
  Newspaper,
  Pause,
  Play,
  Search,
  Share2,
  Shuffle,
  User,
  Ellipsis,
  Plus,
  X,
  ChevronDown,
  SkipBack,
  SkipForward,
  Repeat1,
  BookOpen,
  Info,
  MessageCircle,
  Check,
  Circle,
  CircleDot,
  type LucideProps,
} from "lucide-react-native";
import { useTheme } from "tamagui";

// Keep the names used by existing screens while rendering one Lucide icon family.
const icons = {
  "chevron-back": ChevronLeft,
  "musical-notes-outline": Music2,
  "share-outline": Share2,
  "heart-outline": Heart,
  heart: Heart,
  person: User,
  shuffle: Shuffle,
  play: Play,
  pause: Pause,
  home: House,
  search: Search,
  feed: Newspaper,
  library: Library,
  bell: Bell,
  waveform: AudioLines,
  more: Ellipsis,
  add: Plus,
  close: X,
  collapse: ChevronDown,
  previous: SkipBack,
  next: SkipForward,
  "repeat-one": Repeat1,
  lyrics: BookOpen,
  info: Info,
  comment: MessageCircle,
  check: Check,
  "radio-on": CircleDot,
  "radio-off": Circle,
} as const;

export type AppIconName = keyof typeof icons;
type IconProps = Omit<LucideProps, "color"> & {
  name: AppIconName;
  color?: string;
};

export function AppIcon({
  name,
  color = "color",
  size = 24,
  ...props
}: IconProps) {
  const theme = useTheme();
  const resolved = theme[color as keyof typeof theme];
  const Icon = icons[name];
  const resolvedColor = resolved?.get() ?? color;
  return (
    <Icon
      size={size}
      strokeWidth={1.8}
      fill={name === "heart" ? resolvedColor : "none"}
      {...props}
      color={resolvedColor}
    />
  );
}
