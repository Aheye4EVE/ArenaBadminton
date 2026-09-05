import { sql } from "drizzle-orm";
import {
  boolean,
  bigint,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull().default("ผู้เล่นใหม่"),
    handle: text("handle").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    level: smallint("level").notNull().default(1),
    expTotal: bigint("exp_total", { mode: "number" }).notNull().default(0),
    skillBp: integer("skill_bp").notNull().default(1000),
    lineUserId: text("line_user_id"),
    lineContactId: text("line_contact_id"),
    addressLine: text("address_line"),
    province: text("province"),
    district: text("district"),
    subdistrict: text("subdistrict"),
    postalCode: text("postal_code"),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    locationUpdatedAt: timestamp("location_updated_at", { withTimezone: true }),
    profileCompletedAt: timestamp("profile_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("profiles_handle_lower_uidx").on(sql`lower(${table.handle})`),
    check("profiles_display_name_length", sql`char_length(${table.displayName}) between 1 and 80`),
    check("profiles_handle_length", sql`char_length(${table.handle}) between 3 and 40`),
    check("profiles_level_range", sql`${table.level} between 1 and 99`),
    check("profiles_exp_total_nonnegative", sql`${table.expTotal} >= 0`),
    check("profiles_skill_bp_floor", sql`${table.skillBp} >= 1000`),
    check("profiles_line_user_id_length", sql`${table.lineUserId} is null or char_length(${table.lineUserId}) between 1 and 128`),
    check("profiles_line_contact_id_length", sql`${table.lineContactId} is null or char_length(${table.lineContactId}) between 1 and 80`),
    check("profiles_address_line_length", sql`${table.addressLine} is null or char_length(${table.addressLine}) between 1 and 240`),
    check("profiles_province_length", sql`${table.province} is null or char_length(${table.province}) between 1 and 80`),
    check("profiles_district_length", sql`${table.district} is null or char_length(${table.district}) between 1 and 80`),
    check("profiles_subdistrict_length", sql`${table.subdistrict} is null or char_length(${table.subdistrict}) between 1 and 80`),
    check("profiles_postal_code_format", sql`${table.postalCode} is null or ${table.postalCode} ~ '^[0-9]{5}$'`),
    check("profiles_latitude_range", sql`${table.latitude} is null or ${table.latitude} between -90 and 90`),
    check("profiles_longitude_range", sql`${table.longitude} is null or ${table.longitude} between -180 and 180`),
    check("profiles_coordinates_pair", sql`(${table.latitude} is null and ${table.longitude} is null) or (${table.latitude} is not null and ${table.longitude} is not null)`),
  ],
);

export const publicProfileDirectory = pgTable(
  "public_profile_directory",
  {
    id: uuid("id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    handle: text("handle").notNull(),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    level: smallint("level").notNull(),
    expTotal: bigint("exp_total", { mode: "number" }).notNull(),
    skillBp: integer("skill_bp").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("public_profile_directory_bp_idx").on(table.skillBp, table.level, table.expTotal, table.id),
    index("public_profile_directory_handle_idx").on(sql`lower(${table.handle})`),
  ],
);

export const shopItems = pgTable(
  "shop_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    itemType: text("item_type").notNull().default("exp_booster"),
    rarityTier: text("rarity_tier").notNull().default("white"),
    icon: text("icon").notNull().default("✨"),
    effectType: text("effect_type").notNull().default("none"),
    effectValue: smallint("effect_value").notNull().default(0),
    priceGems: bigint("price_gems", { mode: "number" }).notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("shop_items_slug_uidx").on(table.slug),
    index("shop_items_active_sort_idx").on(table.sortOrder, table.createdAt, table.id),
    check("shop_items_slug_length", sql`char_length(${table.slug}) between 3 and 80`),
    check("shop_items_name_length", sql`char_length(${table.name}) between 1 and 120`),
    check("shop_items_description_length", sql`char_length(${table.description}) <= 500`),
    check("shop_items_type_allowed", sql`${table.itemType} in ('exp_booster', 'badge', 'title', 'cosmetic')`),
    check("shop_items_rarity_allowed", sql`${table.rarityTier} in ('white', 'green', 'blue', 'purple', 'orange', 'red', 'gold', 'rainbow')`),
    check("shop_items_effect_allowed", sql`${table.effectType} in ('none', 'exp_boost')`),
    check("shop_items_effect_consistency", sql`(${table.effectType} = 'none' and ${table.effectValue} = 0) or (${table.effectType} = 'exp_boost' and ${table.itemType} in ('exp_booster', 'badge') and ${table.effectValue} between 1 and 100)`),
    check("shop_items_price_range", sql`${table.priceGems} between 0 and 1000000000`),
  ],
);

