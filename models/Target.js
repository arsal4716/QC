const mongoose = require("mongoose");
const slugify = require('slugify');

const TargetSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, unique: true, index: true }
}, { timestamps: true });

TargetSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
  }
  next();
});

module.exports = mongoose.model("Target", TargetSchema);