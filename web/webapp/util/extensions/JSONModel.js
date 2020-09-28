sap.ui.define([
	'sap/ui/model/json/JSONModel',
	'./String',
	'./Array'
], (JSONModel) => {
	'use strict';

	$.extend(JSONModel.prototype, {
	    
	    /** Adds an element to the beginning of the list at the specified path */
	    unshiftProperty(listPath, value) {
	        this._addProperty(listPath, value, true)
	    },
	    
	    /** Pushes an element to the list at the specified path  */
	    pushProperty(listPath, value) {
	        this._addProperty(listPath, value, false)
	    },

		/** Removes a property  from this model, even if it refers to an element inside a list */
		removeProperty(path) {
			const index = parseInt(path.substringAfterLast('/'), 0);
			if (index >= 0) { // if it's an array property
				const listPath = path.substringBeforeLast('/');
				const list = this.getProperty(listPath);
				list.removeAt(index);
				this.setProperty(listPath, list);
			} else {
				this.setProperty(path, undefined);
			}
		},
		
	    _addProperty(listPath, value, unshift) {
	        const list = this.getProperty(listPath);
	        if (unshift) list.unshift(value)
	        else list.push(value);
	        this.setProperty(listPath, list);
	    }
	});
});