Pod::Spec.new do |s|
  s.name           = 'NativeAudioInfo'
  s.version        = '1.0.0'
  s.summary        = 'Reports whether other audio is playing (AVAudioSession.isOtherAudioPlaying).'
  s.description    = 'Local Expo module exposing the shared audio session state to JS.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1', :tvos => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
