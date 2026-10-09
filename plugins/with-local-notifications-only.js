/**
 * expo-notifications always adds the `aps-environment` (push) entitlement on iOS. This
 * app only schedules local notifications, which don't need it, and the entitlement
 * makes sideloaded installs fail on free Apple developer accounts. Remove it.
 *
 * List this plugin *before* expo-notifications in app.json: entitlement mods run in
 * reverse order of registration, so it then runs after expo-notifications adds the key.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
