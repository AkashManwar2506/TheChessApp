# The Chess App

A modern, single-page chess app built with React + TypeScript + Vite. Play locally or against a lightweight CPU, with tap-to-move controls, move validation, pretty highlights, and automatic position persistence.

- Live site: https://your-deployment-link.example.com

## Features

- Tap-to-select and tap-to-move (no dragging needed)
- Legal-move highlights
  - Green dot for quiet moves
  - Red square border for captures
- Play vs Human or CPU (capture-priority random engine)
- Choose your side (White or Black); board flips accordingly
- Undo and New Game (with a confirmation modal)
- Position, move history, and theme persisted in localStorage
- Responsive, clean UI with Tailwind CSS

## Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- Chess logic: `chess.js`
- Board UI: `react-chessboard` (v5 API)
- Confetti: `canvas-confetti`

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
git clone https://github.com/your-user/the-chess-app.git
cd the-chess-app
npm install
```

### Development

```bash
npm run dev
```

Open the local URL printed in your terminal (default `http://localhost:5173/`).

### Build

```bash
npm run build
npm run preview
```

### Project Structure

```
src/
  App.tsx          # Main app UI and logic
  main.tsx         # App bootstrap
  index.css        # Tailwind entry and base styles
public/
  chess-logo.svg   # App logo & favicon
index.html         # Vite index with favicon
```

## Usage

- Click a piece to select; legal destination squares appear.
- Click a destination square to move.
- Use the header controls to switch opponent (Human/CPU) and pick your color.
- Undo reverses the last move.
- New Game opens a confirmation dialog and then resets.
- If you defeat the CPU, confetti celebrates your win.

## Customization

- Colors and UI: adjust Tailwind classes in `src/App.tsx` and `src/index.css`.
- CPU: replace the simple engine in `makeCpuMove` with Stockfish WASM if desired.
- Persistence: stored under `thechessapp.*` keys in localStorage.

## License

MIT
