import { i18n } from '@kbn/i18n';

import alertsRoute from './server/routes/alerts';
import acknowledgeAlertRoute from './server/routes/acknowledge_alert';

export default function(kibana) {
  return new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'srirachaiq_alerts',
    uiExports: {
      app: {
        title: 'Srirachaiq Alerts',
        description: 'SrirachaIQ Alerts',
        main: 'plugins/srirachaiq_alerts/app',
      },
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    // eslint-disable-next-line no-unused-vars
    init(server, options) {
      const xpackMainPlugin = server.plugins.xpack_main;
      if (xpackMainPlugin) {
        const featureId = 'srirachaiq_alerts';

        xpackMainPlugin.registerFeature({
          id: featureId,
          name: i18n.translate('srirachaiqAlerts.featureRegistry.featureName', {
            defaultMessage: 'srirachaiq_alerts',
          }),
          navLinkId: featureId,
          icon: 'questionInCircle',
          app: [featureId, 'kibana'],
          catalogue: [],
          privileges: {
            all: {
              api: [],
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['show'],
            },
            read: {
              api: [],
              savedObject: {
                all: [],
                read: [],
              },
              ui: ['show'],
            },
          },
        });
      }

      // Add server routes and initialize the plugin here
      alertsRoute(server);
      acknowledgeAlertRoute(server);
    },
  });
}
