import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

export const sendTempPasswordEmail = async (to: string, name: string, tempPassword: string) => {
    await transporter.sendMail({
        from: `"Smart Budget" <${process.env.GMAIL_USER}>`,
        to,
        subject: '[Smart Budget] 임시 비밀번호 발급',
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>임시 비밀번호 발급</h2>
                <p>안녕하세요, <b>${name}</b>님.</p>
                <p>임시 비밀번호가 발급되었습니다. 로그인 후 반드시 비밀번호를 변경해주세요.</p>
                <div style="background:#f4f4f4; padding:16px; border-radius:8px; font-size:24px; font-weight:bold; letter-spacing:4px; text-align:center;">
                    ${tempPassword}
                </div>
                <p style="color:#888; font-size:12px; margin-top:16px;">본인이 요청하지 않은 경우 이 메일을 무시하세요.</p>
            </div>
        `
    });
};
