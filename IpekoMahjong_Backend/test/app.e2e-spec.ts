import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { AppModule } from './../src/app.module'
import { initializeEnv } from './../src/common/utils/env'

describe('App (e2e)', () => {
    let app: INestApplication

    beforeEach(async () => {
        await initializeEnv()
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()

        app = moduleFixture.createNestApplication({ logger: false })
        await app.init()
    })

    afterAll(async () => {
        await app.close()
    })

    it('should be defined', () => {
        expect(app).toBeDefined()
    })
})
