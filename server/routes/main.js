// main.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Foto = require('../models/Foto');
const LikeFoto = require('../models/LikeFoto');
const Komentar = require('../models/Komentar');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const authMiddleware = async (req, res, next) => {
  try {
    if (req.path === '/login' || req.path === '/register') {
      return next();
    }

    const token = req.cookies.token;
    if (!token && !req.session.email) {
      return res.render('auth/unauthorized', { message: 'Oops, kamu belum login atau sesi login kamu sudah habis' });
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(401).render('auth/unauthorized', { message: 'Oops, sesi login kamu sudah habis atau tidak valid.' });
  }
};



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); 
  },
  filename: (req, file, cb) => {
    const fileName = path.parse(file.originalname).name;
    const uniqueFileName = `${fileName}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueFileName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true); 
  } else {
    cb(new Error('Only JPEG or PNG images are allowed'), false); 
  }
};

const upload = multer({ 
  storage: storage, 
  fileFilter: fileFilter 
});

router.use(authMiddleware); 
router.use(express.static(path.join(__dirname,'/uploads')))


router.get('/login', (req, res) => {
  res.render('auth/login');
});

router.get('/register', (req, res) => {
  res.render('auth/register');
});

router.get('/login', (req, res) => {
  res.render('auth/login');
});

router.get('/register', (req, res) => {
  res.render('auth/register');
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).send('<script>alert("Username atau Password tidak ditemukan"); window.location.href="/login"</script>');
    }

    req.session.email = user.email;

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, email, namalengkap, alamat } = req.body;
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(401).send('<script>alert("Email sudah digunakan!"); window.location.href="/register"</script>');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      namalengkap,
      alamat
    });

    await newUser.save();
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Rute untuk menampilkan halaman utama
router.get('/', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId });
    const fotos = await Foto.find().populate('userid', 'username');
    res.render('main', { user, fotos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/post/:id', async (req, res) => {
  try {
    // Mendapatkan informasi foto dari basis data
    const foto = await Foto.findById(req.params.id).populate('userid', 'username');
  
    // Mendapatkan daftar komentar terkait foto dari basis data
    const komentar = await Komentar.find({ fotoid: req.params.id }).populate('userid', 'username').sort({ tanggalkomentar: -1 });
    
    // Mengecek apakah pengguna yang sedang login adalah pemilik foto atau pemilik komentar
    komentar.forEach(comment => {
      comment.isOwner = false; // Default value
      if (req.userId && comment.userid._id.toString() === req.userId) {
        comment.isOwner = true;
      }
    });
    
    // Mendapatkan daftar pengguna yang menyukai foto
    const likefoto = await LikeFoto.find({ fotoid: req.params.id });
    
    // Mendapatkan tanggal unggah foto
    const uploadDate = foto.tanggalunggah;
    
    // Mengecek apakah pengguna yang sedang login adalah pemilik foto
    let isOwner = false;
    if (req.userId && foto.userid._id.toString() === req.userId) {
      isOwner = true;
    }
    
    // Mengirimkan data ke template post.ejs
    res.render('post', { foto, uploadDate, komentar, likefoto, isOwner, currentUser: req.userId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/edit_post/:id',async (req, res) => {
  try {
    const userId = req.userId; 
    const foto = await Foto.findById(req.params.id);

    res.render('edit_photo', { foto });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.put('/edit_post/:id', upload.single('lokasifile'), async (req, res) => {
  try {
    const userId = req.userId; 
    const foto = await Foto.findById(req.params.id);

    
    const { judulfoto, deskripsifoto } = req.body;

    
    await Foto.findByIdAndUpdate(req.params.id, {
      judulfoto,
      deskripsifoto,
      lokasifile: req.file ? req.file.filename : foto.lokasifile, 
      tanggalUnggah: Date.now()
    });

    res.redirect(`/post/${req.params.id}`);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/like', async (req, res) => {
  const { fotoId } = req.body; 

  try {
      
      const existingLike = await LikeFoto.findOne({ fotoid: fotoId, userid: req.userId });

      if (existingLike) {
         
          await LikeFoto.findByIdAndDelete(existingLike._id);
          res.redirect(`/post/${fotoId}`)
      } else {
          
          const newLike = new LikeFoto({
              fotoid: fotoId,
              userid: req.userId,
          });

          await newLike.save();
          res.redirect(`/post/${fotoId}`)
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.get('/profile', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId });
    res.render('profile', { user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.get('/profile/photo', async (req, res) => {
  try {
    const userId = req.userId;
    const fotos = await Foto.find({ userid: userId }).populate('userid', 'username');
    res.render('photo', { fotos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.delete('/post/:id', async (req, res) => {
  try {
    const fotoId = req.params.id;

    const deleteFoto = await Foto.findById(fotoId)

    if (!deleteFoto) {
      return res.status(404).json({ error: 'foto tidak ditemukan'})
    }

    const filePath = path.join('public/uploads', deleteFoto.lokasifile)
    
    fs.unlinkSync(filePath)

    
    await Foto.deleteOne({ _id: fotoId });

    
    await Komentar.deleteMany({ fotoid: fotoId });

    
    await LikeFoto.deleteMany({ fotoid: fotoId });

    
    res.redirect('/profile/photo');
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/profile/photo/upload', async (req, res) => {
  try {
    const userId = req.userId; 
    const fotos = await Foto.find({ userid: userId });
    res.render('upload')
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/profile/photo/upload', upload.single('lokasifile'), async (req, res) => {
  try {
    const { judulfoto, deskripsifoto } = req.body;
    const userId = req.userId; 

    
    const newFoto = new Foto({
      judulfoto: judulfoto,
      deskripsifoto: deskripsifoto,
      lokasifile: req.file.filename, 
      userid: userId 
    });

    
    await newFoto.save();
    res.redirect('/profile/photo')
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

router.get('/profile/like', async (req, res) => {
  try {
    
    const userId = req.userId;

    
    const likefotos = await LikeFoto.find({ userid: userId }).populate({
      path: 'fotoid',
      populate: { path: 'userid', select: 'username' } 
    });
    res.render('like', { likefotos: likefotos });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/comment', async (req, res) => {
  try {
      const userId = req.userId;
      const fotoId = req.body.fotoId;
      const isikomentar = req.body.isikomentar;

      
      const newKomentar = new Komentar({
          isikomentar: isikomentar,
          fotoid: fotoId,
          userid: userId
      });

      
      await newKomentar.save();

     
      res.redirect(`/post/${fotoId}`);
  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});


router.post('/search', async (req, res) => {
  try {
    
    const searchTerm= req.body.searchTerm;
    const searchNoSpecialChar = searchTerm.replace(/[^a-zA-Z0-9 ]/g, "")
    
    const fotos = await Foto.find({ judulfoto: { $regex: new RegExp(searchNoSpecialChar, 'i') }}).populate('userid', 'username');

    
    res.render('search', { fotos: fotos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/delete-comment/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const komentarId = req.params.id;

    // Cari komentar berdasarkan ID
    const komentar = await Komentar.findById(komentarId);

    // Pastikan komentar ditemukan
    if (!komentar) {
      return res.status(404).json({ error: 'Komentar tidak ditemukan' });
    }

    // Pastikan pengguna yang sedang login adalah pemilik komentar
    if (!komentar.userid.equals(userId)) {
      return res.status(403).json({ error: 'Anda tidak memiliki izin untuk menghapus komentar ini' });
    }

    // Hapus komentar jika pengguna adalah pemiliknya
    await komentar.remove();

    res.json({ message: 'Komentar berhasil dihapus' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;