export const userWallets = pgTable(
  "user_wallets",
  {
    userId: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
    gemsBalance: bigint("gems_balance", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("user_wallets_balance_nonnegative", sql`${table.gemsBalance} >= 0`)],
);

export const shopPurchases = pgTable(
  "shop_purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull().references(() => shopItems.id, { onDelete: "restrict" }),
    quantity: smallint("quantity").notNull(),
    unitPriceGems: bigint("unit_price_gems", { mode: "number" }).notNull(),
    totalPriceGems: bigint("total_price_gems", { mode: "number" }).notNull(),
    status: text("status").notNull().default("completed"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("shop_purchases_user_idempotency_uidx").on(table.userId, table.idempotencyKey),
    index("shop_purchases_user_created_idx").on(table.userId, table.createdAt, table.id),
    index("shop_purchases_item_created_idx").on(table.itemId, table.createdAt, table.id),
    check("shop_purchases_quantity_range", sql`${table.quantity} between 1 and 99`),
    check("shop_purchases_unit_price_nonnegative", sql`${table.unitPriceGems} >= 0`),
    check("shop_purchases_total_price_nonnegative", sql`${table.totalPriceGems} >= 0`),
    check("shop_purchases_total_reconciles", sql`${table.totalPriceGems} = ${table.unitPriceGems} * ${table.quantity}`),
    check("shop_purchases_status_allowed", sql`${table.status} in ('completed', 'refunded')`),
  ],
);

export const walletLedger = pgTable(
  "wallet_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    transactionType: text("transaction_type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    balanceBefore: bigint("balance_before", { mode: "number" }).notNull(),
    balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
    referenceId: uuid("reference_id").references(() => shopPurchases.id, { onDelete: "set null" }),
    idempotencyKey: text("idempotency_key").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("wallet_ledger_user_idempotency_uidx").on(table.userId, table.idempotencyKey),
    index("wallet_ledger_user_created_idx").on(table.userId, table.createdAt, table.id),
    check("wallet_ledger_type_allowed", sql`${table.transactionType} in ('purchase', 'admin_credit', 'admin_debit', 'refund')`),
    check("wallet_ledger_balances_nonnegative", sql`${table.balanceBefore} >= 0 and ${table.balanceAfter} >= 0`),
    check("wallet_ledger_reconciles", sql`${table.balanceAfter} = ${table.balanceBefore} + ${table.amount}`),
  ],
);

export const userItemInventory = pgTable(
  "user_item_inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").notNull().references(() => shopItems.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull().default(1),
    isEquipped: boolean("is_equipped").notNull().default(false),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_item_inventory_user_item_uidx").on(table.userId, table.itemId),
    index("user_item_inventory_user_equipped_idx").on(table.userId, table.isEquipped, table.updatedAt, table.itemId),
    index("user_item_inventory_item_user_idx").on(table.itemId, table.userId),
    check("user_item_inventory_quantity_range", sql`${table.quantity} between 1 and 1000000`),
  ],
);

