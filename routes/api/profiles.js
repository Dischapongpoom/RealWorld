const express = require('express')
const userModel = require('../../model/user')
const auth = require('../../middleware/auth')
const router = express.Router()
const jwt_decode = require('jwt-decode')

router.param('username', (req, res, next, username) => {

    userModel.findOne({ username: username }).then((user) => {
        if (!user) return res.status(400).json({ "message": "Cant't find user" })
        req.profile = user
        return next()
    }).catch(next)
})

router.get('/:username', auth.optional, (req, res, next) => {
    let Username = req.params.username
    const token = req.rawHeaders[1].split(" ")
    if(token[0] === "Bearer") Username = jwt_decode(token[1]).username

    if(Username){
        userModel.findOne({ username: Username }).then((user) => {
            if (!user) { return res.json({profile: req.profile.toProfileJSONFor(false)}) }
            else return res.status(200).json({ profile: req.profile.toProfileJSONFor(user) })
        })
    }else{
        return res.json({profile: req.profile.toProfileJSONFor(false)})
    }
})

router.post("/:username/follow", auth.require, (req, res, next) => {
    const profileId = req.profile._id
    const token = req.rawHeaders[1].split(" ")[1]
    const decoded = jwt_decode(token)
    
    userModel.findById(decoded.id).then((user) => {
        if (!user) res.sendStatus(401)

        return user.follow(profileId).then(() => {
            res.json({ profile: req.profile.toProfileJSONFor(user) })
        })
    }).catch(next)
})

router.delete("/:username/follow", auth.require, (req, res, next) => {
    const profileId = req.profile._id
    const token = req.rawHeaders[1].split(" ")[1]
    const decoded = jwt_decode(token)

    userModel.findById(decoded.id).then((user) => {
        if (!user) res.sendStatus(401)

        return user.unfollow(profileId).then(() => {
            res.json({ profile: req.profile.toProfileJSONFor(user) })
        })
    }).catch(next)
})

module.exports = router;