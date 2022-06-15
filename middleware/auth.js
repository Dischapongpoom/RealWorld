const { expressjwt: jwt } = require("express-jwt")
const secret = process.env.JWT_KEY

const getTokenFormHeader = req => {
    if( req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token' || 
        req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer'){
        return req.headers.authorization.split(' ')[1]
    }
    return null
}

const auth = {
    require: jwt({
        secret: secret,
        algorithms: ["HS256"],
        userProperty: 'payload',
        getToken: getTokenFormHeader
    }),
    optional: jwt({
        secret: secret,
        algorithms: ["HS256"],
        userProperty: 'payload',
        credentialsRequired: false,
        getToken: getTokenFormHeader
    })
}

module.exports = auth;
