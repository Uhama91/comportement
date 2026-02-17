# Sprint 4 — Plan d'implementation

## Vue d'ensemble

**Epic 16** : Gestion des Modeles GGUF (4 stories)
**Epic 17** : Polish et Distribution (5 stories)
**Total** : 9 stories

---

## Etat des lieux (ce qui existe deja)

### Infrastructure prete
- **Migration 8** : table `models_status` deja creee dans `lib.rs` (nom, chemin, taille, sha256, date, version)
- **SidecarManager** : les model paths sont deja parametres dans `start()` — pas de refactoring necessaire
- **reqwest** : deja dans `Cargo.toml` avec features `rustls-tls`, `json` — pret pour le telechargement
- **resolve_model_path()** : existe dans `transcription.rs` et `structuration.rs`, retourne `SidecarError::ModelNotFound` si fichier absent
- **VoiceDictation** : gere deja l'erreur `model_not_found` (cache le bouton "Reessayer", affiche message)
- **Frontend error types** : `TranscriptionError` inclut deja `'model_not_found'`

### A ajouter
- Crate `sha2` dans Cargo.toml (verification SHA256)
- `tauri-plugin-dialog` cote Rust + `@tauri-apps/plugin-dialog` cote npm (selecteur de dossier USB)
- Capability `dialog:default` dans `capabilities/default.json`

### Chemins modeles actuels
```
macOS:  ~/Library/Application Support/fr.comportement.app/models/
Windows: %APPDATA%/fr.comportement.app/models/
```
- Whisper : `ggml-small.bin` (~465 Mo)
- Qwen : `qwen2.5-coder-1.5b-instruct-q4_k_m.gguf` (~980 Mo)

### URLs de telechargement
```
Whisper: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin
Qwen: https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf
```

---

## Epic 16 : Gestion des Modeles GGUF

### Story 16.1 : Detection premier lancement + ecran setup

**Fichiers a creer :**
- `src-tauri/src/models/mod.rs` — module Rust gestion modeles
- `src-tauri/src/models/checker.rs` — detection presence modeles
- `src/shared/components/ModelSetupWizard.tsx` — ecran config initiale
- `src/shared/stores/modelStore.ts` — store Zustand etat modeles

**Fichiers a modifier :**
- `src-tauri/src/lib.rs` — ajouter module `models`, enregistrer commande `check_models_status`
- `src/App.tsx` — ajouter logique : si modeles absents au 1er lancement, afficher `ModelSetupWizard`
- `src/modules/apprentissage/index.tsx` — si modeles absents, afficher message + lien Settings
- `src/shared/types/index.ts` — ajouter types `ModelStatus`, `ModelsCheckResult`

**Implementation Rust (`models/checker.rs`) :**
```rust
#[derive(Serialize)]
pub struct ModelsCheckResult {
    pub whisper_installed: bool,
    pub llama_installed: bool,
    pub whisper_path: Option<String>,
    pub llama_path: Option<String>,
}

#[tauri::command]
pub async fn check_models_status(app: AppHandle) -> Result<ModelsCheckResult, String> {
    let models_dir = app.path().app_data_dir()?.join("models");
    let whisper_path = models_dir.join("ggml-small.bin");
    let llama_path = models_dir.join("qwen2.5-coder-1.5b-instruct-q4_k_m.gguf");
    Ok(ModelsCheckResult {
        whisper_installed: whisper_path.exists(),
        llama_installed: llama_path.exists(),
        whisper_path: whisper_path.exists().then(|| whisper_path.to_string_lossy().into()),
        llama_path: llama_path.exists().then(|| llama_path.to_string_lossy().into()),
    })
}
```

**Implementation Frontend (`ModelSetupWizard.tsx`) :**
- Ecran plein page (pas modal) avec 3 options :
  1. "Telecharger depuis internet" → lance Story 16.2
  2. "Installer depuis un dossier local" → lance Story 16.4
  3. "Passer cette etape" → ferme le wizard, Modules 1+2 accessibles
- Affiche taille totale : "~1.5 Go necessaires"
- Persister `setupSkipped` en localStorage pour ne plus afficher

**Implementation Store (`modelStore.ts`) :**
```typescript
interface ModelStoreState {
  whisperInstalled: boolean;
  llamaInstalled: boolean;
  loading: boolean;
  checkModels: () => Promise<void>;
}
```

**Logique App.tsx :**
```
Au demarrage:
1. invoke('check_models_status')
2. Si les 2 modeles absents ET pas de setupSkipped → afficher ModelSetupWizard
3. Sinon → app normale
```

---

### Story 16.2 : Telechargement sequentiel avec progression

**Fichiers a creer :**
- `src-tauri/src/models/downloader.rs` — logique telechargement + streaming
- `src/shared/components/DownloadProgress.tsx` — UI barre de progression

