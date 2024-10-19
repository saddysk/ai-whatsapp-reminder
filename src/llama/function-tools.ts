import { FunctionTool } from 'llamaindex';

const taskDetailsTool = FunctionTool.from(
  // @ts-expect-error:by expert nada
  (args) => {
    return args;
  },
  {
    name: 'task_details',
    description: 'template to capture the reminder task',
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'object',
          items: {
            type: 'object',
            properties: {
              task: {
                type: 'string',
                description:
                  "reminder message that will be sent as a reminder to the user. eg: today is rushab's birthday, pick up grocery at 21:00",
              },
              date: {
                type: 'string',
                description:
                  "date of the task in the format of yyyy-MM-dd which needs to be performed. if date is not given return null but don't assume any random values",
              },
              time: {
                type: 'string',
                description:
                  "time of the task in the format of HH:mm which needs to be performed. if time is not given return null but don't assume any random values",
              },
              frequency: {
                type: 'number',
                description:
                  'frequency of task, it can be one-time, weekly, bi-weekly, monthly, yearly. give output in milliseconds. one time is 0, weekly is 604800000, bi-weekly is 1209600000, daily is 86400000, every 3 days is 259200000, etc. if not mentioned consider once',
              },
              end: {
                type: 'string',
                description:
                  // "number of days this task should run for, which is the end date of the task. if the end date is not given, assume it to be 2030-01-01. if frequency is 0 keep end date as null",
                  "end of the task in the format yyyy-MM-dd. /n/n If explicitly mentioned in the task, use that date. If a duration is given (e.g., 'for 2 weeks', 'until the end of the month'), calculate the end date based on the start date. /n/n If no end or duration is specified, and frequency is not 0, set it to be 2030-01-01. If frequency is 0 (one-time task), set to null.",
              },
              confirmation: {
                type: 'string',
                description:
                  'a personalized confirmation message for user that their task is scheduled. include how frequently the user will be reminded if necessary. if date is included it should be in the format: Mon DD, YYYY. should be only the aggregated confirmation message, without any additional explanation.',
              },
            },
            required: ['frequency', 'time', 'confirmation'],
          },
          required: ['items'],
        },
      },
      required: ['task'],
    },
  },
);

export default taskDetailsTool;
