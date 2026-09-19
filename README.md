# Study Timer
[🇧🇷 Português](README.pt-BR.md)

A plugin for [Obsidian](https://obsidian.md) that tracks your study time right in the sidebar: stopwatch, Pomodoro, color-coded subjects, statistics, and a heatmap of recent days. Inspired by the **YPT (Yeolpumta)** app.

## Features
- **Stopwatch**: the main clock shows the total time studied today.
- **Pomodoro**: focus and break with configurable durations (default 25/5) and a beep at the end of each phase (can be turned off).
- **Custom subjects**: create and remove subjects and pick a color for each one. Below the clock you see today's time for the selected subject.
- **Statistics**: totals for today, this week and this month, plus today's time per subject.
- **Heatmap**, GitHub-style, covering the last 84 days.
- **Obsidian colors**: the plugin's highlight follows Obsidian's accent color and the light/dark theme.

## Installation

### Manual (from a release)
1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](../../releases/latest).
2. Copy the three files into `YOUR_VAULT/.obsidian/plugins/study-timer/`.
3. In Obsidian, open **Settings -> Community plugins**, reload the list and enable **Study Timer**.

Requires Obsidian **1.4.4** or later.

### For development

```bash
npm install
npm run dev     # rebuilds on every change
npm run build   # production build (generates main.js)
```

Copy `main.js`, `manifest.json` and `styles.css` to the plugin folder in your vault.

## How to use
1. Click the clock icon in the left sidebar.
2. Type a subject in *Novo assunto* (New subject), pick a color and click **Adicionar** (Add). Click a subject to select it, the colored dot to change its color, and the **×** to remove it (history that was already recorded is kept).
3. Press ▶ to start and ❚❚ to pause. Only whole minutes are saved.
4. Switch between **Cronômetro** (Stopwatch) and **Pomodoro** at the top of the panel.


## Data and privacy
Everything stays on your computer: the history in `data.json` (in the plugin folder) and, if today's Daily Note exists, the day's total in its frontmatter. The plugin makes no network requests and sends nothing out.

## Roadmap
- Manual reset button for the day.
- Export the full history as CSV.

## Credits
Created by **Miel Velazquez**.

Inspired by the YPT (Yeolpumta) app. This project is independent and is not affiliated with YPT or its creators.

## License
[MIT](LICENSE)