export const adminUsers = pgTable(
  "admin_users",
  {
    userId: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("admin"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("admin_users_role_allowed", sql`${table.role} = 'admin'`)],
);

export const levelDefinitions = pgTable(
  "level_definitions",
  {
    level: smallint("level").primaryKey(),
    requiredExp: bigint("required_exp", { mode: "number" }).notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("level_definitions_level_range", sql`${table.level} between 1 and 99`),
    check("level_definitions_exp_nonnegative", sql`${table.requiredExp} >= 0`),
    check("level_definitions_label_length", sql`char_length(${table.label}) between 1 and 80`),
  ],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    province: text("province"),
    district: text("district"),
    subdistrict: text("subdistrict"),
    address: text("address"),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    coverImageUrl: text("cover_image_url"),
    courtCount: smallint("court_count").notNull().default(1),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
    availability: text("availability").notNull().default("available"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("venues_status_district_idx").on(table.status, table.district),
    index("venues_discovery_location_idx").on(table.status, table.province, table.district, table.subdistrict),
    index("venues_created_by_idx").on(table.createdBy),
    check("venues_name_length", sql`char_length(${table.name}) between 1 and 160`),
    check("venues_court_count_positive", sql`${table.courtCount} > 0`),
    check("venues_rating_range", sql`${table.rating} between 0 and 5`),
    check("venues_availability_allowed", sql`${table.availability} in ('available', 'waitlist')`),
    check("venues_status_allowed", sql`${table.status} in ('active', 'inactive', 'pending')`),
    check("venues_latitude_range", sql`${table.latitude} is null or ${table.latitude} between -90 and 90`),
    check("venues_longitude_range", sql`${table.longitude} is null or ${table.longitude} between -180 and 180`),
  ],
);

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    guildId: uuid("guild_id"),
    title: text("title").notNull(),
    description: text("description"),
    locationText: text("location_text").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMinutes: smallint("duration_minutes").notNull().default(120),
    capacity: smallint("capacity").notNull(),
    minLevel: smallint("min_level").notNull().default(1),
    maxLevel: smallint("max_level").notNull().default(99),
    playType: text("play_type").notNull().default("open"),
    entryFee: numeric("entry_fee", { precision: 10, scale: 2 }).notNull().default("0"),
    status: text("status").notNull().default("draft"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("groups_status_starts_at_idx").on(table.status, table.startsAt),
    index("groups_owner_id_idx").on(table.ownerId),
    index("groups_venue_starts_at_idx").on(table.venueId, table.startsAt),
    check("groups_title_length", sql`char_length(${table.title}) between 1 and 160`),
    check("groups_location_length", sql`char_length(${table.locationText}) between 1 and 240`),
    check("groups_duration_range", sql`${table.durationMinutes} between 30 and 480`),
    check("groups_capacity_range", sql`${table.capacity} between 2 and 200`),
    check("groups_min_level_range", sql`${table.minLevel} between 1 and 99`),
    check("groups_max_level_range", sql`${table.maxLevel} between 1 and 99`),
    check("groups_level_order", sql`${table.minLevel} <= ${table.maxLevel}`),
    check("groups_play_type_allowed", sql`${table.playType} in ('open', 'friendly', 'tournament', 'training')`),
    check("groups_entry_fee_nonnegative", sql`${table.entryFee} >= 0`),
    check("groups_status_allowed", sql`${table.status} in ('draft', 'published', 'full', 'cancelled', 'completed')`),
  ],
);

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    membershipStatus: text("membership_status").notNull().default("registered"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId], name: "group_members_pkey" }),
    index("group_members_user_id_idx").on(table.userId),
    index("group_members_group_status_idx").on(table.groupId, table.membershipStatus),
    check(
      "group_members_status_allowed",
      sql`${table.membershipStatus} in ('registered', 'waitlisted', 'cancelled', 'attended', 'no_show')`,
    ),
  ],
);

