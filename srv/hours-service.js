module.exports = function () {
    const cds = require('@sap/cds')
	const {Project, Task, Hours} = cds.entities
	
	this.on('user', req => {
	    const user = req.user
	    user.token = req._.req.get('Authorization')
	    return user
	})
	
	this.on('env', req => {
	    const variable = req.data.var
	    if (!variable || !process.env[variable])
	        return 'Invalid variable'
        try {
            return JSON.parse(process.env[variable])
        } catch (err) {
            return process.env[variable]
        }
	})
	
	this.on('deleteProject', async (req) => {
		const {name} = req.data
		const tx = cds.transaction(req)
		
		await tx.run(DELETE.from(Hours).where('task_project_name =', name))
		await tx.run(DELETE.from(Task).where('project_name =', name))
		await tx.run(DELETE.from(Project).where('name =', name))
		await tx.commit()

		return 'success'
	})
}