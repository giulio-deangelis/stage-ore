const dbg = {} 

sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'sap/ui/model/Filter',
    'sap/ui/model/Sorter',
    'sap/m/HBox',
    'sap/m/Column',
    'sap/m/ColumnListItem',
    'sap/ui/core/ListItem',
    'sap/m/ComboBox',
    'sap/m/Label',
    'sap/m/Input',
    'sap/m/InputType',
    'sap/m/ListMode',
    'training/hours/web/model/Formatter',
    'training/hours/web/util/MessageHelper',
    'training/hours/web/util/extensions/String',
    'training/hours/web/util/extensions/Array',
    'training/hours/web/util/extensions/Date',
    'training/hours/web/util/extensions/Table'
], (
    Controller,
    JSONModel,
    Filter,
    Sorter,
    HBox,
    Column,
    ColumnListItem,
    ListItem,
    ComboBox,
    Label,
    Input,
    InputType,
    ListMode,
    Formatter,
    MessageHelper
) => {
    'use strict'
    
    var model, odataModel, msg
    var oldData, selectedRow
    var projectsBinding, tasksBinding, hoursBinding
    var projects, tasks, hours
    const bus = sap.ui.getCore().getEventBus()

    return Controller.extend('training.hours.web.controller.Hours', {

        onInit() {
            this.getOwnerComponent()
                .getRouter()
                .getRoute('Hours')
                .attachPatternMatched(this.onEnter, this)
        },

        async onEnter() {
            model = new JSONModel()
            odataModel = this.getView().getModel()
            msg = new MessageHelper(this)
            
            bus.publish('app', 'onLimitWidth', {limitWidth: false})
            
            projectsBinding = odataModel.bindList('/projects')
            tasksBinding = odataModel.bindList('/tasks')
            projects = await projectsBinding.requestContexts(0, Infinity)
            tasks = await tasksBinding.requestContexts(0, Infinity)
            
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
        
        onTaskSelect(ev, params) {
            const projectsBox = params.projectsBox
            const tasksBox = params.tasksBox
            
            const projectName = projectsBox
                .getSelectedItem()
                .getBindingContext()
                .getProperty('name')
                
            tasksBox.setSelectedItem(null)
                
            tasksBox.bindItems({
                path: '/tasks',
                filters: new Filter('project_name', 'EQ', projectName),
                template: new ListItem({
                    key: '{name}',
                    text: '{name}'
                })
            })
        },
        
        onAdd() {
            oldData = this._copyData()
            model.unshiftProperty('/hours', {})
            this.toggleEditable(true, this.byId('hoursTable').getItems()[0], true)
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
        
        toggleEditable(editable, row, editableKeys) {
            const table = this.byId('hoursTable')
            let i = editable ? editableKeys ? 0 : 3 : 0
            row = row || table.getSelectedItem() || selectedRow
            const cells = row.getCells()
            
            function setEditable(control) {
                if (control instanceof Input) {
                    control.setEditable(editable)
                } else if (control instanceof HBox) {
                    for (const child of cells[i].findElements()) {
                        if (child instanceof Label)
                            child.setVisible(!editable)
                        else if (child instanceof ComboBox)
                            child.setVisible(editable)
                    }
                }
            }
            
            if (i < 3) {
                const projectsBox = cells[1].findElements().find(it => it instanceof ComboBox)
                const tasksBox = cells[2].findElements().find(it => it instanceof ComboBox)
                this._bindComboBoxes(projectsBox, tasksBox)
            }
            
            for (; i < cells.length; ++i)
                setEditable(cells[i])
                
            selectedRow = editable ? row : null           
            table.setMode(editable ? ListMode.None : ListMode.MultiSelect)
            
            this.byId('saveButton').setVisible(editable)
            this.byId('addButton').setVisible(!editable)
            this.byId('editButton').setVisible(!editable && !!selectedRow)
            this.byId('removeButton').setVisible(!editable && !!selectedRow)
            this.byId('cancelButton').setVisible(editable)
        },
        
        async setDate(date) {
            const {firstDate, lastDate} = date.getFortnight()
            const filter = new Filter('day', 'BT', firstDate.toISOString(), lastDate.toISOString())
            const sorters = [new Sorter('user'), new Sorter('task_project_name'), new Sorter('task_name'), new Sorter('day')]
            
            hoursBinding = odataModel.bindList('/hours', null, sorters, filter)
            hours = await hoursBinding.requestContexts(0, Infinity)
            
            this.byId('date').setValue(Formatter.formatDate(date))
            this._bindTable(firstDate.getDate(), lastDate.getDate())
        },

        _bindTable(firstDay, lastDay) {
            const table = this.byId('hoursTable').destroyRows()
            const cells = []
            
            const projectsWrapper = new HBox()
                .addItem(new Label({text: '{project}'}))
                .addItem(new ComboBox({visible: false}))
                
            const tasksWrapper = new HBox()
                .addItem(new Label({text: '{task}'}))
                .addItem(new ComboBox({visible: false}))
            
            cells.push(new Input({value: '{user}', editable: false}))
            cells.push(projectsWrapper)
            cells.push(tasksWrapper)
            
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
            
            model.setData({
                projects: projects.map(it => it.getObject()),
                tasks: tasks.map(it => it.getObject()),
                hours: rows
            })
            
            table.bindItems({
                path: '/hours',
                template: new ColumnListItem({cells})
            })
        },
        
        _bindComboBoxes(projectsBox, tasksBox) {
            projectsBox.setSelectedItem(null)
            tasksBox.setSelectedItem(null)
            
            projectsBox.bindItems({
                path: '/projects',
                template: new ListItem({
                    key: '{name}',
                    text: '{name}'
                })
            })
            
            tasksBox.unbindItems()
            
            projectsBox.attachChange({projectsBox, tasksBox}, this.onTaskSelect, this)
        },
        
        _copyData() {
            const data = model.getData()
            const newData = {projects: [], tasks: [], hours: []}
            
            for (const project of data.projects)
                newData.projects.push(Object.assign({}, project))
                
            for (const task of data.tasks)
                newData.tasks.push(Object.assign({}, task))
            
            for (const hour of data.hours)
                newData.hours.push(Object.assign({}, hour))
                
            return newData
        }
    })
})



























