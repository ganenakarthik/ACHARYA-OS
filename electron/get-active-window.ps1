Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  using System.Text;
  public class Win32Window {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
  }
"@ -ErrorAction SilentlyContinue

$hwnd = [Win32Window]::GetForegroundWindow()
$title = ""
$pName = ""

if ($hwnd -ne [IntPtr]::Zero) {
  $sb = New-Object System.Text.StringBuilder 512
  [Win32Window]::GetWindowText($hwnd, $sb, 512) | Out-Null
  $title = $sb.ToString().Trim()
  
  $pidOut = 0
  [Win32Window]::GetWindowThreadProcessId($hwnd, [ref]$pidOut) | Out-Null
  if ($pidOut -gt 0) {
    try {
      $p = Get-Process -Id $pidOut -ErrorAction SilentlyContinue
      if ($p) { $pName = $p.ProcessName }
    } catch {}
  }
}

$lowP = $pName.ToLower()
$lowT = $title.ToLower()

if ($lowP -match "antigravity|electron" -or $lowT -match "antigravity") {
  $title = "Antigravity Workspace"
  $pName = "antigravity"
} elseif ([string]::IsNullOrWhiteSpace($title) -or $lowP -eq "explorer") {
  $title = "Active Desktop Workspace"
  $pName = "explorer"
}

$result = [PSCustomObject]@{
  Title = $title
  Process = $pName
}
$result | ConvertTo-Json -Compress
