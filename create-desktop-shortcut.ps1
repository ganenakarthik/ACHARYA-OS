$desktop = [Environment]::GetFolderPath('Desktop')
$targetDir = 'C:\Users\ganen\OneDrive\Desktop\acharya'
$electronExe = Join-Path $targetDir 'node_modules\electron\dist\electron.exe'

$wsh = New-Object -ComObject WScript.Shell
$shortcutPath = Join-Path $desktop 'ACHARYA AI OS.lnk'
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $electronExe
$shortcut.Arguments = "`"$targetDir`""
$shortcut.WorkingDirectory = $targetDir
$shortcut.Description = 'ACHARYA — Autonomous Cyberpunk AI Operating System'
$shortcut.IconLocation = "$electronExe,0"
$shortcut.Save()

Write-Host "Configured direct native shortcut at: $shortcutPath"
