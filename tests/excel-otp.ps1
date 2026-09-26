$ErrorActionPreference = 'Stop'
$testFolder = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '../test-results') -Directory -Filter 'otp-*' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$testFile = Join-Path $testFolder.FullName 'vault.xlsx'
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$book = $null
try {
    $book = $excel.Workbooks.Open($testFile, 0, $true, [Type]::Missing, 'Otp-test-password-123!')
    $fields = $book.Worksheets.Item(2)
    $found = $false
    for ($row = 2; $row -le $fields.UsedRange.Rows.Count; $row++) {
        $value = $fields.Cells.Item($row, 5).Text
        if ($value.StartsWith('otpauth://totp/') -and $value.Contains('secret=JBSWY3DPEHPK3PXP')) { $found = $true }
    }
    if (-not $found) { throw 'OTP recovery material not readable in Excel' }
    Write-Output 'PASS: Microsoft Excel independently reads OTP recovery URI from custom fields sheet.'
} finally {
    if ($null -ne $book) { $book.Close($false) }
    $excel.Quit()
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel)
}
