sap.ui.define([
    'sap/ui/core/mvc/Controller',
    'sap/ui/model/json/JSONModel',
    'sap/m/StandardListItem',
    'sap/ui/model/Filter',
    'training/hours/web/util/MessageHelper',
    'training/hours/web/util/FragmentManager',
    'training/hours/web/util/extensions/String',
    'training/hours/web/util/extensions/Array',
    'training/hours/web/util/extensions/JSONModel'
], (
    Controller,
    JSONModel,
    StandardListItem,
    Filter,
    MessageHelper,
    FragmentManager
) => {
    'use strict'

    const bus = sap.ui.getCore().getEventBus()
    var model, msg
    var projectContext, projectBinding
    var deletedTasks = []

    var fragmentManager
    const taskEditorFragment = 'training.hours.web.view.fragment.TaskEditor'

    return Controller.extend('training.hours.web.controller.ProjectEditor', {

        onInit() {
            model = this.getOwnerComponent().getAggregation('rootControl').getModel()
            msg = new MessageHelper(this)
            fragmentManager = new FragmentManager(this)

            bus.subscribe('editor', 'onSave', this.onSave, this)
            bus.subscribe('editor', 'onDelete', this.onDelete, this)
            bus.subscribe('editor', 'onBind', this.onBind, this)
            bus.subscribe('editor', 'onLeave', this.onLeave, this)
        },
        
        onLeave() {
            deletedTasks.clear()
        },

        async onBind(ch, ev, params) {
            model.resetChanges()
            deletedTasks.clear()

            projectContext = params.context
            projectBinding = params.projectBinding

            const taskBindingInfo = {
                template: new StandardListItem({
                    title: '{name}',
                    description: '{description}',
                    type: 'Navigation'
                })
            }

            // the name is a key, therefore it cannot be changed on an existing project
            this.byId('projectName').setEditable(!projectContext)

            if (projectContext) {
                taskBindingInfo.path = `${projectContext.getPath()}/tasks`
            } else {
                taskBindingInfo.path = '/tasks'
                taskBindingInfo.filters = new Filter('name', 'EQ', '')

                // create an empty project to allow editing
                projectContext = projectBinding.create({
                    name: msg.i18n('newProject'),
                    description: ''
                })
            }
            this.getView().setModel(model)
            this.byId('projectForm').setBindingContext(projectContext)
            this.byId('projectName').bindProperty('value', 'name')
            this.byId('projectDescription').bindProperty('value', 'description')
            this.byId('taskList').bindItems(taskBindingInfo)
        },

        onSave() {
            const view = this.getView()

            if (!this.validateProject(projectContext.getObject()))
                return
            view.setBusy(true)

            this.saveProject({

                success() {
                    msg.toast('projectSaved')
                },

                error(err) {
                    console.error(err)
                    msg.error('projectSaveError')
                },

                finally() {
                    view.setBusy(false)
                }
            })
        },

        onDelete() {
            const view = this.getView()
            view.setBusy(true)

            this.deleteProject(projectContext.getProperty('name'), {

                success() {
                    msg.toast('projectDeleted')
                    view.byId('taskList').unbindItems()
                    bus.publish('editor', 'onDeleted')
                },

                error(err) {
                    console.error(err)
                    msg.error('projectDeletionFailed')
                },

                finally() {
                    view.setBusy(false)
                }
            })
        },

        onTaskAdd() {
            this.openTaskEditor()
        },

        onTaskEdit(ev) {
            const task = ev.getParameter('listItem').getBindingContext().getObject()
            this.openTaskEditor(task)
        },

        onTaskRemove(ev) {
            // Since temporary removal is not possbile, we hide the deleted tasks temporarily
            // and delete them when the user presses on the save button
            const task = ev.getParameter('listItem').getBindingContext().getObject()
            deletedTasks.push(task)
            this.byId('taskList').getBinding('items').filter(new Filter({
                and: true,
                filters: deletedTasks.map(it => new Filter('name', 'NE', it.name))
            }))
        },

        onTaskSave() {
            const task = fragmentManager.getModelData(taskEditorFragment)
            if (!this.validateTask(task)) return
            const tasks = this.byId('taskList').getBinding('items')

            if (task._new) {
                delete task._new
                tasks.create(task)
            } else {
                const ctx = tasks.getContexts().find(it => it.getProperty('name') === task.name)
                // we can only update the description since the name is a key and therefore not editable
                ctx.setProperty('description', task.description)
            }
            this.closeTaskEditor()
        },

        onTaskCancel() {
            this.closeTaskEditor()
        },

        onProjectNameChange(ev) {
            const newName = ev.getParameter('value')
            projectContext.setProperty('name', newName)
        },

        onProjectDescriptionChange(ev) {
            const newDesc = ev.getParameter('value')
            projectContext.setProperty('description', newDesc)
        },

        openTaskEditor(task) {
            const taskEditor = fragmentManager.open(taskEditorFragment)
            taskEditor.setModel(new JSONModel(task || {_new: true}))
            this.byId('taskName').setEditable(!task)
        },

        closeTaskEditor() {
            fragmentManager.close(taskEditorFragment)
        },

        validateTask(task) {
            if (task.name.isBlank()) {
                msg.error('invalidName')
                return false
            }
            task.name = task.name.trim()
            task.description = task.description ? task.description.trim() : null
            return true
        },

        validateProject(project) {
            if (!project.name || project.name.isBlank()) {
                msg.error('invalidName')
                return false
            }
            return true
        },

        saveProject(callbacks) {
            const projectName = projectContext.getObject().name
            const taskList = this.byId('taskList')
            const tasks = taskList.getItems().map(it => it.getBindingContext())
            const taskBinding = model.bindList('/tasks', null, null, new Filter('project_name', 'EQ', projectName))

            taskBinding.requestContexts(0, Infinity).then(allTaskContexts => {
                for (const task of tasks)
                    task.setProperty('project_name', projectName)

                // we have to retrieve and filter all the tasks because
                // when we remove a task from the list by using ODataListBinding#filter,
                // it is no longer a valid context and can't be deleted directly
                allTaskContexts
                    .filter(task => deletedTasks.some(it => it.name === task.getProperty('name')))
                    .forEach(task => task.delete('$auto'))

                model.submitBatch('batch').then(callbacks.success)
            }).catch(
                callbacks.error
            ).finally(
                callbacks.finally
            )
        },

        deleteProject(name, callbacks) {
            const url = decodeURI(model.sServiceUrl + `deleteProject(name='${name}')`)

            $.get(url)
                .done(callbacks.success)
                .fail(callbacks.error)
                .always(callbacks.finally)
        }
    })
})