import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Table,
  Row,
  Col,
  Progress,
  Typography,
  Spin,
  Empty,
  Button,
  Space,
  Grid,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeftOutlined,
  FundOutlined,
  TeamOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

const { Title, Paragraph, Text } = Typography;

type RowType = {
  clientId: number;
  clientName: string;
  totalProjects: number;
  completedProjects: number;
  planned: number;
  done: number;
  pending: number;
  percentDone: number;
};

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  colors,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ReactNode;
  colors: {
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
  };
}) {
  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 24,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 16px 32px rgba(15,23,42,0.08)',
        overflow: 'hidden',
        height: '100%',
      }}
      styles={{ body: { padding: 18 } }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#334155', fontWeight: 700 }}>
            {title}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 32,
              lineHeight: 1.1,
              fontWeight: 900,
              color: '#0f172a',
            }}
          >
            {value}
          </div>

          <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
            {subtitle}
          </div>
        </div>

        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 18,
            background: colors.iconBg,
            color: colors.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            boxShadow: '0 10px 24px rgba(15,23,42,0.10)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

const numberSorter = (a: number, b: number) => (a || 0) - (b || 0);

export default function InstallationProjectsByClientPage() {
  const navigate = useNavigate();
  const params = useQueryParams();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(10);

  const query = useQuery<RowType[]>({
    queryKey: ['installation-projects-by-client', params.toString()],
    queryFn: async () => {
      const res = await api.get('/installation-projects/dashboard/overview', {
        params: Object.fromEntries(params.entries()),
      });

      return res.data?.byClient || [];
    },
  });

  const data = query.data || [];

  const totals = useMemo(() => {
    return data.reduce(
      (acc, item) => {
        acc.totalProjects += item.totalProjects || 0;
        acc.completedProjects += item.completedProjects || 0;
        acc.planned += item.planned || 0;
        acc.done += item.done || 0;
        acc.pending += item.pending || 0;
        return acc;
      },
      {
        totalProjects: 0,
        completedProjects: 0,
        planned: 0,
        done: 0,
        pending: 0,
      }
    );
  }, [data]);

  const overallPercent = useMemo(() => {
    if (!totals.planned) return 0;
    return Math.round((totals.done / totals.planned) * 100);
  }, [totals]);

  const columns: ColumnsType<RowType> = [
    {
      title: 'Cliente',
      dataIndex: 'clientName',
      key: 'clientName',
      fixed: isMobile ? undefined : 'left',
      width: 240,
      sorter: (a, b) => (a.clientName || '').localeCompare(b.clientName || '', 'pt-BR'),
      render: (value: string) => (
        <div style={{ fontWeight: 700, color: '#0f172a' }}>{value || '-'}</div>
      ),
    },
    {
      title: 'Projetos',
      dataIndex: 'totalProjects',
      key: 'totalProjects',
      align: 'center',
      width: 120,
      sorter: (a, b) => numberSorter(a.totalProjects, b.totalProjects),
      render: (v: number) => <b>{v || 0}</b>,
    },
    {
      title: 'Concluídos',
      dataIndex: 'completedProjects',
      key: 'completedProjects',
      align: 'center',
      width: 130,
      sorter: (a, b) => numberSorter(a.completedProjects, b.completedProjects),
      render: (v: number) => (
        <span style={{ fontWeight: 800, color: '#16a34a' }}>{v || 0}</span>
      ),
    },
    {
      title: 'Base',
      dataIndex: 'planned',
      key: 'planned',
      align: 'center',
      width: 120,
      sorter: (a, b) => numberSorter(a.planned, b.planned),
      render: (v: number) => Math.round(v || 0),
    },
    {
      title: 'Realizado',
      dataIndex: 'done',
      key: 'done',
      align: 'center',
      width: 120,
      sorter: (a, b) => numberSorter(a.done, b.done),
      render: (v: number) => (
        <span style={{ fontWeight: 800, color: '#1677ff' }}>
          {Math.round(v || 0)}
        </span>
      ),
    },
    {
      title: 'Pendente',
      dataIndex: 'pending',
      key: 'pending',
      align: 'center',
      width: 120,
      sorter: (a, b) => numberSorter(a.pending, b.pending),
      render: (v: number) => (
        <span style={{ fontWeight: 800, color: '#f97316' }}>
          {Math.round(v || 0)}
        </span>
      ),
    },
    {
      title: '% Conclusão',
      dataIndex: 'percentDone',
      key: 'percentDone',
      width: 220,
      sorter: (a, b) => numberSorter(a.percentDone, b.percentDone),
      defaultSortOrder: 'descend',
      render: (v: number) => {
        const percent = Math.round(v || 0);

        return (
          <div style={{ minWidth: 160 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
                fontSize: 12,
                color: '#475569',
                fontWeight: 700,
              }}
            >
              <span>Progresso</span>
              <span>{percent}%</span>
            </div>

            <Progress
              percent={percent}
              size="small"
              showInfo={false}
              strokeColor={
                percent >= 80
                  ? '#16a34a'
                  : percent >= 50
                  ? '#1677ff'
                  : '#f97316'
              }
            />
          </div>
        );
      },
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gap: 18,
        background: 'linear-gradient(180deg, #f4f8ff 0%, #eef4fb 100%)',
        padding: isMobile ? 10 : 6,
        borderRadius: 28,
      }}
    >
      <Card
        variant="outlined"
        style={{
          borderRadius: 30,
          background: '#ffffff',
          boxShadow: '0 12px 32px rgba(15,23,42,0.08)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        }}
        styles={{ body: { padding: isMobile ? 18 : 28 } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: 16,
            flexDirection: isMobile ? 'column' : 'row',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 999,
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: 12,
                fontWeight: 800,
                marginBottom: 14,
              }}
            >
              <FundOutlined />
              Análise por cliente
            </div>

            <Title level={2} style={{ margin: 0, color: '#0f172a' }}>
              Visão por Cliente
            </Title>

            <Paragraph
              style={{
                margin: '10px 0 0',
                color: '#475569',
                maxWidth: 760,
              }}
            >
              Acompanhe a distribuição de projetos, concluídos, base, realizado,
              pendente e percentual de conclusão por cliente, considerando os
              filtros aplicados no dashboard principal.
            </Paragraph>
          </div>

          <Space wrap>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/projetos-instalacao/dashboard')}
              style={{
                borderRadius: 14,
                borderColor: '#e2e8f0',
                background: '#fff',
                color: '#0f172a',
                fontWeight: 600,
              }}
            >
              Voltar para dashboard
            </Button>

            <Button
              size="large"
              type="primary"
              icon={<BarChartOutlined />}
              onClick={() => query.refetch()}
              style={{
                borderRadius: 14,
                background: '#2563eb',
                borderColor: '#2563eb',
                fontWeight: 700,
              }}
            >
              Atualizar
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Total projetos"
            value={totals.totalProjects}
            subtitle="Quantidade total agrupada por cliente"
            icon={<TeamOutlined />}
            colors={{
              bg: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              border: '#cbd5e1',
              iconBg: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
              iconColor: '#fff',
            }}
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Projetos concluídos"
            value={totals.completedProjects}
            subtitle="Quantidade total concluída"
            icon={<CheckCircleOutlined />}
            colors={{
              bg: 'linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%)',
              border: '#bbf7d0',
              iconBg: 'linear-gradient(135deg, #16a34a 0%, #4ade80 100%)',
              iconColor: '#fff',
            }}
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Total base"
            value={totals.planned}
            subtitle="Volume total previsto"
            icon={<DatabaseOutlined />}
            colors={{
              bg: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
              border: '#bfdbfe',
              iconBg: 'linear-gradient(135deg, #1d4ed8 0%, #60a5fa 100%)',
              iconColor: '#fff',
            }}
          />
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="% conclusão geral"
            value={`${overallPercent}%`}
            subtitle="Realizado sobre a base total"
            icon={<FundOutlined />}
            colors={{
              bg: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
              border: '#fdba74',
              iconBg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
              iconColor: '#fff',
            }}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <KpiCard
            title="Total realizado"
            value={totals.done}
            subtitle="Volume já concluído"
            icon={<CheckCircleOutlined />}
            colors={{
              bg: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
              border: '#bfdbfe',
              iconBg: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
              iconColor: '#fff',
            }}
          />
        </Col>

        <Col xs={24} md={12}>
          <KpiCard
            title="Total pendente"
            value={totals.pending}
            subtitle="Volume ainda não concluído"
            icon={<ClockCircleOutlined />}
            colors={{
              bg: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
              border: '#fdba74',
              iconBg: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
              iconColor: '#fff',
            }}
          />
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{
          borderRadius: 24,
          boxShadow: '0 14px 32px rgba(15,23,42,0.06)',
        }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #1677ff 0%, #69b1ff 100%)',
                color: '#fff',
                boxShadow: '0 10px 24px rgba(22,119,255,0.22)',
                flexShrink: 0,
              }}
            >
              <FundOutlined />
            </div>

            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 16 }}>
                Detalhamento por cliente
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Clique no cabeçalho das colunas para ordenar
              </div>
            </div>
          </div>
        }
      >
        {query.isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Spin size="large" />
          </div>
        ) : data.length === 0 ? (
          <Empty description="Sem dados para os filtros selecionados" />
        ) : (
          <Table
            rowKey="clientId"
            dataSource={data}
            columns={columns}
            locale={{
              emptyText: 'Sem dados para os filtros selecionados',
            }}
            pagination={{
              current: tablePage,
              pageSize: tablePageSize,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} de ${total} clientes`,
              onChange: (page, pageSize) => {
                setTablePage(page);
                setTablePageSize(pageSize);
              },
              onShowSizeChange: (_, size) => {
                setTablePage(1);
                setTablePageSize(size);
              },
            }}
            scroll={{ x: 1100 }}
          />
        )}
      </Card>

      <Card
        bordered={false}
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
          border: '1px solid #dbeafe',
        }}
      >
        <Text style={{ color: '#475569' }}>
          Esta tela utiliza os mesmos filtros enviados a partir do dashboard principal.
        </Text>
      </Card>
    </div>
  );
}