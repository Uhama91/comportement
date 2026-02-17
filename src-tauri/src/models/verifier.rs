use sha2::{Digest, Sha256};
use std::io::Read;
use std::path::Path;

/// Known SHA256 hashes for the expected model files.
/// These will be verified after download or USB copy.
/// Note: if Hugging Face updates the files, these hashes must be updated.
const EXPECTED_HASHES: &[(&str, &str)] = &[
    ("ggml-small.bin", "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b"),
    ("qwen2.5-coder-1.5b-instruct-q4_k_m.gguf", "cc324af070c2ecbfd324a30884d2f951a7ff756aba85cb811a6ec436933bb046"),
];

/// Get the expected SHA256 hash for a model filename.
/// Returns None if the filename is unknown or hash is empty (not yet computed).
pub fn get_expected_hash(filename: &str) -> Option<&'static str> {
    EXPECTED_HASHES
        .iter()
        .find(|(name, _)| *name == filename)
        .and_then(|(_, hash)| if hash.is_empty() { None } else { Some(*hash) })
}

/// Compute the SHA256 hash of a file, reading in 8 KB chunks.
pub fn compute_sha256(path: &Path) -> Result<String, String> {
    let mut file =
        std::fs::File::open(path).map_err(|e| format!("Impossible d'ouvrir {}: {}", path.display(), e))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let n = file
            .read(&mut buffer)
            .map_err(|e| format!("Erreur de lecture {}: {}", path.display(), e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}

/// Verify a file's SHA256 hash against its expected value.
/// Returns Ok(true) if match, Ok(false) if mismatch.
/// If no expected hash is configured (empty), returns Ok(true) — skip verification.
pub fn verify_model_hash(path: &Path, filename: &str) -> Result<bool, String> {
    let expected = match get_expected_hash(filename) {
        Some(h) => h,
        None => return Ok(true), // No hash configured, skip verification
    };

    let actual = compute_sha256(path)?;
    Ok(actual == expected)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn compute_sha256_known_value() {
        let dir = std::env::temp_dir().join("comportement_test_sha256");
        std::fs::create_dir_all(&dir).unwrap();
        let file_path = dir.join("test.txt");
        {
            let mut f = std::fs::File::create(&file_path).unwrap();
            f.write_all(b"hello world").unwrap();
        }
        let hash = compute_sha256(&file_path).unwrap();
        // SHA256("hello world") = b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
        assert_eq!(hash, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9");
        std::fs::remove_file(file_path).ok();
    }

    #[test]
    fn unknown_file_skips_verification() {
        let path = Path::new("/nonexistent");
        assert!(verify_model_hash(path, "unknown_model.bin").unwrap());
    }

    #[test]
    fn known_model_has_expected_hash() {
        let hash = get_expected_hash("ggml-small.bin");
        assert!(hash.is_some());
        assert_eq!(hash.unwrap(), "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b");
    }
}
