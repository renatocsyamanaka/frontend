import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Space,
  Tag,
  Typography,
  message,
  Select,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  WhatsAppOutlined,
  MailOutlined,
  PlayCircleOutlined,
  StopOutlined,
  PlusOutlined,
  SendOutlined,
  UnorderedListOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { api } from '../../lib/api';

type Status = 'A_INICIAR' | 'INICIADO' | 'FINALIZADO';

type Client = { id: number; name: string };

type RoleLite = { id: number; name: string; level: number };

type UserLite = {
  id: number;
  name: string;

  role?: RoleLite;
  roleId?: number;
  roleLevel?: number;
};

type UserOption = { id: number; name: string };

type ClientRow = {
  id: number;
  name: string;
  cidade?: string | null;
  estado?: string | null;
  documento?: string | null;
  telefone1?: string | null;
};

type ProjectItem = {
  id: number;
  equipmentName: string;
  equipmentCode?: string | null;
  qty: number;
  createdAt?: string;
};

type ProgressVehicle = {
  id?: number;
  plate: string;
  serial: string;
};

type ProjectProgress = {
  id: number;
  date: string; // ISO
  trucksDoneToday: number; // backend calcula = vehicles.length
  notes?: string | null;
  author?: UserLite;
  createdAt?: string;
  vehicles?: ProgressVehicle[]; // placas/séries
};

type ClientFull = {
  id: number;
  idCliente: string;
  name: string;
  nomeFantasia: string;
  documento: string;
  tipoCliente: string;
  segmentacao: string;
  estado: string;
  cidade: string;
  bairro: string;
  logradouro: string;
  complemento: string;
  cep: string;
  latitude: string;
  longitude: string;
  email1: string;
  telefone1: string;
  email2: string;
  telefone2: string;
};

type InstallationProject = {
  id: number;
  title: string;
  status: Status;

  af?: string | null;

  clientId: number | null;
  client?: Client | null;

  supervisorId?: number | null;
  coordinatorId?: number | null;
  supervisor?: UserLite | null;
  coordinator?: UserLite | null;

  technicianId?: number | null;
  technician?: UserLite | null;

  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;

  notes?: string | null;

  startPlannedAt?: string | null;
  startAt?: string | null;
  endAt?: string | null;

  endPlannedAt?: string | null;

  trucksTotal: number;
  trucksDone: number;

  equipmentsTotal: number;
  equipmentsPerDay?: number | null;
  daysEstimated?: number | null;

  whatsappGroupName?: string | null;
  whatsappGroupLink?: string | null;

  items?: ProjectItem[];
  progress?: ProjectProgress[];
};

// ✅ se seu backend devolver "data", isso ajuda
function unwrap<T>(resData: any): T {
  return resData && typeof resData === 'object' && 'data' in resData ? (resData.data as T) : (resData as T);
}

function statusTag(s: Status) {
  if (s === 'A_INICIAR') return <Tag>À iniciar</Tag>;
  if (s === 'INICIADO') return <Tag color="blue">Iniciado</Tag>;
  return <Tag color="green">Finalizado</Tag>;
}

// ✅ roles conforme seu print do banco
const ROLE_ID_TECNICO = 1;
const ROLE_ID_SUPERVISOR = 3;
const ROLE_ID_PSO = 8;

function getRoleId(u?: UserLite | null) {
  return u?.role?.id ?? u?.roleId;
}
function getRoleName(u?: UserLite | null) {
  return u?.role?.name;
}
function getRoleLevel(u?: UserLite | null) {
  return u?.role?.level ?? u?.roleLevel;
}

function isSupervisor(u: UserLite) {
  const id = getRoleId(u);
  const name = getRoleName(u);
  const level = getRoleLevel(u);
  return id === ROLE_ID_SUPERVISOR || name === 'Supervisor' || level === 3;
}

function isTechnicianOrPSO(u: UserLite) {
  const id = getRoleId(u);
  const name = getRoleName(u);
  // ✅ estrito
  return id === ROLE_ID_TECNICO || id === ROLE_ID_PSO || name === 'Tecnico' || name === 'PSO';
}

// ✅ helpers para LINK DE GRUPO (não é número)
function safeUrl(value?: string | null) {
  const v = String(value || '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.toString();
  } catch {
    return null;
  }
}

function isWhatsAppGroupLink(value?: string | null) {
  const url = safeUrl(value);
  if (!url) return false;
  return url.includes('chat.whatsapp.com/');
}