**Fichiers a modifier :**
- `src-tauri/src/models/mod.rs` — exposer le downloader
- `src-tauri/src/lib.rs` — enregistrer commande `download_models`
- `src/shared/stores/modelStore.ts` — ajouter etat download
- `src/shared/types/index.ts` — ajouter `DownloadProgress`
- `src/shared/components/ModelSetupWizard.tsx` — integrer DownloadProgress

**Implementation Rust (`models/downloader.rs`) :**
```rust
use reqwest::Client;
use tauri::{AppHandle, Emitter};
use std::io::Write;

#[derive(Clone, Serialize)]
struct DownloadProgress {
    model_name: String,
    downloaded_bytes: u64,
    total_bytes: u64,
    percentage: f64,
}

const MODELS: &[(&str, &str, &str)] = &[
    ("whisper", "ggml-small.bin", "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin"),
    ("llama", "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf", "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"),
];

#[tauri::command]
pub async fn download_models(app: AppHandle) -> Result<(), String> {
    let models_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models");
    std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;

    let client = Client::new();

    for (name, filename, url) in MODELS {
        let dest = models_dir.join(filename);
        if dest.exists() { continue; } // Skip si deja installe

        let resp = client.get(*url).send().await.map_err(|e| e.to_string())?;
        let total = resp.content_length().unwrap_or(0);
        let mut downloaded: u64 = 0;

        // Ecrire dans fichier temporaire .tmp puis rename
        let tmp_path = dest.with_extension("tmp");
        let mut file = std::fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
        let mut stream = resp.bytes_stream();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| e.to_string())?;
            file.write_all(&chunk).map_err(|e| e.to_string())?;
            downloaded += chunk.len() as u64;

            // Emettre event toutes les ~500KB pour pas surcharger
            app.emit("download_progress", DownloadProgress {
                model_name: name.to_string(),
                downloaded_bytes: downloaded,
                total_bytes: total,
                percentage: if total > 0 { (downloaded as f64 / total as f64) * 100.0 } else { 0.0 },
            }).ok();
        }

        // SHA256 verification (Story 16.3)
        // ...

        std::fs::rename(&tmp_path, &dest).map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

**Points cles :**
- Ecriture dans `.tmp` puis rename atomique (pas de fichier corrompu si crash)
- Emettre `download_progress` via `app.emit()` — ecouter cote frontend avec `listen()`
- Skip modele deja present
- Si erreur reseau → message "Utilisez l'option cle USB"
- `futures::StreamExt` necessaire pour `bytes_stream().next()`

**Frontend DownloadProgress.tsx :**
- 2 barres de progression (Whisper puis Qwen)
- Affiche : nom modele, taille telechargee / totale, pourcentage
- Bouton "Annuler" qui arrete le download
- Message final "Modeles installes avec succes"

---

### Story 16.3 : Verification SHA256 et stockage

**Fichiers a creer :**
- `src-tauri/src/models/verifier.rs` — calcul SHA256 + comparaison

**Fichiers a modifier :**
- `src-tauri/Cargo.toml` — ajouter `sha2 = "0.10"`
- `src-tauri/src/models/downloader.rs` — appeler verify apres download
- `src-tauri/src/models/mod.rs` — exposer verifier
- `src-tauri/src/lib.rs` — enregistrer insert `models_status`

**Implementation :**
```rust
use sha2::{Sha256, Digest};
use std::io::Read;

// Hashes a determiner (telecharger les modeles et calculer)
const EXPECTED_HASHES: &[(&str, &str)] = &[
    ("ggml-small.bin", "<SHA256_WHISPER>"),
    ("qwen2.5-coder-1.5b-instruct-q4_k_m.gguf", "<SHA256_QWEN>"),
];

