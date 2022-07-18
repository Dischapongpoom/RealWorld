require("dotenv").config()
require("./config/database").connect()
const express = require("express")
const cors = require('cors')
const bodyParser = require('body-parser')
const session = require('express-session')
const passport = require('passport')

const app = express()

app.use(cors())
app.use(express.json())
app.use(bodyParser.json()) // for parsing application/json
require('./config/passport')

const { API_PORT } = process.env
const port = process.env.PORT || API_PORT
app.use(session({ secret: 'conduit', cookie: { maxAge: 60000 }, resave: false, saveUninitialized: false  }))
app.use(passport.initialize())
app.use(passport.session())

app.use(require('./routes'))

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
  })