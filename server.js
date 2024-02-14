const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const Product = require('./models/product');
const { authenticateUser } = require('./middlewares/authMiddleware');
const Session = require('./models/sessions');
const User = require('./models/User');
const Category = require('./models/category');
const ReadOrder = require('./models/ReadOrder');
const Siparis = require('./models/order');
const GalleryItem = require('./models/GalleryItem');
const bcrypt = require('bcrypt');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();

mongoose.connect('mongodb+srv://adamadamov316972:Z84EZUvzjX9JOCTw@cluster0.zpmzf47.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: 'secret-key', resave: false, saveUninitialized: true }));
app.use(express.static('public'));

function calculateExpirationDate() {
  const expirationDate = new Date();
  expirationDate.setMinutes(expirationDate.getMinutes() + 60);
  return expirationDate;
}

function generateSessionId() {
  const sessionId = Math.random().toString(36).substr(2, 8);
  return sessionId;
}

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use(cookieParser());
app.use(bodyParser.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.get('/add/product', authenticateUser, async (req, res) => {
  try {
    const products = await Product.find();
    const categories = await Category.find();
    res.render('index', { products, categories });
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta');
  }
});

app.post('/upload',authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const { name, description, categoryId, price } = req.body;
    const imageUrl = '/image/' + req.file.filename;

    const newProduct = new Product({
      name,
      description,
      imageUrl,
      category: categoryId,
      price,
    });

    await newProduct.save();

    res.redirect('/add/product');
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta baş verdi');
  }
});


app.get('/edit/:id', authenticateUser, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    const categories = await Category.find();

    res.render('edit', { product, categories });
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi');
  }
});


app.post('/edit/:id', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const { name, description, categoryId } = req.body;
    const imageUrl = req.file ? '/image/' + req.file.filename : req.body.originalImage;

    await Product.findByIdAndUpdate(req.params.id, { name, description, imageUrl, category: categoryId });

    res.redirect('/add/product');
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});


app.post('/delete/:id',authenticateUser, async (req, res) => {
  try {
    await Product.findByIdAndRemove(req.params.id);
    res.redirect('/add/product');
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});

app.get('/image/:imageName', (req, res) => {
  const imageName = req.params.imageName;

  const imagePath = `uploads/${imageName}`;

  res.sendFile(imagePath, { root: __dirname });
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Səhv parol' });
    }

    const sessionId = generateSessionId();
    const session = new Session({
      sessionId,
      userId: user._id,
      expiresAt: calculateExpirationDate()
    });
    await session.save();
    res.cookie('sessionId', sessionId, { httpOnly: true });

    res.redirect('/add/product');
  } catch (error) {
    res.status(500).json({ error: 'Xəta Baş verdi.' });
  }
});

app.post('/register',authenticateUser, async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      password: hashedPassword
    });
    await newUser.save();
    res.status(201).json({ message: 'Admin Registirasiyasi uğurlu keçdi' });
  } catch (error) {
    res.status(500).json({ error: 'Xəta Baş verdi.' });
  }
});

app.get('/edit-category/:id', authenticateUser, async (req, res) => {
  try {
    const categories = await Category.find();
    
    const categori = await Category.findById(req.params.id);
    res.render('edit-category', { categories, categori });
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});

app.post('/edit-category/:id', authenticateUser, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const updatedCategoryName = req.body.name;

    
    const updatedCategory = await Category.findByIdAndUpdate(categoryId, { name: updatedCategoryName }, { new: true });

    res.redirect(`/add-category`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});


app.post('/edit/:id', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const { name, description, categoryId } = req.body;
    const imageUrl = req.file ? '/image/' + req.file.filename : req.body.originalImage;

    await Product.findByIdAndUpdate(req.params.id, { name, description, imageUrl, category: categoryId });

    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});


app.post('/delete-category/:id',authenticateUser, async (req, res) => {
  try {
    await Category.findByIdAndRemove(req.params.id);
    res.redirect('/add-category');
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});

app.get('/category/:categoryId', async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const category = await Category.findById(categoryId); 
    const products = await Product.find({ category: categoryId });
    res.render('category-products', { category, products });
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});

