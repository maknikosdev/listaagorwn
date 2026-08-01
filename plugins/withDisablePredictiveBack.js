const { withAndroidManifest } = require('expo/config-plugins');

// Forces android:enableOnBackInvokedCallback="false" on the <application> tag.
// This keeps the legacy back-button dispatch active, so React Native's
// BackHandler ('hardwareBackPress') keeps receiving back-button presses
// instead of the system finishing the Activity directly via predictive back.
module.exports = function withDisablePredictiveBack(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:enableOnBackInvokedCallback'] = 'false';
    }
    return config;
  });
};
