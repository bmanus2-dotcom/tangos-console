; Custom NSIS hooks for tangOS Console (electron-builder nsis.include).
; On uninstall, remove the user-data folder so nothing is left strewn around. We delete both the
; current identifiable folder and the legacy generic "console" folder from before the rename.
!macro customUnInstall
  RMDir /r "$APPDATA\tangOS Console"
  RMDir /r "$APPDATA\console"
!macroend
