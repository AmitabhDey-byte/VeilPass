# Managed contract artifacts

This directory is reserved for the generated output of the Midnight Compact compiler:

```bash
compact compile contracts/veil-allowlist.compact managed/veil-allowlist
```

Run this from WSL2/Linux/macOS. On Windows PowerShell, `compact` means the built-in file-compression command and will only print `Listing ...`; it is not the Midnight compiler. The generated compiler output is required for submission and should contain `compiler/`, `contract/`, `keys/`, and `zkir/`. Never hand-edit those generated files.
