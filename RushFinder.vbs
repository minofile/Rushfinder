Option Explicit
Dim sh, fs, folder, target
Set sh = CreateObject("WScript.Shell")
Set fs = CreateObject("Scripting.FileSystemObject")
folder = fs.GetParentFolderName(WScript.ScriptFullName)
target = fs.BuildPath(folder, "Start-RushFinder.cmd")
If Not fs.FileExists(target) Then
    MsgBox "Start-RushFinder.cmd is missing. Extract the full ZIP before running RushFinder.", 48, "RushFinder"
    WScript.Quit 1
End If
sh.CurrentDirectory = folder
sh.Run Chr(34) & target & Chr(34), 1, False
