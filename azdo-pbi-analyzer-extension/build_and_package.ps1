# Build and Package Script
$projectRoot = "c:\Users\veere\source\repos\Prompt Manager\ai-initiative-scaffolder"

Set-Location $projectRoot

Write-Host "Installing dependencies..."
npm install

Write-Host "Compiling TypeScript..."
npm run compile

Write-Host "Packaging Extension..."
# Use npx to run vsce without global install
npx vsce package --no-dependencies

Write-Host "Build Complete!"
