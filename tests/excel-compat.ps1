$ErrorActionPreference = 'Stop'
$excelTestPath = Join-Path $PSScriptRoot '../test-results/desktop-vault.xlsx'
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$workbook = $null
try {
    $workbook = $excel.Workbooks.Open((Resolve-Path $excelTestPath).Path, 0, $true, [Type]::Missing, 'Desktop-test-123!')
    $sheet = $workbook.Worksheets.Item(1)
    if ($sheet.Cells.Item(2, 5).Text -ne 'Secure-example-123!') { throw 'Excel password data mismatch' }
    $expectedTitle = -join ([char[]](0x6d4b,0x8bd5,0x90ae,0x7bb1))
    if ($sheet.Cells.Item(2, 2).Text -ne $expectedTitle) { throw 'Excel Unicode mismatch' }
    Write-Output 'PASS: Microsoft Excel independently opened encrypted workbook and read exact password and Chinese title.'
} finally {
    if ($null -ne $workbook) { $workbook.Close($false) }
    $excel.Quit()
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($excel)
}
