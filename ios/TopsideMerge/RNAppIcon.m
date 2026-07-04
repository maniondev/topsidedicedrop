#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface RNAppIcon : NSObject <RCTBridgeModule>
@end

@implementation RNAppIcon

RCT_EXPORT_MODULE(RNAppIcon);

RCT_EXPORT_METHOD(setIcon:(NSString *)name
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  if (!UIApplication.sharedApplication.supportsAlternateIcons) {
    resolve(@(NO));
    return;
  }
  NSString *iconName = [name isEqualToString:@"default"] ? nil : name;
  [UIApplication.sharedApplication setAlternateIconName:iconName completionHandler:^(NSError * _Nullable error) {
    dispatch_async(dispatch_get_main_queue(), ^{
      if (error) {
        reject(@"set_icon_error", error.localizedDescription, error);
      } else {
        resolve(@(YES));
      }
    });
  }];
}

RCT_EXPORT_METHOD(getIcon:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *current = UIApplication.sharedApplication.alternateIconName;
  resolve(current ?: @"default");
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
