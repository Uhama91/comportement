# Comportement

Application desktop pour le suivi du comportement des élèves en classe élémentaire. Remplace le traditionnel système de tableau physique avec émojis par une interface numérique rapide, intuitive et adaptée à l'affichage sur TBI (Tableau Blanc Interactif).

## Fonctionnalités

- **Gestion des élèves** : Ajout, modification et suppression (limite 30 élèves)
- **Système d'avertissements** : 3 niveaux (⚠️) — le 3ème se convertit automatiquement en sanction
- **Système de sanctions** : Émojis 🙁 (max 10 par semaine par élève)
- **Sanction directe** : Possibilité de donner une sanction sans passer par les avertissements
- **Reset automatique** : Avertissements remis à zéro chaque jour à 16h30
- **Mode TBI** : Interface plein écran optimisée pour l'affichage sur tableau interactif
- **Historique** : Suivi hebdomadaire des sanctions avec export JSON
- **Tri intelligent** : Élèves sanctionnés affichés en premier

## Captures d'écran

### Vue compacte (enseignant)
Interface de bureau pour gérer rapidement les avertissements et sanctions.

### Mode TBI
Interface plein écran avec grandes zones tactiles pour utilisation sur tableau interactif.

## Installation

### Windows
Téléchargez le dernier installateur depuis les [Releases](https://github.com/Uhama91/comportement/releases) :
- **`.msi`** : Installateur Windows standard (recommandé pour environnements professionnels)
- **`.exe`** : Installateur NSIS (plus compact)

### Développement

Prérequis :
- Node.js 20+
- Rust (stable)

```bash
# Cloner le repo
git clone https://github.com/Uhama91/comportement.git
cd comportement

# Installer les dépendances
npm install

# Lancer en mode développement
npm run tauri dev

# Build production
npm run tauri build
```

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Tauri 2.0 |
| Frontend | React 19 + TypeScript |
| Backend | Rust |
| Base de données | SQLite (local) |
| State | Zustand |
| Styling | Tailwind CSS v4 |
| Build | Vite |

## Pourquoi Tauri ?

- **Léger** : Installateur ~4 Mo vs ~150 Mo pour Electron
- **Rapide** : Performances natives grâce à Rust
- **Sécurisé** : Pas de Node.js embarqué, surface d'attaque réduite
- **Local** : Toutes les données restent sur l'ordinateur (SQLite)

## Structure du projet

```
comportement/
├── src/                    # Code React/TypeScript
│   ├── components/         # Composants UI
│   ├── stores/             # State Zustand
│   ├── types/              # Types TypeScript
│   └── utils/              # Utilitaires (dates, etc.)
├── src-tauri/              # Code Rust/Tauri
│   ├── src/                # Backend Rust
│   └── tauri.conf.json     # Configuration Tauri
└── .github/workflows/      # CI/CD GitHub Actions
```

## Licence

MIT
