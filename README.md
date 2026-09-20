# ⚔️ Empires of the Web (AoE Look-Alike RTS)

A medieval browser-based Real-Time Strategy (RTS) game built with Vanilla JavaScript, HTML5 Canvas, Web Audio API, and Vite. Inspired by classic strategy games like *Age of Empires II*, featuring real-time resource gathering, base building, tech tree progression, Fog of War, tactical combat, and adaptive AI invasions.

---

## 🌟 Features

### 👁️ Dynamic Fog of War
- **3-Stage Visibility**: `Unexplored` (shrouded black), `Explored` (dimmed terrain & structures), and `Visible` (real-time field-of-view).
- Hostile troops and raids stay hidden under the fog until scouted by your units or watch towers.
- Real-time radar minimap shading matching your explored map.

### 🏰 Base Building & Sustainable Economy
- **🏰 Town Center**: Base command hub, resource dropoff, and villager training facility.
- **🏠 House**: Increases population limit (+5 per house).
- **🛡️ Barracks**: Military training facility for Swordsmen, Archers, and Knights.
- **🗼 Watch Tower**: Defensive fortification that automatically fires arrows at enemy invaders within range.
- **⚒️ Blacksmith**: Military workshop for weapon, armor, and economy tech research.
- **🌾 Farm**: Sustainable crop field with renewable food reserves so your economy thrives after wild berry bushes run out.
- **🚩 Building Rally Points**: Right-click the ground while selecting a Town Center or Barracks to set a rally point flag for newly spawned units.

### 🏇 Rock-Paper-Scissors Combat Triangle
- **👨‍🌾 Villager**: Gathers Wood, Food, and Gold; constructs buildings and repairs.
- **⚔️ Swordsman**: Durable frontline infantry that counters heavy cavalry.
- **🏹 Archer**: Ranged scout that kites slow melee troops.
- **🏇 Knight**: High-speed mounted cavalry dealing **+50% bonus damage** against archers to break ranged formations.

### 🔬 Tech Tree & Upgrades
Research upgrades at the Blacksmith to empower your kingdom:
- **🗡️ Forged Steel**: +3 Attack damage to Swordsmen and Knights.
- **🛡️ Scale Armor**: +25 Max HP to all combat troops.
- **🎯 Bodkin Arrows**: +35 Attack range and +2 Damage to Archers.
- **🛒 Wheelbarrow**: +5 Villager carrying capacity and +15% movement speed.

### 🎶 Procedural Medieval Audio
- **Ambient Soundtrack**: Procedurally generated pentatonic lute and harp chord progressions during peace time, transitioning to war drums during combat.
- **Sound Effects**: Arrow volleys, knight lance impacts, sword clashing, wood chopping, pickaxe mining, anvil clinking, and victory fanfares synthesized with the **Web Audio API** (zero external audio file downloads needed).

### 🤖 Adaptive Enemy AI & Difficulty
- **3 Difficulty Settings**: `Easy`, `Normal`, and `Hard`.
- Enemy builds defensive Watch Towers, trains mixed forces, and coordinates tactical raids across river shallows targeting your economy and fortifications.

### ⌨️ RTS Controls & Shortcuts
- **W A S D / Arrow Keys**: Pan camera across the realm.
- **Mouse Wheel**: Smooth zoom in / out.
- **Left-Click**: Select individual unit, building, or resource node.
- **Left-Click & Drag**: Box-select multiple troops.
- **Right-Click**: Issue move orders, attack enemies, gather resources, or set building rally points.
- **Ctrl + 1 - 9**: Assign selected troops to a numbered Control Group.
- **1 - 9**: Select Control Group (double-tap to snap camera to group).
- **. (Period)**: Cycle and focus on the next Idle Villager.
- **H**: Jump camera to Town Center.
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

## 🛠️ Tech Stack
- **Engine / Core**: Vanilla JavaScript (ES Modules), HTML5 Canvas
- **Styling**: Vanilla CSS (Cinzel & Outfit typography, glassmorphism UI)
- **Audio**: Web Audio API (Zero audio assets required)
- **Bundler**: Vite

---

## 📜 License
MIT License. Created by Auro Silalahi.
