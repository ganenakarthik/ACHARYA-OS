$WshShell = New-Object -ComObject WScript.Shell
$desktopPaths = @(
    [Environment]::GetFolderPath('Desktop'),
    "c:\Users\ganen\OneDrive\Desktop",
    "c:\Users\ganen\Desktop"
) | Select-Object -Unique

foreach ($d in $desktopPaths) {
    if (Test-Path $d) {
        $shortcutPath = Join-Path $d "Acharya AI HUD.lnk"
        $shortcut = $WshShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = "c:\Users\ganen\OneDrive\Desktop\acharya\launch-acharya.bat"
        $shortcut.WorkingDirectory = "c:\Users\ganen\OneDrive\Desktop\acharya"
        $shortcut.Description = "Launch Acharya AI Mentor HUD"
        $shortcut.IconLocation = "shell32.dll,13"
        $shortcut.Save()
        Write-Host "Created Desktop Shortcut at: $shortcutPath"
    }
}
