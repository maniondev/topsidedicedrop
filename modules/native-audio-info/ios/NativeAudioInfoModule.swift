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
//  - onAudioRouteChange events: connecting/disconnecting Bluetooth (AirPods),
//    wired headphones, CarPlay, etc. Route negotiation (especially Bluetooth)
//    can take longer than the app's fixed "did playback actually start"
//    timeouts, which silently left the beat-sync epoch unset (animations
//    stuck at idle tier 0) even though audio eventually played. This event
//    lets JS re-verify sync state whenever the route changes, instead of
//    relying on luck / the next unrelated foreground event.
public class NativeAudioInfoModule: Module {
  private var interruptionObserver: NSObjectProtocol?
  private var routeChangeObserver: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("NativeAudioInfo")

    Events("onAudioInterruption", "onAudioRouteChange")

    // Synchronous: a cheap property read on the shared audio session. Returns
    // true when some other app's audio is actively playing on the device.
    Function("isOtherAudioPlaying") { () -> Bool in
      AVAudioSession.sharedInstance().isOtherAudioPlaying
    }

    OnStartObserving {
      if self.interruptionObserver == nil {
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

      if self.routeChangeObserver == nil {
        self.routeChangeObserver = NotificationCenter.default.addObserver(
          forName: AVAudioSession.routeChangeNotification,
          object: AVAudioSession.sharedInstance(),
          queue: .main
        ) { [weak self] notification in
          guard let self = self,
                let info = notification.userInfo,
                let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
                let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else { return }
          self.sendEvent("onAudioRouteChange", ["reason": self.reasonName(reason)])
        }
      }
    }

    OnStopObserving {
      if let observer = self.interruptionObserver {
        NotificationCenter.default.removeObserver(observer)
        self.interruptionObserver = nil
      }
      if let observer = self.routeChangeObserver {
        NotificationCenter.default.removeObserver(observer)
        self.routeChangeObserver = nil
      }
    }
  }

  private func reasonName(_ reason: AVAudioSession.RouteChangeReason) -> String {
    switch reason {
    case .newDeviceAvailable: return "newDeviceAvailable"
    case .oldDeviceUnavailable: return "oldDeviceUnavailable"
    case .categoryChange: return "categoryChange"
    case .override: return "override"
    case .wakeFromSleep: return "wakeFromSleep"
    case .noSuitableRouteForCategory: return "noSuitableRouteForCategory"
    case .routeConfigurationChange: return "routeConfigurationChange"
    default: return "unknown"
    }
  }
}
