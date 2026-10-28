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

# If foreground is Acharya itself or empty, detect the top developer/browser workspace app
if ([string]::IsNullOrWhiteSpace($title) -or $pName -eq "electron") {
  $activeProcs = @("Code", "chrome", "msedge", "brave", "WindowsTerminal", "powershell", "notepad", "devenv")
  foreach ($ap in $activeProcs) {
    $found = Get-Process -Name $ap -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
      $pName = $found.ProcessName
      $title = if ($found.MainWindowTitle) { $found.MainWindowTitle } else { $found.ProcessName }
      break
    }
  }
}

if ([string]::IsNullOrWhiteSpace($title)) {
  $title = "Active Desktop Workspace"
  $pName = "explorer"
}

$result = [PSCustomObject]@{
  Title = $title
  Process = $pName
}
$result | ConvertTo-Json -Compress
