const express = require('express')
const articleModel = require('../../model/articles')
const router = express.Router()

router.get('/', (req, res, next) =>{
    articleModel.find().distinct('tagList').then((tags) =>{
        return res.json({tags: tags})
    }).catch(next)
})

module.exports = router;