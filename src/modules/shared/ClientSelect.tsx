import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

type Client = { id: number; name: string; locationText?: string };

export function ClientSelect(props: React.ComponentProps<typeof Select<number>>) {
  const { data, isLoading } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
  });

  const options = (data || []).map(c => ({
    value: c.id,
    label: c.locationText ? `${c.name} — ${c.locationText}` : c.name,
  }));

  return (
    <Select<number>
      showSearch
      allowClear
      loading={isLoading}
      placeholder="Selecione o cliente"
      optionFilterProp="label"
      options={options}
      {...props}
    />
  );
}
