# Acharya Native Screen Capture Engine — Direct GDI/User32 STA InputDesktop
# Captures full desktop screen or cropped window bounds without WebRTC locks
param(
    [string]$ImagePath = "",
    [int]$Left = 0,
    [int]$Top = 0,
    [int]$Width = 0,
    [int]$Height = 0
)

if (-not $ImagePath) {
    Write-Output '{"success": false, "error": "ImagePath parameter required"}'
    exit 0
}

Add-Type @"
  using System;
  using System.Drawing;
  using System.Drawing.Imaging;
  using System.Runtime.InteropServices;
  using System.Threading;

  public class Win32CaptureService {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenInputDesktop(uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr GetDC(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern bool DeleteDC(IntPtr hdc);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern IntPtr CreateCompatibleDC(IntPtr hdc);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern bool DeleteObject(IntPtr hObject);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, uint dwRop);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);

    public static string Capture(int x, int y, int width, int height, string outPath) {
      string jsonResult = "";
      Thread t = new Thread(() => {
        IntPtr hDesk = OpenInputDesktop(0, false, 0x01FF);
        if (hDesk == IntPtr.Zero) {
          jsonResult = "{\"success\":false,\"error\":\"OpenInputDesktop error: " + Marshal.GetLastWin32Error() + "\"}";
          return;
        }
        if (!SetThreadDesktop(hDesk)) {
          jsonResult = "{\"success\":false,\"error\":\"SetThreadDesktop error: " + Marshal.GetLastWin32Error() + "\"}";
          CloseDesktop(hDesk);
          return;
        }

        int screenW = GetSystemMetrics(0);
        int screenH = GetSystemMetrics(1);

        int capX = Math.Max(0, x);
        int capY = Math.Max(0, y);
        int capW = (width > 50) ? Math.Min(screenW - capX, width) : screenW;
        int capH = (height > 50) ? Math.Min(screenH - capY, height) : screenH;

        if (capW <= 0 || capH <= 0) {
          jsonResult = "{\"success\":false,\"error\":\"Invalid capture dimensions: " + capW + "x" + capH + "\"}";
          CloseDesktop(hDesk);
          return;
        }

        IntPtr hdcSrc = GetDC(IntPtr.Zero);
        if (hdcSrc == IntPtr.Zero) {
          jsonResult = "{\"success\":false,\"error\":\"GetDC returned null: " + Marshal.GetLastWin32Error() + "\"}";
          CloseDesktop(hDesk);
          return;
        }

        IntPtr hdcDest = CreateCompatibleDC(hdcSrc);
        IntPtr hBmp = CreateCompatibleBitmap(hdcSrc, capW, capH);
        IntPtr hOld = SelectObject(hdcDest, hBmp);

        // SRCCOPY = 0x00CC0020
        bool ok = BitBlt(hdcDest, 0, 0, capW, capH, hdcSrc, capX, capY, 0x00CC0020);
        int bitBltErr = Marshal.GetLastWin32Error();

        SelectObject(hdcDest, hOld);
        DeleteDC(hdcDest);
        ReleaseDC(IntPtr.Zero, hdcSrc);

        if (ok) {
          try {
            using (Bitmap bmp = Bitmap.FromHbitmap(hBmp)) {
              bmp.Save(outPath, ImageFormat.Png);
            }
            long len = (new System.IO.FileInfo(outPath)).Length;
            jsonResult = "{\"success\":true,\"width\":" + capW + ",\"height\":" + capH + ",\"bytes\":" + len + "}";
          } catch (Exception ex) {
            jsonResult = "{\"success\":false,\"error\":\"Bitmap save failure: " + ex.Message.Replace("\"", "\\\"") + "\"}";
          }
        } else {
          jsonResult = "{\"success\":false,\"error\":\"BitBlt failure code: " + bitBltErr + "\"}";
        }

        DeleteObject(hBmp);
        CloseDesktop(hDesk);
      });

      t.SetApartmentState(ApartmentState.STA);
      t.Start();
      t.Join();
      return jsonResult;
    }
  }
"@ -ReferencedAssemblies System.Drawing -ErrorAction SilentlyContinue

$res = [Win32CaptureService]::Capture($Left, $Top, $Width, $Height, $ImagePath)
Write-Output $res
