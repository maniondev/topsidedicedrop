import ExpoModulesCore
import AVFoundation

// Exposes AVAudioSession.isOtherAudioPlaying to JS so the app can yield its own
// background soundtrack to whatever the user is already listening to (their
// music, a podcast, etc.) instead of layering a second music bed on top.
public class NativeAudioInfoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeAudioInfo")

    // Synchronous: a cheap property read on the shared audio session. Returns
    // true when some other app's audio is actively playing on the device.
    Function("isOtherAudioPlaying") { () -> Bool in
      AVAudioSession.sharedInstance().isOtherAudioPlaying
    }
  }
}
