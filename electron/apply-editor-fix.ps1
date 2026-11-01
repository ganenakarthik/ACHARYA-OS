# Acharya Auto-Fix Injector — Win32 STA InputDesktop Engine
# Switches to active editor (Notepad, VS Code, Terminal) and simulates Select All + Paste
Add-Type @"
using System;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

public class WinEditorFixer {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll")]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);

    public static IntPtr FindAndFocusEditor() {
        IntPtr result = IntPtr.Zero;
        Thread t = new Thread(() => {
            IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
            if (hDesk == IntPtr.Zero) return;
            SetThreadDesktop(hDesk);

            EnumDesktopWindows(hDesk, (hWnd, lParam) => {
                if (!IsWindowVisible(hWnd)) return true;
                uint pid = 0;
                GetWindowThreadProcessId(hWnd, out pid);
                string proc = "";
                try { proc = Process.GetProcessById((int)pid).ProcessName.ToLower(); } catch {}

                StringBuilder title = new StringBuilder(256);
                GetWindowText(hWnd, title, 256);
                string tStr = title.ToString().ToLower();

                StringBuilder cls = new StringBuilder(256);
                GetClassName(hWnd, cls, 256);
                string cname = cls.ToString().ToLower();

                if (proc == "notepad" || tStr.Contains("notepad") || cname.Contains("notepad") ||
                    proc == "code" || tStr.Contains("visual studio code") ||
                    proc == "windowsterminal") {
                    result = hWnd;
                    return false;
                }
                return true;
            }, IntPtr.Zero);

            if (result != IntPtr.Zero) {
                SwitchToThisWindow(result, true);
                SetForegroundWindow(result);
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

$hwnd = [WinEditorFixer]::FindAndFocusEditor()
if ($hwnd -ne [IntPtr]::Zero) {
    Start-Sleep -Milliseconds 180
    $wsh = New-Object -ComObject WScript.Shell
    $wsh.SendKeys('^a')
    Start-Sleep -Milliseconds 80
    $wsh.SendKeys('^v')
    Write-Output "SUCCESS"
} else {
    Write-Output "NO_WINDOW_FOUND"
}
