import { StringField } from 'libs/decorators';

export class GAuthDto {
  @StringField()
  phone: string;

  @StringField()
  conversation_id: string;

  @StringField()
  participant_id: string;
}
