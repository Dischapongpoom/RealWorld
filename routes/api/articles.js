const express = require('express')
const router = express.Router()
const userModel = require('../../model/user')
const articleModel = require('../../model/articles')
const commentModel = require('../../model/comment')
const auth = require('../../middleware/auth')
const jwt_decode = require('jwt-decode')

router.param('article', (req, res, next, slug) =>{
    articleModel.findOne({ slug: slug})
        .populate('author')
        .then( (article) =>{
            if(!article) return res.status(400).json({message:"Article not found"})

            req.article = article

            next()
    }).catch(next)
})

router.param('comment' , (req, res, next, id) =>{
    commentModel.findById(id).then((comment) =>{
        if(!comment) return res.status(400).json({message:"Comment not found"})

        req.comment = comment

        next()
    }).catch(next)
})

//List Articles
router.get('/', auth.optional, (req, res, next) =>{
    let query = {}
    let limit = 20
    let offset = 0

    if(typeof req.query.limit !== 'undefined'){
        limit = req.query.limit
    }
    if(typeof req.query.offset !== 'undefined'){
        offset = req.query.offset
    }
    if(typeof req.query.tag !== 'undefined'){
        query.tagList = {"$in" : [req.query.tag]}
    }
    Promise.all([
        req.query.author ? userModel.findOne({username: req.query.author}) : null,
        req.query.favorited ? userModel.findOne({username: req.query.favorited}) : null
    ]).then((result) =>{
        let author = result[0]
        let favoriter = result[1]

        if(author){
            query.author = author._id
        }

        if(favoriter){
            query._id = {$in: favoriter.favorites}
        }else if (req.query.favorited){
            query._id = {$in: []}
        }
        return Promise.all([
            articleModel.find(query)
            .limit(Number(limit))
            .skip(Number(offset))
            .sort({createdAt: 'desc'})
            .populate('author')
            .exec(),
            articleModel.count(query).exec()
        ]).then((result) =>{
            let articles = result[0]
            let articlesCount = result[1]
            let user = result[2]

            return res.json({
                articles: articles.map((articles) =>{
                    return articles.toJSONFor(user)
                }),
                articlesCount: articlesCount
            })
        })
    }).catch(next)
})

//Feed Articles
router.get('/feed', auth.require, (req, res, next) =>{
    const token = req.rawHeaders[1].split(" ")[1]
    const decoded = jwt_decode(token)
    let limit = 20
    let offset = 0

    if(typeof req.query.limit !== 'undefined'){
        limit = req.query.limit
    }
    if(typeof req.query.offset !== 'undefined'){
        offset = req.query.offset
    }

    userModel.findById(decoded.id).then((user) =>{
        if(!user) return res.sendStatus(401)
        console.log("user.following: ", user.following)
        Promise.all([
            articleModel.find({author: {$in: user.following}})
            .limit(Number(limit))
            .skip(Number(offset))
            .populate('author')
            .exec(),
            articleModel.count({ author: {$in: user.following}})
        ]).then((result) =>{
            let articles = result[0]
            let articlesCount = result[1]

            return res.json({
                articles: articles.map((articles) =>{
                    return articles.toJSONFor(user)
                }),
                articlesCount: articlesCount
            })
        })
    }).catch(next)
})

// Get Article
router.get('/:article', auth.optional, (req, res, next) =>{
    if(! req.article) return res.sendStatus(401)

    return res.json({article: req.article.toJSONFor()})
})

// Create Article
router.post('/', auth.require, (req, res, next) =>{
    const token = req.rawHeaders[1].split(" ")[1]
    const decoded = jwt_decode(token)

    userModel.findById(decoded.id).then((user) =>{
        if(!user) res.sendStatus(401)

        let article = new articleModel(req.body.article)

        article.author = user
        console.log("user: ",user)
        console.log("article.author: ", article.author)
        return article.save().then(() =>{
            res.json({article: article.toJSONFor(user)})
        })
    })
})

