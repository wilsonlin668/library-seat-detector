'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { textareaFieldSchema, type TextareaFieldFormData } from './schemas';
import { showFormSubmissionToast } from './utils';

export function TextareaFieldForm() {
  const form = useForm<TextareaFieldFormData>({
    resolver: zodResolver(textareaFieldSchema),
    defaultValues: {
      description: '',
    },
  });

  function onSubmit(data: TextareaFieldFormData) {
    showFormSubmissionToast(data);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Textarea Field Form</CardTitle>
        <CardDescription>
          Example form with textarea field and validation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="textarea-field-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="description"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="textarea-field-form-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="textarea-field-form-description"
                    placeholder="I'm having an issue with the login button on mobile."
                    rows={6}
                    className="min-h-24 resize-none"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Include steps to reproduce, expected behavior, and what
                    actually happened.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset
          </Button>
          <Button type="submit" form="textarea-field-form">
            Submit
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
