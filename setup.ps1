# Root-level workspace files
New-Item -ItemType File -Path "package.json" -Force
New-Item -ItemType File -Path "tsconfig.json" -Force
New-Item -ItemType File -Path "pnpm-workspace.yaml" -Force

# Root packages directory
New-Item -ItemType Directory -Path "packages" -Force

# =============================
# CORE PACKAGE
# =============================
New-Item -ItemType Directory -Path "packages/core" -Force
New-Item -ItemType Directory -Path "packages/core/src" -Force
New-Item -ItemType Directory -Path "packages/core/src/models" -Force
New-Item -ItemType Directory -Path "packages/core/src/tagging" -Force
New-Item -ItemType Directory -Path "packages/core/src/importer" -Force
New-Item -ItemType Directory -Path "packages/core/src/storage" -Force
New-Item -ItemType Directory -Path "packages/core/src/ai" -Force

New-Item -ItemType File -Path "packages/core/package.json" -Force
New-Item -ItemType File -Path "packages/core/tsconfig.json" -Force
New-Item -ItemType File -Path "packages/core/index.ts" -Force

New-Item -ItemType File -Path "packages/core/src/models/Bookmark.ts" -Force
New-Item -ItemType File -Path "packages/core/src/tagging/autoTagger.ts" -Force
New-Item -ItemType File -Path "packages/core/src/importer/htmlImporter.ts" -Force
New-Item -ItemType File -Path "packages/core/src/storage/StorageAdapter.ts" -Force
New-Item -ItemType File -Path "packages/core/src/ai/aiEngine.ts" -Force

# =============================
# EXTENSION PACKAGE
# =============================
New-Item -ItemType Directory -Path "packages/extension" -Force
New-Item -ItemType Directory -Path "packages/extension/src" -Force
New-Item -ItemType Directory -Path "packages/extension/src/popup" -Force
New-Item -ItemType Directory -Path "packages/extension/src/options" -Force

New-Item -ItemType File -Path "packages/extension/package.json" -Force
New-Item -ItemType File -Path "packages/extension/tsconfig.json" -Force
New-Item -ItemType File -Path "packages/extension/vite.config.ts" -Force
New-Item -ItemType File -Path "packages/extension/manifest.json" -Force

New-Item -ItemType File -Path "packages/extension/src/background.ts" -Force
New-Item -ItemType File -Path "packages/extension/src/popup/popup.html" -Force
New-Item -ItemType File -Path "packages/extension/src/popup/popup.ts" -Force
New-Item -ItemType File -Path "packages/extension/src/popup/popup.css" -Force
New-Item -ItemType File -Path "packages/extension/src/options/options.html" -Force
New-Item -ItemType File -Path "packages/extension/src/options/options.ts" -Force
New-Item -ItemType File -Path "packages/extension/src/options/options.css" -Force

# =============================
# WEB PACKAGE
# =============================
New-Item -ItemType Directory -Path "packages/web" -Force
New-Item -ItemType Directory -Path "packages/web/src" -Force

New-Item -ItemType File -Path "packages/web/package.json" -Force
New-Item -ItemType File -Path "packages/web/tsconfig.json" -Force
New-Item -ItemType File -Path "packages/web/vite.config.ts" -Force

New-Item -ItemType File -Path "packages/web/src/App.tsx" -Force
New-Item -ItemType File -Path "packages/web/src/main.tsx" -Force

# =============================
# MOBILE PACKAGE
# =============================
New-Item -ItemType Directory -Path "packages/mobile" -Force

New-Item -ItemType File -Path "packages/mobile/package.json" -Force
New-Item -ItemType File -Path "packages/mobile/tsconfig.json" -Force
New-Item -ItemType File -Path "packages/mobile/metro.config.js" -Force
New-Item -ItemType File -Path "packages/mobile/App.tsx" -Force

Write-Host "✅ Monorepo directory and file skeleton created."