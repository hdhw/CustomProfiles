# CustomProfiles

Equicord userplugin. Local profile overrides — client-side only, others still see your real profile.

Requires **BadgeAPI** (built into Equicord). Settings: **Equicord → Plugins → CustomProfiles**.

## What it does

- **Toggle** — enable/disable overrides without wiping data
- **Names** — display name, username, server nick
- **Profile** — bio, pronouns, legacy username (for the legacy badge tooltip)
- **Media** — banner URL, avatar URL
- **Collectibles** — avatar decoration, nameplate, profile effect, display name styles (font/effect id + colors)
- **Clan tag** — guild id, tag, badge hash
- **Colors** — profile gradient (2 colors) or accent color
- **Account date** — fake member-since date, reset to real anytime
- **Badges** — discord presets (general, nitro tiers, boost tiers, bot) + custom image badges with start/end position; highest nitro/boost tier wins; nitro/boost since dates; nitro spoof unlocks nitro-gated ui locally
- **Presets** — save/load named looks, export/import json

No custom status.

## Install

Needs git + node lts.

**Windows:** `install.bat` or `.\install.ps1`

**Linux/macOS:** `chmod +x install.sh && ./install.sh`

Clones Equicord if missing, copies plugin, `pnpm install`, `pnpm build`, `pnpm inject`.

Custom path:

```bash
EQUICORD_PATH=/path/to/Equicord ./install.sh
```

```powershell
$env:EQUICORD_PATH = "C:\path\to\Equicord"; .\install.ps1
```

## After install

1. Restart Discord
2. Enable **CustomProfiles** in plugin settings

## Notes

- Per-account DataStore
- `CustomBadges` data migrates on first load
- Reload discord if avatar url change doesn't stick
- Close discord before install if inject fails
