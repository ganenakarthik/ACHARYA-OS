# Acharya Window Bounds Extractor — Win32 STA InputDesktop Engine
# Accurately extracts foreground target window rect on Windows 11 DWM
# Returns JSON: { Left, Top, Right, Bottom, Width, Height, Title, Process, Found }

Add-Type @"
  using System;
  using System.Text;
  using System.Diagnostics;
  using System.Runtime.InteropServices;
  using System.Threading;

  public class Win32BoundsExtractor {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

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

    public class WindowResult {
      public int Left;
      public int Top;
      public int Right;
      public int Bottom;
      public int Width;
      public int Height;
      public string Title;
      public string Process;
      public bool Found;
    }

    public static WindowResult GetActiveTargetWindow() {
      WindowResult result = new WindowResult { Found = false, Title = "", Process = "" };

      Thread t = new Thread(() => {
        IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
        if (hDesk == IntPtr.Zero) return;
        SetThreadDesktop(hDesk);

        IntPtr fg = GetForegroundWindow();
        if (fg != IntPtr.Zero) {
          StringBuilder sb = new StringBuilder(256);
          GetWindowText(fg, sb, 256);
          string title = sb.ToString();

          uint pid = 0;
          GetWindowThreadProcessId(fg, out pid);
          string proc = "";
          try {
            var p = Process.GetProcessById((int)pid);
            if (p != null) proc = p.ProcessName.ToLower();
          } catch {}

          string lowT = title.ToLower();

          // Strict Exclusion: Never evaluate Antigravity, Electron, or Explorer/Desktop
          if (proc == "electron" || proc.Contains("antigravity") || lowT.Contains("antigravity") || proc == "explorer" || string.IsNullOrWhiteSpace(title)) {
            result.Title = title;
            result.Process = proc;
            result.Found = false;
          } else {
            // Target: Editors and Web Browsers
            bool isTarget = (
              proc.Contains("notepad") || lowT.Contains("notepad") ||
              proc.Contains("code") || lowT.Contains("visual studio code") ||
              proc.Contains("msedge") || proc.Contains("chrome") || proc.Contains("brave") || proc.Contains("firefox") ||
              proc.Contains("devenv") || proc.Contains("pycharm") || proc.Contains("windowsterminal")
            );

            if (isTarget) {
              RECT r;
              if (GetWindowRect(fg, out r) && (r.Right - r.Left) > 100 && (r.Bottom - r.Top) > 100) {
                result.Left = Math.Max(0, r.Left);
                result.Top = Math.Max(0, r.Top);
                result.Right = r.Right;
                result.Bottom = r.Bottom;
                result.Width = r.Right - r.Left;
                result.Height = r.Bottom - r.Top;
                result.Title = title;
                result.Process = proc;
                result.Found = true;
              }
            } else {
              result.Title = title;
              result.Process = proc;
              result.Found = false;
            }
          }
        }

        CloseDesktop(hDesk);
      });

      t.SetApartmentState(ApartmentState.STA);
      t.Start();
      t.Join();
      return result;
    }
  }
"@ -ErrorAction SilentlyContinue

$res = [Win32BoundsExtractor]::GetActiveTargetWindow()
$res | ConvertTo-Json -Compress
