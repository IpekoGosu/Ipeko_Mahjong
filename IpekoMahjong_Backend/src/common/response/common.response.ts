class CommonResponse<T> {
    constructor(success: boolean, data: T) {
        this.success = success
        this.data = data
    }

    success: boolean
    data: T
}

export class CommonErrorResponse<T> extends CommonResponse<T> {
    constructor(data: T) {
        super(false, data)
    }
}

export class CommonSuccessResponse<T> extends CommonResponse<T> {
    constructor(data: T) {
        super(true, data)
    }
}