pub fn verify_sha256(path: &Path, expected: &str) -> Result<bool, String> {
    let mut file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let n = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }
    let hash = format!("{:x}", hasher.finalize());
    Ok(hash == expected)
}
```

**Workflow integre dans downloader.rs :**
1. Telecharger dans `filename.tmp`
2. Calculer SHA256 du `.tmp`
3. Si OK → rename en `filename`, INSERT dans `models_status`
4. Si KO → supprimer `.tmp`, retourner erreur

**Note :** Les SHA256 exacts seront calcules lors de l'implementation (telecharger les fichiers une fois et hasher).

---

### Story 16.4 : Installation USB alternative

**Fichiers a modifier :**
- `src-tauri/Cargo.toml` — ajouter `tauri-plugin-dialog`
- `src-tauri/src/lib.rs` — ajouter plugin `.plugin(tauri_plugin_dialog::init())`
- `src-tauri/capabilities/default.json` — ajouter `"dialog:default"`
- `package.json` — ajouter `@tauri-apps/plugin-dialog`
- `src-tauri/src/models/mod.rs` — commande `install_models_from_folder`
- `src/shared/components/ModelSetupWizard.tsx` — bouton "Installer depuis dossier"

**Implementation Rust :**
```rust
#[tauri::command]
pub async fn install_models_from_folder(app: AppHandle, folder_path: String) -> Result<(), String> {
    let source = PathBuf::from(&folder_path);
    let models_dir = app.path().app_data_dir()?.join("models");
    std::fs::create_dir_all(&models_dir)?;

    let expected_files = ["ggml-small.bin", "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"];

    for filename in &expected_files {
        let src_file = source.join(filename);
        if !src_file.exists() {
            return Err(format!("Fichier manquant : {}", filename));
        }
        let dest_file = models_dir.join(filename);

        // Copier avec progression
        std::fs::copy(&src_file, &dest_file)?;

        // Verifier SHA256
        if !verify_sha256(&dest_file, get_expected_hash(filename))? {
            std::fs::remove_file(&dest_file)?;
            return Err(format!("Fichier corrompu : {}", filename));
        }

        // Insert models_status
        // ...
    }
    Ok(())
}
```

**Frontend :**
- Utiliser `open()` de `@tauri-apps/plugin-dialog` pour selecteur de dossier
- Lister les fichiers trouves + taille
- Bouton "Installer" → copie + verification
- Barre de progression pour la copie

---

## Epic 17 : Polish et Distribution

### Story 17.1 : Build cross-platform

**Fichiers a modifier :**
- `src-tauri/tauri.conf.json` — verifier config bundle Windows/macOS
- `src-tauri/Cargo.toml` — verifier features conditionnelles par plateforme

**Actions :**
1. S'assurer que les binaires sidecars existent pour chaque target :
   - `whisper-server-x86_64-pc-windows-msvc.exe`
   - `whisper-server-aarch64-apple-darwin`
   - `llama-server-x86_64-pc-windows-msvc.exe`
   - `llama-server-aarch64-apple-darwin`
2. **Note :** llama-server est actuellement un placeholder (18 octets). Il faut compiler le vrai binaire via `scripts/setup-llama.sh` (ou cross-compile).
3. Tester `npm run tauri build` sur macOS
4. Pour Windows : cross-compilation ou CI GitHub Actions
5. Verifier que les modeles ne sont PAS dans le bundle (seulement les binaires)

**Tauri.conf.json bundle actuel :**
```json
"bundle": {
    "externalBin": [
        "binaries/whisper-server",
        "binaries/llama-server"
    ]
}
```
→ Tauri ajoute automatiquement le suffixe target triple. OK.

**Taille cible :** < 50 Mo sans modeles (binaires sidecars inclus)

---

### Story 17.2 : Tests performance PC ecole

**Pas de code a ecrire.** C'est une story de validation.

**Checklist a executer sur PC 4 Go RAM :**
- [ ] Action avertissement < 1 seconde
- [ ] Pipeline complet (push-to-talk → insertion) < 15 secondes
- [ ] Transcription Whisper (15s audio) < 5 secondes
- [ ] Structuration LLM < 5 secondes
- [ ] RAM pic < 2 Go (mode sequentiel)
- [ ] Stabilite 8h sans freeze/crash/memory leak
- [ ] Taille DB apres 1 mois simulee < 50 Mo

---

### Story 17.3 : Mode portable .exe

**Deja conforme.** Tauri produit un .exe portable par defaut.

**Verifications :**
- [ ] Pas de modification du registre Windows
- [ ] Donnees dans `%APPDATA%/fr.comportement.app/` (pas dans le dossier de l'exe)
- [ ] Lancement depuis cle USB fonctionne
- [ ] Documenter la procedure SmartScreen pour l'admin IT

**Fichier a creer (optionnel) :**
- `docs/smartscreen-bypass.md` — Guide pour l'admin IT

---

### Story 17.4 : Documentation utilisateur

**Fichiers a creer :**
- `src/shared/components/HelpSection.tsx` — section aide integree dans Settings

**Fichiers a modifier :**
- `src/shared/components/Settings.tsx` — ajouter section "Aide" avec HelpSection

**Contenu de l'aide :**
1. **Premier lancement** — Installation des modeles (internet ou USB)
2. **Dictee vocale** — Maintenir pour parler → relacher → corriger → structurer → valider
3. **Configuration periodes** — Trimestres/semestres, dates
4. **Raccourcis clavier** — F11 (TBI), Ctrl+Shift+C (afficher), Echap (quitter TBI)
5. **Modules** — Description des 3 modules

**Implementation :**
- Pas de markdown parser, juste du JSX avec sections collapsibles (details/summary ou accordeon Tailwind)
- Texte court, pratique, oriente action

---

### Story 17.5 : Validation accessibilite TBI

**Fichiers a modifier :**
- `src/modules/comportement-classe/components/StudentGridCard.tsx` — augmenter tailles TBI
- `src/modules/comportement-classe/components/StudentGrid.tsx` — layout TBI
- Possiblement `App.tsx` si mode TBI global

**Audit a effectuer :**
1. **Polices :** minimum 24px en mode TBI (prenoms, emojis lisibles a 3m)
2. **Contraste :** ratio >= 4.5:1 pour tous les textes (WCAG AA)
3. **Zones tactiles :** minimum 48x48px pour boutons avertissement/sanction
4. **Hover :** aucun element qui depend uniquement du hover
5. **Feedback visuel :** retour < 100ms sur chaque action

**Approche :**
- Detecter le mode fullscreen (F11) → appliquer des classes Tailwind specifiques (`text-2xl`, `min-h-12 min-w-12`, etc.)
- Ou creer un contexte React `TBIMode` qui propage les tailles agrandies

---

## Ordre d'implementation recommande

### Phase 1 — Epic 16 (stories en sequence, dependances entre elles)

| Ordre | Story | Dependance | Description |
|-------|-------|------------|-------------|
| 1 | **16.1** | - | Detection + ecran setup + store modeles |
| 2 | **16.3** | - | SHA256 verifier (crate sha2, fn verify) — simple, prereq pour 16.2 et 16.4 |
| 3 | **16.2** | 16.1, 16.3 | Telechargement sequentiel + progression + verification |
| 4 | **16.4** | 16.1, 16.3 | Installation USB + dialog plugin |

### Phase 2 — Epic 17 (stories plus independantes)

| Ordre | Story | Description |
|-------|-------|-------------|
| 5 | **17.4** | Documentation utilisateur (section aide dans Settings) |
| 6 | **17.5** | Accessibilite TBI (audit + fix) |
| 7 | **17.1** | Build cross-platform (compiler vrais binaires, tester build) |
| 8 | **17.3** | Mode portable (verification + doc SmartScreen) |
| 9 | **17.2** | Tests performance (validation sur PC reel) |

---

## Dependencies Cargo.toml a ajouter

```toml
# Story 16.3
sha2 = "0.10"

