import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Spin,
  Grid,
  Pagination,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../../lib/api';

type Client = { id: number; name: string };
type Status = 'A_INICIAR' | 'INICIADO' | 'FINALIZADO';
type RoleLite = { id: number; name: string; level: number };

type UserLite = {
  id: number;
  name: string;
  managerId?: number | null;
  role?: RoleLite;
  roleId?: number;
  roleLevel?: number;
};

type Option = { id: number; name: string };

type InstallationProject = {
  id: number;
  title: string;
  af?: string | null;
  status: Status;

  clientId: number | null;
  client?: { id: number; name: string } | null;

  technicianId?: number | null;
  technicianIds?: number[];
  technician?: { id: number; name: string } | null;
  techniciansList?: { id: number; name: string }[];
  technicianNames?: string[];

  supervisorId: number;
  supervisor?: { id: number; name: string } | null;

  coordinatorId?: number | null;
  coordinator?: { id: number; name: string } | null;

  startPlannedAt: string;
  endPlannedAt?: string | null;

  trucksTotal: number;
  trucksDone: number;

  equipmentsPerDay: number;
  daysEstimated?: number | null;

  contactName?: string | null;
  contactEmail?: string | null;
  contactEmails?: string[];
  contactPhone?: string | null;
  notes?: string | null;
};

type CreateDTO = {
  title: string;
  clientId: number | null;

  technicianIds: number[];
  technicianId?: number | null;
  supervisorId: number;

  startPlannedAt: string;
  equipmentsPerDay: number;
  trucksTotal: number;

  af?: string | null;

  contactName?: string | null;
  contactEmails: string[];
  contactEmail?: string | null;
  contactPhone?: string | null;

  notes?: string | null;
};

type ResizableTitleProps = React.HTMLAttributes<HTMLTableCellElement> & {
  onResize?: (
    e: React.SyntheticEvent<Element>,
    data: { size: { width: number; height: number } }
  ) => void;
  width?: number;
};

type ColumnResizeItem = {
  key: string;
  widthPct: number;
};

function unwrap<T>(resData: any): T {
  return resData && typeof resData === 'object' && 'data' in resData
    ? (resData.data as T)
    : (resData as T);
}

function getRoleName(u: UserLite) {
  return u?.role?.name;
}

function getRoleLevel(u: UserLite) {
  return u?.role?.level ?? u?.roleLevel;
}

function getRoleId(u: UserLite) {
  return u?.role?.id ?? u?.roleId;
}

const ROLE_ID_TECNICO = 1;
const ROLE_ID_SUPERVISOR = 3;
const ROLE_ID_PSO = 8;
const MIN_COL_PCT = 6;

function isSupervisor(u: UserLite) {
  const level = getRoleLevel(u);
  const name = getRoleName(u);
  const id = getRoleId(u);
  return level === 3 || name === 'Supervisor' || id === ROLE_ID_SUPERVISOR;
}

function isTechnicianOrPSO(u: UserLite) {
  const name = getRoleName(u);
  const id = getRoleId(u);
  if (id === ROLE_ID_TECNICO || id === ROLE_ID_PSO) return true;
  if (name === 'Tecnico' || name === 'PSO') return true;
  return false;
}

