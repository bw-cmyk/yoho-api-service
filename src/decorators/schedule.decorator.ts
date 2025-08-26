import * as Sentry from '@sentry/node';

export const ScheduleReporter = () => {
  return (
    target: any,
    _propertyKey: string,
    propertyDescriptor: PropertyDescriptor,
  ) => {
    const originalMethod: () => Promise<void> = propertyDescriptor.value;
    propertyDescriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    };
  };
};
