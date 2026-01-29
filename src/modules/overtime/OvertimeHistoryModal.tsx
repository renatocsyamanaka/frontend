// src/modules/overtime/OvertimeHistoryModal.tsx
import { Modal, Empty, List, Space, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../../lib/api';

type Role = { id: number; name: string; level: number };
type User = { id: number; name: string; email: string; managerId?: number | null; role?: Role };

type Entry = {
  id: number;
  date: string;
  minutes: number;
  note?: string | null;
  approvedBy?: { id: number; name: string } | null;
};

function minutesToHHMM(min: number) {
  const sign = min < 0 ? '-' : '';
  const abs = Math.abs(min);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

function extractFromTo(note?: string | null) {
  if (!note) return null;
  const m = note.match(/(\-?\d{1,4}:\d{2})\s*→\s*(\-?\d{1,4}:\d{2})/);
  if (!m) return null;
  return { from: m[1], to: m[2] };
}

type Props = {
  open: boolean;
  onClose: () => void;
  month: Dayjs;
  user?: User;
};

export default function OvertimeHistoryModal({ open, onClose, month, user }: Props) {
  const monthStr = month.format('YYYY-MM');

  const { data, isLoading } = useQuery<{ totalMinutes: number; entries: Entry[] }>({
    enabled: open && !!user,
    queryKey: ['overtime-history', user?.id, monthStr, open],
    queryFn: async () => (await api.get(`/overtime/${user!.id}`, { params: { month: monthStr } })).data,
  });

  return (
    <Modal open={open} onCancel={onClose} footer={null} title="Alterações" width={720} destroyOnClose>
      {!user ? (
        <Empty description="Selecione um técnico" />
      ) : isLoading ? (
        <Empty description="Carregando..." />
      ) : !data || data.entries.length === 0 ? (
        <Empty description="Sem alterações no mês" />
      ) : (
        <List
          dataSource={data.entries}
          renderItem={(e) => {
            const fromTo = extractFromTo(e.note);
            const change = `${e.minutes >= 0 ? '+' : '-'}${minutesToHHMM(Math.abs(e.minutes))}`;

            return (
              <List.Item>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <Typography.Text strong>{dayjs(e.date).format('DD/MM/YYYY')}</Typography.Text>

                    {fromTo ? (
                      <div style={{ color: '#64748b' }}>
                        Alteração: <b>{fromTo.from}</b> → <b>{fromTo.to}</b>
                      </div>
                    ) : e.note ? (
                      <div style={{ color: '#64748b' }}>{e.note}</div>
                    ) : (
                      <div style={{ color: '#64748b' }}>Ajuste</div>
                    )}

                    {e.approvedBy?.name ? (
                      <div style={{ color: '#64748b' }}>
                        Por: <b>{e.approvedBy.name}</b>
                      </div>
                    ) : null}
                  </div>

                  <Tag color={e.minutes >= 0 ? 'green' : 'red'}>{change}</Tag>
                </Space>
              </List.Item>
            );
          }}
        />
      )}
    </Modal>
  );
}
