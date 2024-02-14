const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    require: false
  },
  description: String,
  imageUrl: {
    type: String,
    require: false
  },
  price: {
    type: String,
    require: false
  },
});

module.exports = mongoose.model('Product', productSchema);
