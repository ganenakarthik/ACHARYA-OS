Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = ScriptDir
WshShell.Run """" & ScriptDir & "\node_modules\electron\dist\electron.exe"" """ & ScriptDir & """", 1, False

Set WshShell = Nothing
Set FSO = Nothing
