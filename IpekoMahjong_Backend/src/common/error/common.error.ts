export class CommonError extends Error {
    constructor(public readonly status: string) {
        super(status)
        this.name = 'CommonError'
    }
}
