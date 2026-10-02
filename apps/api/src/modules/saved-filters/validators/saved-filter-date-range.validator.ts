import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

interface DateRangeObject {
  [key: string]: string | undefined;
}

export function IsValidDateRange(
  fromProperty: string,
  toProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isValidDateRange',
      target: object.constructor,
      propertyName,
      constraints: [fromProperty, toProperty],
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const [fromKey, toKey] = args.constraints as [string, string];

          const source = args.object as DateRangeObject;

          if (!source[fromKey] || !source[toKey]) {
            return true;
          }

          return (
            new Date(source[fromKey]).getTime() <=
            new Date(source[toKey]).getTime()
          );
        },

        defaultMessage(args: ValidationArguments): string {
          const [fromKey, toKey] = args.constraints as [string, string];

          return `${fromKey} must be less than or equal to ${toKey}`;
        },
      },
    });
  };
}
