const mongoose = require('mongoose')
const User = mongoose.model('User')

const commentSchema = new mongoose.Schema({
    body: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' }
}, { timeseries: true })

commentSchema.methods.toJSONFor = function (user) {
    return {
        id: this._id,
        body: this.body,
        createdAt: this.createAt,
        updatedAt: this.updatedAt,
        author: this.author.toProfileJSONFor(user)
    }
}

module.exports = mongoose.model('Comment', commentSchema);