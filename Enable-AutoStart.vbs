Option Explicit
Dim sh,fso,folder,shortcut,scriptPath
Set sh=CreateObject("WScript.Shell")
Set fso=CreateObject("Scripting.FileSystemObject")
folder=sh.SpecialFolders("Startup")
scriptPath=fso.GetAbsolutePathName(fso.GetParentFolderName(WScript.ScriptFullName) & "\\RushFinder.vbs")
Set shortcut=sh.CreateShortcut(folder & "\\RushFinder.lnk")
shortcut.TargetPath="wscript.exe"
shortcut.Arguments="""" & scriptPath & """"
shortcut.WorkingDirectory=fso.GetParentFolderName(scriptPath)
shortcut.Description="Launch RushFinder silently on Windows login"
shortcut.Save
MsgBox "RushFinder will start automatically when you sign in to Windows.",64,"RushFinder"
