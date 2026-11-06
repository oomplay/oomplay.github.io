# OOM's Desktop 🐧

A minimal personal website styled like a GNOME desktop — stripped down to the
essentials: one fully working fake terminal.

Live at: **https://oomplay.github.io**

## Features

- **Terminal** — try `help`, `ls`, `cat`, `whoami`, `neofetch`, `htop`,
  `ping`, `sudo apt update`, `cowsay "hi"` (and more)
- **Window controls** — drag, minimize, maximize and close the terminal
  window like a real GNOME window
- **Mobile friendly** and respects `prefers-reduced-motion`

## Structure

| File         | Purpose                                           |
| ------------ | ------------------------------------------------- |
| `index.html` | Page markup (top bar, dock, app menu)             |
| `style.css`  | All styling, including reduced-motion fallbacks   |
| `app.js`     | Window manager, terminal emulator, clock, particles |

## Development

Any static file server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## License

[MIT](LICENSE)

