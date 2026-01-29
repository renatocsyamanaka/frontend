import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../../lib/api';

type Client = { id: number; name: string };
type Status = 'A_INICIAR' | 'INICIADO' | 'FINALIZADO';

type UserLite = { id: number; name: string; managerId?: number | null };
type TechnicianOption = { id: number; name: string };

// ✅ se seu backend devolver { data: ... }
function unwrap<T>(resData: any): T {
  return resData && typeof resData === 'object' && 'data' in resData ? (resData.data as T) : (resData as T);
}

type InstallationProject = {
  id: number;
  title: string;
  af?: string | null;
  status: Status;

  clientId: number | null;
  client?: { id: number; name: string } | null;

  // ✅ técnico / prestador
  technicianId?: number | null;
  technician?: { id: number; name: string } | null;

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
};

type CreateDTO = {
  title: string;
  clientId: number | null;

  technicianId: number; // ✅ obrigatório
  supervisorId: number; // ✅ obrigatório

  startPlannedAt: string;
  equipmentsPerDay: number;
  trucksTotal: number;

  af?: string | null;

  contactName?: string | null;
  contactEmail: string;
  contactPhone?: string | null;

  notes?: string | null;
};

function statusTag(s: Status) {
  if (s === 'A_INICIAR') return <Tag>À iniciar</Tag>;
  if (s === 'INICIADO') return <Tag color="blue">Iniciado</Tag>;
  return <Tag color="green">Finalizado</Tag>;
}

