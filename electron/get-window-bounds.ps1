# Acharya Window Bounds Extractor — Strictly gets active target foreground window's exact pixel rect
# Returns JSON: { Left, Top, Right, Bottom, Width, Height, Title, Process, Found }

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
      IntPtr fg = GetForegroundWindow();
      if (fg != IntPtr.Zero) {
        StringBuilder sb = new StringBuilder(256);
        GetWindowText(fg, sb, 256);
        string t = sb.ToString();

        uint pid = 0;
        GetWindowThreadProcessId(fg, out pid);
        string p = "";
        try {
          var proc = System.Diagnostics.Process.GetProcessById((int)pid);
          if (proc != null) p = proc.ProcessName.ToLower();
        } catch {}

        string lowT = t.ToLower();

        // Strict Exclusion: Never analyze Antigravity, Electron, or Explorer
        if (p == "electron" || p.Contains("antigravity") || lowT.Contains("antigravity") || p == "explorer") {
          return new WindowResult {
            Found = false,
            Title = t,
            Process = p
          };
        }

        // Only process legitimate Editors or Web Browsers
        bool isEditorOrBrowser = (
          p.Contains("notepad") || lowT.Contains("notepad") ||
          p.Contains("code") || lowT.Contains("visual studio code") ||
          p.Contains("msedge") || p.Contains("chrome") || p.Contains("brave") || p.Contains("firefox") ||
          p.Contains("devenv") || p.Contains("pycharm")
        );

        if (isEditorOrBrowser) {
          RECT r;
          if (GetWindowRect(fg, out r) && (r.Right - r.Left) > 100 && (r.Bottom - r.Top) > 100) {
            return new WindowResult {
              Left = Math.Max(0, r.Left),
              Top = Math.Max(0, r.Top),
              Right = r.Right,
              Bottom = r.Bottom,
              Width = r.Right - r.Left,
              Height = r.Bottom - r.Top,
              Title = t,
              Process = p,
              Found = true
            };
          }
        }
      }

      return new WindowResult {
        Found = false,
        Title = "",
        Process = ""
      };
    }
  }
"@

$res = [Win32Bounds]::GetActiveTargetWindow()
$res | ConvertTo-Json -Compress