export default function InstallationProjectDetailPage() {
  const { id } = useParams();
  const projectId = Number(id);
  const nav = useNavigate();
  const qc = useQueryClient();

  const [clientViewOpen, setClientViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressListOpen, setProgressListOpen] = useState(false);

  // ✅ buscas independentes pros selects do EDIT
  const [techSearch, setTechSearch] = useState('');
  const [supervisorSearch, setSupervisorSearch] = useState('');

  const [editForm] = Form.useForm();
  const [waForm] = Form.useForm();
  const [itemForm] = Form.useForm();
  const [progressForm] = Form.useForm();

  const watchedVehicles = Form.useWatch('vehicles', progressForm) as any[] | undefined;

  // ✅ BUSCA USERS (um único endpoint)
  const usersQuery = useQuery<UserLite[]>({
    queryKey: ['users', { techSearch, supervisorSearch }],
    queryFn: async () => {
      const q = (techSearch || supervisorSearch || '').trim();
      const params = q ? { q } : {}; // ✅ não manda q vazio
      const res = await api.get('/users', { params });
      return unwrap<UserLite[]>(res.data);
    },
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const allUsers = usersQuery.data || [];

  const technicianOptions = useMemo(() => {
    return allUsers
      .filter(isTechnicianOrPSO)
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers]);

  const supervisorOptions = useMemo(() => {
    return allUsers
      .filter(isSupervisor)
      .map((u) => ({ id: u.id, name: u.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers]);

  const projectQuery = useQuery<InstallationProject>({
    queryKey: ['installation-project', projectId],
    enabled: Number.isFinite(projectId) && projectId > 0,
    queryFn: async () => {
      const res = await api.get(`/installation-projects/${projectId}`);
      return unwrap<InstallationProject>(res.data);
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });

  const p = projectQuery.data;
  const currentClientId = projectQuery.data?.clientId ?? null;

  const clientsQuery = useQuery<ClientRow[]>({
    queryKey: ['clients'],
    queryFn: async () => (await api.get('/clients')).data,
    staleTime: 60_000,
    retry: false,
  });

  // ✅ lista de coordenadores (level >= 4) - fica como está
  const coordinatorsQuery = useQuery<UserOption[]>({
    queryKey: ['users', 'coordinators'],
    queryFn: async () => (await api.get('/users', { params: { minLevel: 4 } })).data,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // ✅ detalhe do cliente (abre modal)
  const clientDetailQuery = useQuery<ClientFull>({
    queryKey: ['client-detail', currentClientId],
    enabled: !!currentClientId && clientViewOpen,
    queryFn: async () => {
      const res = await api.get(`/clients/${currentClientId}`);
      return unwrap<ClientFull>(res.data);
    },
    retry: false,
  });

  // ✅ helper pra achar nome por ID (fallback)
  const technicianNameById = (id?: number | null) => {
    if (!id) return null;
    const u = technicianOptions.find((x) => x.id === id);
    return u?.name || `#${id}`;
  };

  const supervisorNameById = (id?: number | null) => {
    if (!id) return null;
    const u = supervisorOptions.find((x) => x.id === id);
    return u?.name || `#${id}`;
  };

  const coordinatorNameById = (id?: number | null) => {
    if (!id) return null;
    const u = (coordinatorsQuery.data || []).find((x) => x.id === id);
    return u?.name || `#${id}`;
  };

  // ✅ buscar coordenador do supervisor (backend)
  const coordinatorFromSupervisor = useMutation({
    mutationFn: async (supervisorId: number) => {
      const res = await api.get(`/users/${supervisorId}/coordinator`);
      return unwrap<{ coordinatorId: number | null; coordinatorName?: string | null }>(res.data);
    },
  });

  const sendStartEmail = useMutation({
    mutationFn: async () => (await api.post(`/installation-projects/${projectId}/emails/start`)).data,
    onSuccess: () => message.success('E-mail de início enviado!'),
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao enviar e-mail de início'),
  });

  const sendDailyEmail = useMutation({
    mutationFn: async (payload?: { date?: string }) =>
      (await api.post(`/installation-projects/${projectId}/emails/daily`, payload || {})).data,
    onSuccess: () => message.success('Reporte diário enviado!'),
    onError: (e: any) => {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.response?.data?.detail ||
        e?.message ||
        'Falha ao enviar reporte diário';
      message.error(msg);
    },
  });

  const handleSendDaily = () => {
    sendDailyEmail.mutate({ date: dayjs().format('YYYY-MM-DD') });
  };

  const sendFinalEmail = useMutation({
    mutationFn: async () => (await api.post(`/installation-projects/${projectId}/emails/final`)).data,
    onSuccess: () => message.success('E-mail final (compilado) enviado!'),
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao enviar e-mail final'),
  });

  const updateProject = useMutation({
    mutationFn: async (payload: Partial<InstallationProject>) => {
      const res = await api.patch(`/installation-projects/${projectId}`, payload);
      return unwrap<InstallationProject>(res.data);
    },
    onSuccess: async () => {
      message.success('Projeto atualizado!');
      setEditOpen(false);
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao atualizar'),
  });

  const updateWhatsApp = useMutation({
    mutationFn: async (payload: { whatsappGroupName?: string | null; whatsappGroupLink?: string | null }) => {
      const res = await api.patch(`/installation-projects/${projectId}/whatsapp`, payload);
      return unwrap<InstallationProject>(res.data);
    },
    onSuccess: async () => {
      message.success('WhatsApp atualizado!');
      setWaOpen(false);
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao atualizar WhatsApp'),
  });

  const startProject = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/installation-projects/${projectId}/start`);
      return unwrap<InstallationProject>(res.data);
    },
    onSuccess: async () => {
      message.success('Projeto iniciado!');
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao iniciar'),
  });

  const finishProject = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/installation-projects/${projectId}/finish`);
      return unwrap<InstallationProject>(res.data);
    },
    onSuccess: async () => {
      message.success('Projeto finalizado!');
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
      await qc.invalidateQueries({ queryKey: ['installation-projects'] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao finalizar'),
  });

  const addItem = useMutation({
    mutationFn: async (payload: { equipmentName: string; equipmentCode?: string | null; qty: number }) => {
      const res = await api.post(`/installation-projects/${projectId}/items`, payload);
      return unwrap<ProjectItem>(res.data);
    },
    onSuccess: async () => {
      message.success('Item adicionado!');
      setItemOpen(false);
      itemForm.resetFields();
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao adicionar item'),
  });

  function normalizePlate(raw: string) {
    const v = String(raw || '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (v.length >= 7 && /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(v.slice(0, 7))) {
      return `${v.slice(0, 3)}-${v.slice(3, 7)}`;
    }
    if (v.length >= 7 && /^[A-Z]{3}[0-9]{4}$/.test(v.slice(0, 7))) {
      return `${v.slice(0, 3)}-${v.slice(3, 7)}`;
    }
    if (v.length > 3) return `${v.slice(0, 3)}-${v.slice(3, 7)}`;
    return v.slice(0, 3);
  }

  function isValidPlate(value?: string) {
    const v = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return /^[A-Z]{3}[0-9]{4}$/.test(v) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(v);
  }

  const addProgress = useMutation({
    mutationFn: async (payload: { date: string; notes?: string | null; vehicles: { plate: string; serial: string }[] }) => {
      const res = await api.post(`/installation-projects/${projectId}/progress`, payload);
      return unwrap<ProjectProgress>(res.data);
    },
    onSuccess: async () => {
      message.success('Progresso lançado!');
      setProgressOpen(false);
      progressForm.resetFields();
      await qc.invalidateQueries({ queryKey: ['installation-project', projectId] });
    },
    onError: (e: any) => message.error(e?.response?.data?.error || 'Falha ao lançar progresso'),
  });

  const itemsSorted = useMemo(() => {
    const src = p?.items || [];
    return [...src].sort((a, b) => (b.id || 0) - (a.id || 0));
  }, [p?.items]);

  const progressSorted = useMemo(() => {
    const src = p?.progress || [];
    return [...src].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
  }, [p?.progress]);

  if (projectQuery.isLoading) {
    return <Typography.Text>Carregando projeto...</Typography.Text>;
  }

  if (projectQuery.isError || !p) {
    return (
      <Card>
        <Typography.Text type="danger">Falha ao carregar projeto.</Typography.Text>
        <Divider />
        <Button onClick={() => nav('/installation-projects')}>Voltar</Button>
      </Card>
    );
  }

  const supervisorLabel = p.supervisor?.name || supervisorNameById(p.supervisorId) || '-';
  const coordinatorLabel = p.coordinator?.name || coordinatorNameById(p.coordinatorId) || '-';
  const technicianLabel = p.technician?.name || technicianNameById(p.technicianId) || '-';

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Space wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => nav('/installation-projects')}>
          Voltar para projetos
        </Button>

        <Button icon={<EditOutlined />} onClick={() => setEditOpen(true)}>
          Editar
        </Button>

        <Button
          icon={<WhatsAppOutlined />}
          onClick={() => setWaOpen(true)}
          style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1ebe5d';
            e.currentTarget.style.borderColor = '#1ebe5d';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#25D366';
            e.currentTarget.style.borderColor = '#25D366';
          }}
        >
          WhatsApp
        </Button>

        <Button
          icon={<MailOutlined />}
          onClick={() => sendStartEmail.mutate()}
          loading={sendStartEmail.isPending}
          disabled={!p.contactEmail}
        >
          Enviar e-mail de início
        </Button>

        <Button icon={<SendOutlined />} loading={sendDailyEmail.isPending} onClick={handleSendDaily}>
          Enviar reporte diário (hoje)
        </Button>

        <Button
          icon={<MailOutlined />}
          onClick={() => sendFinalEmail.mutate()}
          loading={sendFinalEmail.isPending}
          disabled={!p.contactEmail}
          danger
        >
          Enviar compilado final
        </Button>

        <Button
          icon={<PlayCircleOutlined />}
          type="primary"
          disabled={p.status !== 'A_INICIAR'}
          loading={startProject.isPending}
          onClick={() => startProject.mutate()}
        >
          Iniciar
        </Button>

        <Button
          icon={<StopOutlined />}
          danger
          disabled={p.status !== 'INICIADO'}
          loading={finishProject.isPending}
          onClick={() => finishProject.mutate()}
        >
          Finalizar
        </Button>
      </Space>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, alignItems: 'start' }}>
        <div style={{ gridColumn: 1, minWidth: 0 }}>
          <Card title={<Space><UnorderedListOutlined /> Resumo</Space>}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Técnico / Prestador">{technicianLabel}</Descriptions.Item>
              <Descriptions.Item label="Supervisor">{supervisorLabel}</Descriptions.Item>
              <Descriptions.Item label="Coordenador">{coordinatorLabel}</Descriptions.Item>

              <Descriptions.Item label="AF">{p.af || '-'}</Descriptions.Item>

              <Descriptions.Item label="Cliente">
                <Space wrap>
                  <span>{p.client?.name || (p.clientId ? `#${p.clientId}` : '-')}</span>
                  <Button size="small" onClick={() => setClientViewOpen(true)} disabled={!p.clientId}>
                    Abrir cliente
                  </Button>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Prev. início">
                {p.startPlannedAt ? dayjs(p.startPlannedAt).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Prev. fim">
                {p.endPlannedAt ? dayjs(p.endPlannedAt).format('DD/MM/YYYY') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Início">
                {p.startAt ? dayjs(p.startAt).format('DD/MM/YYYY HH:mm') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Fim">
                {p.endAt ? dayjs(p.endAt).format('DD/MM/YYYY HH:mm') : '-'}
              </Descriptions.Item>

              <Descriptions.Item label="Caminhões (feito / total)">{`${p.trucksDone}/${p.trucksTotal}`}</Descriptions.Item>
              <Descriptions.Item label="Equipamentos (total)">{p.equipmentsTotal ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Equip./dia">{p.equipmentsPerDay ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Dias estimados">{p.daysEstimated ?? '-'}</Descriptions.Item>

              <Descriptions.Item label="Contato">{p.contactName || '-'}</Descriptions.Item>
              <Descriptions.Item label="E-mail">{p.contactEmail || '-'}</Descriptions.Item>
              <Descriptions.Item label="Telefone">{p.contactPhone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Observações">{p.notes || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </div>

        <div style={{ gridColumn: 2, display: 'grid', gap: 16, minWidth: 0 }}>
          <Card
            title="Itens / Equipamentos"
            extra={
              <Button icon={<PlusOutlined />} type="primary" onClick={() => setItemOpen(true)}>
                Adicionar item
              </Button>
            }
          >
            <List
              dataSource={itemsSorted}
              locale={{ emptyText: 'Nenhum item cadastrado.' }}
              renderItem={(it) => (
                <List.Item>
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <Typography.Text strong>{it.equipmentName}</Typography.Text>
                      {it.equipmentCode ? (
                        <>
                          <Divider type="vertical" />
                          <Typography.Text type="secondary">{it.equipmentCode}</Typography.Text>
                        </>
                      ) : null}
                    </div>
                    <Tag>{`Qtd: ${it.qty}`}</Tag>
                  </div>
                </List.Item>
              )}
            />
          </Card>

          <Card
            title={<Space><CalendarOutlined />Diário</Space>}
            extra={
              <Space>
                <Button icon={<UnorderedListOutlined />} onClick={() => setProgressListOpen(true)}>
                  Ver mais
                </Button>
                <Button icon={<PlusOutlined />} type="primary" onClick={() => setProgressOpen(true)}>
                  Lançar progresso
                </Button>
              </Space>
            }
          >
            <List
              dataSource={progressSorted}
              locale={{ emptyText: 'Nenhum progresso lançado.' }}
              renderItem={(pr) => (
                <List.Item>
                  <div style={{ width: '100%', display: 'grid', gap: 6 }}>
                    <Space wrap>
                      <Tag>{dayjs(pr.date).format('DD/MM/YYYY')}</Tag>
                      <Typography.Text strong>{`Caminhões no dia: ${pr.trucksDoneToday}`}</Typography.Text>
                      {pr.author?.name ? <Typography.Text type="secondary">por {pr.author.name}</Typography.Text> : null}
                    </Space>

                    {pr.vehicles?.length ? (
                      <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
                        {pr.vehicles.map((v, idx) => (
                          <div key={v.id ?? idx}>
                            <b>PLACA:</b> {v.plate} <span style={{ marginLeft: 10 }} />
                            <b>SÉRIE:</b> {v.serial}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {pr.notes ? <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>{pr.notes}</Typography.Text> : null}
                  </div>
                </List.Item>
              )}
            />
          </Card>
        </div>
      </div>

      {/* ===== MODAL: CLIENTE ===== */}
      <Modal
        title="Cliente - Visualizar"
        open={clientViewOpen}
        onCancel={() => setClientViewOpen(false)}
        footer={[
          <Button key="close" onClick={() => setClientViewOpen(false)}>
            Fechar
          </Button>,
        ]}
        width={900}
      >
        {!currentClientId ? (
          <Typography.Text type="secondary">Este projeto não tem cliente vinculado.</Typography.Text>
        ) : clientDetailQuery.isLoading ? (
          <div style={{ padding: 20, display: 'flex', justifyContent: 'center' }}>
            <Spin />
          </div>
        ) : clientDetailQuery.isError ? (
          <Typography.Text type="danger">Falha ao carregar o cliente.</Typography.Text>
        ) : (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="ID_cliente">{clientDetailQuery.data?.idCliente}</Descriptions.Item>
            <Descriptions.Item label="tipo_cliente">{clientDetailQuery.data?.tipoCliente}</Descriptions.Item>

            <Descriptions.Item label="cliente">{clientDetailQuery.data?.name}</Descriptions.Item>
            <Descriptions.Item label="nome_fantasia">{clientDetailQuery.data?.nomeFantasia}</Descriptions.Item>

            <Descriptions.Item label="cpf/cnpj">{clientDetailQuery.data?.documento}</Descriptions.Item>
            <Descriptions.Item label="segmentacao">{clientDetailQuery.data?.segmentacao}</Descriptions.Item>

            <Descriptions.Item label="estado">{clientDetailQuery.data?.estado}</Descriptions.Item>
            <Descriptions.Item label="cidade">{clientDetailQuery.data?.cidade}</Descriptions.Item>

            <Descriptions.Item label="bairro">{clientDetailQuery.data?.bairro}</Descriptions.Item>
            <Descriptions.Item label="cep">{clientDetailQuery.data?.cep}</Descriptions.Item>

            <Descriptions.Item label="logradouro" span={2}>
              {clientDetailQuery.data?.logradouro}
            </Descriptions.Item>

            <Descriptions.Item label="complemento" span={2}>
              {clientDetailQuery.data?.complemento}
            </Descriptions.Item>

            <Descriptions.Item label="latitude">{clientDetailQuery.data?.latitude}</Descriptions.Item>
            <Descriptions.Item label="longitude">{clientDetailQuery.data?.longitude}</Descriptions.Item>

            <Descriptions.Item label="email1">{clientDetailQuery.data?.email1}</Descriptions.Item>
            <Descriptions.Item label="telefone1">{clientDetailQuery.data?.telefone1}</Descriptions.Item>

            <Descriptions.Item label="email2">{clientDetailQuery.data?.email2}</Descriptions.Item>
            <Descriptions.Item label="telefone2">{clientDetailQuery.data?.telefone2}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* ===== MODAL: VER MAIS PROGRESSO ===== */}
      <Modal
        open={progressListOpen}
        title={
          <Space>
            <CalendarOutlined />
            Progresso diário (todos)
          </Space>
        }
        onCancel={() => setProgressListOpen(false)}
        footer={[
          <Button key="close" onClick={() => setProgressListOpen(false)}>
            Fechar
          </Button>,
        ]}
        width={900}
      >
        <List
          dataSource={progressSorted}
          locale={{ emptyText: 'Nenhum progresso lançado.' }}
          renderItem={(pr) => (
            <List.Item>
              <div style={{ width: '100%', display: 'grid', gap: 6 }}>
                <Space wrap>
                  <Tag>{dayjs(pr.date).format('DD/MM/YYYY')}</Tag>
                  <Typography.Text strong>{`Caminhões no dia: ${pr.trucksDoneToday}`}</Typography.Text>
                  {pr.author?.name ? <Typography.Text type="secondary">por {pr.author.name}</Typography.Text> : null}
                </Space>

                {pr.vehicles?.length ? (
                  <div style={{ marginTop: 4, display: 'grid', gap: 2 }}>
                    {pr.vehicles.map((v, idx) => (
                      <div key={v.id ?? idx}>
                        <b>PLACA:</b> {v.plate} <span style={{ marginLeft: 10 }} />
                        <b>SÉRIE:</b> {v.serial}
                      </div>
                    ))}
                  </div>
                ) : null}

                {pr.notes ? <Typography.Text style={{ whiteSpace: 'pre-wrap' }}>{pr.notes}</Typography.Text> : null}
              </div>
            </List.Item>
          )}
        />
      </Modal>

      {/* ===== MODAL EDITAR ===== */}
      <Modal
        open={editOpen}
        title="Editar Projeto"
        okText="Salvar"
        confirmLoading={updateProject.isPending}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          try {
            const v = await editForm.validateFields();

            updateProject.mutate({
              title: v.title,
              af: v.af ?? null,
              clientId: v.clientId ?? null,
              technicianId: v.technicianId ? Number(v.technicianId) : null,
              supervisorId: v.supervisorId ? Number(v.supervisorId) : null,
              trucksTotal: v.trucksTotal ?? 0,
              equipmentsPerDay: v.equipmentsPerDay ?? null,
              startPlannedAt: v.startPlannedAt ? (v.startPlannedAt as Dayjs).format('YYYY-MM-DD') : null,
              contactName: v.contactName ?? null,
              contactEmail: v.contactEmail ?? null,
              contactPhone: v.contactPhone ?? null,
              notes: v.notes ?? null,
              // ❌ NÃO enviar coordinatorId (auto)
            });
          } catch {}
        }}
        afterOpenChange={(o) => {
          if (o) {
            setTechSearch('');
            setSupervisorSearch('');

            editForm.setFieldsValue({
              title: p.title,
              af: p.af ?? null,
              clientId: p.clientId ?? null,

              technicianId: p.technicianId ?? null,
              supervisorId: p.supervisorId ?? null,
              coordinatorId: p.coordinatorId ?? null,

              trucksTotal: p.trucksTotal ?? 0,
              equipmentsPerDay: p.equipmentsPerDay ?? null,
              startPlannedAt: p.startPlannedAt ? dayjs(p.startPlannedAt) : null,
              contactName: p.contactName ?? null,
              contactEmail: p.contactEmail ?? null,
              contactPhone: p.contactPhone ?? null,
              notes: p.notes ?? null,
            });
          }
        }}
        width={820}
        centered
      >
        <Form
          form={editForm}
          layout="vertical"
          onValuesChange={async (changed) => {
            if (changed?.supervisorId) {
              const supervisorId = Number(changed.supervisorId);
              if (!Number.isFinite(supervisorId) || supervisorId <= 0) return;

              try {
                const r = await coordinatorFromSupervisor.mutateAsync(supervisorId);
                editForm.setFieldValue('coordinatorId', r?.coordinatorId ?? null);
              } catch {}
            }
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              name="technicianId"
              label="Técnico / Prestador (obrigatório)"
              rules={[{ required: true, message: 'Selecione o técnico/prestador' }]}
            >
              <Select
                showSearch
                placeholder={usersQuery.isLoading ? 'Carregando...' : 'Selecione'}
                loading={usersQuery.isLoading}
                filterOption={false}
                onSearch={(v) => setTechSearch(v)}
                onDropdownVisibleChange={(isOpen) => {
                  if (isOpen) setTechSearch('');
                }}
                options={technicianOptions.map((t) => ({ label: t.name, value: t.id }))}
                notFoundContent={usersQuery.isLoading ? <Spin size="small" /> : 'Nenhum técnico/prestador encontrado'}
              />
            </Form.Item>

            <Form.Item
              name="supervisorId"
              label="Supervisor (obrigatório)"
              rules={[{ required: true, message: 'Selecione o supervisor' }]}
            >
              <Select
                showSearch
                placeholder={usersQuery.isLoading ? 'Carregando...' : 'Selecione'}
                loading={usersQuery.isLoading}
                filterOption={false}
                onSearch={(v) => setSupervisorSearch(v)}
                onDropdownVisibleChange={(isOpen) => {
                  if (isOpen) setSupervisorSearch('');
                }}
                options={supervisorOptions.map((u) => ({ value: u.id, label: u.name }))}
                notFoundContent={usersQuery.isLoading ? <Spin size="small" /> : 'Nenhum supervisor encontrado'}
              />
            </Form.Item>

            <Form.Item
              name="coordinatorId"
              label="Coordenador (auto)"
              tooltip="Preenchido automaticamente pelo supervisor"
              style={{ gridColumn: '1 / -1' }}
            >
              <Select
                disabled
                loading={coordinatorsQuery.isLoading || coordinatorFromSupervisor.isPending}
                placeholder={coordinatorFromSupervisor.isPending ? 'Buscando...' : 'Automático'}
                options={(coordinatorsQuery.data || []).map((u) => ({ value: u.id, label: u.name }))}
              />
            </Form.Item>
          </div>

          <Form.Item name="title" label="Nome do Projeto" rules={[{ required: true, message: 'Informe o nome' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="af" label="AF" rules={[{ max: 50, message: 'Máximo 50 caracteres' }]}>
            <Input placeholder="Ex: AF-2026-000123" />
          </Form.Item>

          <Form.Item name="clientId" label="Cliente">
            <Select
              showSearch
              allowClear
              placeholder="Selecione um cliente"
              loading={clientsQuery.isLoading}
              optionFilterProp="label"
              filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
              options={(clientsQuery.data || []).map((c) => {
                const loc = [c.cidade, c.estado].filter(Boolean).join(' / ');
                const doc = c.documento ? ` • ${c.documento}` : '';
                const tel = c.telefone1 ? ` • ${c.telefone1}` : '';
                return {
                  value: c.id,
                  label: `${c.name}${loc ? ` — ${loc}` : ''}${doc}${tel}`,
                };
              })}
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="trucksTotal" label="Qtd. veículos (total)" rules={[{ required: true, message: 'Informe' }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="equipmentsPerDay" label="Previsão de instalação por dia">
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="startPlannedAt" label="Data prevista de início">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" inputReadOnly />
          </Form.Item>

          <Form.Item name="contactName" label="Contato">
            <Input />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item name="contactEmail" label="E-mail">
              <Input />
            </Form.Item>
            <Form.Item name="contactPhone" label="Telefone (opcional)">
              <Input />
            </Form.Item>
          </div>

          <Form.Item name="notes" label="Observações (opcional)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== MODAL WHATSAPP ===== */}
      <Modal
        open={waOpen}
        title="WhatsApp"
        okText="Salvar"
        confirmLoading={updateWhatsApp.isPending}
        onCancel={() => setWaOpen(false)}
        onOk={async () => {
          try {
            const v = await waForm.validateFields();
            updateWhatsApp.mutate({
              whatsappGroupName: v.whatsappGroupName ?? null,
              whatsappGroupLink: v.whatsappGroupLink ?? null,
            });
          } catch {}
        }}
        afterOpenChange={(o) => {
          if (o) {
            waForm.setFieldsValue({
              whatsappGroupName: p.whatsappGroupName ?? null,
              whatsappGroupLink: p.whatsappGroupLink ?? null,
            });
          }
        }}
      >
        <Form form={waForm} layout="vertical">
          <Form.Item name="whatsappGroupName" label="Nome do grupo (opcional)">
            <Input />
          </Form.Item>

          <Form.Item
            name="whatsappGroupLink"
            label="Link do grupo (opcional)"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value) return;
                  if (!isWhatsAppGroupLink(value)) {
                    throw new Error('Informe um link válido de grupo do WhatsApp (ex: https://chat.whatsapp.com/...)');
                  }
                },
              },
            ]}
          >
            <Input
              placeholder="https://chat.whatsapp.com/..."
              addonAfter={
                <Button
                  type="text"
                  aria-label="Abrir link do grupo no WhatsApp"
                  icon={<WhatsAppOutlined style={{ color: '#25D366', fontSize: 18 }} />}
                  disabled={!safeUrl(waForm.getFieldValue('whatsappGroupLink'))}
                  onClick={() => {
                    const link = safeUrl(waForm.getFieldValue('whatsappGroupLink'));
                    if (link) window.open(link, '_blank');
                  }}
                />
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== MODAL ADD ITEM ===== */}
      <Modal
        open={itemOpen}
        title="Adicionar item"
        okText="Adicionar"
        confirmLoading={addItem.isPending}
        onCancel={() => setItemOpen(false)}
        onOk={async () => {
          try {
            const v = await itemForm.validateFields();
            addItem.mutate({
              equipmentName: v.equipmentName,
              equipmentCode: v.equipmentCode ?? null,
              qty: v.qty ?? 1,
            });
          } catch {}
        }}
      >
        <Form form={itemForm} layout="vertical" initialValues={{ qty: 1 }}>
          <Form.Item name="equipmentName" label="Nome do equipamento" rules={[{ required: true, message: 'Informe' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="equipmentCode" label="Código (opcional)">
            <Input />
          </Form.Item>
          <Form.Item name="qty" label="Quantidade" rules={[{ required: true, message: 'Informe' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== MODAL ADD PROGRESS ===== */}
      <Modal
        open={progressOpen}
        title="Lançar progresso"
        okText="Salvar"
        confirmLoading={addProgress.isPending}
        onCancel={() => setProgressOpen(false)}
        onOk={async () => {
          try {
            const v = await progressForm.validateFields();
            const vehicles = (v.vehicles || []).map((x: any) => ({
              plate: String(x.plate || '').trim().toUpperCase(),
              serial: String(x.serial || '').trim(),
            }));
            addProgress.mutate({
              date: (v.date as Dayjs).format('YYYY-MM-DD'),
              notes: v.notes ?? null,
              vehicles,
            });
          } catch {}
        }}
        afterOpenChange={(o) => {
          if (o) {
            progressForm.setFieldsValue({
              date: dayjs(),
              vehicles: [{ plate: '', serial: '' }],
              notes: null,
            });
          }
        }}
      >
        <Form form={progressForm} layout="vertical">
          <Form.Item name="date" label="Data" rules={[{ required: true, message: 'Selecione a data' }]}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" inputReadOnly />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Typography.Text strong>Veículos instalados no dia</Typography.Text>
            <Typography.Text type="secondary">
              Total do dia: {Array.isArray(watchedVehicles) ? watchedVehicles.length : 0}
            </Typography.Text>
          </div>

          <Form.List
            name="vehicles"
            rules={[
              {
                validator: async (_, list) => {
                  if (!list || list.length < 1) throw new Error('Adicione pelo menos 1 veículo');
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                {fields.map((field, idx) => (
                  <div
                    key={field.key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr auto',
                      gap: 8,
                      marginBottom: 8,
                      alignItems: 'start',
                    }}
                  >
                    <Form.Item
                      {...field}
                      label={idx === 0 ? 'Placa' : ''}
                      name={[field.name, 'plate']}
                      rules={[
                        { required: true, message: 'Informe a placa' },
                        {
                          validator: async (_, value) => {
                            if (!value) return;
                            if (!isValidPlate(value)) throw new Error('Placa inválida (ex: ABC-1234 ou ABC-1E34)');
                          },
                        },
                      ]}
                    >
                      <Input
                        placeholder="Ex: ABC-1234"
                        maxLength={8}
                        onChange={(e) => {
                          const formatted = normalizePlate(e.target.value);
                          progressForm.setFieldValue(['vehicles', field.name, 'plate'], formatted);
                        }}
                      />
                    </Form.Item>

                    <Form.Item
                      {...field}
                      label={idx === 0 ? 'Série / Serial' : ''}
                      name={[field.name, 'serial']}
                      rules={[
                        { required: true, message: 'Informe a série' },
                        { min: 3, message: 'Série muito curta' },
                        { max: 60, message: 'Série muito longa' },
                      ]}
                    >
                      <Input placeholder="Ex: 2344343" />
                    </Form.Item>

                    <div style={{ paddingTop: idx === 0 ? 30 : 0 }}>
                      <Button danger onClick={() => remove(field.name)} disabled={fields.length === 1}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}

                <Form.ErrorList errors={errors} />
                <Button onClick={() => add({ plate: '', serial: '' })}>+ Adicionar veículo</Button>
              </>
            )}
          </Form.List>

          <Form.Item name="notes" label="Observações (opcional)">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
