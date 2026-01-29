import { Select } from 'antd';

const options = [
  { value: 1, label: 'Técnico' },
  { value: 2, label: 'Supervisor' },
  { value: 3, label: 'Coordenador' },
  { value: 4, label: 'Gerente' },
  { value: 5, label: 'Admin' },
];

export function RoleSelect(props: any) {
  return <Select options={options} {...props} />;
}
