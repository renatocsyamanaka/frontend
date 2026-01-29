import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { DatePicker, List, Typography, Button } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useState } from 'react';
import { UserSelect } from '../shared/UserSelect';
import { CreateAssignmentModal } from './CreateAssignmentModal';

export function AssignmentsPage() {
  const [userId, setUserId] = useState<number>(1);
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['assignments', userId, date.format('YYYY-MM-DD')],
    queryFn: async () =>
      (await api.get(`/assignments/week/${userId}`, { params: { date: date.format('YYYY-MM-DD') } })).data,
  });

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h2>Agenda Semanal</h2>
        <Button type="primary" onClick={() => setOpen(true)}>Novo compromisso</Button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ minWidth: 280 }}>
          <UserSelect value={userId} onChange={(v) => v && setUserId(v)} />
        </div>
        <DatePicker value={date} onChange={(d)=> d && setDate(d)} format="YYYY-MM-DD" />
      </div>

      <List
        loading={isLoading}
        bordered
        dataSource={data || []}
        renderItem={(a: any) => (
          <List.Item>
            <Typography.Text>
              {dayjs(a.start).format('DD/MM HH:mm')} → {dayjs(a.end).format('DD/MM HH:mm')}
            </Typography.Text>
            <div style={{ marginLeft: 12 }}>
              {a.description}
              {a.client ? ` — ${a.client.name}` : ''}
              {a.location ? ` — ${a.location.name}` : ''}
            </div>
          </List.Item>
        )}
      />

      <CreateAssignmentModal open={open} onClose={() => setOpen(false)} defaultUserId={userId} />
    </div>
  );
}
