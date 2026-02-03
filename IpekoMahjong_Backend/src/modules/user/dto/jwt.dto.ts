export class JwtDto {
    constructor(
        public readonly accessToken: string,
        public readonly refreshToken: string,
    ) {}
}
