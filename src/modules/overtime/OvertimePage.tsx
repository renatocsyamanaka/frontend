// src/modules/overtime/OvertimePage.tsx
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  message,
  Space,
  Tag,
  Typography,
  Row,
  Col,
} from 'antd';
import { LeftOutlined, RightOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useAuth } from '../auth/AuthProvider';
import SetOvertimeBalanceModal from './SetOvertimeBalanceModal';
import OvertimeHistoryModal from './OvertimeHistoryModal';

type Role = { id: number; name: string; level: number };
type User = { id: number; name: string; email: string; managerId?: number | null; role?: Role };

type BalanceMap = Record<number, number>;

function minutesToHHMM(min: number) {
  const sign = min < 0 ? '-' : '';
  const abs = Math.abs(min);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

export default function OvertimePage() {
  const { user: me } = useAuth();
  const [month, setMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const monthStr = month.format('YYYY-MM');

  // ✅ somente Coordenador+ atualiza banco (ajuste o level conforme seu RBAC)
  const canAdjust = (me?.role?.level ?? 0) >= 3;

  // ✅ Só quem tem banco (ajuste a regra conforme seu sistema)
  // Ex.: só Técnicos
  const hasBank = (u?: User | null) => String(u?.role?.name || '').toLowerCase() === 'tecnico';

  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // Minha equipe
  const { data: team = [], isLoading: loadingTeam, refetch: refetchTeam } = useQuery<User[]>({
    queryKey: ['team'],
    queryFn: async () => (await api.get('/users/team')).data,
  });

  const teamWithBank = useMemo(() => team.filter(hasBank), [team]);

  // ✅ Saldo REAL por técnico no mês (sem endpoint summary)
  const {
    data: balances = {},
    isLoading: loadingBalances,
    refetch: refetchBalances,
  } = useQuery<BalanceMap>({
    queryKey: ['overtime-balances', monthStr, teamWithBank.map((t) => t.id).join(',')],
    enabled: teamWithBank.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        teamWithBank.map(async (u) => {
          const r = await api.get(`/overtime/${u.id}`, { params: { month: monthStr } });
          return [u.id, r.data?.totalMinutes ?? 0] as const;
        })
      );

      const map: BalanceMap = {};
      for (const [id, minutes] of results) map[id] = minutes;
      return map;
    },
  });

  const onRefresh = () => {
    refetchTeam();
    refetchBalances();
  };

  const openGlobalUpdate = () => {
    if (!canAdjust) return message.warning('Somente Coordenador+ pode atualizar o banco de horas');
    setActiveUser(null); // deixa escolher no modal
    setUpdateModalOpen(true);
  };

  const openUpdateFor = (u: User) => {
    if (!canAdjust) return message.warning('Somente Coordenador+ pode atualizar o banco de horas');
    setActiveUser(u);
    setUpdateModalOpen(true);
  };

  const openHistoryFor = (u: User) => {
    setActiveUser(u);
    setHistoryOpen(true);
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Topo */}
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button icon={<LeftOutlined />} onClick={() => setMonth((m) => m.subtract(1, 'month'))} />
            <DatePicker picker="month" value={month} onChange={(v) => v && setMonth(v.startOf('month'))} />
            <Button icon={<RightOutlined />} onClick={() => setMonth((m) => m.add(1, 'month'))} />
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              Atualizar
            </Button>
          </Space>

          <Space>
            <Typography.Text type="secondary">
              {canAdjust ? 'Você pode atualizar o saldo.' : 'Apenas Coordenador+ pode atualizar o saldo.'}
            </Typography.Text>

            <Button type="primary" onClick={openGlobalUpdate} disabled={!canAdjust}>
              Atualizar banco de horas
            </Button>
          </Space>
        </Space>
      </Card>

      {/* Cards */}
      <Card title="Técnicos (com banco de horas)">
        {loadingTeam ? (
          <Empty description="Carregando..." />
        ) : teamWithBank.length === 0 ? (
          <Empty description="Nenhum técnico com banco" />
        ) : (
          <Row gutter={[12, 12]}>
            {teamWithBank.map((u) => {
              const min = balances[u.id] ?? 0;
              const saldo = minutesToHHMM(min);
              const saldoNegativo = min < 0;

              return (
                <Col key={u.id} xs={24} sm={12} md={8} lg={6}>
                  <Card
                    size="small"
                    style={{ borderRadius: 12 }}
                    title={
                      <Space direction="vertical" size={0}>
                        <Typography.Text strong>{u.name}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {u.email}
                        </Typography.Text>
                      </Space>
                    }
                    extra={<Tag>{u.role?.name ?? '—'}</Tag>}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size={10}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Typography.Text type="secondary">Saldo</Typography.Text>
                        <Typography.Text
                          style={{
                            fontWeight: 800,
                            color: saldoNegativo ? '#dc2626' : undefined,
                          }}
                        >
                          {loadingBalances ? '...' : saldo}
                        </Typography.Text>
                      </Space>

                      <Space style={{ width: '100%' }}>
                        <Button type="primary" block onClick={() => openUpdateFor(u)} disabled={!canAdjust}>
                          Atualizar saldo
                        </Button>

                        <Button block icon={<HistoryOutlined />} onClick={() => openHistoryFor(u)}>
                          Ver alterações
                        </Button>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* Modal: Atualizar saldo */}
      <SetOvertimeBalanceModal
        open={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        month={month}
        team={teamWithBank}
        defaultUserId={activeUser?.id}
        onSuccess={() => {
          setUpdateModalOpen(false);
          refetchBalances(); // atualiza os cards
        }}
      />

      {/* Modal: Histórico */}
      <OvertimeHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        month={month}
        user={activeUser ?? undefined}
      />
    </div>
  );
}
