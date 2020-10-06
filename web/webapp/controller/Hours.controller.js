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
    'sap/ui/export/Spreadsheet',
    'training/hours/web/model/Formatter',
    'training/hours/web/util/MessageHelper'
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
    SpreadSheet,
    Formatter,
    MessageHelper
) => {
    'use strict'

    var model, odataModel, msg
    var oldData, selectedRow, editing
    var currentDate, firstDate, lastDate
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
            this.getOwnerComponent().getRouter().navTo('Home')
        },

        onDateChange(ev) {
            const date = Formatter.parseDate(ev.getParameter('value'))
            this.setEditable(false)
            this.setDate(date)
        },
        
        onPreviousFortnight() {
            const date = new Date(firstDate)
            date.setDate(date.getDate() - 1)
            this.setDate(date)
        },
        
        onNextFortnight() {
            const date = new Date(lastDate)
            date.setDate(date.getDate() + 1)
            this.setDate(date)
        },

        onRefresh() {
            const date = Formatter.parseDate(this.byId('date').getValue())
            this.setDate(date)
        },

        onSelect(ev) {
            const count = ev.getSource().getSelectedItems().length
            this.byId('editButton').setVisible(count === 1)
            this.byId('removeButton').setVisible(count > 0)
        },

        onProjectSelect(ev, params) {
            const projectsBox = params.projectsBox
            const tasksBox = params.tasksBox

            const projectName = projectsBox
                .getSelectedItem()
                .getBindingContext()
                .getProperty('name')

            // update the json model accordingly
            const jsonPath = selectedRow.getBindingContext().getPath()
            model.setProperty(`${jsonPath}/project`, projectName)

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

        onTaskSelect(ev) {
            const taskName = ev.getParameter('value')
            const jsonPath = selectedRow.getBindingContext().getPath()
            model.setProperty(`${jsonPath}/task`, taskName)
        },

        onAdd() {
            oldData = this._copyData()
            editing = false
            model.unshiftProperty('/hours', {})
            this.setEditable(true, this.byId('hoursTable').getItems()[0], true)
        },

        onEdit() {
            oldData = this._copyData()
            editing = true
            this.setEditable(true)
        },

        setBusy(busy) {
            this.byId('hoursTable').setBusy(busy)
            this.byId('saveButton').setEnabled(!busy)
            this.byId('cancelButton').setEnabled(!busy)
            this.byId('date').setEnabled(!busy)
            this.byId('refreshButton').setEnabled(!busy)
        },

        onRemove() {
            msg.confirm('confirmRemove', 'confirm', async ok => {
                if (!ok) return
                const table = this.byId('hoursTable')
                const selectedRows = table.getSelectedItems().slice()
                const paths = []

                this.setBusy(true)

                try {
                    for (const row of selectedRows) {
                        const hours = this._getHoursFromRow(row)
                        
                        // remember the path to delete it from the json model later
                        paths.push(row.getBindingContext().getPath())

                        // we can simply set the hours to 0 and call the update method
                        for (const hour of hours) {
                            hour.hours = 0
                            await this._update(hour)
                        }
                    }
                    
                    model.removeProperties(paths)

                } catch (err) {
                    console.error(err)
                    msg.error('removeFailed')
                } finally {
                    this.setBusy(false)
                    table.removeSelections(true)
                }
            })
        },

        onCancel() {
            model.setData(oldData)
            this.setEditable(false)
        },

        async onSave() {
            const saveButton = this.byId('saveButton')
            const row = selectedRow.getBindingContext().getObject()
            const hours = this._getHoursFromRow(row)

            this.setBusy(true)
            saveButton.setEnabled(false)

            try {
                for (const hour of hours) {
                    if (editing)
                        await this._update(hour)
                    else if (hour.hours > 0)
                        await this._create(hour)
                }
                await this._submitBatch()

            } catch (err) {
                console.error(err)
                msg.error('saveFailed')
            } finally {
                this.setBusy(false)
                saveButton.setEnabled(true)
                
                this.setEditable(false)
            }
        },
        
        onDownload() {
            const firstDay = firstDate.getDate()
            const lastDay = lastDate.getDate()
            const dateString = `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`
            
            const columns = [{
                    label: msg.i18n('user'),
                    property: 'user'
                }, {
                    label: msg.i18n('project'),
                    property: 'task'
                }, {
                    label: msg.i18n('task'),
                    property: 'project'
            }]
            
            for (let day = firstDay; day <= lastDay; ++day) {
                columns.push({
                    label: day,
                    property: `day${day}`
                })
            }

            const sheet = new SpreadSheet({
                worker: true,
                fileName: msg.i18n('hoursFileName') + `_${dateString}.xlsx`,
                workbook: {columns},
                dataSource: model.getProperty('/hours')
            })
            
		    sheet.build().catch((err) => {
	            if (!err.includes('Export cancelled')) {
                    console.error(err);
                    msg.error('downloadFailed');
	            }
	        });
        },

        setEditable(editable, row, editableKeys) {
            const table = this.byId('hoursTable')
            row = row || selectedRow || table.getSelectedItem()
            selectedRow = editable ? row : null

            this.byId('saveButton').setVisible(editable)
            this.byId('addButton').setVisible(!editable)
            this.byId('editButton').setVisible(!editable && !!selectedRow)
            this.byId('removeButton').setVisible(!editable && !!selectedRow)
            this.byId('cancelButton').setVisible(editable)
            table.setMode(editable ? ListMode.None : ListMode.MultiSelect)

            if (!row) return

            const cells = row.getCells()
            let i = editable ? editableKeys ? 0 : 3 : 0

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
        },

        async setDate(date) {
            const table = this.byId('hoursTable')
            table.setBusy(true)

            const fortnight = date.getFortnight()
            currentDate = date
            firstDate = fortnight.firstDate
            lastDate = fortnight.lastDate
            const filter = new Filter('day', 'BT', firstDate.toISOString(), lastDate.toISOString())
            const sorters = [new Sorter('user'), new Sorter('task_project_name'), new Sorter('task_name'), new Sorter('day')]

            hoursBinding = odataModel.bindList('/hours', null, sorters, filter)
            hours = await hoursBinding.requestContexts(0, Infinity)

            this.byId('date').setValue(Formatter.formatDate(date, false))
            this._bindTable()
            table.setBusy(false)
        },

        _bindTable() {
            const table = this.byId('hoursTable').destroyRows()
            const cells = []
            const firstDay = firstDate.getDate()
            const lastDay = lastDate.getDate()

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
                rows.last()[`day${day}`] = hours

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

            projectsBox.attachChange({projectsBox, tasksBox}, this.onProjectSelect, this)
            tasksBox.attachChange(this.onTaskSelect, this)
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
        },

        _getHoursFromRow(row) {
            if (row.getBindingContext)
                row = row.getBindingContext().getObject()
                
            const year = firstDate.getFullYear()
            const month = firstDate.getMonth() + 1
            const user = row.user
            const projectName = row.project
            const taskName = row.task
            const hours = []

            for (let day = firstDate.getDate(); day <= lastDate.getDate(); ++day) {
                hours.push({
                    'user': user,
                    'task_project_name': projectName,
                    'task_name': taskName,
                    'day': Formatter.parseDate(`${day}/${month}/${year}`),
                    'hours': parseInt(row[`day${day}`])
                })
            }

            return hours
        },

        _create(newEntity, checkDuplicate = true) {
            if (checkDuplicate && this._getHoursContext(newEntity))
                throw new Error('duplicate hours entity')
            return hoursBinding.create(newEntity)
        },

        async _update(newEntity) {
            const entity = this._getHoursContext(newEntity)
            if (!entity && newEntity.hours > 0) {
                await this._create(newEntity, false)
            } else if (entity) {
                if (newEntity.hours > 0 && entity.getProperty('hours') !== newEntity.hours) {
                    await entity.delete('$auto')
                    await this._create(newEntity, false)
                    // TODO update hangs
                    // await entity.setProperty('hours', newEntity.hours)
                }
                else if (!newEntity.hours)
                    await entity.delete('$auto')
            }
        },

        async _submitBatch() {
            return odataModel.submitBatch('batch')
        },
        
        _getHoursContext(hours) {
            return hoursBinding.getContexts().find(it => {
                it = it.getObject()
                return it.user === hours.user &&
                    it.task_project_name === hours.task_project_name &&
                    it.task_name === hours.task_name &&
                    new Date(it.day).equalsIgnoreTime(new Date(hours.day))
            })
        }
    })
})