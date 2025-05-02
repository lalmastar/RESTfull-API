const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'allabakshalalmastar@gmail.com',
            pass: 'drfxnirqajmslikl'
        }
    });

    const mailOptions = {
        from: 'allabakshalalmastar@gmail.com',
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