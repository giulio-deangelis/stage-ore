const dbg = {} 

sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/Filter',
    'sap/ui/model/Sorter',
    'sap/m/Column',
    'sap/m/ColumnListItem',
    'sap/m/Label',
    'sap/m/Input',
    'sap/m/InputType',
    'sap/m/ListMode',
    'training/hours/web/model/Formatter',
    'training/hours/web/util/MessageHelper',
    'training/hours/web/util/extensions/String',
    'training/hours/web/util/extensions/Array',
    'training/hours/web/util/extensions/Date'
], (
    Controller,
    JSONModel,
    Filter,
    Sorter,
    Column,
    ColumnListItem,
    Label,
    Input,
    InputType,
    ListMode,
    Formatter,
    MessageHelper
) => {
    'use strict'
    
    var model, odataModel, msg
    var hoursBinding, oldData, selectedRow
    const bus = sap.ui.getCore().getEventBus()

    return Controller.extend('training.hours.web.controller.Hours', {

        onInit() {
            this.getOwnerComponent()
                .getRouter()
                .getRoute('Hours')
                .attachPatternMatched(this.onEnter, this)
        },

        onEnter() {
            model = new JSONModel()
            odataModel = this.getView().getModel()
            msg = new MessageHelper(this)
            bus.publish('app', 'onLimitWidth', {limitWidth: false})
            this.setDate(new Date())
        },

        onLeave() {
            this.getOwnerComponent().getRouter().navTo('Projects')
        },
        
        onDateChange(ev) {
            const date = Formatter.parseDate(ev.getParameter('value'))
            this.setDate(date)
        },
        
        onSelect(ev) {
            const count = ev.getSource().getSelectedItems().length
            this.byId('editButton').setVisible(count === 1)
            this.byId('removeButton').setVisible(count > 0)
        },
        
        onAdd() {
            oldData = this._copyData()
            model.unshiftProperty('/hours', {})
            this.toggleEditable(true, this.byId('hoursTable').getItems()[0])
        },
        
        onEdit() {
            oldData = this._copyData()
            this.toggleEditable(true)
        },
        
        onCancel() {
            model.setData(oldData)
            this.toggleEditable(false)
        },
        
        onSave() {
            this.toggleEditable(false)
            // TODO save by merging with hoursBinding
        },
        
        toggleEditable(editable, row) {
            const table = this.byId('hoursTable')
            row = row || table.getSelectedItem() || selectedRow
            
            for (const cell of row.getCells()) {
                if (cell instanceof Input)
                    cell.setEditable(editable)
            }
            
            selectedRow = editable ? row : null           
            table.setMode(editable ? ListMode.None : ListMode.MultiSelect)
            
            this.byId('saveButton').setVisible(editable)
            this.byId('addButton').setVisible(!editable)
            this.byId('editButton').setVisible(!editable && !!selectedRow)
            this.byId('removeButton').setVisible(!editable && !!selectedRow)
            this.byId('cancelButton').setVisible(editable)
        },
        
        setDate(date) {
            const {firstDate, lastDate} = date.getFortnight()
            const filter = new Filter('day', 'BT', firstDate.toISOString(), lastDate.toISOString())
            const sorters = [new Sorter('user'), new Sorter('task_project_name'), new Sorter('task_name'), new Sorter('day')]
            
            hoursBinding = odataModel.bindList('/hours', null, sorters, filter)
            
            this.byId('date').setValue(Formatter.formatDate(date))
            this._bindTable(firstDate.getDate(), lastDate.getDate())
        },

        _bindTable(firstDay, lastDay) {
            const table = this.byId('hoursTable')
            const cells = []

            table.unbindItems()
            table.removeAllColumns()
            
            cells.push(new Label({text: '{user}'}))
            cells.push(new Label({text: '{project}'}))
            cells.push(new Label({text: '{task}'}))
            
            table.addColumn(new Column().setHeader(new Label({text: msg.i18n('user')})))
            table.addColumn(new Column().setHeader(new Label({text: msg.i18n('project')})))
            table.addColumn(new Column().setHeader(new Label({text: msg.i18n('task')})))
            
            if (lastDay === 16)
                lastDay = 15
            
            for (let day = firstDay; day <= lastDay; ++day) {
                table.addColumn(new Column().setHeader(new Label({text: day})))
                cells.push(new Input({
                    value: `{day${day}}`,
                    editable: false,
                    width: '.5rem',
                    type: InputType.Number
                    
                }))
            }
            
            table.setModel(model)
            
            hoursBinding.requestContexts(0, Infinity).then(hours => {
                const rows = []
                let prevUser, prevProject, prevTask
                
                for (const hour of hours) {
                    const user = hour.getProperty('user')
                    const project = hour.getProperty('task_project_name')
                    const task = hour.getProperty('task_name')
                    const day = new Date(hour.getProperty('day')).getDate()
                    const hours = hour.getProperty('hours')
                    
                    if (prevUser !== user || prevProject !== project || prevTask !== task)
                        rows.push({user, project, task})
                    else rows.last()[`day${day}`] = hours
                    
                    prevUser = user
                    prevProject = project
                    prevTask = task
                }
                
                model.setData({hours: rows})
                
                table.bindItems({
                    path: '/hours',
                    template: new ColumnListItem({cells})
                })
            })
        },
        
        _copyData() {
            const hours = model.getData().hours
            const data = []
            for (const hour of hours)
                data.push(Object.assign({}, hour))
            return {hours: data}
        }
    })
})



























