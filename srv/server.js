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

	return server({app})
}