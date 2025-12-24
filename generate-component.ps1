param(
  [Parameter(Mandatory=$true)]
  [string]$Name
)

$root = "packages/web/src/components"
$path = "$root/$Name.tsx"

if (-not (Test-Path $root)) {
    New-Item -ItemType Directory -Path $root | Out-Null
}

$template = @"
import React from "react";

export default function $Name() {
  return (
    <div className="text-emperor-text">
      $Name component
    </div>
  );
}
"@

Set-Content -Path $path -Value $template

Write-Host "Created component: $path" -ForegroundColor Green