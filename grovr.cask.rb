cask "grovr" do
  version "0.7.2"
  sha256 "6ce23832119671ee12fb046303e12a1b22a3a489d56c8728e73fd83e742daf9f"

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
