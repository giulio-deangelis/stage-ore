module.exports = function () {
    const cds = require('@sap/cds')
	const {Project, Task, Hours} = cds.entities

	this.on('deleteProject', async (req) => {
		const {name} = req.data
		const tx = cds.transaction(req)
		
		await tx.run(DELETE.from(Hours).where('task_project_name =', name))
		await tx.run(DELETE.from(Task).where('project_name =', name))
		await tx.run(DELETE.from(Project).where('name =', name))

		return 'success'
	})
}