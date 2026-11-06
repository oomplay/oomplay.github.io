# OOM's Desktop 🐧

A playful personal website styled like a GNOME desktop: draggable glassmorphism
windows, a working fake terminal, a dock, an app switcher — and one (1) rickroll
hidden in "Firefox".

Live at: **https://oomplay.github.io**

## Features

- **Windows** — open, close, minimize, maximize, drag and focus the apps in the dock
- **Terminal** — try `help`, `ls`, `cat`, `whoami`, `neofetch`, `htop`,
  `ping`, `sudo apt update`, `cowsay "hi"` (and more)
- **Profile** — content is driven by [`data.json`](data.json); edit that file to
  change the name, likes, languages, games and animals without touching code
- **Mobile friendly** and respects `prefers-reduced-motion`

## Structure

| File         | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `index.html` | Page markup (top bar, dock, app menu)              |
| `style.css`  | All styling, including reduced-motion fallbacks    |
| `app.js`     | Window manager, terminal emulator, clock, particles |
| `data.json`  | Profile data shown in the windows                  |

## Development

Any static file server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Customizing

Edit `data.json` — strings for `name`, `pronouns`, `birthday`, `dislike`,
`greeting`, arrays for `likes`/`games`/`animals`, and a `languages` object.
Invalid or missing fields fall back to safe defaults automatically.

## License

[MIT](LICENSE)
