/* eslint-env es6 */
/* eslint 
    no-unused-vars: 1,
    no-warning-comments: 1,
    semi: 0,
    no-shadow: 0,
    no-console: 0,
    quotes: 0, 
    curly: 0,
*/

sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'training/hours/web/util/MessageHelper'
], function (Controller, MessageHelper) {
    'use strict'

    var model, msg
    const bus = sap.ui.getCore().getEventBus()

    return Controller.extend('training.hours.web.controller.Projects', {

        onInit() {
            this.onEnter()
            // bus.subscribe('editor', 'onSaved', this.onSaved, this)
            bus.subscribe('editor', 'onDeleted', this.onDeleted, this)
            bus.subscribe('app', 'onLimitWidth', this.onLimitAppWidth, this)
            
            this.getOwnerComponent().getRouter().getRoute('Projects')
                .attachPatternMatched(this.onEnter, this)
        },
        
        onEnter() {
            model = this.getView().getModel()
            msg = new MessageHelper(this)
            this.byId('shell').setAppWidthLimited(true)
        },
        
        onLeave() {
            model.resetChanges()
            this.getOwnerComponent().getRouter().navTo('Home')
            this.navTo('welcome')
        },

        navTo(id) {
            model.resetChanges()
            this.byId('splitter').toDetail(this.createId(id), 'fade')
        },
        
        onLimitAppWidth(ch, ev, params) {
            this.byId('shell').setAppWidthLimited(params.limitWidth)
        },

        onCreate() {
            this.navTo('editor')
            const projectBinding = this.byId('projectList').getBinding('items')
            this.byId('deleteButton').setVisible(false)
            bus.publish('editor', 'onBind', {projectBinding})
        },

        onShow(ev) {
            const projectBinding = this.byId('projectList').getBinding('items')
            const context = ev.getParameter('listItem').getBindingContext()
            this.byId('deleteButton').setVisible(true)
            bus.publish('editor', 'onBind', {context, projectBinding})
            this.navTo('editor')
        },

        onSave() {
            bus.publish('editor', 'onSave')
        },

        onDelete() {
            msg.confirm('confirmDeletion', 'confirm', ok => {
                if (ok) bus.publish('editor', 'onDelete')
            })
        },

        onDeleted() {
            bus.publish('editor', 'onLeave')
            this.navTo('welcome')
            model.refresh()
        }
    })
})









