const mongoose = require('mongoose')
const Schema = mongoose.Schema

const komentarfotoSchema = new Schema({
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
    isikomentar:{
        type: String
    },
    tanggalkomentar: {
        type: Date,
        default: Date.now 
    }
})
module.exports = mongoose.model('Komentar', komentarfotoSchema);