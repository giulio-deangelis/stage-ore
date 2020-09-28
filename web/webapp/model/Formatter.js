/* eslint-env es6 */
/* eslint no-console: 0, no-warning-comments: 0, no-unused-vars: 0 */

sap.ui.define([
	"sap/ui/core/format/DateFormat"
], function (DateFormat) {
	"use strict";

	const dateFormatter = DateFormat.getDateInstance({pattern: "dd/MM/yyyy"});

	return {

		formatDate: function (date) {
		    const parsedDate = (typeof date === "string") ? dateFormatter.parse(date) : date;
		    return dateFormatter.format(parsedDate, true);
		},
		
		parseDate: function (dateStr) {
		    return dateFormatter.parse(dateStr, true); 
		}
	};
});