export const bpRuleConfigs = pgTable(
  "bp_rule_configs",
  {
    id: text("id").primaryKey().default("default"),
    ruleVersion: text("rule_version").notNull(),
    minBp: integer("min_bp").notNull().default(1000),
    baseWinBp: integer("base_win_bp").notNull().default(25),
    baseLossBp: integer("base_loss_bp").notNull().default(15),
    upsetBonusPerLevel: integer("upset_bonus_per_level").notNull().default(2),
    favoriteWinPenaltyPerLevel: integer("favorite_win_penalty_per_level").notNull().default(1),
    upsetLossPenaltyPerLevel: integer("upset_loss_penalty_per_level").notNull().default(1),
    favoriteLossProtectionPerLevel: integer("favorite_loss_protection_per_level").notNull().default(1),
    minWinDelta: integer("min_win_delta").notNull().default(5),
    maxWinDelta: integer("max_win_delta").notNull().default(100),
    minLossDelta: integer("min_loss_delta").notNull().default(5),
    maxLossDelta: integer("max_loss_delta").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bp_rule_configs_version_idx").on(table.ruleVersion),
    check("bp_rule_configs_singleton", sql`${table.id} = 'default'`),
    check("bp_rule_configs_min_bp_fixed", sql`${table.minBp} = 1000`),
    check("bp_rule_configs_base_win_positive", sql`${table.baseWinBp} > 0`),
    check("bp_rule_configs_base_loss_positive", sql`${table.baseLossBp} > 0`),
    check(
      "bp_rule_configs_factors_nonnegative",
      sql`${table.upsetBonusPerLevel} >= 0 and ${table.favoriteWinPenaltyPerLevel} >= 0 and ${table.upsetLossPenaltyPerLevel} >= 0 and ${table.favoriteLossProtectionPerLevel} >= 0`,
    ),
    check(
      "bp_rule_configs_delta_ranges",
      sql`${table.minWinDelta} > 0 and ${table.maxWinDelta} >= ${table.minWinDelta} and ${table.minLossDelta} > 0 and ${table.maxLossDelta} >= ${table.minLossDelta}`,
    ),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id").notNull().references(() => groups.id, { onDelete: "restrict" }),
    matchNumber: smallint("match_number").notNull(),
    format: text("format").notNull().default("singles"),
    status: text("status").notNull().default("scheduled"),
    createdBy: uuid("created_by").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    expWinReward: bigint("exp_win_reward", { mode: "number" }).notNull().default(0),
    expLossReward: bigint("exp_loss_reward", { mode: "number" }).notNull().default(0),
    teamAScore: smallint("team_a_score"),
    teamBScore: smallint("team_b_score"),
    winnerTeam: text("winner_team"),
    resultSubmittedBy: uuid("result_submitted_by").references(() => profiles.id, { onDelete: "set null" }),
    resultSubmittedAt: timestamp("result_submitted_at", { withTimezone: true }),
    confirmedBy: uuid("confirmed_by").references(() => profiles.id, { onDelete: "set null" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("matches_group_number_uidx").on(table.groupId, table.matchNumber),
    index("matches_group_status_created_idx").on(table.groupId, table.status, table.createdAt),
    index("matches_created_by_idx").on(table.createdBy),
    index("matches_result_submitter_idx").on(table.resultSubmittedBy),
    index("matches_confirmer_idx").on(table.confirmedBy),
    check("matches_number_range", sql`${table.matchNumber} between 1 and 999`),
    check("matches_format_allowed", sql`${table.format} in ('singles', 'doubles')`),
    check("matches_status_allowed", sql`${table.status} in ('scheduled', 'live', 'awaiting_confirmation', 'confirmed', 'disputed', 'cancelled')`),
    check("matches_exp_win_range", sql`${table.expWinReward} between 0 and 1000000`),
    check("matches_exp_loss_range", sql`${table.expLossReward} between 0 and 1000000`),
    check("matches_score_pair", sql`(${table.teamAScore} is null and ${table.teamBScore} is null) or (${table.teamAScore} is not null and ${table.teamBScore} is not null)`),
    check("matches_score_range", sql`(${table.teamAScore} is null or ${table.teamAScore} between 0 and 30) and (${table.teamBScore} is null or ${table.teamBScore} between 0 and 30)`),
    check("matches_winner_consistency", sql`${table.winnerTeam} is null or (${table.teamAScore} is not null and ${table.teamBScore} is not null and ((${table.winnerTeam} = 'a' and ${table.teamAScore} > ${table.teamBScore}) or (${table.winnerTeam} = 'b' and ${table.teamBScore} > ${table.teamAScore})))`),
    check("matches_notes_length", sql`${table.notes} is null or char_length(${table.notes}) <= 1000`),
  ],
);

export const matchParticipants = pgTable(
  "match_participants",
  {
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    team: text("team").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.userId], name: "match_participants_pkey" }),
    index("match_participants_user_match_idx").on(table.userId, table.matchId),
    index("match_participants_match_team_idx").on(table.matchId, table.team, table.userId),
    check("match_participants_team_allowed", sql`${table.team} in ('a', 'b')`),
  ],
);

