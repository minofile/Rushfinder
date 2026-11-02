Option Explicit
Dim sh, fso, root, srv, ver, check, command, i, ok
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = root
srv = "http://127.0.0.1:18810/ae-api/check"
ok = False
For i = 1 To 2
  On Error Resume Next
  Set check = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  check.setTimeouts 500,500,700,700
  check.open "GET", srv, False
  check.send
  If Err.Number = 0 Then
    If check.status = 200 And InStr(check.responseText, "0796") > 0 Then ok = True
  End If
  Err.Clear
  On Error GoTo 0
  If ok Then Exit For
Next
If Not ok Then
  command = "cmd.exe /c cd /d """ & root & """ && node ""ae-auto-server.js"""
  sh.Run command, 0, False
  sh.Run "powershell.exe -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & root & "\ae-tray.ps1""", 0, False
  For i = 1 To 30
    WScript.Sleep 500
    On Error Resume Next
    Set check = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    check.setTimeouts 400,400,400,400
    check.open "GET", srv, False
    check.send
    If Err.Number = 0 Then
      If check.status = 200 And InStr(check.responseText, "0796") > 0 Then ok = True
    End If
    Err.Clear
    On Error GoTo 0
    If ok Then Exit For
  Next
End If
If ok Then
  sh.Run "http://127.0.0.1:18810/index.html?v=0796", 1, False
Else
  MsgBox "RushFinder could not start the local render engine. Please make sure Node.js is installed. / موتور محلی اجرا نشد؛ نصب Node.js را بررسی کنید.", 48, "RushFinder"
End If
