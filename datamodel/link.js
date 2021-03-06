"use strict";

var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var LinkSchema = module.exports = new Schema({
  url: {type: String, required: true, index: 1},
  text: {type: String, required: false},
  tags: [String],
  created_at: {type: Date},
  updated_at: {type: Date, index: 1},
  visible: {type: Boolean, default: false}
});

LinkSchema.pre('save', function (next) {
  var now = new Date();
  if (!this.created_at) {
    this.created_at = now;
  }
  this.updated_at = now;
  next();
});
