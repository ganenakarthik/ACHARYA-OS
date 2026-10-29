# Windows Native WinRT OCR Engine for Acharya
param(
    [string]$ImagePath = ""
)

if (-not $ImagePath -or -not (Test-Path $ImagePath)) {
    Write-Output '{"success": false, "error": "Image path invalid or missing"}'
    exit 0
}

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue

    $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { 
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' 
    } | Select-Object -First 1

    function Await-WinRT($asyncOp, $type) {
        $asTask = $asTaskGeneric.MakeGenericMethod($type)
        $netTask = $asTask.Invoke($null, @($asyncOp))
        $netTask.Wait(8000) | Out-Null
        return $netTask.Result
    }

    [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
    [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType=WindowsRuntime] | Out-Null
    [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
    [Windows.Globalization.Language, Windows.Globalization, ContentType=WindowsRuntime] | Out-Null

    $fullPath = [System.IO.Path]::GetFullPath($ImagePath)
    $file = Await-WinRT ([Windows.Storage.StorageFile]::GetFileFromPathAsync($fullPath)) ([Windows.Storage.StorageFile])
    $stream = Await-WinRT ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await-WinRT ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $softwareBmp = Await-WinRT ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("en-GB"))
    if (-not $engine) {
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    }

    $ocrResult = Await-WinRT ($engine.RecognizeAsync($softwareBmp)) ([Windows.Media.Ocr.OcrResult])
    
    # Return full text lines
    $lines = @()
    foreach ($line in $ocrResult.Lines) {
        $lines += $line.Text
    }

    $output = [PSCustomObject]@{
        success = $true
        text = $ocrResult.Text
        lines = $lines
    }

    $output | ConvertTo-Json -Compress
} catch {
    $errObj = [PSCustomObject]@{
        success = $false
        error = $_.Exception.Message
    }
    $errObj | ConvertTo-Json -Compress
}
