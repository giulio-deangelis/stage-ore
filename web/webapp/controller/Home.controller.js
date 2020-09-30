sap.ui.define([
	'sap/ui/core/mvc/Controller'
], (
    Controller,
) => {
	'use strict';

	return Controller.extend('training.hours.web.controller.Home', {
	    
	    navTo(target) {
	        this.getOwnerComponent().getRouter().navTo(target)
	    },
	    
	    onShowProjects() {
	        this.navTo('Projects')
	    },
	    
	    onShowHours() {
	        this.navTo('Hours')
	    }
	});
});