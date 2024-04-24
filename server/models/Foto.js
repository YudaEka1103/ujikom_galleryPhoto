const mongoose = require('mongoose')

const Schema = mongoose.Schema

const fotoSchema = new Schema({
    judulfoto:{
        type: String,
        required: true,
        maxlength: 255
    },
    deskripsifoto:{
        type: String,
        required: true
    },
    tanggalunggah:{
        type: Date,
        default: Date.now
    },
    lokasifile:{
        type: String,
        required: true
    },
    userid:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
})
module.exports = mongoose.model('Foto', fotoSchema);