# Story 16.2 (deja present, ajouter feature stream)
futures = "0.3"  # pour StreamExt sur bytes_stream()

# Story 16.4
tauri-plugin-dialog = "2"
```

## Dependencies package.json a ajouter

```json
// Story 16.4
"@tauri-apps/plugin-dialog": "^2"
```

## Commandes Tauri a enregistrer (lib.rs)

```rust
// Epic 16
models::checker::check_models_status,
models::downloader::download_models,
models::downloader::cancel_download,  // optionnel
models::installer::install_models_from_folder,
```

## Nouveaux fichiers (total)

### Rust (src-tauri/src/)
- `models/mod.rs`
- `models/checker.rs`
- `models/downloader.rs`
- `models/verifier.rs`

### TypeScript (src/)
- `shared/components/ModelSetupWizard.tsx`
- `shared/components/DownloadProgress.tsx`
- `shared/components/HelpSection.tsx`
- `shared/stores/modelStore.ts`

### Docs
- `docs/smartscreen-bypass.md` (optionnel)

## Fichiers modifies (total)

- `src-tauri/Cargo.toml` (dependencies)
- `src-tauri/src/lib.rs` (module + commands + plugin dialog)
- `src-tauri/capabilities/default.json` (dialog permission)
- `package.json` (dialog plugin npm)
- `src/App.tsx` (wizard au demarrage)
- `src/modules/apprentissage/index.tsx` (message modeles absents)
- `src/shared/components/Settings.tsx` (section Modeles IA + section Aide)
- `src/shared/types/index.ts` (nouveaux types)
- `src/modules/comportement-classe/components/StudentGridCard.tsx` (TBI accessibility)
- `src/modules/comportement-classe/components/StudentGrid.tsx` (TBI accessibility)

---

## Risques identifies

1. **SHA256 hashes** : doivent etre calcules en telechargeant les modeles reels. Si Hugging Face met a jour les fichiers, les hashes changent.
2. **llama-server binaire** : actuellement un placeholder de 18 octets. Faut compiler le vrai binaire pour chaque plateforme cible.
3. **Proxy ecole** : le telechargement depuis Hugging Face peut etre bloque. L'option USB est le fallback.
4. **Cross-compilation Windows** : necessite soit une machine Windows, soit du cross-compile Rust (plus complexe pour les sidecars C++).
5. **TBI mode** : le composant TBIView.tsx n'existe plus dans la structure actuelle. A localiser ou recreer.
