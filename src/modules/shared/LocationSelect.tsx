import { Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

type Location = { id: number; name: string; area?: string; city?: string; state?: string };

export function LocationSelect(props: React.ComponentProps<typeof Select<number>>) {
  const { data, isLoading } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => (await api.get('/locations')).data,
  });

  const options =
    (data || []).map(l => ({
      value: l.id,
      label: [l.name, l.city, l.state].filter(Boolean).join(' - '),
    }));

  return (
    <Select<number>
      showSearch
      allowClear
      loading={isLoading}
      placeholder="Selecione o local"
      optionFilterProp="label"
      options={options}
      {...props}
    />
  );
}
