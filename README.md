# ⚔️ Empires of the Web (AoE Look-Alike RTS)

A medieval browser-based Real-Time Strategy (RTS) game built with Vanilla JavaScript, HTML5 Canvas, Web Audio API, and Vite. Inspired by classic strategy games like *Age of Empires II*, featuring real-time resource gathering, base building, tech tree progression, Fog of War, tactical combat, and multi-enemy warfare across 80x80 maps.

---

## 🌟 What's New in this Expansion

### 🌸 4 Asian Kingdoms (Civilizations)
Choose your kingdom on match launch, each with distinct historical traits and aesthetics:
- **🌸 Japanese Shogunate**: *Bushido Discipline* (+15% Swordsman & Knight attack damage, faster strike rate).
- **🏯 Korean Joseon**: *Divine Artillery* (Fortress fires +2 extra arrows, Towers & Fortress have +25% range).
- **🐉 Chinese Dynasty**: *Imperial Dynasty* (+3 starting villagers, -20% building wood cost, rapid research).
- **🐘 Indian Maurya**: *Armored Cavalry* (+30% Knight cavalry HP, farms and gold mines provide bonus yield).

### 🏰 Fortress Bastion & Healing Sanctuary
- **Multi-Arrow Volleys**: Town Center Fortresses automatically fire **volleys of arrows** (base: 3 arrows simultaneously) at multiple hostiles in range.
- **Sanctuary Healing**: Any wounded soldier stationed around your Fortress is healed over time (+8 HP/sec) by consuming a small amount of Food (1 Food per 8 HP) from your stockpile.
- **Blacksmith Ballistics**: Upgradeable arrow counts (*Arrow Slits* adds +2 arrows; *Ballistics* increases range & projectile velocity).

### 🗺️ 3 Expansive 80x80 Maps (3840 x 3840 px)
- **🌊 River Valley**: Divided by a winding central river with **4-tile wide stone bridges** and shallows that prevent army congestion.
- **⛰️ Mountain Pass**: Rugged stone plateaus, choke points, defensible heights, and rich mountain gold seams.
- **🏜️ Desert Oasis**: Vast golden dunes with fertile palm oases, wide flanking terrain, and multi-front warfare.

### ⚔️ Multi-Enemy Grand Wars (Up to 4 Rival Kingdoms)
- Play in **1 vs 1, 1 vs 2, 1 vs 3, or 1 vs 4 Grand Wars**!
- Rival Kingdoms (Crimson Horde, Amethyst Empire, Solar Khanate, Verdant Sultanate) each build bases, towers, and mobilize coordinated raids across stone bridges.

### 🌾 Abundant & Regrowing Resources
- 20+ dense forest groves (220 wood/tree) with slow sapling regrowth.
- Deep gold mines (650 gold) and berry foraging bushes across the realm.
- Renewable crop fields (**Farms**) with 400 food reserves.

### 🖥️ Viewable & Spacious UI
- Deep, unclipped command and research panel (225px HUD) with distinct icons, clear unit names, and clean cost badges (`100🪵 20🪙`).
- Match setup modal for selecting Kingdom, Map, Enemy Count, and Difficulty.

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
