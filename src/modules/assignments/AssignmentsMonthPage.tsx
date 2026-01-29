import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Badge,
  Button,
  Calendar,
  Card,
  DatePicker,
  Modal,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { LeftOutlined, RightOutlined, PlusOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthProvider';
import CreateAssignmentModal from './CreateAssignmentModal';

type Role = { id: number; name: string; level: number };
type User = { id: number; name: string; email: string; managerId?: number | null; role?: Role };
type Client = { id: number; name: string };
type Location = { id: number; name: string };
type Assignment = {
  id: number;
  start: string;
  end: string;
  description?: string | null;
  type: 'CLIENT' | 'INTERNAL' | 'TRAVEL';
  user?: Pick<User, 'id' | 'name'>;
  client?: Client | null;
  location?: Location | null;
};

const typeTag: Record<Assignment['type'], { color: string; label: string }> = {
  CLIENT: { color: 'processing', label: 'Cliente' },
  INTERNAL: { color: 'default', label: 'Interno' },
  TRAVEL: { color: 'warning', label: 'Desloc.' },
};

export default function AssignmentsPage() {
  const { user: me } = useAuth();
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [onlyTeam, setOnlyTeam] = useState(true);
  const [userIds, setUserIds] = useState<number[]>([]);
  const [modalDay, setModalDay] = useState<null | string>(null);

  // criar compromisso
  const [createOpen, setCreateOpen] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState<Dayjs | null>(null);
  const openCreate = (d?: Dayjs) => { setCreateDefaultDate(d ?? dayjs()); setCreateOpen(true); };

  // usuários (para filtro)
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  // minha equipe (diretos) + eu
  const filteredUsers = useMemo(() => {
    if (!onlyTeam || !me) return users;
    return users.filter(u => u.managerId === me.id || u.id === me.id);
  }, [users, onlyTeam, me]);

  // intervalo do mês
// intervalo do mês
const from = month.startOf('month').format('YYYY-MM-DD');
const to   = month.endOf('month').format('YYYY-MM-DD');

// se "Apenas minha equipe" estiver ligado e nada selecionado,
// enviamos os ids da equipe por padrão; caso contrário usamos o que foi selecionado.
const defaultTeamIds = onlyTeam ? filteredUsers.map(u => u.id) : [];
const targetIds = userIds.length ? userIds : defaultTeamIds;
const usersParam = targetIds.length ? targetIds.join(',') : undefined;

// compromissos (atenção: backend espera "users", não "userIds")
const { data: assignments = [], isLoading, refetch } = useQuery<Assignment[]>({
  queryKey: ['assignments-range', { from, to, usersParam }],
  queryFn: async () =>
    (await api.get('/assignments/range', { params: { from, to, users: usersParam } })).data,
});

  // agrupa por dia
  const byDay = useMemo(() => {
    const m = new Map<string, Assignment[]>();
    assignments.forEach(a => {
      const s = dayjs(a.start).startOf('day');
      const e = dayjs(a.end).startOf('day');
      for (let d = s; !d.isAfter(e); d = d.add(1, 'day')) {
        const key = d.format('YYYY-MM-DD');
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(a);
      }
    });
    return m;
  }, [assignments]);

  const modalItems = modalDay ? byDay.get(modalDay) || [] : [];
  const allOptionValues = filteredUsers.map(u => u.id);
  const selectedUsersInfo =
    userIds.length === 0 ? 'Todos' : `${userIds.length} de ${filteredUsers.length}`;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button icon={<LeftOutlined />} onClick={() => setMonth(m => m.subtract(1, 'month'))} />
            <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v.startOf('month'))} />
            <Button icon={<RightOutlined />} onClick={() => setMonth(m => m.add(1, 'month'))} />
          </Space>

          <Space direction="vertical" size={2}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Usuários</span>
            <Space>
              <Select
                mode="multiple"
                allowClear
                style={{ minWidth: 320 }}
                loading={loadingUsers}
                placeholder="Filtrar usuários"
                value={userIds}
                onChange={setUserIds}
                options={filteredUsers.map(u => ({ value: u.id, label: u.name }))}
              />
              <Button size="small" onClick={() => setUserIds(allOptionValues)} disabled={!filteredUsers.length}>
                Selecionar todos
              </Button>
              <Button size="small" onClick={() => setUserIds([])}>Limpar</Button>
              <Tag>{selectedUsersInfo}</Tag>
            </Space>
            <label style={{ color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyTeam}
                onChange={e => setOnlyTeam(e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Apenas minha equipe
            </label>
          </Space>

          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate(month)}>
            Novo compromisso
          </Button>
        </Space>
      </Card>

      <Card title={`Agenda mensal – ${month.format('MMMM YYYY')}`}>
        <Calendar
          value={month}
          onChange={(v) => v && setMonth(v.startOf('month'))}
          fullscreen
          headerRender={() => null}
          dateCellRender={(value) => {
            const key = value.format('YYYY-MM-DD');
            const items = byDay.get(key) || [];
            if (!items.length) {
              // clique num dia vazio para abrir modal já com a data
              return (
                <div onDoubleClick={() => openCreate(value)} style={{ height: 24 }} />
              );
            }

            const show = items.slice(0, 3);
            const overflow = items.length - show.length;

            return (
              <div style={{ display: 'grid', gap: 6 }}>
                {show.map((a) => {
                  const who = a.user?.name || '—';
                  const info = a.client?.name ?? a.location?.name ?? (a.description || '');
                  const t = typeTag[a.type];
                  return (
                    <Tooltip
                      key={a.id}
                      title={
                        <div style={{ maxWidth: 320 }}>
                          <div><b>{who}</b></div>
                          <div>{dayjs(a.start).format('DD/MM HH:mm')} → {dayjs(a.end).format('DD/MM HH:mm')}</div>
                          <div>{info}</div>
                        </div>
                      }
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <Badge status="processing" />
                        <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <b>{who}</b> — {info}
                        </span>
                        <Tag color={t.color} style={{ marginInlineStart: 0 }}>{t.label}</Tag>
                      </div>
                    </Tooltip>
                  );
                })}
                {overflow > 0 && <a onClick={() => setModalDay(key)}>+{overflow} mais</a>}
              </div>
            );
          }}
        />
      </Card>

      {/* modal lista do dia */}
      <Modal
        title={modalDay ? `Compromissos em ${dayjs(modalDay).format('DD/MM/YYYY')}` : ''}
        open={!!modalDay}
        onCancel={() => setModalDay(null)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {modalItems.map((a) => {
            const t = typeTag[a.type];
            return (
              <Card size="small" key={a.id}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Typography.Text strong>{a.user?.name}</Typography.Text>
                    <Tag color={t.color}>{t.label}</Tag>
                  </Space>
                  <div style={{ color: '#64748b' }}>
                    {dayjs(a.start).format('DD/MM HH:mm')} → {dayjs(a.end).format('DD/MM HH:mm')}
                  </div>
                  <div>{a.client?.name || a.location?.name || a.description || '—'}</div>
                </Space>
              </Card>
            );
          })}
        </Space>
      </Modal>

      {/* modal criar */}
      <CreateAssignmentModal
        open={createOpen}
        defaultDate={createDefaultDate ?? undefined}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); refetch(); }}
      />
    </div>
  );
}
