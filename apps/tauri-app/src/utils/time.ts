export const calculateRemainingTime = (eventTime: Date) => {
    const difference = eventTime.getTime() - Date.now();

    const seconds = Math.floor(difference / 1000);

    let timeLeftString;

    if (seconds > 86400) {
        const days = Math.floor(seconds / 86400);
        timeLeftString = `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (seconds > 3600) {
        const hours = Math.floor(seconds / 3600);
        timeLeftString = `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (seconds > 60) {
        const minutes = Math.floor(seconds / 60);
        timeLeftString = `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (seconds > 0) {
        timeLeftString = `soon`;
    }

    return timeLeftString
}