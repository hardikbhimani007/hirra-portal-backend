const nodemailer = require("nodemailer");
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOTPEmail(toEmail) {
  try {
    const otp = generateOTP();

    const mailOptions = {
      from: `"Your App Name" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
      html: `<p>Your OTP is <b>${otp}</b>. It will expire in 5 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    console.log("OTP sent to:", toEmail);
    return otp;
  } catch (err) {
    console.error("Error sending OTP email:", err);
    throw err;
  }
}

module.exports = { generateOTP, sendOTPEmail };