export const matchCheckIns = pgTable(
  "match_check_ins",
  {
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    status: text("status").notNull().default("pending"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.matchId, table.userId], name: "match_check_ins_pkey" }),
    index("match_check_ins_user_status_idx").on(table.userId, table.status, table.matchId),
    index("match_check_ins_match_status_idx").on(table.matchId, table.status, table.userId),
    check("match_check_ins_status_allowed", sql`${table.status} in ('pending', 'checked_in', 'no_show', 'excused')`),
    check("match_check_ins_time_consistency", sql`${table.status} <> 'checked_in' or ${table.checkedInAt} is not null`),
  ],
);

export const matchSettlements = pgTable(
  "match_settlements",
  {
    matchId: uuid("match_id").primaryKey().references(() => matches.id, { onDelete: "restrict" }),
    settlementStatus: text("settlement_status").notNull().default("applied"),
    ruleVersion: text("rule_version").notNull(),
    winnerTeam: text("winner_team").notNull(),
    winnerLevel: smallint("winner_level").notNull(),
    loserLevel: smallint("loser_level").notNull(),
    winnerBpDelta: integer("winner_bp_delta").notNull(),
    loserBpDelta: integer("loser_bp_delta").notNull(),
    winnerExpReward: bigint("winner_exp_reward", { mode: "number" }).notNull(),
    loserExpReward: bigint("loser_exp_reward", { mode: "number" }).notNull(),
    winnerItemBonusExp: bigint("winner_item_bonus_exp", { mode: "number" }).notNull().default(0),
    loserItemBonusExp: bigint("loser_item_bonus_exp", { mode: "number" }).notNull().default(0),
    settledBy: uuid("settled_by").references(() => profiles.id, { onDelete: "set null" }),
    settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("match_settlements_status_settled_idx").on(table.settlementStatus, table.settledAt),
    check("match_settlements_status_allowed", sql`${table.settlementStatus} in ('applied', 'reversed')`),
    check("match_settlements_team_allowed", sql`${table.winnerTeam} in ('a', 'b')`),
    check("match_settlements_levels_range", sql`${table.winnerLevel} between 1 and 99 and ${table.loserLevel} between 1 and 99`),
    check("match_settlements_rewards_nonnegative", sql`${table.winnerExpReward} >= 0 and ${table.loserExpReward} >= 0`),
    check("match_settlements_item_bonus_nonnegative", sql`${table.winnerItemBonusExp} >= 0 and ${table.loserItemBonusExp} >= 0`),
  ],
);

export const expLedger = pgTable(
  "exp_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "restrict" }),
    sourceType: text("source_type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    ruleVersion: text("rule_version").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("exp_ledger_match_user_source_uidx").on(table.matchId, table.userId, table.sourceType),
    index("exp_ledger_user_created_idx").on(table.userId, table.createdAt),
    index("exp_ledger_match_user_idx").on(table.matchId, table.userId),
    check("exp_ledger_source_type_allowed", sql`${table.sourceType} in ('match_win', 'match_loss', 'item_bonus', 'admin_adjustment')`),
    check("exp_ledger_amount_nonnegative", sql`${table.amount} >= 0`),
  ],
);

export const bpLedger = pgTable(
  "bp_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "restrict" }),
    sourceType: text("source_type").notNull().default("match_result"),
    requestedDelta: integer("requested_delta").notNull(),
    appliedDelta: integer("applied_delta").notNull(),
    balanceBefore: integer("balance_before").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    team: text("team").notNull(),
    ruleVersion: text("rule_version").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bp_ledger_match_user_uidx").on(table.matchId, table.userId),
    index("bp_ledger_user_created_idx").on(table.userId, table.createdAt),
    index("bp_ledger_match_user_idx").on(table.matchId, table.userId),
    check("bp_ledger_source_type_allowed", sql`${table.sourceType} in ('match_result', 'admin_adjustment')`),
    check("bp_ledger_balance_before_floor", sql`${table.balanceBefore} >= 1000`),
    check("bp_ledger_balance_after_floor", sql`${table.balanceAfter} >= 1000`),
    check("bp_ledger_delta_reconciles", sql`${table.balanceAfter} = ${table.balanceBefore} + ${table.appliedDelta}`),
    check("bp_ledger_team_allowed", sql`${table.team} in ('a', 'b')`),
  ],
);

