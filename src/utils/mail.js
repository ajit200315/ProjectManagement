import Mailgen from "mailgen";
import nodemailer from "nodemailer"



const sendEmail = async (options) => {
    const mailGenerator = new Mailgen(
        {
            theme: "default",
            product: {
                name: "Task Manager",
                link: "https://taskmangerLink.com"
            }
        })
    const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent)
    const emailHtml = mailGenerator.generate(options.mailgenContent)

    const transporter = nodemailer.createTransport({
        host: process.env.MAILTRAP_SMTP_HOST,
        port: process.env.MAILTRAP_SMTP_PORT,
        auth: {
            user: process.env.MAILTRAP_SMTP_USER,
            pass: process.env.MAILTRAP_SMTP_PASS
        }
    })

    const mail = {
        from: "mail.taskmanager@example.com",
        to: options.email,
        subject: options.subject,
        text: emailTextual,
        html: emailHtml
    }

    try {
        await transporter.sendMail(mail)
    } catch (error) {
        console.error("Email service failed silently. make sure that you have provided correct credential in the .env file")
        console.error(error)
    }
}


const emailVerificationMailgenContent = (username, verificationUrl) => {
    return {
        body: {
            name: username,
            intro: "Welcome to our App! we are excited to have you",
            action: {
                instructions: "To verify your email please click on the following button",
                button: {
                    color: "#22BC66",
                    text: "Verify your email",
                    link: verificationUrl
                }
            },
            outro: "Need Help, or have question just reply to this email, We are happy to help you"
        }
    }
}

const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
    return {
        body: {
            name: username,
            intro: "We got a request to reset the password of your account",
            action: {
                instructions: "To reset your password please click on the following button",
                button: {
                    color: "#22BC66",
                    text: "Reset password",
                    link: passwordResetUrl
                }
            },
            outro: "Need Help, or have question just reply to this email, We are happy to help you"
        }
    }
}

export { emailVerificationMailgenContent, forgotPasswordMailgenContent, sendEmail }