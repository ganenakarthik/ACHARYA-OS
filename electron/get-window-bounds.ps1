# Acharya Window Bounds Extractor — Gets active target window's exact pixel rect
# Returns JSON: { Left, Top, Right, Bottom, Width, Height, Title, Process, Found }

Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  using System.Text;

  public class Win32Bounds {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
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
      // 1. First check foreground window
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

        if (p != "electron" && !string.IsNullOrWhiteSpace(t)) {
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

      // 2. Foreground is electron or background call: Enumerate top-level visible windows
      WindowResult fallback = null;
      EnumWindows((hWnd, lParam) => {
        if (!IsWindowVisible(hWnd)) return true;
        StringBuilder sb = new StringBuilder(256);
        GetWindowText(hWnd, sb, 256);
        string t = sb.ToString();

        StringBuilder cls = new StringBuilder(256);
        GetClassName(hWnd, cls, 256);
        string c = cls.ToString();

        uint pid = 0;
        GetWindowThreadProcessId(hWnd, out pid);
        string p = "";
        try {
          var proc = System.Diagnostics.Process.GetProcessById((int)pid);
          if (proc != null) p = proc.ProcessName.ToLower();
        } catch {}

        if (p == "electron") return true;

        RECT r;
        if (!GetWindowRect(hWnd, out r) || (r.Right - r.Left) < 100 || (r.Bottom - r.Top) < 100) return true;

        string lowT = t.ToLower();
        string lowC = c.ToLower();

        // 2a. Code Editors (Top priority)
        if (p.Contains("notepad") || lowT.Contains("notepad") || lowC.Contains("notepad") ||
            p.Contains("code") || lowT.Contains("visual studio code") ||
            p.Contains("devenv") || p.Contains("pycharm")) {
          fallback = new WindowResult {
            Left = Math.Max(0, r.Left),
            Top = Math.Max(0, r.Top),
            Right = r.Right,
            Bottom = r.Bottom,
            Width = r.Right - r.Left,
            Height = r.Bottom - r.Top,
            Title = string.IsNullOrWhiteSpace(t) ? p : t,
            Process = p,
            Found = true
          };
          return false; // Found editor, stop search!
        }

        // 2b. Browsers (Second priority)
        if (fallback == null && (p.Contains("msedge") || p.Contains("chrome") || p.Contains("brave") || p.Contains("firefox"))) {
          fallback = new WindowResult {
            Left = Math.Max(0, r.Left),
            Top = Math.Max(0, r.Top),
            Right = r.Right,
            Bottom = r.Bottom,
            Width = r.Right - r.Left,
            Height = r.Bottom - r.Top,
            Title = string.IsNullOrWhiteSpace(t) ? p : t,
            Process = p,
            Found = true
          };
        }
        return true;
      }, IntPtr.Zero);

      if (fallback != null) return fallback;

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
