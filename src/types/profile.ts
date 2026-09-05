export type HeaderProfileSummary = {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
  level: number;
  levelLabel: string;
  expTotal: number;
  currentLevelExp: number;
  nextLevelExp: number | null;
  levelProgress: number;
  skillBp: number;
  gemsBalance: number;
  unreadNotificationCount: number;
  unreadMessageCount: number;
  pendingFriendRequestCount: number;
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
