# Sanitization Script
# Removes PII and Absolute Paths from AI Docs

$sourceDir = "c:\Users\veere\source\repos\Prompt Manager\AI_Initiative_Docs"
$destDir = "c:\Users\veere\source\repos\Prompt Manager\ai-initiative-scaffolder\templates"

Write-Host "Sanitizing docs from $sourceDir to $destDir..."

Get-ChildItem -Path $sourceDir -Filter "*.md" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw

    # 1. Replace User Home Path
    $content = $content -replace "c:\\Users\\veere\\source\\repos\\Prompt Manager", "<PROJECT_ROOT>"
    $content = $content -replace "c:/Users/veere/source/repos/Prompt Manager", "<PROJECT_ROOT>" # Forward slash variant
    $content = $content -replace "c:\\Users\\veere", "<USER_HOME>"
    
    # 2. Replace Username
    $content = $content -replace "veere", "<USER>"

    # 3. Replace file:/// URIs
    $content = $content -replace "file:///c:/Users/veere/source/repos/Prompt%20Manager", "file:///<PROJECT_ROOT>"

    # 4. Write to destination
    Set-Content -Path "$destDir\$($_.Name)" -Value $content
}

Write-Host "Sanitization Complete."
