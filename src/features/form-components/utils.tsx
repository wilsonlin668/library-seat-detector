import * as React from 'react';
import { toast } from 'sonner';

type ToastOptions = {
  title?: string;
  maxWidth?: string;
};

export function showFormSubmissionToast(
  data: Record<string, unknown>,
  options?: ToastOptions
) {
  const { title = 'You submitted the following values:', maxWidth = '320px' } =
    options || {};

  toast(title, {
    description: (
      <pre
        className="bg-muted text-muted-foreground mt-2 overflow-x-auto rounded-md p-4"
        style={{ maxWidth }}
      >
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    ),
    position: 'bottom-right',
    classNames: {
      content: 'flex flex-col gap-2',
    },
    style: {
      '--border-radius': 'calc(var(--radius)  + 4px)',
    } as React.CSSProperties,
  });
}
