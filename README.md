# ⚔️ Empires of the Web (AoE Look-Alike RTS)

A medieval browser-based Real-Time Strategy (RTS) game built with Vanilla JavaScript, HTML5 Canvas, Web Audio API, and Vite. Inspired by classic strategy games like *Age of Empires II*, featuring real-time resource gathering, base building, tech tree progression, Fog of War, tactical combat, and multi-enemy warfare across 80x80 maps.

---

## 🌟 What's New in this Major Update

### 🏛️ Standalone Match Lobby & Landing Page
- When opening the game, a dedicated full-screen **Main Menu & Match Setup Lobby** appears before any match begins.
- No nation is assumed by default—choose your sovereign kingdom, configure participating opponents, map type, and AI difficulty before clicking **⚔️ COMMENCE BATTLE**.
- Return to the Lobby at any time in-game via the top bar or pause menu.

### 🤝 Diplomatic Alliances & Opponent Selection
- Choose your sovereign kingdom from **🌸 Japanese**, **🏯 Korean**, **🐉 Chinese**, or **🐘 Indian** empires.
- For each remaining kingdom, choose whether they participate and their diplomatic stance:
  - ⚔️ **Enemy Rival**: Hostile kingdom that raids you and your allies.
  - 🤝 **Allied Kingdom**: Friendly co-belligerent that trains armies, assists in combat, shares vision/Fog of War, and benefits from your Fortress healing aura.
- Live configuration badge dynamically reflects your scenario: **⚔️ 1 vs 3 Total War**, **🤝 2 vs 2 Grand Alliance**, **⚔️ 1 vs 1 Historic Duel**, etc.

### 🗺️ Dynamic Realm Sizing (50×50 to 80×80)
- The map is no longer stuck at a single size! Realm dimensions scale dynamically based on participating kingdoms:
  - **2 Kingdoms (1v1)**: **50×50 Compact Skirmish** (2,400 × 2,400 px) for tight, fast-paced tactical battles.
  - **3 Kingdoms (1v2 / 2v1)**: **65×65 Expanded Realm** (3,120 × 3,120 px) with expansive frontier resources.
  - **4 Kingdoms (1v3 / 2v2)**: **80×80 Colossal Empire** (3,840 × 3,840 px) for colossal multi-front warfare.

### 🎲 Non-Linear Procedural Landscapes & Randomized Spawns
- **Randomized Base Spawns**: Starting base quadrants are shuffled every match—you will no longer spawn in the same corner!
- **Procedural River Valley**: Winding sinusoidal river with randomized flow direction, amplitude, and phase, linked by **5-tile wide stone bridges**.
- **Procedural Mountain Pass**: Randomized rocky crags, ravine chasms, and wide paved mountain passes.
- **Procedural Desert Oasis**: Scattered palm oases with water lakes and stone causeways across dynamic dunes.
- **Dynamic Resource Groves**: Base starter groves, gold veins, and foraging bushes generated around each Town Center, plus procedural frontier deposits.

### 🏰 Fortress Bastion & Healing Sanctuary
- **Multi-Arrow Volleys**: Town Center Fortresses automatically fire simultaneous arrows (base: 3, upgradeable to 5 or 7 with Blacksmith research or Korean bonuses).
- **Sanctuary Healing**: Injured friendly or allied soldiers stationed near the Fortress heal over time (+8 HP/sec) while consuming 1 Food per 8 HP from your stockpile.
- **Blacksmith Tech**: Research *Arrow Slits* (+2 fortress arrows, +1 tower arrow) and *Bodkin Arrows* (+range & damage).

---

## ⌨️ RTS Controls & Shortcuts
- **W A S D / Arrow Keys**: Pan camera across the realm.
- **Mouse Wheel**: Smooth zoom in / out (supports 0.35x tactical zoom).
- **Left-Click**: Select individual unit, building, or resource node.
- **Left-Click & Drag**: Box-select multiple troops.
- **Right-Click**: Issue move orders, attack enemies, gather resources, or set building rally points.
- **Ctrl + 1 - 9**: Assign selected troops to a numbered Control Group.
- **1 - 9**: Select Control Group (double-tap to snap camera to group).
- **. (Period)**: Cycle and focus on the next Idle Villager.
- **H**: Jump camera to Town Center Fortress.
- **Spacebar**: Snap camera to the location of the latest raid warning.
- **Escape**: Pause / Settings menu (or cancel building placement).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation & Local Run
```bash
# 1. Clone the repository
git clone https://github.com/AuroSilalahi/AoELookAlike.git

# 2. Navigate to the project directory
cd AoELookAlike

# 3. Install dependencies
npm install

# 4. Start the development server
npm run dev
```

Open your browser at `http://localhost:5173/` to play!

### Production Build
```bash
npm run build
npm run preview
```

---

## 📜 License
MIT License. Created by Auro Silalahi.
