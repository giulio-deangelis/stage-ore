/* eslint no-console: 0, no-warning-comments: 0, no-unused-vars: 0 */
/* eslint-env es6 */

/** Java-like List extension methods */
sap.ui.define([], function () {
	"use strict";
	
	$.extend(Array.prototype, {
	    
	    distinct: function () {
	        const set = new Set();
	        for (const element of this)
	            set.add(element);
            return Array.from(set);
	    },
	    
	    clear: function () {
	        this.length = 0;
	    },
	    
	    isEmpty: function () {
	        return this.length === 0;
	    },
	    
	    isNotEmpty: function () {
	        return this.length > 0;
	    },
	    
	    first: function () {
	        return this[0];
	    },
	    
	    last: function () {
	        return this[this.length - 1];
	    },
	    
	    mapNotNull: function (transform) {
	        const list = [];
	        for (const element of this) {
	            const transformed = transform(element);
	            if (transformed) list.push(transformed);
	        }
	        return list;
	    },
	    
	    removeAt: function (index) {
	        const element = this[index];
	        this.splice(index, 1);
	        return element;
	    },
	    
	    removeFirst: function (predicate) {
	        const index = this.findIndex(predicate);
	        if (index >= 0) return this.remove(index);
	        else return null;
	    },
	    
	    remove: function (element, key) {
	        return this.removeFirst(it => it[key] === element[key]);
	    },
	    
	    removeAll: function (elements, key) {
	        for (const element of elements)
	            this.remove(element, key);
            return this;
	    }
	});
});