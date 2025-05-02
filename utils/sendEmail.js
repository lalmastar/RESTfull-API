const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    const mailOptions = {
        from: process.env.EMAIL,
        to: to,
        subject: subject,
        html: text
    }; 
    // console.log(mailOptions);
    try {
        
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email could not be sent');
    }
}

module.exports = sendEmail;