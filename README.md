# 🐤 Flappy Bird - Retro Arcade Edition

A polished, responsive, retro arcade implementation of the classic Flappy Bird game built with pure HTML5 Canvas and the Web Audio API. Zero dependencies, instant loading, high-DPI crisp rendering, and ready to deploy to Vercel in seconds!

![Game Preview](favicon.svg)

---

## 🎮 Key Features

- **Procedural Web Audio Engine**: 100% synthesized sound effects via Web Audio API (flap, point chime, collision thud, death slide, and high score fanfare). No missing audio files, 0ms latency, and works offline!
- **3 Bird Skins**:
  - 🐥 **Classic Yellow**: The iconic bird with red crest.
  - 🤖 **Cyber Neon**: Cyberpunk cyan & magenta with neon accents.
  - 🔥 **Crimson Phoenix**: Fiery ruby red with gold plumage.
- **3 Difficulty Settings**:
  - **Chill**: Wider pipe gaps and relaxed speed.
  - **Classic**: Original arcade balance and gap distance.
  - **Hardcore**: Narrow gaps and faster pace for hardcore players.
- **Dynamic Day/Night Cycle**:
  - Sky transitions smoothly between **Sunny Day**, **Golden Sunset**, and **Starry Night** as you score points!
- **Juice & Polish**:
  - High-DPI / Retina display crisp rendering (`window.devicePixelRatio`).
  - Delta-time normalized physics (smooth 60fps / 144Hz / 240Hz monitors).
  - Parallax scrolling background (distant city skyline, drifting clouds, retro striped ground).
  - Particle systems (flapping feather puffs, golden score sparks, collision explosion).
  - Screen shake and flash effects on impact.
  - Optional **Retro CRT Scanlines** filter toggle.
  - Medal awards: 🥉 Bronze (10+), 🥈 Silver (25+), 🥇 Gold (40+), 💎 Platinum (60+).
  - High score tracking stored in `localStorage`.
  - Native Web Share API integration with clipboard copy fallback.

---

## 🕹️ Controls

| Action | Keyboard | Mouse / Touchscreen |
| :--- | :--- | :--- |
| **Flap / Jump** | `Spacebar`, `Arrow Up`, or `W` | Click / Tap anywhere on screen |
| **Pause / Resume** | `P` or `Escape` | Tap ⏸️ button |
| **Mute / Unmute** | `M` | Tap 🔊 button |
| **Toggle Scanlines** | — | Tap 📺 button |

---

## 🚀 Running Locally

No build tools are strictly required. You can serve it directly with any static server:

```bash
# Using Python
python3 -m http.server 3000

# Using Node.js
npx serve .
```

Then open `http://localhost:3000` in your web browser.

---

## ☁️ Deploying to Vercel

### Method 1: Using Vercel CLI (Instant)

Run the following command in the project root:

```bash
# Deploy to preview
npx vercel

# Deploy directly to production
npx vercel --prod
```

### Method 2: Via GitHub / Git (Recommended for Continuous Deployment)

1. Initialize Git and commit the files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Flappy Bird Arcade"
   ```
2. Push the repository to your GitHub/GitLab account:
   ```bash
   git remote add origin https://github.com/<your-username>/flappy-bird.git
   git branch -M main
   git push -u origin main
   ```
3. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
4. Click **Deploy**. Vercel will automatically detect the static project and deploy it instantly!
