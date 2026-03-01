import { DataTable } from '@/components/data-table';

import data from '@/app/dashboard/data.json'; 

export default function TableComponentsPage() {
  return <DataTable data={data} />;
}