// Update Article
router.put('/:article', auth.require, (req, res, next) =>{
    const token = req.rawHeaders[1].split(" ")[1]
    const decoded = jwt_decode(token)
    const authorID = req.article.author._id.toString()

    userModel.findById(decoded.id).then((user) =>{
        if(authorID === decoded.id){
            
            if(typeof req.body.article.title !== 'undefined'){
                req.article.title = req.body.article.title
                req.article.slug = req.article.slugify()
            }

            if(typeof req.body.article.description !== 'undefined'){
                req.article.description = req.body.article.description
            }

            if(typeof req.body.article.body !== 'undefined'){
                req.article.body = req.body.article.body
            }

            if(typeof req.body.article.tagList !== 'undefined'){
                req.article.tagList = req.body.article.tagList
            }
            console.log("req.article: ", req.article)
            req.article.save().then((article) =>{
                return res.json({ article: article.toJSONFor(user)})
            }).catch(next)
        }else{
            
            return res.sendStatus(403)
        }
    })
})

// Delete Article
router.delete('/:article', auth.require, (req, res, next) =>{
    const token = req.rawHeaders[1].split(" ")[1]
    const decoded = jwt_decode(token)

    userModel.findById(decoded.id).then((user) =>{
        if(!user) res.sendStatus(401)

        if(req.article.author._id.toString() === decoded.id){
            req.article.remove().then(() =>{
                res.sendStatus(204)
            })
        }else{
            return res.sendStatus(403)
        }
    }).catch(next)
})

// Add Comments to an Article
router.post('/:article/comments', auth.require, (req, res, next) =>{
    const token = req.rawHeaders[1].split(" ")[1]
    const decoded = jwt_decode(token)

    userModel.findById(decoded.id).then((user) =>{
        if(!user) return res.sendStatus(401)

        let comment = new commentModel(req.body.comment)
        comment.article = req.article
        
        comment.author = user
        return comment.save().then(() =>{
            req.article.comments.push(comment)
            return req.article.save().then((article) =>{
                res.json({comment: comment.toJSONFor(user)})
            })
        })
    }).catch(next)
})

// Get Comments from an Article
router.get('/:article/comments', auth.optional, async (req, res, next) =>{
    try {
        const token = req.rawHeaders[1].split(" ")
        let decoded
        if(token[0] === 'Bearer'){
            const token_1 = token[1]
            decoded = jwt_decode(token_1)
        }
        const id = decoded ? decoded.id : null
        const user = await userModel.findById(id).exec()

        const populateOptions = {
            path: 'comments',
            populate: {
              path: 'author'
            },
            options: {
              sort: {
                createdAt: 'desc'
              }
            }
        }
        const article = await req.article.populate(populateOptions)
        const comments = article.comments.map(comment => {
            return comment.toJSONFor(user)
        })
        res.json({ comments })
    } catch (error) {
        next(error)
    }
})

//Delete comment
router.delete('/:article/comments/:comment', auth.require, (req, res, next) =>{
    const token = req.rawHeaders[1].split(" ")[1]
    const decoded = jwt_decode(token)

    if(req.comment.author.toString() === decoded.id){
        
        req.article.comments.remove(req.comment._id)
        req.article.save()
        .then(commentModel.find({_id: req.comment._id}).remove().exec())
        .then(() =>{
            return res.send(204).json({message: "Remove success"})
        })
        console.log("cooment: ", req.comment)
    } else{
        return res.sendStatus(403)
    }
})

//Favorite Article
router.post('/:article/favorite', auth.require, (req, res, next) =>{
    const token = req.rawHeaders[1].split(" ")[1]
    const decoded = jwt_decode(token)
    userModel.findById(decoded.id).then((user) =>{
        if (!user) return res.sendStatus(401)
        
        return user.favorite(req.article._id).then(() =>{
            return req.article.updateFavoriteCount().then((article) =>{
                return res.json({article: article.toJSONFor(user)})
            })
        })
    }).catch(next)
})

//Unfavorite Article
router.delete('/:article/favorite', auth.require, (req, res, next) =>{
    const token = req.rawHeaders[1].split(" ")[1]
    const decoded = jwt_decode(token)
    userModel.findById(decoded.id).then((user) =>{
        if (!user) return res.sendStatus(401)

        return user.unfavorite(req.article._id).then(() =>{
            return req.article.updateFavoriteCount().then((article) =>{
                return res.json({article: article.toJSONFor(user)})
            })
        })
    }).catch(next)
})

module.exports = router;