export default function InstallationProjectsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | 'TODOS'>('TODOS');
  const [form] = Form.useForm();

  // ✅ busca de técnicos no create modal
  const [techSearch, setTechSearch] = useState('');

  const clientsQuery = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // ✅ Técnicos (com busca)
  const techsQuery = useQuery<TechnicianOption[]>({
    queryKey: ['users', 'technicians', techSearch],
    queryFn: async () => {
      const res = await api.get('/users/technicians', { params: { q: techSearch } });
      return unwrap<TechnicianOption[]>(res.data);
    },
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const techs = techsQuery.data || [];

  // ✅ Supervisores (roleLevel=3)
  const supervisorsQuery = useQuery<UserLite[]>({
    queryKey: ['supervisors'],
    queryFn: async () => (await api.get('/users', { params: { roleLevel: 3 } })).data,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const projectsQuery = useQuery<InstallationProject[]>({
    queryKey: ['installation-projects', { status }],
    queryFn: async () => {
      const params: any = {};
      if (status !== 'TODOS') params.status = status;
      return (await api.get('/installation-projects', { params })).data;
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 20_000,
  });

  const createProject = useMutation({
    mutationFn: async (payload: CreateDTO) => (await api.post('/installation-projects', payload)).data,
    onSuccess: async () => {
      message.success('Projeto criado!');
      setOpen(false);
      form.resetFields();
      // ✅ invalida o mesmo queryKey usado na lista
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.error || 'Falha ao criar projeto');
    },
  });

  const rows = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);

  const endPreview = (() => {
    const trucksTotal = Number(form.getFieldValue('trucksTotal') ?? 0);
    const perDay = Number(form.getFieldValue('equipmentsPerDay') ?? 0);
    const start: Dayjs | undefined = form.getFieldValue('startPlannedAt');
    if (!start || !trucksTotal || !perDay) return null;

    const daysNeeded = Math.ceil(trucksTotal / perDay);
    return `${daysNeeded} dia(s) úteis (previsão final calculada no backend)`;
  })();

  const coordinatorPreviewText = 'Será definido automaticamente a partir do supervisor';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Projetos de Instalação
        </Typography.Title>

        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => projectsQuery.refetch()}>
            Atualizar
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Novo Projeto
          </Button>
        </Space>
      </div>

      <Card
        title="Lista"
        extra={
          <Segmented
            value={status}
            onChange={(v) => setStatus(v as any)}
            options={[
              { label: 'Todos', value: 'TODOS' },
              { label: 'À iniciar', value: 'A_INICIAR' },
              { label: 'Iniciado', value: 'INICIADO' },
              { label: 'Finalizado', value: 'FINALIZADO' },
            ]}
          />
        }
      >
        <Table
          rowKey="id"
          loading={projectsQuery.isLoading}
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: 'Projeto',
              dataIndex: 'title',
              render: (v, r) => <Link to={`/installation-projects/${r.id}`}>{v}</Link>,
            },
            { title: 'AF', dataIndex: 'af', render: (v) => v || '-' },
            { title: 'Cliente', render: (_, r) => r.client?.name || (r.clientId ? `#${r.clientId}` : '-') },

            // ✅ técnico/supervisor/coordenador na lista
            { title: 'Técnico', render: (_, r) => r.technician?.name || (r.technicianId ? `#${r.technicianId}` : '-') },
            { title: 'Supervisor', render: (_, r) => r.supervisor?.name || (r.supervisorId ? `#${r.supervisorId}` : '-') },
            { title: 'Coordenador', render: (_, r) => r.coordinator?.name || (r.coordinatorId ? `#${r.coordinatorId}` : '-') },

            { title: 'Caminhões', render: (_, r) => `${r.trucksDone}/${r.trucksTotal}` },
            {
              title: 'Início (prev.)',
              render: (_, r) => (r.startPlannedAt ? dayjs(r.startPlannedAt).format('DD/MM/YYYY') : '-'),
            },
            {
              title: 'Fim (prev.)',
              render: (_, r) => (r.endPlannedAt ? dayjs(r.endPlannedAt).format('DD/MM/YYYY') : '-'),
            },
            { title: 'Status', dataIndex: 'status', render: (s: Status) => statusTag(s) },
          ]}
        />
      </Card>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        title="Novo Projeto"
        okText="Criar"
        confirmLoading={createProject.isPending}
        width={820}
        centered
        bodyStyle={{ paddingTop: 12 }}
        afterOpenChange={(o) => {
          if (o) {
            setTechSearch('');
            form.setFieldsValue({
              trucksTotal: 1,
              equipmentsPerDay: 1,
              startPlannedAt: dayjs(),
              clientId: null,
              af: null,
              contactName: null,
              contactEmail: null,
              contactPhone: null,
              notes: null,
              technicianId: null,
              supervisorId: null,
            });
          }
        }}
        onOk={async () => {
          try {
            const v = await form.validateFields();

            const payload: CreateDTO = {
              title: v.title,
              af: v.af ?? null,
              clientId: v.clientId ?? null,

              technicianId: Number(v.technicianId), // ✅ obrigatório
              supervisorId: Number(v.supervisorId), // ✅ obrigatório

              trucksTotal: Number(v.trucksTotal),
              equipmentsPerDay: Number(v.equipmentsPerDay),
              startPlannedAt: (v.startPlannedAt as Dayjs).format('YYYY-MM-DD'),

              contactName: v.contactName ?? null,
              contactEmail: v.contactEmail,
              contactPhone: v.contactPhone ?? null,
              notes: v.notes ?? null,
            };

            // ✅ NÃO enviar coordinatorId
            createProject.mutate(payload);
          } catch {}
        }}
      >
        <Form form={form} layout="vertical" initialValues={{ trucksTotal: 1, equipmentsPerDay: 1 }}>
          {/* Técnico + Supervisor + Coordenador (auto) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              label="Técnico / Prestador (obrigatório)"
              name="technicianId"
              rules={[{ required: true, message: 'Selecione um técnico' }]}
            >
              <Select
                showSearch
                placeholder={techsQuery.isLoading ? 'Carregando...' : 'Selecione'}
                filterOption={false}
                onSearch={(v) => setTechSearch(v)}
                loading={techsQuery.isLoading}
                options={techs.map((t) => ({ value: t.id, label: t.name }))}
                notFoundContent={techsQuery.isLoading ? <Spin size="small" /> : 'Nenhum técnico encontrado'}
              />
            </Form.Item>

            <Form.Item
              label="Supervisor (obrigatório)"
              name="supervisorId"
              rules={[{ required: true, message: 'Selecione um supervisor' }]}
            >
              <Select
                showSearch
                placeholder={supervisorsQuery.isLoading ? 'Carregando...' : 'Selecione'}
                optionFilterProp="label"
                filterOption={(input, option) =>
                  String(option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
                }
                options={(supervisorsQuery.data || []).map((u) => ({ value: u.id, label: u.name }))}
              />
            </Form.Item>

            <Form.Item label="Coordenador" tooltip="Definido automaticamente pelo supervisor" style={{ gridColumn: '1 / -1' }}>
              <Input value={coordinatorPreviewText} disabled />
            </Form.Item>
          </div>

          {/* Nome + AF */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            <Form.Item
              label="E-mail (obrigatório)"
              name="contactEmail"
              rules={[
                { required: true, message: 'Informe o e-mail do cliente' },
                { type: 'email', message: 'E-mail inválido' },
              ]}
            >
              <Input placeholder="email@cliente.com" />
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
