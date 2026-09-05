export type HeaderProfileSummary = {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  avatarFocusX: number;
  avatarFocusY: number;
  profileBackgroundUrl: string | null;
  backgroundFocusX: number;
  backgroundFocusY: number;
  bio: string | null;
  level: number;
  levelLabel: string;
  expTotal: number;
  currentLevelExp: number;
  nextLevelExp: number | null;
  levelProgress: number;
  skillBp: number;
  skillRankTier: number;
  skillRankName: string;
  skillRankColor: string;
  gemsBalance: number;
  unreadNotificationCount: number;
  unreadMessageCount: number;
  pendingFriendRequestCount: number;
  friendCount: number;
  rank: number | null;
  isAdmin: boolean;
  isProfileComplete: boolean;
  guild: {
    id: string;
    name: string;
    level: number;
    role: string;
  } | null;
  stats: {
    createdGroups: number;
    joinedGroups: number;
    matchesPlayed: number;
    wins: number;
  };
};

export type ProfileTrophy = {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarityTier: string;
  sourceType: string;
  awardedAt: string;
};