export const trophyRecords = pgTable(
  "trophy_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => shopItems.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon").notNull().default("🏆"),
    rarityTier: text("rarity_tier").notNull().default("white"),
    sourceType: text("source_type").notNull().default("system"),
    metadata: jsonb("metadata").notNull().default({}),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("trophy_records_user_awarded_idx").on(table.userId, table.awardedAt, table.id),
    index("trophy_records_item_idx").on(table.itemId),
    check("trophy_records_title_length", sql`char_length(${table.title}) between 1 and 120`),
    check("trophy_records_description_length", sql`char_length(${table.description}) <= 500`),
    check("trophy_records_icon_length", sql`char_length(${table.icon}) between 1 and 16`),
    check("trophy_records_rarity_allowed", sql`${table.rarityTier} in ('white', 'green', 'blue', 'purple', 'orange', 'red', 'gold', 'rainbow')`),
    check("trophy_records_source_allowed", sql`${table.sourceType} in ('system', 'admin', 'group', 'match', 'tournament')`),
  ],
);

export const socialPosts = pgTable(
  "social_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("social_posts_feed_idx").on(table.status, table.createdAt, table.id),
    index("social_posts_user_created_idx").on(table.userId, table.createdAt, table.id),
    check("social_posts_body_length", sql`char_length(btrim(${table.body})) between 1 and 2000`),
    check("social_posts_status_allowed", sql`${table.status} in ('published', 'hidden', 'deleted')`),
  ],
);

export const socialPostComments = pgTable(
  "social_post_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: text("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("social_post_comments_post_created_idx").on(table.postId, table.status, table.createdAt, table.id),
    index("social_post_comments_user_created_idx").on(table.userId, table.createdAt, table.id),
    check("social_post_comments_body_length", sql`char_length(btrim(${table.body})) between 1 and 1000`),
    check("social_post_comments_status_allowed", sql`${table.status} in ('published', 'hidden', 'deleted')`),
  ],
);

export const socialPostLikes = pgTable(
  "social_post_likes",
  {
    postId: uuid("post_id").notNull().references(() => socialPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId], name: "social_post_likes_pkey" }),
    index("social_post_likes_user_created_idx").on(table.userId, table.createdAt, table.postId),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    notificationType: text("notification_type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_unread_idx").on(table.userId, table.createdAt, table.id),
    check("notifications_type_length", sql`char_length(${table.notificationType}) between 1 and 60`),
    check("notifications_title_length", sql`char_length(${table.title}) between 1 and 160`),
    check("notifications_body_length", sql`char_length(${table.body}) <= 500`),
    check("notifications_href_local", sql`${table.href} is null or (${table.href} like '/%' and ${table.href} not like '//%')`),
  ],
);

export const tournaments = pgTable(
  "tournaments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdBy: uuid("created_by").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    format: text("format").notNull().default("singles"),
    status: text("status").notNull().default("draft"),
    maxEntries: smallint("max_entries").notNull().default(8),
    entryFee: numeric("entry_fee", { precision: 10, scale: 2 }).notNull().default("0"),
    rules: text("rules").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tournaments_status_starts_idx").on(table.status, table.startsAt, table.id),
    index("tournaments_creator_idx").on(table.createdBy, table.createdAt, table.id),
    index("tournaments_venue_idx").on(table.venueId, table.startsAt, table.id),
    check("tournaments_title_length", sql`char_length(${table.title}) between 1 and 160`),
    check("tournaments_description_length", sql`char_length(${table.description}) <= 2000`),
    check("tournaments_format_allowed", sql`${table.format} in ('singles', 'doubles', 'team')`),
    check("tournaments_status_allowed", sql`${table.status} in ('draft', 'published', 'registration_closed', 'in_progress', 'completed', 'cancelled')`),
    check("tournaments_max_entries_range", sql`${table.maxEntries} between 2 and 256`),
    check("tournaments_entry_fee_nonnegative", sql`${table.entryFee} >= 0`),
    check("tournaments_rules_length", sql`char_length(${table.rules}) <= 5000`),
  ],
);

