var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');

//数据库collection
var USERMSG = exports.USERMSG = mongoose.model('USERMSG',{
    openId: String,
    userName: String,
    userNumber: String,
    password: String,
    cookie_index: String,
    cookie_library: String,
    cookie_card: String,
    cookie_jwxt: String,
    card_id:String
});
// new USERMSG({openId:"3",userName:"杨小兰",userNumber:"12251101241",password:"cd3399"}).save();
var XIAOZHAO = exports.XIAOZHAO = mongoose.model('XIAOZHAO', {
  	company: String,
  	workPlace: String,
  	pubTime: String,
  	link: String,
  	top: Boolean,
    createdAt: { type: Date, default: Date.now, expires: '24h' }
});
var XUANJIANG = exports.XUANJIANG = mongoose.model('XUANJIANG',{
	  company: String,
	  workPlace: String,
	  pubTime: String,
	  link: String,
	  startTime: String,
	  posDetail: String,
    createdAt: { type: Date, default: Date.now, expires: '24h' }
});
var SHIXI = exports.SHIXI = mongoose.model('SHIXI',{
	  company: String,
  	workPlace: String,
  	job: String,
  	link: String,
  	top: Boolean,
    createdAt: { type: Date, default: Date.now, expires: '24h' }
});
var JIANZHI = exports.JIANZHI = mongoose.model('JIANZHI',{
	  company: String,
  	workPlace: String,
  	pubTime: String,
  	link: String,
  	top: Boolean,
  	money: Number,
    createdAt: { type: Date, default: Date.now, expires: '24h' }
});

