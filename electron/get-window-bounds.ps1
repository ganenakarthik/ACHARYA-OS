# Acharya Window Bounds Extractor — Gets foreground window's exact pixel rect
# Returns JSON: { Left, Top, Right, Bottom, Width, Height, Title, Process }

Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  using System.Text;
  public class Win32Bounds {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
      public int Left; public int Top; public int Right; public int Bottom;
    }
  }
"@ -ErrorAction SilentlyContinue

$hwnd = [Win32Bounds]::GetForegroundWindow()
$pName = ""
$title = ""

if ($hwnd -ne [IntPtr]::Zero) {
  $sb = New-Object System.Text.StringBuilder 512
  [Win32Bounds]::GetWindowText($hwnd, $sb, 512) | Out-Null
  $title = $sb.ToString().Trim()

  $pidOut = 0
  [Win32Bounds]::GetWindowThreadProcessId($hwnd, [ref]$pidOut) | Out-Null
  if ($pidOut -gt 0) {
    try { $p = Get-Process -Id $pidOut -ErrorAction SilentlyContinue; if ($p) { $pName = $p.ProcessName } } catch {}
  }
}

# If foreground is Acharya (electron), find the student's editor behind it
$isAcharya = ($pName -eq "electron" -or [string]::IsNullOrWhiteSpace($title))
if ($isAcharya) {
  $editors = @("notepad", "Code", "devenv", "sublime_text", "atom", "gedit", "idea64", "pycharm64")
  foreach ($ed in $editors) {
    $found = Get-Process -Name $ed -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    if ($found) {
      $pName = $found.ProcessName
      $title = if ($found.MainWindowTitle) { $found.MainWindowTitle } else { $found.ProcessName }
      $hwnd = $found.MainWindowHandle
      break
    }
  }
}

# Get pixel rect
$rect = New-Object Win32Bounds+RECT
$gotRect = $false
if ($hwnd -ne [IntPtr]::Zero) {
  $gotRect = [Win32Bounds]::GetWindowRect($hwnd, [ref]$rect)
}

if ($gotRect -and ($rect.Right - $rect.Left) -gt 50 -and ($rect.Bottom - $rect.Top) -gt 50) {
  [PSCustomObject]@{
    Left    = [Math]::Max(0, $rect.Left)
    Top     = [Math]::Max(0, $rect.Top)
    Right   = $rect.Right
    Bottom  = $rect.Bottom
    Width   = $rect.Right - $rect.Left
    Height  = $rect.Bottom - $rect.Top
    Title   = $title
    Process = $pName
    Found   = $true
  } | ConvertTo-Json -Compress
} else {
  [PSCustomObject]@{
    Found   = $false
    Process = $pName
    Title   = $title
  } | ConvertTo-Json -Compress
}
