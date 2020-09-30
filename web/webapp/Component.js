sap.ui.define([
	'sap/ui/core/UIComponent',
	'sap/ui/Device',
	'training/hours/web/model/models'
], function (UIComponent, Device, models) {
	'use strict';

	return UIComponent.extend('training.hours.web.Component', {

		metadata: {
			manifest: 'json'
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init() {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), 'device');
		}
	});
});