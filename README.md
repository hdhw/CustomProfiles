# CustomProfiles

Equicord userplugin. Local profile overrides (client-side and plugin-sided only.)

Requires **BadgeAPI**. Settings: **Equicord → Plugins → CustomProfiles**.

Overrides: toggle, display name, username, server nick, bio, pronouns, legacy username, banner, avatar, avatar decoration, nameplate, profile effect, display name styles, clan tag, profile gradient, accent color, account date, badges (discord presets + custom), named presets, json export/import.

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
- When trying to vist the Plugins menu, If you experience a crash, Try to delete everything in the CustomProfiles folder, Except for index.tsx. After that run ```pnpm build``` and if you havent already. ```pnpm inject```
