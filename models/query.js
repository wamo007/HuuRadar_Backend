const mongoose = require('mongoose')
const { Schema } = mongoose

const querySchema = new Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  providers: {
    type: Array,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  radius: {
    type: String,
    required: true
  },
  sortGlobal: {
    type: String,
    required: true
  },
  minPrice: {
    type: Number,
  },
  maxPrice: {
    type: Number,
  },
  queryData: [
    {
      provider: {
        type: String,
        required: true,
      },
      link: {
        type: String,
        required: true,
      },
      img: {
        type: String,
      },
      heading: {
        type: String,
      },
      address: {
        type: String,
      },
      price: {
        type: String,
      },
      size: {
        type: String,
      },
      seller: {
        type: String,
      },
      sellerLink: {
        type: String,
      },
    }
  ]
})

// check whether there is only one unique email - search binding
querySchema.index({ email: 1, city: 1, radius: 1, sortGlobal: 1, minPrice: 1, maxPrice: 1 }, { unique: true })

const QueryModel = mongoose.models.Query || mongoose.model('Query', querySchema)

module.exports = QueryModel