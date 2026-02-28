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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { textFieldSchema, type TextFieldFormData } from './schemas';
import { showFormSubmissionToast } from './utils';

export function TextFieldForm() {
  const form = useForm<TextFieldFormData>({
    resolver: zodResolver(textFieldSchema),
    defaultValues: {
      title: '',
    },
  });

  function onSubmit(data: TextFieldFormData) {
    showFormSubmissionToast(data);
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Text Field Form</CardTitle>
        <CardDescription>
          Example form with text input field and validation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="text-field-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="text-field-form-title">
                    Bug Title
                  </FieldLabel>
                  <Input
                    {...field}
                    id="text-field-form-title"
                    aria-invalid={fieldState.invalid}
                    placeholder="Login button not working on mobile"
                    autoComplete="off"
                  />
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
          <Button type="submit" form="text-field-form">
            Submit
          </Button>
        </Field>
      </CardFooter>
    </Card>
  );
}
