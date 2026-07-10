import ExpoModulesCore
import AVFoundation

// Exposes AVAudioSession state to JS:
//  - isOtherAudioPlaying: so the app can yield its soundtrack to whatever the
//    user is already listening to instead of layering a second music bed.
//  - onAudioInterruption events: alarms, timers, Siri, and calls seize the
//    audio session WITHOUT necessarily backgrounding the app (a banner alarm
//    leaves AppState 'active'), so AppState-based recovery never fires. These
//    events let JS pause the game/music when an interruption begins and
//    restart + re-anchor when it ends.
public class NativeAudioInfoModule: Module {
  private var interruptionObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("NativeAudioInfo")

    Events("onAudioInterruption")

    // Synchronous: a cheap property read on the shared audio session. Returns
    // true when some other app's audio is actively playing on the device.
    Function("isOtherAudioPlaying") { () -> Bool in
      AVAudioSession.sharedInstance().isOtherAudioPlaying
    }

    OnStartObserving {
      guard self.interruptionObserver == nil else { return }
      self.interruptionObserver = NotificationCenter.default.addObserver(
        forName: AVAudioSession.interruptionNotification,
        object: AVAudioSession.sharedInstance(),
        queue: .main
      ) { [weak self] notification in
        guard let self = self,
              let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }
        if type == .began {
          self.sendEvent("onAudioInterruption", ["type": "began", "shouldResume": false])
        } else {
          let optionsValue = info[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
          let shouldResume = AVAudioSession.InterruptionOptions(rawValue: optionsValue).contains(.shouldResume)
          self.sendEvent("onAudioInterruption", ["type": "ended", "shouldResume": shouldResume])
        }
      }
    }

    OnStopObserving {
      if let observer = self.interruptionObserver {
        NotificationCenter.default.removeObserver(observer)
        self.interruptionObserver = nil
      }
    }
  }
}
