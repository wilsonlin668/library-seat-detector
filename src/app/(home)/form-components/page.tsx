import { TextFieldForm, TextareaFieldForm } from '@/features/form-components';
import { PageContainer } from '@/components/page-container';

export default function FormComponentsPage() {
  return (
    <PageContainer maxWidth="screen-md">
      <div className="flex flex-col gap-4">
        <section>
          <TextFieldForm />
        </section>

        <section>
          <TextareaFieldForm />
        </section>
      </div>
    </PageContainer>
  );
}
