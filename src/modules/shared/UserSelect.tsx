import { Select } from 'antd';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

type Role = { id: number; name: string; level: number };
type User = { id: number; name: string; email: string; role?: Role | null };

type Props = {
  value?: number | null;
  onChange?: (v: number | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  /**
   * Mostra apenas usuários com cargo de gestor (Supervisor ou superior)
   */
  onlyManagers?: boolean;
  /**
   * Mostra apenas subordinados (diretos ou indiretos) do usuário logado
   */
  onlySubordinates?: boolean;
  style?: React.CSSProperties;
};

export function UserSelect({
  value,
  onChange,
  placeholder = 'Selecionar usuário…',
  allowClear = true,
  disabled,
  onlyManagers,
  onlySubordinates,
  style,
}: Props) {
  const [q, setQ] = useState('');

  const { data = [], isFetching } = useQuery<User[]>({
    queryKey: ['user-select', { q, onlyManagers: !!onlyManagers, onlySubordinates: !!onlySubordinates }],
    queryFn: async () => {
      const params: any = {};
      if (q) params.q = q;
      if (onlyManagers) params.onlyManagers = 1;
      if (onlySubordinates) params.onlySubordinates = 1;
      const res = await api.get('/users', { params });
      return res.data;
    },
    keepPreviousData: true,
  });

  const options = data.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.email})${u.role?.name ? ` - ${u.role?.name}` : ''}`,
  }));

  return (
    <Select
      showSearch
      allowClear={allowClear}
      filterOption={false}
      options={options}
      value={value ?? undefined}
      onChange={(v) => onChange?.((v as number) ?? null)}
      onSearch={setQ}
      placeholder={placeholder}
      loading={isFetching}
      disabled={disabled}
      style={style}
    />
  );
}

export default UserSelect;
