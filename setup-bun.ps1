# Go to repo root
Set-Location (Split-Path $MyInvocation.MyCommand.Path)

Write-Host "=== Emperor Bookmarking: Bun Migration Script ===" -ForegroundColor Cyan

# Step 1: Clean root npm artifacts
Write-Host "`n[1/6] Cleaning root npm artifacts..." -ForegroundColor Yellow
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }

# Step 2: Loop through each package
Write-Host "`n[2/6] Processing packages..." -ForegroundColor Yellow
$packages = Get-ChildItem -Path "packages" -Directory

foreach ($pkg in $packages) {
    $pkgPath = Join-Path "packages" $pkg.Name
    Write-Host "`n--- Processing package: $($pkg.Name) ---" -ForegroundColor Green

    # Remove old node_modules + lockfile
    if (Test-Path "$pkgPath/node_modules") {
        Write-Host "Removing node_modules..."
        Remove-Item -Recurse -Force "$pkgPath/node_modules"
    }
    if (Test-Path "$pkgPath/package-lock.json") {
        Write-Host "Removing package-lock.json..."
        Remove-Item -Force "$pkgPath/package-lock.json"
    }

    # Run bun install
    Write-Host "Running bun install..."
    Set-Location $pkgPath
    bun install

    # If this is the web package, install Tailwind
    if ($pkg.Name -eq "web") {
        Write-Host "Installing TailwindCSS for web package..."
        bun add -d tailwindcss postcss autoprefixer

        Write-Host "Initializing Tailwind..."
        bunx tailwindcss init -p

        # Update scripts in package.json
        Write-Host "Updating scripts to use bunx vite..."
        $json = Get-Content "package.json" | ConvertFrom-Json
        $json.scripts.dev = "bunx vite"
        $json.scripts.build = "bunx vite build"
        $json.scripts.preview = "bunx vite preview"
        $json | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    }

    # Return to root
    Set-Location ../..
}

# Step 3: Run bun install at root
Write-Host "`n[3/6] Running bun install at root..." -ForegroundColor Yellow
bun install

Write-Host "`n=== Bun migration complete! ===" -ForegroundColor Cyan
Write-Host "You can now run:  bun run dev  inside packages/web"