import { StringField } from 'libs/decorators';

export class StandardMsgBirdRequestDto {
  @StringField()
  user_phone: string;

  @StringField()
  conversation_id: string;

  @StringField()
  participant_id: string;
}
