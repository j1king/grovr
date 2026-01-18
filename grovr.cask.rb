cask "grovr" do
  version "0.7.1"
  sha256 "591e7d19c9e8a4a3d5f4f060b497998edcd80562ea7a0666387c4394a62858f1"

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