function normalizeEmailList(input: unknown): string[] {
  let arr: unknown[] = [];

  if (!input) return [];

  if (Array.isArray(input)) {
    arr = input;
  } else if (typeof input === 'string') {
    arr = input.split(/[;,]/);
  } else {
    arr = [input];
  }

  return [
    ...new Set(
      arr
        .map((item) => String(item || '').trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function isValidEmail(email?: string | null) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function statusTag(s: Status) {
  if (s === 'A_INICIAR') return <Tag>À iniciar</Tag>;
  if (s === 'INICIADO') return <Tag color="blue">Iniciado</Tag>;
  return <Tag color="green">Finalizado</Tag>;
}

const ResizableTitle = (props: ResizableTitleProps) => {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    return <th {...restProps} />;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => e.stopPropagation()}
        />
      }
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th {...restProps} />
    </Resizable>
  );
};

export default function InstallationProjectsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | 'TODOS'>('TODOS');
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [techSearch, setTechSearch] = useState('');
  const [supervisorSearch, setSupervisorSearch] = useState('');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const tableWrapRef = useRef<HTMLDivElement | null>(null);
  const [tableWidth, setTableWidth] = useState(1200);

  const [columnSizes, setColumnSizes] = useState<ColumnResizeItem[]>([
    { key: 'title', widthPct: 16 },
    { key: 'af', widthPct: 10 },
    { key: 'client', widthPct: 18 },
    { key: 'technician', widthPct: 18 },
    { key: 'coordinator', widthPct: 14 },
    { key: 'trucks', widthPct: 8 },
    { key: 'start', widthPct: 6 },
    { key: 'end', widthPct: 6 },
    { key: 'status', widthPct: 4 },
  ]);

  const watchedTrucksTotal = Form.useWatch('trucksTotal', form);
  const watchedEquipmentsPerDay = Form.useWatch('equipmentsPerDay', form);
  const watchedStartPlannedAt = Form.useWatch('startPlannedAt', form);

  useEffect(() => {
    const el = tableWrapRef.current;
    if (!el) return;

    const updateWidth = () => {
      const nextWidth = el.offsetWidth || 1200;
      setTableWidth(nextWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(el);

    window.addEventListener('resize', updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const onChangeStatus = (v: any) => {
    setStatus(v);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const getColumnWidthPct = (key: string, fallbackPct: number) =>
    columnSizes.find((c) => c.key === key)?.widthPct ?? fallbackPct;

  const getColumnWidthPx = (key: string, fallbackPct: number) => {
    const pct = getColumnWidthPct(key, fallbackPct);
    return Math.max(80, Math.round((tableWidth * pct) / 100));
  };

  const handleResize =
    (key: string) =>
    (_: React.SyntheticEvent<Element>, { size }: { size: { width: number; height: number } }) => {
      setColumnSizes((prev) => {
        const currentIndex = prev.findIndex((c) => c.key === key);
        if (currentIndex === -1) return prev;

        const nextIndex = currentIndex + 1;
        if (nextIndex >= prev.length) return prev;

        const current = prev[currentIndex];
        const next = prev[nextIndex];

        const newPct = (size.width / Math.max(tableWidth, 1)) * 100;
        const delta = newPct - current.widthPct;

        if (Math.abs(delta) < 0.2) return prev;

        let currentWidthPct = current.widthPct + delta;
        let nextWidthPct = next.widthPct - delta;

        if (currentWidthPct < MIN_COL_PCT) {
          const diff = MIN_COL_PCT - currentWidthPct;
          currentWidthPct = MIN_COL_PCT;
          nextWidthPct -= diff;
        }

        if (nextWidthPct < MIN_COL_PCT) {
          const diff = MIN_COL_PCT - nextWidthPct;
          nextWidthPct = MIN_COL_PCT;
          currentWidthPct -= diff;
        }

        if (currentWidthPct < MIN_COL_PCT || nextWidthPct < MIN_COL_PCT) {
          return prev;
        }

        const updated = [...prev];
        updated[currentIndex] = { ...current, widthPct: Number(currentWidthPct.toFixed(2)) };
        updated[nextIndex] = { ...next, widthPct: Number(nextWidthPct.toFixed(2)) };

        return updated;
      });
    };

  const clientsQuery = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const usersQuery = useQuery<UserLite[]>({
    queryKey: ['users', { techSearch, supervisorSearch }],
    queryFn: async () => {
      const q = (techSearch || supervisorSearch || '').trim();
      const params = q ? { q } : {};
      const res = await api.get('/users', { params });
      return unwrap<UserLite[]>(res.data);
    },
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const allUsers = usersQuery.data || [];

  const technicianOptions: Option[] = useMemo(() => {
    return allUsers
      .filter(isTechnicianOrPSO)
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers]);

  const supervisorOptions: Option[] = useMemo(() => {
    return allUsers
      .filter(isSupervisor)
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers]);

  const projectsQuery = useQuery<InstallationProject[]>({
    queryKey: ['installation-projects', { status }],
    queryFn: async () => {
      const params: any = {};
      if (status !== 'TODOS') params.status = status;
      const res = await api.get('/installation-projects', { params });
      return unwrap<InstallationProject[]>(res.data);
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 20_000,
  });

  const createProject = useMutation({
    mutationFn: async (payload: CreateDTO) =>
      (await api.post('/installation-projects', payload)).data,
    onSuccess: async () => {
      message.success('Projeto criado!');
      setOpen(false);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao criar projeto');
    },
  });

  const rows = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const technicianText = r.technicianNames?.length
        ? r.technicianNames.join(' ')
        : r.techniciansList?.length
          ? r.techniciansList.map((t) => t.name).join(' ')
          : r.technician?.name || '';

      const haystack = [
        r.title,
        r.af,
        r.client?.name,
        technicianText,
        r.coordinator?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rows, search]);

  const total = filteredRows.length;

  const pagedRows = useMemo(() => {
    if (!isMobile) return filteredRows;
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, isMobile, page, pageSize]);

  const endPreview = useMemo(() => {
    const trucksTotal = Number(watchedTrucksTotal ?? 0);
    const perDay = Number(watchedEquipmentsPerDay ?? 0);
    const start = watchedStartPlannedAt as Dayjs | undefined;

    if (!open || !start || !trucksTotal || !perDay) return null;

    const daysNeeded = Math.ceil(trucksTotal / perDay);
    return `${daysNeeded} dia(s) úteis (previsão final calculada no backend)`;
  }, [open, watchedTrucksTotal, watchedEquipmentsPerDay, watchedStartPlannedAt]);

  const coordinatorPreviewText = 'Será definido automaticamente a partir do supervisor';

  const gridStyle = (desktopCols: string) => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : desktopCols,
    gap: 12,
    maxWidth: '100%',
  });

  const line = { fontSize: 12, margin: 0, overflowWrap: 'anywhere' as const };

  const desktopColumns: ColumnsType<InstallationProject> = [
    {
      title: 'Projeto',
      dataIndex: 'title',
      key: 'title',
      width: getColumnWidthPx('title', 16),
      ellipsis: true,
      render: (v, r) => <Link to={`/installation-projects/${r.id}`}>{v}</Link>,
    },
    {
      title: 'AF',
      dataIndex: 'af',
      key: 'af',
      width: getColumnWidthPx('af', 10),
      ellipsis: true,
      render: (v) => v || '-',
    },
    {
      title: 'Cliente',
      key: 'client',
      width: getColumnWidthPx('client', 18),
      ellipsis: true,
      render: (_, r) => r.client?.name || (r.clientId ? `#${r.clientId}` : '-'),
    },
    {
      title: 'Técnico / Prestador',
      key: 'technician',
      width: getColumnWidthPx('technician', 18),
      ellipsis: true,
      render: (_, r) => {
        if (r.technicianNames?.length) return r.technicianNames.join(', ');
        if (r.techniciansList?.length) return r.techniciansList.map((t) => t.name).join(', ');
        return r.technician?.name || (r.technicianId ? `#${r.technicianId}` : '-');
      },
    },
    {
      title: 'Coordenador',
      key: 'coordinator',
      width: getColumnWidthPx('coordinator', 14),
      ellipsis: true,
      render: (_, r) => r.coordinator?.name || (r.coordinatorId ? `#${r.coordinatorId}` : '-'),
    },
    {
      title: 'Início',
      key: 'start',
      width: getColumnWidthPx('start', 6),
      align: 'center',
      render: (_, r) => (r.startPlannedAt ? dayjs(r.startPlannedAt).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Fim',
      key: 'end',
      width: getColumnWidthPx('end', 6),
      align: 'center',
      render: (_, r) => (r.endPlannedAt ? dayjs(r.endPlannedAt).format('DD/MM/YYYY') : '-'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: getColumnWidthPx('status', 4),
      align: 'center',
      render: (s: Status) => statusTag(s),
    },
  ];

  const mergedColumns = desktopColumns.map((col) => ({
    ...col,
    onHeaderCell: () => ({
      width: typeof col.width === 'number' ? col.width : undefined,
      onResize: handleResize(String(col.key)),
    }),
  }));

  return (
    <div style={{ display: 'grid', gap: isMobile ? 12 : 16, maxWidth: '100%', overflowX: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexDirection: isMobile ? 'column' : 'row',
          maxWidth: '100%',
        }}
      >
        <Typography.Title level={2} style={{ margin: 0 }}>
          Projetos de Instalação
        </Typography.Title>

        <Space
          wrap
          style={{
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'flex-end' : 'initial',
          }}
        >
          <Button icon={<ReloadOutlined />} onClick={() => projectsQuery.refetch()} block={isMobile}>
            Atualizar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)} block={isMobile}>
            Novo Projeto
          </Button>
        </Space>
      </div>

      <Card
        title="Lista"
        style={{ maxWidth: '100%' }}
        extra={
          isMobile ? (
            <Select
              value={status}
              onChange={onChangeStatus}
              style={{ width: 160 }}
              options={[
                { label: 'Todos', value: 'TODOS' },
                { label: 'À iniciar', value: 'A_INICIAR' },
                { label: 'Iniciado', value: 'INICIADO' },
                { label: 'Finalizado', value: 'FINALIZADO' },
              ]}
            />
          ) : (
            <Segmented
              value={status}
              onChange={(v) => onChangeStatus(v)}
              options={[
                { label: 'Todos', value: 'TODOS' },
                { label: 'À iniciar', value: 'A_INICIAR' },
                { label: 'Iniciado', value: 'INICIADO' },
                { label: 'Finalizado', value: 'FINALIZADO' },
              ]}
            />
          )
        }
        styles={{ body: { padding: isMobile ? 12 : 24, maxWidth: '100%' } }}
      >
        <div style={{ marginBottom: 16 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Pesquisar por nome do projeto, AF, cliente ou técnico"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {isMobile ? (
          <div style={{ display: 'grid', gap: 12, maxWidth: '100%' }}>
            {projectsQuery.isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <Spin />
              </div>
            ) : total ? (
              <>
                {pagedRows.map((r) => {
                  const technicianLabel = r.technicianNames?.length
                    ? r.technicianNames.join(', ')
                    : r.techniciansList?.length
                      ? r.techniciansList.map((t) => t.name).join(', ')
                      : r.technician?.name || (r.technicianId ? `#${r.technicianId}` : '-');

                  return (
                    <Card
                      key={r.id}
                      size="small"
                      style={{ borderRadius: 12, maxWidth: '100%' }}
                      styles={{ body: { padding: 12 } }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, maxWidth: '100%' }}>
                        <div style={{ minWidth: 0 }}>
                          <Typography.Text strong style={{ fontSize: 14 }}>
                            <Link to={`/installation-projects/${r.id}`}>{r.title}</Link>
                          </Typography.Text>

                          <div style={{ marginTop: 6 }}>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              AF: {r.af || '-'}
                            </Typography.Text>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0 }}>{statusTag(r.status)}</div>
                      </div>

                      <div style={{ marginTop: 10, display: 'grid', gap: 6, maxWidth: '100%' }}>
                        <p style={line}>
                          <b>Cliente:</b> {r.client?.name || (r.clientId ? `#${r.clientId}` : '-')}
                        </p>
                        <p style={line}>
                          <b>Técnico:</b> {technicianLabel}
                        </p>
                        <p style={line}>
                          <b>Coordenador:</b> {r.coordinator?.name || (r.coordinatorId ? `#${r.coordinatorId}` : '-')}
                        </p>
                        <p style={line}>
                          <b>Caminhões:</b> {r.trucksDone}/{r.trucksTotal}
                        </p>
                        <p style={line}>
                          <b>Início:</b> {r.startPlannedAt ? dayjs(r.startPlannedAt).format('DD/MM/YYYY') : '-'}
                          {'  '}•{'  '}
                          <b>Fim:</b> {r.endPlannedAt ? dayjs(r.endPlannedAt).format('DD/MM/YYYY') : '-'}
                        </p>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <Button block type="primary" onClick={() => navigate(`/installation-projects/${r.id}`)}>
                          Abrir projeto
                        </Button>
                      </div>
                    </Card>
                  );
                })}

                {total > pageSize && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                    <Pagination
                      current={page}
                      pageSize={pageSize}
                      total={total}
                      size="small"
                      showSizeChanger
                      pageSizeOptions={['5', '10', '20']}
                      onChange={(p, ps) => {
                        setPage(p);
                        setPageSize(ps);
                      }}
                    />
                  </div>
                )}
              </>
            ) : (
              <Typography.Text type="secondary">Nenhum projeto encontrado.</Typography.Text>
            )}
          </div>
        ) : (
          <div ref={tableWrapRef} style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
            <Table
              rowKey="id"
              loading={projectsQuery.isLoading}
              dataSource={filteredRows}
              pagination={{ pageSize: 10 }}
              size="middle"
              tableLayout="fixed"
              components={{
                header: {
                  cell: ResizableTitle,
                },
              }}
              columns={mergedColumns as any}
            />
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        title="Novo Projeto"
        okText="Criar"
        confirmLoading={createProject.isPending}
        width={isMobile ? '96vw' : 820}
        style={isMobile ? { maxWidth: '96vw' } : {}}
        centered
        styles={{ body: { paddingTop: 12, maxWidth: '100%' } }}
        afterOpenChange={(o) => {
          if (o) {
            setTechSearch('');
            setSupervisorSearch('');
            form.setFieldsValue({
              trucksTotal: 1,
              equipmentsPerDay: 1,
              startPlannedAt: dayjs(),
              clientId: null,
              af: null,
              contactName: null,
              contactEmails: [],
              contactPhone: null,
              notes: null,
              technicianIds: [],
              supervisorId: null,
            });
          }
        }}
        onOk={async () => {
          try {
            const v = await form.validateFields();

            const technicianIds = Array.isArray(v.technicianIds)
              ? [...new Set(v.technicianIds.map((n: any) => Number(n)).filter(Boolean))]
              : [];

            const contactEmails = normalizeEmailList(v.contactEmails);

            const payload: CreateDTO = {
              title: v.title,
              af: v.af ?? null,
              clientId: v.clientId ?? null,
              technicianIds,
              technicianId: technicianIds[0] ?? null,
              supervisorId: Number(v.supervisorId),
              trucksTotal: Number(v.trucksTotal),
              equipmentsPerDay: Number(v.equipmentsPerDay),
              startPlannedAt: (v.startPlannedAt as Dayjs).format('YYYY-MM-DD'),
              contactName: v.contactName ?? null,
              contactEmails,
              contactEmail: contactEmails[0] ?? null,
              contactPhone: v.contactPhone ?? null,
              notes: v.notes ?? null,
            };

            createProject.mutate(payload);
          } catch {}
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ trucksTotal: 1, equipmentsPerDay: 1 }}>
          <div style={gridStyle('1fr 1fr')}>
            <Form.Item
              label="Técnico / Prestador (obrigatório)"
              name="technicianIds"
              rules={[
                { required: true, message: 'Selecione pelo menos um técnico/prestador' },
                {
                  validator: async (_, value) => {
                    if (!Array.isArray(value) || !value.length) {
                      throw new Error('Selecione pelo menos um técnico/prestador');
                    }
                  },
                },
              ]}
            >
              <Select
                mode="multiple"
                showSearch
                placeholder={usersQuery.isLoading ? 'Carregando...' : 'Selecione um ou mais'}
                filterOption={false}
                onSearch={(v) => setTechSearch(v)}
                onDropdownVisibleChange={(isOpen) => {
                  if (isOpen) setTechSearch('');
                }}
                loading={usersQuery.isLoading}
                options={technicianOptions.map((t) => ({ value: t.id, label: t.name }))}
                notFoundContent={usersQuery.isLoading ? <Spin size="small" /> : 'Nenhum técnico/prestador encontrado'}
              />
            </Form.Item>

            <Form.Item
              label="Supervisor (obrigatório)"
              name="supervisorId"
              rules={[{ required: true, message: 'Selecione um supervisor' }]}
            >
              <Select
                showSearch
                placeholder={usersQuery.isLoading ? 'Carregando...' : 'Selecione'}
                filterOption={false}
                onSearch={(v) => setSupervisorSearch(v)}
                onDropdownVisibleChange={(isOpen) => {
                  if (isOpen) setSupervisorSearch('');
                }}
                loading={usersQuery.isLoading}
                options={supervisorOptions.map((u) => ({ value: u.id, label: u.name }))}
                notFoundContent={usersQuery.isLoading ? <Spin size="small" /> : 'Nenhum supervisor encontrado'}
              />
            </Form.Item>

            <Form.Item
              label="Coordenador"
              tooltip="Definido automaticamente pelo supervisor"
              style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}
            >
              <Input value={coordinatorPreviewText} disabled />
            </Form.Item>
          </div>

          <div style={gridStyle('2fr 1fr')}>
            <Form.Item
              label="Nome do Projeto"
              name="title"
              rules={[{ required: true, message: 'Informe o nome do projeto' }]}
            >
              <Input placeholder="Ex: Instalação cliente X" />
            </Form.Item>

            <Form.Item label="AF" name="af" rules={[{ max: 50, message: 'Máximo 50 caracteres' }]}>
              <Input placeholder="Ex: AF-2026-000123" />
            </Form.Item>
          </div>

          <Form.Item label="Cliente" name="clientId">
            <Select
              showSearch
              allowClear
              placeholder={clientsQuery.isLoading ? 'Carregando...' : 'Selecione'}
              optionFilterProp="label"
              filterOption={(input, option) =>
                String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
              }
              options={(clientsQuery.data || []).map((c) => ({ value: c.id, label: c.name }))}
            />
          </Form.Item>

          <div style={gridStyle('1fr 1fr 1fr')}>
            <Form.Item
              label="Qtd. Veículos (total)"
              name="trucksTotal"
              rules={[{ required: true, message: 'Informe a quantidade total de veículos' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="Previsão de instalação por dia"
              name="equipmentsPerDay"
              rules={[{ required: true, message: 'Informe a previsão por dia' }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="Data prevista de início"
              name="startPlannedAt"
              rules={[{ required: true, message: 'Selecione a data de início' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" inputReadOnly />
            </Form.Item>
          </div>

          {endPreview && (
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Previsão de duração: {endPreview}
            </Typography.Text>
          )}

          <Form.Item label="Contato (opcional)" name="contactName">
            <Input placeholder="Nome do contato" />
          </Form.Item>

          <div style={gridStyle('1.4fr 1fr')}>
            <Form.Item
              label="E-mails (obrigatório)"
              name="contactEmails"
              rules={[
                { required: true, message: 'Informe pelo menos um e-mail' },
                {
                  validator: async (_, value) => {
                    const emails = normalizeEmailList(value);
                    if (!emails.length) {
                      throw new Error('Informe pelo menos um e-mail');
                    }
                    const invalid = emails.find((email) => !isValidEmail(email));
                    if (invalid) {
                      throw new Error(`E-mail inválido: ${invalid}`);
                    }
                  },
                },
              ]}
            >
              <Select
                mode="tags"
                tokenSeparators={[',', ';', ' ']}
                placeholder="Digite um ou mais e-mails"
              />
            </Form.Item>

            <Form.Item label="Telefone (opcional)" name="contactPhone">
              <Input placeholder="(11) 99999-9999" />
            </Form.Item>
          </div>

          <Form.Item label="Observações (opcional)" name="notes">
            <Input.TextArea rows={3} placeholder="Anotações iniciais..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}