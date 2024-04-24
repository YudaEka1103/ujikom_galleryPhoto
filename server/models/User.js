const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        maxlength: 255
    },
    password: {
        type: String,
        required: true,
        maxlength: 255
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        maxlength: 255
    },
    namalengkap: {
        type: String, 
        required: true,
        maxlength: 255
    },
    alamat: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('User', userSchema);
