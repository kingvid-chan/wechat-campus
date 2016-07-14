var USERMSG = require('../../../db').USERMSG;
var express = require('express');
var superagent = require('superagent');
var cheerio = require('cheerio');

/***********************************************
    message为位置内容
    { ToUserName: 'gh_d3e07d51b513',
    FromUserName: 'oPKu7jgOibOA-De4u8J2RuNKpZRw',
    CreateTime: '1359125311',
    MsgType: 'location',
    Location_X: '30.283950',
    Location_Y: '120.063139',
    Scale: '15',
    Label: {},
    MsgId: '5837398761910985062' }
************************************************/
var HandleLocation = exports.HandleLocation = function(message, req, res, next){
    
}