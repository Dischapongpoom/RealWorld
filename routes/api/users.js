require("dotenv").config()
const express = require('express')
const userModel = require('../../model/user')
const auth = require('../../middleware/auth')
const router = express.Router()
const passport = require('passport')

router.get('/user', auth.require, (req, res, next) => {
    const email = req.body.email

    userModel.findOne({ email }).then(function (user) {
        if (!user) { return res.sendStatus(401) }

        return res.json({ user: user.toAuthJSON() })
    }).catch(next)
})

router.put('/users', auth.require, (req, res, next ) =>{
    const email = req.body.email
    userModel.findOne({ email }).then((user) =>{
        if(!user) res.status(401).json({ "message":"Can't find account"})

        if( typeof req.body.username !== 'undefined'){
            user.username = req.body.username
        }
        if( typeof req.body.email !== 'undefined'){
            user.email = req.body.email
        }
        if( typeof req.body.password !== 'undefined'){
            user.setPassword(req.body.password)
        }
        if( typeof req.body.image !== 'undefined'){
            user.image = req.body.image
        }
        if( typeof req.body.bio !== 'undefined'){
            user.bio = req.body.bio
        }
        user.save().then( () =>{
            res.json({ user: user.toAuthJSON() })
        })
    }).catch(next)
})

router.post('/users', async (req, res, next) => {
    try {
        const user = new userModel()
        const username = req.body.username
        const email = req.body.email

        const DupUsername = await userModel.findOne({ username })
        const DupEmail = await userModel.findOne({ email })
        if (DupUsername) res.status(400).send("Duplicate Username")
        if (DupEmail) res.status(400).send("Duplicate Email")

        user.username = username
        user.email = email
        await user.setPassword(req.body.password)

        await user.save().then(() => {
            res.status(200).json({ user: user.toAuthJSON() })
        })
    } catch (error) {
        next(error)
    }
})

router.post('/users/login', async (req, res, next) => {
    if (!req.body.email) {
        res.status(422).json({ error: { email: "can't be black" } })
    }
    if (!req.body.password) {
        res.status(422).json({ error: { password: "can't be black" } })
    }

    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) return next(err)

        if (user) {
            return res.status(200).json({ user: user.toAuthJSON() })
        } else {
            return res.status(422).json(info)
        }
    })(req, res, next)
})

module.exports = router;