# prisma.ps1
# Bulletproof Prisma wrapper for Windows + Bun + Monorepo

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $scriptDir

# Build argument list safely
$argList = @("prisma") + $args

bunx --cwd $scriptDir @argList