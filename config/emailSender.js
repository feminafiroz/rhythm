const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'femi7654321@gmail.com', 
    pass: 'hjgz eosw ymvh bhil'
  }
});
module.exports = transporter;
