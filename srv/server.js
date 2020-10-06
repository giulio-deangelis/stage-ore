module.exports = async () => {
	const passport = require('passport')
	const xsenv = require('@sap/xsenv')
	const JWTStrategy = require('@sap/xssec').JWTStrategy
	const app = require('express')()
	const server = require('@sap/cds/server')

	xsenv.loadEnv()
	passport.use(new JWTStrategy(xsenv.getServices({xsuaa: {tags: 'xsuaa'}}).xsuaa))
	app.use(passport.initialize())
	app.use(passport.authenticate('JWT', {session: false}))

	app.get('/token', () => {
		try {
    		const token = req.headers.authorization.substring(7).split('.')[1];
    		return JSON.parse(Buffer.from(token, 'base64').toString('ascii'))
		} catch (err) {
		    return {error: 'Invalid token', reason: err.message}
		}
	});

	return server({app})
}