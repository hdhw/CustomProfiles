import { BaseText } from "@components/BaseText";
import { addProfileBadge, BadgePosition, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { copyWithToast } from "@utils/discord";
import { openModal, ModalRoot, ModalHeader, ModalContent, ModalFooter, ModalCloseButton } from "@utils/modal";
import { isPluginEnabled } from "@api/PluginManager";
import definePlugin, { OptionType } from "@utils/types";
import { User, UserProfile } from "@vencord/discord-types";
import type { AvatarDecorationData, ClanData, DisplayNameStyles, Nameplate, ProfileEffect } from "@vencord/discord-types";
import { Button, ColorPicker, Forms, GuildMemberStore, IconUtils, OverridePremiumTypeStore, React, SnowflakeUtils, UserStore } from "@webpack/common";

const STORE_KEY_PREFIX = "CustomProfiles_data";
const LEGACY_STORE_KEY_PREFIX = "CustomBadges_data";
const PRESETS_STORE_SUFFIX = "_presets";

interface SavedPreset {
    name: string;
    profile: ProfileData;
    savedAt: number;
}

type BadgeType = "nitro" | "boost" | "standard";

interface PresetBadge {
    name: string;
    description: string;
    image: string;
    discordBadgeId: string;
    discordIcon: string;
    badgeType: BadgeType;
    link?: string;
}

interface BadgeEntry {
    id: string;
    name: string;
    description: string;
    image: string;
    link: string;
    position: "START" | "END";
    discordBadgeId?: string;
    discordIcon?: string;
    badgeType?: BadgeType;
    sinceDate?: number | null;
}

interface NameplateData {
    asset: string;
    skuId: string;
    label?: string;
    palette?: string;
}

interface PrimaryGuildData {
    identityGuildId: string;
    tag: string;
    badge: string;
    identityEnabled?: boolean;
}

interface DisplayNameStyleData {
    font_id: number;
    effect_id: number;
    colors: number[];
}

interface ProfileEffectData {
    skuId: string;
    title?: string;
    description?: string;
    reducedMotionSrc?: string;
    staticFrameSrc?: string;
    thumbnailPreviewSrc?: string;
    effectsJson?: string;
}

interface ProfileData {
    enabled: boolean;
    badges: BadgeEntry[];
    accountDate: number | null;
    themeColors: [number, number] | null;
    bio: string | null;
    pronouns: string | null;
    bannerUrl: string | null;
    avatarUrl: string | null;
    accentColor: number | null;
    legacyUsername: string | null;
    globalName: string | null;
    username: string | null;
    nick: string | null;
    avatarDecoration: { asset: string; skuId: string; } | null;
    nameplate: NameplateData | null;
    profileEffect: ProfileEffectData | null;
    displayNameStyles: DisplayNameStyleData | null;
    primaryGuild: PrimaryGuildData | null;
}

const DEFAULT_THEME: [number, number] = [0x5865f2, 0xeb459e];

const DEFAULT_PROFILE: ProfileData = {
    enabled: true,
    badges: [],
    accountDate: null,
    themeColors: null,
    bio: null,
    pronouns: null,
    bannerUrl: null,
    avatarUrl: null,
    accentColor: null,
    legacyUsername: null,
    globalName: null,
    username: null,
    nick: null,
    avatarDecoration: null,
    nameplate: null,
    profileEffect: null,
    displayNameStyles: null,
    primaryGuild: null,
};

const PRESETS: { category: string; badges: PresetBadge[]; }[] = [
    {
        category: "General",
        badges: [
            { name: "Discord Staff", description: "Discord Staff", image: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png", discordBadgeId: "staff", discordIcon: "5e74e9b61934fc1f67c65515d1f7e60d", badgeType: "standard", link: "https://discord.com/company" },
            { name: "Partnered Server Owner", description: "Partnered Server Owner", image: "https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png", discordBadgeId: "partner", discordIcon: "3f9748e53446a137a052f3454e2de41e", badgeType: "standard", link: "https://discord.com/partners" },
            { name: "HypeSquad Events", description: "HypeSquad Events", image: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png", discordBadgeId: "hypesquad", discordIcon: "bf01d1073931f921909045f3a39fd264", badgeType: "standard" },
            { name: "HypeSquad Bravery", description: "HypeSquad Bravery", image: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png", discordBadgeId: "hypesquad_house_1", discordIcon: "8a88d63823d8a71cd5e390baa45efa02", badgeType: "standard" },
            { name: "HypeSquad Brilliance", description: "HypeSquad Brilliance", image: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png", discordBadgeId: "hypesquad_house_2", discordIcon: "011940fd013da3f7fb926e4a1cd2e618", badgeType: "standard" },
            { name: "HypeSquad Balance", description: "HypeSquad Balance", image: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png", discordBadgeId: "hypesquad_house_3", discordIcon: "3aa41de486fa12454c3761e8e223442e", badgeType: "standard" },
            { name: "Bug Hunter (Tier 1)", description: "Discord Bug Hunter", image: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png", discordBadgeId: "bug_hunter_level_1", discordIcon: "2717692c7dca7289b35297368a940dd0", badgeType: "standard" },
            { name: "Bug Hunter (Tier 2)", description: "Discord Bug Hunter", image: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png", discordBadgeId: "bug_hunter_level_2", discordIcon: "848f79194d4be5ff5f81505cbd0ce1e6", badgeType: "standard" },
            { name: "Early Supporter", description: "Early Supporter", image: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png", discordBadgeId: "early_supporter", discordIcon: "7060786766c9c840eb3019e725d2b358", badgeType: "standard" },
            { name: "Early Verified Bot Developer", description: "Early Verified Bot Developer", image: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png", discordBadgeId: "verified_developer", discordIcon: "6df5892e0f35b051f8b61eace34f4967", badgeType: "standard" },
            { name: "Active Developer", description: "Active Developer", image: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png", discordBadgeId: "active_developer", discordIcon: "6bdc42827a38498929a4920da12695d9", badgeType: "standard" },
            { name: "Moderator Alumni", description: "Moderator Programs Alumni", image: "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png", discordBadgeId: "certified_moderator", discordIcon: "fee1624003e2fee35cb398e125dc479b", badgeType: "standard" },
            { name: "Nitro", description: "Discord Nitro", image: "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png", discordBadgeId: "premium", discordIcon: "2ba85e8026a8614b640c2837bcdfe21b", badgeType: "nitro", link: "https://discord.com/settings/premium" },
            { name: "Completed a Quest", description: "Completed a Quest", image: "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png", discordBadgeId: "quest_completed", discordIcon: "7d9ae358c8c5e118768335dbe68b4fb8", badgeType: "standard" },
            { name: "Legacy Username", description: "Originally known as", image: "https://cdn.discordapp.com/badge-icons/6de6d34650760ba5551a79732e98ed60.png", discordBadgeId: "legacy_username", discordIcon: "6de6d34650760ba5551a79732e98ed60", badgeType: "standard" },
        ]
    },
    {
        category: "Nitro Subscription Tiers",
        badges: [
            { name: "Nitro Bronze (1 Month)", description: "Nitro Subscriber (1 Month)", image: "https://cdn.discordapp.com/badge-icons/4f33c4a9c64ce221936bd256c356f91f.png", discordBadgeId: "premium_tenure_1_month_v2", discordIcon: "4f33c4a9c64ce221936bd256c356f91f", badgeType: "nitro", link: "https://discord.com/settings/premium" },
            { name: "Nitro Silver (3 Months)", description: "Nitro Subscriber (3 Months)", image: "https://cdn.discordapp.com/badge-icons/4514fab914bdbfb4ad2fa23df76121a6.png", discordBadgeId: "premium_tenure_3_month_v2", discordIcon: "4514fab914bdbfb4ad2fa23df76121a6", badgeType: "nitro", link: "https://discord.com/settings/premium" },
            { name: "Nitro Gold (6 Months)", description: "Nitro Subscriber (6 Months)", image: "https://cdn.discordapp.com/badge-icons/2895086c18d5531d499862e41d1155a6.png", discordBadgeId: "premium_tenure_6_month_v2", discordIcon: "2895086c18d5531d499862e41d1155a6", badgeType: "nitro", link: "https://discord.com/settings/premium" },
            { name: "Nitro Platinum (12 Months)", description: "Nitro Subscriber (12 Months)", image: "https://cdn.discordapp.com/badge-icons/0334688279c8359120922938dcb1d6f8.png", discordBadgeId: "premium_tenure_12_month_v2", discordIcon: "0334688279c8359120922938dcb1d6f8", badgeType: "nitro", link: "https://discord.com/settings/premium" },
            { name: "Nitro Diamond (24 Months)", description: "Nitro Subscriber (24 Months)", image: "https://cdn.discordapp.com/badge-icons/0d61871f72bb9a33a7ae568c1fb4f20a.png", discordBadgeId: "premium_tenure_24_month_v2", discordIcon: "0d61871f72bb9a33a7ae568c1fb4f20a", badgeType: "nitro", link: "https://discord.com/settings/premium" },
            { name: "Nitro Emerald (36 Months)", description: "Nitro Subscriber (36 Months)", image: "https://cdn.discordapp.com/badge-icons/11e2d339068b55d3a506cff34d3780f3.png", discordBadgeId: "premium_tenure_36_month_v2", discordIcon: "11e2d339068b55d3a506cff34d3780f3", badgeType: "nitro", link: "https://discord.com/settings/premium" },
            { name: "Nitro Ruby (60 Months)", description: "Nitro Subscriber (60 Months)", image: "https://cdn.discordapp.com/badge-icons/cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png", discordBadgeId: "premium_tenure_60_month_v2", discordIcon: "cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4", badgeType: "nitro", link: "https://discord.com/settings/premium" },
            { name: "Nitro Opal (72+ Months)", description: "Nitro Subscriber (72+ Months)", image: "https://cdn.discordapp.com/badge-icons/5b154df19c53dce2af92c9b61e6be5e2.png", discordBadgeId: "premium_tenure_72_month_v2", discordIcon: "5b154df19c53dce2af92c9b61e6be5e2", badgeType: "nitro", link: "https://discord.com/settings/premium" },
        ]
    },
    {
        category: "Server Boost Tiers",
        badges: [
            { name: "Server Boost (1 Month)", description: "Server Boosting (1 Month)", image: "https://cdn.discordapp.com/badge-icons/51040c70d4f20a921ad6674ff86fc95c.png", discordBadgeId: "guild_booster_lvl1", discordIcon: "51040c70d4f20a921ad6674ff86fc95c", badgeType: "boost", link: "https://discord.com/settings/premium" },
            { name: "Server Boost (2 Months)", description: "Server Boosting (2 Months)", image: "https://cdn.discordapp.com/badge-icons/0e4080d1d333bc7ad29ef6528b6f2fb7.png", discordBadgeId: "guild_booster_lvl2", discordIcon: "0e4080d1d333bc7ad29ef6528b6f2fb7", badgeType: "boost", link: "https://discord.com/settings/premium" },
            { name: "Server Boost (3 Months)", description: "Server Boosting (3 Months)", image: "https://cdn.discordapp.com/badge-icons/72bed924410c304dbe3d00a6e593ff59.png", discordBadgeId: "guild_booster_lvl3", discordIcon: "72bed924410c304dbe3d00a6e593ff59", badgeType: "boost", link: "https://discord.com/settings/premium" },
            { name: "Server Boost (6 Months)", description: "Server Boosting (6 Months)", image: "https://cdn.discordapp.com/badge-icons/df199d2050d3ed4ebf84d64ae83989f8.png", discordBadgeId: "guild_booster_lvl4", discordIcon: "df199d2050d3ed4ebf84d64ae83989f8", badgeType: "boost", link: "https://discord.com/settings/premium" },
            { name: "Server Boost (9 Months)", description: "Server Boosting (9 Months)", image: "https://cdn.discordapp.com/badge-icons/996b3e870e8a22ce519b3a50e6bdd52f.png", discordBadgeId: "guild_booster_lvl5", discordIcon: "996b3e870e8a22ce519b3a50e6bdd52f", badgeType: "boost", link: "https://discord.com/settings/premium" },
            { name: "Server Boost (1 Year)", description: "Server Boosting (1 Year)", image: "https://cdn.discordapp.com/badge-icons/991c9f39ee33d7537d9f408c3e53141e.png", discordBadgeId: "guild_booster_lvl6", discordIcon: "991c9f39ee33d7537d9f408c3e53141e", badgeType: "boost", link: "https://discord.com/settings/premium" },
            { name: "Server Boost (1 Year 3 Months)", description: "Server Boosting (1 Year 3 Months)", image: "https://cdn.discordapp.com/badge-icons/cb3ae83c15e970e8f3d410bc62cb8b99.png", discordBadgeId: "guild_booster_lvl7", discordIcon: "cb3ae83c15e970e8f3d410bc62cb8b99", badgeType: "boost", link: "https://discord.com/settings/premium" },
            { name: "Server Boost (1 Year 6 Months)", description: "Server Boosting (1 Year 6 Months)", image: "https://cdn.discordapp.com/badge-icons/7142225d31238f6387d9f09efaa02759.png", discordBadgeId: "guild_booster_lvl8", discordIcon: "7142225d31238f6387d9f09efaa02759", badgeType: "boost", link: "https://discord.com/settings/premium" },
            { name: "Server Boost (2 Years)", description: "Server Boosting (2 Years)", image: "https://cdn.discordapp.com/badge-icons/ec92202290b48d0879b7413d2dde3bab.png", discordBadgeId: "guild_booster_lvl9", discordIcon: "ec92202290b48d0879b7413d2dde3bab", badgeType: "boost", link: "https://discord.com/settings/premium" },
        ]
    },
    {
        category: "Bot Badges",
        badges: [
            { name: "Supports Commands", description: "Supports Commands", image: "https://cdn.discordapp.com/badge-icons/6f9e37f9029ff57aef81db857890005e.png", discordBadgeId: "bot_commands", discordIcon: "6f9e37f9029ff57aef81db857890005e", badgeType: "standard" },
            { name: "Uses Automod", description: "Uses Automod", image: "https://cdn.discordapp.com/badge-icons/f2459b691ac7453ed6039bbcfaccbfcd.png", discordBadgeId: "automod", discordIcon: "f2459b691ac7453ed6039bbcfaccbfcd", badgeType: "standard" },
        ]
    }
];

const NITRO_TIER_ORDER = [
    "premium_tenure_72_month_v2",
    "premium_tenure_60_month_v2",
    "premium_tenure_36_month_v2",
    "premium_tenure_24_month_v2",
    "premium_tenure_12_month_v2",
    "premium_tenure_6_month_v2",
    "premium_tenure_3_month_v2",
    "premium_tenure_1_month_v2",
    "premium",
] as const;

const BOOST_TIER_ORDER = [
    "guild_booster_lvl9",
    "guild_booster_lvl8",
    "guild_booster_lvl7",
    "guild_booster_lvl6",
    "guild_booster_lvl5",
    "guild_booster_lvl4",
    "guild_booster_lvl3",
    "guild_booster_lvl2",
    "guild_booster_lvl1",
] as const;

const activeBadges: ProfileBadge[] = [];
let cachedProfile: ProfileData = { ...DEFAULT_PROFILE };
const remoteProfiles = new Map<string, ProfileData>();
const mergedProfileCache = new Map<string, { input: UserProfile; merged: UserProfile; }>();
const mergedGuildProfileCache = new Map<string, { input: UserProfile; merged: UserProfile; }>();
let customAccountDate: number | null = null;
let profileOwnerId: string | null = null;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let originalExtractTimestamp: ((id: string) => number) | null = null;
let appliedPremiumOverride = false;
let iconUtilsAvatarPatched = false;
let originalIconUtilsGetUserAvatarURL: ((user: User, canAnimate?: boolean, size?: number, format?: string) => string) | null = null;
let originalIconUtilsGetGuildMemberAvatarURLSimple: ((config: {
    guildId: string;
    userId: string;
    avatar: string;
    canAnimate?: boolean;
    size?: number;
}) => string) | null = null;
let originalIconUtilsGetGuildMemberAvatarURL: ((member: { userId: string; }, canAnimate?: string) => string | null) | null = null;
let originalIconUtilsGetUserAvatarSource: ((user: User, canAnimate?: boolean, size?: number, format?: string) => { uri: string; }) | null = null;
let originalIconUtilsGetGuildMemberAvatarSource: ((config: {
    guildId: string;
    userId: string;
    avatar: string;
    canAnimate?: boolean;
    size?: number;
}) => { uri: string; }) | null = null;
let avatarOverrideRevision = 0;
let originalUserGetAvatarURL: ((guildId?: string | null, size?: number, canAnimate?: boolean, format?: string) => string) | null = null;
let originalUserGetAvatarSource: ((guildId?: string | null) => { uri: string; }) | null = null;
let patchedUserClass: {
    prototype: {
        getAvatarURL: (...args: unknown[]) => string;
        getAvatarSource?: (guildId?: string | null) => { uri: string; };
    };
} | null = null;
let tagPatchedUserClass: { prototype: object; } | null = null;
let originalUserTagGetter: ((this: User) => string) | null = null;
let cachedPremiumSince: Date | null = null;
let cachedPremiumGuildSince: Date | null = null;
let cachedPremiumSinceMs = -1;
let cachedPremiumGuildSinceMs = -1;
let userStorePatched = false;
let originalGetCurrentUser: (() => User) | null = null;
let originalGetUser: ((id: string) => User) | null = null;
let originalGetMember: ((guildId: string, userId: string) => Record<string, unknown> | null | undefined) | null = null;

const inputStyle: React.CSSProperties = {
    background: "var(--background-tertiary)",
    color: "var(--text-normal)",
    border: "1px solid var(--background-modifier-accent)",
    borderRadius: "4px",
    padding: "6px 8px",
    width: "100%",
    boxSizing: "border-box",
    fontSize: "14px",
    marginBottom: "4px"
};

const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "72px",
    resize: "vertical",
};

function getStoreKey(userId: string): string {
    return `${STORE_KEY_PREFIX}_${userId}`;
}

function getLegacyStoreKey(userId: string): string {
    return `${LEGACY_STORE_KEY_PREFIX}_${userId}`;
}

function getPresetsStoreKey(userId: string): string {
    return `${STORE_KEY_PREFIX}${PRESETS_STORE_SUFFIX}_${userId}`;
}

function trimOrNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function parseNum(value: string): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function isEnabled(): boolean {
    return cachedProfile.enabled !== false;
}

function getEffectiveProfile(userId: string | undefined | null): ProfileData | null {
    if (!userId) return null;
    const id = String(userId);
    if (profileOwnerId && id === profileOwnerId) {
        if (!isEnabled()) return null;
        return cachedProfile;
    }
    const remote = remoteProfiles.get(id);
    if (!remote || remote.enabled === false) return null;
    return remote;
}

function getSyncApiBase(): string | null {
    const url = settings.store.apiUrl?.trim();
    if (!settings.store.syncEnabled || !url) return null;
    return url.replace(/\/$/, "");
}

async function fetchRemoteProfiles() {
    const base = getSyncApiBase();
    if (!base) return;

    try {
        const res = await fetch(`${base}/profiles`, { cache: "no-cache" });
        if (!res.ok) return;

        const data = await res.json();
        const profiles = data.profiles ?? data.users ?? data;
        if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) return;

        remoteProfiles.clear();
        for (const [id, raw] of Object.entries(profiles)) {
            if (profileOwnerId && id === profileOwnerId) continue;
            remoteProfiles.set(id, normalizeProfileData(raw));
        }
        invalidateProfileCaches();
    } catch (e) {
        console.error("[CustomProfiles] fetch failed", e);
    }
}

async function uploadProfile(userId: string, profile: ProfileData) {
    const base = getSyncApiBase();
    if (!base) return;

    try {
        await fetch(`${base}/profiles/${userId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile),
        });
    } catch (e) {
        console.error("[CustomProfiles] upload failed", e);
    }
}

function startSyncInterval() {
    if (syncIntervalId) clearInterval(syncIntervalId);
    syncIntervalId = setInterval(() => {
        fetchRemoteProfiles().catch(e => console.error("[CustomProfiles] fetch failed", e));
    }, 1000 * 60 * 5);
}

function stopSyncInterval() {
    if (!syncIntervalId) return;
    clearInterval(syncIntervalId);
    syncIntervalId = null;
}

function normalizeDisplayNameStyles(data: DisplayNameStyleData | null | undefined): DisplayNameStyles | null {
    if (!data) return null;
    if (!Number.isFinite(data.font_id) || !Number.isFinite(data.effect_id)) return null;
    return {
        font_id: data.font_id,
        effect_id: data.effect_id,
        colors: Array.isArray(data.colors) ? data.colors : [],
    };
}

function buildProfileEffect(data: ProfileEffectData | null): ProfileEffect | null {
    if (!data?.skuId) return null;
    let effects: ProfileEffect["effects"];
    if (data.effectsJson) {
        try {
            effects = JSON.parse(data.effectsJson);
        } catch {
            effects = undefined;
        }
    }
    return {
        skuId: data.skuId,
        title: data.title,
        description: data.description,
        reducedMotionSrc: data.reducedMotionSrc,
        staticFrameSrc: data.staticFrameSrc,
        thumbnailPreviewSrc: data.thumbnailPreviewSrc,
        effects,
        type: 1,
    };
}

function buildNameplate(data: NameplateData | null): Nameplate | null {
    if (!data?.asset || !data.skuId) return null;
    return {
        asset: data.asset,
        skuId: data.skuId,
        label: data.label ?? "",
        palette: data.palette ?? "",
        type: 2,
    };
}

function buildAvatarDecoration(data: { asset: string; skuId: string; } | null): AvatarDecorationData | null {
    if (!data?.asset || !data.skuId) return null;
    return {
        asset: data.asset,
        skuId: data.skuId,
        expires_at: null,
    };
}

function buildPrimaryGuild(data: PrimaryGuildData | null): ClanData | null {
    if (!data?.identityGuildId || !data.tag || !data.badge) return null;
    return {
        identityGuildId: data.identityGuildId,
        tag: data.tag,
        badge: data.badge,
        identityEnabled: data.identityEnabled ?? true,
    };
}

function mergeCollectibles(existing: unknown, nameplate: Nameplate): Record<string, unknown> {
    if (existing && typeof existing === "object" && !Array.isArray(existing)) {
        try {
            return { ...(existing as Record<string, unknown>), nameplate };
        } catch {
            return { nameplate };
        }
    }
    return { nameplate };
}

function readTargetProperty(target: object, prop: string | symbol): unknown {
    const desc = Reflect.getOwnPropertyDescriptor(target, prop);
    if (desc) {
        if ("value" in desc) return desc.value;
        if (desc.get) return desc.get.call(target);
    }
    const value = Reflect.get(target, prop, target);
    if (typeof value === "function") {
        const own = Reflect.getOwnPropertyDescriptor(target, prop);
        if (!own || own.configurable) return value.bind(target);
    }
    return value;
}

function createOverlay<T extends object>(base: T, patch: Record<string, unknown>): T {
    if (Object.keys(patch).length === 0) return base;

    return new Proxy(base, {
        get(target, prop) {
            if (typeof prop === "string" && Object.prototype.hasOwnProperty.call(patch, prop)) {
                return patch[prop];
            }
            const desc = Reflect.getOwnPropertyDescriptor(target, prop);
            if (desc && !desc.configurable) {
                return desc.value ?? Reflect.get(target, prop, target);
            }
            return readTargetProperty(target, prop);
        },
        set(target, prop, value) {
            if (Object.prototype.hasOwnProperty.call(patch, prop)) {
                patch[prop as string] = value;
                return true;
            }
            return Reflect.set(target, prop, value, target);
        },
        has(target, prop) {
            return prop in patch || prop in target;
        },
        ownKeys(target) {
            return [...new Set([...Reflect.ownKeys(target), ...Reflect.ownKeys(patch)])];
        },
        getOwnPropertyDescriptor(target, prop) {
            if (Object.prototype.hasOwnProperty.call(patch, prop)) {
                return { configurable: true, enumerable: true, writable: true, value: patch[prop as string] };
            }
            return Reflect.getOwnPropertyDescriptor(target, prop);
        },
    }) as T;
}

function getBaseUser(user: User | null | undefined): User | null | undefined {
    if (!user || !profileOwnerId || String(user.id) !== profileOwnerId || !originalGetUser) return user;
    return originalGetUser(user.id) ?? user;
}

function mergeUser(user: User | null | undefined): User | null | undefined {
    if (!user) return user;
    if (!profileOwnerId || String(user.id) !== profileOwnerId) return user;

    const profile = cachedProfile;
    if (!profile || !isEnabled()) return user;

    const changes: Record<string, unknown> = {};
    if (profile.globalName) changes.globalName = profile.globalName;
    if (profile.username) {
        changes.username = profile.username;
        changes.discriminator = "0";
    }

    const decoration = buildAvatarDecoration(profile.avatarDecoration);
    if (decoration) changes.avatarDecorationData = decoration;

    const styles = normalizeDisplayNameStyles(profile.displayNameStyles);
    if (styles) changes.displayNameStyles = styles;

    const guild = buildPrimaryGuild(profile.primaryGuild);
    if (guild) changes.primaryGuild = guild;

    const nameplate = buildNameplate(profile.nameplate);
    if (nameplate) changes.collectibles = mergeCollectibles(user.collectibles, nameplate);

    if (Object.keys(changes).length === 0) return user;
    return createOverlay(user, changes);
}

function mergeMember(member: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined {
    if (!member) return member;

    const profile = getEffectiveProfile(String(member.userId));
    if (!profile) return member;

    const changes: Record<string, unknown> = {};
    if (profile.nick) changes.nick = profile.nick;

    const styles = normalizeDisplayNameStyles(profile.displayNameStyles);
    if (styles) changes.displayNameStyles = styles;

    const nameplate = buildNameplate(profile.nameplate);
    if (nameplate) changes.collectibles = mergeCollectibles(member.collectibles, nameplate);

    const decoration = profile.avatarDecoration?.asset;
    if (decoration) changes.avatarDecoration = decoration;

    if (Object.keys(changes).length === 0) return member;
    return createOverlay(member, changes);
}

function applyUserStorePatches() {
    if (userStorePatched) return;

    originalGetCurrentUser = UserStore.getCurrentUser.bind(UserStore);
    UserStore.getCurrentUser = () => mergeUser(originalGetCurrentUser!()) as User;

    originalGetUser = UserStore.getUser.bind(UserStore);
    UserStore.getUser = (id: string) => mergeUser(originalGetUser!(id)) as User;

    if (GuildMemberStore?.getMember) {
        originalGetMember = GuildMemberStore.getMember.bind(GuildMemberStore);
        GuildMemberStore.getMember = (guildId: string, userId: string) =>
            mergeMember(originalGetMember!(guildId, userId));
    }

    userStorePatched = true;
}

function removeUserStorePatches() {
    if (!userStorePatched) return;

    if (originalGetCurrentUser) {
        UserStore.getCurrentUser = originalGetCurrentUser;
        originalGetCurrentUser = null;
    }
    if (originalGetUser) {
        UserStore.getUser = originalGetUser;
        originalGetUser = null;
    }
    if (originalGetMember && GuildMemberStore) {
        GuildMemberStore.getMember = originalGetMember;
        originalGetMember = null;
    }

    userStorePatched = false;
}

async function loadPresets(userId: string): Promise<SavedPreset[]> {
    try {
        return (await DataStore.get(getPresetsStoreKey(userId))) ?? [];
    } catch {
        return [];
    }
}

async function savePresets(userId: string, presets: SavedPreset[]): Promise<void> {
    await DataStore.set(getPresetsStoreKey(userId), presets);
}

function applyMediaUrl(url: string, animated: boolean, size?: number): string {
    if (url.startsWith("data:")) return url;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();
        const isDiscordCdn = host.endsWith("discordapp.com") || host.endsWith("discordapp.net");
        if (!isDiscordCdn) return url;

        if (size) parsed.searchParams.set("size", String(size));
        parsed.searchParams.set("animated", animated ? "true" : "false");
        if (!animated) parsed.pathname = parsed.pathname.replace(/\.gifv?$/i, ".png");
        return parsed.toString();
    } catch {
        return url;
    }
}

function getCustomAvatarUrl(userId: string | undefined | null, animated: boolean, size?: number): string | null {
    const profile = getEffectiveProfile(userId);
    if (!profile?.avatarUrl) return null;
    return applyMediaUrl(profile.avatarUrl, animated, size);
}

function bumpAvatarRev() {
    avatarOverrideRevision++;
}

function applyIconUtilsAvatarPatches() {
    if (iconUtilsAvatarPatched) return;
    if (!IconUtils?.getUserAvatarURL) return;

    const rawGetUser = originalGetUser ?? UserStore.getUser.bind(UserStore);

    originalIconUtilsGetUserAvatarURL = IconUtils.getUserAvatarURL.bind(IconUtils);
    IconUtils.getUserAvatarURL = (user: User, canAnimate?: boolean, size?: number, format?: string) => {
        const custom = getCustomAvatarUrl(user?.id, canAnimate ?? false, size);
        if (custom) return custom;
        const rawUser = rawGetUser(user?.id) ?? user;
        return originalIconUtilsGetUserAvatarURL!(rawUser, canAnimate, size, format);
    };

    if (IconUtils.getGuildMemberAvatarURLSimple) {
        originalIconUtilsGetGuildMemberAvatarURLSimple = IconUtils.getGuildMemberAvatarURLSimple.bind(IconUtils);
        IconUtils.getGuildMemberAvatarURLSimple = (config: {
            guildId: string;
            userId: string;
            avatar: string;
            canAnimate?: boolean;
            size?: number;
        }) => {
            const custom = getCustomAvatarUrl(config.userId, config.canAnimate ?? false, config.size);
            if (custom) return custom;
            return originalIconUtilsGetGuildMemberAvatarURLSimple!(config);
        };
    }

    if (IconUtils.getGuildMemberAvatarURL) {
        originalIconUtilsGetGuildMemberAvatarURL = IconUtils.getGuildMemberAvatarURL.bind(IconUtils);
        IconUtils.getGuildMemberAvatarURL = (member: { userId: string; }, canAnimate?: string) => {
            const animated = canAnimate === "a" || canAnimate === "true" || canAnimate === "gif";
            const custom = getCustomAvatarUrl(member.userId, animated, undefined);
            if (custom) return custom;
            return originalIconUtilsGetGuildMemberAvatarURL!(member, canAnimate);
        };
    }

    if (IconUtils.getUserAvatarSource) {
        originalIconUtilsGetUserAvatarSource = IconUtils.getUserAvatarSource.bind(IconUtils);
        IconUtils.getUserAvatarSource = (user: User, canAnimate?: boolean, size?: number, format?: string) => {
            const custom = getCustomAvatarUrl(user?.id, canAnimate ?? false, size);
            if (custom) return { uri: custom };
            const rawUser = originalGetUser?.(user?.id) ?? user;
            return originalIconUtilsGetUserAvatarSource!(rawUser, canAnimate, size, format);
        };
    }

    if (IconUtils.getGuildMemberAvatarSource) {
        originalIconUtilsGetGuildMemberAvatarSource = IconUtils.getGuildMemberAvatarSource.bind(IconUtils);
        IconUtils.getGuildMemberAvatarSource = (config: {
            guildId: string;
            userId: string;
            avatar: string;
            canAnimate?: boolean;
            size?: number;
        }) => {
            const custom = getCustomAvatarUrl(config.userId, config.canAnimate ?? false, config.size);
            if (custom) return { uri: custom };
            return originalIconUtilsGetGuildMemberAvatarSource!(config);
        };
    }

    iconUtilsAvatarPatched = true;
}

function removeIconUtilsAvatarPatches() {
    if (!iconUtilsAvatarPatched) return;

    if (IconUtils) {
        if (originalIconUtilsGetUserAvatarURL) {
            IconUtils.getUserAvatarURL = originalIconUtilsGetUserAvatarURL;
            originalIconUtilsGetUserAvatarURL = null;
        }
        if (originalIconUtilsGetGuildMemberAvatarURLSimple) {
            IconUtils.getGuildMemberAvatarURLSimple = originalIconUtilsGetGuildMemberAvatarURLSimple;
            originalIconUtilsGetGuildMemberAvatarURLSimple = null;
        }
        if (originalIconUtilsGetGuildMemberAvatarURL) {
            IconUtils.getGuildMemberAvatarURL = originalIconUtilsGetGuildMemberAvatarURL;
            originalIconUtilsGetGuildMemberAvatarURL = null;
        }
        if (originalIconUtilsGetUserAvatarSource) {
            IconUtils.getUserAvatarSource = originalIconUtilsGetUserAvatarSource;
            originalIconUtilsGetUserAvatarSource = null;
        }
        if (originalIconUtilsGetGuildMemberAvatarSource) {
            IconUtils.getGuildMemberAvatarSource = originalIconUtilsGetGuildMemberAvatarSource;
            originalIconUtilsGetGuildMemberAvatarSource = null;
        }
    }

    iconUtilsAvatarPatched = false;
}

type UserClassLike = {
    prototype: {
        getAvatarURL: (...args: unknown[]) => string;
        getAvatarSource?: (guildId?: string | null) => { uri: string };
        tag?: string;
    };
};

function getUserClass(): UserClassLike | null {
    try {
        const user = UserStore.getCurrentUser();
        if (!user) return null;
        const ctor = user.constructor as UserClassLike | undefined;
        const proto = ctor?.prototype;
        if (!proto || typeof proto !== "object" || Array.isArray(proto)) return null;
        if (typeof proto.getAvatarURL !== "function") return null;
        return ctor ?? null;
    } catch {
        return null;
    }
}

function applyUserTagPatch() {
    if (tagPatchedUserClass) return;

    try {
        const UserClass = getUserClass();
        const proto = UserClass?.prototype;
        if (!proto || typeof proto !== "object") return;

        const desc = Object.getOwnPropertyDescriptor(proto, "tag");
        if (!desc?.get) return;

        tagPatchedUserClass = UserClass;
        originalUserTagGetter = desc.get as (this: User) => string;

        Object.defineProperty(proto, "tag", {
            get(this: User) {
                const profile = getEffectiveProfile(this.id);
                if (profile?.username) return profile.username;
                return originalUserTagGetter!.call(this);
            },
            configurable: true,
            enumerable: desc.enumerable,
        });
    } catch (e) {
        console.error("[CustomProfiles] tag patch skipped", e);
    }
}

function removeUserTagPatch() {
    if (!tagPatchedUserClass || !originalUserTagGetter) return;

    Object.defineProperty(tagPatchedUserClass.prototype, "tag", {
        get: originalUserTagGetter,
        configurable: true,
    });

    tagPatchedUserClass = null;
    originalUserTagGetter = null;
}

function applyUserAvatarMethodPatch() {
}



function removeUserAvatarMethodPatch() {
    if (!patchedUserClass) return;

    if (originalUserGetAvatarURL) {
        patchedUserClass.prototype.getAvatarURL = originalUserGetAvatarURL;
        originalUserGetAvatarURL = null;
    }
    if (originalUserGetAvatarSource) {
        patchedUserClass.prototype.getAvatarSource = originalUserGetAvatarSource;
        originalUserGetAvatarSource = null;
    }
    patchedUserClass = null;
}

function initRuntimePatches() {
    applyUserStorePatches();
    applyIconUtilsAvatarPatches();
    applyUserTagPatch();
    applyUserAvatarMethodPatch();
}

function isNativeBadge(entry: BadgeEntry): boolean {
    return Boolean(entry.discordBadgeId && entry.discordIcon);
}

function migrateBadge(entry: BadgeEntry): BadgeEntry {
    if (entry.discordBadgeId) return entry;

    for (const cat of PRESETS) {
        const preset = cat.badges.find(p => p.name === entry.name);
        if (!preset) continue;

        return {
            ...entry,
            discordBadgeId: preset.discordBadgeId,
            discordIcon: preset.discordIcon,
            badgeType: preset.badgeType,
            image: preset.image,
            link: entry.link || preset.link || "",
            sinceDate: entry.sinceDate ?? ((preset.badgeType === "nitro" || preset.badgeType === "boost") ? Date.now() : null),
        };
    }

    return entry;
}

function normalizeProfileData(data: unknown): ProfileData {
    if (Array.isArray(data)) {
        return { ...DEFAULT_PROFILE, badges: (data as BadgeEntry[]).map(migrateBadge) };
    }
    if (data && typeof data === "object" && "badges" in data) {
        const profile = data as Partial<ProfileData>;
        return {
            enabled: profile.enabled ?? true,
            badges: (profile.badges ?? []).map(migrateBadge),
            accountDate: profile.accountDate ?? null,
            themeColors: profile.themeColors ?? null,
            bio: profile.bio ?? null,
            pronouns: profile.pronouns ?? null,
            bannerUrl: profile.bannerUrl ?? null,
            avatarUrl: profile.avatarUrl ?? null,
            accentColor: profile.accentColor ?? null,
            legacyUsername: profile.legacyUsername ?? null,
            globalName: profile.globalName ?? null,
            username: profile.username ?? null,
            nick: profile.nick ?? null,
            avatarDecoration: profile.avatarDecoration ?? null,
            nameplate: profile.nameplate ?? null,
            profileEffect: profile.profileEffect ?? null,
            displayNameStyles: profile.displayNameStyles ?? null,
            primaryGuild: profile.primaryGuild ?? null,
        };
    }
    return { ...DEFAULT_PROFILE };
}

async function loadProfileData(userId: string): Promise<ProfileData> {
    try {
        const stored = await DataStore.get(getStoreKey(userId));
        if (stored != null) return normalizeProfileData(stored);

        const legacy = await DataStore.get(getLegacyStoreKey(userId));
        if (legacy != null) {
            const profile = normalizeProfileData(legacy);
            await DataStore.set(getStoreKey(userId), profile);
            return profile;
        }
    } catch (e) {
        console.error("[CustomProfiles] load failed", e);
    }
    return { ...DEFAULT_PROFILE };
}

async function saveProfileData(userId: string, profile: ProfileData): Promise<void> {
    await DataStore.set(getStoreKey(userId), profile);
    await uploadProfile(userId, profile);
}

function timestampToDateInput(timestamp: number | null | undefined): string {
    if (timestamp == null) return "";
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function dateInputToTimestamp(value: string): number | null {
    if (!value) return null;
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function getRealAccountTimestamp(userId: string): number | null {
    try {
        return Number((BigInt(userId) >> 22n) + 1420070400000n);
    } catch {
        return null;
    }
}

function applyAccountDatePatch() {
    if (originalExtractTimestamp) return;
    originalExtractTimestamp = SnowflakeUtils.extractTimestamp.bind(SnowflakeUtils);
    SnowflakeUtils.extractTimestamp = (id: string) => {
        if (customAccountDate != null && profileOwnerId && String(id) === profileOwnerId) {
            return customAccountDate;
        }
        return originalExtractTimestamp!(id);
    };
}

function removeAccountDatePatch() {
    if (!originalExtractTimestamp) return;
    SnowflakeUtils.extractTimestamp = originalExtractTimestamp;
    originalExtractTimestamp = null;
}

function invalidateProfileCaches() {
    cachedPremiumSince = null;
    cachedPremiumGuildSince = null;
    cachedPremiumSinceMs = -1;
    cachedPremiumGuildSinceMs = -1;
    mergedProfileCache.clear();
    mergedGuildProfileCache.clear();
}

function updateRuntimeHooks() {
    try {
        if (customAccountDate != null && isEnabled()) applyAccountDatePatch();
        else removeAccountDatePatch();

        if (isEnabled()) syncPremiumOverride();
        else clearPremiumOverride();

        bumpAvatarRev();
    } catch (e) {
        console.error("[CustomProfiles] updateRuntimeHooks failed", e);
    }
}

function pickHighestTier(entries: BadgeEntry[], order: readonly string[]): BadgeEntry | undefined {
    for (const id of order) {
        const match = entries.find(e => e.discordBadgeId === id);
        if (match) return match;
    }
    return entries[0];
}

function getDisplayNativeBadges(entries: BadgeEntry[]): BadgeEntry[] {
    const nativeEntries = entries.filter(isNativeBadge);
    const standard = nativeEntries.filter(e => e.badgeType === "standard");
    const nitro = pickHighestTier(nativeEntries.filter(e => e.badgeType === "nitro"), NITRO_TIER_ORDER);
    const boost = pickHighestTier(nativeEntries.filter(e => e.badgeType === "boost"), BOOST_TIER_ORDER);

    return [...standard, ...(nitro ? [nitro] : []), ...(boost ? [boost] : [])];
}

function formatSinceDate(timestamp: number | null | undefined): string {
    if (timestamp == null) return "";
    return new Date(timestamp).toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
    });
}

function getSinceDescription(entry: BadgeEntry): string {
    const date = formatSinceDate(entry.sinceDate);
    if (!date) return "";

    if (entry.badgeType === "nitro") return `Subscriber since ${date}`;
    if (entry.badgeType === "boost") return `Server boosting since ${date}`;
    return entry.description || entry.name;
}

function toNativeBadge(entry: BadgeEntry, legacyUsername: string | null) {
    let description = entry.badgeType === "nitro" || entry.badgeType === "boost"
        ? getSinceDescription(entry)
        : (entry.description || entry.name);

    if (entry.discordBadgeId === "legacy_username" && legacyUsername) {
        description = `Originally known as ${legacyUsername}`;
    }

    return {
        id: entry.discordBadgeId!,
        description,
        icon: entry.discordIcon!,
        link: entry.badgeType === "nitro" || entry.badgeType === "boost"
            ? undefined
            : (entry.link || undefined),
    };
}

function hasSpoofedNitro(): boolean {
    return getDisplayNativeBadges(cachedProfile.badges).some(e => e.badgeType === "nitro");
}

function syncPremiumOverride() {
    const state = OverridePremiumTypeStore?.getState?.();
    if (!state) return;

    const shouldOverride = hasSpoofedNitro() && state.premiumTypeActual !== 2;

    if (shouldOverride) {
        if (state.premiumTypeOverride !== 2) {
            state.premiumTypeOverride = 2;
            appliedPremiumOverride = true;
        }
    } else if (appliedPremiumOverride && !isPluginEnabled("NoNitroUpsell")) {
        state.premiumTypeOverride = undefined;
        appliedPremiumOverride = false;
    }
}

function clearPremiumOverride() {
    if (!appliedPremiumOverride || isPluginEnabled("NoNitroUpsell")) return;

    const state = OverridePremiumTypeStore?.getState?.();
    if (state) state.premiumTypeOverride = undefined;
    appliedPremiumOverride = false;
}

function colorToHex(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
}

function getPremiumSinceDate(ms: number): Date {
    if (cachedPremiumSinceMs === ms && cachedPremiumSince) return cachedPremiumSince;
    cachedPremiumSinceMs = ms;
    cachedPremiumSince = new Date(ms);
    return cachedPremiumSince;
}

function getPremiumGuildSinceDate(ms: number): Date {
    if (cachedPremiumGuildSinceMs === ms && cachedPremiumGuildSince) return cachedPremiumGuildSince;
    cachedPremiumGuildSinceMs = ms;
    cachedPremiumGuildSince = new Date(ms);
    return cachedPremiumGuildSince;
}

function getHookBadges(profile: ProfileData) {
    const displayEntries = getDisplayNativeBadges(profile.badges);
    const badges = displayEntries.map(e => toNativeBadge(e, profile.legacyUsername));
    return { displayEntries, badges };
}

function profileBadgesMatch(
    existing: UserProfile["badges"] | undefined,
    next: NonNullable<UserProfile["badges"]>,
): boolean {
    if (!existing || existing.length !== next.length) return false;
    return existing.every((badge, i) =>
        badge.id === next[i].id
        && badge.description === next[i].description
        && badge.icon === next[i].icon
    );
}

function applyProfileOverrides(user: UserProfile, profile: ProfileData): UserProfile {
    const { displayEntries, badges: hookBadges } = getHookBadges(profile);
    const changes: Partial<UserProfile> = {};

    if (displayEntries.length > 0) {
        const existing = user.badges ?? [];
        const nativeIds = new Set(displayEntries.map(e => e.discordBadgeId));
        const filteredExisting = existing.filter(b =>
            !nativeIds.has(b.id)
            && !b.id.startsWith("premium_tenure")
            && b.id !== "premium"
            && !b.id.startsWith("guild_booster")
        );

        const nextBadges = [...filteredExisting, ...hookBadges];
        if (!profileBadgesMatch(user.badges, nextBadges)) {
            changes.badges = nextBadges;
        }

        const nitroEntry = displayEntries.find(e => e.badgeType === "nitro");
        if (nitroEntry) {
            const sinceMs = nitroEntry.sinceDate ?? Date.now();
            if (user.premiumType !== 2) changes.premiumType = 2;
            if (user.premiumSince?.getTime() !== sinceMs) {
                changes.premiumSince = getPremiumSinceDate(sinceMs);
            }
        }

        const boostEntry = displayEntries.find(e => e.badgeType === "boost");
        if (boostEntry) {
            const sinceMs = boostEntry.sinceDate ?? Date.now();
            if (user.premiumGuildSince?.getTime() !== sinceMs) {
                changes.premiumGuildSince = getPremiumGuildSinceDate(sinceMs);
            }
        }
    }

    if (profile.themeColors) {
        if (user.premiumType !== 2) changes.premiumType = 2;
        const [a, b] = profile.themeColors;
        const [ua, ub] = user.themeColors ?? [];
        if (ua !== a || ub !== b) changes.themeColors = profile.themeColors;
    } else if (profile.accentColor != null) {
        if (user.premiumType !== 2) changes.premiumType = 2;
        if (user.accentColor !== profile.accentColor) {
            changes.accentColor = profile.accentColor;
        }
    }

    if (profile.bio && user.bio !== profile.bio) changes.bio = profile.bio;
    if (profile.pronouns && user.pronouns !== profile.pronouns) {
        changes.pronouns = profile.pronouns;
    }
    if (profile.legacyUsername && user.legacyUsername !== profile.legacyUsername) {
        changes.legacyUsername = profile.legacyUsername;
    }

    const effect = buildProfileEffect(profile.profileEffect);
    if (effect && user.profileEffect?.skuId !== effect.skuId) {
        changes.profileEffect = effect;
    }

    if (Object.keys(changes).length === 0) return user;
    return createOverlay(user, changes as Record<string, unknown>);
}

function profileHook(user: UserProfile) {
    const userId = user?.userId ? String(user.userId) : null;
    const profile = getEffectiveProfile(userId);
    if (!profile) return user;

    const cacheKey = userId!;
    const cached = mergedProfileCache.get(cacheKey);
    if (cached?.input === user) return cached.merged;

    const merged = applyProfileOverrides(user, profile);
    mergedProfileCache.set(cacheKey, { input: user, merged });
    return merged;
}

function guildProfileHook(profile: UserProfile) {
    const userId = profile?.userId ? String(profile.userId) : null;
    const data = getEffectiveProfile(userId);
    if (!data) return profile;

    const cacheKey = userId!;
    const cached = mergedGuildProfileCache.get(cacheKey);
    if (cached?.input === profile) return cached.merged;

    const changes: Partial<UserProfile> = {};
    if (data.bio && profile.bio !== data.bio) changes.bio = data.bio;
    if (data.pronouns && profile.pronouns !== data.pronouns) {
        changes.pronouns = data.pronouns;
    }

    const effect = buildProfileEffect(data.profileEffect);
    if (effect && profile.profileEffect?.skuId !== effect.skuId) {
        changes.profileEffect = effect;
    }

    if (Object.keys(changes).length === 0) {
        mergedGuildProfileCache.set(cacheKey, { input: profile, merged: profile });
        return profile;
    }

    const merged = createOverlay(profile, changes as Record<string, unknown>);
    mergedGuildProfileCache.set(cacheKey, { input: profile, merged });
    return merged;
}

function getOwnAvatarDecoration(user?: User | null) {
    if (!user) return null;
    return buildAvatarDecoration(getEffectiveProfile(user.id)?.avatarDecoration ?? null);
}

function BadgeModal({ modalProps, badge }: { modalProps: any; badge: BadgeEntry; }) {
    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <img src={badge.image} style={{ width: "24px", height: "24px", marginRight: "8px" }} />
                <Forms.FormTitle tag="h4" style={{ margin: 0 }}>{badge.name}</Forms.FormTitle>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", gap: "16px" }}>
                    <img src={badge.image} style={{ width: "80px", height: "80px" }} />
                    <Forms.FormTitle tag="h3" style={{ margin: 0, textAlign: "center" }}>{badge.description}</Forms.FormTitle>
                    <Forms.FormText style={{ textAlign: "center", color: "var(--text-muted)" }}>
                        {badge.name}
                    </Forms.FormText>
                </div>
            </ModalContent>
            {badge.link && (
                <ModalFooter>
                    <Button onClick={() => window.open(badge.link, "_blank")}>Open</Button>
                </ModalFooter>
            )}
        </ModalRoot>
    );
}

const customBadgesProvider: ProfileBadge = {
    id: "customprofiles_custom_badges",
    getBadges({ userId }) {
        const profile = getEffectiveProfile(userId);
        if (!profile) return [];

        return profile.badges
            .filter(entry => !isNativeBadge(entry) && entry.image)
            .map(entry => ({
                id: `customprofiles_${userId}_${entry.id}`,
                description: entry.description || entry.name,
                iconSrc: entry.image,
                position: entry.position === "START" ? BadgePosition.START : BadgePosition.END,
                onClick: () => openModal(props => (
                    <BadgeModal modalProps={props} badge={entry} />
                )),
            }));
    },
};

function registerCustomBadges() {
    if (activeBadges.length > 0) return;
    activeBadges.push(customBadgesProvider);
    addProfileBadge(customBadgesProvider);
}

async function loadProfile() {
    const currentUser = UserStore.getCurrentUser();
    if (!currentUser?.id) return;

    profileOwnerId = String(currentUser.id);
    cachedProfile = await loadProfileData(profileOwnerId);
    invalidateProfileCaches();
    customAccountDate = cachedProfile.accountDate;
    updateRuntimeHooks();
    registerCustomBadges();
    await fetchRemoteProfiles();
    if (getSyncApiBase()) await uploadProfile(profileOwnerId, cachedProfile);
}

function presetToEntry(preset: PresetBadge): BadgeEntry {
    const sinceDate = preset.badgeType === "nitro" || preset.badgeType === "boost"
        ? Date.now()
        : null;

    return {
        id: Math.random().toString(36).slice(2),
        name: preset.name,
        description: preset.description,
        image: preset.image,
        link: preset.link ?? "",
        position: "END",
        discordBadgeId: preset.discordBadgeId,
        discordIcon: preset.discordIcon,
        badgeType: preset.badgeType,
        sinceDate,
    };
}

function ProfileEditor() {
    const [profile, setProfile] = React.useState<ProfileData>({ ...DEFAULT_PROFILE });
    const [openCategory, setOpenCategory] = React.useState<string | null>(null);
    const [presets, setPresets] = React.useState<SavedPreset[]>([]);
    const [presetName, setPresetName] = React.useState("");
    const [importJson, setImportJson] = React.useState("");

    React.useEffect(() => {
        const currentUser = UserStore.getCurrentUser();
        if (!currentUser) return;
        loadProfileData(currentUser.id).then(setProfile);
        loadPresets(currentUser.id).then(setPresets);
    }, []);

    const save = async (updated: ProfileData) => {
        const currentUser = UserStore.getCurrentUser();
        if (!currentUser) return;

        setProfile(updated);
        try {
            await saveProfileData(currentUser.id, updated);
            await loadProfile();
        } catch (e) {
            console.error("[CustomProfiles] save failed", e);
        }
    };

    const updateBadge = (id: string, field: keyof BadgeEntry, value: string) =>
        save({ ...profile, badges: profile.badges.map(b => b.id === id ? { ...b, [field]: value } : b) });

    const updateBadgeSinceDate = (id: string, value: string) =>
        save({
            ...profile,
            badges: profile.badges.map(b => b.id === id ? { ...b, sinceDate: dateInputToTimestamp(value) } : b)
        });

    const removeBadge = (id: string) =>
        save({ ...profile, badges: profile.badges.filter(b => b.id !== id) });

    const addBadge = () => save({
        ...profile,
        badges: [...profile.badges, {
            id: Math.random().toString(36).slice(2),
            name: "Badge",
            description: "",
            image: "",
            link: "",
            position: "END"
        }]
    });

    const addPreset = (preset: PresetBadge) =>
        save({ ...profile, badges: [...profile.badges, presetToEntry(preset)] });

    const saveNamedPreset = async () => {
        const currentUser = UserStore.getCurrentUser();
        const name = trimOrNull(presetName);
        if (!currentUser || !name) return;

        const updated = [
            { name, profile, savedAt: Date.now() },
            ...presets.filter(p => p.name !== name),
        ];
        setPresets(updated);
        setPresetName("");
        await savePresets(currentUser.id, updated);
    };

    const loadNamedPreset = (preset: SavedPreset) => save(preset.profile);

    const deleteNamedPreset = async (name: string) => {
        const currentUser = UserStore.getCurrentUser();
        if (!currentUser) return;
        const updated = presets.filter(p => p.name !== name);
        setPresets(updated);
        await savePresets(currentUser.id, updated);
    };

    const exportProfile = () => {
        copyWithToast(JSON.stringify(profile, null, 2), "Copied");
    };

    const importProfile = async () => {
        try {
            const parsed = normalizeProfileData(JSON.parse(importJson));
            await save(parsed);
            setImportJson("");
        } catch {
            console.error("[CustomProfiles] bad import json");
        }
    };

    const realAccountDate = React.useMemo(() => {
        const currentUser = UserStore.getCurrentUser();
        if (!currentUser?.id) return null;
        return getRealAccountTimestamp(String(currentUser.id));
    }, []);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Overrides</Forms.FormTitle>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={profile.enabled}
                        onChange={e => save({ ...profile, enabled: e.target.checked })}
                    />
                    <Forms.FormText style={{ margin: 0 }}>Enabled</Forms.FormText>
                </label>
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Names</Forms.FormTitle>

                <Forms.FormText>Display Name</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.globalName ?? ""}
                    placeholder="global name"
                    onChange={e => save({ ...profile, globalName: trimOrNull(e.target.value) })}
                />

                <Forms.FormText>Username</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.username ?? ""}
                    placeholder="iyz"
                    onChange={e => save({ ...profile, username: trimOrNull(e.target.value)?.replace(/^@/, "") ?? null })}
                />

                <Forms.FormText>Server Nickname</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.nick ?? ""}
                    placeholder="guild nick"
                    onChange={e => save({ ...profile, nick: trimOrNull(e.target.value) })}
                />
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Profile Info</Forms.FormTitle>

                <Forms.FormText>Bio</Forms.FormText>
                <textarea
                    style={textareaStyle}
                    value={profile.bio ?? ""}
                    placeholder="bio"
                    onChange={e => save({ ...profile, bio: trimOrNull(e.target.value) })}
                />

                <Forms.FormText>Pronouns</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.pronouns ?? ""}
                    placeholder="they/them"
                    onChange={e => save({ ...profile, pronouns: trimOrNull(e.target.value) })}
                />

                <Forms.FormText>Legacy Username</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.legacyUsername ?? ""}
                    placeholder="oldname"
                    onChange={e => save({ ...profile, legacyUsername: trimOrNull(e.target.value) })}
                />
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Banner & Avatar</Forms.FormTitle>

                <Forms.FormText>Banner URL</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.bannerUrl ?? ""}
                    placeholder="https://..."
                    onChange={e => save({ ...profile, bannerUrl: trimOrNull(e.target.value) })}
                />

                <Forms.FormText>Avatar URL</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.avatarUrl ?? ""}
                    placeholder="https://..."
                    onChange={e => save({ ...profile, avatarUrl: trimOrNull(e.target.value) })}
                />
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Avatar Decoration</Forms.FormTitle>
                <Forms.FormText>Asset</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.avatarDecoration?.asset ?? ""}
                    placeholder="hash"
                    onChange={e => save({
                        ...profile,
                        avatarDecoration: {
                            asset: e.target.value,
                            skuId: profile.avatarDecoration?.skuId ?? "",
                        },
                    })}
                />
                <Forms.FormText>Sku ID</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.avatarDecoration?.skuId ?? ""}
                    placeholder="sku id"
                    onChange={e => {
                        const asset = profile.avatarDecoration?.asset ?? "";
                        const skuId = trimOrNull(e.target.value);
                        save({
                            ...profile,
                            avatarDecoration: trimOrNull(asset) && skuId ? { asset: asset.trim(), skuId } : null,
                        });
                    }}
                />
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={!profile.avatarDecoration}
                    onClick={() => save({ ...profile, avatarDecoration: null })}
                >
                    Clear
                </Button>
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Nameplate</Forms.FormTitle>
                <Forms.FormText>Asset</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.nameplate?.asset ?? ""}
                    onChange={e => save({
                        ...profile,
                        nameplate: {
                            asset: e.target.value,
                            skuId: profile.nameplate?.skuId ?? "",
                            label: profile.nameplate?.label,
                            palette: profile.nameplate?.palette,
                        },
                    })}
                />
                <Forms.FormText>Sku ID</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.nameplate?.skuId ?? ""}
                    onChange={e => save({
                        ...profile,
                        nameplate: profile.nameplate?.asset && trimOrNull(e.target.value)
                            ? { ...profile.nameplate, asset: profile.nameplate.asset, skuId: e.target.value.trim() }
                            : null,
                    })}
                />
                <Forms.FormText>Label</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.nameplate?.label ?? ""}
                    onChange={e => profile.nameplate && save({
                        ...profile,
                        nameplate: { ...profile.nameplate, label: trimOrNull(e.target.value) ?? "" },
                    })}
                />
                <Forms.FormText>Palette</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.nameplate?.palette ?? ""}
                    onChange={e => profile.nameplate && save({
                        ...profile,
                        nameplate: { ...profile.nameplate, palette: trimOrNull(e.target.value) ?? "" },
                    })}
                />
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={!profile.nameplate}
                    onClick={() => save({ ...profile, nameplate: null })}
                >
                    Clear
                </Button>
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Profile Effect</Forms.FormTitle>
                <Forms.FormText>Sku ID</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.profileEffect?.skuId ?? ""}
                    onChange={e => save({
                        ...profile,
                        profileEffect: trimOrNull(e.target.value)
                            ? { ...(profile.profileEffect ?? {}), skuId: e.target.value.trim() }
                            : null,
                    })}
                />
                <Forms.FormText>Static Frame URL</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.profileEffect?.staticFrameSrc ?? ""}
                    onChange={e => profile.profileEffect && save({
                        ...profile,
                        profileEffect: { ...profile.profileEffect, staticFrameSrc: trimOrNull(e.target.value) ?? undefined },
                    })}
                />
                <Forms.FormText>Reduced Motion URL</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.profileEffect?.reducedMotionSrc ?? ""}
                    onChange={e => profile.profileEffect && save({
                        ...profile,
                        profileEffect: { ...profile.profileEffect, reducedMotionSrc: trimOrNull(e.target.value) ?? undefined },
                    })}
                />
                <Forms.FormText>Effects JSON</Forms.FormText>
                <textarea
                    style={textareaStyle}
                    value={profile.profileEffect?.effectsJson ?? ""}
                    placeholder='[{"src":"..."}]'
                    onChange={e => profile.profileEffect && save({
                        ...profile,
                        profileEffect: { ...profile.profileEffect, effectsJson: trimOrNull(e.target.value) ?? undefined },
                    })}
                />
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={!profile.profileEffect}
                    onClick={() => save({ ...profile, profileEffect: null })}
                >
                    Clear
                </Button>
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Display Name Styles</Forms.FormTitle>
                <Forms.FormText>Font ID</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.displayNameStyles?.font_id ?? ""}
                    onChange={e => {
                        const font_id = parseNum(e.target.value);
                        const effect_id = profile.displayNameStyles?.effect_id;
                        save({
                            ...profile,
                            displayNameStyles: font_id != null && effect_id != null
                                ? { font_id, effect_id, colors: profile.displayNameStyles?.colors ?? [] }
                                : null,
                        });
                    }}
                />
                <Forms.FormText>Effect ID</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.displayNameStyles?.effect_id ?? ""}
                    onChange={e => {
                        const effect_id = parseNum(e.target.value);
                        const font_id = profile.displayNameStyles?.font_id;
                        save({
                            ...profile,
                            displayNameStyles: font_id != null && effect_id != null
                                ? { font_id, effect_id, colors: profile.displayNameStyles?.colors ?? [] }
                                : null,
                        });
                    }}
                />
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                    {[0, 1, 2].map(i => (
                        <ColorPicker
                            key={i}
                            color={profile.displayNameStyles?.colors?.[i] ?? 0xffffff}
                            label={<BaseText size="xs" style={{ marginTop: "4px" }}>Color {i + 1}</BaseText>}
                            onChange={(color: number) => {
                                const base = profile.displayNameStyles ?? { font_id: 0, effect_id: 0, colors: [] };
                                const colors = [...base.colors];
                                colors[i] = color;
                                save({ ...profile, displayNameStyles: { ...base, colors } });
                            }}
                        />
                    ))}
                </div>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={!profile.displayNameStyles}
                    onClick={() => save({ ...profile, displayNameStyles: null })}
                >
                    Clear
                </Button>
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Clan Tag</Forms.FormTitle>
                <Forms.FormText>Guild ID</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.primaryGuild?.identityGuildId ?? ""}
                    onChange={e => save({
                        ...profile,
                        primaryGuild: {
                            identityGuildId: e.target.value,
                            tag: profile.primaryGuild?.tag ?? "",
                            badge: profile.primaryGuild?.badge ?? "",
                            identityEnabled: profile.primaryGuild?.identityEnabled,
                        },
                    })}
                />
                <Forms.FormText>Tag</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.primaryGuild?.tag ?? ""}
                    onChange={e => profile.primaryGuild && save({
                        ...profile,
                        primaryGuild: { ...profile.primaryGuild, tag: e.target.value },
                    })}
                />
                <Forms.FormText>Badge Hash</Forms.FormText>
                <input
                    style={inputStyle}
                    value={profile.primaryGuild?.badge ?? ""}
                    onChange={e => profile.primaryGuild && save({
                        ...profile,
                        primaryGuild: { ...profile.primaryGuild, badge: e.target.value },
                    })}
                />
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={!profile.primaryGuild}
                    onClick={() => save({ ...profile, primaryGuild: null })}
                >
                    Clear
                </Button>
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Profile Gradient</Forms.FormTitle>

                {profile.themeColors && (
                    <div
                        style={{
                            height: "48px",
                            borderRadius: "8px",
                            marginBottom: "12px",
                            background: `linear-gradient(90deg, ${colorToHex(profile.themeColors[0])}, ${colorToHex(profile.themeColors[1])})`,
                        }}
                    />
                )}

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
                    <ColorPicker
                        color={profile.themeColors?.[0] ?? DEFAULT_THEME[0]}
                        label={<BaseText size="xs" style={{ marginTop: "4px" }}>Primary</BaseText>}
                        onChange={(color: number) => save({
                            ...profile,
                            themeColors: [
                                color,
                                profile.themeColors?.[1] ?? DEFAULT_THEME[1],
                            ],
                        })}
                    />
                    <ColorPicker
                        color={profile.themeColors?.[1] ?? DEFAULT_THEME[1]}
                        label={<BaseText size="xs" style={{ marginTop: "4px" }}>Accent</BaseText>}
                        onChange={(color: number) => save({
                            ...profile,
                            themeColors: [
                                profile.themeColors?.[0] ?? DEFAULT_THEME[0],
                                color,
                            ],
                        })}
                    />
                </div>

                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    style={{ marginTop: "12px" }}
                    disabled={profile.themeColors == null}
                    onClick={() => save({ ...profile, themeColors: null })}
                >
                    Clear
                </Button>
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Accent Color</Forms.FormTitle>

                <ColorPicker
                    color={profile.accentColor ?? 0x5865f2}
                    label={<BaseText size="xs" style={{ marginTop: "4px" }}>Accent</BaseText>}
                    onChange={(color: number) => save({ ...profile, accentColor: color })}
                />

                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    style={{ marginTop: "12px" }}
                    disabled={profile.accentColor == null}
                    onClick={() => save({ ...profile, accentColor: null })}
                >
                    Clear
                </Button>
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Saved Presets</Forms.FormTitle>

                <Forms.FormText>Preset Name</Forms.FormText>
                <input
                    style={inputStyle}
                    value={presetName}
                    placeholder="preset name"
                    onChange={e => setPresetName(e.target.value)}
                />
                <Button size={Button.Sizes.SMALL} disabled={!trimOrNull(presetName)} onClick={saveNamedPreset}>
                    Save Preset
                </Button>

                {presets.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
                        {presets.map(preset => (
                            <div key={preset.name} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <Forms.FormText style={{ flex: 1 }}>{preset.name}</Forms.FormText>
                                <Button size={Button.Sizes.SMALL} onClick={() => loadNamedPreset(preset)}>Load</Button>
                                <Button size={Button.Sizes.SMALL} color={Button.Colors.RED} onClick={() => deleteNamedPreset(preset.name)}>Delete</Button>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                    <Button size={Button.Sizes.SMALL} onClick={exportProfile}>Export JSON</Button>
                </div>

                <Forms.FormText style={{ marginTop: "12px" }}>Import JSON</Forms.FormText>
                <textarea
                    style={textareaStyle}
                    value={importJson}
                    placeholder="{}"
                    onChange={e => setImportJson(e.target.value)}
                />
                <Button size={Button.Sizes.SMALL} disabled={!importJson.trim()} onClick={importProfile}>
                    Import
                </Button>
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "8px" }}>Account Creation Date</Forms.FormTitle>

                <Forms.FormText>Custom Date</Forms.FormText>
                <input
                    type="date"
                    style={inputStyle}
                    value={timestampToDateInput(profile.accountDate)}
                    onChange={e => save({ ...profile, accountDate: dateInputToTimestamp(e.target.value) })}
                />

                {realAccountDate != null && (
                    <Forms.FormText style={{ marginBottom: "8px", color: "var(--text-muted)" }}>
                        Actual: {new Date(realAccountDate).toLocaleDateString()}
                    </Forms.FormText>
                )}

                <Button
                    size={Button.Sizes.SMALL}
                    disabled={profile.accountDate == null}
                    onClick={() => save({ ...profile, accountDate: null })}
                >
                    Clear
                </Button>
            </div>

            <div style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px" }}>
                <Forms.FormTitle tag="h5" style={{ marginBottom: "12px" }}>Presets</Forms.FormTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {PRESETS.map(cat => (
                        <div key={cat.category}>
                            <div
                                onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
                                style={{ cursor: "pointer", padding: "6px 8px", background: "var(--background-tertiary)", borderRadius: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                            >
                                <Forms.FormText style={{ fontWeight: 600 }}>{cat.category}</Forms.FormText>
                                <Forms.FormText>{openCategory === cat.category ? "▲" : "▼"}</Forms.FormText>
                            </div>
                            {openCategory === cat.category && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "8px 4px" }}>
                                    {cat.badges.map(preset => (
                                        <div
                                            key={preset.name}
                                            title={preset.name}
                                            onClick={() => addPreset(preset)}
                                            style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "6px", borderRadius: "6px", background: "var(--background-tertiary)", width: "64px" }}
                                        >
                                            <img src={preset.image} style={{ width: "24px", height: "24px" }} />
                                            <Forms.FormText style={{ fontSize: "10px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{preset.name}</Forms.FormText>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {profile.badges.map(badge => (
                <div key={badge.id} style={{ background: "var(--background-secondary)", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <Forms.FormTitle tag="h5" style={{ margin: 0 }}>{badge.name || "Badge"}</Forms.FormTitle>
                        {badge.image && <img src={badge.image} title={badge.description} style={{ width: "24px", height: "24px" }} />}
                    </div>

                    <Forms.FormText>Name</Forms.FormText>
                    <input style={inputStyle} value={badge.name} onChange={e => updateBadge(badge.id, "name", e.target.value)} />

                    <Forms.FormText>Description</Forms.FormText>
                    <input style={inputStyle} value={badge.description} onChange={e => updateBadge(badge.id, "description", e.target.value)} />

                    {!isNativeBadge(badge) && (
                        <>
                            <Forms.FormText>Image URL</Forms.FormText>
                            <input style={inputStyle} value={badge.image} placeholder="https://i.imgur.com/..." onChange={e => updateBadge(badge.id, "image", e.target.value)} />
                        </>
                    )}

                    {(badge.badgeType === "nitro" || badge.badgeType === "boost") && (
                        <>
                            <Forms.FormText>{badge.badgeType === "nitro" ? "Subscriber Since" : "Boosting Since"}</Forms.FormText>
                            <input
                                type="date"
                                style={inputStyle}
                                value={timestampToDateInput(badge.sinceDate)}
                                onChange={e => updateBadgeSinceDate(badge.id, e.target.value)}
                            />
                        </>
                    )}

                    {badge.badgeType !== "nitro" && badge.badgeType !== "boost" && (
                        <>
                            <Forms.FormText>Link</Forms.FormText>
                            <input style={inputStyle} value={badge.link} placeholder="https://..." onChange={e => updateBadge(badge.id, "link", e.target.value)} />
                        </>
                    )}

                    {!isNativeBadge(badge) && (
                        <>
                            <Forms.FormText>Position</Forms.FormText>
                            <select value={badge.position} onChange={e => updateBadge(badge.id, "position", e.target.value)} style={inputStyle}>
                                <option value="END">End</option>
                                <option value="START">Start</option>
                            </select>
                        </>
                    )}

                    <Button color={Button.Colors.RED} size={Button.Sizes.SMALL} style={{ marginTop: "8px" }} onClick={() => removeBadge(badge.id)}>
                        Remove
                    </Button>
                </div>
            ))}

            <Button size={Button.Sizes.SMALL} onClick={addBadge}>+ Add Custom Badge</Button>
        </div>
    );
}

const settings = definePluginSettings({
    syncEnabled: {
        type: OptionType.BOOLEAN,
        description: "Upload your profile and fetch others (requires sync API URL)",
        default: true,
    },
    apiUrl: {
        type: OptionType.STRING,
        description: "Sync API base URL (You can self-host this!)",
        default: "https://customprofiles.paragn.lol/",
    },
    profile: {
        type: OptionType.COMPONENT,
        description: "",
        component: ProfileEditor
    }
});

export default definePlugin({
    name: "CustomProfiles",
    description: "Custom profile editor with sync between plugin users",
    authors: [{ name: "iitten", id: 1322389041030762538n }],
    dependencies: ["BadgeAPI"],
    settings,

    patches: [
        {
            find: "UserProfileStore",
            replacement: [
                {
                    match: /(?<=getUserProfile\(\i\){return )(.+?)(?=})/,
                    replace: "$self.profileHook($1)"
                },
                {
                    match: /(?<=getGuildMemberProfile\(\i,\i\){return )(.+?)(?=})/,
                    replace: "$self.guildProfileHook($1)"
                },
            ],
        },
        {
            find: ':"SHOULD_LOAD");',
            replacement: {
                match: /\i(?:\?)?.getPreviewBanner\(\i,\i,\i\)(?=.{0,100}"COMPLETE")/,
                replace: "$self.patchBannerUrl(arguments[0])||$&"
            }
        },
    ],

    profileHook,
    guildProfileHook,
    getOwnAvatarDecoration,

    patchBannerUrl({ displayProfile }: { displayProfile?: { userId?: string; }; }) {
        const bannerUrl = getEffectiveProfile(displayProfile?.userId)?.bannerUrl;
        if (bannerUrl) return bannerUrl;
    },

    flux: {
        CONNECTION_OPEN() {
            loadProfile().catch(e => console.error("[CustomProfiles] load failed", e));
        },
    },

    start() {
        initRuntimePatches();
        registerCustomBadges();
        startSyncInterval();
        loadProfile().catch(e => console.error("[CustomProfiles] load failed", e));
    },

    stop() {
        stopSyncInterval();
        for (const b of activeBadges) removeProfileBadge(b);
        activeBadges.length = 0;
        remoteProfiles.clear();
        cachedProfile = { ...DEFAULT_PROFILE };
        customAccountDate = null;
        profileOwnerId = null;
        avatarOverrideRevision = 0;
        removeAccountDatePatch();
        removeUserStorePatches();
        removeUserTagPatch();
        removeIconUtilsAvatarPatches();
        removeUserAvatarMethodPatch();
        clearPremiumOverride();
    }
});
