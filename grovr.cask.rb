cask "grovr" do
  version "0.7.0"
  sha256 "8d14d6f9b819679c52452a259734e3d412945571744caae74e7c0691cbf1f0f0"

  url "https://github.com/j1king/grovr/releases/download/v#{version}/Grovr_#{version}_aarch64.dmg"
  name "Grovr"
  desc "Desktop Git worktree manager"
  homepage "https://github.com/j1king/grovr"

  depends_on macos: ">= :catalina"
  depends_on arch: :arm64
  auto_updates true

  app "Grovr.app"

  zap trash: [
    "~/Library/Application Support/com.grovr.desktop",
    "~/Library/Preferences/com.grovr.desktop.plist",
    "~/Library/Saved Application State/com.grovr.desktop.savedState",
  ]
end
