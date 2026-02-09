import { format, toZonedTime } from 'date-fns-tz'

export const convertUtcToKst = (date: Date | string | number | null) => {
    let kstString = ''
    if (date) {
        kstString = format(
            toZonedTime(date, 'Asia/Seoul'),
            'yyyy-MM-dd HH:mm:ss',
        )
    }
    return kstString
}
