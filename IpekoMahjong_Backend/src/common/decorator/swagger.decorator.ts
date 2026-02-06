import { applyDecorators, Type } from '@nestjs/common'
import {
    ApiExtraModels,
    ApiOkResponse,
    getSchemaPath,
    ApiCreatedResponse,
} from '@nestjs/swagger'
import { CommonSuccessResponse } from '@src/common/response/common.response'

export const ApiSuccessResponse = <TModel extends Type<unknown>>(
    model: TModel,
    status: 'ok' | 'created' = 'ok',
) => {
    const decorator = status === 'created' ? ApiCreatedResponse : ApiOkResponse

    return applyDecorators(
        ApiExtraModels(CommonSuccessResponse, model),
        decorator({
            schema: {
                allOf: [
                    { $ref: getSchemaPath(CommonSuccessResponse) },
                    {
                        properties: {
                            data: {
                                $ref: getSchemaPath(model),
                            },
                        },
                    },
                ],
            },
        }),
    )
}
