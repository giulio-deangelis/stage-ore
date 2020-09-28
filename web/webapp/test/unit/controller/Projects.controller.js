/*global QUnit*/

sap.ui.define([
	"training/hours/web/controller/Projects.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Projects Controller");

	QUnit.test("I should test the Projects controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});