export const tournamentEntries = pgTable(
  "tournament_entries",
  {
    tournamentId: uuid("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    entryStatus: text("entry_status").notNull().default("registered"),
    seed: smallint("seed"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.tournamentId, table.userId], name: "tournament_entries_pkey" }),
    index("tournament_entries_user_status_idx").on(table.userId, table.entryStatus, table.joinedAt),
    index("tournament_entries_tournament_status_idx").on(table.tournamentId, table.entryStatus, table.joinedAt),
    check("tournament_entries_status_allowed", sql`${table.entryStatus} in ('registered', 'waitlisted', 'withdrawn', 'eliminated', 'winner')`),
    check("tournament_entries_seed_positive", sql`${table.seed} is null or ${table.seed} > 0`),
  ],
);

export const tournamentRewards = pgTable(
  "tournament_rewards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id").notNull().references(() => tournaments.id, { onDelete: "cascade" }),
    placement: smallint("placement").notNull(),
    expReward: bigint("exp_reward", { mode: "number" }).notNull().default(0),
    bpReward: integer("bp_reward").notNull().default(0),
    itemId: uuid("item_id").references(() => shopItems.id, { onDelete: "restrict" }),
    label: text("label").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tournament_rewards_tournament_placement_uidx").on(table.tournamentId, table.placement),
    index("tournament_rewards_tournament_idx").on(table.tournamentId, table.placement),
    index("tournament_rewards_item_idx").on(table.itemId),
    check("tournament_rewards_placement_positive", sql`${table.placement} > 0`),
    check("tournament_rewards_exp_nonnegative", sql`${table.expReward} >= 0`),
    check("tournament_rewards_bp_nonnegative", sql`${table.bpReward} >= 0`),
    check("tournament_rewards_label_length", sql`char_length(${table.label}) <= 160`),
  ],
);

export const moderationReports = pgTable(
  "moderation_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: uuid("reporter_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status").notNull().default("open"),
    resolvedBy: uuid("resolved_by").references(() => profiles.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("moderation_reports_status_created_idx").on(table.status, table.createdAt, table.id),
    index("moderation_reports_reporter_idx").on(table.reporterId, table.createdAt, table.id),
    index("moderation_reports_resolver_idx").on(table.resolvedBy),
    check("moderation_reports_target_type_allowed", sql`${table.targetType} in ('post', 'comment', 'group', 'match', 'profile', 'tournament')`),
    check("moderation_reports_reason_length", sql`char_length(${table.reason}) between 1 and 120`),
    check("moderation_reports_details_length", sql`char_length(${table.details}) <= 1000`),
    check("moderation_reports_status_allowed", sql`${table.status} in ('open', 'reviewing', 'resolved', 'dismissed')`),
    check("moderation_reports_resolution_consistency", sql`(${table.status} in ('resolved', 'dismissed') and ${table.resolvedAt} is not null) or ${table.status} in ('open', 'reviewing')`),
  ],
);

export const paymentOrders = pgTable(
  "payment_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerOrderId: text("provider_order_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("THB"),
    status: text("status").notNull().default("pending"),
    idempotencyKey: text("idempotency_key").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_orders_provider_id_uidx").on(table.provider, table.providerOrderId),
    uniqueIndex("payment_orders_provider_idempotency_uidx").on(table.provider, table.idempotencyKey),
    index("payment_orders_user_created_idx").on(table.userId, table.createdAt, table.id),
    index("payment_orders_status_created_idx").on(table.status, table.createdAt, table.id),
    check("payment_orders_provider_length", sql`char_length(${table.provider}) between 1 and 60`),
    check("payment_orders_provider_order_length", sql`${table.providerOrderId} is null or char_length(${table.providerOrderId}) between 1 and 160`),
    check("payment_orders_amount_positive", sql`${table.amount} > 0`),
    check("payment_orders_currency_allowed", sql`${table.currency} in ('THB', 'USD')`),
    check("payment_orders_status_allowed", sql`${table.status} in ('pending', 'paid', 'failed', 'cancelled', 'refunded')`),
    check("payment_orders_idempotency_length", sql`char_length(${table.idempotencyKey}) between 16 and 128`),
  ],
);

