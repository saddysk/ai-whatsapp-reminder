import { ApiProperty } from '@nestjs/swagger';

export class SuccessDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  statusCode: number;

  constructor(message = 'ok', statusCode = 200) {
    this.message = message;
    this.statusCode = statusCode;
  }
}
