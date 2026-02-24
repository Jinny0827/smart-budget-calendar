export const sendInviteNotification = async (
    userId: string,
    groupName: string,
): Promise<void> => {
    // TODO: nodemailer로 초대 이메일 발송 구현 예정
    console.log(`[알림 대기] userId: ${userId}, 그룹명: ${groupName}`);
}