export const guildSettings = pgTable(
  "guild_settings",
  {
    id: text("id").primaryKey().default("default"),
    creationMode: text("creation_mode").notNull().default("item"),
    freeUntil: timestamp("free_until", { withTimezone: true }),
    founderItemSlug: text("founder_item_slug").notNull().default("guild-founding-contract"),
    maxMembersCap: smallint("max_members_cap").notNull().default(256),
    updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const guilds = pgTable(
  "guilds",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: uuid("owner_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    logoUrl: text("logo_url"),
    province: text("province"),
    district: text("district"),
    subdistrict: text("subdistrict"),
    visibility: text("visibility").notNull().default("public"),
    joinPolicy: text("join_policy").notNull().default("open"),
    status: text("status").notNull().default("active"),
    level: smallint("level").notNull().default(1),
    expTotal: bigint("exp_total", { mode: "number" }).notNull().default(0),
    maxMembers: smallint("max_members").notNull().default(32),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("guilds_slug_uidx").on(table.slug),
    index("guilds_discovery_idx").on(table.status, table.visibility, table.province, table.district, table.subdistrict, table.createdAt, table.id),
    index("guilds_level_idx").on(table.level, table.expTotal, table.id),
    index("guilds_owner_idx").on(table.ownerId, table.status),
    check("guilds_name_length", sql`char_length(btrim(${table.name})) between 2 and 100`),
    check("guilds_level_range", sql`${table.level} between 1 and 99`),
    check("guilds_exp_nonnegative", sql`${table.expTotal} >= 0`),
    check("guilds_max_members_range", sql`${table.maxMembers} between 32 and 256`),
  ],
);

export const guildMembers = pgTable(
  "guild_members",
  {
    guildId: uuid("guild_id").notNull().references(() => guilds.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    membershipStatus: text("membership_status").notNull().default("active"),
    contributionExp: bigint("contribution_exp", { mode: "number" }).notNull().default(0),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.guildId, table.userId], name: "guild_members_pkey" }),
    index("guild_members_guild_status_role_idx").on(table.guildId, table.membershipStatus, table.role, table.joinedAt, table.userId),
    index("guild_members_user_status_idx").on(table.userId, table.membershipStatus, table.guildId),
    check("guild_members_contribution_nonnegative", sql`${table.contributionExp} >= 0`),
  ],
);

export const guildJoinRequests = pgTable(
  "guild_join_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: uuid("guild_id").notNull().references(() => guilds.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => profiles.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("guild_join_requests_guild_status_created_idx").on(table.guildId, table.status, table.createdAt, table.id),
    index("guild_join_requests_user_status_created_idx").on(table.userId, table.status, table.createdAt, table.id),
  ],
);

export const guildInvites = pgTable(
  "guild_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: uuid("guild_id").notNull().references(() => guilds.id, { onDelete: "cascade" }),
    inviterId: uuid("inviter_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    inviteeId: uuid("invitee_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    inviteToken: text("invite_token").notNull(),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("guild_invites_token_uidx").on(table.inviteToken),
    index("guild_invites_invitee_status_idx").on(table.inviteeId, table.status, table.expiresAt, table.createdAt),
    index("guild_invites_guild_status_idx").on(table.guildId, table.status, table.createdAt),
  ],
);

export const guildBans = pgTable(
  "guild_bans",
  {
    guildId: uuid("guild_id").notNull().references(() => guilds.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    bannedBy: uuid("banned_by").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.guildId, table.userId], name: "guild_bans_pkey" })],
);

export const guildAnnouncements = pgTable(
  "guild_announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: uuid("guild_id").notNull().references(() => guilds.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => profiles.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isPinned: boolean("is_pinned").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("guild_announcements_feed_idx").on(table.guildId, table.isPinned, table.createdAt, table.id)],
);

export const guildExpLedger = pgTable(
  "guild_exp_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: uuid("guild_id").notNull().references(() => guilds.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    sourceType: text("source_type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("guild_exp_ledger_guild_created_idx").on(table.guildId, table.createdAt, table.id),
    index("guild_exp_ledger_user_created_idx").on(table.userId, table.createdAt, table.id),
  ],
);

export const guildAuditLogs = pgTable(
  "guild_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    guildId: uuid("guild_id").notNull().references(() => guilds.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetUserId: uuid("target_user_id").references(() => profiles.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("guild_audit_logs_guild_created_idx").on(table.guildId, table.createdAt, table.id)],
);
