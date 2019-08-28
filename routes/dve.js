let express = require('express');
let router = express.Router();
let nodemailer = require('nodemailer');
let hbs = require('nodemailer-express-handlebars');


let transporter = nodemailer.createTransport({
    host: "smtps.aruba.it",
    port: 465,
    secure: true,
    auth: {
      user: "no-reply@dainamicvisualeffects.com",
      pass: "Andrei11214!!"
    }
});

let options = {
  viewEngine: {
    partialsDir: 'views/email/partials/',
    layoutsDir: 'views/email/layouts',
    defaultLayout: 'main',
  },
  viewPath: 'views/email/body/'
}

transporter.use('compile', hbs(options));


router.post('/', (req, res) => {
  let mailOptions = {
    from: `no-reply@dainamicvisualeffects.com`,
    to: "a.lovino@dainamicvisualeffects.com, s.zoitanu@dainamicvisualeffects.com",
    subject: "Nuovo messaggio DVE",
    template: 'dve',
    layout: 'main',
    context: {body: req.body}
  };

    // send mail with defined transport object
  let info = transporter.sendMail(mailOptions)
  res.send("success");
});

module.exports = router;
