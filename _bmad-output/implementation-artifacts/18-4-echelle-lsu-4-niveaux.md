# Story 18.4 : Echelle LSU 4 Niveaux

## Story

En tant qu'enseignant,
Je veux evaluer mes eleves sur l'echelle officielle LSU a 4 niveaux,
Afin que mes evaluations soient conformes au Livret Scolaire Unique.

## Status: done

## FRs: FR60
## Epic: 18

## Tasks

### Task 1 : Type NiveauLsu et constantes centralisees
- Ajouter type `NiveauLsu` dans `types/index.ts` : `'non_atteints' | 'partiellement_atteints' | 'atteints' | 'depasses'`
- Creer constantes `NIVEAUX_LSU` (options label/value/color) dans `types/index.ts`
- Conserver l'ancien type `NiveauAcquisition` pour retrocompat pipeline V2

### Task 2 : Mise a jour appreciationStore
- SELECT : lire `niveau_lsu as niveauLsu` dans loadAppreciations
- INSERT : ecrire dans `niveau_lsu` (addAppreciation, batchSaveAppreciations)
- UPDATE : ecrire dans `niveau_lsu` (updateAppreciation)
- Interface `Appreciation` : ajouter `niveauLsu: NiveauLsu | null`

### Task 3 : Mise a jour AppreciationTable
- Remplacer `NIVEAU_OPTIONS` (3 niveaux) par `NIVEAUX_LSU` (4 niveaux)
- Remplacer `NIVEAU_COLORS` par couleurs LSU (rouge/orange/vert/bleu)
- Lire/ecrire `niveauLsu` au lieu de `niveau`

### Task 4 : Mise a jour ManualEntryForm
- Remplacer `NIVEAU_OPTIONS` par `NIVEAUX_LSU`
- Ecrire `niveauLsu` au lieu de `niveau`

### Task 5 : Verification TypeScript + Tests Rust
- `npx tsc --noEmit` zero errors
- `cargo test` tous les tests passent

## Dev Notes

### Migration M004 deja appliquee (Story 18.1)
La colonne `niveau_lsu TEXT DEFAULT NULL` existe deja dans la table `appreciations`.
Les donnees V2 sont deja migrees :
- `debut` → `non_atteints`
- `en_cours_acquisition` → `partiellement_atteints`
- `maitrise` → `depasses`

Le nouveau niveau `atteints` n'a pas de donnees migrees automatiquement.

### Strategie
L'ancienne colonne `niveau` reste en DB (pas de DROP COLUMN en SQLite).
Le code TS utilise desormais `niveau_lsu` exclusivement pour les nouvelles lectures/ecritures.
L'ancien type `NiveauAcquisition` est conserve pour le pipeline LLM V2 existant.

## Acceptance Criteria

- [x] Les 4 niveaux LSU sont proposes dans AppreciationTable et ManualEntryForm
- [x] Les donnees migrees par M004 s'affichent correctement
- [x] Les nouvelles evaluations utilisent `niveau_lsu`
- [x] TypeScript compile sans erreur
