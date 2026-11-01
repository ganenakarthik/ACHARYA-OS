# Acharya Active Window Inspector — Win32 STA InputDesktop Engine
# Returns JSON: { Title, Process }

Add-Type @"
  using System;
  using System.Text;
  using System.Diagnostics;
  using System.Runtime.InteropServices;
  using System.Threading;

  public class Win32ActiveWindow {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    public class ActiveInfo {
      public string Title;
      public string Process;
    }

    public static ActiveInfo GetForegroundInfo() {
      ActiveInfo info = new ActiveInfo { Title = "", Process = "" };

      Thread t = new Thread(() => {
        IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
        if (hDesk == IntPtr.Zero) return;
        SetThreadDesktop(hDesk);

        IntPtr fg = GetForegroundWindow();
        if (fg != IntPtr.Zero) {
          StringBuilder sb = new StringBuilder(256);
          GetWindowText(fg, sb, 256);
          info.Title = sb.ToString().Trim();

          uint pid = 0;
          GetWindowThreadProcessId(fg, out pid);
          try {
            var p = Process.GetProcessById((int)pid);
            if (p != null) info.Process = p.ProcessName.ToLower();
          } catch {}
        }

        CloseDesktop(hDesk);
      });

      t.SetApartmentState(ApartmentState.STA);
      t.Start();
      t.Join();
      return info;
    }
  }
"@ -ErrorAction SilentlyContinue

$info = [Win32ActiveWindow]::GetForegroundInfo()
$title = $info.Title
$pName = $info.Process

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
