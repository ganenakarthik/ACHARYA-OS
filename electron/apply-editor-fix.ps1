Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;

public class WinEditorFixer {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);

    public static IntPtr FindEditor() {
        IntPtr result = IntPtr.Zero;
        EnumWindows((hWnd, lParam) => {
            if (!IsWindowVisible(hWnd)) return true;
            StringBuilder sb = new StringBuilder(256);
            GetWindowText(hWnd, sb, 256);
            string title = sb.ToString();
            
            StringBuilder cls = new StringBuilder(256);
            GetClassName(hWnd, cls, 256);
            string cname = cls.ToString();

            if (title.ToLower().Contains("notepad") || cname.ToLower().Contains("notepad") ||
                title.ToLower().Contains("visual studio code") || title.ToLower().Contains(".py - ") ||
                cname == "Notepad") {
                result = hWnd;
                return false;
            }
            return true;
        }, IntPtr.Zero);
        return result;
    }
}
"@ -ErrorAction SilentlyContinue

$hwnd = [WinEditorFixer]::FindEditor()
if ($hwnd -ne [IntPtr]::Zero) {
    [WinEditorFixer]::SwitchToThisWindow($hwnd, $true)
    [WinEditorFixer]::SetForegroundWindow($hwnd)
    Start-Sleep -Milliseconds 150
    $wsh = New-Object -ComObject WScript.Shell
    $wsh.SendKeys('^a')
    Start-Sleep -Milliseconds 80
    $wsh.SendKeys('^v')
    Write-Output "SUCCESS"
} else {
    Write-Output "NO_WINDOW_FOUND"
}
