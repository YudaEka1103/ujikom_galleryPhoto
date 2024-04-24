const mongoose = require('mongoose')

const Schema = mongoose.Schema

const likefotoSchema = new Schema({
    fotoid: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Foto' 
    },
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    tanggalike: {
        type: Date,
        default: Date.now 
    }
})

module.exports = mongoose.model('LikeFoto', likefotoSchema);
