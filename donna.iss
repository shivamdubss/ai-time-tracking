; Inno Setup script for Donna Windows installer

[Setup]
AppName=Donna
AppVersion=1.0.0
AppPublisher=Mesh Solutions
AppPublisherURL=https://github.com/shivam/ai-time-tracking
DefaultDirName={autopf}\Donna
DefaultGroupName=Donna
OutputBaseFilename=DonnaSetup
OutputDir=Output
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
SetupIconFile=assets\donna.ico

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a Desktop shortcut"; GroupDescription: "Additional shortcuts:"
Name: "startupicon"; Description: "Start Donna when Windows starts"; GroupDescription: "Startup:"

[Files]
Source: "dist\Donna\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs

[Icons]
Name: "{group}\Donna"; Filename: "{app}\Donna.exe"
Name: "{group}\Uninstall Donna"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Donna"; Filename: "{app}\Donna.exe"; Tasks: desktopicon

[Registry]
; Auto-start on login (optional)
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "Donna"; ValueData: """{app}\Donna.exe"" --background"; \
  Flags: uninsdeletevalue; Tasks: startupicon

[Run]
Filename: "{app}\Donna.exe"; Description: "Launch Donna"; Flags: nowait postinstall skipifsilent
