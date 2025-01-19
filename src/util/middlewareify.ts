export type MiddlewareFn<T extends (...args: any[]) => void> = (
  next: () => void,
  ...args: Parameters<T>
) => void;

export default function middlwareify<T extends (...args: any[]) => void>(
  fn: T,
  middlewareFns: MiddlewareFn<T>[] = []
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>) => {
    let passed = false;

    const next = () => {
      if (!passed) {
        passed = true;
        fn(...args);
      }
    };

    const runMiddleware = async (index: number) => {
      if (index < middlewareFns.length) {
        await middlewareFns[index](next, ...args);
        if (!passed) {
          runMiddleware(index + 1);
        }
      } else if (!passed) {
        fn(...args);
      }
    };

    runMiddleware(0);
  };
}