app.get('/add-category', authenticateUser, async (req, res) => {
  try {
    const categories = await Category.find();
    res.render('add-category', { categories });
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});

app.post('/add-category',authenticateUser, async (req, res) => {
  try {
    const { name } = req.body;
    const newCategory = new Category({ name });
    await newCategory.save();
    res.redirect('/add-category');
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});

app.get('/gallery', async (req, res) => {
  try {
    const products = await Product.find();
    const galleryItems = await GalleryItem.find();
    const categories = await Category.find();
    res.render('project', { products, categories, galleryItems });
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});

app.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    const categories = await Category.find();
    res.render('projecto', { products, categories });
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});

app.post('/submit-order', (req, res) => {
  const { adSoyad, email, mobilNomre, kategory, tesvir } = req.body;

  const yeniSiparis = new Siparis({
      adSoyad,
      mobilNomre,
      tesvir
  });

  yeniSiparis.save((err) => {
      if (err) {
          console.error(err);
          return res.status(500).send('Sipariş Alınarkən Xəta Baş verdi');
      }
      res.redirect('/contact');
  });
});

app.get('/orders/admin',authenticateUser, async (req, res) => {
  try {
      const siparisler = await Siparis.find();
      res.render('admino', { siparisler }); 
  } catch (err) {
      console.error(err);
      res.status(500).send('Xəta Baş verdi.');
  }
});

app.get('/admin/login', (req, res) => {
  res.render('login');
});


app.post('/delete-order/:id', authenticateUser, async (req, res) => {
  try {
    const orderId = req.params.id;
    await Siparis.findByIdAndRemove(orderId);
    res.redirect('/orders/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta.');
  }
});

app.post('/mark-as-read/:id', async (req, res) => {
  const orderId = req.params.id;

  try {
    const order = await Siparis.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Sipariş Tapılmadı.' });
    }

    order.oxundu = true;
    await order.save();

    const readOrder = new ReadOrder(order.toObject());
    await readOrder.save();

    await Siparis.findByIdAndRemove(orderId);

    res.json({ success: true, message: 'Xəta' });
  } catch (error) {
    console.error('Xəta.', error);
    res.status(500).json({ success: false, message: 'Xəta' });
  }
});


app.get('/read-orders',authenticateUser, async (req, res) => {
  try {
    const readOrders = await ReadOrder.find().populate('orderId');
    res.render('read-orders', { readOrders });
  } catch (error) {
    console.error('Xəta.', error);
    res.status(500).send('Xəta.');
  }
});

app.post('/delete-read-order/:id', authenticateUser, async (req, res) => {
  try {
    const orderId = req.params.id;
    await ReadOrder.findByIdAndRemove(orderId);
    res.redirect('/read-orders');
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta');
  }
});

app.get('/about', (req, res) =>{
  res.render('about');
});

app.get('/contact', async (req, res) => {
  try {
    const categories = await Category.find();
    res.render('order', { categories });
  } catch (err) {
    console.error(err);
    res.status(500).send('Xəta Baş verdi.');
  }
});
app.get('/admin',authenticateUser, async (req, res) => {
  try {
    const galleryItems = await GalleryItem.find();
    res.render('admin', { galleryItems });
  } catch (error) {
    res.status(500).json({ error: 'Xəta' });
  }
});

app.get('/admin/add', (req, res) => {
  res.render('add_gallery');
});

app.get('/admin/edit/:id',authenticateUser, async (req, res) => {
  try {
    const item = await GalleryItem.findById(req.params.id);
    res.render('edit_gallery', { item });
  } catch (error) {
    res.status(404).json({ error: 'Xəta' });
  }
});

app.post('/admin/add-gallery-item', authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const imageUrl = '/image/' + req.file.filename;

    const newGalleryItem = new GalleryItem({
      title,
      description,
      imageUrl,
    });

    await newGalleryItem.save();

    res.redirect('/admin');
  } catch (error) {
    console.error('Hata:', error);
    res.status(500).send('Xəta baş verdi');
  }
});


app.post('/admin/edit/:id',authenticateUser, upload.single('image'), async (req, res) => {
  try {
    const updatedItem = await GalleryItem.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        description: req.body.description,
        imageUrl: req.file ? '/image/' + req.file.filename : req.body.originalImage,
      },
      { new: true }
    );
    res.redirect('/admin');
  } catch (error) {
    res.status(500).json({ error: 'Xəta' });
  }
});


app.get('/admin/delete/:id',authenticateUser, async (req, res) => {
  try {
    const deletedItem = await GalleryItem.findByIdAndRemove(req.params.id);
    res.redirect('/admin');
  } catch (error) {
    res.status(500).json({ error: 'Xəta' });
  }
});

app.get('/category', (req, res) => {
  res.render('categori');
});

app.get('/interier', (req, res) => {
	res.render('interier', {title: 'Khary bulbul - Chocolate house'});
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server ${port} portunda Aktivdi.`);
});
