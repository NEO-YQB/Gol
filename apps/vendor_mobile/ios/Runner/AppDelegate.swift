import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate {
  private let sessionChannelName = "com.golino.vendorapp/session_storage"
  private let sessionDefaultsSuite = "vendor_mobile_storage"

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)

    if let controller = window?.rootViewController as? FlutterViewController {
      let sessionChannel = FlutterMethodChannel(
        name: sessionChannelName,
        binaryMessenger: controller.binaryMessenger
      )

      sessionChannel.setMethodCallHandler { [weak self] call, result in
        guard let self else { return }
        let defaults = UserDefaults.standard
        let args = call.arguments as? [String: Any]
        let key = args?["key"] as? String

        switch call.method {
        case "saveSession":
          let value = args?["value"] as? String
          guard let key, !key.isEmpty, let value else {
            result(FlutterError(code: "invalid_args", message: "کلید یا مقدار سشن معتبر نیست.", details: nil))
            return
          }
          defaults.set(value, forKey: self.scopedKey(key))
          result(true)
        case "loadSession":
          guard let key, !key.isEmpty else {
            result(FlutterError(code: "invalid_args", message: "کلید سشن معتبر نیست.", details: nil))
            return
          }
          result(defaults.string(forKey: self.scopedKey(key)))
        case "clearSession":
          guard let key, !key.isEmpty else {
            result(FlutterError(code: "invalid_args", message: "کلید سشن معتبر نیست.", details: nil))
            return
          }
          defaults.removeObject(forKey: self.scopedKey(key))
          result(true)
        default:
          result(FlutterMethodNotImplemented)
        }
      }
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  private func scopedKey(_ key: String) -> String {
    "\(sessionDefaultsSuite).\(key)"
  }
}
